import type { GameIconName } from "@/components/Icon/Icon";

/** The Actions sheet's sections, in the order they're shown. */
export const ACTION_GROUPS = [
    { id: "camp", label: "Camp" },
    { id: "make", label: "Make" },
    { id: "trade", label: "Trade" },
    { id: "town", label: "Town" },
] as const;

export type ActionGroupId = (typeof ACTION_GROUPS)[number]["id"];

export type ActionId =
    | "camp"
    | "lunchbox"
    | "bait"
    | "farm"
    | "crafting"
    | "cooking"
    | "vendors"
    | "market"
    | "communityCenter";

export type ActionDef = {
    id: ActionId;
    /** Short: four tiles share a row. */
    label: string;
    icon: GameIconName;
    group: ActionGroupId;
};

/**
 * Everything the bottom bar's Actions button opens, one entry per action.
 *
 * The sheet renders straight from this list, so a new feature only adds an
 * entry here and a handler where the world screen opens it. What each action
 * does, whether it shows and its badge are passed in by the world screen,
 * keyed by `id`, since they need its state.
 *
 * Inventory, Skills, the deck and the character have their own bar slots and
 * aren't listed. Menus that belong to a place (a vendor, a fishing spot) open
 * from the map, not from here.
 */
export const ACTIONS: ActionDef[] = [
    // Lunchbox and Bait are here to look at and eat from; packing happens at Camp.
    { id: "camp", label: "Camp", icon: "campfire", group: "camp" },
    { id: "lunchbox", label: "Lunchbox", icon: "knife-fork", group: "camp" },
    { id: "bait", label: "Bait", icon: "fishing-hook", group: "camp" },
    // From here the farm is look-and-plan only; work happens at a farming place.
    { id: "farm", label: "Farm", icon: "sprout", group: "camp" },
    { id: "crafting", label: "Crafting", icon: "anvil", group: "make" },
    { id: "cooking", label: "Cooking", icon: "cooking-pot", group: "make" },
    { id: "vendors", label: "Vendors", icon: "shop", group: "trade" },
    { id: "market", label: "Market", icon: "two-coins", group: "trade" },
    { id: "communityCenter", label: "Community", icon: "vote", group: "town" },
];

/** How the world screen runs one action. Leave out `isVisible` to always show it. */
export type ActionBinding = {
    onPress: () => void;
    badge?: number;
    isVisible?: boolean;
};

export type ActionBindings = Record<ActionId, ActionBinding>;
