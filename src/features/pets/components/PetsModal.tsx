import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo } from "@/features/inventory/rarity";
import { formatCoins } from "@/features/market/market";
import { playerActions, usePlayerStore } from "@/features/player/playerStore";
import { useActivePetId, useInventory, usePetUpgrade } from "@/features/player/usePlayer";
import { skillLabel } from "@/features/skills/skills";
import type { GeoPetState } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { petArt } from "../petArt";

type PetsModalProps = {
    onClose: () => void;
    /** Open on this pet's page rather than the list. */
    initialPetId?: string;
};

type Page = { page: "list" } | { page: "pet"; id: string } | { page: "give"; id: string };

/** An owned pet: an inventory item that carries a pet's state. */
type OwnedPet = InventoryItem & { pet: GeoPetState };

const isPet = (item: InventoryItem): item is OwnedPet => item.pet !== undefined;

/**
 * Your pets, from the character screen's pet slot. One is active at a time and gives
 * its stats (pets never fight); it levels from the skill XP you earn while
 * it's out. Tap a pet for its stats, abilities and held item. Kat, a vendor,
 * raises a pet's rarity.
 */
export default function PetsModal({ onClose, initialPetId }: PetsModalProps) {
    const [page, setPage] = useState<Page>(initialPetId ? { page: "pet", id: initialPetId } : { page: "list" });
    const inventory = useInventory();
    const activeId = useActivePetId();
    const pets = useMemo(
        () =>
            inventory.filter(isPet).sort(
                (a, b) =>
                    Number(b.id === activeId) - Number(a.id === activeId) ||
                    rarityInfo(b.rarity).rank - rarityInfo(a.rarity).rank ||
                    b.pet.level - a.pet.level,
            ),
        [inventory, activeId],
    );
    const selected = page.page !== "list" ? pets.find((pet) => pet.id === page.id) : undefined;

    return (
        <Modal
            title={page.page === "give" ? "Give an item" : selected ? selected.name : "Pets"}
            size="fill"
            showBack
            onBack={page.page === "give" ? () => setPage({ page: "pet", id: page.id }) : selected ? () => setPage({ page: "list" }) : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {page.page === "give" && selected ? (
                <GivePage pet={selected} onDone={() => setPage({ page: "pet", id: selected.id })} />
            ) : selected ? (
                <PetPage pet={selected} isActive={selected.id === activeId} onGive={() => setPage({ page: "give", id: selected.id })} />
            ) : (
                <ListPage pets={pets} activeId={activeId} onOpen={(id) => setPage({ page: "pet", id })} />
            )}
        </Modal>
    );
}

function PetArt({ item, size }: { item: InventoryItem; size: number }) {
    const art = petArt(item.petInfo?.image);
    return (
        <View style={[styles.art, { width: size, height: size, borderColor: rarityInfo(item.rarity).color }]}>
            {art ? (
                <Image source={art} style={{ width: size - 12, height: size - 12 }} resizeMode="contain" />
            ) : (
                <Icon name={item.icon} size={size * 0.55} color={colors.emberBright} />
            )}
        </View>
    );
}

function XpBar({ pet }: { pet: GeoPetState }) {
    const isMax = pet.xpForLevel === 0;
    return (
        <View style={styles.xp}>
            <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${isMax ? 100 : (pet.xpIntoLevel / pet.xpForLevel) * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>{isMax ? "Max level" : `${formatCoins(pet.xpIntoLevel)} / ${formatCoins(pet.xpForLevel)} XP`}</Text>
        </View>
    );
}

function ListPage({ pets, activeId, onOpen }: { pets: OwnedPet[]; activeId: string | null; onOpen: (id: string) => void }) {
    const upgrade = usePetUpgrade();
    const items = usePlayerStore((state) => state.items);
    // When the page opened: enough to say whether Kat is done.
    const [now] = useState(() => Date.now());

    return (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            {upgrade && (
                <View style={styles.notice}>
                    <Icon name="cat" size={18} color={colors.emberBright} />
                    <Text style={styles.noticeText}>
                        Kat has your {items[upgrade.itemId]?.name ?? "pet"}, becoming{" "}
                        {rarityInfo(items[upgrade.toItemId]?.rarity ?? "common").label}.{" "}
                        {new Date(upgrade.readyAt).getTime() <= now
                            ? "It's ready: collect it from Kat."
                            : `Ready ${new Date(upgrade.readyAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.`}
                    </Text>
                </View>
            )}

            {pets.length === 0 ? (
                <View style={styles.empty}>
                    <Icon name="paw-print" size={40} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>
                        No pets yet. They come from rare monster drops, crafting, and the Market.
                    </Text>
                </View>
            ) : (
                pets.map((pet) => {
                    const isActive = pet.id === activeId;
                    return (
                        <Pressable
                            key={pet.id}
                            onPress={() => onOpen(pet.id)}
                            style={({ pressed }) => [styles.card, isActive && styles.cardActive, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityLabel={`${pet.name}, ${rarityInfo(pet.rarity).label}, level ${pet.pet.level}${isActive ? ", active" : ""}`}
                        >
                            <PetArt item={pet} size={56} />
                            <View style={styles.cardBody}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.cardName} numberOfLines={1}>
                                        {pet.name}
                                    </Text>
                                    {isActive && <Text style={styles.activeBadge}>Active</Text>}
                                </View>
                                <Text style={styles.cardMeta}>
                                    <Text style={{ color: rarityInfo(pet.rarity).color }}>{rarityInfo(pet.rarity).label}</Text>
                                    {` · Lv ${pet.pet.level}`}
                                    {pet.petInfo ? ` · ${skillLabel(pet.petInfo.skill)}` : ""}
                                </Text>
                                <XpBar pet={pet.pet} />
                            </View>
                        </Pressable>
                    );
                })
            )}
        </ScrollView>
    );
}

function PetPage({ pet, isActive, onGive }: { pet: OwnedPet; isActive: boolean; onGive: () => void }) {
    const items = usePlayerStore((state) => state.items);
    const removalCost = usePlayerStore((state) => state.me?.heldItemRemovalCost);
    const state = pet.pet;
    const held = state.heldItem ? items[state.heldItem] : undefined;
    const rarity = rarityInfo(pet.rarity);

    return (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
                <PetArt item={pet} size={128} />
                <Text style={styles.category}>
                    <Text style={{ color: rarity.color }}>{rarity.label}</Text>
                    {pet.petInfo ? ` · ${skillLabel(pet.petInfo.skill)} pet` : " · Pet"}
                </Text>
                <Text style={styles.level}>
                    Level {state.level} <Text style={styles.levelMax}>/ {state.maxLevel}</Text>
                </Text>
                <XpBar pet={state} />
            </View>

            <Pressable
                onPress={() => playerActions.setActivePet(isActive ? null : pet.id)}
                style={({ pressed }) => [styles.button, isActive && styles.buttonQuiet, pressed && styles.pressed]}
                accessibilityRole="button"
            >
                <Text style={[styles.buttonText, isActive && styles.buttonTextQuiet]}>{isActive ? "Put away" : "Summon"}</Text>
            </Pressable>

            <Text style={styles.description}>{pet.description}</Text>

            <Text style={styles.sectionTitle}>Stats</Text>
            <View style={styles.table}>
                {state.stats.length === 0 && <Text style={styles.muted}>Nothing yet.</Text>}
                {state.stats.map((stat, index) => (
                    <View key={stat.label} style={[styles.row, index === state.stats.length - 1 && styles.rowLast]}>
                        <Text style={styles.rowLabel}>{stat.label}</Text>
                        <Text style={styles.rowValue}>{stat.value}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Abilities</Text>
            <View style={styles.abilities}>
                {state.abilities.map((ability) => (
                    <View key={ability.name} style={[styles.ability, !ability.unlocked && styles.abilityLocked]}>
                        <View style={styles.abilityHead}>
                            <Text style={[styles.abilityName, !ability.unlocked && styles.lockedText]}>{ability.name}</Text>
                            {!ability.unlocked && (
                                <Text style={styles.lockedText}>{rarityInfo(ability.from).label} and up</Text>
                            )}
                        </View>
                        <Text style={[styles.abilityText, !ability.unlocked && styles.lockedText]}>{ability.description}</Text>
                        {ability.stats.map((stat) => (
                            <Text key={stat.label} style={styles.abilityStat}>
                                {stat.label} {stat.value}
                            </Text>
                        ))}
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Held item</Text>
            <View style={styles.heldRow}>
                <Text style={[styles.heldName, !held && styles.muted]} numberOfLines={1}>
                    {held ? held.name : "Nothing"}
                </Text>
                <Pressable onPress={onGive} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]} accessibilityRole="button">
                    <Text style={styles.smallButtonText}>{held ? "Swap" : "Give"}</Text>
                </Pressable>
                {held && (
                    <Pressable
                        onPress={() => playerActions.takePetItem(pet.id)}
                        style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Take off ${held.name} for ${removalCost?.[held.rarity] ?? 0} coins`}
                    >
                        <Text style={styles.smallButtonText}>Take off · {formatCoins(removalCost?.[held.rarity] ?? 0)}</Text>
                    </Pressable>
                )}
            </View>

            {state.upgrade && (
                <Text style={styles.hint}>
                    Kat can raise it to {rarityInfo(items[state.upgrade.toItemId]?.rarity ?? pet.rarity).label} for{" "}
                    {formatCoins(state.upgrade.coins)} coins
                    {state.upgrade.items.map((cost) => `, ${cost.quantity} ${items[cost.itemId]?.name ?? cost.itemId}`).join("")}
                    , taking {state.upgrade.hours} h. It keeps its XP, but a rarer pet needs more per level.
                </Text>
            )}
        </ScrollView>
    );
}

/** Pick a pet item from the inventory for the pet to hold. */
function GivePage({ pet, onDone }: { pet: OwnedPet; onDone: () => void }) {
    const inventory = useInventory();
    const items = usePlayerStore((state) => state.items);
    const heldItems = inventory.filter((item) => items[item.itemId]?.kind === "petItem");

    return (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            {heldItems.length === 0 ? (
                <Text style={styles.emptyText}>You have no pet items. Kat sells some.</Text>
            ) : (
                <View style={styles.grid}>
                    {heldItems.map((item) => (
                        <View key={item.id} style={styles.gridCell}>
                            <ItemTile
                                item={item}
                                onPress={async () => {
                                    if (await playerActions.givePetItem(pet.id, item.id)) onDone();
                                }}
                            />
                            <Text style={styles.gridLabel} numberOfLines={2}>
                                {item.name}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 12,
        paddingBottom: 24,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    art: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: colors.surfaceRaised,
    },
    empty: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 48,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        textAlign: "center",
    },
    notice: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.ember,
        backgroundColor: colors.surfaceRaised,
    },
    noticeText: {
        flexShrink: 1,
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    cardActive: {
        borderColor: colors.ember,
    },
    cardBody: {
        flex: 1,
        gap: 4,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    cardName: {
        flexShrink: 1,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
    },
    activeBadge: {
        color: colors.emberBright,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    cardMeta: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    xp: {
        alignSelf: "stretch",
        gap: 3,
    },
    xpTrack: {
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.barTrack,
        overflow: "hidden",
    },
    xpFill: {
        height: "100%",
        backgroundColor: colors.ember,
    },
    xpText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    hero: {
        alignItems: "center",
        gap: 8,
        paddingTop: 8,
    },
    category: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    level: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
    },
    levelMax: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    button: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    // Put away is the quieter action: outlined, not filled.
    buttonQuiet: {
        backgroundColor: "transparent",
    },
    buttonText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    buttonTextQuiet: {
        color: colors.emberBright,
    },
    description: {
        color: colors.textPrimary,
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
    },
    sectionTitle: {
        marginTop: 6,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    table: {
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    rowValue: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    muted: {
        color: colors.textSecondary,
        fontSize: 13,
        paddingVertical: 11,
    },
    abilities: {
        gap: 8,
    },
    ability: {
        gap: 4,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    abilityLocked: {
        opacity: 0.6,
    },
    abilityHead: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
    },
    abilityName: {
        color: colors.effect,
        fontSize: 14,
        fontWeight: "700",
    },
    abilityText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
    },
    abilityStat: {
        color: colors.effect,
        fontSize: 13,
        fontWeight: "600",
    },
    lockedText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    heldRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    heldName: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    smallButton: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    smallButtonText: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "700",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    gridCell: {
        width: 76,
        gap: 4,
    },
    gridLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
    },
});
