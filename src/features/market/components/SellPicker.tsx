import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem, InventoryTabId } from "@/features/inventory/inventoryItems";
import { colors } from "@/theme/colors";
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
    // Open on the first tab with something to sell.
    const [tabId, setTabId] = useState<InventoryTabId>(
        () => MARKET_TABS.find((tab) => items.some((item) => item.tab === tab.id))?.id ?? "weapons",
    );
    const shown = items.filter((item) => item.tab === tabId);

    return (
        <>
            <View style={styles.tabs} accessibilityRole="tablist">
                {MARKET_TABS.map((tab) => {
                    const isActive = tab.id === tabId;
                    const hasAny = items.some((item) => item.tab === tab.id);
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => setTabId(tab.id)}
                            style={({ pressed }) => [
                                styles.tab,
                                isActive && styles.tabActive,
                                pressed && styles.tabPressed,
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={tab.label}
                        >
                            <Icon
                                name={tab.icon}
                                size={22}
                                color={
                                    isActive ? colors.emberBright : hasAny ? colors.textSecondary : colors.border
                                }
                            />
                        </Pressable>
                    );
                })}
            </View>

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
                {shown.length === 0 && <Text style={styles.empty}>Nothing here to sell.</Text>}
                <Text style={styles.note}>
                    Worn gear, talismans in your bag, cards in a hand and cards that have been played
                    can&apos;t be sold.
                </Text>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    // Same strip as the Market's.
    tabs: {
        flexDirection: "row",
        gap: 4,
        marginHorizontal: -10,
        marginTop: -8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 9,
        borderRadius: 8,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        backgroundColor: colors.surfaceRaised,
        borderBottomColor: colors.ember,
    },
    tabPressed: {
        transform: [{ scale: 0.94 }],
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
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    empty: {
        width: "100%",
        paddingTop: 24,
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
    },
    note: {
        width: "100%",
        paddingTop: 16,
        paddingHorizontal: GRID_GAP / 2,
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 11,
    },
});
