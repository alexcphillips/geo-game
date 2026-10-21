import { useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import SearchField from "@/components/SearchField/SearchField";
import Modal from "@/components/Modal/Modal";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { CARD_SKILLS, HAND_SIZE, type CardSkill } from "@/features/cards/cardSkills";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import ItemTile from "@/features/inventory/components/ItemTile";
import { isFaded, type InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo } from "@/features/inventory/rarity";
import { playerActions, usePlayerStore } from "@/features/player/playerStore";
import { useHands, useInventory, useSavedHands } from "@/features/player/usePlayer";
import type { GeoSavedHand } from "@/lib/geo/contracts";
import { checkAddToHand, type HandRejection } from "../handRules";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type SortMode = "rarity" | "charges" | "newest" | "name";

const SORT_MODES: { id: SortMode; label: string }[] = [
    { id: "rarity", label: "Rarity" },
    { id: "charges", label: "Charges" },
    { id: "newest", label: "Newest" },
    { id: "name", label: "Name" },
];

/**
 * Highest rarity, most charges and newest first; names A–Z. Faded cards always
 * sink to the end whatever the sort — they can never be played, so they
 * shouldn't sit between the cards you're choosing from.
 */
function sortCards(cards: InventoryItem[], mode: SortMode): InventoryItem[] {
    const compare = (a: InventoryItem, b: InventoryItem): number => {
        switch (mode) {
            case "rarity":
                return rarityInfo(b.rarity).rank - rarityInfo(a.rarity).rank;
            case "charges":
                return (b.charges?.remaining ?? 0) - (a.charges?.remaining ?? 0);
            case "newest":
                return b.obtainedAt.localeCompare(a.obtainedAt);
            case "name":
                return a.name.localeCompare(b.name);
        }
    };

    return [...cards].sort(
        (a, b) =>
            Number(isFaded(a)) - Number(isFaded(b)) ||
            compare(a, b) ||
            a.name.localeCompare(b.name),
    );
}

const REJECTION_MESSAGES: Record<HandRejection, string> = {
    "wrong-skill": "That card belongs to a different skill.",
    faded: "Faded cards can't be played.",
    duplicate: "That card is already in your hand.",
    full: `Your hand is full — ${HAND_SIZE} cards max.`,
};

const GRID_COLUMNS = 3;
const GRID_GAP = 8;

type DeckModalProps = {
    onClose: () => void;
};

/**
 * Hand building, one skill at a time.
 *
 * Top: the skill's current hand (tap a card to take it out) and its saved
 * hands (tap to load). Below: every card for that skill, searchable and
 * sortable — tap to add or remove, long-press for the card's details.
 *
 * Every change is saved to the server, which re-checks the hand rules.
 */
export default function DeckModal({ onClose }: DeckModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    const items = useInventory();
    const [skill, setSkill] = useState<CardSkill>("combat");
    const [query, setQuery] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("rarity");
    const [message, setMessage] = useState<string | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);

    const hand = useHands()[skill] ?? [];
    const saved = useSavedHands().filter((preset) => preset.skill === skill);

    const detail = items.find((item) => item.id === detailId) ?? null;
    const byId = (id: string) => items.find((item) => item.id === id);

    // Cards that have since faded or gone may still be listed in the hand,
    // but are never shown in it; the slot simply reads as empty.
    const handCards = hand
        .map(byId)
        .filter((card): card is InventoryItem => card !== undefined && !isFaded(card));

    const needle = query.trim().toLowerCase();
    const skillCards = sortCards(
        items.filter(
            (item) =>
                item.tab === "cards" &&
                item.skill === skill &&
                (!needle || item.name.toLowerCase().includes(needle)),
        ),
        sortMode,
    );

    const selectSkill = (next: CardSkill) => {
        setSkill(next);
        setQuery("");
        setMessage(null);
    };

    const setHand = (inventoryIds: string[]) => {
        setMessage(null);
        void playerActions.setHand(skill, inventoryIds);
    };

    const toggleCard = (card: InventoryItem) => {
        // Built from the cards shown, so one that faded in a fight is dropped
        // rather than sent back for the server to refuse.
        if (hand.includes(card.id)) {
            setHand(handCards.filter((handCard) => handCard.id !== card.id).map((handCard) => handCard.id));
            return;
        }

        const rejection = checkAddToHand(
            skill,
            handCards.map((handCard) => handCard.id),
            card,
            items,
        );
        if (rejection) {
            setMessage(REJECTION_MESSAGES[rejection]);
            return;
        }

        setHand([...handCards.map((handCard) => handCard.id), card.id]);
    };

    /** Saves the hand as "Hand N", the next number free for this skill. */
    const saveHand = () => {
        const names = new Set(saved.map((preset) => preset.name));
        let n = saved.length + 1;
        while (names.has(`Hand ${n}`)) n += 1;
        void playerActions.saveHand(skill, `Hand ${n}`);
    };

    /** Loads a preset; the server drops cards that have since faded or gone. */
    const loadPreset = async (preset: GeoSavedHand) => {
        setMessage(null);
        if (!(await playerActions.loadSavedHand(preset.id))) return;
        const loaded = usePlayerStore.getState().me?.hands[skill] ?? [];
        if (loaded.length < preset.inventoryIds.length) {
            setMessage("Some cards in that hand have faded or are gone.");
        }
    };

    if (detail) {
        return (
            <Modal
                title="Deck"
                size="fill"
                showBack
                onBack={() => setDetailId(null)}
                closePlacement="footer"
                onClose={onClose}
            >
                <ItemDetail item={detail} />
            </Modal>
        );
    }

    return (
        <Modal title="Deck" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <View style={styles.skills} accessibilityRole="tablist">
                {CARD_SKILLS.map((info) => {
                    const isActive = info.id === skill;
                    return (
                        <Pressable
                            key={info.id}
                            onPress={() => selectSkill(info.id)}
                            style={({ pressed }) => [
                                styles.skill,
                                isActive && { backgroundColor: palette.surfaceAlt, borderBottomColor: info.color },
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={info.label}
                        >
                            <Icon
                                name={info.icon}
                                size={20}
                                color={isActive ? info.color : palette.textMuted}
                            />
                            <Text
                                style={[styles.skillLabel, isActive && styles.skillLabelActive]}
                                numberOfLines={1}
                            >
                                {info.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* --- current hand --- */}
            <View style={styles.sectionHeader}>
                <SectionTitle>
                    Hand · {handCards.length}/{HAND_SIZE}
                </SectionTitle>
                <View style={styles.headerActions}>
                    <TextButton
                        label="Clear"
                        disabled={handCards.length === 0}
                        onPress={() => setHand([])}
                    />
                    <TextButton
                        label="Save Hand"
                        disabled={handCards.length === 0}
                        onPress={saveHand}
                    />
                </View>
            </View>

            <View style={styles.hand}>
                {Array.from({ length: HAND_SIZE }, (_, index) => {
                    const card = handCards[index];
                    return (
                        <View key={card?.id ?? `slot-${index}`} style={styles.handSlot}>
                            <ItemTile
                                item={card}
                                onPress={(tapped) => toggleCard(tapped)}
                                onLongPress={(pressed) => setDetailId(pressed.id)}
                            />
                        </View>
                    );
                })}
            </View>

            {message && <Text style={styles.message}>{message}</Text>}

            {/* --- saved hands --- */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.saved}
                style={styles.savedScroll}
            >
                {saved.length === 0 ? (
                    <Hint>Saved hands appear here.</Hint>
                ) : (
                    saved.map((preset) => (
                        <Panel key={preset.id} style={styles.preset}>
                            <Pressable
                                onPress={() => loadPreset(preset)}
                                style={({ pressed }) => [styles.presetLoad, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Load ${preset.name}`}
                            >
                                <Text style={styles.presetName}>{preset.name}</Text>
                                <Text style={styles.presetCount}>{preset.inventoryIds.length}</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => playerActions.deleteSavedHand(preset.id)}
                                hitSlop={8}
                                style={styles.presetDelete}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${preset.name}`}
                            >
                                <Text style={styles.presetDeleteIcon}>✕</Text>
                            </Pressable>
                        </Panel>
                    ))
                )}
            </ScrollView>

            {/* --- card collection --- */}
            <View style={styles.collection}>
                <SearchField value={query} onChange={setQuery} placeholder="Search cards" style={styles.search} />

                <View style={styles.sorts}>
                    <Text style={styles.sortLabel}>Sort</Text>
                    {SORT_MODES.map((mode) => {
                        const isActive = mode.id === sortMode;
                        return (
                            <Pressable
                                key={mode.id}
                                onPress={() => setSortMode(mode.id)}
                                style={[styles.sortChip, isActive && styles.sortChipActive]}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Text style={[styles.sortText, isActive && styles.sortTextActive]}>
                                    {mode.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.grid}
                    alwaysBounceHorizontal={false}
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {skillCards.map((card) => (
                        <View key={card.id} style={styles.cell}>
                            <ItemTile
                                item={card}
                                selected={hand.includes(card.id)}
                                onPress={toggleCard}
                                onLongPress={(pressed) => setDetailId(pressed.id)}
                            />
                        </View>
                    ))}
                    {skillCards.length === 0 && (
                        <Hint center>
                            {needle
                                ? `No cards match “${query.trim()}”.`
                                : "No cards for this skill yet."}
                        </Hint>
                    )}
                </ScrollView>
                <Hint>Tap to add or remove · hold for details</Hint>
            </View>
        </Modal>
    );
}

function TextButton({
    label,
    onPress,
    disabled,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    const styles = useStyles();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={8}
            style={[styles.textButtonBox, disabled && styles.textButtonBoxDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            {({ pressed }) => (
                <Text
                    style={[
                        styles.textButton,
                        disabled && styles.textButtonDisabled,
                        pressed && styles.textButtonPressed,
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    skills: {
        flexDirection: "row",
        gap: 4,
        marginHorizontal: -10,
        marginTop: -8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: p.outline,
    },
    skill: {
        flex: 1,
        alignItems: "center",
        gap: 3,
        paddingVertical: 7,
        borderRadius: 8,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    skillLabel: {
        color: p.textMuted,
        fontSize: 9,
        fontFamily: FONTS.bodyBold,
        letterSpacing: 0.3,
    },
    skillLabelActive: {
        color: p.text,
    },
    pressed: {
        transform: [{ scale: 0.95 }],
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        marginBottom: 8,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    textButtonBox: {
        borderWidth: 1,
        borderColor: p.ember,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    textButtonBoxDisabled: {
        borderColor: p.outline,
    },
    textButton: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    textButtonDisabled: {
        color: p.textMuted,
        opacity: 0.5,
    },
    textButtonPressed: {
        opacity: 0.6,
    },
    hand: {
        flexDirection: "row",
        gap: 6,
    },
    handSlot: {
        flex: 1,
    },
    message: {
        marginTop: 8,
        color: p.game.effect,
        fontSize: 12,
        textAlign: "center",
    },
    savedScroll: {
        flexGrow: 0,
        marginTop: 10,
    },
    saved: {
        gap: 8,
        alignItems: "center",
        minHeight: 34,
    },
    // A pill-shaped bar, not a card.
    preset: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        padding: 0,
        borderRadius: 999,
    },
    presetLoad: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 7,
    },
    presetName: {
        color: p.text,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    presetCount: {
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    presetDelete: {
        paddingLeft: 4,
        paddingRight: 10,
        paddingVertical: 7,
    },
    presetDeleteIcon: {
        color: p.textMuted,
        fontSize: 11,
    },
    collection: {
        flex: 1,
        marginTop: 12,
        paddingTop: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: p.outline,
    },
    search: {
        marginHorizontal: GRID_GAP / 2,
    },
    sorts: {
        marginHorizontal: GRID_GAP / 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    sortLabel: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginRight: 2,
    },
    sortChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
    },
    sortChipActive: {
        borderColor: p.ember,
        backgroundColor: p.track,
    },
    sortText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    sortTextActive: {
        color: p.ember,
    },
    // No negative margin here — inside a ScrollView it causes sideways panning
    // and top-row clipping. See the same note in InventoryModal.
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
}));
