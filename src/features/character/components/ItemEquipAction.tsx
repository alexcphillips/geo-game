import { useState } from "react";
import { Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { playerActions } from "@/features/player/playerStore";
import { useEquipment, useInventory, useTalismanBag } from "@/features/player/usePlayer";
import { createStyles } from "@/theme/theme";
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
    const styles = useStyles();
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
        <Panel compact style={styles.chooser}>
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
            <Button label="Cancel" variant="quiet" onPress={() => setChoosingRing(false)} />
        </Panel>
    );
}

function EquipButton({ equipped, onPress }: { equipped: boolean; onPress: () => unknown }) {
    return <Button label={equipped ? "Unequip" : "Equip"} variant={equipped ? "secondary" : "primary"} onPress={() => void onPress()} stretch />;
}

const useStyles = createStyles((p) => ({
    chooser: {
        gap: 10,
        padding: 12,
    },
    chooserTitle: {
        color: p.text,
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
}));
