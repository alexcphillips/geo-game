import { Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/items/components/ItemTile";
import { TILE_ASPECT } from "@/features/items/tileLayout";
import { createStyles, useTheme } from "@/theme/theme";
import type { PackedSlot } from "../lunchbox";
import { PACKS, type PackKind } from "../packs";

type LunchboxSlotsProps = {
    /** Lunchbox or bait: how many slots there are and how much each holds. */
    kind?: PackKind;
    /** Slots unlocked; the rest show a padlock. */
    unlocked: number;
    packed: PackedSlot[];
    onPress?: (slot: PackedSlot) => void;
    onLongPress?: (slot: PackedSlot) => void;
    /** Dims the food and ignores taps, e.g. while it isn't your turn. */
    disabled?: boolean;
};

/**
 * The lunchbox's (or bait's) slots in a row: every slot it can ever have, so the player
 * sees what there is to unlock. Each packed slot shows its food and how many
 * are left out of the most a slot holds.
 */
export default function LunchboxSlots({
    kind = "lunchbox",
    unlocked,
    packed,
    onPress,
    onLongPress,
    disabled = false,
}: LunchboxSlotsProps) {
    const styles = useStyles();
    const palette = useTheme();
    const { title, maxSlots, stackSize } = PACKS[kind];
    return (
        <View style={styles.row}>
            {Array.from({ length: maxSlots }, (_, slot) => {
                const entry = packed.find((candidate) => candidate.slot === slot);
                const isLocked = slot >= unlocked;
                return (
                    <View key={slot} style={styles.cell}>
                        {isLocked ? (
                            <View
                                style={styles.locked}
                                accessible
                                accessibilityLabel={`${title} slot ${slot + 1}, locked`}
                            >
                                <Icon name="padlock" size={20} color={palette.outline} />
                            </View>
                        ) : (
                            <View style={disabled && entry ? styles.dimmed : undefined}>
                                <ItemTile
                                    item={entry?.item}
                                    onPress={entry && onPress && !disabled ? () => onPress(entry) : undefined}
                                    onLongPress={entry && onLongPress ? () => onLongPress(entry) : undefined}
                                />
                            </View>
                        )}
                        <Text style={styles.count}>
                            {isLocked ? "Locked" : entry ? `${entry.quantity}/${stackSize}` : "Empty"}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    row: {
        flexDirection: "row",
        gap: 8,
    },
    cell: {
        flex: 1,
        gap: 4,
        alignItems: "stretch",
    },
    locked: {
        width: "100%",
        aspectRatio: TILE_ASPECT,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: p.outline,
    },
    dimmed: {
        opacity: 0.45,
    },
    count: {
        textAlign: "center",
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
}));
