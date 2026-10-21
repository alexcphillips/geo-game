import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png.mjs";

/**
 * Adds a map sprite from generated art: removes its plain background, saves it
 * to `src/features/spawns/assets/<name>.png`, then runs generate-sprites.
 *
 *     npm run sprite:add -- ~/Downloads/gemini-image.png green-slime
 *
 * The background is whatever colour the corners are (Gemini's is white). It is
 * flood-filled in from the edges, so pale colours inside the outline survive;
 * enclosed pockets of nearly the exact background colour (between legs, inside
 * a bow) are cleared too. Edge pixels are then un-blended from the background,
 * assuming the art has a dark outline, so there's no white fringe.
 *
 * Non-PNG input (JPEG, WebP) is converted with macOS `sips` first. Replaces an
 * existing sprite of the same name.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "src/features/spawns/assets");

/** How far (per channel) a pixel may be from the background colour and still count as background. */
const BACKGROUND_TOLERANCE = 28;
/** Enclosed pockets must be this close to the background colour to be cleared. Stricter: they might be highlights. */
const POCKET_TOLERANCE = 12;
/** Enclosed pockets smaller than this share of the image (~85px at 1024²) stay: likely highlights or eye glints. */
const MIN_POCKET_SHARE = 0.00008;
/** Pixels this close to cleared background get their blend with it undone. */
const EDGE_PX = 2;
/** Roughly the luminance of the art's outline: fully opaque at or below it. */
const OUTLINE_LUMINANCE = 40;

const [input, name] = process.argv.slice(2);
if (!input || !name || !/^[a-z0-9-]+$/.test(name)) {
    console.error("Usage: npm run sprite:add -- <image> <sprite-name, e.g. green-slime>");
    process.exit(1);
}

const image = decodePng(readPng(input), input);
const removed = removeBackground(image);
const outFile = join(assetsDir, `${name}.png`);
const replacing = existsSync(outFile);
writeFileSync(outFile, encodePng(image));
console.log(`${replacing ? "Replaced" : "Added"} ${name}.png: removed ${Math.round((removed / (image.width * image.height)) * 100)}% as background.\n`);

execFileSync(process.execPath, [join(root, "scripts/generate-sprites.mjs")], { stdio: "inherit" });

/** The file as an 8-bit PNG, converting with `sips` if it is anything else. */
function readPng(path) {
    const buffer = readFileSync(path);
    const isPng = buffer.subarray(1, 4).toString("ascii") === "PNG";
    if (isPng && (buffer[24] === 8 && (buffer[25] === 2 || buffer[25] === 6))) return buffer;

    const dir = mkdtempSync(join(tmpdir(), "sprite-"));
    try {
        const converted = join(dir, "converted.png");
        execFileSync("sips", ["-s", "format", "png", "-s", "formatOptions", "default", path, "--out", converted], { stdio: "ignore" });
        return readFileSync(converted);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Clears the background in place; returns how many pixels it cleared. */
function removeBackground({ width, height, pixels }) {
    const count = width * height;
    const background = cornerColour(width, height, pixels);
    const distance = (i) =>
        Math.max(
            Math.abs(pixels[i * 4] - background[0]),
            Math.abs(pixels[i * 4 + 1] - background[1]),
            Math.abs(pixels[i * 4 + 2] - background[2]),
        );

    // 1 = background reached from the edges or a cleared pocket.
    const cleared = new Uint8Array(count);
    const seen = new Uint8Array(count);
    const queue = new Int32Array(count);

    /** Fills from `starts` across pixels within `tolerance`; returns the region. */
    const fill = (starts, tolerance) => {
        let head = 0, tail = 0;
        for (const start of starts) {
            if (seen[start] || distance(start) > tolerance) continue;
            seen[start] = 1;
            queue[tail++] = start;
        }
        while (head < tail) {
            const i = queue[head++];
            const x = i % width;
            const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width];
            for (const n of neighbours) {
                if (n < 0 || n >= count || seen[n] || distance(n) > tolerance) continue;
                seen[n] = 1;
                queue[tail++] = n;
            }
        }
        return queue.subarray(0, tail);
    };

    const edges = [];
    for (let x = 0; x < width; x++) edges.push(x, (height - 1) * width + x);
    for (let y = 0; y < height; y++) edges.push(y * width, y * width + width - 1);
    for (const i of fill(edges, BACKGROUND_TOLERANCE)) cleared[i] = 1;

    const minPocket = count * MIN_POCKET_SHARE;
    for (let i = 0; i < count; i++) {
        if (seen[i] || distance(i) > POCKET_TOLERANCE) continue;
        const pocket = fill([i], POCKET_TOLERANCE);
        if (pocket.length >= minPocket) for (const p of pocket) cleared[p] = 1;
    }

    // Undo the art's anti-aliased blend with the background near cleared areas.
    const backgroundLuminance = luminance(...background);
    let removed = 0;
    for (let i = 0; i < count; i++) {
        const at = i * 4;
        if (cleared[i]) {
            pixels[at] = pixels[at + 1] = pixels[at + 2] = pixels[at + 3] = 0;
            removed++;
            continue;
        }
        if (!nearCleared(i, width, height, cleared)) continue;

        const alpha = Math.min(
            1,
            Math.max(0, (backgroundLuminance - luminance(pixels[at], pixels[at + 1], pixels[at + 2])) / (backgroundLuminance - OUTLINE_LUMINANCE)),
        );
        if (alpha < 0.03) {
            pixels[at] = pixels[at + 1] = pixels[at + 2] = pixels[at + 3] = 0;
            removed++;
            continue;
        }
        for (let c = 0; c < 3; c++) {
            pixels[at + c] = Math.min(255, Math.max(0, Math.round((pixels[at + c] - (1 - alpha) * background[c]) / alpha)));
        }
        pixels[at + 3] = Math.round(alpha * 255);
    }
    return removed;
}

/** Average colour of the four 4×4 corners. */
function cornerColour(width, height, pixels) {
    const sum = [0, 0, 0];
    let n = 0;
    for (const [cx, cy] of [[0, 0], [width - 4, 0], [0, height - 4], [width - 4, height - 4]]) {
        for (let y = cy; y < cy + 4; y++) {
            for (let x = cx; x < cx + 4; x++) {
                const at = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) sum[c] += pixels[at + c];
                n++;
            }
        }
    }
    return sum.map((v) => v / n);
}

function nearCleared(i, width, height, cleared) {
    const x0 = i % width;
    const y0 = (i - x0) / width;
    for (let y = Math.max(0, y0 - EDGE_PX); y <= Math.min(height - 1, y0 + EDGE_PX); y++) {
        for (let x = Math.max(0, x0 - EDGE_PX); x <= Math.min(width - 1, x0 + EDGE_PX); x++) {
            if (cleared[y * width + x]) return true;
        }
    }
    return false;
}
