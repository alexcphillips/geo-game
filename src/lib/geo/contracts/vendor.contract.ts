// Copied from cozy-app/shared/src/geo/vendor.contract.ts by scripts/sync-geo-contracts.mjs — do not edit.

import type { GeoRarity } from "./content.contract";

/**
 * NPC vendors. Each sells a fixed list and buys what its rule accepts, at the
 * item's sell value (`GeoItemView.sellValue`) — the same number that is the
 * item's lowest Market price.
 */

export type GeoVendorOffer = {
    itemId: string;
    /** Coins per unit. */
    price: number;
    /** Units left; null is unlimited. */
    stock: number | null;
    /** The buy tab it's listed under, e.g. "Weapons"; unset = "Buy". */
    tab?: string;
};

/** One item a vendor will buy, and what it pays per unit. */
export type GeoVendorBuyOffer = {
    itemId: string;
    price: number;
};

export type GeoVendor = {
    id: string;
    name: string;
    /** A Game Icons name. */
    icon: string;
    description: string;
    /** What the player can buy here. */
    sells: GeoVendorOffer[];
    /** Every item this vendor buys from players. */
    buys: GeoVendorBuyOffer[];
    /**
     * Set when the vendor reforges: coins per reroll, by the item's rarity
     * (mayor perks included). A reroll never lands on the reforge it has.
     */
    reforgeCost?: Record<GeoRarity, number>;
    /** Set when the vendor raises pets' rarity (Kat). Each pet's price is on its `GeoPetState.upgrade`. */
    petUpgrades?: boolean;
};

/** `GET /geo/vendors`. */
export type GeoVendorsResponse = {
    vendors: GeoVendor[];
};

/** `POST /geo/vendors/:vendorId/buy`. Replies with the player (`GeoMeResponse`). */
export type GeoVendorBuyRequest = {
    itemId: string;
    quantity: number;
};

/** `POST /geo/vendors/:vendorId/sell`. Replies with the player (`GeoMeResponse`). */
export type GeoVendorSellRequest = {
    inventoryId: string;
    quantity: number;
};

/** `POST /geo/vendors/:vendorId/reforge`. Replies with the player (`GeoMeResponse`); the copy keeps its id. */
export type GeoVendorReforgeRequest = {
    inventoryId: string;
};

/** Most units one buy or sell may move. */
export const GEO_VENDOR_MAX_QUANTITY = 999;
