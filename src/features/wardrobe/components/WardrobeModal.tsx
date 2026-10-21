import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Pill from "@/components/Pill/Pill";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import Modal from "@/components/Modal/Modal";
import { SectionTitle } from "@/components/Text/Text";
import ItemArt from "@/features/items/components/ItemArt";
import { rarityInfo } from "@/features/items/rarity";
import { formatCoins } from "@/features/market/market";
import { playerActions } from "@/features/player/playerStore";
import { useCoins, useInventory, useWardrobe } from "@/features/player/usePlayer";
import { GEO_LOADOUT_NAME_MAX, type GeoLoadout, type GeoLoadoutActivity, type GeoWardrobe } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { AUTO_ACTIVITIES, defaultLoadoutName } from "../wardrobe";

type WardrobeModalProps = {
    onClose: () => void;
    /** Scroll to this slot's card. */
    focusSlot?: number;
};

/**
 * The wardrobe in full: every loadout slot as a card with what it holds,
 * to wear, rename, save what's worn into, clear, or tag for auto-swap; then
 * more slots, bought here.
 */
export default function WardrobeModal({ onClose, focusSlot }: WardrobeModalProps) {
    const styles = useStyles();
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
};

function LoadoutCard({ slot, loadout, isActive }: LoadoutCardProps) {
    const styles = useStyles();
    const palette = useTheme();
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
        <Panel compact style={[styles.card, isActive && styles.cardActive]}>
            <View style={styles.nameRow}>
                <TextField
                    value={name}
                    onChangeText={setName}
                    maxLength={GEO_LOADOUT_NAME_MAX}
                    placeholder={defaultLoadoutName(slot)}
                    containerStyle={styles.grow}
                    accessibilityLabel={`Loadout ${slot + 1} name`}
                    returnKeyType="done"
                    onSubmitEditing={() => isRenamed && void run(() => playerActions.saveLoadout(slot, trimmed, false))}
                />
                {isActive && <Pill label="Worn" color={palette.heal} />}
            </View>

            {loadout ? (
                <View style={styles.contents}>
                    {items.length === 0 && !pet && <Text style={styles.muted}>Nothing in it.</Text>}
                    {items.map((item) => (
                        <View key={item.id} style={[styles.itemIcon, { borderColor: rarityInfo(item.rarity).color }]}>
                            <ItemArt item={item} size={18} color={palette.ember} />
                        </View>
                    ))}
                    {pet && (
                        <View style={[styles.itemIcon, { borderColor: rarityInfo(pet.rarity).color }]}>
                            <Icon name="paw-print" size={18} color={palette.ember} />
                        </View>
                    )}
                </View>
            ) : (
                <Text style={styles.muted}>Empty. Save what you&apos;re wearing to fill it.</Text>
            )}

            {loadout && (
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
        </Panel>
    );
}

function Upgrades({ wardrobe }: { wardrobe: GeoWardrobe }) {
    const styles = useStyles();
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
            <SectionTitle>Upgrades</SectionTitle>

            <Panel compact style={styles.upgrade}>
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
            </Panel>

        </View>
    );
}

type ActionProps = { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; coins?: boolean };

function Action({ label, onPress, disabled = false, primary = false, coins = false }: ActionProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.action, primary && styles.actionPrimary, disabled && styles.disabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            {coins && <Icon name="two-coins" size={14} color={palette.reward} />}
            <Text style={[styles.actionText, primary && styles.actionTextPrimary, coins && styles.actionTextCoins]}>{label}</Text>
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    grow: {
        flex: 1,
    },
    page: {
        gap: 12,
        paddingBottom: 16,
    },
    intro: {
        color: p.textMuted,
        fontSize: 13,
        lineHeight: 19,
    },
    card: {
        gap: 10,
        padding: 12,
    },
    cardActive: {
        borderColor: p.ember,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
        backgroundColor: p.surface,
    },
    muted: {
        color: p.textMuted,
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
        color: p.textMuted,
        fontSize: 12,
        marginRight: 2,
    },
    autoChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
    },
    autoChipOn: {
        borderColor: p.ember,
        backgroundColor: p.ember,
    },
    autoChipText: {
        color: p.text,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    autoChipTextOn: {
        color: p.onPrimary,
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
        borderColor: p.ember,
    },
    actionPrimary: {
        backgroundColor: p.ember,
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        opacity: 0.7,
    },
    actionText: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    actionTextPrimary: {
        color: p.onPrimary,
    },
    actionTextCoins: {
        color: p.reward,
    },
    upgrades: {
        gap: 10,
        marginTop: 8,
    },
    upgrade: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
    },
    upgradeText: {
        flex: 1,
        gap: 3,
    },
    upgradeName: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
    owned: {
        color: p.heal,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
}));
