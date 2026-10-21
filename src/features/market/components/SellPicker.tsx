import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState/EmptyState";
import Tabs from "@/components/Tabs/Tabs";
import { Hint } from "@/components/Text/Text";
import ItemTile from "@/features/items/components/ItemTile";
import type { InventoryItem, InventoryTabId } from "@/features/items/inventoryItems";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
import { MARKET_TABS } from "../marketFilters";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;

type SellPickerProps = {
    /** Already narrowed to what can be sold now. */
    items: InventoryItem[];
    onPick: (item: InventoryItem) => void;
};

/**
 * Sell, step one: choose what to sell, under the Market's category tabs.
 * Only sellable things are shown; a line at the bottom says what's missing
 * and why, so a worn sword doesn't just seem lost.
 */
export default function SellPicker({ items, onPick }: SellPickerProps) {
    const styles = useStyles();
    // Open on the first tab with something to sell.
    const [tabId, setTabId] = useState<InventoryTabId>(
        () => MARKET_TABS.find((tab) => items.some((item) => item.tab === tab.id))?.id ?? "weapons",
    );
    const shown = items.filter((item) => item.tab === tabId);

    return (
        <>
            <Tabs
                tabs={MARKET_TABS.map((tab) => ({ ...tab, dim: !items.some((item) => item.tab === tab.id) }))}
                value={tabId}
                onChange={setTabId}
                style={styles.tabs}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.grid}
                alwaysBounceHorizontal={false}
                showsHorizontalScrollIndicator={false}
            >
                <Text style={styles.heading}>Choose an item to sell</Text>
                {shown.map((item) => (
                    <View key={item.id} style={styles.cell}>
                        <ItemTile item={item} onPress={onPick} />
                    </View>
                ))}
                {shown.length === 0 && <EmptyState title="Nothing here to sell." />}
                <Hint>
                    Worn gear, talismans in your bag, cards in a hand and cards that have been played
                    can&apos;t be sold.
                </Hint>
            </ScrollView>
        </>
    );
}

const useStyles = createStyles((p) => ({
    // Same strip as the Market's.
    tabs: {
        marginBottom: 12,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingTop: 12,
        paddingBottom: 8,
    },
    heading: {
        width: "100%",
        paddingHorizontal: GRID_GAP / 2,
        paddingBottom: 6,
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
}));
