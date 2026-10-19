import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the icons the app uses out of the Game Icons set into source.
 *
 * The full set (`@iconify-json/game-icons`, ~4,100 icons) is 6.5MB of JSON.
 * Importing it from app code would ship all of it in the bundle, so it is a
 * dev dependency only, and this script copies just the paths listed below into
 * `src/components/Icon/gameIcons.generated.ts`.
 *
 * To add an icon: find it at https://game-icons.net (or in react-icons' `Gi`
 * set — the same icons, `GiBroadsword` is `broadsword`), add its kebab-case name
 * to `ICONS`, and run `npm run icons`. An unknown name fails the script rather
 * than silently producing an icon that renders nothing.
 *
 * Game Icons is CC BY 3.0 — attribution is required. See README → Credits.
 *
 * Plain JS rather than TS like its neighbour: the repo deliberately has no Node
 * type definitions, since they would leak Node globals into the app's types.
 */
const ICONS = [
    // Interface
    "cog",
    "spanner",
    "exit-door",
    "vote",
    "farmer",
    "info",
    "eyeball",
    "semi-closed-eye",
    "two-shadows",
    "envelope",
    "scroll-quill",
    "spotted-bug",
    "chat-bubble",
    "newspaper",
    "tied-scroll",
    "megaphone",

    // Equipment
    "broadsword",
    "pointy-sword",
    "plain-dagger",
    "sword-slice",
    "crossed-swords",
    "shield",
    "round-shield",
    "cape",
    "belt",
    "checked-shield",
    "magic-shield",
    "knapsack",
    "swap-bag",
    "potion-ball",
    "crown",
    "scroll-unfurled",
    "treasure-map",
    "chest",
    "locked-chest",
    "open-treasure-chest",

    // Creatures and death
    "death-skull",
    "skull-crossed-bones",
    "dragon-head",
    "wolf-head",
    "goblin-head",
    "hooded-figure",

    // The world
    "campfire",
    "soul-vessel",
    "magic-swirl",
    "heart-plus",

    // Skills and location suggestions
    "histogram",
    "mining",
    "fishing-pole",
    "wheat",
    "mushrooms",
    "ancient-ruins",
    "uncertainty",
    "pin",
    "share",
    "check-mark",

    // Fishing Runs: cards, the sea creature, a landed catch
    "rope-coil",
    "muscle-up",
    "meat-hook",
    "waves",
    "hand",
    "feather",
    "eye-target",
    "tired-eye",
    "fishing-lure",
    "stopwatch",
    "kraken-tentacle",
    "fish-escape",

    // Inventory tabs
    "breastplate",
    "ring",
    "card-pick",
    "ore",
    "magnifying-glass",
    "fishing-hook",

    // Skill materials and misc items
    "crossed-bones",
    "fangs",
    "slime",
    "salmon",
    "coal-pile",
    "gold-nuggets",
    "metal-bar",
    "cut-diamond",
    "log",
    "dead-wood",
    "seedling",
    "pumpkin",
    "key",
    "skeleton-key",
    "portal",
    "sewing-string",
    "pine-tree",
    "visored-helm",
    "gauntlet",
    "greaves",
    "shoulder-armor",
    "shop",
    "ringing-bell",
    "two-coins",

    // Market: auction and buy-it-now listings
    "gavel",
    "price-tag",

    // Crafting: the Usage menu, and crafted items
    "anvil",
    "padlock",
    "fishing-net",
    "dripping-knife",
    "poison-bottle",

    // Skills menu
    "raise-zombie",
    "spade",
    "quill-ink",
    "cooking-pot",
    "upgrade",

    // Talismans
    "lightning-helix",
    "gem-pendant",
    "emerald-necklace",
    "necklace",
    "feather-necklace",
    "heart-necklace",
    "skull-ring",
    "diamond-ring",
    "rune-stone",
    "crystal-ball",
    "eye-of-horus",
    "sun",
    "moon",
    "scarab-beetle",
    "anchor",
    "lantern-flame",
    "hourglass",
    "clover",
    "totem",
    "fire-gem",
    "frozen-orb",
    "acorn",
    "ankh",
    "tooth",
    "owl",
    "spider-face",
    "gem-chain",
    "compass",
    "emerald",
    "topaz",
    "bird-claw",
    "holy-symbol",
    "cauldron",
    "fox-head",
    "snail",

    // Food and the lunchbox
    "knife-fork",
    "sliced-bread",
    "fried-fish",
    "sushis",
    "hot-meal",
    "noodles",

    // Mining Runs: cards, tiles, hazards
    "war-pick",
    "hammer-drop",
    "chisel",
    "drill",
    "dynamite",
    "wood-beam",
    "gems",
    "crystal-cluster",
    "mine-wagon",
    "stone-block",
    "rock",
    "poison-gas",
    "gas-mask",
    "earth-crack",
    "minerals",
    "gold-mine",
    "cave-entrance",
    "mining-helmet",
    "stone-pile",
    "mineral-heart",
    "powder",

    // Farming Runs: cards, crops, weather, pests
    "watering-can",
    "sprout",
    "plant-seed",
    "corn",
    "carrot",
    "tomato",
    "potato",
    "raining",
    "heavy-rain",
    "snowflake-1",
    "lightning-storm",
    "fluffy-cloud",
    "heat-haze",
    "fertilizer-bag",
    "ladybug",
    "scarecrow",
    "sickle",
    "pitchfork",
    "trowel",
    "greenhouse",
    "mouse",
    "flying-beetle",
    "earth-worm",
    "mite",
    "beetle-shell",
    "worms",
    "smoke-bomb",
    "honeypot",
    "wolf-trap",
    "bug-net",
    "flamed-leaf",
    "plant-roots",
    "pumpkin-lantern",
    "beet",
    "hypersonic-melon",
    "pollen-dust",
    "microscope",
    "musical-notes",
    "cage",
    "barrel",
    "lily-pads",
    "well",
    "lightning-arc",
    "nuclear-waste",
    "nuclear-plant",
    "stone-tablet",
    "barrel-leak",
    "radioactive",
    "crystal-shine",
    "long-antennae-bug",
    "falling-star",
    "sparkles",
    "trophy",
    "mushrooms-cluster",
    "evil-moon",
    "caterpillar",
    "spray",
    "sunflower",
    "garlic",
    "strawberry",

    // Foraging Runs: cards, finds, wildlife
    "wood-axe",
    "hatchet",
    "oak",
    "raspberry",
    "herbs-bundle",
    "mushroom-gills",
    "spotted-mushroom",
    "footprint",
    "paw-print",
    "cat",
    "spider-alt",
    "spider-web",
    "deer",
    "boar",
    "walking-boot",
    "sundial",
    "sunset",
    "sound-waves",
    "silenced",
    "hidden",
    "honeycomb",
    "beehive",
    "nest-eggs",
    "tree-roots",
    "fern",
    "basket",
    "weight",
    "fox",
    "thorny-vine",
    // Farming
    "watermelon",
    "water-drop",
    "scythe",
    "fruit-bowl",
    "sun-cloud",
];

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src/components/Icon/gameIcons.generated.ts");

/** @type {{ width: number, icons: Record<string, { body: string }> }} */
const data = JSON.parse(
    readFileSync(require.resolve("@iconify-json/game-icons/icons.json"), "utf8"),
);

const missing = ICONS.filter((name) => !data.icons[name]);
if (missing.length > 0) {
    console.error(`Not in Game Icons: ${missing.join(", ")}`);
    process.exit(1);
}

const entries = ICONS.map((name) => {
    const { body } = data.icons[name];

    // Every Game Icons body is one or more filled <path>s, which is all the
    // Icon component draws. Anything else would render wrong, so refuse it.
    if (!/^(<path [^>]*\/>)+$/.test(body)) {
        console.error(`${name}: body is not plain paths — can't convert.`);
        process.exit(1);
    }

    const paths = [...body.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    return `    ${JSON.stringify(name)}: ${JSON.stringify(paths)},`;
});

writeFileSync(
    outFile,
    `// Generated by scripts/generate-icons.mjs — do not edit. Run \`npm run icons\`.
// Icons from https://game-icons.net, CC BY 3.0.

/** Square size of every icon's coordinate space. */
export const GAME_ICON_VIEWBOX = ${data.width};

export const GAME_ICONS = {
${entries.join("\n")}
} as const;

export type GameIconName = keyof typeof GAME_ICONS;
`,
);

console.log(`Wrote ${ICONS.length} icons to ${outFile.replace(root + "/", "")}`);
