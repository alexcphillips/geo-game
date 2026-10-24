import { useMemo } from "react";
import type { GeoEquipmentSlot } from "@/lib/geo/contracts";
import { useEquipment } from "@/features/player/usePlayer";
import { usePlayerStore } from "@/features/player/playerStore";
import { FIGURE_LAYERS, type FigureLayerSlot } from "./figureLayers.generated";

/** Each layer slot's appearance: which `layers/<slot>/<appearance>.png` to draw. */
export type FigureGear = Partial<Record<FigureLayerSlot, string>>;

/**
 * The equipment slots the figure shows, back to front. Other slots (hands,
 * belt, cloak, rings…) get no layer: a few pixels at figure size.
 */
export const FIGURE_SLOTS: readonly { equipment: GeoEquipmentSlot; layer: FigureLayerSlot }[] = [
    { equipment: "legs", layer: "legs" },
    { equipment: "chest", layer: "chest" },
    { equipment: "head", layer: "head" },
    { equipment: "mainHand", layer: "main-hand" },
    // The shield arm is nearest the viewer, so it covers a weapon crossing the body.
    { equipment: "offHand", layer: "off-hand" },
];

/**
 * What the player's figure wears, from their equipment. An item's
 * appearance is its id for now; items without a layer draw nothing, so gear
 * can ship before its art.
 */
export function useOwnFigureGear(): FigureGear {
    const equipment = useEquipment();
    const inventory = usePlayerStore((state) => state.me?.inventory);
    return useMemo(() => {
        const itemIdByEntry = new Map((inventory ?? []).map((entry) => [entry.id, entry.itemId]));
        const gear: FigureGear = {};
        for (const { equipment: slot, layer } of FIGURE_SLOTS) {
            const entryId = equipment[slot];
            const itemId = entryId ? itemIdByEntry.get(entryId) : undefined;
            if (itemId && FIGURE_LAYERS[layer][itemId]) gear[layer] = itemId;
        }
        return gear;
    }, [equipment, inventory]);
}
