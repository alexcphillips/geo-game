import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Tabs from "@/components/Tabs/Tabs";
import SearchField from "@/components/SearchField/SearchField";
import Modal from "@/components/Modal/Modal";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import {
    useCoins,
    useEquipment,
    useHands,
    useInventory,
    useTalismanBag,
} from "@/features/player/usePlayer";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import {
    isStackTab,
    listingPrice,
    lowestPrice,
    timeLeft,
    type MarketListing,
    type MarketProduct,
    type OwnListing,
} from "../market";
import { marketActions, useMarketData } from "../marketApi";
import { BROWSE_TABS, MARKET_FILTERS, MARKET_TABS, passesFilters, type MarketTabId } from "../marketFilters";
import { isSellable, newDraft, toListingRequest, type SellDraft } from "../sell";
import { ListingRow, ListingSummary, PriceLadder, ProductRow } from "./MarketRows";
import { OwnListingPanel, OwnListingsPage } from "./OwnListings";
import SellConfirm from "./SellConfirm";
import SellForm from "./SellForm";
import SellPicker from "./SellPicker";
import BidPage from "./BidPage";
import ListingActions from "./ListingActions";
import StackBuyPanel from "./StackBuyPanel";
import { useReportActivity } from "@/features/friends/presenceStore";

type ListingSort = "newest" | "ending" | "price";
type StackSort = "name" | "price";

const LISTING_SORTS: { id: ListingSort; label: string }[] = [
    { id: "newest", label: "Newest" },
    { id: "ending", label: "Ending soon" },
    { id: "price", label: "Lowest price" },
];

const STACK_SORTS: { id: StackSort; label: string }[] = [
    { id: "name", label: "A–Z" },
    { id: "price", label: "Lowest price" },
];

/** What's open: a listing (and, for an auction, maybe its bid page) or a stack. */
type Selection = { kind: "listing"; id: string; isBidding?: boolean } | { kind: "product"; itemId: string };

/** Where the Sell flow is: choosing an item, setting the listing, or confirming it. */
type SellStep =
    | { step: "pick" }
    | { step: "form" | "confirm"; inventoryId: string; draft: SellDraft };

type MarketModalProps = {
    onClose: () => void;
};

/**
 * The Market: everything players sell, under the inventory's category tabs
 * (plus Cards). It opens on All, every listing and stack in one list:
 * listings first, then stacks, or all mixed together by Lowest price.
 *
 * Gear, talismans and cards sell one copy at a time, by auction or
 * buy-it-now; each row is striped and badged in its type's colour, and
 * auctions count down live. Materials, consumables and misc sell as stacks:
 * one row per item, always buy-it-now, opening a price ladder.
 *
 * Under the tabs, filter chips that depend on the tab — sale type, slot,
 * skill. Chips in one group widen the results, chips across groups narrow
 * them, so "Main hand" + "Auction" is main-hand weapons up for auction.
 * Filters reset on switching tabs, since each tab has its own; the search
 * stays, and when it matches things in other tabs a line offers to jump.
 *
 * Listings, at the header's right, shows the player's own: sold above a
 * divider, still for sale below; each opens its item page with the listing
 * details, bid history, a Collect once sold, and a Cancel while unsold
 * (never for an auction with bids).
 *
 * Sell, beside it, swaps the content for a three-page flow:
 * pick an item, set the listing, confirm it. Back steps through it.
 *
 * A listing opens its item page under a summary, with Buy now (greyed out
 * when the player can't afford it) or Place bid, which opens a bid page.
 *
 * Everything comes from the server and every trade goes to it: an item
 * listed leaves the inventory, a bid's coins are held, and the screen reads
 * the Market again after each trade and every 15 seconds.
 */
export default function MarketModal({ onClose }: MarketModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    useReportActivity("trading");
    const market = useMarketData();
    const { listings, products, own: ownListings } = market;
    /** One trade at a time, so a double tap can't send two. */
    const [isBusy, setIsBusy] = useState(false);
    const run = async (send: () => Promise<boolean>, after?: () => void) => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            if (await send()) after?.();
            await market.refresh();
        } finally {
            setIsBusy(false);
        }
    };

    const [tabId, setTabId] = useState<MarketTabId>("all");
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<ReadonlySet<string>>(new Set());
    const [listingSort, setListingSort] = useState<ListingSort>("newest");
    const [stackSort, setStackSort] = useState<StackSort>("name");
    const [selection, setSelection] = useState<Selection | null>(null);
    const [sell, setSell] = useState<SellStep | null>(null);
    /** The Listings page, and the own listing open on it, if any. */
    const [mine, setMine] = useState<{ openId: string | null } | null>(null);
    const collect = (toCollect: OwnListing[]) => {
        const total = toCollect.reduce((sum, listing) => sum + listing.uncollected, 0);
        const [only] = toCollect;
        void run(() =>
            toCollect.length === 1 && only ? marketActions.collect(only.id, total) : marketActions.collectAll(total),
        );
    };
    const inventory = useInventory();
    const coins = useCoins();
    const equipped = useEquipment();
    const bagIds = useTalismanBag().inventoryIds;
    const hands = useHands();
    // One clock for every timer on screen, so they tick together.
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, []);

    const isAll = tabId === "all";
    const isStacks = !isAll && isStackTab(tabId);
    const groups = MARKET_FILTERS[tabId];
    const needle = query.trim().toLowerCase();
    const matchesQuery = (name: string) => !needle || name.toLowerCase().includes(needle);

    const shownListings = isStacks
        ? []
        : listings
              .filter(
                  (listing) =>
                      (isAll || listing.item.tab === tabId) &&
                      matchesQuery(listing.item.name) &&
                      passesFilters(groups, active, listing.item, listing.type),
              )
              .sort((a, b) => compareListings(a, b, listingSort, now));

    // All sorts stacks with the listing sort: by price for Lowest price,
    // otherwise A–Z, since a stack has no listing time or end.
    const productSort: StackSort = isAll ? (listingSort === "price" ? "price" : "name") : stackSort;
    const shownProducts = isStacks || isAll
        ? products
              .filter(
                  (product) =>
                      (isAll || product.item.tab === tabId) &&
                      matchesQuery(product.item.name) &&
                      passesFilters(groups, active, product.item, null),
              )
              .sort((a, b) =>
                  productSort === "price"
                      ? lowestPrice(a) - lowestPrice(b) || a.item.name.localeCompare(b.item.name)
                      : a.item.name.localeCompare(b.item.name),
              )
        : [];

    // Listings then stacks; under Lowest price on All, one list by price.
    const rows: ({ kind: "listing"; listing: MarketListing } | { kind: "product"; product: MarketProduct })[] = [
        ...shownListings.map((listing) => ({ kind: "listing" as const, listing })),
        ...shownProducts.map((product) => ({ kind: "product" as const, product })),
    ];
    if (isAll && listingSort === "price") {
        const priceOf = (row: (typeof rows)[number]) =>
            row.kind === "listing" ? listingPrice(row.listing) : lowestPrice(row.product);
        rows.sort((a, b) => priceOf(a) - priceOf(b));
    }

    // Other tabs with search hits, ignoring this tab's filters. All already
    // shows every hit.
    const elsewhere = needle && !isAll
        ? MARKET_TABS.filter((tab) => tab.id !== tabId).flatMap((tab) => {
              const count = isStackTab(tab.id)
                  ? products.filter((p) => p.item.tab === tab.id && matchesQuery(p.item.name)).length
                  : listings.filter((l) => l.item.tab === tab.id && matchesQuery(l.item.name)).length;
              return count > 0 ? [{ tab, count }] : [];
          })
        : [];

    const selectedListing =
        selection?.kind === "listing" ? listings.find((listing) => listing.id === selection.id) : undefined;
    const isBidding = selection?.kind === "listing" && selection.isBidding === true;
    const selectedProduct =
        selection?.kind === "product"
            ? products.find((product) => product.item.itemId === selection.itemId)
            : undefined;

    const selectTab = (id: MarketTabId) => {
        setTabId(id);
        setActive(new Set());
    };

    const toggle = (optionId: string) => {
        setActive((current) => {
            const next = new Set(current);
            if (next.has(optionId)) next.delete(optionId);
            else next.add(optionId);
            return next;
        });
    };

    const inUse = new Set([...Object.values(equipped), ...bagIds, ...Object.values(hands).flat()]);
    const sellable = inventory.filter((item) => isSellable(item, inUse));
    const sellItem =
        sell && sell.step !== "pick" ? inventory.find((item) => item.id === sell.inventoryId) : undefined;

    const openOwn = mine?.openId ? ownListings.find((listing) => listing.id === mine.openId) : undefined;

    const back = () => {
        if (mine?.openId) setMine({ openId: null });
        else if (mine) setMine(null);
        else if (sell?.step === "confirm") setSell({ ...sell, step: "form" });
        else if (sell?.step === "form") setSell({ step: "pick" });
        else if (sell) setSell(null);
        else if (selection?.kind === "listing" && selection.isBidding) setSelection({ ...selection, isBidding: false });
        else setSelection(null);
    };

    const tab = BROWSE_TABS.find((candidate) => candidate.id === tabId);
    const isEmpty = rows.length === 0;

    return (
        <Modal
            title={sell ? "Sell" : mine ? "Your listings" : selectedListing && isBidding ? "Place bid" : "Market"}
            size="fill"
            showBack
            onBack={sell || selection || mine ? back : undefined}
            closePlacement="footer"
            headerAccessory={
                !sell &&
                !selection &&
                !mine && (
                    <View style={styles.headerButtons}>
                        <Pressable
                            onPress={() => setMine({ openId: null })}
                            style={({ pressed }) => [styles.sellButton, pressed && styles.sellButtonPressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Your listings"
                            hitSlop={8}
                        >
                            <Icon name="scroll-unfurled" size={14} color={palette.ember} />
                            <Text style={styles.sellButtonText}>Listings</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setSell({ step: "pick" })}
                            style={({ pressed }) => [styles.sellButton, pressed && styles.sellButtonPressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Sell an item"
                            hitSlop={8}
                        >
                            <Icon name="two-coins" size={14} color={palette.ember} />
                            <Text style={styles.sellButtonText}>Sell</Text>
                        </Pressable>
                    </View>
                )
            }
            onClose={onClose}
        >
            {mine && openOwn ? (
                <ItemDetail
                    item={openOwn.item}
                    action={
                        <OwnListingPanel
                            listing={openOwn}
                            now={now}
                            onCancel={() =>
                                void run(() => marketActions.cancel(openOwn.id), () => setMine({ openId: null }))
                            }
                            onCollect={() => {
                                collect([openOwn]);
                                setMine({ openId: null });
                            }}
                        />
                    }
                />
            ) : mine ? (
                <OwnListingsPage
                    listings={ownListings}
                    now={now}
                    onOpen={(listing) => setMine({ openId: listing.id })}
                    onCollect={collect}
                />
            ) : /* Back to the picker if the item went from the inventory mid-flow. */
            sell && (sell.step === "pick" || !sellItem) ? (
                <SellPicker
                    items={sellable}
                    onPick={(item) => setSell({ step: "form", inventoryId: item.id, draft: newDraft(item) })}
                />
            ) : sell && sellItem && sell.step === "form" ? (
                <SellForm
                    item={sellItem}
                    draft={sell.draft}
                    coins={coins}
                    onChange={(draft) => setSell({ ...sell, draft })}
                    onReview={() => setSell({ ...sell, step: "confirm" })}
                />
            ) : sell && sellItem && sell.step === "confirm" ? (
                <SellConfirm
                    item={sellItem}
                    draft={sell.draft}
                    coins={coins}
                    onConfirm={() =>
                        void run(
                            () => marketActions.list(toListingRequest(sellItem, sell.draft), sellItem.name),
                            () => setSell(null),
                        )
                    }
                />
            ) : selectedListing?.type === "auction" && isBidding ? (
                <BidPage
                    listing={selectedListing}
                    coins={coins}
                    now={now}
                    onBid={(amount) =>
                        void run(
                            () => marketActions.bid(selectedListing.id, amount),
                            () => setSelection({ kind: "listing", id: selectedListing.id }),
                        )
                    }
                />
            ) : selectedListing ? (
                <View style={styles.detail}>
                    <ListingSummary listing={selectedListing} now={now} />
                    <ListingActions
                        listing={selectedListing}
                        coins={coins}
                        now={now}
                        onBid={() => setSelection({ kind: "listing", id: selectedListing.id, isBidding: true })}
                        onBuy={() =>
                            void run(
                                () =>
                                    marketActions.buy(
                                        selectedListing.id,
                                        listingPrice(selectedListing),
                                        selectedListing.item.name,
                                    ),
                                () => setSelection(null),
                            )
                        }
                    />
                    <ItemDetail item={selectedListing.item} />
                </View>
            ) : selectedProduct ? (
                <View style={styles.detail}>
                    <PriceLadder product={selectedProduct} />
                    <StackBuyPanel
                        product={selectedProduct}
                        coins={coins}
                        isBusy={isBusy}
                        onBuy={(quantity, total) =>
                            void run(() =>
                                marketActions.buyStack(
                                    selectedProduct.item.itemId,
                                    quantity,
                                    total,
                                    selectedProduct.item.name,
                                ),
                            )
                        }
                    />
                    <ItemDetail item={selectedProduct.item} />
                </View>
            ) : (
                <>
                    <Tabs tabs={BROWSE_TABS} value={tabId} onChange={selectTab} style={styles.tabs} />

                    <View style={styles.body}>
                        <SearchField value={query} onChange={setQuery} placeholder={isAll ? "Search the Market" : `Search ${tab?.label.toLowerCase() ?? "the Market"}`} />

                        {groups.length > 0 && (
                            <View style={styles.chips}>
                                <Text style={styles.chipsLabel}>Filter</Text>
                                {groups.map((group, groupIndex) => (
                                    <View key={group.id} style={styles.group}>
                                        {groupIndex > 0 && <View style={styles.groupDivider} />}
                                        {group.options.map((option) => {
                                            const isOn = active.has(option.id);
                                            const tint = option.color ?? palette.ember;
                                            return (
                                                <Pressable
                                                    key={option.id}
                                                    onPress={() => toggle(option.id)}
                                                    style={[
                                                        styles.chip,
                                                        isOn && { borderColor: tint, backgroundColor: palette.surfaceAlt },
                                                    ]}
                                                    accessibilityRole="checkbox"
                                                    accessibilityState={{ checked: isOn }}
                                                >
                                                    {option.icon && (
                                                        <Icon
                                                            name={option.icon}
                                                            size={12}
                                                            color={isOn ? tint : palette.textMuted}
                                                        />
                                                    )}
                                                    <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
                                                        {option.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.chips} accessibilityRole="radiogroup">
                            <Text style={styles.chipsLabel}>Sort</Text>
                            {(isStacks ? STACK_SORTS : LISTING_SORTS).map((mode) => {
                                const isOn = mode.id === (isStacks ? stackSort : listingSort);
                                return (
                                    <Pressable
                                        key={mode.id}
                                        onPress={() =>
                                            isStacks
                                                ? setStackSort(mode.id as StackSort)
                                                : setListingSort(mode.id as ListingSort)
                                        }
                                        style={[styles.chip, isOn && styles.chipSortOn]}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: isOn }}
                                    >
                                        <Text style={[styles.chipText, isOn && styles.chipTextSortOn]}>
                                            {mode.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.list}
                            alwaysBounceHorizontal={false}
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {rows.map((row) =>
                                row.kind === "listing" ? (
                                    <ListingRow
                                        key={row.listing.id}
                                        listing={row.listing}
                                        now={now}
                                        onPress={() => setSelection({ kind: "listing", id: row.listing.id })}
                                    />
                                ) : (
                                    <ProductRow
                                        key={row.product.item.itemId}
                                        product={row.product}
                                        onPress={() => setSelection({ kind: "product", itemId: row.product.item.itemId })}
                                    />
                                ),
                            )}

                            {isEmpty && (
                                <Text style={styles.noResults}>
                                    {market.isLoading
                                        ? "Loading the Market…"
                                        : market.error
                                          ? market.error
                                          : needle
                                        ? isAll
                                            ? `Nothing matches “${query.trim()}”.`
                                            : `No ${tab?.label.toLowerCase()} match “${query.trim()}”.`
                                        : active.size > 0
                                          ? "Nothing for sale matches these filters."
                                          : "Nothing is for sale here right now."}
                                </Text>
                            )}

                            {elsewhere.length > 0 && (
                                <View style={styles.elsewhere}>
                                    <Text style={styles.elsewhereLabel}>Also in</Text>
                                    {elsewhere.map(({ tab: other, count }) => (
                                        <Pressable
                                            key={other.id}
                                            onPress={() => selectTab(other.id)}
                                            style={styles.chip}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${count} in ${other.label}`}
                                        >
                                            <Icon name={other.icon} size={12} color={palette.ember} />
                                            <Text style={styles.chipText}>
                                                {other.label} ({count})
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </>
            )}
        </Modal>
    );
}

function compareListings(a: MarketListing, b: MarketListing, sort: ListingSort, now: number): number {
    const newest = b.listedAt.localeCompare(a.listedAt);
    if (sort === "price") return listingPrice(a) - listingPrice(b) || newest;
    if (sort === "ending") {
        // Live auctions first, soonest to close; then buy-it-now, newest first.
        const aLeft = a.type === "auction" ? timeLeft(a, now) : 0;
        const bLeft = b.type === "auction" ? timeLeft(b, now) : 0;
        const aLive = aLeft > 0;
        const bLive = bLeft > 0;
        if (aLive !== bLive) return aLive ? -1 : 1;
        return aLive ? aLeft - bLeft : newest;
    }
    return newest;
}

const useStyles = createStyles((p) => ({
    // Same strip as the inventory's.
    tabs: {
        marginBottom: 12,
    },
    body: {
        flex: 1,
        paddingTop: 12,
        gap: 10,
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
    },
    chipsLabel: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginRight: 2,
    },
    group: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
    },
    groupDivider: {
        width: 1,
        height: 16,
        backgroundColor: p.outline,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
    },
    chipText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    chipTextOn: {
        color: p.text,
    },
    chipSortOn: {
        borderColor: p.ember,
        backgroundColor: p.track,
    },
    chipTextSortOn: {
        color: p.ember,
    },
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    noResults: {
        paddingTop: 24,
        textAlign: "center",
        color: p.textMuted,
        fontSize: 13,
        fontStyle: "italic",
    },
    elsewhere: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingTop: 8,
    },
    elsewhereLabel: {
        color: p.textMuted,
        fontSize: 12,
    },
    detail: {
        flex: 1,
        gap: 12,
    },
    headerButtons: {
        flexDirection: "row",
        gap: 6,
    },
    sellButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: p.ember,
    },
    sellButtonPressed: {
        transform: [{ scale: 0.95 }],
        backgroundColor: p.track,
    },
    sellButtonText: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
}));
