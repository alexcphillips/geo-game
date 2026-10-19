import { useState } from "react";
import { router } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuTile from "@/components/MenuTile/MenuTile";
import Modal from "@/components/Modal/Modal";
import ItemEquipAction from "@/features/character/components/ItemEquipAction";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import EquipmentSlot, { SLOT_SIZE } from "@/features/character/components/EquipmentSlot";
import EquipPickerModal from "@/features/character/components/EquipPickerModal";
import CharacterStats from "@/features/character/components/CharacterStats";
import {
    EQUIPMENT_LAYOUT,
    type EquipmentColumn,
    type EquipmentSlot as EquipmentSlotModel,
} from "@/features/character/characterSlots";
import { useEquipment, useInventory } from "@/features/player/usePlayer";
import TalismanBagModal from "@/features/talismans/components/TalismanBagModal";
import PetsModal from "@/features/pets/components/PetsModal";
import PetSlot from "@/features/pets/components/PetSlot";
import WardrobeModal from "@/features/wardrobe/components/WardrobeModal";
import WardrobeStrip from "@/features/wardrobe/components/WardrobeStrip";
import { colors } from "@/theme/colors";
import {
    BOTTOM_ACTION_DIAMETER,
    HOME_INDICATOR_CLEARANCE,
} from "@/theme/layout";

/** Where the pet sits: the right column's bottom cell, under the off hand. */
const PET_CELL = { column: "right" as const, row: 4.5 };

/** One row down the paper doll: a slot plus the gap under it. */
const ROW_STEP = SLOT_SIZE + 12;

/** Centre to centre, body column to a side column. */
const COLUMN_STEP = SLOT_SIZE + 28;

const COLUMN_LEFT: Record<EquipmentColumn, number> = {
    left: 0,
    centre: COLUMN_STEP,
    right: COLUMN_STEP * 2,
};

const DOLL_WIDTH = COLUMN_STEP * 2 + SLOT_SIZE;
const DOLL_HEIGHT = Math.max(PET_CELL.row, ...EQUIPMENT_LAYOUT.map((slot) => slot.row)) * ROW_STEP + SLOT_SIZE;

/** Menu tiles per row. Three keeps labels like "Talisman Bag" on one line. */
const MENU_COLUMNS = 3;
const MENU_GAP = 10;

/** The tabs below the divider. Menu first, and open by default. */
const LOWER_TABS = [
    { id: "menu", label: "Menu" },
    { id: "stats", label: "Stats" },
] as const;

type LowerTabId = (typeof LOWER_TABS)[number]["id"];

/**
 * The character screen.
 *
 * A **route**, not a modal: it is a place with its own identity and needs the
 * whole screen, and decision 10 keeps the modal component capped at `large` for
 * exactly this reason. Being a route also means the hardware back button and
 * navigation history work for free.
 *
 * The gear is a Diablo-style paper doll: the body down the middle, head to
 * feet, with shoulders, hands, rings and weapons on one side and the amulet,
 * cloak, rings and off hand on the other (see `characterSlots`), and the
 * active pet under the off hand: tap it for the roster, hold it for that pet.
 * Above the doll is the wardrobe: saved loadouts, one tap to switch.
 * Below the gear are two tabs. Menu, the default, holds the Talisman Bag.
 * Everything else lives on the world screen's bottom bar, its Actions sheet,
 * or (chests) the Inbox.
 * Close sits bottom-centre, in the same slot as the world screen's Actions
 * button, so the one control that is always there is always in the same place.
 *
 * Tapping a slot, empty or full, opens a picker of everything owned that fits
 * it; holding a full one opens the worn item's details. What's worn is the
 * server's, and counts in fights.
 */
export default function CharacterScreen() {
    const insets = useSafeAreaInsets();
    const [lowerTab, setLowerTab] = useState<LowerTabId>("menu");
    const [isTalismanBagOpen, setIsTalismanBagOpen] = useState(false);
    /** The pets modal: open on the roster, or on one pet (held slot). */
    const [petsModal, setPetsModal] = useState<{ petId?: string } | null>(null);
    /** The wardrobe manager: open, on a slot if one was held. */
    const [wardrobeModal, setWardrobeModal] = useState<{ slot?: number } | null>(null);
    const [pickerSlot, setPickerSlot] = useState<EquipmentSlotModel | null>(null);
    const equipped = useEquipment();
    const inventory = useInventory();
    /** The worn item whose details are open, from holding its slot. */
    const [inspectedId, setInspectedId] = useState<string | null>(null);
    // Looked up live, so the page stays open (showing Equip) after Unequip.
    const inspected = inventory.find((item) => item.id === inspectedId) ?? null;

    const renderSlot = (slot: EquipmentSlotModel) => {
        const itemId = equipped[slot.id];
        return (
            <EquipmentSlot
                key={slot.id}
                slot={slot}
                item={inventory.find((item) => item.id === itemId)}
                onPress={() => setPickerSlot(slot)}
                onLongPress={(item) => setInspectedId(item.id)}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
                <Text style={styles.title}>Character</Text>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        // Clears the floating close button so the last row of
                        // content can always be scrolled out from under it.
                        paddingBottom:
                            insets.bottom +
                            HOME_INDICATOR_CLEARANCE +
                            BOTTOM_ACTION_DIAMETER +
                            28,
                    },
                ]}
            >
                <WardrobeStrip onManage={(slot) => setWardrobeModal({ slot })} />

                <View style={styles.doll}>
                    {EQUIPMENT_LAYOUT.map((slot) => (
                        <View
                            key={slot.id}
                            style={[
                                styles.dollCell,
                                { left: COLUMN_LEFT[slot.column], top: slot.row * ROW_STEP },
                            ]}
                        >
                            {renderSlot(slot)}
                        </View>
                    ))}
                    <View style={[styles.dollCell, { left: COLUMN_LEFT[PET_CELL.column], top: PET_CELL.row * ROW_STEP }]}>
                        <PetSlot onPress={() => setPetsModal({})} onLongPress={(petId) => setPetsModal({ petId })} />
                    </View>
                </View>

                <View style={styles.lower}>
                    <View style={styles.tabs} accessibilityRole="tablist">
                        {LOWER_TABS.map((tab) => {
                            const isActive = tab.id === lowerTab;
                            return (
                                <Pressable
                                    key={tab.id}
                                    onPress={() => setLowerTab(tab.id)}
                                    style={[styles.tab, isActive && styles.tabActive]}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: isActive }}
                                >
                                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {lowerTab === "stats" ? (
                        <CharacterStats />
                    ) : (
                        <View style={styles.menu}>
                            <View style={styles.menuCell}>
                                <MenuTile
                                    label="Talisman Bag"
                                    icon="gem-pendant"
                                    onPress={() => setIsTalismanBagOpen(true)}
                                />
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {pickerSlot && (
                <EquipPickerModal slot={pickerSlot} onClose={() => setPickerSlot(null)} />
            )}

            {inspected && (
                <Modal
                    title={inspected.name}
                    size="fill"
                    showBack
                    closePlacement="footer"
                    onClose={() => setInspectedId(null)}
                >
                    <ItemDetail item={inspected} action={<ItemEquipAction item={inspected} />} />
                </Modal>
            )}

            {isTalismanBagOpen && (
                <TalismanBagModal onClose={() => setIsTalismanBagOpen(false)} />
            )}

            {petsModal && <PetsModal initialPetId={petsModal.petId} onClose={() => setPetsModal(null)} />}

            {wardrobeModal && <WardrobeModal focusSlot={wardrobeModal.slot} onClose={() => setWardrobeModal(null)} />}

            <View
                style={[
                    styles.closeBar,
                    {
                        paddingBottom:
                            insets.bottom + HOME_INDICATOR_CLEARANCE,
                    },
                ]}
                pointerEvents="box-none"
            >
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Return to the world"
                    style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.closeButtonPressed,
                    ]}
                >
                    <Text style={styles.closeIcon}>✕</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },
    header: {
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        color: colors.ember,
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    content: {
        paddingTop: 24,
        paddingHorizontal: 16,
    },
    // Slots are placed by row and column from the layout, so the frame is
    // sized to hold them all and centred on the screen.
    doll: {
        alignSelf: "center",
        width: DOLL_WIDTH,
        height: DOLL_HEIGHT,
    },
    dollCell: {
        position: "absolute",
    },
    // The divider under the gear, then the tabs.
    lower: {
        marginTop: 28,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    tabs: {
        flexDirection: "row",
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        // Overlaps the bar's hairline, so the active underline sits on it.
        marginBottom: -1,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: colors.ember,
    },
    tabLabel: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    tabLabelActive: {
        color: colors.emberBright,
    },
    // Negative margin cancels the cells' outer padding, so the tiles line up
    // with the gear columns' edges.
    menu: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -MENU_GAP / 2,
    },
    menuCell: {
        width: `${100 / MENU_COLUMNS}%`,
        padding: MENU_GAP / 2,
    },
    closeBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
    },
    closeButton: {
        width: BOTTOM_ACTION_DIAMETER,
        height: BOTTOM_ACTION_DIAMETER,
        borderRadius: BOTTOM_ACTION_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    closeButtonPressed: {
        transform: [{ scale: 0.94 }],
        backgroundColor: "rgba(201, 100, 30, 0.25)",
    },
    closeIcon: {
        color: colors.emberBright,
        fontSize: 18,
        lineHeight: 20,
    },
});
