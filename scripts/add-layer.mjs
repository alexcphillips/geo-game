import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, onWhite, readPng } from "./png.mjs";

/**
 * Cuts one gear layer for the player figure out of a Gemini edit of the base
 * character, and saves it to
 * `src/features/character/assets/layers/<slot>/<name>.png`.
 *
 *     npm run layer:add -- ~/Downloads/gemini-crown.png head crown-of-ash
 *
 * The input is `player-base.png` (made with `npm run layer:base`, in the
 * same folder as `layers/`) edited by Gemini to wear one item, with everything else
 * unchanged. The layer keeps only the pixels that differ from the base, on a
 * transparent canvas the base's size, so stacking it over the base puts the
 * item in place.
 *
 * Gemini edits aren't pixel-perfect: they come back at another resolution,
 * shifted or zoomed a little, with outlines redrawn a pixel off. So the edit
 * is resized to the base, then aligned by searching small zooms and shifts.
 * Differences are measured on slightly blurred copies, thin slivers (redrawn
 * outlines) are dropped: a changed pixel is kept only near a thick part of
 * the change. Small changed regions are dropped too. Holes inside the item that happen to match
 * the base colour are filled back in.
 *
 * Also writes a preview to the system temp dir: the layer alone on
 * magenta, and stacked on the base. Check it: anything else Gemini changed
 * (a redrawn eye, a moved boot) ends up in the layer too, and needs erasing
 * by hand or a better edit.
 *
 * Non-PNG input (JPEG, WebP) is converted with macOS `sips` first. Replaces an
 * existing layer of the same name.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "src/features/character/assets");
const basePath = join(assetsDir, "player-base.png");

/** The slots that get a layer (see the Layered Player Figure plan). */
const SLOTS = ["head", "chest", "legs", "cloak", "main-hand", "off-hand"];

/**
 * Summed RGB difference (on blurred copies) above which a pixel counts as
 * changed. Summed, not per channel, so a dark grey item over the dark-blue
 * hood still counts.
 */
const DIFF_THRESHOLD = 36;
/**
 * Difference in local contrast (grey standard deviation over TEXTURE_PX)
 * above which a pixel counts as changed even if its average colour didn't:
 * smooth steel replacing grey chainmail.
 */
const TEXTURE_THRESHOLD = 10;
const TEXTURE_PX = 2;
/** Blur radius before comparing, so anti-aliasing and 1px jitter don't count as changes. */
const BLUR_PX = 1;
/** Changed slivers thinner than about twice this are treated as redrawn outlines and dropped. */
const ERODE_PX = 1;
/*
 * The sizes below are for a base 1000px wide, and scale with the real base
 * (see `px`).
 */
/** A changed pixel is kept only near a part of the change at least about twice this thick: items have one, redrawn outlines don't. */
const CORE_PX = 4;
/** How far from a thick part a changed pixel may be and still be kept (thin spikes, straps, blade tips). */
const REACH_PX = 14;
/** Gaps in the item's outline up to about twice this are bridged before filling holes. */
const CLOSE_PX = 4;
/** Changed regions smaller than this share of the image (~900px at 1100×1640) are dropped. */
const MIN_REGION_SHARE = 0.0005;
/** How far the mask grows at the end, to take back the item's own outline. */
const GROW_PX = 2;
/** Zoom and shift range searched when aligning the edit to the base (shift at 1000px wide). */
const MAX_ZOOM = 0.04;
const MAX_SHIFT_PX = 20;
/** Pixels this close to white (per channel), outside the base figure, are background. */
const BACKGROUND_TOLERANCE = 28;
/** Roughly the luminance of the art's outline: fully opaque at or below it. */
const OUTLINE_LUMINANCE = 40;

const [input, slot, name] = process.argv.slice(2);
if (!input || !SLOTS.includes(slot) || !name || !/^[a-z0-9-]+$/.test(name)) {
    console.error(`Usage: npm run layer:add -- <edited image> <${SLOTS.join("|")}> <layer-name, e.g. crown-of-ash>`);
    process.exit(1);
}
if (!existsSync(basePath)) {
    console.error(`Missing ${basePath}: make it first with npm run layer:base -- <image>.`);
    process.exit(1);
}

const base = onWhite(decodePng(readPng(basePath), basePath));
const edited = onWhite(decodePng(readPng(input), input));
const { width, height } = base;
const count = width * height;
/** A size given for a 1000px-wide base, at this base's size. */
const px = (n) => Math.max(1, Math.round((n * width) / 1000));

const baseAspect = width / height;
const editedAspect = edited.width / edited.height;
if (Math.abs(editedAspect / baseAspect - 1) > 0.02) {
    console.error(
        `${input} is ${edited.width}×${edited.height}, a different shape from the base (${width}×${height}). ` +
            "Gemini changed the canvas: redo the edit rather than stretch it.",
    );
    process.exit(1);
}

const fit = align(base, edited);
const aligned = warp(edited, width, height, editedToBase(fit, edited, width, height));

const mask = changedMask(base, aligned);
const layer = cutLayer(base, aligned, mask);

const outDir = join(assetsDir, "layers", slot);
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${name}.png`);
const replacing = existsSync(outFile);
writeFileSync(outFile, encodePng(layer));

const previewFile = join(tmpdir(), `layer-preview-${slot}-${name}.png`);
writeFileSync(previewFile, encodePng(preview(base, layer)));

const kept = mask.reduce((sum, v) => sum + v, 0);
console.log(
    `${replacing ? "Replaced" : "Added"} layers/${slot}/${name}.png: ${((kept / count) * 100).toFixed(1)}% of the canvas.\n` +
        `Aligned the edit: zoom ${(fit.zoom * 100).toFixed(1)}%, shift ${fit.dx},${fit.dy}px, ` +
        `leftover difference ${fit.score.toFixed(1)}/255${fit.score > 12 ? " (high: the edit may have moved the character)" : ""}.\n` +
        `Preview: ${previewFile}`,
);

function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function grey({ width, height, pixels }) {
    const out = new Float32Array(width * height);
    for (let i = 0; i < out.length; i++) out[i] = luminance(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
    return out;
}

/** Shrinks a grey image by averaging `factor`×`factor` blocks. */
function shrink(values, width, height, factor) {
    const w = Math.floor(width / factor);
    const h = Math.floor(height / factor);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let yy = 0; yy < factor; yy++) {
                for (let xx = 0; xx < factor; xx++) sum += values[(y * factor + yy) * width + x * factor + xx];
            }
            out[y * w + x] = sum / (factor * factor);
        }
    }
    return { values: out, width: w, height: h };
}

/**
 * Finds the zoom (about the centre) and shift that best line the edit up with
 * the base: coarse at quarter size, then refined at full size. `dx`/`dy` are
 * in base pixels.
 */
function align(base, edited) {
    const resized = warp(edited, base.width, base.height, editedToBase({ zoom: 0, dx: 0, dy: 0 }, edited, base.width, base.height));
    const full = { values: grey(base), width: base.width, height: base.height };
    const fullEdited = { values: grey(resized), width: base.width, height: base.height };

    const q = 4;
    const small = shrink(full.values, full.width, full.height, q);
    const smallEdited = shrink(fullEdited.values, full.width, full.height, q);
    let best = { zoom: 0, dx: 0, dy: 0, score: Infinity };
    const reach = Math.ceil(px(MAX_SHIFT_PX) / q);
    for (let zoom = -MAX_ZOOM; zoom <= MAX_ZOOM + 1e-9; zoom += 0.005) {
        for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
                const score = mismatch(small, smallEdited, zoom, dx, dy, 2);
                if (score < best.score) best = { zoom, dx: dx * q, dy: dy * q, score };
            }
        }
    }

    const coarse = best;
    best = { ...coarse, score: Infinity };
    for (let zoom = coarse.zoom - 0.005; zoom <= coarse.zoom + 0.005 + 1e-9; zoom += 0.001) {
        for (let dy = coarse.dy - q; dy <= coarse.dy + q; dy++) {
            for (let dx = coarse.dx - q; dx <= coarse.dx + q; dx++) {
                const score = mismatch(full, fullEdited, zoom, dx, dy, 4);
                if (score < best.score) best = { zoom, dx, dy, score };
            }
        }
    }
    return best;
}

/** Mean absolute grey difference with `b` zoomed and shifted, sampling every `step`th pixel. */
function mismatch(a, b, zoom, dx, dy, step) {
    const { width, height } = a;
    const cx = width / 2;
    const cy = height / 2;
    const s = 1 + zoom;
    let sum = 0;
    let n = 0;
    for (let y = 0; y < height; y += step) {
        const sy = Math.round((y - cy) * s + cy + dy);
        if (sy < 0 || sy >= height) continue;
        for (let x = 0; x < width; x += step) {
            const sx = Math.round((x - cx) * s + cx + dx);
            if (sx < 0 || sx >= width) continue;
            sum += Math.abs(a.values[y * width + x] - b.values[sy * width + sx]);
            n++;
        }
    }
    return n ? sum / n : Infinity;
}

/** Maps a base pixel to where it sits in the edited image, for `warp`. */
function editedToBase({ zoom, dx, dy }, edited, width, height) {
    const kx = edited.width / width;
    const ky = edited.height / height;
    const s = 1 + zoom;
    return (x, y) => [((x - width / 2) * s + width / 2 + dx + 0.5) * kx - 0.5, ((y - height / 2) * s + height / 2 + dy + 0.5) * ky - 0.5];
}

/** Resamples `src` onto a `width`×`height` canvas (bilinear); outside `src` is white. */
function warp(src, width, height, map) {
    const pixels = Buffer.alloc(width * height * 4);
    const at = (x, y, c) => (x < 0 || y < 0 || x >= src.width || y >= src.height ? 255 : src.pixels[(y * src.width + x) * 4 + c]);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [sx, sy] = map(x, y);
            const x0 = Math.floor(sx);
            const y0 = Math.floor(sy);
            const fx = sx - x0;
            const fy = sy - y0;
            const out = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
                const top = at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx;
                const bottom = at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx;
                pixels[out + c] = Math.round(top * (1 - fy) + bottom * fy);
            }
            pixels[out + 3] = 255;
        }
    }
    return { width, height, pixels };
}

/** Box-blurs RGB into floats (separable). */
function blur({ width, height, pixels }, r) {
    const tmp = new Float32Array(width * height * 3);
    const out = new Float32Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0, n = 0;
                for (let k = Math.max(0, x - r); k <= Math.min(width - 1, x + r); k++, n++) sum += pixels[(y * width + k) * 4 + c];
                tmp[(y * width + x) * 3 + c] = sum / n;
            }
        }
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0, n = 0;
                for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++, n++) sum += tmp[(k * width + x) * 3 + c];
                out[(y * width + x) * 3 + c] = sum / n;
            }
        }
    }
    return out;
}

/** Square-kernel erode or dilate of a 0/1 mask (separable). */
function morph(mask, width, height, r, grow) {
    const pass = (src, horizontal) => {
        const out = new Uint8Array(src.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let hit = grow ? 0 : 1;
                const from = Math.max(0, (horizontal ? x : y) - r);
                const to = Math.min((horizontal ? width : height) - 1, (horizontal ? x : y) + r);
                for (let k = from; k <= to; k++) {
                    const v = horizontal ? src[y * width + k] : src[k * width + x];
                    if (grow ? v : !v) {
                        hit = grow ? 1 : 0;
                        break;
                    }
                }
                out[y * width + x] = hit;
            }
        }
        return out;
    };
    return pass(pass(mask, true), false);
}

/** 4-connected flood from `starts` over pixels where `inside(i)`; marks `seen`, returns the region. */
function flood(starts, inside, seen, queue) {
    let head = 0, tail = 0;
    for (const start of starts) {
        if (seen[start] || !inside(start)) continue;
        seen[start] = 1;
        queue[tail++] = start;
    }
    while (head < tail) {
        const i = queue[head++];
        const x = i % width;
        for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
            if (n < 0 || n >= count || seen[n] || !inside(n)) continue;
            seen[n] = 1;
            queue[tail++] = n;
        }
    }
    return queue.subarray(0, tail);
}

/** Box-blurs a grey image (separable). */
function blurGrey(values, r) {
    const tmp = new Float32Array(count);
    const out = new Float32Array(count);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, n = 0;
            for (let k = Math.max(0, x - r); k <= Math.min(width - 1, x + r); k++, n++) sum += values[y * width + k];
            tmp[y * width + x] = sum / n;
        }
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, n = 0;
            for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++, n++) sum += tmp[k * width + x];
            out[y * width + x] = sum / n;
        }
    }
    return out;
}

/** Standard deviation of grey within `r` of each pixel: high on busy texture (mail), low on flat colour. */
function localContrast(values, r) {
    const mean = blurGrey(values, r);
    const squares = blurGrey(values.map((v) => v * v), r);
    return mean.map((m, i) => Math.sqrt(Math.max(0, squares[i] - m * m)));
}

/** 1 where the edit changed the base enough to be the item. */
function changedMask(base, aligned) {
    const a = blur(base, BLUR_PX);
    const b = blur(aligned, BLUR_PX);
    const textureA = localContrast(grey(base), px(TEXTURE_PX));
    const textureB = localContrast(grey(aligned), px(TEXTURE_PX));
    let mask = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
        const d = Math.abs(a[i * 3] - b[i * 3]) + Math.abs(a[i * 3 + 1] - b[i * 3 + 1]) + Math.abs(a[i * 3 + 2] - b[i * 3 + 2]);
        mask[i] = d > DIFF_THRESHOLD || Math.abs(textureA[i] - textureB[i]) > TEXTURE_THRESHOLD ? 1 : 0;
    }

    mask = morph(morph(mask, width, height, ERODE_PX, false), width, height, ERODE_PX, true);

    const near = morph(morph(mask, width, height, px(CORE_PX), false), width, height, px(CORE_PX) + px(REACH_PX), true);
    for (let i = 0; i < count; i++) mask[i] &= near[i];

    const queue = new Int32Array(count);
    const seen = new Uint8Array(count);
    const minRegion = count * MIN_REGION_SHARE;
    for (let i = 0; i < count; i++) {
        if (seen[i] || !mask[i]) continue;
        const region = flood([i], (n) => mask[n] === 1, seen, queue);
        if (region.length < minRegion) for (const p of region) mask[p] = 0;
    }

    mask = morph(morph(mask, width, height, px(CLOSE_PX), true), width, height, px(CLOSE_PX), false);

    // Fill holes: unchanged pixels the edges can't reach without crossing the item.
    const outside = new Uint8Array(count);
    const edges = [];
    for (let x = 0; x < width; x++) edges.push(x, (height - 1) * width + x);
    for (let y = 0; y < height; y++) edges.push(y * width, y * width + width - 1);
    flood(edges, (n) => mask[n] === 0, outside, queue);
    for (let i = 0; i < count; i++) if (!outside[i]) mask[i] = 1;

    return morph(mask, width, height, px(GROW_PX), true);
}

function nearWhite(pixels, i) {
    const at = i * 4;
    return 255 - Math.min(pixels[at], pixels[at + 1], pixels[at + 2]) <= BACKGROUND_TOLERANCE;
}

/**
 * The edited pixels under the mask, transparent elsewhere. Where the item
 * reaches past the base figure onto white, the white is cleared and edge
 * pixels are un-blended from it (as `sprite:add` does), so there's no fringe.
 */
function cutLayer(base, aligned, mask) {
    const pixels = Buffer.alloc(count * 4);
    const clear = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
        if (!mask[i] || (nearWhite(aligned.pixels, i) && nearWhite(base.pixels, i))) clear[i] = 1;
    }
    for (let i = 0; i < count; i++) {
        if (clear[i]) continue;
        const at = i * 4;
        const [r, g, b] = [aligned.pixels[at], aligned.pixels[at + 1], aligned.pixels[at + 2]];
        let alpha = 1;
        if (mask[i] && nearWhite(base.pixels, i) && touchesClearWhite(i, clear, mask)) {
            alpha = Math.min(1, Math.max(0, (255 - luminance(r, g, b)) / (255 - OUTLINE_LUMINANCE)));
            if (alpha < 0.03) continue;
        }
        pixels[at] = Math.min(255, Math.max(0, Math.round((r - (1 - alpha) * 255) / alpha)));
        pixels[at + 1] = Math.min(255, Math.max(0, Math.round((g - (1 - alpha) * 255) / alpha)));
        pixels[at + 2] = Math.min(255, Math.max(0, Math.round((b - (1 - alpha) * 255) / alpha)));
        pixels[at + 3] = Math.round(alpha * 255);
    }
    return { width, height, pixels };
}

/** Whether a cleared background pixel (inside the mask) is within 2px. */
function touchesClearWhite(i, clear, mask) {
    const x0 = i % width;
    const y0 = (i - x0) / width;
    for (let y = Math.max(0, y0 - 2); y <= Math.min(height - 1, y0 + 2); y++) {
        for (let x = Math.max(0, x0 - 2); x <= Math.min(width - 1, x0 + 2); x++) {
            const n = y * width + x;
            if (clear[n] && mask[n]) return true;
        }
    }
    return false;
}

/** Side by side: the layer alone on magenta (to spot stray bits), and stacked on the base. */
function preview(base, layer) {
    const pixels = Buffer.alloc(count * 4 * 2);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const a = layer.pixels[i * 4 + 3] / 255;
            const left = (y * width * 2 + x) * 4;
            const right = left + width * 4;
            const magenta = [255, 0, 255];
            for (let c = 0; c < 3; c++) {
                const item = layer.pixels[i * 4 + c];
                pixels[left + c] = Math.round(item * a + magenta[c] * (1 - a));
                pixels[right + c] = Math.round(item * a + base.pixels[i * 4 + c] * (1 - a));
            }
            pixels[left + 3] = pixels[right + 3] = 255;
        }
    }
    return { width: width * 2, height, pixels };
}
