// Copied from cozy-app/shared/src/geo/wardrobe.contract.ts by scripts/sync-geo-contracts.mjs — do not edit.

import type { GeoEquipmentSlot } from "./content.contract";

/**
 * The wardrobe: saved loadouts of worn gear and a pet, like Hypixel
 * SkyBlock's, switched in one tap. A loadout points at inventory items rather
 * than holding them, so one ring can be in several; an item that has since
 * left the inventory is skipped when the loadout is worn.
 *
 * The loadout last worn or saved is the active one, and changing gear on the
 * character screen updates it. Switching works anywhere but mid-Run.
 *
 * Auto-swap wears the loadout tagged for an activity as that activity starts
 * (a fight, a cast), so fishing then fighting swaps gear and back without a
 * tap. For skills (fishing) it's free; for combat it's a bought upgrade, as
 * are more loadout slots.
 */

export type GeoLoadoutActivity = "combat" | "fishing";

export const GEO_LOADOUT_ACTIVITIES: readonly GeoLoadoutActivity[] = ["combat", "fishing"];

/** Activities auto-swap works for without buying it: the skills. */
export const GEO_FREE_AUTO_ACTIVITIES: readonly GeoLoadoutActivity[] = ["fishing"];

/** Longest loadout name. */
export const GEO_LOADOUT_NAME_MAX = 20;

export type GeoLoadout = {
    /** 0-based; the wardrobe has `slots` of them. */
    slot: number;
    name: string;
    /** Slot → inventory id, only for items still owned. */
    equipment: Partial<Record<GeoEquipmentSlot, string>>;
    /** The pet's inventory id, or null for none. */
    petId: string | null;
    /** Worn automatically when this activity starts (combat needs auto-swap bought). */
    autoFor: GeoLoadoutActivity | null;
};

export type GeoWardrobe = {
    /** Loadout slots owned. */
    slots: number;
    maxSlots: number;
    /** Saved loadouts only; an empty slot isn't listed. */
    loadouts: GeoLoadout[];
    /** The loadout being worn, or null after gear was changed with none active. */
    activeSlot: number | null;
    /** Combat auto-swap bought. Skills auto-swap without it. */
    autoSwap: boolean;
    /** Coins for the next slot; null at the max. */
    nextSlotCost: number | null;
    /** Coins to unlock combat auto-swap (still shown once owned). */
    autoSwapCost: number;
};

/**
 * `PUT /geo/me/wardrobe/:slot`. `save: true` stores what's worn now (gear and
 * pet) in the slot under `name` and makes it active; `save: false` only
 * renames a saved loadout.
 */
export type GeoSaveLoadoutRequest = {
    name: string;
    save: boolean;
};

/** `PUT /geo/me/wardrobe/:slot/auto`: tag the loadout for an activity, or untag it with null. One loadout per activity. */
export type GeoLoadoutAutoRequest = {
    autoFor: GeoLoadoutActivity | null;
};
