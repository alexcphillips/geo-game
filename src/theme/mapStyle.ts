import { colors } from "./colors";
import type { Mood } from "./palette";

/**
 * Everything about how the world looks: the basemap, the deviations we make to
 * it, and the game's own layers on top.
 *
 * ## Why this shape
 *
 * The basemap is a hosted MapLibre style. Rather than forking its JSON, we
 * (a) override specific layers of it via `BASEMAP_OVERRIDES` and (b) add our own
 * via `GAME_LAYERS`. That keeps basemap updates flowing through, and keeps every
 * deliberate deviation in one readable list instead of buried in a 20KB fork.
 *
 * All paint/layout keys use the hyphenated MapLibre style-spec form, which is
 * what `addLayer`, `setPaintProperty` and `setLayoutProperty` take directly.
 *
 * ## Tile source
 *
 * OpenFreeMap: OpenStreetMap data, no API key, no request limits, commercial use
 * permitted, attribution required (MapLibre renders it automatically). It serves
 * the **unmodified OpenMapTiles schema**, which MapTiler also serves — so
 * everything here is portable. Switching hosts is a change to
 * `BASEMAP_STYLE_URL` plus a key, with no restyling. See ARCHITECTURE.md
 * → decision 3b.
 */
export const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/**
 * Origin of the tile host, derived so it can't drift from the style URL.
 *
 * Used as the WebView document's `baseUrl`, which gives the map page a real
 * secure origin instead of `about:blank`. That matters for caching: MapLibre
 * persists tiles via the Cache Storage API, which is unavailable on an opaque
 * origin and silently no-ops there. See `mapHtml.ts`.
 *
 * Parsed with a regex rather than `new URL()` because Hermes' URL support is
 * incomplete.
 */
export const TILE_ORIGIN =
    BASEMAP_STYLE_URL.match(/^https?:\/\/[^/]+/)?.[0] ??
    "https://tiles.openfreemap.org";

/**
 * The source id inside the OpenMapTiles schema. Verified by reading the style
 * JSON — every vector layer hangs off this one source, so our layers reference
 * it instead of declaring a second source and double-fetching tiles.
 */
export const OSM_SOURCE_ID = "openmaptiles";

/**
 * Zoom bounds for the camera.
 *
 * `min` is how far OUT the player may zoom. Close, personal play wants to see
 * your own block rather than your county, and capping it stops the player
 * scouting spawns from across town without walking there — which is the game.
 */
export const ZOOM = {
    min: 14,
    max: 18,
    /** Where the camera sits by default: street level, a block or two visible. */
    initial: 16.5,
} as const;

/* ------------------------------------------------------- road geometry -- */

/**
 * Road widths as zoom-interpolated expressions.
 *
 * Pokémon Go's map reads clearly because roads are *wide pale ribbons* with
 * rounded ends, not hairlines — the road network is the thing you navigate by,
 * so it dominates. These are deliberately fatter than a conventional map would
 * draw at the same zoom.
 *
 * Expressions rather than fixed numbers because a single width that works at
 * z18 is invisible at z14.
 */
function roadWidth(atMinZoom: number, atMidZoom: number, atMaxZoom: number) {
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        14,
        atMinZoom,
        16,
        atMidZoom,
        18,
        atMaxZoom,
    ];
}

/** Rounded caps and joins. The single biggest contributor to the soft look. */
const ROUND_LINE = { "line-cap": "round", "line-join": "round" };

/* --------------------------------------------------- basemap overrides -- */

type BasemapOverride = {
    /** The basemap's own layer id — verified against the live style JSON. */
    layer: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
};

/**
 * The world's colours, per mood: a parchment map by day, an inky one at night
 * (see `palette.ts`). The night values are close to the night mockup; day is
 * the same map drawn in daylight.
 */
type MapColors = {
    land: string;
    residential: string;
    building: string;
    /** Buildings get a faint inked edge, like everything else in the game. */
    buildingEdge: string;
    wood: string;
    park: string;
    /**
     * Gameplay-relevant terrain: things spawn at water, so it must be
     * identifiable at a glance without glowing.
     */
    water: string;
    path: string;
    minor: string;
    majorCasing: string;
    majorInner: string;
    majorSubtle: string;
    motorwayCasing: string;
    motorwayInner: string;
    rail: string;
    /** The gaps in a railway's dashes: the land showing through. */
    railDash: string;
    ice: string;
    aeroway: string;
    boundary: string;
    label: string;
    labelHalo: string;
    waterLabel: string;
};

export const MAP_COLORS: Record<Mood, MapColors> = {
    day: {
        land: "#E6DCC4",
        residential: "#E1D6BC",
        building: "#D8CCB1",
        buildingEdge: "rgba(58, 48, 36, 0.35)",
        wood: "#A3BC84",
        park: "#B9CC94",
        water: "#9DBFD3",
        path: "#D3C6A6",
        minor: "#FBF6EA",
        majorCasing: "#C9BB9C",
        majorInner: "#FBF6EA",
        majorSubtle: "#F3ECDC",
        motorwayCasing: "#B9A988",
        motorwayInner: "#FFF8E8",
        rail: "#BFB194",
        railDash: "#E6DCC4",
        ice: "#EEF2F2",
        aeroway: "#D8CFBA",
        boundary: "#A89A7E",
        label: "#5A4E3E",
        labelHalo: "#F4EDDC",
        waterLabel: "#4E6E86",
    },
    dusk: {
        land: "#1E1D2A",
        residential: "#22212F",
        building: "#2B2A40",
        buildingEdge: "rgba(11, 10, 16, 0.9)",
        wood: "#1F2925",
        park: "#232F2C",
        water: "#1A2B40",
        path: "#2C2A3D",
        minor: "#363349",
        majorCasing: "#121119",
        majorInner: "#403D58",
        majorSubtle: "#363349",
        motorwayCasing: "#0E0D14",
        motorwayInner: "#4A4664",
        rail: "#2C2A3D",
        railDash: "#1E1D2A",
        ice: "#262636",
        aeroway: "#24232F",
        boundary: "#3A3850",
        label: "#ABA3B8",
        labelHalo: "#17151F",
        waterLabel: "#7FA5BD",
    },
};

const LABEL_LAYERS = [
    "highway_name_other",
    "highway_name_motorway",
    "place_other",
    "place_suburb",
    "place_village",
    "place_town",
    "place_city",
    "place_city_large",
    "place_state",
    "place_country_other",
    "place_country_minor",
    "place_country_major",
];

/**
 * Deviations from the hosted basemap, per mood, applied after it loads and
 * again whenever the mood changes.
 *
 * The basemap is OpenFreeMap's `dark` style, whose own colours are near-black
 * throughout. So every layer that draws a colour is listed here, not just the
 * ones we want to tweak: anything left out would stay black on the day map.
 *
 * Roads are Pokémon Go-ish: wide, rounded ribbons, clearly set apart from the
 * land, because the road network is what you navigate by. Casings contrast
 * with their inner fill, which gives a road the outlined-ribbon look rather
 * than a flat smear.
 *
 * Unknown layer ids are skipped rather than throwing, so a basemap that renames
 * something degrades into "less styled" instead of a blank map.
 */
function basemapOverrides(c: MapColors): BasemapOverride[] {
    return [
        // --- ground ---
        { layer: "background", paint: { "background-color": c.land } },
        { layer: "landuse_residential", paint: { "fill-color": c.residential } },
        { layer: "building", paint: { "fill-color": c.building, "fill-outline-color": c.buildingEdge } },
        // Woodland reads green but stays darker than a park, so parks remain
        // the brightest natural thing on the map.
        { layer: "landcover_wood", paint: { "fill-color": c.wood } },
        { layer: "landuse_park", paint: { "fill-color": c.park } },
        { layer: "landcover_ice_shelf", paint: { "fill-color": c.ice } },
        { layer: "landcover_glacier", paint: { "fill-color": c.ice } },
        { layer: "aeroway-area", paint: { "fill-color": c.aeroway } },
        { layer: "road_area_pier", paint: { "fill-color": c.land } },

        // --- water: the basemap's own, under ours (see GAME_LAYERS) ---
        { layer: "water", paint: { "fill-color": c.water } },
        { layer: "waterway", paint: { "line-color": c.water } },
        { layer: "game-water-fill", paint: { "fill-color": c.water } },
        { layer: "game-waterway", paint: { "line-color": c.water } },

        // --- roads: wide and rounded ---
        {
            layer: "highway_path",
            paint: { "line-color": c.path, "line-width": roadWidth(0.8, 1.6, 3) },
            layout: ROUND_LINE,
        },
        {
            layer: "highway_minor",
            paint: { "line-color": c.minor, "line-width": roadWidth(1.4, 3, 7) },
            layout: ROUND_LINE,
        },
        {
            layer: "highway_major_casing",
            paint: { "line-color": c.majorCasing, "line-width": roadWidth(3.6, 6.4, 13.5) },
            layout: ROUND_LINE,
        },
        {
            layer: "highway_major_inner",
            paint: { "line-color": c.majorInner, "line-width": roadWidth(2.6, 5, 11) },
            layout: ROUND_LINE,
        },
        {
            layer: "highway_major_subtle",
            paint: { "line-color": c.majorSubtle, "line-width": roadWidth(1.6, 3.2, 7) },
            layout: ROUND_LINE,
        },
        {
            layer: "highway_motorway_casing",
            paint: { "line-color": c.motorwayCasing, "line-width": roadWidth(4.4, 7.6, 15.5) },
            layout: ROUND_LINE,
        },
        { layer: "highway_motorway_inner", paint: { "line-color": c.motorwayInner } },
        {
            layer: "highway_motorway_subtle",
            paint: { "line-color": c.motorwayInner, "line-width": roadWidth(3.2, 6, 13) },
            layout: ROUND_LINE,
        },
        { layer: "road_pier", paint: { "line-color": c.land } },
        { layer: "aeroway-taxiway", paint: { "line-color": c.aeroway } },
        { layer: "aeroway-runway-casing", paint: { "line-color": c.majorCasing } },
        { layer: "aeroway-runway", paint: { "line-color": c.aeroway } },

        // --- rail: present but recessive, it isn't walkable ---
        { layer: "railway", paint: { "line-color": c.rail } },
        { layer: "railway_minor", paint: { "line-color": c.rail } },
        { layer: "railway_transit", paint: { "line-color": c.rail } },
        { layer: "railway_dashline", paint: { "line-color": c.railDash } },
        { layer: "railway_minor_dashline", paint: { "line-color": c.railDash } },
        { layer: "railway_transit_dashline", paint: { "line-color": c.railDash } },

        // --- boundaries and names ---
        { layer: "boundary_state", paint: { "line-color": c.boundary } },
        { layer: "boundary_country_z0-4", paint: { "line-color": c.boundary } },
        { layer: "boundary_country_z5-", paint: { "line-color": c.boundary } },
        { layer: "water_name", paint: { "text-color": c.waterLabel, "text-halo-color": c.labelHalo } },
        ...LABEL_LAYERS.map((layer) => ({
            layer,
            paint: { "text-color": c.label, "text-halo-color": c.labelHalo },
        })),
    ];
}

export const BASEMAP_OVERRIDES: Record<Mood, BasemapOverride[]> = {
    day: basemapOverrides(MAP_COLORS.day),
    dusk: basemapOverrides(MAP_COLORS.dusk),
};

/* -------------------------------------------------------- game layers -- */

export type GameLayer = {
    id: string;
    type: "fill" | "line" | "circle" | "symbol";
    /** Layer within the OpenMapTiles source. */
    sourceLayer: string;
    filter?: unknown;
    minzoom?: number;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
};

/**
 * Landmark points: `poi` classes and subclasses worth walking to.
 *
 * Matched against both fields because the schema splits them inconsistently —
 * some features carry the value as `class`, others as `subclass`. The `match`
 * defaults to `false`, so a value absent from the schema renders nothing rather
 * than erroring.
 *
 * Despite the schema's description, `poi` *does* carry parks, playgrounds and
 * stadiums as named points (checked against live OpenFreeMap tiles). That makes
 * it the marker source for those too: the `landuse` polygons that fill them
 * have no `name` field at all.
 *
 * `pitch` and `sports_centre` are deliberately absent. OSM maps every court and
 * field in a park as its own pitch, so including them turned one park into a
 * dozen landmarks.
 *
 * `place_of_worship` is excluded too, by choice: churches, temples and other
 * religious buildings are not game landmarks. Every religion is tagged under
 * that one class (`subclass` holds the religion), so leaving it out covers
 * them all. A cathedral famous enough to be tagged an attraction or monument
 * still comes through under that class, which is intended.
 *
 * Cemeteries and churchyards (`cemetery`, subclass `grave_yard`) are excluded
 * for the same reason.
 */
const LANDMARK_POINT_CLASSES = [
    "park",
    "playground",
    "stadium",
    "theme_park",
    "zoo",
    "monument",
    "memorial",
    "artwork",
    "attraction",
    "viewpoint",
    "picnic_site",
    "fountain",
    "museum",
];

const LANDMARK_POINT_FILTER = [
    "all",
    ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
    // A landmark you can't name isn't somewhere you'd say "meet me at".
    ["has", "name"],
    [
        "any",
        ["match", ["get", "class"], LANDMARK_POINT_CLASSES, true, false],
        ["match", ["get", "subclass"], LANDMARK_POINT_CLASSES, true, false],
    ],
];

/**
 * Layers the landmark marker pass reads from.
 *
 * Markers are DOM elements placed at each landmark's centre rather than a
 * symbol layer, because that needs no sprite icon or exotic glyph, gives full
 * CSS control over the look, and is the same mechanism the real
 * server-driven landmarks will use. See `mapHtml.ts`.
 *
 * Parks, playgrounds and stadiums are marked from the named `poi` points, not
 * their `landuse` polygons: `landuse` has no names, so every pitch and
 * playground polygon became its own anonymous marker.
 */
export const LANDMARK_MARKER_LAYER_IDS = [
    "game-protected-fill",
    "game-landmark-point",
];

/**
 * Skill hubs — prototype.
 *
 * Real places classified by the skill they would host: industrial land, rock
 * and quarries for mining; water for fishing; allotments and orchards for
 * farming; woods and scrub for foraging. Parks are general landmarks (events,
 * dungeons), not a skill. Each source
 * is an invisible layer (zero opacity, so `queryRenderedFeatures` still sees
 * it) and the marker pass in `mapHtml.ts` draws a dot in the skill's colour.
 *
 * Classes were read out of live OpenFreeMap tiles, not recalled. Known gaps:
 *
 * - Real geology is nearly absent from cities: north Dallas has one quarry and
 *   one patch of bare rock in ~440 km². Industrial land stands in for it.
 * - Gardens are only taken from *named* `poi` points. Unnamed `garden`
 *   polygons are mostly private back gardens, and the tiles drop the `access`
 *   tag that would tell them apart. Proper hub data needs the server-side OSM
 *   import.
 */
export type Skill = "mining" | "fishing" | "farming" | "foraging";

export const SKILL_COLORS: Record<Skill, string> = {
    mining: colors.skillMining,
    fishing: colors.skillFishing,
    farming: colors.skillFarming,
    foraging: colors.skillForaging,
};

/** Invisible, but still queryable. */
const QUERY_ONLY_FILL = { "fill-opacity": 0 };
const QUERY_ONLY_CIRCLE = {
    "circle-opacity": 0,
    "circle-stroke-opacity": 0,
};

/**
 * Where an unnamed area's marker goes:
 * - `centre`: the middle of the area. Fine for lakes and rock — open ground.
 * - `edge`: the point on the area's outline nearest the player. For land that
 *   is usually fenced and private, so the marker says "play from out here"
 *   rather than drawing people inside.
 */
export type SkillPlacement = "centre" | "edge";

type SkillLayer = GameLayer & { skill: Skill; placement?: SkillPlacement };

/** The fishing-water layer, whose areas carry water info for tiers. */
export const FISHING_WATER_LAYER_ID = "game-skill-fishing-water";

/**
 * Piers, as a query-only source: a pier reaching into a water area makes it a
 * better fishing spot. Never drawn and never a marker of its own.
 */
export const PIER_LAYER_ID = "game-pier-query";

const SKILL_LAYERS: SkillLayer[] = [
    {
        // Warehouses, works and yards. Usually fenced private land, hence
        // edge placement: the hub is played from the street.
        id: "game-skill-mining-industrial",
        skill: "mining",
        placement: "edge",
        type: "fill",
        sourceLayer: "landuse",
        filter: ["==", ["get", "class"], "industrial"],
        paint: QUERY_ONLY_FILL,
    },
    {
        id: "game-skill-mining-rock",
        skill: "mining",
        type: "fill",
        sourceLayer: "landcover",
        filter: ["==", ["get", "class"], "rock"],
        paint: QUERY_ONLY_FILL,
    },
    {
        id: "game-skill-mining-quarry",
        skill: "mining",
        type: "fill",
        sourceLayer: "landuse",
        filter: ["==", ["get", "class"], "quarry"],
        paint: QUERY_ONLY_FILL,
    },
    {
        // Ponds to oceans, never swimming pools. Edge-placed: the marker sits
        // on the shore nearest the player, which is where you fish from —
        // and a big lake's centre can be a kilometre out, off-screen and out
        // of reach. Each area also reports its water class, size and any
        // pier, which decide its fishing tier (see places/fishingWaters.ts).
        id: FISHING_WATER_LAYER_ID,
        skill: "fishing",
        placement: "edge",
        type: "fill",
        sourceLayer: "water",
        filter: [
            "match",
            ["get", "class"],
            ["pond", "lake", "river", "dock", "ocean"],
            true,
            false,
        ],
        paint: QUERY_ONLY_FILL,
    },
    {
        id: "game-skill-fishing-point",
        skill: "fishing",
        type: "circle",
        sourceLayer: "poi",
        filter: [
            "all",
            ["has", "name"],
            ["match", ["get", "subclass"], ["marina", "dock"], true, false],
        ],
        paint: QUERY_ONLY_CIRCLE,
    },
    {
        id: "game-skill-farming-area",
        skill: "farming",
        type: "fill",
        sourceLayer: "landcover",
        filter: [
            "any",
            ["==", ["get", "class"], "farmland"],
            ["match", ["get", "subclass"], ["allotments", "orchard"], true, false],
        ],
        paint: QUERY_ONLY_FILL,
    },
    {
        id: "game-skill-farming-garden",
        skill: "farming",
        type: "circle",
        sourceLayer: "poi",
        filter: [
            "all",
            ["has", "name"],
            ["==", ["get", "subclass"], "garden"],
        ],
        paint: QUERY_ONLY_CIRCLE,
    },
    {
        // Woods and wild ground, not mown park grass: parks stay general
        // landmarks for events and dungeons.
        id: "game-skill-foraging-wild",
        skill: "foraging",
        type: "fill",
        sourceLayer: "landcover",
        filter: [
            "any",
            ["==", ["get", "class"], "wood"],
            ["match", ["get", "subclass"], ["scrub", "heath"], true, false],
        ],
        paint: QUERY_ONLY_FILL,
    },
];

/** Which skill each skill-source layer marks, for the marker pass. */
export const SKILL_MARKER_LAYERS: Record<string, Skill> = Object.fromEntries(
    SKILL_LAYERS.map((layer) => [layer.id, layer.skill]),
);

/** Skill-source layers whose markers sit on the area's edge. */
export const SKILL_EDGE_LAYER_IDS: string[] = SKILL_LAYERS.filter(
    (layer) => layer.placement === "edge",
).map((layer) => layer.id);

/**
 * The game's own layers, drawn above the basemap in this order.
 *
 * Water first, then the (invisible) protected-area marker source, then
 * landmark points on top.
 */
export const GAME_LAYERS: GameLayer[] = [
    /**
     * Water: ponds, lakes, rivers.
     *
     * Slate blue purely so it is *identifiable* — the stock basemap renders
     * water nearly the same value as land, so a pond you could navigate by
     * vanishes. Deliberately no outline: water needs to be recognised, not
     * emphasised. Drawn in day colours; the mood's overrides repaint it.
     */
    {
        id: "game-water-fill",
        type: "fill",
        sourceLayer: "water",
        paint: { "fill-color": MAP_COLORS.day.water, "fill-opacity": 1 },
    },
    {
        id: "game-waterway",
        type: "line",
        sourceLayer: "waterway",
        paint: { "line-color": MAP_COLORS.day.water, "line-width": 2 },
        layout: ROUND_LINE,
    },

    {
        id: PIER_LAYER_ID,
        type: "line",
        sourceLayer: "transportation",
        filter: ["==", ["get", "class"], "pier"],
        paint: { "line-opacity": 0 },
    },

    /**
     * Protected areas and nature reserves, from the `park` source-layer.
     *
     * Invisible on purpose. Parks and fields are no longer highlighted, but
     * this layer is still a marker source (see LANDMARK_MARKER_LAYER_IDS), and
     * `queryRenderedFeatures` only sees layers that exist and are visible — so
     * it stays, with zero opacity rather than `visibility: none`.
     */
    {
        id: "game-protected-fill",
        type: "fill",
        sourceLayer: "park",
        paint: { "fill-opacity": 0 },
    },

    // `skill` and `placement` are marker-pass metadata, not layer properties.
    ...SKILL_LAYERS.map(
        ({ skill: _skill, placement: _placement, ...layer }) => layer,
    ),

    /**
     * Named point landmarks: parks, monuments, artworks, fountains. A marker
     * source only — the marker pass draws each one as a DOM badge with an
     * icon, like the skill hubs, so the layer itself is invisible.
     */
    {
        id: "game-landmark-point",
        type: "circle",
        sourceLayer: "poi",
        filter: LANDMARK_POINT_FILTER,
        paint: QUERY_ONLY_CIRCLE,
    },
];
