import type { InventoryItem } from "@/features/items/inventoryItems";
import type { Rarity } from "@/features/items/rarity";
import { GEO_TALISMAN_BAG_PAGE_SIZE } from "@/lib/geo/contracts";

/**
 * A talisman counts only while it's in the Talisman Bag, and the bag holds
 * one copy of each. One taken out goes back to the inventory, inactive.
 *
 * They reuse the inventory's item shape so the same tile and detail page
 * render them, and sit in its Accessories tab while out of the bag.
 */
export type Talisman = InventoryItem;

/** Talismans per bag page, as a 5 × 5 grid: the server's page size. */
export const TALISMAN_BAG_PAGE_SIZE = GEO_TALISMAN_BAG_PAGE_SIZE;
export const TALISMAN_BAG_COLUMNS = Math.sqrt(TALISMAN_BAG_PAGE_SIZE);

/**
 * Magic Power a talisman adds to the bag's total, by rarity. Rarer talismans
 * are worth more even when their effect is small, so collecting is its own
 * reward.
 */
export const MAGIC_POWER: Record<Rarity, number> = {
    common: 3,
    uncommon: 5,
    rare: 8,
    epic: 12,
    legendary: 16,
};

export function magicPowerOf(talismans: Talisman[]): number {
    return talismans.reduce((total, talisman) => total + MAGIC_POWER[talisman.rarity], 0);
}
