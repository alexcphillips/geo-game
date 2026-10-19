import type { GameIconName } from "@/components/Icon/Icon";
import { CARD_SKILLS } from "@/features/cards/cardSkills";
import {
    INVENTORY_TABS,
    type InventoryItem,
    type InventoryTab,
    type InventoryTabId,
} from "@/features/inventory/inventoryItems";
import { colors } from "@/theme/colors";
import type { ListingType } from "./market";

/**
 * The Market's category tabs: the inventory's, plus Cards and Pets after
 * Accessories — the inventory leaves those to their own menus, but they're
 * bought here.
 */
export const MARKET_TABS: InventoryTab[] = INVENTORY_TABS.flatMap((tab) =>
    tab.id === "accessories"
        ? [tab, { id: "cards" as const, label: "Cards", icon: "card-pick" as const }, { id: "pets" as const, label: "Pets", icon: "paw-print" as const }]
        : [tab],
);

/** What the Market can be browsed by: everything at once, or one category. */
export type MarketTabId = InventoryTabId | "all";

export type MarketTab = Omit<InventoryTab, "id"> & { id: MarketTabId };

/** The Market opens here: every listing and stack in one list. */
export const ALL_TAB: MarketTab = { id: "all", label: "All", icon: "shop" };

/** The tab row when browsing: All, then each category. */
export const BROWSE_TABS: MarketTab[] = [ALL_TAB, ...MARKET_TABS];

/** One chip in a filter row. */
export type FilterOption = {
    /** Unique within its tab. */
    id: string;
    label: string;
    icon?: GameIconName;
    /** Tints the chip while it's on. Defaults to ember. */
    color?: string;
    /** `type` is null for a stack, which has no listing type. */
    matches: (item: InventoryItem, type: ListingType | null) => boolean;
};

/**
 * Chips that answer one question, e.g. "which slot?". Several chips on in one
 * group widen the results (main hand OR off hand); chips in different groups
 * narrow them (main hand AND auction). A group with nothing on doesn't filter.
 */
export type FilterGroup = {
    id: string;
    options: FilterOption[];
};

const SALE_TYPE: FilterGroup = {
    id: "type",
    options: [
        {
            id: "auction",
            label: "Auction",
            icon: "gavel",
            color: colors.listingAuction,
            matches: (_, type) => type === "auction",
        },
        {
            id: "bin",
            label: "Buy now",
            icon: "price-tag",
            color: colors.listingBuyNow,
            matches: (_, type) => type === "bin",
        },
    ],
};

function slotOption(id: string, label: string): FilterOption {
    return { id, label, matches: (item) => item.equipSlot === id };
}

const SKILL: FilterGroup = {
    id: "skill",
    options: CARD_SKILLS.map((skill) => ({
        id: skill.id,
        label: skill.label,
        icon: skill.icon,
        color: skill.color,
        matches: (item) => item.skill === skill.id,
    })),
};

/**
 * Sale type for the All tab, which mixes listings with stacks: a stack is
 * always buy-it-now, so it shows under Buy now and not under Auction.
 */
const ALL_SALE_TYPE: FilterGroup = {
    ...SALE_TYPE,
    options: SALE_TYPE.options.map((option) =>
        option.id === "bin" ? { ...option, matches: (_, type) => type === "bin" || type === null } : option,
    ),
};

/**
 * The filter rows each Market tab offers, in display order. Stack tabs have
 * no sale-type group: stacks are always buy-it-now.
 */
export const MARKET_FILTERS: Record<MarketTabId, FilterGroup[]> = {
    all: [ALL_SALE_TYPE],
    weapons: [
        SALE_TYPE,
        {
            id: "slot",
            options: [
                // Rods are main-hand gear too, but have their own filter.
                { id: "mainHand", label: "Main hand", matches: (item) => item.equipSlot === "mainHand" && !item.isRod },
                slotOption("offHand", "Off hand"),
                { id: "rod", label: "Rod", matches: (item) => item.isRod === true },
            ],
        },
    ],
    armor: [
        SALE_TYPE,
        {
            id: "slot",
            options: [
                slotOption("head", "Head"),
                slotOption("shoulders", "Shoulders"),
                slotOption("cloak", "Cloak"),
                slotOption("chest", "Chest"),
                slotOption("hands", "Hands"),
                slotOption("belt", "Belt"),
                slotOption("legs", "Legs"),
                slotOption("feet", "Feet"),
            ],
        },
    ],
    accessories: [
        SALE_TYPE,
        { id: "slot", options: [slotOption("ring", "Ring"), slotOption("amulet", "Amulet"), slotOption("talisman", "Talisman")] },
    ],
    cards: [SALE_TYPE, SKILL],
    pets: [SALE_TYPE],
    materials: [SKILL],
    consumables: [],
    misc: [],
};

/** Whether something passes every group that has a chip on. */
export function passesFilters(
    groups: FilterGroup[],
    active: ReadonlySet<string>,
    item: InventoryItem,
    type: ListingType | null,
): boolean {
    return groups.every((group) => {
        const on = group.options.filter((option) => active.has(option.id));
        return on.length === 0 || on.some((option) => option.matches(item, type));
    });
}
