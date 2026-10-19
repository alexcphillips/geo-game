/**
 * Equipment slots, laid out like Diablo 3's paper doll.
 *
 * The body runs down the middle column (head, chest, belt, legs, feet). The
 * side columns sit half a row lower, so each side slot falls between two body
 * slots: shoulders and amulet flank the neck, then hands and cloak, the rings,
 * and the weapons at the bottom. A fishing rod is held in the main hand; the
 * wardrobe swaps it in and out with the rest of a loadout.
 *
 * Extending this is the whole point of the file — new slots land here with a
 * place on the grid, and the screen picks them up without changing.
 * (Talismans are not slots: they live in the Talisman Bag.)
 */
export type EquipmentSlotId =
    | "mainHand"
    | "offHand"
    | "head"
    | "shoulders"
    | "chest"
    | "hands"
    | "legs"
    | "feet"
    | "cloak"
    | "belt"
    | "amulet"
    | "ring1"
    | "ring2";

/**
 * What kind of item a slot takes. Most slots are their own kind; the two ring
 * slots both take rings, so any ring fits either.
 */
export type EquipKind =
    | "mainHand"
    | "offHand"
    | "head"
    | "shoulders"
    | "chest"
    | "hands"
    | "legs"
    | "feet"
    | "cloak"
    | "belt"
    | "amulet"
    | "ring";

export type EquipmentSlot = {
    id: EquipmentSlotId;
    /** Shown under the square when nothing is equipped. */
    label: string;
    accepts: EquipKind;
    /** Title of the picker that opens from this slot. */
    pickerTitle: string;
};

/** Left of the body, the body itself, or right of it. */
export type EquipmentColumn = "left" | "centre" | "right";

export type PlacedEquipmentSlot = EquipmentSlot & {
    column: EquipmentColumn;
    /** Rows down from the head. Side columns use halves to sit between body slots. */
    row: number;
};

const RING_1: EquipmentSlot = { id: "ring1", label: "Ring", accepts: "ring", pickerTitle: "Ring" };
const RING_2: EquipmentSlot = { id: "ring2", label: "Ring", accepts: "ring", pickerTitle: "Ring" };

export const RING_SLOTS: EquipmentSlot[] = [RING_1, RING_2];

/** Every slot, with where it sits on the paper doll. */
export const EQUIPMENT_LAYOUT: PlacedEquipmentSlot[] = [
    // The body, head to feet.
    { id: "head", label: "Head", accepts: "head", pickerTitle: "Head", column: "centre", row: 0 },
    { id: "chest", label: "Chest", accepts: "chest", pickerTitle: "Chest", column: "centre", row: 1 },
    { id: "belt", label: "Belt", accepts: "belt", pickerTitle: "Belt", column: "centre", row: 2 },
    { id: "legs", label: "Legs", accepts: "legs", pickerTitle: "Legs", column: "centre", row: 3 },
    { id: "feet", label: "Feet", accepts: "feet", pickerTitle: "Feet", column: "centre", row: 4 },

    // Left side.
    { id: "shoulders", label: "Shoulders", accepts: "shoulders", pickerTitle: "Shoulders", column: "left", row: 0.5 },
    { id: "hands", label: "Hands", accepts: "hands", pickerTitle: "Hands", column: "left", row: 1.5 },
    { ...RING_1, column: "left", row: 2.5 },
    { id: "mainHand", label: "Main", accepts: "mainHand", pickerTitle: "Main Hand", column: "left", row: 3.5 },

    // Right side, mirroring the left.
    { id: "amulet", label: "Amulet", accepts: "amulet", pickerTitle: "Amulet", column: "right", row: 0.5 },
    { id: "cloak", label: "Cloak", accepts: "cloak", pickerTitle: "Cloak", column: "right", row: 1.5 },
    { ...RING_2, column: "right", row: 2.5 },
    { id: "offHand", label: "Off", accepts: "offHand", pickerTitle: "Off Hand", column: "right", row: 3.5 },
];
