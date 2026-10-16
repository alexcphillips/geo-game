import type { GameIconName } from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";
import type { MapWater } from "@/features/map/mapHtml";
import {
    GEO_PLACE_REACH_METRES,
    type GeoPlace,
    type GeoPlaceKind,
    type GeoPlaceSettings,
} from "@/lib/geo/contracts";
import { SKILL_COLORS, type Skill } from "@/theme/mapStyle";

/** A landmark or skill hub the player tapped on the map: from the tiles, or hand-made. */
export type MapPlace = {
    /** Stable for as long as the place is on the map. */
    id: string;
    /** Empty for unnamed areas — most lakes and industrial lots. */
    name: string;
    /** Null for general landmarks (parks, monuments). */
    skill: Skill | null;
    /** Where the marker is drawn: an edge-placed hub's nearest edge point. */
    latitude: number;
    longitude: number;
    /**
     * Fishing water areas: what the tiles say about the water. A hand-made
     * fishing spot has the water it was put on, if any.
     */
    water?: MapWater | null;
    /** Set only for places an admin made, which the server keeps. */
    handMade?: { description: string; settings: GeoPlaceSettings };
};

/**
 * How close the player must be to open a place, in metres — Pokémon Go's
 * PokéStop reach is 40m. Measured to the marker, so an industrial hub's reach
 * starts at its fence, not its middle.
 */
export const PLACE_REACH_METRES = GEO_PLACE_REACH_METRES;

export type PlaceTypeInfo = { label: string; icon: GameIconName; color: string };

/*
 * Icons double as the map marker badges, so they are picked to read at 16px:
 * a fish rather than a rod, a tree rather than mushrooms.
 */

const SKILL_TYPES: Record<Skill, PlaceTypeInfo> = {
    mining: { label: "Mining", icon: "mining", color: SKILL_COLORS.mining },
    fishing: { label: "Fishing", icon: "salmon", color: SKILL_COLORS.fishing },
    farming: { label: "Farming", icon: "wheat", color: SKILL_COLORS.farming },
    foraging: { label: "Foraging", icon: "pine-tree", color: SKILL_COLORS.foraging },
};

const LANDMARK_TYPE: PlaceTypeInfo = {
    label: "POI",
    icon: "ancient-ruins",
    color: colors.emberBright,
};

/** Every place type, keyed as the map page knows them: a skill, or "landmark". */
export const PLACE_TYPES: Record<Skill | "landmark", PlaceTypeInfo> = {
    ...SKILL_TYPES,
    landmark: LANDMARK_TYPE,
};

export function placeTypeInfo(skill: Skill | null): PlaceTypeInfo {
    return skill ? SKILL_TYPES[skill] : LANDMARK_TYPE;
}

/** A hand-made place's kind as the map knows it: a skill, or null for a landmark. */
export function kindToSkill(kind: GeoPlaceKind): Skill | null {
    return kind === "landmark" ? null : kind;
}

export function skillToKind(skill: Skill | null): GeoPlaceKind {
    return skill ?? "landmark";
}

/** A server place as the map and the place modal use it. */
export function handMadeMapPlace(place: GeoPlace, water: MapWater | null = null): MapPlace {
    return {
        id: place.id,
        name: place.name,
        skill: kindToSkill(place.kind),
        latitude: place.latitude,
        longitude: place.longitude,
        water,
        handMade: { description: place.description, settings: place.settings },
    };
}
