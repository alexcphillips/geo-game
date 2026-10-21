import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import LunchboxSlots from "@/features/lunchbox/components/LunchboxSlots";
import type { PackedSlot } from "@/features/lunchbox/lunchbox";
import { PACKS, type PackKind } from "@/features/lunchbox/packs";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";

type RunLunchboxProps = {
    /** The lunchbox (food) in combat, or bait in a fishing Run. */
    kind?: PackKind;
    /** What's left in the Run's lunchbox. */
    packed: PackedSlot[];
    /** Slots unlocked, so the rest show locked. */
    unlocked: number;
    /** False while it isn't your turn: food can be looked at, not eaten. */
    canUse: boolean;
    /** Eats (or uses) one from the slot; the sheet has closed by then. */
    onUse: (slot: number) => void;
};

/**
 * The lunchbox in a Run: a card-sized tile at the right end of the hand,
 * showing how much food is left, opening a sheet of the slots. Tap a food to eat it, which takes
 * your turn; hold it for its details. The server decides what eating does,
 * and the battle log shows it. Bait sits in the same place in a fishing Run.
 */
export default function RunLunchbox({ kind = "lunchbox", packed, unlocked, canUse, onUse }: RunLunchboxProps) {
    const styles = useStyles();
    const palette = useTheme();
    const pack = PACKS[kind];
    const [isOpen, setIsOpen] = useState(false);
    const [inspected, setInspected] = useState<InventoryItem | null>(null);
    const left = packed.reduce((sum, entry) => sum + entry.quantity, 0);

    const close = () => {
        setIsOpen(false);
        setInspected(null);
    };

    return (
        <>
            <Pressable
                onPress={() => setIsOpen(true)}
                style={({ pressed }) => [styles.tile, left === 0 && styles.tileEmpty, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${pack.title}, ${left} ${pack.noun} left`}
            >
                <Icon name={pack.icon} size={18} color={left > 0 ? palette.ember : palette.textMuted} />
                <Text style={styles.name}>{pack.tileLabel}</Text>
                <Text style={styles.left}>{left}</Text>
            </Pressable>

            {isOpen && (
                <Modal
                    title={inspected?.name ?? pack.title}
                    size="medium"
                    showBack
                    onBack={inspected ? () => setInspected(null) : undefined}
                    onClose={close}
                >
                    {inspected ? (
                        <ItemDetail item={inspected} />
                    ) : (
                        <View style={styles.sheet}>
                            <Text style={styles.hint}>
                                {left === 0
                                    ? `No ${pack.noun} left.`
                                    : canUse
                                      ? pack.useHint
                                      : pack.waitHint}
                            </Text>
                            <LunchboxSlots
                                kind={kind}
                                unlocked={unlocked}
                                packed={packed}
                                disabled={!canUse}
                                onPress={(entry) => {
                                    close();
                                    onUse(entry.slot);
                                }}
                                onLongPress={(entry) => setInspected(entry.item)}
                            />
                        </View>
                    )}
                </Modal>
            )}
        </>
    );
}

const useStyles = createStyles((p) => ({
    // A short pill on the row above the hand rather than a card-shaped slot,
    // so the cards keep the full width; round and dusk-coloured, it never
    // reads as a card.
    tile: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    tileEmpty: {
        opacity: 0.6,
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
    name: {
        color: p.text,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    left: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    sheet: {
        gap: 14,
        paddingTop: 4,
    },
    hint: {
        textAlign: "center",
        color: p.textMuted,
        fontSize: 12,
    },
}));
