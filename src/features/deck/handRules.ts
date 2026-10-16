import { HAND_SIZE, type CardSkill } from "@/features/cards/cardSkills";
import { isFaded, type InventoryItem } from "@/features/inventory/inventoryItems";

/** Why a card can't go into the hand, or null if it can. */
export type HandRejection = "wrong-skill" | "faded" | "duplicate" | "full";

/**
 * The hand-building rules, so the Deck can answer at once. The server checks
 * the same rules on every change and has the last word:
 *
 * - a hand holds one skill's cards only;
 * - faded cards can't be played, so can't be packed;
 * - no duplicates: two copies of the same card are the same card;
 * - at most HAND_SIZE cards.
 */
export function checkAddToHand(
    skill: CardSkill,
    handIds: string[],
    card: InventoryItem,
    items: InventoryItem[],
): HandRejection | null {
    if (card.skill !== skill) return "wrong-skill";
    if (isFaded(card)) return "faded";

    const inHand = items.filter((item) => handIds.includes(item.id));
    if (inHand.some((item) => item.itemId === card.itemId)) return "duplicate";
    if (handIds.length >= HAND_SIZE) return "full";

    return null;
}
