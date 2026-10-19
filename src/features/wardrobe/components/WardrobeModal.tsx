import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { rarityInfo } from "@/features/inventory/rarity";
import { formatCoins } from "@/features/market/market";
import { playerActions } from "@/features/player/playerStore";
import { useCoins, useInventory, useWardrobe } from "@/features/player/usePlayer";
import { GEO_LOADOUT_NAME_MAX, type GeoLoadout, type GeoLoadoutActivity, type GeoWardrobe } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { AUTO_ACTIVITIES, defaultLoadoutName } from "../wardrobe";

type WardrobeModalProps = {
    onClose: () => void;
    /** Scroll to this slot's card. */
    focusSlot?: number;
};

/**
 * The wardrobe in full: every loadout slot as a card with what it holds,
 * to wear, rename, save what's worn into, clear, or tag for auto-swap; then
 * the upgrades, bought here (more slots, auto-swap).
 */
export default function WardrobeModal({ onClose, focusSlot }: WardrobeModalProps) {
    const wardrobe = useWardrobe();
    const scroll = useRef<ScrollView>(null);

    return (
        <Modal title="Wardrobe" size="fill" showBack closePlacement="footer" onClose={onClose}>
            {wardrobe && (
                <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
                    <Text style={styles.intro}>
                        A loadout is your gear and pet, saved. Changing gear on the character screen updates the loadout
                        you&apos;re wearing. You can&apos;t switch mid-Run.
                    </Text>
                    {Array.from({ length: wardrobe.slots }, (_, slot) => (
                        <View
                            key={slot}
                            onLayout={(event) => {
                                if (slot === focusSlot) scroll.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
                            }}
                        >
                            <LoadoutCard
                                // Keyed on the saved name, so the field resets when it changes.
                                key={wardrobe.loadouts.find((entry) => entry.slot === slot)?.name ?? "empty"}
                                slot={slot}
                                loadout={wardrobe.loadouts.find((entry) => entry.slot === slot)}
                                isActive={wardrobe.activeSlot === slot}
                                autoSwap={wardrobe.autoSwap}
                            />
                        </View>
                    ))}
                    <Upgrades wardrobe={wardrobe} />
                </ScrollView>
            )}
        </Modal>
    );
}

type LoadoutCardProps = {
    slot: number;
    loadout: GeoLoadout | undefined;
    isActive: boolean;
    autoSwap: boolean;
};

function LoadoutCard({ slot, loadout, isActive, autoSwap }: LoadoutCardProps) {
    const inventory = useInventory();
    const [name, setName] = useState(loadout?.name ?? defaultLoadoutName(slot));
    const [isBusy, setIsBusy] = useState(false);

    const run = async (action: () => Promise<boolean>) => {
        setIsBusy(true);
        await action();
        setIsBusy(false);
    };
    const trimmed = name.trim();
    const isRenamed = loadout !== undefined && trimmed !== "" && trimmed !== loadout.name;

    const items = loadout
        ? Object.values(loadout.equipment).flatMap((id) => inventory.filter((item) => item.id === id))
        : [];
    const pet = loadout?.petId ? inventory.find((item) => item.id === loadout.petId) : undefined;

    const saveHere = () => {
        const save = () => void run(() => playerActions.saveLoadout(slot, trimmed || defaultLoadoutName(slot), true));
        if (!loadout) return save();
        Alert.alert(`Replace ${loadout.name}?`, "It will hold what you're wearing now.", [
            { text: "Cancel", style: "cancel" },
            { text: "Replace", onPress: save },
        ]);
    };
    const clear = () =>
        loadout &&
        Alert.alert(`Clear ${loadout.name}?`, "What you're wearing stays on.", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: () => void run(() => playerActions.deleteLoadout(slot)) },
        ]);

    return (
        <View style={[styles.card, isActive && styles.cardActive]}>
            <View style={styles.nameRow}>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    maxLength={GEO_LOADOUT_NAME_MAX}
                    placeholder={defaultLoadoutName(slot)}
                    placeholderTextColor={colors.textSecondary}
                    style={styles.nameInput}
                    accessibilityLabel={`Loadout ${slot + 1} name`}
                    returnKeyType="done"
                    onSubmitEditing={() => isRenamed && void run(() => playerActions.saveLoadout(slot, trimmed, false))}
                />
                {isActive && <Text style={styles.wornTag}>Worn</Text>}
            </View>

            {loadout ? (
                <View style={styles.contents}>
                    {items.length === 0 && !pet && <Text style={styles.muted}>Nothing in it.</Text>}
                    {items.map((item) => (
                        <View key={item.id} style={[styles.itemIcon, { borderColor: rarityInfo(item.rarity).color }]}>
                            <Icon name={item.icon} size={18} color={colors.emberBright} />
                        </View>
                    ))}
                    {pet && (
                        <View style={[styles.itemIcon, { borderColor: rarityInfo(pet.rarity).color }]}>
                            <Icon name="paw-print" size={18} color={colors.emberBright} />
                        </View>
                    )}
                </View>
            ) : (
                <Text style={styles.muted}>Empty. Save what you&apos;re wearing to fill it.</Text>
            )}

            {loadout && autoSwap && (
                <View style={styles.autoRow}>
                    <Text style={styles.autoLabel}>Auto-swap for</Text>
                    {[{ id: null, label: "Off" } as const, ...AUTO_ACTIVITIES].map((option) => {
                        const isOn = loadout.autoFor === option.id;
                        return (
                            <Pressable
                                key={option.label}
                                onPress={() => !isOn && void run(() => playerActions.setLoadoutAuto(slot, option.id as GeoLoadoutActivity | null))}
                                disabled={isBusy}
                                style={[styles.autoChip, isOn && styles.autoChipOn]}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isOn }}
                            >
                                <Text style={[styles.autoChipText, isOn && styles.autoChipTextOn]}>{option.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            <View style={styles.actions}>
                {loadout && !isActive && (
                    <Action label="Wear" primary disabled={isBusy} onPress={() => void run(() => playerActions.wearLoadout(slot))} />
                )}
                {isRenamed && (
                    <Action label="Rename" disabled={isBusy} onPress={() => void run(() => playerActions.saveLoadout(slot, trimmed, false))} />
                )}
                <Action label={loadout ? "Save worn here" : "Save worn gear here"} disabled={isBusy} onPress={saveHere} />
                {loadout && <Action label="Clear" disabled={isBusy} onPress={clear} />}
            </View>
        </View>
    );
}

function Upgrades({ wardrobe }: { wardrobe: GeoWardrobe }) {
    const coins = useCoins();
    const [isBusy, setIsBusy] = useState(false);
    const buy = (title: string, cost: number, action: () => Promise<boolean>) =>
        Alert.alert(title, `${formatCoins(cost)} coins.`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Buy",
                onPress: async () => {
                    setIsBusy(true);
                    await action();
                    setIsBusy(false);
                },
            },
        ]);

    return (
        <View style={styles.upgrades}>
            <Text style={styles.sectionTitle}>Upgrades</Text>

            <View style={styles.upgrade}>
                <View style={styles.upgradeText}>
                    <Text style={styles.upgradeName}>
                        Loadout slots · {wardrobe.slots}/{wardrobe.maxSlots}
                    </Text>
                    <Text style={styles.muted}>One more place to keep a set of gear.</Text>
                </View>
                {wardrobe.nextSlotCost !== null ? (
                    <Action
                        label={`${formatCoins(wardrobe.nextSlotCost)}`}
                        coins
                        disabled={isBusy || coins < wardrobe.nextSlotCost}
                        onPress={() => buy("Buy a loadout slot?", wardrobe.nextSlotCost!, playerActions.buyLoadoutSlot)}
                    />
                ) : (
                    <Text style={styles.owned}>All bought</Text>
                )}
            </View>

            <View style={styles.upgrade}>
                <View style={styles.upgradeText}>
                    <Text style={styles.upgradeName}>Auto-swap</Text>
                    <Text style={styles.muted}>
                        Tag a loadout for Combat or Fishing and it&apos;s worn as a fight or a cast starts, then swapped
                        back the next time.
                    </Text>
                </View>
                {wardrobe.autoSwap ? (
                    <Text style={styles.owned}>Owned</Text>
                ) : (
                    <Action
                        label={`${formatCoins(wardrobe.autoSwapCost)}`}
                        coins
                        disabled={isBusy || coins < wardrobe.autoSwapCost}
                        onPress={() => buy("Unlock auto-swap?", wardrobe.autoSwapCost, playerActions.buyAutoSwap)}
                    />
                )}
            </View>
        </View>
    );
}

type ActionProps = { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; coins?: boolean };

function Action({ label, onPress, disabled = false, primary = false, coins = false }: ActionProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.action, primary && styles.actionPrimary, disabled && styles.disabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            {coins && <Icon name="two-coins" size={14} color={colors.coins} />}
            <Text style={[styles.actionText, primary && styles.actionTextPrimary, coins && styles.actionTextCoins]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 12,
        paddingBottom: 16,
    },
    intro: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    card: {
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardActive: {
        borderColor: colors.ember,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    nameInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    wornTag: {
        color: colors.emberBright,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    contents: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    itemIcon: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: colors.surface,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    autoRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    autoLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        marginRight: 2,
    },
    autoChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    autoChipOn: {
        borderColor: colors.ember,
        backgroundColor: colors.ember,
    },
    autoChipText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
    },
    autoChipTextOn: {
        color: colors.textOnEmber,
    },
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    actionPrimary: {
        backgroundColor: colors.ember,
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        opacity: 0.7,
    },
    actionText: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "600",
    },
    actionTextPrimary: {
        color: colors.textOnEmber,
    },
    actionTextCoins: {
        color: colors.coins,
    },
    upgrades: {
        gap: 10,
        marginTop: 8,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    upgrade: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    upgradeText: {
        flex: 1,
        gap: 3,
    },
    upgradeName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    owned: {
        color: colors.toastSuccess,
        fontSize: 13,
        fontWeight: "700",
    },
});
