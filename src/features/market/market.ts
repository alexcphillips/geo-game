import type { InventoryItem, InventoryTabId } from "@/features/items/inventoryItems";
import { toInventoryItem } from "@/features/player/toInventoryItem";
import type {
    GeoItemView,
    GeoMarketListing,
    GeoMarketStack,
    GeoOwnListing,
    GeoReforgeView,
} from "@/lib/geo/contracts";

/**
 * How a single item is sold: to the highest bidder when the timer runs out,
 * or to the first player who pays the asking price.
 */
export type ListingType = "auction" | "bin";

/** One copy of gear, a talisman or a card, up for sale. */
export type MarketListing = {
    id: string;
    item: InventoryItem;
    /** Display name of the player selling it. */
    seller: string;
    /** The viewer's own listing: no Buy or Bid on it. */
    isMine: boolean;
    /** ISO timestamp of when it went up. */
    listedAt: string;
} & (
    | {
          type: "bin";
          /** What the buyer pays, all of it to the seller: the tax was paid when listed. */
          price: number;
      }
    | {
          type: "auction";
          startingBid: number;
          /** Highest bid so far, or null before anyone has bid. */
          currentBid: number | null;
          /** Display name of whoever holds `currentBid`; null with it. */
          leadingBidder: string | null;
          /** Whether the viewer holds the current bid. */
          youLead: boolean;
          bids: number;
          /** ISO timestamp of when bidding closes. */
          endsAt: string;
          /** The least the next bid may be, as the server works it out. */
          minBid: number;
      }
);

/**
 * Some of one stackable for sale at one price. Stacks are always buy-it-now:
 * buying takes units from the cheapest offer first.
 */
export type StackOffer = {
    /** Coins per unit. */
    price: number;
    /** Units still for sale at this price. */
    quantity: number;
};

/**
 * One stackable on the Market: everyone's offers for it, pooled. Units of
 * the same item are identical, so stacks get one row per item with a price
 * ladder, rather than one row per seller like single items.
 */
export type MarketProduct = {
    item: InventoryItem;
    /** Cheapest first, one per price. */
    offers: StackOffer[];
};

/**
 * Tabs that sell stacks rather than single copies. Every item in a tab sells
 * the same way, so the tab alone decides which rows it shows.
 */
const STACK_TABS: InventoryTabId[] = ["materials", "consumables", "misc"];

export function isStackTab(tab: InventoryTabId): boolean {
    return STACK_TABS.includes(tab);
}

/**
 * Whether an item may be listed on its own, by auction or buy-it-now: one
 * copy of anything that doesn't stack, and cards only at full charges — a
 * card that has been played can be shattered or sacrificed, never sold.
 */
export function canListSingle(item: InventoryItem): boolean {
    if (item.quantity !== undefined || item.soulbound) return false;
    return item.charges === undefined || item.charges.remaining === item.charges.max;
}

/**
 * Whether an item may be offered as a stack: stackables only. Cards never
 * stack (their charges don't merge), so they always sell one copy at a time.
 * Soulbound items never list at all.
 */
export function canListStack(item: InventoryItem): boolean {
    return item.quantity !== undefined && !item.soulbound;
}

/** What a buyer pays now: the asking price, or the bid to beat. */
export function listingPrice(listing: MarketListing): number {
    return listing.type === "bin" ? listing.price : (listing.currentBid ?? listing.startingBid);
}

export function lowestPrice(product: MarketProduct): number {
    return product.offers[0]?.price ?? 0;
}

export function totalForSale(product: MarketProduct): number {
    return product.offers.reduce((sum, offer) => sum + offer.quantity, 0);
}

/** "1,250", grouped for the reader's locale. */
export function formatCoins(amount: number): string {
    return amount.toLocaleString();
}

/** "12m ago", "5h ago", "2d ago". */
export function formatListedAgo(iso: string, now = Date.now()): string {
    const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/** Milliseconds left on an auction, never negative. */
export function timeLeft(listing: Extract<MarketListing, { type: "auction" }>, now: number): number {
    return Math.max(0, new Date(listing.endsAt).getTime() - now);
}

/** "1d 4h", "3h 12m", "12m 05s", "Ended". Seconds only in the last hour. */
export function formatTimeLeft(ms: number): string {
    if (ms <= 0) return "Ended";
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** One bid on an auction. */
export type Bid = {
    bidder: string;
    amount: number;
    /** ISO timestamp. */
    at: string;
};

/**
 * Something the player listed. The item is held as it was when listed, so
 * cancelling hands back the same copy: same id, same obtained date.
 */
export type OwnListing = MarketListing & {
    /** Still for sale (a stack can be part sold and still for sale). */
    isLive: boolean;
    /** The fee (auctions) or tax (buy-it-now) paid when it was listed. */
    feePaid: number;
    /** Auctions: every bid, oldest first. Empty for buy-it-now. */
    bidHistory: Bid[];
    /** Coins earned and not yet collected. They wait on the listing until then. */
    uncollected: number;
    /** Null while it's still for sale. A stack's several sales are summed. */
    sale: {
        /** ISO timestamp of the last sale. */
        soldAt: string;
        /** One buyer's name, or "3 buyers". */
        buyer: string;
        /** The asking price for buy-it-now; the winning bid for auctions. */
        buyerPaid: number;
        /** All of it: the fee or tax was paid when listed. */
        sellerGot: number;
        /** Whether the seller has taken the coins yet. */
        collected: boolean;
    } | null;
};

/** Listings whose coins are waiting to be collected. */
export function uncollected(listings: OwnListing[]): OwnListing[] {
    return listings.filter((listing) => listing.uncollected > 0);
}

/** The highest bid on an auction, or null before anyone has bid. */
export function topBid(listing: OwnListing): Bid | null {
    return listing.bidHistory.reduce<Bid | null>((best, bid) => (best === null || bid.amount > best.amount ? bid : best), null);
}

/** "11 Oct 2026, 14:05", in the reader's locale. */
export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/** Under this, an auction's timer turns urgent. */
export const ENDING_SOON_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// From the server

/** A listing's item, drawn like an owned one. The listing id stands in for the copy's id. */
function listingItem(view: GeoMarketListing, def: GeoItemView, reforges: Record<string, GeoReforgeView>): InventoryItem {
    return toInventoryItem(
        {
            id: view.id,
            itemId: view.item.itemId,
            quantity: view.item.quantity,
            chargesLeft: view.item.chargesLeft,
            reforge: view.item.reforge,
            pet: view.item.pet,
            obtainedAt: view.item.obtainedAt,
        },
        def,
        reforges,
    );
}

/** The server's listing, as the Market draws it. Null for an item this build doesn't know. */
export function fromListingView(
    view: GeoMarketListing,
    items: Record<string, GeoItemView>,
    reforges: Record<string, GeoReforgeView> = {},
): MarketListing | null {
    const def = items[view.item.itemId];
    if (!def) return null;
    const base = { id: view.id, item: listingItem(view, def, reforges), seller: view.seller, isMine: view.isMine, listedAt: view.listedAt };
    return view.type === "bin"
        ? { ...base, type: "bin", price: view.price }
        : {
              ...base,
              type: "auction",
              startingBid: view.startingBid,
              currentBid: view.currentBid,
              leadingBidder: view.leadingBidder,
              youLead: view.youLead,
              bids: view.bids,
              endsAt: view.endsAt,
              minBid: view.minBid,
          };
}

export function fromStackView(view: GeoMarketStack, items: Record<string, GeoItemView>): MarketProduct | null {
    const def = items[view.itemId];
    if (!def) return null;
    const item = toInventoryItem(
        { id: `stack-${view.itemId}`, itemId: view.itemId, quantity: 1, chargesLeft: null, reforge: null, pet: null, obtainedAt: new Date().toISOString() },
        def,
    );
    return { item, offers: view.offers };
}

export function fromOwnListingView(
    view: GeoOwnListing,
    items: Record<string, GeoItemView>,
    reforges: Record<string, GeoReforgeView> = {},
): OwnListing | null {
    const listing = fromListingView(view, items, reforges);
    if (!listing) return null;
    const last = view.sales[view.sales.length - 1];
    const paid = view.sales.reduce((sum, sale) => sum + sale.paid, 0);
    const buyers = new Set(view.sales.map((sale) => sale.buyer));
    const isLive = view.status === "active";
    return {
        ...listing,
        // A sold-out listing shows what sold, not the 0 left in escrow.
        item: isLive ? listing.item : { ...listing.item, quantity: listing.item.quantity === undefined ? undefined : view.quantityListed },
        ...(listing.type === "bin" && !isLive ? { price: paid } : {}),
        isLive,
        feePaid: view.feePaid,
        bidHistory: view.bidHistory,
        uncollected: view.uncollected,
        sale:
            !isLive && last
                ? {
                      soldAt: last.at,
                      buyer: buyers.size === 1 ? last.buyer : `${buyers.size} buyers`,
                      buyerPaid: paid,
                      sellerGot: paid,
                      collected: view.uncollected === 0,
                  }
                : null,
    } as OwnListing;
}
