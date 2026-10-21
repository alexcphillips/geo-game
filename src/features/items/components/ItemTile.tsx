import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { QUALITY_TIER_COLORS, QUALITY_TIER_LABELS } from "@/features/fishing/fishingText";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme, inked } from "@/theme/theme";
import { isFaded, type InventoryItem } from "../inventoryItems";
import { rarityInfo } from "../rarity";
import { BARE_TILE_ASPECT, NAME_LINES, TILE_ASPECT, TILE_GAP, TILE_PADDING, tileLayout } from "../tileLayout";
import ItemArt from "./ItemArt";
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
    /**
     * False where the screen prints the name beside the tile: the tile goes
     * square and the icon gets the room.
     */
    showName?: boolean;
};

/**
 * One tile in an item grid or row: an item, or an empty slot.
 *
 * Card-shaped via `aspectRatio`, so the grid's column count alone sets the
 * size. The icon and name are sized from the measured width (`tileLayout`):
 * the name gets three lines at the largest size that breaks only between
 * words, and the icon the rest of the height. Where the screen shows the
 * name itself (`showName={false}`) the tile is square and all icon.
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
    showName = true,
}: ItemTileProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [isInspecting, setIsInspecting] = useState(false);
    const [width, setWidth] = useState(0);
    const shape = showName ? undefined : styles.bare;
    if (!item) return <View style={[styles.tile, shape, styles.empty]} />;

    const faded = isFaded(item);
    const charges = item.charges;
    const name = faded ? "FADED" : item.name;
    const layout = width > 0 ? tileLayout(width, showName ? name : null) : null;

    return (
        <>
            <Pressable
                onPress={onPress ? () => onPress(item) : undefined}
                onLongPress={onLongPress ? () => onLongPress(item) : () => setIsInspecting(true)}
                onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
                style={({ pressed }) => [
                    styles.tile,
                    shape,
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
                {/* Drawn once the tile's width is known, since every size here
                    comes from it. */}
                {layout && (
                    <>
                        <View style={styles.iconZone}>
                            <ItemArt
                                item={item}
                                size={layout.iconSize}
                                color={faded ? palette.textMuted : palette.ember}
                            />
                        </View>
                        {showName && (
                            <View style={{ height: layout.nameHeight }}>
                                {/* Sized by tileLayout, so the system text size can't
                                    undo the fit. The name is also in the label and
                                    the details modal, which do scale. */}
                                <Text
                                    style={[
                                        styles.name,
                                        { fontSize: layout.fontSize, lineHeight: layout.lineHeight },
                                        faded && styles.fadedText,
                                    ]}
                                    numberOfLines={NAME_LINES}
                                    maxFontSizeMultiplier={1}
                                >
                                    {name}
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {selected && (
                    <View style={styles.selectedBadge}>
                        <Icon name="check-mark" size={10} color={palette.onPrimary} />
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

const useStyles = createStyles((p) => ({
    // Fills its cell's width and takes its height from that, so every tile
    // in a row is the same size whatever its name — never sized by its content.
    tile: {
        width: "100%",
        aspectRatio: TILE_ASPECT,
        gap: TILE_GAP,
        paddingHorizontal: TILE_PADDING.x,
        paddingTop: TILE_PADDING.top,
        // Clears the charge bar.
        paddingBottom: TILE_PADDING.bottom,
        borderRadius: 14,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
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
        backgroundColor: p.game.tierRuby,
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
        backgroundColor: p.ember,
    },
    bare: {
        aspectRatio: BARE_TILE_ASPECT,
        paddingBottom: TILE_PADDING.top,
    },
    iconZone: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
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
        borderColor: p.ember,
    },
    // Size and line height come from tileLayout. No letter spacing: the
    // layout measures with the font's own widths.
    name: {
        color: p.text,
        fontFamily: FONTS.bodyBold,
        textAlign: "center",
    },
    fadedText: {
        color: p.textMuted,
    },
    quantity: {
        position: "absolute",
        top: 3,
        right: 5,
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    chargeTrack: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 3,
        backgroundColor: p.track,
    },
    chargeFill: {
        height: "100%",
        backgroundColor: p.ember,
    },
}));
