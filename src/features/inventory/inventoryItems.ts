import type { GameIconName } from "@/components/Icon/Icon";
import type { CardSkill } from "@/features/cards/cardSkills";
import type { EquipKind } from "@/features/character/characterSlots";
import type { GeoPetState, GeoQualityTier } from "@/lib/geo/contracts";
import { rarityInfo, type Rarity } from "./rarity";

/**
 * Inventory tabs, in display order. Each item belongs to exactly one.
 *
 * Adding a tab is one entry here plus whatever items carry its id.
 */
export type InventoryTabId =
    | "weapons"
    | "armor"
    | "accessories"
    | "cards"
    | "materials"
    | "consumables"
    | "misc"
    | "pets";

export type InventoryTab = {
    id: InventoryTabId;
    label: string;
    icon: GameIconName;
};

export const INVENTORY_TABS: InventoryTab[] = [
    // Main hand and off hand: swords, staves, shields.
    { id: "weapons", label: "Weapons", icon: "crossed-swords" },
    { id: "armor", label: "Armor", icon: "breastplate" },
    // Rings, amulets, and talismans that aren't in the Talisman Bag (so don't count).
    { id: "accessories", label: "Accessories", icon: "ring" },
    // No Cards tab: cards live in the card menu, never the inventory. Card
    // items still carry the "cards" tab id, which is how that menu finds them.
    // Split further by skill — see MATERIAL_SKILLS in InventoryModal.
    { id: "materials", label: "Materials", icon: "ore" },
    { id: "consumables", label: "Consumables", icon: "potion-ball" },
    // Keys, Rift Lenses, pet items and anything that isn't gear, a card or a material.
    { id: "misc", label: "Misc", icon: "skeleton-key" },
    // No Pets tab either: pets live in the Pets menu on the character screen.
];

/**
 * One owned item (or stack) as the screens draw it: the server's inventory
 * entry joined with its item definition (`features/player/toInventoryItem`).
 */
export type InventoryItem = {
    /** This copy or stack: the server's inventory entry id. */
    id: string;
    /** What it is: copies of the same thing share it. */
    itemId: string;
    name: string;
    tab: InventoryTabId;
    icon: GameIconName;
    rarity: Rarity;
    /**
     * Cards: the skill whose Runs this card can be played in.
     * Materials: the skill that produces or uses it, which picks its
     * sub-tab — bones and fangs under Combat, ore under Mining.
     */
    skill?: CardSkill;
    /**
     * Equipment: which kind of slot it goes in. Talismans: "talisman", which
     * means the Talisman Bag rather than a slot.
     */
    equipSlot?: EquipKind | "talisman";
    /** A fishing rod: held in the main hand, but no weapon. */
    isRod?: boolean;
    /** Stack size for materials and consumables. Omitted means one. */
    quantity?: number;
    /**
     * Cards only. Cards spend a charge each time they're played; at zero they
     * become a permanently faded, unplayable asset.
     */
    charges?: { remaining: number; max: number };
    /** Weapons and armor: this copy's reforge id, if reforged. */
    reforge?: string;
    /** A sentence or two of flavour and purpose, shown on the detail page. */
    description: string;
    /** Label/value rows, e.g. Damage 12, Slot Main hand. Order is display order. */
    stats: ItemStat[];
    /**
     * Passive bonuses, shown in their own section in yellow — e.g. "Firemaking
     * ash chance +10%". Kept separate from stats because they change what the
     * player *does*, not a number in a calculation.
     */
    effects?: string[];
    /**
     * Equipment only: names of the cards this piece makes available while
     * equipped (the design's weapon- and shield-exclusive cards).
     */
    unlocksCards?: string[];
    /**
     * What an NPC pays for one, in coins: the lowest Market price per unit
     * and the base of every Market fee.
     */
    sellValue: number;
    /** ISO timestamp of when this copy was obtained. */
    obtainedAt: string;
    /** A quality catch's tier, e.g. a Silver Salmon: drawn as a metal rim. */
    quality?: GeoQualityTier;
    /** Account-bound: can't be traded, sold or listed. */
    soulbound?: boolean;
    /** Pets: which pet, its art name and its skill (`features/pets/assets/<image>.png`). */
    petInfo?: { petId: string; image: string; skill: string };
    /** Pets: this copy's level, held item and what it gives now. */
    pet?: GeoPetState;
};

export type ItemStat = { label: string; value: string };

/**
 * How an inventory tab is ordered. Descending means newest, rarest, most
 * valuable first, or Z–A for names. Value is the whole stack's sell value.
 */
export type InventorySort = { by: "newest" | "rarity" | "value" | "name"; descending: boolean };

export const DEFAULT_INVENTORY_SORT: InventorySort = { by: "newest", descending: true };

/** `items` in `sort` order. Ties go to the higher quality tier, then the name. */
export function sortInventory(items: InventoryItem[], sort: InventorySort): InventoryItem[] {
    const key = SORT_KEYS[sort.by];
    const sign = sort.descending ? -1 : 1;
    const quality = (item: InventoryItem) => (item.quality ? QUALITY_RANK[item.quality] : 0);
    return [...items].sort(
        (a, b) => sign * key(a, b) || quality(b) - quality(a) || a.name.localeCompare(b.name),
    );
}

/** Ascending comparisons; `sortInventory` flips them for descending. */
const SORT_KEYS: Record<InventorySort["by"], (a: InventoryItem, b: InventoryItem) => number> = {
    newest: (a, b) => Date.parse(a.obtainedAt) - Date.parse(b.obtainedAt),
    rarity: (a, b) => rarityInfo(a.rarity).rank - rarityInfo(b.rarity).rank,
    value: (a, b) => a.sellValue * (a.quantity ?? 1) - b.sellValue * (b.quantity ?? 1),
    name: (a, b) => a.name.localeCompare(b.name),
};

const QUALITY_RANK: Record<GeoQualityTier, number> = { bronze: 1, silver: 2, gold: 3, ruby: 4 };

export function isFaded(item: InventoryItem): boolean {
    return item.charges !== undefined && item.charges.remaining <= 0;
}
