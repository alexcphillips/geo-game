import { useState } from "react";
import {
    ScrollView,
    Text,
    View,
} from "react-native";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import Tabs from "@/components/Tabs/Tabs";
import SearchField from "@/components/SearchField/SearchField";
import Modal from "@/components/Modal/Modal";
import { CARD_SKILLS, type CardSkill } from "@/features/cards/cardSkills";
import ItemEquipAction from "@/features/character/components/ItemEquipAction";
import { useEquipment, useInventory, useTalismanBag } from "@/features/player/usePlayer";
import ItemDetail from "@/features/items/components/ItemDetail";
import ItemTile from "@/features/items/components/ItemTile";
import {
    DEFAULT_INVENTORY_SORT,
    INVENTORY_TABS,
    sortInventory,
    type InventoryItem,
    type InventorySort,
    type InventoryTabId,
} from "@/features/items/inventoryItems";
import { createStyles } from "@/theme/theme";

const GRID_COLUMNS = 4;
const GRID_GAP = 8;
/**
 * Empty slots pad the grid to at least this many squares, so a near-empty tab
 * still reads as an inventory with room in it rather than a blank page.
 */
const MIN_SLOTS = 24;

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
 * Each tab keeps its own sort while the inventory is open; materials share
 * one across their skill sub-tabs.
 *
 * Tapping a tile swaps the content for that item's detail page, in the same
 * modal; back returns to the grid with the tab and search untouched. The
 * detail page has the Equip button. Worn items are ticked in the grid.
 *
 * Cards never show here: they live in the card menu. Talismans show only
 * while they're out of the Talisman Bag.
 */
export default function InventoryModal({ onClose }: InventoryModalProps) {
    const styles = useStyles();
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
    const [sorts, setSorts] = useState<Partial<Record<InventoryTabId, InventorySort>>>({});
    const sort = sorts[tabId] ?? DEFAULT_INVENTORY_SORT;
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
    const tabItems = sortInventory(
        inventory.filter((item) => item.tab === tabId && (!isMaterials || item.skill === materialSkill)),
        sort,
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
                    <Tabs tabs={INVENTORY_TABS} value={tabId} onChange={selectTab} style={styles.tabs} />

                    <View style={styles.tabContent}>
                        {isMaterials && (
                            <Tabs
                                tabs={CARD_SKILLS.map((skill) => ({ id: skill.id, label: skill.label }))}
                                value={materialSkill}
                                onChange={selectMaterialSkill}
                                style={styles.subTabs}
                            />
                        )}

                        <SearchField value={query} onChange={setQuery} placeholder={`Search ${scopeLabel}`} style={styles.search} />

                        <View style={styles.sortRow}>
                            <InventorySortChips
                                sort={sort}
                                onSort={(next) => setSorts((current) => ({ ...current, [tabId]: next }))}
                            />
                        </View>

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

const SORTS: { id: InventorySort["by"]; label: string }[] = [
    { id: "newest", label: "Newest" },
    { id: "rarity", label: "Rarity" },
    { id: "value", label: "Value" },
    { id: "name", label: "Name" },
];

function InventorySortChips({ sort, onSort }: { sort: InventorySort; onSort: (sort: InventorySort) => void }) {
    const direction = sort.descending ? "descending" : "ascending";
    return (
        <ChipRow label="Sort" radio>
            {SORTS.map((mode) => {
                const isOn = mode.id === sort.by;
                // Tapping the active sort flips its direction; another starts
                // descending (newest, rarest, most valuable first), names A–Z.
                const next: InventorySort = isOn
                    ? { by: mode.id, descending: !sort.descending }
                    : { by: mode.id, descending: mode.id !== "name" };
                return (
                    <Chip
                        key={mode.id}
                        label={mode.label}
                        selected={isOn}
                        onPress={() => onSort(next)}
                        direction={isOn ? direction : undefined}
                        accessibilityLabel={isOn ? `${mode.label}, ${direction}` : mode.label}
                        accessibilityHint={isOn ? "Flips the order" : undefined}
                    />
                );
            })}
        </ChipRow>
    );
}

const useStyles = createStyles((p) => ({
    tabs: {
        marginBottom: 12,
    },
    subTabs: {
        flexDirection: "row",
        gap: 4,
        marginHorizontal: GRID_GAP / 2,
    },
    tabContent: {
        flex: 1,
        paddingTop: 12,
        gap: 12,
    },
    search: {
        marginHorizontal: GRID_GAP / 2,
    },
    sortRow: {
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
        color: p.textMuted,
        fontSize: 13,
        fontStyle: "italic",
    },
}));
