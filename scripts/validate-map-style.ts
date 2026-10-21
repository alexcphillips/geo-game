import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import {
    BASEMAP_OVERRIDES,
    GAME_LAYERS,
    OSM_SOURCE_ID,
} from "../src/theme/mapStyle";

/**
 * Validates the map's layer definitions against the MapLibre style spec.
 *
 * Worth having as a real check because map style errors are *silent*: a
 * malformed expression or a misspelled paint property doesn't throw, the layer
 * just never draws. Without this, the only way to find out is to run the app,
 * walk somewhere with a park, and notice nothing is there.
 *
 * Run with `npm run validate:map`. TypeScript runs directly via Node's type
 * stripping, so there is no build step.
 */

type LayerSpec = Record<string, unknown>;

/** Our own layers, expanded into full style-spec layer objects. */
const gameLayerSpecs: LayerSpec[] = GAME_LAYERS.map((layer) => ({
    id: layer.id,
    type: layer.type,
    source: OSM_SOURCE_ID,
    "source-layer": layer.sourceLayer,
    ...(layer.filter ? { filter: layer.filter } : {}),
    ...(layer.minzoom !== undefined ? { minzoom: layer.minzoom } : {}),
    ...(layer.paint ? { paint: layer.paint } : {}),
    ...(layer.layout ? { layout: layer.layout } : {}),
}));

/**
 * Basemap overrides aren't layers of ours, so each is wrapped in a synthetic
 * layer of the right type purely so the validator sees its paint and layout
 * values. The type is inferred from the property prefixes, since that is what
 * determines which spec applies.
 */
const allOverrides = Object.entries(BASEMAP_OVERRIDES).flatMap(([mood, overrides]) =>
    overrides.map((override) => ({ mood, override })),
);

const overrideSpecs: LayerSpec[] = allOverrides.map(({ mood, override }, index) => {
    const properties = Object.keys({ ...override.paint, ...override.layout });

    const type = properties.some((key) => key.startsWith("line-"))
        ? "line"
        : properties.some((key) => key.startsWith("background-"))
          ? "background"
          : properties.some((key) => key.startsWith("text-"))
            ? "symbol"
            : "fill";

    return {
        id: `override-check-${mood}-${index}-${override.layer}`,
        type,
        // Background layers take no source; everything else needs one to validate.
        ...(type === "background"
            ? {}
            : { source: OSM_SOURCE_ID, "source-layer": "transportation" }),
        ...(override.paint ? { paint: override.paint } : {}),
        ...(override.layout ? { layout: override.layout } : {}),
    };
});

const layers = [...gameLayerSpecs, ...overrideSpecs];

const errors = validateStyleMin({
    version: 8,
    name: "geo-game validation",
    sources: {
        [OSM_SOURCE_ID]: {
            type: "vector",
            tiles: ["https://example.com/{z}/{x}/{y}.pbf"],
        },
    },
    layers,
    // Cast through `unknown`: these layer objects are assembled dynamically, so
    // they can't satisfy the discriminated union statically — validating them at
    // runtime is the entire point of this script.
} as unknown as Parameters<typeof validateStyleMin>[0]);

if (errors.length === 0) {
    console.log(
        `map style VALID — ${GAME_LAYERS.length} game layers and ${allOverrides.length} basemap overrides (both moods) checked`,
    );
} else {
    console.error(`map style INVALID — ${errors.length} error(s):`);
    for (const error of errors) console.error(`  - ${error.message}`);
    process.exit(1);
}
