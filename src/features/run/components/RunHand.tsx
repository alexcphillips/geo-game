import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { HAND_SIZE } from "@/features/cards/cardSkills";
import ItemDetailModal from "@/features/inventory/components/ItemDetailModal";
import { isFaded, type InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo } from "@/features/inventory/rarity";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";

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
    /** False greys out one card the server says can't be played now, e.g. a self-buff already up. */
    isPlayable?: (card: InventoryItem) => boolean;
    /** A small tag pinned to a card's top edge, e.g. combat's live damage preview. */
    tag?: (card: InventoryItem) => ReactNode;
};

/**
 * The hand at the bottom of a Run: the cards brought into it, with empty
 * slots shown as placeholders. A card that fades mid-Run stays in its slot,
 * dimmed. An accessory (the lunchbox) sits on a short row above, at the
 * right, so the cards get the full width and every action a turn can take
 * still sits under the thumb.
 */
export default function RunHand({ cards, onPlay, disabled = false, accessory, onInspect, cornerMark, isPlayable, tag }: RunHandProps) {
    const styles = useStyles();
    const palette = useTheme();
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
                            tag={tag?.(card)}
                            disabled={disabled || isPlayable?.(card) === false}
                        />
                    ) : (
                        <View key={`empty-${index}`} style={[styles.card, styles.placeholder]}>
                            <Icon name="card-pick" size={22} color={palette.textMuted} />
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
    tag,
    disabled,
}: {
    card: InventoryItem;
    onPlay?: () => void;
    onInspect?: () => void;
    corner?: ReactNode;
    tag?: ReactNode;
    disabled: boolean;
}) {
    const styles = useStyles();
    const palette = useTheme();
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
                    (disabled || faded) && styles.cardDisabled,
                    pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !onPlay || disabled }}
                accessibilityLabel={`Play ${card.name}${charges ? `, ${charges.remaining} of ${charges.max} charges` : ""}`}
            >
                {/* Rarity as a strip across the top, the way the mockups draw it. */}
                <View style={[styles.rarity, { backgroundColor: rarityInfo(card.rarity).color }]} />
                {corner && <View style={styles.corner}>{corner}</View>}
                {tag && (
                    <View style={styles.tagSlot} pointerEvents="none">
                        {tag}
                    </View>
                )}
                <Icon name={card.icon} size={32} color={palette.ember} />
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

const useStyles = createStyles((p) => ({
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
        borderRadius: 12,
        backgroundColor: p.cardFace,
        ...inked({ ...p, outline: p.cardOutline }),
    },
    rarity: {
        position: "absolute",
        top: 3,
        left: "22%",
        right: "22%",
        height: 4,
        borderRadius: 2,
    },
    accessory: {
        alignSelf: "flex-end",
    },
    cardDisabled: {
        opacity: 0.45,
    },
    cardPressed: {
        transform: [{ scale: 0.96 }, { translateY: -6 }],
    },
    placeholder: {
        borderWidth: 2,
        borderColor: p.textMuted,
        borderStyle: "dashed",
        backgroundColor: "transparent",
        boxShadow: "none",
    },
    cardName: {
        color: p.cardText,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 11,
        lineHeight: 13,
        textAlign: "center",
    },
    // Straddles the top edge, centred, so it reads as part of the card.
    tagSlot: {
        position: "absolute",
        top: -9,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    corner: {
        position: "absolute",
        top: 3,
        right: 4,
    },
    charges: {
        color: p.textMuted,
        fontFamily: FONTS.bodyBold,
        fontSize: 10,
        fontVariant: ["tabular-nums"],
    },
}));
