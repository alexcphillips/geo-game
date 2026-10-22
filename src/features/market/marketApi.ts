import { useCallback, useMemo, useState } from "react";
import { showToast } from "@/components/Toast/toastStore";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, apiPath, toErrorMessage } from "@/lib/api";
import { useLiveRead } from "@/lib/realtime/useLiveRead";
import { latestOnly } from "@/lib/usePolling";
import {
    GEO_API_PATHS,
    type GeoCreateListingRequest,
    type GeoMarketResponse,
    type GeoMeResponse,
    type GeoOwnListing,
} from "@/lib/geo/contracts";
import {
    fromListingView,
    fromOwnListingView,
    fromStackView,
    type MarketListing,
    type MarketProduct,
    type OwnListing,
} from "./market";

/** While the Market is open and the geo socket is down, it reads the server this often. */
const FALLBACK_POLL_MS = 15_000;


async function fetchMarket(): Promise<{ market: GeoMarketResponse; own: GeoOwnListing[] } | { error: string }> {
    try {
        const [market, own] = await Promise.all([
            api.get<GeoMarketResponse>(GEO_API_PATHS.market.root),
            api.get<GeoOwnListing[]>(GEO_API_PATHS.market.mine),
        ]);
        return { market, own };
    } catch (failure) {
        return { error: toErrorMessage(failure) };
    }
}

type MarketData = {
    listings: MarketListing[];
    products: MarketProduct[];
    own: OwnListing[];
    /** The player's coins held by live bids. */
    heldCoins: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * The Market as the server has it: everyone's listings, pooled stacks, and the
 * player's own. Read when the Market opens, whenever the server says it
 * changed (a listing, bid or sale by anyone), and after every trade.
 */
export function useMarketData(): MarketData {
    const items = usePlayerStore((state) => state.items);
    const reforges = usePlayerStore((state) => state.reforges);
    const [market, setMarket] = useState<GeoMarketResponse | null>(null);
    const [own, setOwn] = useState<GeoOwnListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // A poll still out when a trade's refresh lands is older; it's dropped.
    const [reads] = useState(latestOnly);
    const refresh = useCallback(async () => {
        const ticket = reads.start();
        const result = await fetchMarket();
        if (!reads.isCurrent(ticket)) return;
        if ("error" in result) {
            setError(result.error);
        } else {
            setMarket(result.market);
            setOwn(result.own);
            setError(null);
        }
        setIsLoading(false);
    }, [reads]);

    useLiveRead(refresh, "market", FALLBACK_POLL_MS);

    return useMemo(
        () => ({
            listings: (market?.listings ?? []).flatMap((view) => fromListingView(view, items, reforges) ?? []),
            products: (market?.stacks ?? []).flatMap((view) => fromStackView(view, items) ?? []),
            own: own.flatMap((view) => fromOwnListingView(view, items, reforges) ?? []),
            heldCoins: market?.heldCoins ?? 0,
            isLoading,
            error,
            refresh,
        }),
        [market, own, items, reforges, isLoading, error, refresh],
    );
}

/**
 * Sends one trade, adopts the player the server sends back (coins and
 * inventory), and shows the outcome. A refusal shows the server's own words.
 * Resolves true when it went through.
 */
async function trade(send: () => Promise<GeoMeResponse>, success: string): Promise<boolean> {
    try {
        usePlayerStore.setState({ me: await send() });
        showToast(success, "success");
        return true;
    } catch (error) {
        showToast(toErrorMessage(error), "error");
        return false;
    }
}

/** Every Market trade. Each resolves true when the server took it. */
export const marketActions = {
    list: (request: GeoCreateListingRequest, itemName: string) =>
        trade(() => api.post(GEO_API_PATHS.market.listings, request), `${itemName} is listed`),

    buy: (listingId: string, expectedPrice: number, itemName: string) =>
        trade(() => api.post(apiPath(GEO_API_PATHS.market.buy, { listingId }), { expectedPrice }), `Bought ${itemName}`),

    bid: (listingId: string, amount: number) =>
        trade(
            () => api.post(apiPath(GEO_API_PATHS.market.bids, { listingId }), { amount }),
            `Bid ${amount.toLocaleString()} placed. Your coins are held until you're outbid or win.`,
        ),

    buyStack: (itemId: string, quantity: number, expectedTotal: number, itemName: string) =>
        trade(
            () => api.post(apiPath(GEO_API_PATHS.market.buyStack, { itemId }), { quantity, expectedTotal }),
            `Bought ${quantity.toLocaleString()} ${itemName}`,
        ),

    cancel: (listingId: string) =>
        trade(() => api.post(apiPath(GEO_API_PATHS.market.cancel, { listingId })), "Listing cancelled. The item is back in your inventory."),

    collect: (listingId: string, amount: number) =>
        trade(() => api.post(apiPath(GEO_API_PATHS.market.collect, { listingId })), `Collected ${amount.toLocaleString()} coins`),

    collectAll: (amount: number) =>
        trade(() => api.post(GEO_API_PATHS.market.collectAll), `Collected ${amount.toLocaleString()} coins`),
};
