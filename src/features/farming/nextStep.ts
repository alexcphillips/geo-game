import type { GameIconName } from "@/components/Icon/Icon";
import type { GeoFarmView } from "@/lib/geo/contracts";
import { cropIcon, pestIcon, untilText } from "./farmText";
import { isPlantable } from "./farmView";

/**
 * The one thing the farm wants next, for the big button under the plot.
 * `tile` steps open that tile's sheet; `harvest-all` acts at once;
 * `plant-all` plants the empty tiles; `wait` and `away` are only words.
 */
export type NextStep =
    | { kind: "harvest-all"; label: string; icon: GameIconName }
    | { kind: "plant-all"; label: string; icon: GameIconName }
    | { kind: "tile"; tile: number; label: string; icon: GameIconName }
    | { kind: "wait"; label: string; icon: GameIconName }
    | { kind: "away"; label: string; icon: GameIconName };

/**
 * In order: ripe crops to pick, empty tiles to plant (with seeds held, a
 * planned tile first), a pest about to hurt a crop, then nothing but the
 * clock. A pest's harm lands on the next cycle, hours off, and picking a
 * threatened ripe crop already saves it, so a harvest comes first.
 */
export function nextStep(farm: GeoFarmView, atPlace: boolean, held: Record<string, number>, now: number): NextStep {
    if (!atPlace) return { kind: "away", label: "Work it at a farming place", icon: "farmer" };

    const ripe = farm.tiles.filter((tile) => tile.crop?.ripe && !tile.crop.rotten).length;
    if (ripe > 0) return { kind: "harvest-all", label: `Harvest ${ripe} ripe`, icon: "basket" };

    const hasSeeds = farm.crops.some((crop) => crop.seedItemId && (held[crop.seedItemId] ?? 0) > 0);
    const empty = farm.tiles.filter(isPlantable);
    if (hasSeeds && empty.length > 0) {
        const first = empty.find((tile) => tile.blueprint) ?? empty[0]!;
        const planned = first.blueprint ? farm.crops.find((crop) => crop.id === first.blueprint) : undefined;
        return {
            kind: "plant-all",
            label: empty.length === 1 ? "Plant the empty tile" : `Plant ${empty.length} empty tiles`,
            icon: planned ? cropIcon(planned.icon) : "seedling",
        };
    }

    const pest = farm.pests.find((entry) => entry.intent.kind !== "move" && farm.tiles[entry.intent.tile]?.crop);
    if (pest) {
        const type = farm.pestTypes.find((entry) => entry.id === pest.pestId);
        const target = farm.tiles[pest.intent.tile]!.crop!;
        const cropName = farm.crops.find((crop) => crop.id === target.cropId)?.name ?? "crop";
        return {
            kind: "tile",
            tile: pest.intent.tile,
            label: `${type?.name ?? "A pest"} is after your ${cropName}`,
            icon: pestIcon(type?.icon ?? ""),
        };
    }

    const growing = farm.tiles.some((tile) => tile.crop && !tile.crop.ripe);
    if (!growing && !hasSeeds && empty.length > 0) return { kind: "wait", label: "Get seeds from the Farmer", icon: "seedling" };
    const when = untilText(farm.nextTurnAt, now);
    return { kind: "wait", label: growing ? `All set · crops grow ${when}` : `All set · next cycle ${when}`, icon: "hourglass" };
}
