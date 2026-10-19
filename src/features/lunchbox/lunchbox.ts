import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { catalogueItem } from "@/features/player/toInventoryItem";
import {
    GEO_LUNCHBOX_MAX_SLOTS,
    GEO_LUNCHBOX_STACK_SIZE,
    type GeoItemView,
    type GeoLunchboxSlot,
} from "@/lib/geo/contracts";

/** Slots a lunchbox can ever have; the ones not yet unlocked show locked. */
export const LUNCHBOX_MAX_SLOTS = GEO_LUNCHBOX_MAX_SLOTS;
/** Most of one food a slot holds. */
export const LUNCHBOX_STACK_SIZE = GEO_LUNCHBOX_STACK_SIZE;

/** Whether an item is food: a consumable the lunchbox takes. */
export function isFood(def: GeoItemView | undefined): boolean {
    return def?.kind === "consumable" && def.food !== undefined;
}

/** Whether an item is bait: a consumable the bait slots take. */
export function isBait(def: GeoItemView | undefined): boolean {
    return def?.kind === "consumable" && def.bait === true;
}

/** One slot as the screens draw it: a food tile with how many are left. */
export type PackedSlot = { slot: number; item: InventoryItem; quantity: number };

/** Packed slots (lunchbox or bait), drawn like inventory items. Food the content no longer has is left out. */
export function packedSlots(
    contents: GeoLunchboxSlot[],
    items: Record<string, GeoItemView>,
    kind: "lunchbox" | "bait" = "lunchbox",
): PackedSlot[] {
    return contents.flatMap((entry) => {
        const def = items[entry.itemId];
        if (!def) return [];
        return [{ slot: entry.slot, quantity: entry.quantity, item: catalogueItem(def, `${kind}-${entry.slot}`) }];
    });
}
