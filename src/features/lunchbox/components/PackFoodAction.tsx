import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCampStatus } from "@/features/camp/camp";
import { playerActions } from "@/features/player/playerStore";
import { useHealth, useInventory } from "@/features/player/usePlayer";
import { colors } from "@/theme/colors";
import { PACKS, usePack, type PackKind } from "../packs";

type PackFoodActionProps = {
    /** The food's (or bait's) item id. */
    itemId: string;
    /** Which slots it packs into. */
    kind?: PackKind;
};

/**
 * Packing on a food's (or bait's) detail page: one button that fills the
 * slot with as much as it holds (the pack's stack size) or all you have,
 * whichever is less.
 * There's no count to pick: how much to eat is decided in the Run.
 *
 * A food goes in the slot that already holds it (so Pack tops it up), else
 * the first empty slot. With every unlocked slot holding something else, it
 * says so instead. Away from camp, lunchbox and bait packing is off (the
 * server refuses it); Unpack still works. Packed food can be eaten here,
 * between fights, anywhere: only its effect on health counts. Not refused at
 * full health, since some foods hurt.
 */
export default function PackFoodAction({ itemId, kind = "lunchbox" }: PackFoodActionProps) {
    const { title, stackSize, pack, unpack, needsCamp } = PACKS[kind];
    const { canRestock } = useCampStatus();
    const isAway = needsCamp && !canRestock;
    const health = useHealth();
    const box = usePack(kind);
    const inventory = useInventory();
    const [isSending, setIsSending] = useState(false);
    const packed = box.contents.find((entry) => entry.itemId === itemId);
    const owned = inventory
        .filter((item) => item.itemId === itemId)
        .reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    const fill = Math.min(stackSize, owned + (packed?.quantity ?? 0));
    const freeSlot = Array.from({ length: box.slots }, (_, slot) => slot).find(
        (slot) => !box.contents.some((entry) => entry.slot === slot),
    );
    const slot = packed?.slot ?? freeSlot;

    const send = async (action: () => Promise<boolean>) => {
        setIsSending(true);
        await action();
        setIsSending(false);
    };

    if (slot === undefined) {
        return <Text style={styles.note}>Every {title.toLowerCase()} slot is full. Unpack one to make room.</Text>;
    }

    // Nothing more to add: the slot is full, or holds all you have.
    const isFull = packed !== undefined && packed.quantity >= fill;
    const label = !packed ? `Pack ${fill}` : isFull ? "Packed" : `Top up to ${fill}`;
    const isPackDisabled = isSending || isFull || isAway;

    return (
        <View style={styles.box}>
            <Text style={styles.label}>
                {packed
                    ? `Slot ${slot + 1} · ${packed.quantity}/${stackSize}`
                    : `Goes in slot ${slot + 1} · up to ${stackSize}`}
            </Text>
            <Pressable
                onPress={() => void send(() => pack(slot, itemId, fill))}
                disabled={isPackDisabled}
                style={({ pressed }) => [
                    styles.button,
                    isPackDisabled && styles.buttonDisabled,
                    pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isPackDisabled }}
            >
                <Text style={styles.buttonText}>{isAway && !isFull ? "Pack at camp" : label}</Text>
            </Pressable>
            {packed && kind === "lunchbox" && (
                <>
                    <Text style={styles.label}>
                        Health {health.current}/{health.max} · eating here only touches health
                    </Text>
                    <Pressable
                        onPress={() => void send(() => playerActions.eatLunchbox(slot))}
                        disabled={isSending}
                        style={({ pressed }) => [styles.button, isSending && styles.buttonDisabled, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSending }}
                    >
                        <Text style={styles.buttonText}>Eat one</Text>
                    </Pressable>
                </>
            )}
            {packed && (
                <Pressable
                    onPress={() => void send(() => unpack(slot))}
                    disabled={isSending}
                    style={({ pressed }) => [styles.button, styles.buttonQuiet, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Text style={[styles.buttonText, styles.buttonTextQuiet]}>Unpack</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        gap: 10,
    },
    label: {
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 12,
    },
    note: {
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    button: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    // Unpack is the quieter action: outlined, not filled.
    buttonQuiet: {
        backgroundColor: "transparent",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    buttonText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    buttonTextQuiet: {
        color: colors.emberBright,
    },
});
