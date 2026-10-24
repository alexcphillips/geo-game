import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { removeBackground } from "./background.mjs";
import { decodePng, encodePng, onWhite, readPng } from "./png.mjs";

/**
 * Makes `src/features/character/assets/player-base.png`, the canvas every
 * player-figure layer is cut against (see add-layer.mjs), from Gemini's base
 * character art.
 *
 *     npm run layer:base -- ~/Downloads/gemini-knight.png [--mirror]
 *
 * Fills any transparency with white (Gemini edits work best on white),
 * turns Gemini's faintly speckled off-white background pure white (flood-
 * filled in from the edges, so pale parts inside the figure stay), and pads
 * the image, centred, to WIDTH_SCALE × HEIGHT_SCALE its size in even
 * pixels: room for long weapons above and to the sides. Use the full-size
 * Gemini download, not a screenshot or a background-removal preview, which
 * are shrunk.
 *
 * `--mirror` flips it left to right: the figure should face right, toward
 * the enemy in combat, and Gemini often draws it facing left.
 *
 * Also writes `layers/body.png`: the same canvas with the background
 * removed, which the app draws under the gear layers.
 *
 * Every layer is cut against this file, so replacing it means re-cutting
 * them all. It refuses to replace an existing base without `--replace`.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const basePath = join(root, "src/features/character/assets/player-base.png");
const bodyPath = join(root, "src/features/character/assets/layers/body.png");

const WIDTH_SCALE = 1.1;
const HEIGHT_SCALE = 1.6;
/** How far (per channel) from white a background pixel may be and still be cleaned to pure white. */
const BACKGROUND_TOLERANCE = 24;
/** Below this height the figure looks soft on a 3× phone screen at ~210pt tall. */
const MIN_HEIGHT_PX = 700;

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const mirror = args.includes("--mirror");
const input = args.find((a) => !a.startsWith("--"));
if (!input) {
    console.error("Usage: npm run layer:base -- <image> [--mirror] [--replace]");
    process.exit(1);
}
if (existsSync(basePath) && !replace) {
    console.error(`${basePath} already exists. Every layer is cut against it: pass --replace to swap it anyway, then re-cut the layers.`);
    process.exit(1);
}

const image = onWhite(decodePng(readPng(input), input));
if (image.height < MIN_HEIGHT_PX) {
    console.error(`${input} is only ${image.width}×${image.height}. Use the full-size Gemini download (at least ${MIN_HEIGHT_PX}px tall).`);
    process.exit(1);
}

whitenBackground(image);
if (mirror) mirrorInPlace(image);

const even = (n) => Math.round(n / 2) * 2;
const width = even(image.width * WIDTH_SCALE);
const height = even(image.height * HEIGHT_SCALE);
const left = Math.floor((width - image.width) / 2);
const top = Math.floor((height - image.height) / 2);

const pixels = Buffer.alloc(width * height * 4, 255);
for (let y = 0; y < image.height; y++) {
    image.pixels.copy(pixels, ((y + top) * width + left) * 4, y * image.width * 4, (y + 1) * image.width * 4);
}

mkdirSync(dirname(bodyPath), { recursive: true });
writeFileSync(basePath, encodePng({ width, height, pixels }));
const body = { width, height, pixels: Buffer.from(pixels) };
removeBackground(body);
writeFileSync(bodyPath, encodePng(body));
console.log(
    `Wrote player-base.png (${width}×${height}, from ${image.width}×${image.height}): give this file to Gemini for every item edit.\n` +
        "Wrote layers/body.png: the same with the background removed, for the app.\n",
);

execFileSync(process.execPath, [join(root, "scripts/generate-figure-layers.mjs")], { stdio: "inherit" });

/** Sets the near-white background reachable from the image's edges to pure white, in place. */
function whitenBackground({ width, height, pixels }) {
    const count = width * height;
    const nearWhite = (i) => 255 - Math.min(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]) <= BACKGROUND_TOLERANCE;
    const seen = new Uint8Array(count);
    const queue = new Int32Array(count);
    let head = 0, tail = 0;
    const push = (i) => {
        if (seen[i] || !nearWhite(i)) return;
        seen[i] = 1;
        queue[tail++] = i;
    };
    for (let x = 0; x < width; x++) {
        push(x);
        push((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        push(y * width);
        push(y * width + width - 1);
    }
    while (head < tail) {
        const i = queue[head++];
        const x = i % width;
        if (x > 0) push(i - 1);
        if (x < width - 1) push(i + 1);
        if (i >= width) push(i - width);
        if (i < count - width) push(i + width);
        pixels.fill(255, i * 4, i * 4 + 3);
    }
}

/** Flips the image left to right, in place. */
function mirrorInPlace({ width, height, pixels }) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width / 2; x++) {
            const a = (y * width + x) * 4;
            const b = (y * width + width - 1 - x) * 4;
            for (let c = 0; c < 4; c++) [pixels[a + c], pixels[b + c]] = [pixels[b + c], pixels[a + c]];
        }
    }
}
