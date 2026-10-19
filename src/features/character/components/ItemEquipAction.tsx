import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { playerActions } from "@/features/player/playerStore";
import { useEquipment, useInventory, useTalismanBag } from "@/features/player/usePlayer";
import { colors } from "@/theme/colors";
import { RING_SLOTS, type EquipmentSlotId } from "../characterSlots";

type ItemEquipActionProps = {
    item: InventoryItem;
};

/**
 * The Equip / Unequip button on an item's detail page.
 *
 * - Weapons and armor go in their slot; whatever was there goes back to the
 *   inventory.
 * - Rings go in the first empty ring slot. With both full, it asks which
 *   ring to replace, in place.
 * - Talismans go in the Talisman Bag, unless it's full or holds a copy: the
 *   server refuses, and its reason shows as a toast.
 *
 * Anything worn, or in the bag, shows Unequip, which sends it back to the
 * inventory. Items that can't be equipped (materials, consumables) show
 * nothing.
 */
export default function ItemEquipAction({ item }: ItemEquipActionProps) {
    const inventory = useInventory();
    const equipped = useEquipment();
    const bag = useTalismanBag();
    const [choosingRing, setChoosingRing] = useState(false);

    const equip = (slot: EquipmentSlotId, inventoryId: string) => playerActions.equip(slot, inventoryId);
    const unequip = (slot: EquipmentSlotId) => playerActions.equip(slot, null);

    const kind = item.equipSlot;
    if (!kind) return null;

    if (kind === "talisman") {
        const inBag = bag.inventoryIds.includes(item.id);
        const toggle = () =>
            inBag ? playerActions.removeFromTalismanBag(item.id) : playerActions.addToTalismanBag(item.id);
        return <EquipButton equipped={inBag} onPress={toggle} />;
    }

    const wornIn = (Object.keys(equipped) as EquipmentSlotId[]).find((slot) => equipped[slot] === item.id);
    if (wornIn) return <EquipButton equipped onPress={() => unequip(wornIn)} />;

    if (kind !== "ring") return <EquipButton equipped={false} onPress={() => equip(kind, item.id)} />;

    const emptyRing = RING_SLOTS.find((slot) => !equipped[slot.id]);
    if (emptyRing || !choosingRing) {
        return (
            <EquipButton
                equipped={false}
                onPress={() => (emptyRing ? equip(emptyRing.id, item.id) : setChoosingRing(true))}
            />
        );
    }

    return (
        <View style={styles.chooser}>
            <Text style={styles.chooserTitle}>Both ring slots are full. Replace which ring?</Text>
            <View style={styles.rings}>
                {RING_SLOTS.map((slot) => {
                    const worn = inventory.find((candidate) => candidate.id === equipped[slot.id]);
                    return (
                        <View key={slot.id} style={styles.ring}>
                            <ItemTile
                                item={worn}
                                compact
                                onPress={() => {
                                    equip(slot.id, item.id);
                                    setChoosingRing(false);
                                }}
                            />
                        </View>
                    );
                })}
            </View>
            <Pressable
                onPress={() => setChoosingRing(false)}
                style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
                accessibilityRole="button"
                hitSlop={8}
            >
                <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
        </View>
    );
}

function EquipButton({ equipped, onPress }: { equipped: boolean; onPress: () => unknown }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                equipped && styles.buttonEquipped,
                pressed && styles.pressed,
            ]}
            accessibilityRole="button"
        >
            <Text style={[styles.buttonText, equipped && styles.buttonTextEquipped]}>
                {equipped ? "Unequip" : "Equip"}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    // Unequip is the quieter action: outlined, not filled.
    buttonEquipped: {
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
    buttonTextEquipped: {
        color: colors.emberBright,
    },
    chooser: {
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chooserTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    rings: {
        flexDirection: "row",
        gap: 8,
    },
    ring: {
        flex: 1,
    },
    cancel: {
        alignSelf: "center",
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    cancelText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
});
