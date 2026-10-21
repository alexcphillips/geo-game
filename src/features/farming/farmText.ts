import type { GameIconName } from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import type { GeoFarmCardShape, GeoFarmGround, GeoFarmPest, GeoFarmTile, GeoFarmWeather } from "@/lib/geo/contracts";

export const WEATHER_INFO: Record<GeoFarmWeather, { label: string; icon: GameIconName; effect: string }> = {
    clear: { label: "Clear", icon: "sun", effect: "Crops grow as usual." },
    rain: { label: "Rain", icon: "raining", effect: "Open ground is wet." },
    heatwave: { label: "Heatwave", icon: "heat-haze", effect: "Open ground dries out: crops there don't grow, unless a Well is near." },
    frost: { label: "Frost", icon: "snowflake-1", effect: "Nothing grows in the open; under a Greenhouse it grows as usual." },
};

/** A tile's ground on the coming cycle, for its facts line. */
export const GROUND_FACT: Record<GeoFarmGround, string> = {
    normal: "normal ground next cycle",
    wet: "wet next cycle",
    dry: "dry next cycle, won't grow",
};

export const SHAPE_HINT: Record<GeoFarmCardShape, string> = {
    tile: "Tap a tile",
    row: "Tap any tile in the row",
    square3: "Tap the middle of the 3×3",
    ring: "Tap the tile to draw them onto",
    cross: "Tap the middle: the 4 tiles beside it",
    none: "",
};

/** A crop's icon if this build has it; seedlings otherwise. */
export function cropIcon(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "sprout";
}

/** A structure's icon if this build has it; a chest otherwise. */
export function structureIcon(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "chest";
}

/** A pest's icon if this build has it; a bug otherwise. */
export function pestIcon(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "spotted-bug";
}

const ARROWS = [
    ["↖", "↑", "↗"],
    ["←", "", "→"],
    ["↙", "↓", "↘"],
];

/** Which way a pest is headed: an arrow toward the tile it acts on, or "" when it acts where it is. */
export function pestArrow(pest: GeoFarmPest, size: number): string {
    const dx = Math.sign((pest.intent.tile % size) - (pest.tile % size));
    const dy = Math.sign(Math.floor(pest.intent.tile / size) - Math.floor(pest.tile / size));
    return ARROWS[dy + 1]![dx + 1]!;
}

/** Tiles a pest will harm on the next turn: eaten, drained, sapped or bred onto. */
export function threatenedTiles(pests: GeoFarmPest[]): Set<number> {
    return new Set(pests.filter((pest) => pest.intent.kind !== "move").map((pest) => pest.intent.tile));
}

/** Tiles a card would touch if aimed at `index`, for the preview. */
/**
 * The tiles a structure of `footprint` covers placed from `index`, as the
 * server works it out: centred, an even side reaching one further right or
 * down. Clipped to the grid (the server refuses one that runs off).
 */
export function footprintTiles(footprint: { width: number; height: number }, index: number, size: number): Set<number> {
    const left = (index % size) - Math.floor((footprint.width - 1) / 2);
    const top = Math.floor(index / size) - Math.floor((footprint.height - 1) / 2);
    const tiles = new Set<number>();
    for (let dy = 0; dy < footprint.height; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
            const x = left + dx;
            const y = top + dy;
            if (x >= 0 && y >= 0 && x < size && y < size) tiles.add(y * size + x);
        }
    }
    return tiles;
}

export function shapeTiles(shape: GeoFarmCardShape, index: number, size: number): Set<number> {
    const x = index % size;
    const y = Math.floor(index / size);
    const tiles = new Set<number>();
    if (shape === "tile") tiles.add(index);
    if (shape === "row") for (let col = 0; col < size; col++) tiles.add(y * size + col);
    if (shape === "cross") {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < size && ny < size) tiles.add(ny * size + nx);
        }
    }
    if (shape === "square3" || shape === "ring") {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (shape === "ring" && dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < size && ny < size) tiles.add(ny * size + nx);
            }
        }
    }
    return tiles;
}

/** "in 5h 12m", "in 40m", "any moment". */
export function untilText(iso: string, now: number): string {
    const minutes = Math.ceil((new Date(iso).getTime() - now) / 60_000);
    if (minutes <= 0) return "any moment";
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`;
}

/** One line on a tile's crop, for the tile panel. */
export function cropLine(tile: GeoFarmTile, cropName: string): string {
    const crop = tile.crop;
    if (!crop) return "Empty";
    if (crop.rotten) return `Rotten ${cropName}`;
    if (!crop.ripe) return `${cropName} · stage ${crop.stage}/${crop.stages}`;
    const bonus = crop.ripeTurns > 0 ? ` · +${crop.ripeTurns} yield from waiting` : "";
    const risk = crop.held ? " · held" : ` · ${Math.round(crop.rotChance * 100)}% rot next cycle`;
    return `Ripe ${cropName}${bonus}${risk}`;
}

/** What Farming Fortune multiplies a harvest by, for display: 150 → "2.5". */
export function fortuneMultiplier(fortune: number): string {
    return String(Math.round((1 + fortune / 100) * 100) / 100);
}
