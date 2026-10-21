import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Divider from "@/components/Divider/Divider";
import EmptyState from "@/components/EmptyState/EmptyState";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { Hint, SectionTitle } from "@/components/Text/Text";
import ItemTile from "@/features/items/components/ItemTile";
import { rarityInfo } from "@/features/items/rarity";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
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
    const styles = useStyles();
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
                <SectionTitle>Sold</SectionTitle>
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
            {sold.length === 0 && <EmptyState title="Nothing sold yet." />}

            <Divider />

            <SectionTitle>Listed</SectionTitle>
            {live.map((listing) => (
                <ListingRow key={listing.id} listing={listing} now={now} onPress={() => onOpen(listing)} />
            ))}
            {live.length === 0 && <EmptyState title="Nothing for sale. Tap Sell to list something." />}
        </ScrollView>
    );
}

/** A sold listing: what it went for, to whom, and when. */
function SoldRow({ listing, now, onPress }: { listing: OwnListing; now: number; onPress: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
    const { item, sale } = listing;
    const rarity = rarityInfo(item.rarity);
    if (!sale) return null;

    return (
        <Panel compact
            onPress={onPress}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, sold to ${sale.buyer} for ${formatCoins(sale.buyerPaid)} coins${sale.collected ? "" : ", coins to collect"}`}
        >
            <View style={styles.rowTile}>
                <ItemTile item={item} onPress={onPress} showName={false} />
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
                    <Icon name="two-coins" size={14} color={palette.reward} />
                    <Text style={styles.priceText}>{formatCoins(sale.collected ? sale.buyerPaid : sale.sellerGot)}</Text>
                </View>
            </View>
        </Panel>
    );
}

/** A small pill for taking coins from sold listings. */
function CollectButton({ label, onPress }: { label: string; onPress: () => void }) {
    return <Button label={label} size="small" variant="primary" icon="two-coins" onPress={onPress} />;
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
    const styles = useStyles();
    const palette = useTheme();
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
            <Panel compact
                style={[
                    styles.panel,
                    { borderLeftColor: isAuction ? palette.game.listingAuction : palette.game.listingBuyNow },
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
                                color={left < ENDING_SOON_MS ? palette.danger : palette.game.listingAuction}
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
                            {isCoins && <Icon name="two-coins" size={13} color={palette.reward} />}
                            <Text style={isCoins ? styles.panelCoins : styles.panelValue}>{value}</Text>
                        </View>
                    </View>
                ))}
            </Panel>

            {listing.uncollected > 0 ? (
                <Button label={`Collect ${formatCoins(listing.uncollected)} coins`} variant="primary" size="large" icon="two-coins" onPress={onCollect} stretch />
            ) : (
                sale && <Hint>Coins collected.</Hint>
            )}

            {listing.bidHistory.length > 0 && <BidHistory listing={listing} />}

            {listing.isLive && hasBids && (
                <Hint>
                    {`${listing.bids === 1 ? "Someone has bid" : `${listing.bids} bids are in`}, so this auction can't be cancelled. It sells to the highest bidder when the timer runs out.`}
                </Hint>
            )}

            {listing.isLive &&
                !hasBids &&
                (isConfirming ? (
                    <View style={styles.confirm}>
                        <Text style={styles.confirmText}>{cancelWarning}</Text>
                        <View style={styles.confirmButtons}>
                            <Button label="Keep listing" onPress={() => setIsConfirming(false)} />
                            <Button label="Cancel listing" variant="danger" onPress={onCancel} />
                        </View>
                    </View>
                ) : (
                    <Button label={isAuction && left <= 0 ? "Take back" : "Cancel listing"} onPress={() => setIsConfirming(true)} stretch />
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
    const styles = useStyles();
    const palette = useTheme();
    const [isAllOpen, setIsAllOpen] = useState(false);
    const bids = [...listing.bidHistory].sort((a, b) => b.at.localeCompare(a.at));
    const top = topBid(listing);
    const topLabel = listing.sale ? "Won" : "Leading";
    const hidden = bids.length - BIDS_SHOWN;

    return (
        <View style={styles.bids}>
            <SectionTitle>Bid history</SectionTitle>
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
                    <Icon name="scroll-unfurled" size={13} color={palette.ember} />
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
    const styles = useStyles();
    const palette = useTheme();
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
                <Icon name="two-coins" size={13} color={palette.reward} />
                <Text style={styles.panelCoins}>{formatCoins(bid.amount)}</Text>
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    collectLabel: {
        color: p.reward,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 8,
        borderLeftWidth: 3,
        borderLeftColor: p.heal,
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
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    rowRarity: {
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
    },
    rowPrice: {
        alignItems: "flex-end",
        gap: 2,
    },
    soldLabel: {
        color: p.heal,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    priceLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    priceText: {
        color: p.reward,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    meta: {
        color: p.textMuted,
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
        color: p.textMuted,
        fontSize: 13,
    },
    panelValue: {
        color: p.text,
        fontSize: 13,
        flexShrink: 1,
        textAlign: "right",
    },
    panelCoins: {
        color: p.reward,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    timer: {
        color: p.game.listingAuction,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    timerUrgent: {
        color: p.danger,
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
        borderColor: p.outline,
    },
    bidRowTop: {
        borderColor: p.game.listingAuction,
        backgroundColor: p.surfaceAlt,
    },
    moreRow: {
        justifyContent: "center",
        gap: 6,
        borderStyle: "dashed",
    },
    moreText: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    bidText: {
        gap: 1,
    },
    bidder: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    bidderTop: {
        color: p.game.listingAuction,
        fontFamily: FONTS.bodyHeavy,
    },
    confirm: {
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.danger,
    },
    confirmText: {
        color: p.text,
        fontSize: 13,
        lineHeight: 18,
    },
    confirmButtons: {
        flexDirection: "row",
        gap: 8,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
