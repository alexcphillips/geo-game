import type { GeoFarmTile, GeoFarmView } from "@/lib/geo/contracts";
import { threatenedTiles } from "./farmText";

/** The part of the 9×9 worth drawing: what's owned plus a ring around it, where the next tiles are bought. */
export type FarmArea = { left: number; top: number; width: number; height: number };

export function visibleArea(tiles: GeoFarmTile[], size: number): FarmArea {
    const owned = tiles.filter((tile) => tile.owned);
    if (owned.length === 0) return { left: 0, top: 0, width: size, height: size };
    const left = Math.max(0, Math.min(...owned.map((tile) => tile.x)) - 1);
    const top = Math.max(0, Math.min(...owned.map((tile) => tile.y)) - 1);
    const right = Math.min(size - 1, Math.max(...owned.map((tile) => tile.x)) + 1);
    const bottom = Math.min(size - 1, Math.max(...owned.map((tile) => tile.y)) + 1);
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function inArea(tile: GeoFarmTile, area: FarmArea): boolean {
    return tile.x >= area.left && tile.x < area.left + area.width && tile.y >= area.top && tile.y < area.top + area.height;
}

/**
 * Which Farm menu features to show. Each turns up once it has something to
 * do, so a new farm's menu is short: Build and Orders always; the Lab once
 * a mutation is found or ready; the Pesthunter once a Pest Cage stands or
 * points are banked; Contests once anything grows.
 */
export function farmFeatures(farm: GeoFarmView, cageKinds: Set<string>) {
    return {
        lab: farm.lab.found.length > 0 || farm.lab.ready.length > 0 || farm.tiles.some((tile) => tile.crop && farm.crops.find((crop) => crop.id === tile.crop!.cropId)?.mutation),
        pesthunter: farm.pesthunter.points > 0 || farm.tiles.some((tile) => tile.structure && cageKinds.has(tile.structure.structureId)),
        contests: farm.tiles.some((tile) => tile.crop) || farm.contests.standings.some((standing) => standing.rank !== null),
    };
}

/** An owned tile a seed can go in: no crop, structure, or waste on it. */
export function isPlantable(tile: GeoFarmTile): boolean {
    return tile.owned && !tile.crop && !tile.structure && tile.partOf === null && !tile.waste;
}

/** The one mark a tile shows, most urgent first. */
export type TileBadge = "pest" | "threat" | "ripe" | "held" | "trap" | "pollinated" | null;

export function tileBadge(tile: GeoFarmTile, hasPest: boolean, threatened: boolean): TileBadge {
    if (hasPest) return "pest";
    if (threatened && tile.crop) return "threat";
    if (tile.crop?.ripe && !tile.crop.rotten) return "ripe";
    if (tile.crop?.held) return "held";
    if (tile.trap) return "trap";
    if (tile.pollinated) return "pollinated";
    return null;
}

/** Threatened tiles that hold a crop: what a pest will actually hurt. */
export function threatenedCrops(farm: GeoFarmView): Set<number> {
    const threatened = threatenedTiles(farm.pests);
    return new Set([...threatened].filter((index) => farm.tiles[index]?.crop));
}
