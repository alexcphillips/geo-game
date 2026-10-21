import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Divider from "@/components/Divider/Divider";
import EmptyState from "@/components/EmptyState/EmptyState";
import Modal from "@/components/Modal/Modal";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { restockNote, useCampStatus } from "@/features/camp/camp";
import ItemDetail from "@/features/items/components/ItemDetail";
import ItemTile from "@/features/items/components/ItemTile";
import type { InventoryItem } from "@/features/items/inventoryItems";
import { usePlayerStore } from "@/features/player/playerStore";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { useInventory } from "@/features/player/usePlayer";
import { createStyles } from "@/theme/theme";
import { packedSlots } from "../lunchbox";
import { PACKS, usePack, type PackKind } from "../packs";
import LunchboxSlots from "./LunchboxSlots";
import PackFoodAction from "./PackFoodAction";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
/** Empty squares pad the food grid to at least this many, like the inventory. */
const MIN_FOOD_SLOTS = 9;

type LunchboxModalProps = {
    /** The lunchbox (food) or bait: the same screen for either. */
    kind?: PackKind;
    onClose: () => void;
};

/**
 * The lunchbox: the food you take into Runs. Its slots sit at the top, then
 * a divider, then the food in your inventory.
 *
 * Tapping any food, packed or not, opens its detail page in the same modal,
 * where Pack fills its slot as far as it goes (up to 10), and Unpack empties
 * it. How much of it to eat is the player's call in the Run. Packed food has left the inventory, so it shows only in its slot.
 * The server refuses repacking mid-Run, and says so as a toast. The lunchbox
 * and bait pack only at camp: a line under the hint says whether you're there.
 * Bait (`kind="bait"`) packs the same way, from the bait in your inventory.
 */
export default function LunchboxModal({ kind = "lunchbox", onClose }: LunchboxModalProps) {
    const styles = useStyles();
    const pack = PACKS[kind];
    const items = usePlayerStore((state) => state.items);
    const inventory = useInventory();
    const lunchbox = usePack(kind);
    const camp = useCampStatus();
    const note = restockNote(camp);
    /** The food whose detail page is open, by item id; null for the lunchbox. */
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const packed = useMemo(() => packedSlots(lunchbox.contents, items, kind), [lunchbox.contents, items, kind]);
    // One tile per food, however many stacks it's split across.
    const food = useMemo(() => {
        const byItem = new Map<string, InventoryItem>();
        for (const item of inventory) {
            if (!pack.holds(items[item.itemId])) continue;
            const seen = byItem.get(item.itemId);
            byItem.set(item.itemId, {
                ...(seen ?? item),
                quantity: (seen?.quantity ?? 0) + (item.quantity ?? 1),
            });
        }
        return [...byItem.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [inventory, items, pack]);

    // Live, so the page stays open as packing moves food between the two.
    const selectedDef = selectedId ? items[selectedId] : undefined;
    const selected: InventoryItem | null = selectedDef
        ? (food.find((item) => item.itemId === selectedId) ?? catalogueItem(selectedDef, selectedDef.id))
        : null;

    const padded = Math.max(MIN_FOOD_SLOTS, Math.ceil(food.length / GRID_COLUMNS) * GRID_COLUMNS);

    return (
        <Modal
            title={pack.title}
            size="fill"
            showBack
            onBack={selected ? () => setSelectedId(null) : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {selected ? (
                <ItemDetail item={selected} action={<PackFoodAction itemId={selected.itemId} kind={kind} />} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.page}
                    alwaysBounceHorizontal={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <Hint>{pack.hint}</Hint>
                    {pack.needsCamp && note && (
                        <Text style={[styles.campNote, camp.canRestock && styles.campNoteAtCamp]}>{note}</Text>
                    )}

                    <View style={styles.inset}>
                        <LunchboxSlots
                            kind={kind}
                            unlocked={lunchbox.slots}
                            packed={packed}
                            onPress={(entry) => setSelectedId(entry.item.itemId)}
                            onLongPress={(entry) => setSelectedId(entry.item.itemId)}
                        />
                    </View>

                    <Divider />

                    <SectionTitle>Your {pack.noun}</SectionTitle>
                    <View style={styles.grid}>
                        {food.map((item) => (
                            <View key={item.itemId} style={styles.cell}>
                                <ItemTile
                                    item={item}
                                    onPress={() => setSelectedId(item.itemId)}
                                    onLongPress={() => setSelectedId(item.itemId)}
                                />
                            </View>
                        ))}
                        {Array.from({ length: padded - food.length }, (_, index) => (
                            <View key={`empty-${index}`} style={styles.cell}>
                                <ItemTile />
                            </View>
                        ))}
                    </View>
                    {food.length === 0 && (
                        <EmptyState title={pack.noneOwned} />
                    )}
                </ScrollView>
            )}
        </Modal>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 12,
        paddingBottom: 8,
    },
    campNote: {
        alignSelf: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
        color: p.textMuted,
        fontSize: 12,
        textAlign: "center",
        overflow: "hidden",
    },
    campNoteAtCamp: {
        borderColor: p.ember,
        color: p.ember,
    },
    // No negative margin to line the grid up with the page: inside a
    // ScrollView that pans it sideways (see InventoryModal). The slots are
    // inset by the cells' padding instead.
    inset: {
        paddingHorizontal: GRID_GAP / 2,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
}));
