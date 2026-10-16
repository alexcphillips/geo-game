import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { QUALITY_TIER_COLORS, QUALITY_TIER_LABELS } from "@/features/fishing/fishingText";
import { colors } from "@/theme/colors";
import { isFaded, type InventoryItem } from "../inventoryItems";
import { rarityInfo } from "../rarity";
import ItemDetailModal from "./ItemDetailModal";

type ItemTileProps = {
    /** Omit for an empty slot. */
    item?: InventoryItem;
    onPress?: (item: InventoryItem) => void;
    /** Omit to have a hold open the item's details in a modal of their own. */
    onLongPress?: (item: InventoryItem) => void;
    /** Marks the tile as chosen — e.g. a card that is in the current hand. */
    selected?: boolean;
    /** What "selected" means, for screen readers. */
    selectedLabel?: string;
    /** A smaller icon, for denser grids where the name needs the room. */
    compact?: boolean;
};

/**
 * One square in the inventory grid: an item, or an empty slot.
 *
 * Square via `aspectRatio`, so the grid's column count alone sets the size.
 * The border is the item's rarity colour. A quality catch adds a metal rim
 * inside it in its tier's colour (a gem on top for Ruby), so the tier never
 * fights the rarity for the same border.
 * Cards show their remaining charges as a bar along the bottom; a faded card
 * (no charges left) is greyed out and labelled, since it can never be played
 * again.
 * Every tile with an item can be held for its details: the screen's own
 * `onLongPress` when it gives one, otherwise a details modal over it.
 */
export default function ItemTile({
    item,
    onPress,
    onLongPress,
    selected = false,
    selectedLabel = "in hand",
    compact = false,
}: ItemTileProps) {
    const [isInspecting, setIsInspecting] = useState(false);
    if (!item) return <View style={[styles.tile, styles.empty]} />;

    const faded = isFaded(item);
    const charges = item.charges;

    return (
        <>
            <Pressable
                onPress={onPress ? () => onPress(item) : undefined}
                onLongPress={onLongPress ? () => onLongPress(item) : () => setIsInspecting(true)}
                style={({ pressed }) => [
                    styles.tile,
                    { borderColor: rarityInfo(item.rarity).color },
                    faded && styles.faded,
                    pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={[
                    item.name,
                    item.quantity !== undefined ? `${item.quantity}` : null,
                    charges ? `${charges.remaining} of ${charges.max} charges` : null,
                    rarityInfo(item.rarity).label,
                    item.quality ? `${QUALITY_TIER_LABELS[item.quality]} quality` : null,
                    item.soulbound ? "Soulbound" : null,
                    faded ? "faded" : null,
                    selected ? selectedLabel : null,
                ]
                    .filter(Boolean)
                    .join(", ")}
                accessibilityHint="Hold for details"
            >
                {item.quality && (
                    <View pointerEvents="none" style={[styles.qualityRim, { borderColor: QUALITY_TIER_COLORS[item.quality] }]} />
                )}
                {item.quality === "ruby" && <View pointerEvents="none" style={styles.rubyGem} />}
                <Icon
                    name={item.icon}
                    size={compact ? 28 : 40}
                    color={faded ? colors.textSecondary : colors.emberBright}
                />
                {/* Wraps rather than truncating; two lines fit any tile size the
                    grids use, and the tile clips anything past that. */}
                <Text style={[styles.name, faded && styles.fadedText]}>
                    {faded ? "Faded" : item.name}
                </Text>

                {selected && (
                    <View style={styles.selectedBadge}>
                        <Icon name="check-mark" size={10} color={colors.textOnEmber} />
                    </View>
                )}

                {item.quantity !== undefined && item.quantity > 1 && (
                    <Text style={styles.quantity}>{item.quantity}</Text>
                )}

                {charges && !faded && (
                    <View style={styles.chargeTrack}>
                        <View
                            style={[
                                styles.chargeFill,
                                { width: `${(charges.remaining / charges.max) * 100}%` },
                            ]}
                        />
                    </View>
                )}
            </Pressable>
            {/* Beside the tile, not in it, so touches in the modal can't reach
                the tile's own press. */}
            {isInspecting && <ItemDetailModal item={item} onClose={() => setIsInspecting(false)} />}
        </>
    );
}

const styles = StyleSheet.create({
    // Fills its cell's width and is square from that, so every tile in a row
    // is the same size whatever its name — never sized by its content.
    tile: {
        width: "100%",
        aspectRatio: 1,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: 4,
        // Extra room under a name that wraps to two lines.
        paddingBottom: 8,
        borderRadius: 8,
        backgroundColor: colors.surfaceRaised,
        borderColor: colors.border,
        overflow: "hidden",
    },
    qualityRim: {
        position: "absolute",
        top: 3,
        right: 3,
        bottom: 3,
        left: 3,
        borderWidth: 2,
        borderRadius: 6,
    },
    rubyGem: {
        position: "absolute",
        top: 0,
        width: 8,
        height: 8,
        transform: [{ rotate: "45deg" }],
        backgroundColor: colors.tierRuby,
        borderWidth: 1,
        borderColor: "#FFD1DF",
    },
    selectedBadge: {
        position: "absolute",
        top: 3,
        left: 3,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.ember,
    },
    empty: {
        backgroundColor: "transparent",
        borderStyle: "dashed",
    },
    faded: {
        opacity: 0.55,
    },
    pressed: {
        transform: [{ scale: 0.95 }],
        borderColor: colors.ember,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 11,
        lineHeight: 13,
        fontWeight: "600",
        letterSpacing: 0.3,
        textAlign: "center",
    },
    fadedText: {
        color: colors.textSecondary,
        textTransform: "uppercase",
    },
    quantity: {
        position: "absolute",
        top: 3,
        right: 5,
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    chargeTrack: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 3,
        backgroundColor: colors.barTrack,
    },
    chargeFill: {
        height: "100%",
        backgroundColor: colors.ember,
    },
});
