import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies geo-game's API contracts out of cozy-app, where the server lives.
 *
 * This repo can't import `@cozy/shared/geo` across repos, so the contract
 * files are copied into `src/lib/geo/contracts/` as-is, each stamped "do not
 * edit". Change a contract in cozy-app (`shared/src/geo/`), then run
 * `npm run sync:contracts` here; a type error in the app is the sync working.
 *
 * Expects cozy-app next to this repo; set COZY_APP_DIR to point elsewhere.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(resolve(root, process.env.COZY_APP_DIR ?? "../cozy-app"), "shared/src/geo");
const target = join(root, "src/lib/geo/contracts");

const files = readdirSync(source).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
if (files.length === 0) throw new Error(`No contract files in ${source}`);

const stamped = (name) =>
    `// Copied from cozy-app/shared/src/geo/${name} by scripts/sync-geo-contracts.mjs — do not edit.\n\n${readFileSync(join(source, name), "utf8")}`;

// `--check`: say whether the copies match cozy-app, changing nothing (for `npm run check`).
if (process.argv.includes("--check")) {
    const copied = existsSync(target) ? readdirSync(target).filter((name) => name.endsWith(".ts")) : [];
    const stale = [
        ...files.filter((name) => !existsSync(join(target, name)) || readFileSync(join(target, name), "utf8") !== stamped(name)),
        ...copied.filter((name) => !files.includes(name)),
    ];
    if (stale.length > 0) {
        console.error(`Contracts out of date (${stale.join(", ")}). Run \`npm run sync:contracts\`.`);
        process.exit(1);
    }
    console.log(`Contracts match cozy-app (${files.length} files).`);
    process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const name of files) {
    writeFileSync(join(target, name), stamped(name));
}

console.log(`Synced ${files.length} contract files into src/lib/geo/contracts/`);
