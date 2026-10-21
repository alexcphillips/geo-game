import { Pressable, Text, View } from "react-native";
import ItemArt from "@/features/items/components/ItemArt";
import type { InventoryItem } from "@/features/items/inventoryItems";
import { rarityInfo } from "@/features/items/rarity";
import { createStyles, useTheme, inked } from "@/theme/theme";
import type { EquipmentSlot as EquipmentSlotModel } from "../characterSlots";

type EquipmentSlotProps = {
    slot: EquipmentSlotModel;
    /** What's in the slot, or omit for empty. */
    item?: InventoryItem;
    /** Opens the picker for this slot. Omit to render the square inert. */
    onPress?: () => void;
    /** Hold a filled slot: opens the worn item's details. Ignored when empty. */
    onLongPress?: (item: InventoryItem) => void;
};

export const SLOT_SIZE = 68;

/** An item's picture inside a slot; the pet slot matches it. */
export const SLOT_ART_SIZE = 48;

/**
 * One equipment square.
 *
 * Empty, it shows the slot's label, so the screen reads as a real equip screen
 * with nothing on. Full, it shows the item's icon inside its rarity colour.
 * Tap to change what's in it; hold a full one to see what's worn.
 */
export default function EquipmentSlot({
    slot,
    item,
    onPress,
    onLongPress,
}: EquipmentSlotProps) {
    const styles = useStyles();
    const palette = useTheme();
    const content = (
        <View
            style={[
                styles.square,
                item && { borderColor: rarityInfo(item.rarity).color },
            ]}
        >
            {item ? (
                <ItemArt item={item} size={SLOT_ART_SIZE} color={palette.ember} />
            ) : (
                <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
                    {slot.label}
                </Text>
            )}
        </View>
    );

    const showDetails =
        item && onLongPress ? () => onLongPress(item) : undefined;
    if (!onPress && !showDetails) return content;

    return (
        <Pressable
            onPress={onPress}
            onLongPress={showDetails}
            accessibilityRole="button"
            accessibilityLabel={`${slot.pickerTitle} slot, ${item ? item.name : "empty"}`}
            accessibilityHint={showDetails ? "Hold for details" : undefined}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
            {content}
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    square: {
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surfaceAlt,
        ...inked(p),
        borderRadius: 14,
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.96 }],
    },
    label: {
        color: p.textMuted,
        fontSize: 10,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
}));
