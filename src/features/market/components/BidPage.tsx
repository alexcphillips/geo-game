import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/inventory/components/ItemTile";
import { colors } from "@/theme/colors";
import { ENDING_SOON_MS, formatCoins, formatTimeLeft, timeLeft, type MarketListing } from "../market";
import { Field, NumberInput } from "./FormFields";
import { SaleBadge } from "./MarketRows";

type AuctionListing = Extract<MarketListing, { type: "auction" }>;

/**
 * Bidding on an auction: where it stands (time left, current bid, how many
 * bids, who leads), then two ways to bid — the minimum in one tap, or any
 * amount above it typed in.
 *
 * The minimum is the starting bid until someone bids, then the current bid
 * plus about 5% (`geoMinBid`), so nobody wins by outbidding by a coin. Both
 * buttons need the coins in hand, and close when the timer runs out.
 */
export default function BidPage({
    listing,
    coins,
    now,
    onBid,
}: {
    listing: AuctionListing;
    coins: number;
    now: number;
    onBid: (amount: number) => void;
}) {
    const [custom, setCustom] = useState("");
    const left = timeLeft(listing, now);
    const isOver = left <= 0;
    const minBid = listing.minBid;
    const amount = Number(custom);

    const minProblem = isOver
        ? "Bidding has closed."
        : minBid > coins
          ? `You need ${formatCoins(minBid)} coins to bid.`
          : null;
    const customProblem =
        minProblem ??
        (custom === ""
            ? null
            : amount < minBid
              ? `Bid at least ${formatCoins(minBid)}.`
              : amount > coins
                ? `You have ${formatCoins(coins)} coins.`
                : null);
    const canBidCustom = custom !== "" && customProblem === null;

    const rows: [label: string, value: string, isCoins?: boolean][] = [
        listing.currentBid === null
            ? ["Starting bid", formatCoins(listing.startingBid), true]
            : ["Current bid", formatCoins(listing.currentBid), true],
        ["Bids", listing.bids === 0 ? "None yet" : formatCoins(listing.bids)],
    ];
    if (listing.leadingBidder !== null) rows.push(["Leading bidder", listing.leadingBidder]);
    rows.push(["Seller", listing.seller]);
    rows.push(["Your coins", formatCoins(coins), true]);

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            alwaysBounceHorizontal={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
        >
            <View style={styles.itemRow}>
                <View style={styles.itemTile}>
                    <ItemTile item={listing.item} compact />
                </View>
                <View style={styles.itemText}>
                    <Text style={styles.itemName}>{listing.item.name}</Text>
                    <SaleBadge type="auction" />
                </View>
            </View>

            <View style={styles.panel}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Time left</Text>
                    <View style={styles.rowValue}>
                        <Icon
                            name="hourglass"
                            size={14}
                            color={left < ENDING_SOON_MS ? colors.toastError : colors.listingAuction}
                        />
                        <Text style={[styles.timer, left < ENDING_SOON_MS && styles.timerUrgent]}>
                            {formatTimeLeft(left)}
                        </Text>
                    </View>
                </View>
                {rows.map(([label, value, isCoins]) => (
                    <View key={label} style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <View style={styles.rowValue}>
                            {isCoins && <Icon name="two-coins" size={13} color={colors.coins} />}
                            <Text style={isCoins ? styles.coinsText : styles.plainText}>{value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <Pressable
                onPress={() => onBid(minBid)}
                disabled={minProblem !== null}
                style={({ pressed }) => [
                    styles.primary,
                    minProblem !== null && styles.disabled,
                    pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: minProblem !== null }}
            >
                <Text style={styles.primaryText}>Bid minimum</Text>
                <Icon name="two-coins" size={15} color={colors.textOnEmber} />
                <Text style={styles.primaryText}>{formatCoins(minBid)}</Text>
            </Pressable>

            <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
            </View>

            <Field label="Your bid" hint={`At least ${formatCoins(minBid)}`}>
                <NumberInput
                    value={custom}
                    onChange={setCustom}
                    accessibilityLabel="Your bid, in coins"
                    placeholder={formatCoins(minBid)}
                    coins
                />
            </Field>

            {customProblem && <Text style={styles.problem}>{customProblem}</Text>}

            <Pressable
                onPress={() => onBid(amount)}
                disabled={!canBidCustom}
                style={({ pressed }) => [styles.secondary, !canBidCustom && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canBidCustom }}
            >
                <Text style={styles.secondaryText}>
                    {canBidCustom ? `Place bid of ${formatCoins(amount)}` : "Place bid"}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 14,
        paddingBottom: 12,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    itemTile: {
        width: 66,
    },
    itemText: {
        flex: 1,
        gap: 4,
    },
    itemName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: "700",
    },
    panel: {
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.listingAuction,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    rowLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    rowValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    coinsText: {
        color: colors.coins,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    plainText: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
    },
    timer: {
        color: colors.listingAuction,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    timerUrgent: {
        color: colors.toastError,
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
    secondary: {
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    secondaryText: {
        color: colors.emberBright,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    disabled: {
        opacity: 0.4,
    },
    orRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    orText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    problem: {
        color: colors.toastError,
        fontSize: 13,
        textAlign: "center",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
