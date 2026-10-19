import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import type { PackKind } from "@/features/lunchbox/packs";
import { NumberInput } from "@/features/market/components/FormFields";
import { formatCoins } from "@/features/market/market";
import { useBankCoins, useCoins } from "@/features/player/usePlayer";
import { playerActions } from "@/features/player/playerStore";
import { colors } from "@/theme/colors";
import { CAMP_MOVE_DAYS, CAMP_RADIUS_METRES, formatDay, formatDistance, useCampStatus } from "../camp";

type CampModalProps = {
    onClose: () => void;
    /** Pack the lunchbox or bait: the screen closes and the pack opens. */
    onOpenPack: (kind: PackKind) => void;
};

/**
 * Camp: the player's base, where they pack and bank. Packing the lunchbox
 * and bait, and moving coins in or out of the bank, happen only within
 * CAMP_RADIUS_METRES of it. A death takes the coins carried, never the banked. There is no resting: health
 * comes back only from lunchbox food.
 *
 * With no camp yet, it explains that and offers to make one here. With one,
 * it says how far away it is. Either way it links to the lunchbox and bait,
 * which can always be looked at and unpacked. Camp never expires: it stays until the player sets a
 * new one. Moving camp asks first, since it then can't move for
 * CAMP_MOVE_DAYS; the server rounds it to about 11 m, so the exact spot is
 * never kept.
 */
export default function CampModal({ onClose, onOpenPack }: CampModalProps) {
    const status = useCampStatus();
    const { camp } = status;
    const [isSending, setIsSending] = useState(false);

    const send = async (action: () => Promise<boolean>) => {
        setIsSending(true);
        await action();
        setIsSending(false);
    };

    const confirmSetCamp = () => {
        const title = camp ? "Move camp here?" : "Make camp here?";
        const body = `You'll pack within ${CAMP_RADIUS_METRES} m of here, and it stays here until you move it. Once moved, it can't move again for ${CAMP_MOVE_DAYS} days.`;
        Alert.alert(title, body, [
            { text: "Cancel", style: "cancel" },
            { text: camp ? "Move camp" : "Make camp", onPress: () => void send(playerActions.setCamp) },
        ]);
    };


    return (
        <Modal title="Camp" size="large" closePlacement="footer" onClose={onClose}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
                <View style={styles.hero}>
                    <View style={[styles.badge, status.isAtCamp && styles.badgeLit]}>
                        <Icon name="campfire" size={34} color={status.isAtCamp ? colors.textOnEmber : colors.emberBright} />
                    </View>
                    <Text style={styles.where}>
                        {!camp
                            ? "No camp yet"
                            : status.isAtCamp
                              ? "You're at camp"
                              : status.distance === null
                                ? "Finding you…"
                                : `Camp is ${formatDistance(status.distance)} away`}
                    </Text>
                    <Text style={styles.hint}>
                        {camp
                            ? `Pack your lunchbox and bait within ${CAMP_RADIUS_METRES} m of camp. Out on the road, your lunchbox is all the food you have.`
                            : `Camp is your base: your lunchbox and bait can only be packed there. Health doesn't come back on its own, so the food you pack is all the healing you get.`}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pack</Text>
                    <View style={styles.packRow}>
                        <PackButton label="Lunchbox" icon="knife-fork" onPress={() => onOpenPack("lunchbox")} />
                        <PackButton label="Bait" icon="fishing-hook" onPress={() => onOpenPack("bait")} />
                    </View>
                    {!status.canRestock && (
                        <Text style={styles.note}>
                            {camp
                                ? "Away from camp you can look and unpack, but not pack."
                                : "Until you make camp you can look and unpack, but not pack."}
                        </Text>
                    )}
                </View>

                <BankSection canBank={status.isAtCamp} hasCamp={camp !== null} />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{camp ? "Move camp" : "Make camp"}</Text>
                    <Button
                        label={camp ? "Move camp here" : "Make camp here"}
                        onPress={confirmSetCamp}
                        disabled={isSending || !status.canMove || status.isAtCamp}
                        quiet={camp !== null}
                    />
                    {status.movableAt ? (
                        <Text style={styles.note}>Camp can move again on {formatDay(status.movableAt)}.</Text>
                    ) : camp && status.isAtCamp ? (
                        <Text style={styles.note}>{"You're already here. Walk somewhere else to move it."}</Text>
                    ) : (
                        <Text style={styles.note}>
                            Camp stays until you make a new one. After moving it, you wait {CAMP_MOVE_DAYS} days to move it again.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </Modal>
    );
}

/**
 * The bank: both balances always, moving coins only at camp. The "All"
 * shortcuts fill the amount; nothing moves until Deposit or Withdraw.
 */
function BankSection({ canBank, hasCamp }: { canBank: boolean; hasCamp: boolean }) {
    const carried = useCoins();
    const banked = useBankCoins();
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const value = Number(amount);
    const isValid = amount !== "" && value >= 1;

    const move = async (send: (amount: number) => Promise<boolean>) => {
        setIsSending(true);
        if (await send(value)) setAmount("");
        setIsSending(false);
    };

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank</Text>
            <View style={styles.balances}>
                <Balance label="Carried" amount={carried} />
                <Balance label="Banked" amount={banked} />
            </View>
            <Text style={styles.note}>Dying takes every coin you carry. Banked coins are safe.</Text>

            {canBank ? (
                <>
                    <NumberInput value={amount} onChange={setAmount} accessibilityLabel="Coins to move" coins placeholder="Amount" />
                    <View style={styles.shortcuts}>
                        <Shortcut label="All carried" onPress={() => setAmount(String(carried))} disabled={carried === 0} />
                        <Shortcut label="All banked" onPress={() => setAmount(String(banked))} disabled={banked === 0} />
                    </View>
                    <View style={styles.bankButtons}>
                        <View style={styles.bankButton}>
                            <Button
                                label="Deposit"
                                onPress={() => void move(playerActions.bankDeposit)}
                                disabled={isSending || !isValid || value > carried}
                            />
                        </View>
                        <View style={styles.bankButton}>
                            <Button
                                label="Withdraw"
                                onPress={() => void move(playerActions.bankWithdraw)}
                                disabled={isSending || !isValid || value > banked}
                                quiet
                            />
                        </View>
                    </View>
                </>
            ) : (
                <Text style={styles.note}>
                    {hasCamp ? "Come back to camp to deposit or withdraw." : "Make camp to use the bank."}
                </Text>
            )}
        </View>
    );
}

function Balance({ label, amount }: { label: string; amount: number }) {
    return (
        <View style={styles.balance} accessible accessibilityLabel={`${label}: ${amount} coins`}>
            <Text style={styles.balanceLabel}>{label}</Text>
            <View style={styles.balanceRow}>
                <Icon name="two-coins" size={16} color={colors.coins} />
                <Text style={styles.balanceAmount}>{formatCoins(amount)}</Text>
            </View>
        </View>
    );
}

function Shortcut({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.shortcut, disabled && styles.buttonDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            <Text style={styles.shortcutText}>{label}</Text>
        </Pressable>
    );
}

function Button({
    label,
    onPress,
    disabled,
    quiet = false,
}: {
    label: string;
    onPress: () => void;
    disabled: boolean;
    quiet?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                quiet && styles.buttonQuiet,
                disabled && styles.buttonDisabled,
                pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            <Text style={[styles.buttonText, quiet && styles.buttonTextQuiet]}>{label}</Text>
        </Pressable>
    );
}

function PackButton({ label, icon, onPress }: { label: string; icon: "knife-fork" | "fishing-hook"; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.pack, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${label.toLowerCase()}`}
        >
            <Icon name={icon} size={22} color={colors.emberBright} />
            <Text style={styles.packLabel}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    balances: {
        flexDirection: "row",
        gap: 10,
    },
    balance: {
        flex: 1,
        gap: 4,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    balanceLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    balanceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    balanceAmount: {
        color: colors.coins,
        fontSize: 18,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    shortcuts: {
        flexDirection: "row",
        gap: 8,
    },
    shortcut: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    shortcutText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
    },
    bankButtons: {
        flexDirection: "row",
        gap: 10,
    },
    bankButton: {
        flex: 1,
    },
    page: {
        gap: 18,
        paddingBottom: 8,
    },
    hero: {
        alignItems: "center",
        gap: 8,
    },
    badge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.ember,
        backgroundColor: colors.surfaceRaised,
    },
    // Lit while you're at camp: the fire is burning.
    badgeLit: {
        backgroundColor: colors.ember,
    },
    where: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: "700",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    packRow: {
        flexDirection: "row",
        gap: 10,
    },
    pack: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    packLabel: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    note: {
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
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
    buttonQuiet: {
        backgroundColor: "transparent",
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
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
});
