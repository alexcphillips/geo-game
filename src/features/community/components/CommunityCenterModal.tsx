import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { colors } from "@/theme/colors";
import type { Mayor, MayorPerk } from "../mayors";
import { useMayor, type MayorState } from "../useMayor";
import { formatCountdown, useTermCountdown } from "../useTermCountdown";

export type CommunityCenterTab = "mayor" | "election";

type CommunityCenterModalProps = {
    onClose: () => void;
    /** Where to open. */
    initialTab?: CommunityCenterTab;
};

const TABS: { id: CommunityCenterTab; label: string }[] = [
    { id: "mayor", label: "Mayor" },
    { id: "election", label: "Election" },
];

/** Natural aspect of `knight_portrait.png` (432×578), the placeholder art. */
const PORTRAIT_ASPECT = 432 / 578;
const PORTRAIT_HEIGHT = 190;

/**
 * The Community Center: the town's elected mayor and the race for the next.
 *
 * A mayor's perks are global boosters — every player has them while that
 * mayor is in office. The Mayor tab shows who holds office now; the Election
 * tab shows the candidates, and both count down to the same moment, when the
 * winner takes over. Everything is the server's: the timer, the candidates,
 * the live vote counts, and the player's one vote, which can't be changed.
 */
export default function CommunityCenterModal({
    onClose,
    initialTab = "mayor",
}: CommunityCenterModalProps) {
    const [tabId, setTabId] = useState<CommunityCenterTab>(initialTab);
    const state = useMayor();
    const remainingMs = useTermCountdown(state.election?.endsAt ?? null, state.clockOffsetMs);

    return (
        <Modal
            title="Community Center"
            size="fill"
            showBack
            closePlacement="footer"
            onClose={onClose}
        >
            <View style={styles.tabs} accessibilityRole="tablist">
                {TABS.map((tab) => {
                    const isActive = tab.id === tabId;
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => setTabId(tab.id)}
                            style={({ pressed }) => [
                                styles.tab,
                                isActive && styles.tabActive,
                                pressed && styles.tabPressed,
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.body} contentContainerStyle={styles.bodyContent}>
                {!state.mayor || !state.election ? (
                    state.error ? (
                        <Text style={styles.note}>{state.error}</Text>
                    ) : (
                        <ActivityIndicator color={colors.textSecondary} />
                    )
                ) : tabId === "mayor" ? (
                    <MayorTab mayor={state.mayor} remainingMs={remainingMs} />
                ) : (
                    <ElectionTab state={state} remainingMs={remainingMs} />
                )}
            </ScrollView>
        </Modal>
    );
}

function MayorTab({ mayor, remainingMs }: { mayor: Mayor; remainingMs: number }) {
    return (
        <>
            <Countdown label="Term ends in" remainingMs={remainingMs} />
            <Text style={styles.mayorName}>{mayor.name}</Text>
            <Portrait mayor={mayor} />
            <View style={styles.divider} />
            <PerkList perks={mayor.perks} />
        </>
    );
}

function ElectionTab({ state, remainingMs }: { state: MayorState; remainingMs: number }) {
    const election = state.election;
    const candidates = election?.candidates ?? [];
    const yourVote = election?.yourVote ?? null;
    const [selectedId, setSelectedId] = useState(yourVote?.candidateId ?? candidates[0]?.id);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
    if (!election || !selected) return <Text style={styles.note}>No election is running.</Text>;

    const votedFor = candidates.find((candidate) => candidate.id === yourVote?.candidateId);
    const isClosed = remainingMs <= 0;
    const weight = election.yourVoteWeight;

    const vote = async () => {
        setIsBusy(true);
        await state.vote(selected.id);
        setIsBusy(false);
        setIsConfirming(false);
    };

    return (
        <>
            <Countdown label="New mayor takes office in" remainingMs={remainingMs} />

            <View style={styles.candidateTabs} accessibilityRole="tablist">
                {candidates.map((candidate) => {
                    const isActive = candidate.id === selected.id;
                    return (
                        <Pressable
                            key={candidate.id}
                            onPress={() => {
                                setSelectedId(candidate.id);
                                setIsConfirming(false);
                            }}
                            style={({ pressed }) => [
                                styles.candidateTab,
                                { borderColor: candidate.color },
                                isActive && styles.candidateTabActive,
                                pressed && styles.tabPressed,
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={`${candidate.name}, ${candidate.votes} votes`}
                        >
                            <Text
                                style={[styles.candidateName, isActive && styles.tabTextActive]}
                                numberOfLines={1}
                            >
                                {candidate.name}
                            </Text>
                            <Text style={styles.candidateVotes}>({candidate.votes.toLocaleString()})</Text>
                        </Pressable>
                    );
                })}
            </View>

            <Portrait mayor={selected} borderColor={selected.color} />

            {/* One vote per election, and it's final. */}
            {votedFor ? (
                <View style={[styles.voteButton, styles.voteButtonDone]} accessibilityLabel={`You voted for ${votedFor.name}`}>
                    <Icon name="check-mark" size={14} color={colors.emberBright} />
                    <Text style={[styles.voteButtonText, styles.voteButtonTextDone]}>
                        {votedFor.id === selected.id ? "Your vote" : `You voted for ${votedFor.name}`}
                    </Text>
                </View>
            ) : isConfirming ? (
                <View style={styles.confirm}>
                    <Text style={styles.confirmText}>
                        {`Vote for ${selected.name}? Your vote${weight > 1 ? ` counts ${weight} times and` : ""} can't be changed.`}
                    </Text>
                    <View style={styles.confirmButtons}>
                        <Pressable
                            onPress={() => setIsConfirming(false)}
                            style={({ pressed }) => [styles.secondary, pressed && styles.voteButtonPressed]}
                            accessibilityRole="button"
                        >
                            <Text style={styles.secondaryText}>Back</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => void vote()}
                            disabled={isBusy}
                            style={({ pressed }) => [styles.voteButton, styles.grow, pressed && styles.voteButtonPressed]}
                            accessibilityRole="button"
                        >
                            <Text style={styles.voteButtonText}>Vote</Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <Pressable
                    onPress={() => setIsConfirming(true)}
                    disabled={isClosed}
                    style={({ pressed }) => [
                        styles.voteButton,
                        isClosed && styles.voteButtonDisabled,
                        pressed && styles.voteButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Vote for ${selected.name}`}
                    accessibilityState={{ disabled: isClosed }}
                >
                    <Text style={styles.voteButtonText}>{isClosed ? "Voting closed" : "Vote"}</Text>
                </Pressable>
            )}
            {weight > 1 && !votedFor && <Text style={styles.note}>Your vote counts {weight} times.</Text>}

            <PerkList perks={selected.perks} />
        </>
    );
}

function Countdown({ label, remainingMs }: { label: string; remainingMs: number }) {
    return (
        <View style={styles.countdown}>
            <Icon name="hourglass" size={18} color={colors.emberBright} />
            <View>
                <Text style={styles.countdownLabel}>{label}</Text>
                <Text style={styles.countdownTime}>{formatCountdown(remainingMs)}</Text>
            </View>
        </View>
    );
}

function Portrait({ mayor, borderColor }: { mayor: Mayor; borderColor?: string }) {
    return (
        <View style={[styles.portraitFrame, borderColor && { borderColor }]}>
            <Image
                source={mayor.image}
                style={styles.portrait}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Portrait of ${mayor.name}`}
            />
        </View>
    );
}

function PerkList({ perks }: { perks: MayorPerk[] }) {
    return (
        <View style={styles.perks}>
            <Text style={styles.perksHeading}>Perks · for every player while in office</Text>
            {perks.map((perk) => (
                <View key={perk.id} style={styles.perkRow}>
                    <View style={styles.perkIcon}>
                        <Icon name={perk.icon} size={20} color={colors.effect} />
                    </View>
                    <View style={styles.perkText}>
                        <Text style={styles.perkName}>{perk.name}</Text>
                        <Text style={styles.perkDescription}>{perk.description}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    tabs: {
        flexDirection: "row",
        gap: 4,
        marginHorizontal: -10,
        marginTop: -8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 9,
        borderRadius: 8,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        backgroundColor: colors.surfaceRaised,
        borderBottomColor: colors.ember,
    },
    tabPressed: {
        transform: [{ scale: 0.94 }],
    },
    tabText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    tabTextActive: {
        color: colors.emberBright,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
    },
    countdown: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    countdownLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    countdownTime: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    mayorName: {
        color: colors.emberBright,
        fontSize: 22,
        fontWeight: "700",
        letterSpacing: 1,
    },
    portraitFrame: {
        padding: 6,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.void,
    },
    portrait: {
        height: PORTRAIT_HEIGHT,
        width: PORTRAIT_HEIGHT * PORTRAIT_ASPECT,
    },
    divider: {
        alignSelf: "stretch",
        height: 1,
        backgroundColor: colors.border,
    },
    candidateTabs: {
        alignSelf: "stretch",
        flexDirection: "row",
        gap: 6,
    },
    candidateTab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        borderWidth: 1.5,
        backgroundColor: colors.surface,
        opacity: 0.7,
    },
    candidateTabActive: {
        backgroundColor: colors.surfaceRaised,
        borderWidth: 2.5,
        opacity: 1,
    },
    candidateName: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
    },
    candidateVotes: {
        color: colors.textSecondary,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
    },
    voteButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 36,
        paddingVertical: 11,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    voteButtonDone: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    voteButtonPressed: {
        transform: [{ scale: 0.96 }],
    },
    voteButtonText: {
        color: colors.textOnEmber,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    voteButtonTextDone: {
        color: colors.emberBright,
    },
    voteButtonDisabled: {
        opacity: 0.4,
    },
    grow: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 0,
    },
    confirm: {
        alignSelf: "stretch",
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    confirmText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    confirmButtons: {
        flexDirection: "row",
        gap: 8,
    },
    secondary: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    secondaryText: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "700",
    },
    note: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: "center",
    },
    perks: {
        alignSelf: "stretch",
        gap: 8,
    },
    perksHeading: {
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    perkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    perkIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.void,
    },
    perkText: {
        flex: 1,
        gap: 2,
    },
    perkName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    perkDescription: {
        color: colors.effect,
        fontSize: 13,
    },
});
