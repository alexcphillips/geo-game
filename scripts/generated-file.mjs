import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

/** `--check`: report out-of-date generated files instead of writing them. */
export const CHECK = process.argv.includes("--check");

/**
 * Writes a generated file, only when its contents change, so running a
 * generator with nothing new touches nothing (no Metro reload, no diff in
 * geo-game-server). With `--check` it writes nothing and fails the run instead.
 *
 * Returns whether the file was out of date.
 */
export function emitGenerated(file, contents, { root, script }) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current === contents) return false;
    const shown = relative(root, file);
    if (CHECK) {
        console.error(`${shown} is out of date: run \`npm run ${script}\` (or \`npm run assets\`).`);
        process.exitCode = 1;
    } else {
        writeFileSync(file, contents);
        console.log(`Updated ${shown}`);
    }
    return true;
}
