import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECK, emitGenerated } from "./generated-file.mjs";
import { decodePng, encodePng } from "./png.mjs";

/**
 * Turns the map sprites in `src/features/spawns/assets/*.png` into data URIs
 * the map page can use.
 *
 * Why: the map runs in a WebView whose page is an HTML string, so it can't
 * load the app's bundled image assets by URL. Each PNG is embedded instead.
 * Each one is first cropped to its non-transparent pixels (plus a small
 * margin) so artwork with generous padding doesn't bloat the page or throw
 * off marker sizing.
 *
 * Each is then shrunk so its longest side is at most MAX_SIDE_PX: source art
 * can be any size, and the sprites ship inside the map page.
 *
 * Also writes the sprite names into cozy-app's server (expects cozy-app next
 * to this repo; set COZY_APP_DIR to point elsewhere): enemies spawn on the map
 * only once their sprite is here.
 *
 * Sprites must have a transparent background. Add Gemini output (white
 * background) with `npm run sprite:add`, which removes it and then runs this.
 *
 * Runs on its own: `npm start` (and tunnel, android, ios) runs it first and
 * again whenever the sprites folder changes (scripts/dev.mjs). `npm run
 * sprites` does it by hand. Either file is written only when it changes.
 * `--check` (part of `npm run check`) fails when either is out of date; it
 * skips the server's file when cozy-app isn't checked out next to this repo.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "src/features/spawns/assets");
const outFile = join(root, "src/features/spawns/sprites.generated.ts");
const cozyAppDir = resolve(root, process.env.COZY_APP_DIR ?? "../cozy-app");
const serverFile = join(cozyAppDir, "server/src/geo/world/app-sprites.generated.ts");

/** Alpha at or below this counts as empty when cropping. */
const ALPHA_THRESHOLD = 16;
const MARGIN_PX = 4;
/** Longest side after shrinking: enough for the combat screen (96pt tall) on most phones. */
const MAX_SIDE_PX = 320;

function cropToContent({ width, height, pixels, hasAlpha }, name) {
    if (!hasAlpha) throw new Error(`${name}: has no transparency. Add it with \`npm run sprite:add\` instead.`);

    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < 0) throw new Error("sprite is fully transparent");

    minX = Math.max(0, minX - MARGIN_PX);
    minY = Math.max(0, minY - MARGIN_PX);
    maxX = Math.min(width - 1, maxX + MARGIN_PX);
    maxY = Math.min(height - 1, maxY + MARGIN_PX);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropped = Buffer.alloc(cropWidth * cropHeight * 4);

    for (let y = 0; y < cropHeight; y++) {
        pixels.copy(
            cropped,
            y * cropWidth * 4,
            ((minY + y) * width + minX) * 4,
            ((minY + y) * width + maxX + 1) * 4,
        );
    }

    return { width: cropWidth, height: cropHeight, pixels: cropped };
}

/**
 * Shrinks to fit MAX_SIDE_PX by averaging each output pixel's source area.
 * Colours are weighted by alpha, so transparent pixels don't darken edges.
 */
function shrinkToFit(sprite) {
    const scale = MAX_SIDE_PX / Math.max(sprite.width, sprite.height);
    if (scale >= 1) return sprite;

    const width = Math.max(1, Math.round(sprite.width * scale));
    const height = Math.max(1, Math.round(sprite.height * scale));
    const pixels = Buffer.alloc(width * height * 4);
    const stepX = sprite.width / width;
    const stepY = sprite.height / height;

    for (let y = 0; y < height; y++) {
        const y0 = y * stepY, y1 = y0 + stepY;
        for (let x = 0; x < width; x++) {
            const x0 = x * stepX, x1 = x0 + stepX;
            let r = 0, g = 0, b = 0, a = 0, area = 0;
            for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
                const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
                for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
                    const w = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx));
                    const at = (sy * sprite.width + sx) * 4;
                    const alpha = sprite.pixels[at + 3] * w;
                    r += sprite.pixels[at] * alpha;
                    g += sprite.pixels[at + 1] * alpha;
                    b += sprite.pixels[at + 2] * alpha;
                    a += alpha;
                    area += w;
                }
            }
            const out = (y * width + x) * 4;
            if (a > 0) {
                pixels[out] = Math.round(r / a);
                pixels[out + 1] = Math.round(g / a);
                pixels[out + 2] = Math.round(b / a);
            }
            pixels[out + 3] = Math.round(a / area);
        }
    }

    return { width, height, pixels };
}

const names = [];
const sizes = [];
const entries = readdirSync(assetsDir)
    .filter((file) => file.endsWith(".png"))
    .sort()
    .map((file) => {
        const name = basename(file, ".png");
        const sprite = shrinkToFit(cropToContent(decodePng(readFileSync(join(assetsDir, file)), file), file));
        const uri = `data:image/png;base64,${encodePng(sprite).toString("base64")}`;
        sizes.push(`${name}: ${sprite.width}×${sprite.height}, ${Math.round(uri.length / 1024)} KB`);
        names.push(name);
        return `    ${JSON.stringify(name)}: { uri: ${JSON.stringify(uri)}, width: ${sprite.width}, height: ${sprite.height} },`;
    });

const options = { root, script: "sprites" };
const appChanged = emitGenerated(
    outFile,
    `// Generated by scripts/generate-sprites.mjs — do not edit. Run \`npm run sprites\`.

/** Map sprites, cropped to their content, as data URIs with pixel sizes. */
export const MAP_SPRITES = {
${entries.join("\n")}
} as const;

export type MapSpriteName = keyof typeof MAP_SPRITES;
`,
    options,
);

let serverChanged = false;
if (existsSync(cozyAppDir)) {
    serverChanged = emitGenerated(
        serverFile,
        `// Generated by geo-game's scripts/generate-sprites.mjs — do not edit. Run \`npm run sprites\` in geo-game.

/** Sprites the app has art for. Enemies whose sprite isn't here don't spawn on the map. */
export const APP_SPRITES = [
${names.map((name) => `    ${JSON.stringify(name)},`).join("\n")}
] as const;
`,
        options,
    );
} else {
    console.warn(`cozy-app not found at ${cozyAppDir}: skipped its sprite list (set COZY_APP_DIR).`);
}

if ((appChanged || serverChanged) && !CHECK) console.log(sizes.join("\n"));
