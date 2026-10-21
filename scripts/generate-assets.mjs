import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs every generator that turns source art or lists into code: icons, map
 * sprites, item art. Each writes only what changed, so this is cheap to run
 * often; `npm start` runs it first (scripts/dev.mjs). Pass `--check` to fail
 * on anything out of date instead of writing it (part of `npm run check`).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Each generator, by its `npm run` name, and what it reads. */
export const GENERATORS = [
    { name: "icons", script: "scripts/generate-icons.mjs", watch: ["scripts/generate-icons.mjs"] },
    { name: "sprites", script: "scripts/generate-sprites.mjs", watch: ["src/features/spawns/assets"] },
    { name: "item-art", script: "scripts/generate-item-art.mjs", watch: ["src/features/items/art"] },
];

/** Runs one generator in its own process; false if it failed. */
export function runGenerator(generator, args = []) {
    try {
        execFileSync(process.execPath, [join(root, generator.script), ...args], { stdio: "inherit" });
        return true;
    } catch {
        return false;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const failed = GENERATORS.filter((generator) => !runGenerator(generator, args));
    if (failed.length > 0) process.exit(1);
}
