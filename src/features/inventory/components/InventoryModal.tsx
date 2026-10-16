import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Icon from "@/components/Icon/Icon";
import SearchField from "@/components/SearchField/SearchField";
import Modal from "@/components/Modal/Modal";
import { CARD_SKILLS, type CardSkill } from "@/features/cards/cardSkills";
import ItemEquipAction from "@/features/character/components/ItemEquipAction";
import { useEquipment, useInventory, useTalismanBag } from "@/features/player/usePlayer";
import ItemDetail from "./ItemDetail";
import ItemTile from "./ItemTile";
import { INVENTORY_TABS, qualityFirst, type InventoryItem, type InventoryTabId } from "../inventoryItems";
import { colors } from "@/theme/colors";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
/**
 * Empty slots pad the grid to at least this many squares, so a near-empty tab
 * still reads as an inventory with room in it rather than a blank page.
 */
const MIN_SLOTS = 21;

type InventoryModalProps = {
    onClose: () => void;
};

/**
 * The inventory: icon tabs along the top, each holding a searchable grid.
 *
 * Search belongs to the tab — it sits inside the tab's content and filters
 * only that tab — and it clears on switching, so a query never silently hides
 * items on the next tab.
 *
 * Materials have a second row of skill sub-tabs (the same skills as the
 * deck), since gathering produces far more kinds of material than any other
 * tab holds. Search covers the current sub-tab, like everywhere else.
 *
 * Tapping a tile swaps the content for that item's detail page, in the same
 * modal; back returns to the grid with the tab and search untouched. The
 * detail page has the Equip button. Worn items are ticked in the grid.
 *
 * Cards never show here: they live in the card menu. Talismans show only
 * while they're out of the Talisman Bag.
 */
export default function InventoryModal({ onClose }: InventoryModalProps) {
    const items = useInventory();
    const equipped = useEquipment();
    const bagIds = useTalismanBag().inventoryIds;
    const inventory = items.filter(
        (item) => item.tab !== "cards" && item.tab !== "pets" && !(item.equipSlot === "talisman" && bagIds.includes(item.id)),
    );
    const isWorn = (item: InventoryItem) => Object.values(equipped).includes(item.id);
    const [tabId, setTabId] = useState<InventoryTabId>("weapons");
    const [query, setQuery] = useState("");
    const [materialSkill, setMaterialSkill] = useState<CardSkill>("combat");
    /** The item whose detail page is open, or null for the grid. */
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Looked up among everything owned, so the page stays open when equipping
    // a talisman moves it into the bag.
    const selected = items.find((item) => item.id === selectedId) ?? null;

    const tab = INVENTORY_TABS.find((candidate) => candidate.id === tabId);
    const isMaterials = tabId === "materials";
    const scopeLabel = isMaterials
        ? `${CARD_SKILLS.find((skill) => skill.id === materialSkill)?.label.toLowerCase()} materials`
        : (tab?.label.toLowerCase() ?? "");
    const needle = query.trim().toLowerCase();
    const tabItems = qualityFirst(
        inventory.filter((item) => item.tab === tabId && (!isMaterials || item.skill === materialSkill)),
    );
    const shown = needle
        ? tabItems.filter((item) => item.name.toLowerCase().includes(needle))
        : tabItems;

    // Pad with empty slots only when browsing — up to the minimum, then on to
    // the end of the last row. A search shows just its hits.
    const padded = Math.max(MIN_SLOTS, Math.ceil(shown.length / GRID_COLUMNS) * GRID_COLUMNS);
    const emptySlots = needle ? 0 : padded - shown.length;

    const selectTab = (id: InventoryTabId) => {
        setTabId(id);
        setQuery("");
    };

    const selectMaterialSkill = (skill: CardSkill) => {
        setMaterialSkill(skill);
        setQuery("");
    };

    return (
        <Modal
            title="Inventory"
            size="fill"
            showBack
            onBack={selected ? () => setSelectedId(null) : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {selected ? (
                <ItemDetail
                    item={selected}
                    action={<ItemEquipAction item={selected} />}
                />
            ) : (
                <>
                    <View style={styles.tabs} accessibilityRole="tablist">
                        {INVENTORY_TABS.map((candidate) => {
                            const isActive = candidate.id === tabId;
                            return (
                                <Pressable
                                    key={candidate.id}
                                    onPress={() => selectTab(candidate.id)}
                                    style={({ pressed }) => [
                                        styles.tab,
                                        isActive && styles.tabActive,
                                        pressed && styles.tabPressed,
                                    ]}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: isActive }}
                                    accessibilityLabel={candidate.label}
                                >
                                    <Icon
                                        name={candidate.icon}
                                        size={22}
                                        color={isActive ? colors.emberBright : colors.textSecondary}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>

                    <View style={styles.tabContent}>
                        {isMaterials && (
                            <View style={styles.subTabs} accessibilityRole="tablist">
                                {CARD_SKILLS.map((skill) => {
                                    const isActive = skill.id === materialSkill;
                                    return (
                                        <Pressable
                                            key={skill.id}
                                            onPress={() => selectMaterialSkill(skill.id)}
                                            style={({ pressed }) => [
                                                styles.subTab,
                                                isActive && {
                                                    borderColor: skill.color,
                                                    backgroundColor: colors.surfaceRaised,
                                                },
                                                pressed && styles.tabPressed,
                                            ]}
                                            accessibilityRole="tab"
                                            accessibilityState={{ selected: isActive }}
                                            accessibilityLabel={`${skill.label} materials`}
                                        >
                                            <Icon
                                                name={skill.icon}
                                                size={16}
                                                color={isActive ? skill.color : colors.textSecondary}
                                            />
                                            <Text
                                                style={[
                                                    styles.subTabLabel,
                                                    isActive && styles.subTabLabelActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {skill.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}

                        <SearchField value={query} onChange={setQuery} placeholder={`Search ${scopeLabel}`} style={styles.search} />

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.grid}
                            // Vertical only. The grid is exactly the view's width, and
                            // these stop iOS rubber-banding it sideways regardless.
                            alwaysBounceHorizontal={false}
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {shown.map((item) => (
                                <View key={item.id} style={styles.cell}>
                                    <ItemTile
                                        item={item}
                                        onPress={(tapped) => setSelectedId(tapped.id)}
                                        onLongPress={(held) => setSelectedId(held.id)}
                                        selected={isWorn(item)}
                                        selectedLabel="equipped"
                                    />
                                </View>
                            ))}
                            {Array.from({ length: emptySlots }, (_, index) => (
                                <View key={`empty-${index}`} style={styles.cell}>
                                    <ItemTile />
                                </View>
                            ))}

                            {needle !== "" && shown.length === 0 && (
                                <Text style={styles.noResults}>
                                    No {scopeLabel} match “{query.trim()}”.
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                </>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    tabs: {
        flexDirection: "row",
        gap: 4,
        // Pull the tab strip out to the panel edges so it reads as the top of
        // the content area rather than a row floating inside it.
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
    subTabs: {
        flexDirection: "row",
        gap: 4,
        marginHorizontal: GRID_GAP / 2,
    },
    subTab: {
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    subTabLabel: {
        color: colors.textSecondary,
        fontSize: 9,
        fontWeight: "600",
    },
    subTabLabelActive: {
        color: colors.textPrimary,
    },
    tabContent: {
        flex: 1,
        paddingTop: 12,
        gap: 12,
    },
    search: {
        marginHorizontal: GRID_GAP / 2,
    },
    // No negative margin to line the grid up with the search bar: inside a
    // ScrollView that makes the content wider than the view (so it pans
    // sideways) and tucks the first row under the top edge (so it clips).
    // The search bar is inset by the cells' padding instead.
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingTop: 4,
        paddingBottom: 8,
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    noResults: {
        width: "100%",
        paddingTop: 24,
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
    },
});
