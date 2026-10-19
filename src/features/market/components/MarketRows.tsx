import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/inventory/components/ItemTile";
import { rarityInfo } from "@/features/inventory/rarity";
import { colors } from "@/theme/colors";
import {
    ENDING_SOON_MS,
    formatCoins,
    formatListedAgo,
    formatTimeLeft,
    listingPrice,
    lowestPrice,
    timeLeft,
    totalForSale,
    type ListingType,
    type MarketListing,
    type MarketProduct,
} from "../market";

const ROW_TILE_SIZE = 66;

const SALE_TYPES: Record<ListingType, { label: string; icon: "gavel" | "price-tag"; color: string }> = {
    auction: { label: "Auction", icon: "gavel", color: colors.listingAuction },
    bin: { label: "Buy now", icon: "price-tag", color: colors.listingBuyNow },
};

/** "Auction" or "Buy now", in its colour, so the type never rests on colour alone. */
export function SaleBadge({ type }: { type: ListingType }) {
    const sale = SALE_TYPES[type];
    return (
        <View style={[styles.badge, { borderColor: sale.color }]}>
            <Icon name={sale.icon} size={10} color={sale.color} />
            <Text style={[styles.badgeText, { color: sale.color }]}>{sale.label}</Text>
        </View>
    );
}

/**
 * One single item for sale. A stripe down the left edge and a badge say
 * whether it's an auction or buy-it-now; auctions show the bid to beat and a
 * live timer, buy-it-now shows the price and when it went up.
 */
export function ListingRow({
    listing,
    now,
    onPress,
}: {
    listing: MarketListing;
    now: number;
    onPress: () => void;
}) {
    const { item } = listing;
    const rarity = rarityInfo(item.rarity);
    const sale = SALE_TYPES[listing.type];
    const price = formatCoins(listingPrice(listing));
    const left = listing.type === "auction" ? timeLeft(listing, now) : 0;
    const timing =
        listing.type === "auction"
            ? `${formatTimeLeft(left)}${left > 0 ? " left" : ""}`
            : formatListedAgo(listing.listedAt, now);
    const priceNote =
        listing.type === "auction" ? (listing.bids > 0 ? `${listing.bids} bids` : "Starting bid") : null;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                { borderLeftColor: sale.color },
                pressed && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${rarity.label}, ${sale.label}, ${price} coins, ${timing}`}
        >
            {/* Taps open the row like anywhere else on it; a hold shows the item. */}
            <View style={styles.rowTile}>
                <ItemTile item={item} compact onPress={onPress} />
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={[styles.rowRarity, { color: rarity.color }]}>{rarity.label}</Text>
                <SaleBadge type={listing.type} />
            </View>
            <View style={styles.rowPrice}>
                <View style={styles.priceLine}>
                    <Icon name="two-coins" size={14} color={colors.coins} />
                    <Text style={styles.priceText}>{price}</Text>
                </View>
                {priceNote && <Text style={styles.meta}>{priceNote}</Text>}
                <Text
                    style={[
                        styles.meta,
                        listing.type === "auction" && styles.timer,
                        listing.type === "auction" && left < ENDING_SOON_MS && styles.timerUrgent,
                    ]}
                >
                    {timing}
                </Text>
            </View>
        </Pressable>
    );
}

/** One stackable: its cheapest price each and how many are for sale in all. */
export function ProductRow({ product, onPress }: { product: MarketProduct; onPress: () => void }) {
    const { item } = product;
    const rarity = rarityInfo(item.rarity);
    const price = formatCoins(lowestPrice(product));
    const forSale = formatCoins(totalForSale(product));

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                { borderLeftColor: colors.listingBuyNow },
                pressed && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${rarity.label}, from ${price} coins each, ${forSale} for sale`}
        >
            <View style={styles.rowTile}>
                <ItemTile item={item} compact onPress={onPress} />
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={[styles.rowRarity, { color: rarity.color }]}>{rarity.label}</Text>
                <Text style={styles.meta}>{forSale} for sale</Text>
            </View>
            <View style={styles.rowPrice}>
                <View style={styles.priceLine}>
                    <Icon name="two-coins" size={14} color={colors.coins} />
                    <Text style={styles.priceText}>{price}</Text>
                </View>
                <Text style={styles.meta}>each</Text>
            </View>
        </Pressable>
    );
}

/** Above a single listing's item page: how it's sold, its price, and its timer. */
export function ListingSummary({ listing, now }: { listing: MarketListing; now: number }) {
    const sale = SALE_TYPES[listing.type];
    const left = listing.type === "auction" ? timeLeft(listing, now) : 0;

    return (
        <View style={[styles.panel, { borderLeftColor: sale.color }]}>
            <View style={styles.panelTop}>
                <SaleBadge type={listing.type} />
                <Text style={styles.meta}>Listed {formatListedAgo(listing.listedAt, now)}</Text>
            </View>
            <View style={styles.panelRow}>
                <Text style={styles.panelLabel}>
                    {listing.type === "bin"
                        ? "Price"
                        : listing.currentBid === null
                          ? "Starting bid"
                          : `Current bid · ${listing.bids} bids`}
                </Text>
                <View style={styles.priceLine}>
                    <Icon name="two-coins" size={16} color={colors.coins} />
                    <Text style={styles.panelPrice}>{formatCoins(listingPrice(listing))}</Text>
                </View>
            </View>
            {listing.type === "auction" && listing.leadingBidder !== null && (
                <View style={styles.panelRow}>
                    <Text style={styles.panelLabel}>Leading bidder</Text>
                    <Text style={styles.panelName}>
                        {listing.youLead ? `${listing.leadingBidder} (you)` : listing.leadingBidder}
                    </Text>
                </View>
            )}
            {listing.type === "auction" && (
                <View style={styles.panelRow}>
                    <Text style={styles.panelLabel}>Time left</Text>
                    <View style={styles.priceLine}>
                        <Icon
                            name="hourglass"
                            size={14}
                            color={left < ENDING_SOON_MS ? colors.toastError : colors.listingAuction}
                        />
                        <Text style={[styles.timerLarge, left < ENDING_SOON_MS && styles.timerUrgent]}>
                            {formatTimeLeft(left)}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.panelRow}>
                <Text style={styles.panelLabel}>Seller</Text>
                <Text style={styles.panelName}>{listing.seller}</Text>
            </View>
        </View>
    );
}

/** Every offer for one stackable, cheapest first: what buying N would cost. */
export function PriceLadder({ product }: { product: MarketProduct }) {
    return (
        <View style={[styles.panel, { borderLeftColor: colors.listingBuyNow }]}>
            <View style={styles.panelTop}>
                <SaleBadge type="bin" />
                <Text style={styles.meta}>{formatCoins(totalForSale(product))} for sale</Text>
            </View>
            <View style={styles.panelRow}>
                <Text style={styles.ladderHeading}>Price each</Text>
                <Text style={styles.ladderHeading}>Quantity</Text>
            </View>
            {product.offers.map((offer, index) => (
                <View key={offer.price} style={styles.panelRow}>
                    <View style={styles.priceLine}>
                        <Icon name="two-coins" size={14} color={colors.coins} />
                        <Text style={[styles.ladderPrice, index === 0 && styles.ladderPriceBest]}>
                            {formatCoins(offer.price)}
                        </Text>
                    </View>
                    <Text style={styles.ladderQuantity}>×{formatCoins(offer.quantity)}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    panelName: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
        flexShrink: 1,
        textAlign: "right",
    },
    badge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
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
    },
    rowPressed: {
        borderColor: colors.ember,
        transform: [{ scale: 0.98 }],
    },
    rowTile: {
        width: ROW_TILE_SIZE,
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
    timer: {
        color: colors.listingAuction,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    timerUrgent: {
        color: colors.toastError,
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
    },
    panelLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    panelPrice: {
        color: colors.coins,
        fontSize: 17,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
    },
    timerLarge: {
        color: colors.listingAuction,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    ladderHeading: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    ladderPrice: {
        color: colors.coins,
        fontSize: 15,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    ladderPriceBest: {
        fontWeight: "800",
    },
    ladderQuantity: {
        color: colors.textPrimary,
        fontSize: 14,
        fontVariant: ["tabular-nums"],
    },
});
