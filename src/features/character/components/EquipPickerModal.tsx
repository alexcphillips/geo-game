import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Modal from "@/components/Modal/Modal";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo } from "@/features/inventory/rarity";
import { playerActions } from "@/features/player/playerStore";
import { useEquipment, useInventory } from "@/features/player/usePlayer";
import { colors } from "@/theme/colors";
import type { EquipmentSlot } from "../characterSlots";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;

type EquipPickerModalProps = {
    slot: EquipmentSlot;
    onClose: () => void;
};

/**
 * Everything the player owns that fits one slot. Opens from the slot whether
 * it is empty or full.
 *
 * Tap to equip, which closes the picker; tap what's already in this slot to
 * take it off. Long-press any item for its detail page, in the same modal —
 * back returns to the picker. Items worn in *another* slot (a ring on another
 * finger) are listed too, and equipping one here moves it.
 */
export default function EquipPickerModal({ slot, onClose }: EquipPickerModalProps) {
    const items = useInventory();
    const equipped = useEquipment();
    const [inspected, setInspected] = useState<InventoryItem | null>(null);

    const currentId = equipped[slot.id];
    const fits = items
        .filter((item) => item.equipSlot === slot.accepts)
        .sort(
            (a, b) =>
                rarityInfo(b.rarity).rank - rarityInfo(a.rarity).rank ||
                a.name.localeCompare(b.name),
        );
    const wornElsewhere = (item: InventoryItem) =>
        item.id !== currentId && Object.values(equipped).includes(item.id);

    // Closes once the server has it; a refusal stays open behind its toast.
    const choose = async (item: InventoryItem) => {
        if (await playerActions.equip(slot.id, item.id === currentId ? null : item.id)) onClose();
    };

    return (
        <Modal
            title={inspected ? inspected.name : slot.pickerTitle}
            size={inspected ? "fill" : "medium"}
            showBack
            onBack={inspected ? () => setInspected(null) : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {inspected ? (
                <ItemDetail item={inspected} />
            ) : fits.length === 0 ? (
                <Text style={styles.empty}>Nothing you own fits this slot yet.</Text>
            ) : (
                <View style={styles.body}>
                    <Text style={styles.hint}>
                        Tap to equip{currentId ? " · tap the equipped one to remove it" : ""} · hold
                        for details
                    </Text>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.grid}
                        alwaysBounceHorizontal={false}
                        showsHorizontalScrollIndicator={false}
                    >
                        {fits.map((item) => (
                            <View key={item.id} style={styles.cell}>
                                <ItemTile
                                    item={item}
                                    selected={item.id === currentId}
                                    selectedLabel="equipped"
                                    onPress={choose}
                                    onLongPress={setInspected}
                                />
                                {wornElsewhere(item) && <Text style={styles.elsewhere}>Worn</Text>}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    body: {
        flexShrink: 1,
        gap: 10,
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    elsewhere: {
        marginTop: 3,
        color: colors.textSecondary,
        fontSize: 9,
        fontWeight: "600",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    empty: {
        paddingVertical: 28,
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
    },
});
