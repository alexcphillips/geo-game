import type { MapWater } from "@/features/map/mapHtml";
import type { Rarity } from "@/features/inventory/rarity";
import type { GeoFishingTier, GeoFishingWater, GeoPlaceSettings } from "@/lib/geo/contracts";

export type FishingTierId = GeoFishingTier;

export type FishingTier = {
    id: FishingTierId;
    /** What the water is called in the place modal, e.g. "Lake" or "Pier". */
    label: string;
    /** One line on what fishing here is like. */
    blurb: string;
    /** Rarest catch possible here; everything up to it can bite. */
    rarities: Rarity[];
};

/** Below this, a pond is a puddle. ~45m across. */
const PUDDLE_MAX_M2 = 2_000;
/** Below this, a lake fishes like a pond. 0.1 km², ~350m across. */
const POND_MAX_M2 = 100_000;

const TIER_ORDER: FishingTierId[] = ["puddle", "pond", "lake", "open"];

const TIER_RARITIES: Record<FishingTierId, Rarity[]> = {
    puddle: ["common"],
    pond: ["common", "uncommon"],
    lake: ["common", "uncommon", "rare"],
    open: ["common", "uncommon", "rare", "epic", "legendary"],
};

/**
 * Which fishing tier a body of water is — placeholder rules, built on what
 * the map tiles actually expose: a water class, a shape (so an area) and
 * whether a pier reaches into it. There is no depth in the tiles, so "deep"
 * is inferred from class and size.
 *
 * - Ocean is always open water.
 * - Rivers are lakes. Lakes and ponds go by size, not tag — mappers tag
 *   plenty of tiny ponds as lakes: under 2,000 m² is a puddle, under
 *   0.1 km² a pond, anything bigger a lake. Docks are harbour basins and fish like lakes.
 * - A pier lifts a spot one tier: casting from its end reaches deeper water
 *   than the shore does.
 *
 * Marinas and docks marked as points have no water shape, so they fish as
 * lakes.
 *
 * A hand-made place's settings win over all of that: an admin's tier or
 * water name is used as set, and only what's left out comes from the map.
 */
export function fishingTier(
    water: MapWater | null,
    settings?: GeoPlaceSettings["fishing"],
): FishingTier {
    const base = baseTier(water);
    const id =
        settings?.tier ??
        (water?.hasPier
            ? TIER_ORDER[Math.min(TIER_ORDER.indexOf(base) + 1, TIER_ORDER.length - 1)]!
            : base);

    return {
        id,
        label: settings?.water ? WATER_LABELS[settings.water] : tierLabel(id, water),
        blurb: TIER_BLURBS[id],
        rarities: TIER_RARITIES[id],
    };
}

function baseTier(water: MapWater | null): FishingTierId {
    if (!water) return "lake";
    switch (water.kind) {
        case "ocean":
            return "open";
        case "river":
        case "dock":
            return "lake";
        // By size alone: mappers tag plenty of 300m² ponds as lakes.
        case "lake":
        case "pond":
            if (water.areaM2 < PUDDLE_MAX_M2) return "puddle";
            return water.areaM2 < POND_MAX_M2 ? "pond" : "lake";
    }
}

function tierLabel(id: FishingTierId, water: MapWater | null): string {
    if (water?.hasPier) return "Pier";
    if (!water) return "Harbour";
    if (water.kind === "ocean") return "Ocean";
    if (water.kind === "river") return "River";
    if (water.kind === "dock") return "Harbour";
    return id === "puddle" ? "Small Pond" : id === "pond" ? "Pond" : "Lake";
}

export const WATER_LABELS: Record<GeoFishingWater, string> = {
    pond: "Pond",
    lake: "Lake",
    river: "River",
    ocean: "Ocean",
    harbour: "Harbour",
    pier: "Pier",
};

/** The tier names an admin picks from, poorest first. */
export const TIER_LABELS: Record<FishingTierId, string> = {
    puddle: "Puddle",
    pond: "Pond",
    lake: "Lake",
    open: "Open water",
};

const TIER_BLURBS: Record<FishingTierId, string> = {
    puddle: "Shallow and still. Small fry only.",
    pond: "Enough room for something to grow.",
    lake: "Deep water somewhere out there. Rare fish turn up.",
    open: "Open, deep water. Anything could bite.",
};
