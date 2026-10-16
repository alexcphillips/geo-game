import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { HAND_SIZE } from "@/features/cards/cardSkills";
import ItemDetailModal from "@/features/inventory/components/ItemDetailModal";
import { isFaded, type InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo } from "@/features/inventory/rarity";
import { colors } from "@/theme/colors";

type RunHandProps = {
    /** The Run's hand, in order, with charges as the server last said. */
    cards: InventoryItem[];
    /** Omit to show the hand without letting it be played. */
    onPlay?: (card: InventoryItem) => void;
    /** Not this player's turn: cards are dimmed and can't be played. */
    disabled?: boolean;
    /** Drawn on its own row above the cards, at the right, e.g. the lunchbox. */
    accessory?: ReactNode;
    /** Hold a card to see its details. Omit to show them in a modal over the Run. */
    onInspect?: (card: InventoryItem) => void;
    /** A small mark in a card's top corner, e.g. fishing's ✦ for a card that raises quality. */
    cornerMark?: (card: InventoryItem) => ReactNode;
};

/**
 * The hand at the bottom of a Run: the cards brought into it, with empty
 * slots shown as placeholders. A card that fades mid-Run stays in its slot,
 * dimmed. An accessory (the lunchbox) sits on a short row above, at the
 * right, so the cards get the full width and every action a turn can take
 * still sits under the thumb.
 */
export default function RunHand({ cards, onPlay, disabled = false, accessory, onInspect, cornerMark }: RunHandProps) {
    return (
        <View style={styles.container}>
            {accessory && <View style={styles.accessory}>{accessory}</View>}
            <View style={styles.row}>
                {Array.from({ length: HAND_SIZE }, (_, index) => {
                    const card = cards[index];
                    return card ? (
                        <HandCard
                            key={card.id}
                            card={card}
                            onPlay={onPlay && !isFaded(card) ? () => onPlay(card) : undefined}
                            onInspect={onInspect ? () => onInspect(card) : undefined}
                            corner={cornerMark?.(card)}
                            disabled={disabled}
                        />
                    ) : (
                        <View key={`empty-${index}`} style={[styles.card, styles.placeholder]}>
                            <Icon name="card-pick" size={22} color={colors.border} />
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

function HandCard({
    card,
    onPlay,
    onInspect,
    corner,
    disabled,
}: {
    card: InventoryItem;
    onPlay?: () => void;
    onInspect?: () => void;
    corner?: ReactNode;
    disabled: boolean;
}) {
    const [isInspecting, setIsInspecting] = useState(false);
    const charges = card.charges;
    const faded = isFaded(card);

    return (
        <>
            <Pressable
                onPress={disabled ? undefined : onPlay}
                // Always holdable for details, even while it can't be played.
                onLongPress={onInspect ?? (() => setIsInspecting(true))}
                style={({ pressed }) => [
                    styles.card,
                    { borderColor: rarityInfo(card.rarity).color },
                    (disabled || faded) && styles.cardDisabled,
                    pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !onPlay || disabled }}
                accessibilityLabel={`Play ${card.name}${charges ? `, ${charges.remaining} of ${charges.max} charges` : ""}`}
            >
                {corner && <View style={styles.corner}>{corner}</View>}
                <Icon name={card.icon} size={32} color={colors.emberBright} />
                <Text style={styles.cardName} numberOfLines={2}>
                    {card.name}
                </Text>
                {charges && (
                    <Text style={styles.charges}>
                        {faded ? "Faded" : `${charges.remaining}/${charges.max}`}
                    </Text>
                )}
            </Pressable>
            {isInspecting && <ItemDetailModal item={card} onClose={() => setIsInspecting(false)} />}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        gap: 6,
    },
    // Portrait, like a playing card, so a hand reads as cards rather than as
    // more inventory squares.
    card: {
        flex: 1,
        aspectRatio: 0.7,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 4,
        borderRadius: 8,
        borderWidth: 1.5,
        backgroundColor: colors.surfaceRaised,
    },
    accessory: {
        alignSelf: "flex-end",
    },
    cardDisabled: {
        opacity: 0.45,
    },
    cardPressed: {
        transform: [{ scale: 0.94 }, { translateY: -4 }],
    },
    placeholder: {
        borderColor: colors.border,
        borderStyle: "dashed",
        backgroundColor: "transparent",
    },
    cardName: {
        color: colors.textPrimary,
        fontSize: 11,
        lineHeight: 13,
        fontWeight: "600",
        textAlign: "center",
    },
    corner: {
        position: "absolute",
        top: 3,
        right: 4,
    },
    charges: {
        color: colors.textSecondary,
        fontSize: 10,
        fontVariant: ["tabular-nums"],
    },
});
