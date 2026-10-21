import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import Panel from "@/components/Panel/Panel";
import Divider from "@/components/Divider/Divider";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Tabs from "@/components/Tabs/Tabs";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
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
    const styles = useStyles();
    const palette = useTheme();
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
            <Tabs tabs={TABS} value={tabId} onChange={setTabId} style={styles.tabs} />

            <ScrollView showsVerticalScrollIndicator={false} style={styles.body} contentContainerStyle={styles.bodyContent}>
                {!state.mayor || !state.election ? (
                    state.error ? (
                        <Hint>{state.error}</Hint>
                    ) : (
                        <ActivityIndicator color={palette.textMuted} />
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
    const styles = useStyles();
    return (
        <>
            <Countdown label="Term ends in" remainingMs={remainingMs} />
            <Text style={styles.mayorName}>{mayor.name}</Text>
            <Portrait mayor={mayor} />
            <Divider />
            <PerkList perks={mayor.perks} />
        </>
    );
}

function ElectionTab({ state, remainingMs }: { state: MayorState; remainingMs: number }) {
    const styles = useStyles();
    const palette = useTheme();
    const election = state.election;
    const candidates = election?.candidates ?? [];
    const yourVote = election?.yourVote ?? null;
    const [selectedId, setSelectedId] = useState(yourVote?.candidateId ?? candidates[0]?.id);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
    if (!election || !selected) return <Hint>No election is running.</Hint>;

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
                    <Icon name="check-mark" size={14} color={palette.ember} />
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
                        <Button label="Back" onPress={() => setIsConfirming(false)} />
                        <Button label="Vote" variant="primary" onPress={() => void vote()} busy={isBusy} style={styles.grow} />
                    </View>
                </View>
            ) : (
                <Button
                    label="Vote"
                    variant="primary"
                    icon="crown"
                    onPress={() => setIsConfirming(true)}
                    disabled={isClosed}
                    stretch
                    accessibilityLabel={`Vote for ${selected.name}`}
                />
            )}
            {weight > 1 && !votedFor && <Hint>Your vote counts {weight} times.</Hint>}

            <PerkList perks={selected.perks} />
        </>
    );
}

function Countdown({ label, remainingMs }: { label: string; remainingMs: number }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel compact style={styles.countdown}>
            <Icon name="hourglass" size={18} color={palette.ember} />
            <View>
                <Text style={styles.countdownLabel}>{label}</Text>
                <Text style={styles.countdownTime}>{formatCountdown(remainingMs)}</Text>
            </View>
        </Panel>
    );
}

function Portrait({ mayor, borderColor }: { mayor: Mayor; borderColor?: string }) {
    const styles = useStyles();
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
    const palette = useTheme();
    const styles = useStyles();
    return (
        <View style={styles.perks}>
            <Text style={styles.perksHeading}>Perks · for every player while in office</Text>
            {perks.map((perk) => (
                <Panel compact key={perk.id} style={styles.perkRow}>
                    <View style={styles.perkIcon}>
                        <Icon name={perk.icon} size={20} color={palette.game.effect} />
                    </View>
                    <View style={styles.perkText}>
                        <Text style={styles.perkName}>{perk.name}</Text>
                        <Text style={styles.perkDescription}>{perk.description}</Text>
                    </View>
                </Panel>
            ))}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    tabs: {
        marginBottom: 12,
    },
    tabPressed: {
        transform: [{ scale: 0.94 }],
    },
    tabTextActive: {
        color: p.ember,
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
    },
    countdownLabel: {
        color: p.textMuted,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    countdownTime: {
        color: p.text,
        fontSize: 18,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    mayorName: {
        color: p.ember,
        fontSize: 22,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
    },
    portraitFrame: {
        padding: 6,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: p.outline,
        backgroundColor: p.background,
    },
    portrait: {
        height: PORTRAIT_HEIGHT,
        width: PORTRAIT_HEIGHT * PORTRAIT_ASPECT,
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
        backgroundColor: p.surface,
        opacity: 0.7,
    },
    candidateTabActive: {
        backgroundColor: p.surfaceAlt,
        borderWidth: 2.5,
        opacity: 1,
    },
    candidateName: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    candidateVotes: {
        color: p.textMuted,
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
        backgroundColor: p.ember,
    },
    voteButtonDone: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: p.ember,
    },
    voteButtonText: {
        color: p.onPrimary,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
    },
    voteButtonTextDone: {
        color: p.ember,
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
        borderColor: p.ember,
    },
    confirmText: {
        color: p.text,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    confirmButtons: {
        flexDirection: "row",
        gap: 8,
    },
    perks: {
        alignSelf: "stretch",
        gap: 8,
    },
    perksHeading: {
        color: p.textMuted,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    perkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
    },
    perkIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.background,
    },
    perkText: {
        flex: 1,
        gap: 2,
    },
    perkName: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    perkDescription: {
        color: p.game.effect,
        fontSize: 13,
    },
}));
