import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { removeBackground } from "./background.mjs";
import { decodePng, encodePng, readPng } from "./png.mjs";

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
