import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATORS, runGenerator } from "./generate-assets.mjs";

/**
 * `npm start` (and tunnel, android, ios): brings every generated file up to
 * date, then runs `expo start` with the given flags while watching the art.
 *
 * Adding, changing or removing a sprite or item art PNG (or editing the icon
 * list) reruns its generator, and Metro reloads the app with it. Nothing to
 * remember: art dropped in while the server was down is picked up on the next
 * start, and `npm run check` catches anything else.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Waits this long after the last change, so a batch of files is one run. */
const DEBOUNCE_MS = 300;

for (const generator of GENERATORS) runGenerator(generator);

const timers = new Map();
const watchers = GENERATORS.flatMap((generator) =>
    generator.watch.map((path) =>
        watch(join(root, path), { recursive: true }, () => {
            clearTimeout(timers.get(generator.name));
            timers.set(
                generator.name,
                setTimeout(() => {
                    if (!runGenerator(generator)) console.error(`${generator.name} failed; fix it and save again.`);
                }, DEBOUNCE_MS),
            );
        }),
    ),
);

const expo = spawn(join(root, "node_modules/.bin/expo"), ["start", ...process.argv.slice(2)], { stdio: "inherit" });

expo.on("exit", (code, signal) => {
    for (const watcher of watchers) watcher.close();
    for (const timer of timers.values()) clearTimeout(timer);
    process.exit(signal ? 1 : (code ?? 0));
});

// Ctrl+C reaches Expo too (same terminal); this only keeps us from exiting first.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => expo.kill(signal));
