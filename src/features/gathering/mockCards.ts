import type { GameIconName } from "@/components/Icon/Icon";
import type { CardSkill } from "@/features/cards/cardSkills";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import type { Rarity } from "@/features/inventory/rarity";

/**
 * What every PLACEHOLDER gathering card has, whatever its skill: enough for
 * the Run's hand to draw it and the kit picker to list it. Each skill's
 * content file adds its own rules on top.
 */
export type MockCardBase = {
    id: string;
    name: string;
    icon: GameIconName;
    rarity: Rarity;
    /** Its job in a kit: Progress, Relief, Info, Setup, Finisher… */
    role: string;
    /** The family it belongs to, which is how dozens of cards stay readable. */
    family: string;
    charges: number;
    /** Plays on a chosen tile, bed or find; false = plays at once. */
    targeted: boolean;
    /** Rules text, already filled in with the player's numbers. */
    text: string;
};

/** A mock card, shaped like an owned card so the Run's hand draws it. */
export function mockCardItem(card: MockCardBase, skill: CardSkill, chargesLeft: number): InventoryItem {
    return {
        id: card.id,
        itemId: card.id,
        name: card.name,
        tab: "cards",
        icon: card.icon,
        rarity: card.rarity,
        skill,
        charges: { remaining: chargesLeft, max: card.charges },
        description: card.text,
        stats: [
            { label: "Role", value: card.role },
            { label: "Family", value: card.family },
            { label: "Target", value: card.targeted ? "Pick one first" : "Plays at once" },
        ],
        sellValue: 0,
        obtainedAt: "",
    };
}

/** Full charges for every card in a pool, as a Run starts. */
export const fullCharges = (pool: Record<string, { charges: number }>): Record<string, number> =>
    Object.fromEntries(Object.entries(pool).map(([id, card]) => [id, card.charges]));
