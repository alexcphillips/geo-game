import { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import SearchField from "@/components/SearchField/SearchField";
import Modal from "@/components/Modal/Modal";
import ItemEquipAction from "@/features/character/components/ItemEquipAction";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import ItemTile from "@/features/inventory/components/ItemTile";
import { RARITIES, rarityInfo, type Rarity } from "@/features/inventory/rarity";
import { useInventory, useTalismanBag } from "@/features/player/usePlayer";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { magicPowerOf, TALISMAN_BAG_COLUMNS, TALISMAN_BAG_PAGE_SIZE } from "../talismans";

const GRID_GAP = 6;

type TalismanBagModalProps = {
    onClose: () => void;
};

/**
 * The Talisman Bag: the talismans that are active, one copy of each. Shows
 * every page owned; more pages are bought from a vendor.
 *
 * Paged rather than scrolled — a bag is meant to fill up, and pages keep a
 * place ("my epics are on page 3") the way a long scroll doesn't. Every page
 * is a fixed 5 × 5, because pages are bought: tiles shrink on a short screen
 * rather than a page holding fewer. Rarest first, then by name.
 *
 * Search and the rarity filter combine, and either one sends you back to the
 * first page. Tapping a talisman opens its detail page in the same modal,
 * where Unequip sends it back to the inventory; back returns to the same
 * page, filter and search.
 */
export default function TalismanBagModal({ onClose }: TalismanBagModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    const inventory = useInventory();
    const { inventoryIds: bagIds, pages } = useTalismanBag();
    // Every talisman owned, in the bag or not.
    const talismans = inventory.filter((item) => item.equipSlot === "talisman");
    const bag = talismans.filter((talisman) => bagIds.includes(talisman.id));
    const capacity = pages * TALISMAN_BAG_PAGE_SIZE;
    const [query, setQuery] = useState("");
    const [rarity, setRarity] = useState<Rarity | null>(null);
    const [page, setPage] = useState(0);
    const [cellSize, setCellSize] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Looked up among everything owned, so the page stays open after Unequip.
    const selected = talismans.find((talisman) => talisman.id === selectedId) ?? null;

    const needle = query.trim().toLowerCase();
    const shown = bag
        .filter(
            (talisman) =>
                (rarity === null || talisman.rarity === rarity) &&
                (!needle || talisman.name.toLowerCase().includes(needle)),
        )
        .sort(
            (a, b) =>
                rarityInfo(b.rarity).rank - rarityInfo(a.rarity).rank ||
                a.name.localeCompare(b.name),
        );

    const pageSize = TALISMAN_BAG_PAGE_SIZE;
    // Browsing shows every page owned, empty or not. A filter shows only the
    // pages its hits fill.
    const isFiltered = needle !== "" || rarity !== null;
    const pageCount = isFiltered
        ? Math.max(1, Math.ceil(shown.length / pageSize))
        : Math.max(1, pages);
    // Clamped rather than reset, so a rotation or a smaller filter result
    // never strands you on a page past the end.
    const currentPage = Math.min(page, pageCount - 1);
    const onPage = shown.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    // Browsing fills the page out with empty slots, so the bag reads as a bag
    // with room in it. A filter or search shows only its hits.
    const emptySlots = isFiltered ? 0 : pageSize - onPage.length;

    // Square cells as big as fit: full width, unless five rows wouldn't fit
    // the height, then smaller and centred.
    const measureGrid = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        const size = Math.floor(Math.min(width, height) / TALISMAN_BAG_COLUMNS);
        if (size !== cellSize) setCellSize(size);
    };

    const search = (text: string) => {
        setQuery(text);
        setPage(0);
    };

    const filterRarity = (next: Rarity | null) => {
        setRarity(next);
        setPage(0);
    };

    return (
        <Modal
            title="Talisman Bag"
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
                <View style={styles.body}>
                    <View style={styles.summary}>
                        <Text style={styles.summaryText}>
                            {bag.length} / {capacity} talismans
                        </Text>
                        <Text style={styles.magicPower}>Magic Power {magicPowerOf(bag)}</Text>
                    </View>

                    <SearchField value={query} onChange={search} placeholder="Search talismans" />

                    <View style={styles.rarities} accessibilityRole="tablist">
                        <RarityChip
                            label="All"
                            color={palette.text}
                            active={rarity === null}
                            onPress={() => filterRarity(null)}
                        />
                        {RARITIES.map((info) => (
                            <RarityChip
                                key={info.id}
                                label={info.label}
                                color={info.color}
                                active={rarity === info.id}
                                // Tapping the active rarity again clears it.
                                onPress={() => filterRarity(rarity === info.id ? null : info.id)}
                            />
                        ))}
                    </View>

                    <View style={styles.gridArea} onLayout={measureGrid}>
                        <View
                            style={[
                                styles.grid,
                                cellSize > 0 && {
                                    width: cellSize * TALISMAN_BAG_COLUMNS,
                                },
                            ]}
                        >
                            {onPage.map((talisman) => (
                                <View
                                    key={talisman.id}
                                    style={[styles.cell, cellSize > 0 && { width: cellSize }]}
                                >
                                    <ItemTile
                                        item={talisman}
                                        compact
                                        onPress={(tapped) => setSelectedId(tapped.id)}
                                        onLongPress={(held) => setSelectedId(held.id)}
                                    />
                                </View>
                            ))}
                            {Array.from({ length: emptySlots }, (_, index) => (
                                <View
                                    key={`empty-${index}`}
                                    style={[styles.cell, cellSize > 0 && { width: cellSize }]}
                                >
                                    <ItemTile />
                                </View>
                            ))}
                        </View>

                        {isFiltered && shown.length === 0 && (
                            <Text style={styles.noResults}>No talismans match.</Text>
                        )}
                    </View>

                    <View style={styles.pager}>
                        <PageButton
                            direction="previous"
                            disabled={currentPage === 0}
                            onPress={() => setPage(currentPage - 1)}
                        />
                        <Text style={styles.pageLabel} accessibilityLiveRegion="polite">
                            Page {currentPage + 1} of {pageCount}
                        </Text>
                        <PageButton
                            direction="next"
                            disabled={currentPage >= pageCount - 1}
                            onPress={() => setPage(currentPage + 1)}
                        />
                    </View>
                </View>
            )}
        </Modal>
    );
}

function RarityChip({
    label,
    color,
    active,
    onPress,
}: {
    label: string;
    color: string;
    active: boolean;
    onPress: () => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.chip,
                active && {
                    borderColor: color,
                    backgroundColor: palette.surfaceAlt,
                },
                pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} talismans`}
        >
            <Text
                style={[styles.chipLabel, { color: active ? color : palette.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function PageButton({
    direction,
    disabled,
    onPress,
}: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
}) {
    const styles = useStyles();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.pageButton,
                disabled && styles.pageButtonDisabled,
                pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={direction === "previous" ? "Previous page" : "Next page"}
            accessibilityState={{ disabled }}
            hitSlop={8}
        >
            <Text style={styles.pageButtonIcon}>{direction === "previous" ? "‹" : "›"}</Text>
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    body: {
        flex: 1,
        gap: 10,
    },
    summary: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginTop: -4,
    },
    summaryText: {
        color: p.textMuted,
        fontSize: 12,
    },
    magicPower: {
        color: p.game.effect,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    rarities: {
        flexDirection: "row",
        gap: 4,
    },
    chip: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 7,
        paddingHorizontal: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: p.outline,
    },
    chipLabel: {
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
    },
    pressed: {
        transform: [{ scale: 0.94 }],
    },
    // Measured to size the cells so all five rows fit. The cells' padding makes
    // the gaps, and the negative margin lines the outer tiles up with the
    // search bar's edges — safe here because this isn't a ScrollView.
    gridArea: {
        flex: 1,
        marginHorizontal: -GRID_GAP / 2,
        overflow: "hidden",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignSelf: "center",
    },
    cell: {
        width: `${100 / TALISMAN_BAG_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    noResults: {
        paddingTop: 24,
        textAlign: "center",
        color: p.textMuted,
        fontSize: 13,
        fontStyle: "italic",
    },
    pager: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
    },
    pageButton: {
        width: 40,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: p.ember,
        backgroundColor: p.surfaceAlt,
    },
    pageButtonDisabled: {
        borderColor: p.outline,
        opacity: 0.4,
    },
    pageButtonIcon: {
        color: p.ember,
        fontSize: 22,
        lineHeight: 24,
        fontFamily: FONTS.bodyBold,
    },
    pageLabel: {
        minWidth: 92,
        textAlign: "center",
        color: p.text,
        fontSize: 13,
        fontVariant: ["tabular-nums"],
    },
}));
