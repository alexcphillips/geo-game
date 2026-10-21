import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePlayerStore } from "@/features/player/playerStore";
import { catalogueItem } from "@/features/player/toInventoryItem";
import type { InventoryItem } from "../inventoryItems";
import { rarityInfo } from "../rarity";
import ItemTile from "./ItemTile";

const TILE_SIZE = 100;
const COMPACT_TILE_SIZE = 76;

/**
 * Items won, as tiles in a centred row that wraps: a fight's loot, or what a
 * chest held. Each tile has its rarity under it; a quantity shows only past 1.
 * Unknown item ids (content removed since) are left out.
 */
export default function RewardGrid({
    items,
    onInspect,
    compact = false,
}: {
    items: { itemId: string; quantity: number }[];
    /** What holding a tile does; omit to show its details in a modal of their own. */
    onInspect?: (item: InventoryItem) => void;
    compact?: boolean;
}) {
    const catalogue = usePlayerStore((state) => state.items);
    const tiles = useMemo(
        () =>
            items.flatMap((drop, index) => {
                const def = catalogue[drop.itemId];
                return def
                    ? [{ ...catalogueItem(def, `reward-${index}`), quantity: drop.quantity > 1 ? drop.quantity : undefined }]
                    : [];
            }),
        [items, catalogue],
    );

    return (
        <View style={[styles.grid, compact && styles.gridCompact]}>
            {tiles.map((tile) => (
                <View key={tile.id} style={[styles.cell, { width: compact ? COMPACT_TILE_SIZE : TILE_SIZE }]}>
                    <ItemTile item={tile} onLongPress={onInspect} />
                    <Text style={[styles.rarity, { color: rarityInfo(tile.rarity).color }]}>
                        {rarityInfo(tile.rarity).label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
        marginTop: 4,
    },
    gridCompact: {
        justifyContent: "flex-start",
        gap: 8,
    },
    // Stretch, not centre: a centred tile would shrink to fit its own name,
    // and the rewards would come out different sizes.
    cell: {
        gap: 6,
    },
    rarity: {
        textAlign: "center",
        fontSize: 11,
        fontWeight: "700",
    },
});
