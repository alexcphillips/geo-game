import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import ItemTile from "@/features/inventory/components/ItemTile";
import { rarityInfo } from "@/features/inventory/rarity";
import { colors } from "@/theme/colors";
import {
    ENDING_SOON_MS,
    formatCoins,
    formatDateTime,
    formatListedAgo,
    formatTimeLeft,
    listingPrice,
    timeLeft,
    topBid,
    uncollected,
    type Bid,
    type OwnListing,
} from "../market";
import { BIN_TAX_PERCENT } from "../sell";
import { ListingRow, SaleBadge } from "./MarketRows";

/**
 * The player's listings: sold ones on top, then a divider, then what's still
 * for sale. Newest first in each. Coins from sales wait on the listing until
 * collected, one at a time or all at once.
 */
export function OwnListingsPage({
    listings,
    now,
    onOpen,
    onCollect,
}: {
    listings: OwnListing[];
    now: number;
    onOpen: (listing: OwnListing) => void;
    onCollect: (listings: OwnListing[]) => void;
}) {
    const sold = listings
        .filter((listing) => !listing.isLive)
        .sort((a, b) => (b.sale?.soldAt ?? "").localeCompare(a.sale?.soldAt ?? ""));
    const live = listings
        .filter((listing) => listing.isLive)
        .sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    const waiting = uncollected(listings);
    const waitingCoins = waiting.reduce((sum, listing) => sum + listing.uncollected, 0);

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} alwaysBounceHorizontal={false}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sold</Text>
                {waiting.length > 0 && (
                    <CollectButton
                        label={`Collect all · ${formatCoins(waitingCoins)}`}
                        onPress={() => onCollect(waiting)}
                    />
                )}
            </View>
            {sold.map((listing) => (
                <SoldRow key={listing.id} listing={listing} now={now} onPress={() => onOpen(listing)} />
            ))}
            {sold.length === 0 && <Text style={styles.empty}>Nothing sold yet.</Text>}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Listed</Text>
            {live.map((listing) => (
                <ListingRow key={listing.id} listing={listing} now={now} onPress={() => onOpen(listing)} />
            ))}
            {live.length === 0 && <Text style={styles.empty}>Nothing for sale. Tap Sell to list something.</Text>}
        </ScrollView>
    );
}

/** A sold listing: what it went for, to whom, and when. */
function SoldRow({ listing, now, onPress }: { listing: OwnListing; now: number; onPress: () => void }) {
    const { item, sale } = listing;
    const rarity = rarityInfo(item.rarity);
    if (!sale) return null;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, sold to ${sale.buyer} for ${formatCoins(sale.buyerPaid)} coins${sale.collected ? "" : ", coins to collect"}`}
        >
            <View style={styles.rowTile}>
                <ItemTile item={item} compact onPress={onPress} />
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={[styles.rowRarity, { color: rarity.color }]}>{rarity.label}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                    To {sale.buyer} · {formatListedAgo(sale.soldAt, now)}
                </Text>
            </View>
            <View style={styles.rowPrice}>
                <Text style={sale.collected ? styles.soldLabel : styles.collectLabel}>
                    {sale.collected ? "Sold" : "To collect"}
                </Text>
                <View style={styles.priceLine}>
                    <Icon name="two-coins" size={14} color={colors.coins} />
                    <Text style={styles.priceText}>{formatCoins(sale.collected ? sale.buyerPaid : sale.sellerGot)}</Text>
                </View>
            </View>
        </Pressable>
    );
}

/** A small pill for taking coins from sold listings. */
function CollectButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.collect, pressed && styles.pressed]}
            accessibilityRole="button"
            hitSlop={8}
        >
            <Icon name="two-coins" size={13} color={colors.coins} />
            <Text style={styles.collectText}>{label}</Text>
        </Pressable>
    );
}

/**
 * The listing details above an own listing's item page: prices, buyer or
 * leading bidder, seller, dates, the timer, the bid history; once sold, a
 * Collect for the coins; while still for sale, a Cancel that asks once before
 * handing the item back. An auction someone has bid on can't be cancelled:
 * bidders are owed a fair shot at it.
 */
export function OwnListingPanel({
    listing,
    now,
    onCancel,
    onCollect,
}: {
    listing: OwnListing;
    now: number;
    onCancel: () => void;
    onCollect: () => void;
}) {
    const [isConfirming, setIsConfirming] = useState(false);
    const { sale } = listing;
    const isAuction = listing.type === "auction";
    const left = listing.type === "auction" ? timeLeft(listing, now) : 0;
    const isStack = listing.item.quantity !== undefined;
    const tax = listing.feePaid;
    const hasBids = isAuction && listing.bids > 0;

    const rows: [label: string, value: string, isCoins?: boolean][] = [];
    if (listing.type === "bin") {
        rows.push(["List price", formatCoins(listing.price), true]);
        if (isStack) rows.push(["Each", formatCoins(Math.round(listing.price / (listing.item.quantity ?? 1))), true]);
    } else {
        rows.push(["Starting bid", formatCoins(listing.startingBid), true]);
    }
    if (sale) {
        rows.push(["Bought for", formatCoins(sale.buyerPaid), true]);
        rows.push([listing.type === "bin" ? `${BIN_TAX_PERCENT}% tax, paid when listed` : "Listing fee", formatCoins(tax), true]);
        rows.push(["You got", formatCoins(sale.sellerGot), true]);
        rows.push(["Buyer", sale.buyer]);
        rows.push(["Seller", `${listing.seller} (you)`]);
        rows.push(["Listed", formatDateTime(listing.listedAt)]);
        rows.push(["Sold", formatDateTime(sale.soldAt)]);
    } else {
        if (isAuction) rows.push(["Current bid", listing.currentBid === null ? "No bids yet" : formatCoins(listingPrice(listing)), listing.currentBid !== null]);
        if (listing.type === "auction" && listing.leadingBidder !== null)
            rows.push(["Leading bidder", listing.leadingBidder]);
        rows.push([listing.type === "bin" ? `${BIN_TAX_PERCENT}% tax, paid` : "Listing fee, paid", formatCoins(tax), true]);
        if (listing.uncollected > 0) rows.push(["Sold so far", formatCoins(listing.uncollected), true]);
        rows.push(["Seller", `${listing.seller} (you)`]);
        rows.push(["Listed", formatDateTime(listing.listedAt)]);
    }

    const cancelWarning = [
        isStack && listing.uncollected > 0
            ? "What's still for sale goes back to your inventory."
            : "The item goes back to your inventory as it was.",
        isAuction ? "The listing fee isn't refunded." : "The tax isn't refunded.",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <View style={styles.panelWrap}>
            <View
                style={[
                    styles.panel,
                    { borderLeftColor: isAuction ? colors.listingAuction : colors.listingBuyNow },
                ]}
            >
                <View style={styles.panelTop}>
                    <SaleBadge type={listing.type} />
                    {sale ? (
                        <Text style={styles.soldLabel}>Sold</Text>
                    ) : isAuction ? (
                        <View style={styles.priceLine}>
                            <Icon
                                name="hourglass"
                                size={13}
                                color={left < ENDING_SOON_MS ? colors.toastError : colors.listingAuction}
                            />
                            <Text style={[styles.timer, left < ENDING_SOON_MS && styles.timerUrgent]}>
                                {formatTimeLeft(left)}
                                {left > 0 ? " left" : ""}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {rows.map(([label, value, isCoins]) => (
                    <View key={label} style={styles.panelRow}>
                        <Text style={styles.panelLabel}>{label}</Text>
                        <View style={styles.priceLine}>
                            {isCoins && <Icon name="two-coins" size={13} color={colors.coins} />}
                            <Text style={isCoins ? styles.panelCoins : styles.panelValue}>{value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {listing.uncollected > 0 ? (
                <Pressable
                    onPress={onCollect}
                    style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Icon name="two-coins" size={15} color={colors.coins} />
                    <Text style={styles.primaryText}>Collect {formatCoins(listing.uncollected)} coins</Text>
                </Pressable>
            ) : (
                sale && <Text style={styles.note}>Coins collected.</Text>
            )}

            {listing.bidHistory.length > 0 && <BidHistory listing={listing} />}

            {listing.isLive && hasBids && (
                <Text style={styles.note}>
                    {`${listing.bids === 1 ? "Someone has bid" : `${listing.bids} bids are in`}, so this auction can't be cancelled. It sells to the highest bidder when the timer runs out.`}
                </Text>
            )}

            {listing.isLive &&
                !hasBids &&
                (isConfirming ? (
                    <View style={styles.confirm}>
                        <Text style={styles.confirmText}>{cancelWarning}</Text>
                        <View style={styles.confirmButtons}>
                            <Pressable
                                onPress={() => setIsConfirming(false)}
                                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                                accessibilityRole="button"
                            >
                                <Text style={styles.secondaryText}>Keep listing</Text>
                            </Pressable>
                            <Pressable
                                onPress={onCancel}
                                style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
                                accessibilityRole="button"
                            >
                                <Text style={styles.dangerText}>Cancel listing</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        onPress={() => setIsConfirming(true)}
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.secondaryText}>
                            {isAuction && left <= 0 ? "Take back" : "Cancel listing"}
                        </Text>
                    </Pressable>
                ))}
        </View>
    );
}

/** How many bids the panel shows before the rest move behind "N more bids". */
const BIDS_SHOWN = 3;

/**
 * The latest bids, newest first, up to three; any older ones sit behind a
 * "N more bids" row that opens the full history. The top bid is highlighted:
 * "Won" once sold, "Leading" while the auction runs.
 */
function BidHistory({ listing }: { listing: OwnListing }) {
    const [isAllOpen, setIsAllOpen] = useState(false);
    const bids = [...listing.bidHistory].sort((a, b) => b.at.localeCompare(a.at));
    const top = topBid(listing);
    const topLabel = listing.sale ? "Won" : "Leading";
    const hidden = bids.length - BIDS_SHOWN;

    return (
        <View style={styles.bids}>
            <Text style={styles.sectionTitle}>Bid history</Text>
            {bids.slice(0, BIDS_SHOWN).map((bid) => (
                <BidRow key={`${bid.bidder}-${bid.at}`} bid={bid} topLabel={bid === top ? topLabel : null} />
            ))}
            {hidden > 0 && (
                <Pressable
                    onPress={() => setIsAllOpen(true)}
                    style={({ pressed }) => [styles.bidRow, styles.moreRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show all ${bids.length} bids`}
                >
                    <Text style={styles.moreText}>
                        {hidden} more {hidden === 1 ? "bid" : "bids"}
                    </Text>
                    <Icon name="scroll-unfurled" size={13} color={colors.emberBright} />
                </Pressable>
            )}

            {isAllOpen && (
                <Modal title="Bid history" size="large" onClose={() => setIsAllOpen(false)}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bids} alwaysBounceHorizontal={false}>
                        {bids.map((bid) => (
                            <BidRow
                                key={`${bid.bidder}-${bid.at}`}
                                bid={bid}
                                topLabel={bid === top ? topLabel : null}
                            />
                        ))}
                    </ScrollView>
                </Modal>
            )}
        </View>
    );
}

/** One bid: who, when and how much; `topLabel` marks the highest. */
function BidRow({ bid, topLabel }: { bid: Bid; topLabel: string | null }) {
    const isTop = topLabel !== null;
    return (
        <View style={[styles.bidRow, isTop && styles.bidRowTop]}>
            <View style={styles.bidText}>
                <Text style={[styles.bidder, isTop && styles.bidderTop]}>
                    {bid.bidder}
                    {isTop ? ` · ${topLabel}` : ""}
                </Text>
                <Text style={styles.meta}>{formatDateTime(bid.at)}</Text>
            </View>
            <View style={styles.priceLine}>
                <Icon name="two-coins" size={13} color={colors.coins} />
                <Text style={styles.panelCoins}>{formatCoins(bid.amount)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    empty: {
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
        paddingVertical: 8,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    collect: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.coins,
    },
    collectText: {
        color: colors.coins,
        fontSize: 12,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    collectLabel: {
        color: colors.coins,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    note: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 14,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    divider: {
        height: 1,
        marginVertical: 8,
        backgroundColor: colors.border,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 8,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.toastSuccess,
    },
    rowPressed: {
        borderColor: colors.ember,
        transform: [{ scale: 0.98 }],
    },
    rowTile: {
        width: 66,
    },
    rowText: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    rowName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    rowRarity: {
        fontSize: 11,
        fontWeight: "700",
    },
    rowPrice: {
        alignItems: "flex-end",
        gap: 2,
    },
    soldLabel: {
        color: colors.toastSuccess,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    priceLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    priceText: {
        color: colors.coins,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    meta: {
        color: colors.textSecondary,
        fontSize: 11,
    },
    panelWrap: {
        gap: 12,
        marginBottom: 4,
    },
    panel: {
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
    },
    panelTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    panelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    panelLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    panelValue: {
        color: colors.textPrimary,
        fontSize: 13,
        flexShrink: 1,
        textAlign: "right",
    },
    panelCoins: {
        color: colors.coins,
        fontSize: 14,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    timer: {
        color: colors.listingAuction,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    timerUrgent: {
        color: colors.toastError,
    },
    bids: {
        gap: 6,
    },
    bidRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bidRowTop: {
        borderColor: colors.listingAuction,
        backgroundColor: colors.surfaceRaised,
    },
    moreRow: {
        justifyContent: "center",
        gap: 6,
        borderStyle: "dashed",
    },
    moreText: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "700",
    },
    bidText: {
        gap: 1,
    },
    bidder: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
    },
    bidderTop: {
        color: colors.listingAuction,
        fontWeight: "800",
    },
    confirm: {
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.toastError,
    },
    confirmText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
    },
    confirmButtons: {
        flexDirection: "row",
        gap: 8,
    },
    secondary: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    secondaryText: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "700",
    },
    danger: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: colors.blood,
    },
    dangerText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
