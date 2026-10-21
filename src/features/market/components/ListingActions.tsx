import { useState } from "react";
import { Text, View } from "react-native";
import Button from "@/components/Button/Button";
import { Hint } from "@/components/Text/Text";
import { createStyles } from "@/theme/theme";
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
    const styles = useStyles();
    const [isConfirming, setIsConfirming] = useState(false);

    if (listing.isMine) return <Hint>Your listing. Manage it from Listings.</Hint>;

    if (listing.type === "auction") {
        const isOver = timeLeft(listing, now) <= 0;
        const isClosed = isOver || listing.youLead;
        return (
            <Button label={isOver ? "Bidding closed" : listing.youLead ? "You have the top bid" : "Place bid"} variant="primary" size="large" icon="hourglass" onPress={onBid} disabled={isClosed} stretch />
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
                    <Button label="Back" onPress={() => setIsConfirming(false)} />
                    <Button
                        label="Buy"
                        variant="primary"
                        onPress={() => {
                            setIsConfirming(false);
                            onBuy();
                        }}
                        style={styles.grow}
                    />
                </View>
            </View>
        );

    return (
        <View style={styles.wrap}>
            <Button label={`Buy now · ${formatCoins(buyerPays)}`} variant="primary" size="large" icon="two-coins" onPress={() => setIsConfirming(true)} disabled={!canAfford} stretch />
            {!canAfford && (
                <Hint>
                    You have {formatCoins(coins)} coins: {formatCoins(buyerPays - coins)} short.
                </Hint>
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    wrap: {
        gap: 6,
    },
    grow: {
        flex: 1,
    },
    confirm: {
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.ember,
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
}));
