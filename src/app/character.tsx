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
import {
    EQUIPMENT_LAYOUT,
    type EquipmentColumn,
    type EquipmentSlot as EquipmentSlotModel,
} from "@/features/character/characterSlots";
import { useEquipment, useInventory } from "@/features/player/usePlayer";
import LunchboxModal from "@/features/lunchbox/components/LunchboxModal";
import TalismanBagModal from "@/features/talismans/components/TalismanBagModal";
import PetsModal from "@/features/pets/components/PetsModal";
import SkillsModal from "@/features/skills/components/SkillsModal";
import ChestsPage from "@/features/chests/components/ChestsPage";
import { colors } from "@/theme/colors";
import {
    BOTTOM_ACTION_DIAMETER,
    HOME_INDICATOR_CLEARANCE,
} from "@/theme/layout";

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
const DOLL_HEIGHT = Math.max(...EQUIPMENT_LAYOUT.map((slot) => slot.row)) * ROW_STEP + SLOT_SIZE;

/** Menu tiles per row. Three keeps labels like "Talisman Bag" on one line. */
const MENU_COLUMNS = 3;
const MENU_GAP = 10;

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
 * cloak, rings and off hand on the other (see `characterSlots`). Below the gear
 * is a grid of menu tiles — the Talisman Bag, the Lunchbox (what you carry into
 * fights), Bait (what you carry fishing), Skills, Chests waiting to be opened
 * and Pets — which grows downward and scrolls as more systems get a home here. Close sits bottom-centre, in the same slot the world screen
 * puts Inventory, so the one control that is always there is always in the same
 * place.
 *
 * Tapping a slot, empty or full, opens a picker of everything owned that fits
 * it; holding a full one opens the worn item's details. What's worn is the
 * server's, and counts in fights.
 */
export default function CharacterScreen() {
    const insets = useSafeAreaInsets();
    const [isTalismanBagOpen, setIsTalismanBagOpen] = useState(false);
    const [isLunchboxOpen, setIsLunchboxOpen] = useState(false);
    const [isBaitOpen, setIsBaitOpen] = useState(false);
    const [isSeedBagOpen, setIsSeedBagOpen] = useState(false);
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [isChestsOpen, setIsChestsOpen] = useState(false);
    const [isPetsOpen, setIsPetsOpen] = useState(false);
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
                </View>

                <View style={styles.menu}>
                    <View style={styles.menuCell}>
                        <MenuTile
                            label="Talisman Bag"
                            icon="gem-pendant"
                            onPress={() => setIsTalismanBagOpen(true)}
                        />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Lunchbox" icon="knife-fork" onPress={() => setIsLunchboxOpen(true)} />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Bait" icon="fishing-hook" onPress={() => setIsBaitOpen(true)} />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Seed Bag" icon="plant-seed" onPress={() => setIsSeedBagOpen(true)} />
                    </View>
                    <View style={styles.menuCell}>
                        {/* From here the farm is look-and-plan only; work happens at a farming place. */}
                        <MenuTile label="Farm" icon="sprout" onPress={() => router.push("/farm")} />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Skills" icon="upgrade" onPress={() => setIsSkillsOpen(true)} />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Chests" icon="chest" onPress={() => setIsChestsOpen(true)} />
                    </View>
                    <View style={styles.menuCell}>
                        <MenuTile label="Pets" icon="paw-print" onPress={() => setIsPetsOpen(true)} />
                    </View>
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

            {isLunchboxOpen && <LunchboxModal onClose={() => setIsLunchboxOpen(false)} />}

            {isBaitOpen && <LunchboxModal kind="bait" onClose={() => setIsBaitOpen(false)} />}

            {isSeedBagOpen && <LunchboxModal kind="seeds" onClose={() => setIsSeedBagOpen(false)} />}

            {isSkillsOpen && <SkillsModal onClose={() => setIsSkillsOpen(false)} />}

            {isChestsOpen && (
                <Modal title="Chests" size="fill" showBack closePlacement="footer" onClose={() => setIsChestsOpen(false)}>
                    <ChestsPage />
                </Modal>
            )}

            {isPetsOpen && <PetsModal onClose={() => setIsPetsOpen(false)} />}

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
    // Negative margin cancels the cells' outer padding, so the tiles line up
    // with the gear columns' edges.
    menu: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 28,
        marginHorizontal: -MENU_GAP / 2,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
