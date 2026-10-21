import { Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/items/components/ItemTile";
import { rarityInfo } from "@/features/items/rarity";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
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

/** Each listing type's look; its colour is a game colour, read in the mood. */
const SALE_TYPES: Record<ListingType, { label: string; icon: "gavel" | "price-tag"; color: "listingAuction" | "listingBuyNow" }> = {
    auction: { label: "Auction", icon: "gavel", color: "listingAuction" },
    bin: { label: "Buy now", icon: "price-tag", color: "listingBuyNow" },
};

/** "Auction" or "Buy now", in its colour, so the type never rests on colour alone. */
export function SaleBadge({ type }: { type: ListingType }) {
    const palette = useTheme();
    const styles = useStyles();
    const sale = SALE_TYPES[type];
    const saleColor = palette.game[sale.color];
    return (
        <View style={[styles.badge, { borderColor: saleColor }]}>
            <Icon name={sale.icon} size={10} color={saleColor} />
            <Text style={[styles.badgeText, { color: saleColor }]}>{sale.label}</Text>
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
    const styles = useStyles();
    const palette = useTheme();
    const { item } = listing;
    const rarity = rarityInfo(item.rarity);
    const sale = SALE_TYPES[listing.type];
    const saleColor = palette.game[sale.color];
    const price = formatCoins(listingPrice(listing));
    const left = listing.type === "auction" ? timeLeft(listing, now) : 0;
    const timing =
        listing.type === "auction"
            ? `${formatTimeLeft(left)}${left > 0 ? " left" : ""}`
            : formatListedAgo(listing.listedAt, now);
    const priceNote =
        listing.type === "auction" ? (listing.bids > 0 ? `${listing.bids} bids` : "Starting bid") : null;

    return (
        <Panel compact
            onPress={onPress}
            style={[styles.row, { borderLeftColor: saleColor }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${rarity.label}, ${sale.label}, ${price} coins, ${timing}`}
        >
            {/* Taps open the row like anywhere else on it; a hold shows the item. */}
            <View style={styles.rowTile}>
                <ItemTile item={item} onPress={onPress} showName={false} />
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
                    <Icon name="two-coins" size={14} color={palette.reward} />
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
        </Panel>
    );
}

/** One stackable: its cheapest price each and how many are for sale in all. */
export function ProductRow({ product, onPress }: { product: MarketProduct; onPress: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
    const { item } = product;
    const rarity = rarityInfo(item.rarity);
    const price = formatCoins(lowestPrice(product));
    const forSale = formatCoins(totalForSale(product));

    return (
        <Panel compact
            onPress={onPress}
            style={[styles.row, { borderLeftColor: palette.game.listingBuyNow }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${rarity.label}, from ${price} coins each, ${forSale} for sale`}
        >
            <View style={styles.rowTile}>
                <ItemTile item={item} onPress={onPress} showName={false} />
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
                    <Icon name="two-coins" size={14} color={palette.reward} />
                    <Text style={styles.priceText}>{price}</Text>
                </View>
                <Text style={styles.meta}>each</Text>
            </View>
        </Panel>
    );
}

/** Above a single listing's item page: how it's sold, its price, and its timer. */
export function ListingSummary({ listing, now }: { listing: MarketListing; now: number }) {
    const styles = useStyles();
    const palette = useTheme();
    const sale = SALE_TYPES[listing.type];
    const saleColor = palette.game[sale.color];
    const left = listing.type === "auction" ? timeLeft(listing, now) : 0;

    return (
        <Panel compact style={[styles.panel, { borderLeftColor: saleColor }]}>
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
                    <Icon name="two-coins" size={16} color={palette.reward} />
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
                            color={left < ENDING_SOON_MS ? palette.danger : palette.game.listingAuction}
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
        </Panel>
    );
}

/** Every offer for one stackable, cheapest first: what buying N would cost. */
export function PriceLadder({ product }: { product: MarketProduct }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel compact style={[styles.panel, { borderLeftColor: palette.game.listingBuyNow }]}>
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
                        <Icon name="two-coins" size={14} color={palette.reward} />
                        <Text style={[styles.ladderPrice, index === 0 && styles.ladderPriceBest]}>
                            {formatCoins(offer.price)}
                        </Text>
                    </View>
                    <Text style={styles.ladderQuantity}>×{formatCoins(offer.quantity)}</Text>
                </View>
            ))}
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    panelName: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
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
    timer: {
        color: p.game.listingAuction,
        fontFamily: FONTS.bodyBold,
        fontVariant: ["tabular-nums"],
    },
    timerUrgent: {
        color: p.danger,
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
    },
    panelLabel: {
        color: p.textMuted,
        fontSize: 13,
    },
    panelPrice: {
        color: p.reward,
        fontSize: 17,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    timerLarge: {
        color: p.game.listingAuction,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    ladderHeading: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    ladderPrice: {
        color: p.reward,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
        fontVariant: ["tabular-nums"],
    },
    ladderPriceBest: {
        fontFamily: FONTS.bodyHeavy,
    },
    ladderQuantity: {
        color: p.text,
        fontSize: 14,
        fontVariant: ["tabular-nums"],
    },
}));
