import type { GameIconName } from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import type { GeoFarmCardShape, GeoFarmPest, GeoFarmSoil, GeoFarmTile, GeoFarmWeather } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

export const WEATHER_INFO: Record<GeoFarmWeather, { label: string; icon: GameIconName; effect: string }> = {
    clear: { label: "Clear", icon: "sun", effect: "Growing crops drink 1 water." },
    overcast: { label: "Overcast", icon: "fluffy-cloud", effect: "Crops grow without drinking." },
    rain: { label: "Rain", icon: "raining", effect: "+2 water on every tile." },
    heatwave: { label: "Heatwave", icon: "heat-haze", effect: "Every tile dries by 1." },
    storm: { label: "Storm", icon: "lightning-storm", effect: "+2 water, but crops in the open may be flattened." },
    frost: { label: "Frost", icon: "snowflake-1", effect: "Nothing grows, and young crops in the open die." },
};

export const SHAPE_HINT: Record<GeoFarmCardShape, string> = {
    tile: "Tap a tile",
    row: "Tap any tile in the row",
    square3: "Tap the middle of the 3×3",
    ring: "Tap the tile to draw them onto",
    cross: "Tap the middle: the 4 tiles beside it",
    none: "",
};

export const SOIL_INFO: Record<GeoFarmSoil, { label: string; color: string | null; effect: string }> = {
    normal: { label: "Normal", color: null, effect: "" },
    rich: { label: "Rich", color: colors.soilRich, effect: "rests to a higher fertility, faster" },
    boggy: { label: "Boggy", color: colors.soilBoggy, effect: "never dries out; earthworms like it" },
    cursed: { label: "Cursed", color: colors.soilCursed, effect: "plain crops yield 1 less; some mutations want it" },
    rocky: { label: "Rocky", color: colors.textSecondary, effect: "" },
    ancient: { label: "Ancient", color: colors.cropRipe, effect: "" },
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
