import type { InventoryItem } from "@/features/inventory/inventoryItems";
import {
    GEO_BIN_TAX_RATE,
    geoAuctionFee,
    geoBinTax,
    type GeoAuctionHours,
    type GeoCreateListingRequest,
} from "@/lib/geo/contracts";
import { canListSingle, canListStack, formatCoins, type ListingType } from "./market";

/** The Sell form as typed: text fields stay strings until checked. */
export type SellDraft = {
    type: ListingType;
    /** Per unit for a stack; the starting bid for an auction. */
    price: string;
    quantity: string;
    hours: GeoAuctionHours;
};

export const BIN_TAX_PERCENT = Math.round(GEO_BIN_TAX_RATE * 100);

/** A fresh draft: buy-it-now at the lowest allowed price, the whole stack. */
export function newDraft(item: InventoryItem): SellDraft {
    return {
        type: "bin",
        price: String(item.sellValue),
        quantity: String(item.quantity ?? 1),
        hours: 12,
    };
}

/** Only single items can be auctioned: stacks are always buy-it-now. */
export function canAuction(item: InventoryItem): boolean {
    return canListSingle(item);
}

/**
 * What can be sold now: anything the Market takes, except what's in use —
 * worn gear, talismans in the bag and cards in a hand would vanish from the
 * player's build, so they have to be taken out first.
 */
export function isSellable(item: InventoryItem, inUse: ReadonlySet<string>): boolean {
    return !inUse.has(item.id) && (canListSingle(item) || canListStack(item));
}

export type SellQuote = {
    quantity: number;
    /** Per unit; the starting bid for an auction. */
    unitPrice: number;
    /** Asked for all units together. */
    total: number;
    /** Lowest unit price allowed: what an NPC pays. */
    minUnitPrice: number;
    /**
     * Paid now, from the seller's coins: the auction fee, or the buy-it-now
     * tax. Nothing more is taken when it sells.
     */
    listingFee: number;
    /** Buy-it-now: the tax, the same as `listingFee`. 0 for auctions. */
    tax: number;
    /** Buy-it-now: what the buyer pays and the seller gets, the same number. */
    buyerPays: number | null;
    sellerGets: number | null;
    /** Why it can't be listed yet, or null when it can. */
    problem: string | null;
};

/** Every number the form and the confirmation show, and what's still wrong. */
export function quote(item: InventoryItem, draft: SellDraft, coins: number): SellQuote {
    const owned = item.quantity ?? 1;
    const quantity = item.quantity === undefined ? 1 : wholeNumber(draft.quantity);
    const unitPrice = wholeNumber(draft.price);
    const total = unitPrice * quantity;
    const tax = draft.type === "bin" ? geoBinTax(item.sellValue, quantity) : 0;
    const listingFee = draft.type === "auction" ? geoAuctionFee(item.sellValue, draft.hours) : tax;

    let problem: string | null = null;
    if (quantity < 1 || quantity > owned) problem = `Choose between 1 and ${formatCoins(owned)}.`;
    else if (unitPrice < item.sellValue)
        problem = `The lowest ${draft.type === "auction" ? "starting bid" : "price"} is ${formatCoins(item.sellValue)}${item.quantity === undefined ? "" : " each"}, what an NPC pays.`;
    else if (draft.type === "auction" && !canAuction(item)) problem = "Stacks sell buy-it-now only.";
    else if (listingFee > coins)
        problem = `You need ${formatCoins(listingFee)} coins for the ${draft.type === "auction" ? "listing fee" : "tax"}.`;

    return {
        quantity,
        unitPrice,
        total,
        minUnitPrice: item.sellValue,
        listingFee,
        tax,
        buyerPays: draft.type === "bin" ? total : null,
        sellerGets: draft.type === "bin" ? total : null,
        problem,
    };
}

/** "120" → 120; anything else → 0, which then fails the minimum. */
function wholeNumber(text: string): number {
    const value = Number(text.replace(/[,\s]/g, ""));
    return Number.isInteger(value) && value > 0 ? value : 0;
}

/** The draft as the server's listing request. Call once `quote` finds no problem. */
export function toListingRequest(item: InventoryItem, draft: SellDraft): GeoCreateListingRequest {
    const quantity = item.quantity === undefined ? 1 : wholeNumber(draft.quantity);
    const price = wholeNumber(draft.price);
    return draft.type === "auction"
        ? { inventoryId: item.id, type: "auction", quantity, startingBid: price, hours: draft.hours }
        : { inventoryId: item.id, type: "bin", quantity, price };
}
