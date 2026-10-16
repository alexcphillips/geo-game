import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";
import { formatCoins, timeLeft, type MarketListing } from "../market";

/**
 * What a buyer can do with someone else's listing, under its summary.
 *
 * Buy-it-now: Buy now, greyed out when the player can't afford it; a tap
 * asks once before paying, since one tap shouldn't spend a fortune.
 * Auctions: Place bid, which opens the bid page. Closed once time runs out,
 * and while the player already holds the top bid.
 * Nothing on the player's own listing: they manage it from Listings.
 */
export default function ListingActions({
    listing,
    coins,
    now,
    onBuy,
    onBid,
}: {
    listing: MarketListing;
    coins: number;
    now: number;
    onBuy: () => void;
    onBid: () => void;
}) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (listing.isMine) return <Text style={styles.hint}>Your listing. Manage it from Listings.</Text>;

    if (listing.type === "auction") {
        const isOver = timeLeft(listing, now) <= 0;
        const isClosed = isOver || listing.youLead;
        return (
            <Pressable
                onPress={onBid}
                disabled={isClosed}
                style={({ pressed }) => [styles.primary, isClosed && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isClosed }}
            >
                <Icon name="hourglass" size={15} color={colors.textOnEmber} />
                <Text style={styles.primaryText}>
                    {isOver ? "Bidding closed" : listing.youLead ? "You have the top bid" : "Place bid"}
                </Text>
            </Pressable>
        );
    }

    const buyerPays = listing.price;
    const canAfford = coins >= buyerPays;

    if (isConfirming)
        return (
            <View style={styles.confirm}>
                <Text style={styles.confirmText}>
                    Pay {formatCoins(buyerPays)} coins for {listing.item.name}? You&apos;ll have{" "}
                    {formatCoins(coins - buyerPays)} left.
                </Text>
                <View style={styles.confirmButtons}>
                    <Pressable
                        onPress={() => setIsConfirming(false)}
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.secondaryText}>Back</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            setIsConfirming(false);
                            onBuy();
                        }}
                        style={({ pressed }) => [styles.primary, styles.grow, pressed && styles.pressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.primaryText}>Buy</Text>
                    </Pressable>
                </View>
            </View>
        );

    return (
        <View style={styles.wrap}>
            <Pressable
                onPress={() => setIsConfirming(true)}
                disabled={!canAfford}
                style={({ pressed }) => [styles.primary, !canAfford && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAfford }}
            >
                <Text style={styles.primaryText}>Buy now</Text>
                <Icon name="coins" size={15} color={colors.textOnEmber} />
                <Text style={styles.primaryText}>{formatCoins(buyerPays)}</Text>
            </Pressable>
            {!canAfford && (
                <Text style={styles.hint}>
                    You have {formatCoins(coins)} coins: {formatCoins(buyerPays - coins)} short.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 6,
    },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
    },
    grow: {
        flex: 1,
    },
    disabled: {
        opacity: 0.4,
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: "center",
    },
    confirm: {
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.ember,
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
        justifyContent: "center",
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
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
