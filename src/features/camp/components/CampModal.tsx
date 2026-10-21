import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import Panel from "@/components/Panel/Panel";
import { Hint, Label, SectionTitle, Title } from "@/components/Text/Text";
import type { PackKind } from "@/features/lunchbox/packs";
import { NumberInput } from "@/features/market/components/FormFields";
import { formatCoins } from "@/features/market/market";
import { useBankCoins, useCoins } from "@/features/player/usePlayer";
import { playerActions } from "@/features/player/playerStore";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";
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
    const styles = useStyles();
    const palette = useTheme();
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
                        <Icon name="campfire" size={34} color={status.isAtCamp ? "#FFFFFF" : palette.ember} />
                    </View>
                    <Title center>
                        {!camp
                            ? "No camp yet"
                            : status.isAtCamp
                              ? "You're at camp"
                              : status.distance === null
                                ? "Finding you…"
                                : `Camp is ${formatDistance(status.distance)} away`}
                    </Title>
                    <Hint center>
                        {camp
                            ? `Pack your lunchbox and bait within ${CAMP_RADIUS_METRES} m of camp. Out on the road, your lunchbox is all the food you have.`
                            : `Camp is your base: your lunchbox and bait can only be packed there. Health doesn't come back on its own, so the food you pack is all the healing you get.`}
                    </Hint>
                </View>

                <View style={styles.section}>
                    <SectionTitle>Pack</SectionTitle>
                    <View style={styles.pair}>
                        <PackTile label="Lunchbox" icon="knife-fork" onPress={() => onOpenPack("lunchbox")} />
                        <PackTile label="Bait" icon="fishing-hook" onPress={() => onOpenPack("bait")} />
                    </View>
                    {!status.canRestock && (
                        <Hint center>
                            {camp
                                ? "Away from camp you can look and unpack, but not pack."
                                : "Until you make camp you can look and unpack, but not pack."}
                        </Hint>
                    )}
                </View>

                <BankSection canBank={status.isAtCamp} hasCamp={camp !== null} />

                <View style={styles.section}>
                    <SectionTitle>{camp ? "Move camp" : "Make camp"}</SectionTitle>
                    <Button
                        label={camp ? "Move camp here" : "Make camp here"}
                        onPress={confirmSetCamp}
                        disabled={isSending || !status.canMove || status.isAtCamp}
                        variant={camp ? "secondary" : "primary"}
                        icon="campfire"
                        stretch
                    />
                    <Hint center>
                        {status.movableAt
                            ? `Camp can move again on ${formatDay(status.movableAt)}.`
                            : camp && status.isAtCamp
                              ? "You're already here. Walk somewhere else to move it."
                              : `Camp stays until you make a new one. After moving it, you wait ${CAMP_MOVE_DAYS} days to move it again.`}
                    </Hint>
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
    const styles = useStyles();
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
            <SectionTitle>Bank</SectionTitle>
            <View style={styles.pair}>
                <Balance label="Carried" amount={carried} />
                <Balance label="Banked" amount={banked} />
            </View>
            <Hint center>Dying takes every coin you carry. Banked coins are safe.</Hint>

            {canBank ? (
                <>
                    <NumberInput value={amount} onChange={setAmount} accessibilityLabel="Coins to move" coins placeholder="Amount" />
                    <View style={styles.row}>
                        <Button label="All carried" size="small" onPress={() => setAmount(String(carried))} disabled={carried === 0} />
                        <Button label="All banked" size="small" onPress={() => setAmount(String(banked))} disabled={banked === 0} />
                    </View>
                    <View style={styles.pair}>
                        <Button
                            label="Deposit"
                            variant="primary"
                            onPress={() => void move(playerActions.bankDeposit)}
                            disabled={isSending || !isValid || value > carried}
                            style={styles.half}
                        />
                        <Button
                            label="Withdraw"
                            onPress={() => void move(playerActions.bankWithdraw)}
                            disabled={isSending || !isValid || value > banked}
                            style={styles.half}
                        />
                    </View>
                </>
            ) : (
                <Hint center>{hasCamp ? "Come back to camp to deposit or withdraw." : "Make camp to use the bank."}</Hint>
            )}
        </View>
    );
}

function Balance({ label, amount }: { label: string; amount: number }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel compact style={styles.half} accessibilityLabel={`${label}: ${amount} coins`}>
            <SectionTitle>{label}</SectionTitle>
            <View style={styles.row}>
                <Icon name="two-coins" size={16} color={palette.reward} />
                <Text style={styles.amount}>{formatCoins(amount)}</Text>
            </View>
        </Panel>
    );
}

function PackTile({ label, icon, onPress }: { label: string; icon: "knife-fork" | "fishing-hook"; onPress: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel onPress={onPress} style={[styles.half, styles.packTile]} accessibilityLabel={`Open ${label.toLowerCase()}`}>
            <Icon name={icon} size={22} color={palette.ember} />
            <Label>{label}</Label>
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 20,
        paddingBottom: 8,
    },
    hero: {
        alignItems: "center",
        gap: 8,
    },
    badge: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    // Lit while you're at camp: the fire is burning.
    badgeLit: {
        backgroundColor: p.ember,
    },
    section: {
        gap: 10,
    },
    pair: {
        flexDirection: "row",
        gap: 10,
    },
    half: {
        flex: 1,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    packTile: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    amount: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 18,
        fontVariant: ["tabular-nums"],
    },
}));
