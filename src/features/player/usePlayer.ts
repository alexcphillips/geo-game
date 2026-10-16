import { useMemo } from "react";
import { isFaded, type InventoryItem } from "@/features/inventory/inventoryItems";
import type { GeoBait, GeoEquipmentSlot, GeoLunchbox, GeoPetUpgrade, GeoSavedHand, GeoSeedBag, GeoTalismanBag } from "@/lib/geo/contracts";
import { usePlayerStore } from "./playerStore";
import { toInventoryItem } from "./toInventoryItem";

// Fallbacks before the player loads, shared so selectors return the same
// object each render rather than a fresh empty one.
const NO_EQUIPMENT: Partial<Record<GeoEquipmentSlot, string>> = {};
const NO_BAG: GeoTalismanBag = { pages: 1, inventoryIds: [] };
const NO_LUNCHBOX: GeoLunchbox = { slots: 1, contents: [] };
const NO_BAIT: GeoBait = { slots: 1, contents: [] };
const NO_SEEDS: GeoSeedBag = { slots: 1, contents: [] };
const NO_HANDS: Record<string, string[]> = {};
const NO_SAVED_HANDS: GeoSavedHand[] = [];
const NO_XP: Record<string, number> = {};

/** Everything the player owns, talismans and cards included, ready to draw. */
export function useInventory(): InventoryItem[] {
    const entries = usePlayerStore((state) => state.me?.inventory);
    const items = usePlayerStore((state) => state.items);
    const reforges = usePlayerStore((state) => state.reforges);
    return useMemo(
        () =>
            (entries ?? []).flatMap((entry) => {
                const def = items[entry.itemId];
                // An item the server no longer defines: skip it rather than crash.
                return def ? [toInventoryItem(entry, def, reforges)] : [];
            }),
        [entries, items, reforges],
    );
}

/** Slot → the inventory id worn there. */
export function useEquipment(): Partial<Record<GeoEquipmentSlot, string>> {
    return usePlayerStore((state) => state.me?.equipment ?? NO_EQUIPMENT);
}

export function useTalismanBag(): GeoTalismanBag {
    return usePlayerStore((state) => state.me?.talismanBag ?? NO_BAG);
}

/** Slots unlocked, and the food packed in them. */
export function useLunchbox(): GeoLunchbox {
    return usePlayerStore((state) => state.me?.lunchbox ?? NO_LUNCHBOX);
}

/** Seed Bag slots unlocked, and the seeds packed in them. */
export function useSeedBag(): GeoSeedBag {
    return usePlayerStore((state) => state.me?.seedBag ?? NO_SEEDS);
}

/** Bait slots unlocked, and the bait packed in them. */
export function useBait(): GeoBait {
    return usePlayerStore((state) => state.me?.bait ?? NO_BAIT);
}

/** Skill → inventory ids, in hand order. */
export function useHands(): Record<string, string[]> {
    return usePlayerStore((state) => state.me?.hands ?? NO_HANDS);
}

export function useSavedHands(): GeoSavedHand[] {
    return usePlayerStore((state) => state.me?.savedHands ?? NO_SAVED_HANDS);
}

/**
 * Inventory ids that are worn, in the Talisman Bag, in a hand or the active
 * pet: the server won't sell, list or craft with these.
 */
export function useInUseIds(): Set<string> {
    const equipment = useEquipment();
    const bag = useTalismanBag().inventoryIds;
    const hands = useHands();
    const activePet = useActivePetId();
    return useMemo(
        () => new Set([...Object.values(equipment), ...bag, ...Object.values(hands).flat(), ...(activePet ? [activePet] : [])]),
        [equipment, bag, hands, activePet],
    );
}

/** The active pet's inventory id, or null. */
export function useActivePetId(): string | null {
    return usePlayerStore((state) => state.me?.activePet ?? null);
}

/** The pet left with Kat, or null. */
export function usePetUpgrade(): GeoPetUpgrade | null {
    return usePlayerStore((state) => state.me?.petUpgrade ?? null);
}

/** Skill → total XP. */
export function useSkillXp(): Record<string, number> {
    return usePlayerStore((state) => state.me?.skillXp ?? NO_XP);
}

export function useCoins(): number {
    return usePlayerStore((state) => state.me?.player.coins ?? 0);
}

/** A skill's current hand, as cards to draw, in hand order. Faded cards are left out. */
export function useCurrentHand(skill: string): InventoryItem[] {
    const inventory = useInventory();
    const handIds = useHands()[skill];
    return useMemo(
        () =>
            (handIds ?? []).flatMap((id) => {
                const card = inventory.find((item) => item.id === id);
                return card && !isFaded(card) ? [card] : [];
            }),
        [handIds, inventory],
    );
}
