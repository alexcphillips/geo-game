import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import { router, useFocusEffect } from "expo-router";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import ChestPicker from "@/features/chests/components/ChestPicker";
import { chestsApi } from "@/features/chests/chestsApi";
import { CHEST_TIER_COLORS } from "@/features/chests/chestTiers";
import DungeonMap from "@/features/dungeons/components/DungeonMap";
import PartyResult, { partyOutcome } from "@/features/dungeons/components/PartyResult";
import PartyStrip from "@/features/dungeons/components/PartyStrip";
import ReadyUpCard from "@/features/dungeons/components/ReadyUpCard";
import { dungeonRunsApi } from "@/features/dungeons/dungeonRunsApi";
import { ROOM_KINDS } from "@/features/dungeons/dungeonRooms";
import { useReportActivity } from "@/features/friends/presenceStore";
import LunchboxModal from "@/features/lunchbox/components/LunchboxModal";
import { usePlayerStore } from "@/features/player/playerStore";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import RunScreen from "@/features/run/components/RunScreen";
import { toErrorMessage } from "@/lib/api";
import { useGeoSocketListener } from "@/lib/realtime/geoSocket";
import type { GeoChestSelection, GeoDungeonOutReason, GeoDungeonRoom, GeoDungeonRunResponse, GeoDungeonRunView } from "@/lib/geo/contracts";
import { createStyles, MoodProvider, useTheme, inked } from "@/theme/theme";

/**
 * A started dungeon's map, walked room by room. Opened bare: it resumes the
 * dungeon in progress (there's only ever one).
 *
 * The server holds the map and decides everything; this screen asks to enter
 * a room or answer a puzzle and shows what comes back. The party shares the
 * map: what the others do arrives over the geo socket, and whichever view
 * is newest (by `version`) wins, whether it came from a push or a reply.
 * The boss room is the ready-up: standing in it is being ready, and when
 * the boss starts (for everyone at once) its fight opens by itself.
 * Entering a fight room
 * opens the combat screen, and leaving that comes back here. When the
 * dungeon ends, its result shows over the map: the chests on a win, or that
 * it's lost (the purse is always kept).
 */
export default function DungeonRunScreen() {
    // Dungeons are always at dusk, like fights.
    return (
        <MoodProvider mood="dusk">
            <DungeonRunScreenContent />
        </MoodProvider>
    );
}

function DungeonRunScreenContent() {
    const styles = useStyles();
    const palette = useTheme();
    useReportActivity("fighting");
    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const items = usePlayerStore((state) => state.items);
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    const [view, setView] = useState<GeoDungeonRunView | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isLunchboxOpen, setIsLunchboxOpen] = useState(false);
    /** The run being shown, for reloading it by id once it's over (when it's no longer "active"). */
    const viewRef = useRef<GeoDungeonRunView | null>(null);
    useEffect(() => {
        viewRef.current = view;
    }, [view]);
    /** The fight last sent to the combat screen, so coming back doesn't send it again. */
    const openedFight = useRef<string | null>(null);

    const openFight = useCallback((runId: string | null) => {
        if (!runId || openedFight.current === runId) return;
        openedFight.current = runId;
        router.push("/run/combat");
    }, []);

    // A fight the server opened for you without you asking: the boss, once the whole party's in.
    const shownFight = view?.status === "active" ? view.fightRunId : null;
    useEffect(() => {
        openFight(shownFight);
    }, [shownFight, openFight]);
    /** The server's clock minus the phone's, taken as each view arrives, for the ready-up countdowns. */
    const [clockOffsetMs, setClockOffsetMs] = useState(0);

    /** Shows `next` unless what's shown is newer: a reply and a push can cross. */
    const showView = useCallback((next: GeoDungeonRunView) => {
        setClockOffsetMs(Date.parse(next.serverTime) - Date.now());
        setView((shown) => (shown && shown.id === next.id && shown.version > next.version ? shown : next));
    }, []);

    // The others' moves, pushed.
    useGeoSocketListener(
        useCallback(
            (message) => {
                if (message.type !== "dungeonRun") return;
                const shown = viewRef.current;
                if (!shown || shown.id === message.dungeonRun.id) showView(message.dungeonRun);
            },
            [showView],
        ),
    );

    /** Shows what an action did: notes and found items as toasts. */
    const adopt = useCallback(
        (response: GeoDungeonRunResponse) => {
            showView(response.dungeonRun);
            for (const note of response.notes) showToast(note, "info");
            for (const found of response.found) {
                showToast(`Found ${found.quantity} × ${items[found.itemId]?.name ?? found.itemId}`, "success");
            }
            if (response.found.length > 0) void refreshPlayer();
        },
        [items, refreshPlayer, showView],
    );

    // On every visit (back from a fight included): the map as it is now.
    const load = useCallback(async () => {
        try {
            const known = viewRef.current;
            const response = known ? await dungeonRunsApi.one(known.id) : await dungeonRunsApi.active();
            if (!response) {
                setProblem("You're not in a dungeon.");
                return;
            }
            showView(response.dungeonRun);
            if (response.dungeonRun.status === "active") openFight(response.dungeonRun.fightRunId);
        } catch (error) {
            setProblem(toErrorMessage(error));
        }
    }, [openFight, showView]);

    useFocusEffect(
        useCallback(() => {
            if (isPlayerReady) void load();
        }, [isPlayerReady, load]),
    );

    const act = async (request: () => Promise<GeoDungeonRunResponse>) => {
        setIsBusy(true);
        try {
            const response = await request();
            adopt(response);
            if (response.fight && response.fight.run.status === "active") openFight(response.fight.run.id);
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsBusy(false);
        }
    };

    const enter = (room: GeoDungeonRoom) => {
        if (!view || view.status !== "active") return;
        // A key is used up on the way in: say so first.
        if (room.locked) {
            Alert.alert("Locked", "Going in uses a key from your inventory. Only you can go past this door.", [
                { text: "Not now", style: "cancel" },
                {
                    text: "Use a key",
                    onPress: () =>
                        void act(async () => {
                            const response = await dungeonRunsApi.move(view.id, room.id);
                            void refreshPlayer();
                            return response;
                        }),
                },
            ]);
            return;
        }
        void act(() => dungeonRunsApi.move(view.id, room.id));
    };

    const leave = () => {
        // A move or an earlier Leave is still in flight.
        if (isBusy) return;
        if (!view || view.status !== "active") {
            router.back();
            return;
        }
        Alert.alert("Leave the dungeon?", "Leaving counts as failing it: no chests. Your purse is safe.", [
            { text: "Stay", style: "cancel" },
            {
                text: "Leave",
                style: "destructive",
                onPress: () =>
                    void act(() => dungeonRunsApi.leave(view.id)).then(() => {
                        router.back();
                    }),
            },
        ]);
    };

    if (!view) {
        return (
            <RunScreen
                kind="Dungeon"
                title="Dungeon"
                onLeave={() => router.back()}
                leaveLabel="Back"
                arena={
                    <View style={styles.missing}>
                        {problem ? <Text style={styles.missingText}>{problem}</Text> : <ActivityIndicator color={palette.textMuted} />}
                    </View>
                }
                hand={null}
            />
        );
    }

    const isOver = view.status !== "active";
    return (
        <>
            <RunScreen
                kind="Dungeon"
                title={view.dungeonName}
                onLeave={leave}
                leaveLabel={isOver ? "Back" : "Leave"}
                arena={
                    <ScrollView contentContainerStyle={styles.arena}>
                        {!isOver && view.readyUp && <ReadyUpCard readyUp={view.readyUp} party={view.party} clockOffsetMs={clockOffsetMs} />}
                        <DungeonMap view={view} onPressRoom={enter} disabled={isBusy || isOver} />
                        {!isOver && view.puzzle && (
                            <PuzzleCard
                                prompt={view.puzzle.prompt}
                                options={view.puzzle.options}
                                disabled={isBusy}
                                onAnswer={(answer) => void act(() => dungeonRunsApi.answer(view.id, answer))}
                            />
                        )}
                    </ScrollView>
                }
                hand={<StatusPanel view={view} onOpenLunchbox={isOver ? undefined : () => setIsLunchboxOpen(true)} />}
            />
            {isOver && <ResultCard view={view} />}
            {isLunchboxOpen && (
                <LunchboxModal
                    onClose={() => {
                        setIsLunchboxOpen(false);
                        // Eating between rooms heals the dungeon's health.
                        void load();
                    }}
                />
            )}
        </>
    );
}

function PuzzleCard({
    prompt,
    options,
    disabled,
    onAnswer,
}: {
    prompt: string;
    options: string[];
    disabled: boolean;
    onAnswer: (answer: number) => void;
}) {
    const styles = useStyles();
    return (
        <Panel compact style={styles.puzzle}>
            <View style={styles.puzzleHead}>
                <Icon name="uncertainty" size={18} color={ROOM_KINDS.puzzle.color} />
                <Text style={styles.puzzleTitle}>Puzzle · one try</Text>
            </View>
            <Text style={styles.puzzlePrompt}>{prompt}</Text>
            <View style={styles.options}>
                {options.map((option, index) => (
                    <Pressable
                        key={index}
                        onPress={() => onAnswer(index)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`Answer ${option}`}
                        style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                    >
                        <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                ))}
            </View>
        </Panel>
    );
}

/** Along the bottom: the rest of the party, dungeon health, star rooms, the party's score so far, and the lunchbox. */
function StatusPanel({ view, onOpenLunchbox }: { view: GeoDungeonRunView; onOpenLunchbox?: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
    const share = view.maxHealth > 0 ? Math.max(0, Math.min(1, view.health / view.maxHealth)) : 0;
    const sealed = view.stars.cleared < view.stars.total;
    return (
        <View style={styles.panel}>
            <PartyStrip party={view.party} />
            <View style={styles.healthRow} accessible accessibilityLabel={`Health ${view.health} of ${view.maxHealth}`}>
                <View style={styles.healthTrack}>
                    <View style={[styles.healthFill, { width: `${share * 100}%` }]} />
                </View>
                <Text style={styles.healthText}>
                    {view.health}/{view.maxHealth}
                </Text>
                {onOpenLunchbox && (
                    <Pressable
                        onPress={onOpenLunchbox}
                        accessibilityRole="button"
                        accessibilityLabel="Lunchbox: eat to heal between rooms"
                        hitSlop={8}
                        style={({ pressed }) => [styles.lunchbox, pressed && styles.pressed]}
                    >
                        <Icon name="sliced-bread" size={20} color={palette.text} />
                    </Pressable>
                )}
            </View>
            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Icon name="falling-star" size={16} color={ROOM_KINDS.star.color} />
                    <Text style={styles.statText}>
                        {view.stars.cleared}/{view.stars.total} stars{sealed ? " · boss sealed" : " · boss open"}
                    </Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statText}>Score {view.score}</Text>
                    {view.chestTiers.map((tier) => (
                        <View key={tier} style={[styles.tierDot, { backgroundColor: CHEST_TIER_COLORS[tier] }]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

/** Why you're out, for the result card. */
const OUT_REASONS: Record<GeoDungeonOutReason, string> = {
    died: "You fell.",
    left: "You left.",
    missedBoss: "You didn't reach the boss room in time.",
    fledBoss: "You fled the boss. There's no going back in.",
};

/** The headline when you're out: how it ended for the party, or that it's still going without you. */
const OUT_TITLES = { going: "You're out", cleared: "Your party cleared it", fell: "Your party fell" } as const;

/**
 * Over the map once it's over for you: your chests on a win, or why you're
 * out. In a party, also what became of everyone, live while the others
 * play on.
 */
function ResultCard({ view }: { view: GeoDungeonRunView }) {
    const styles = useStyles();
    const [selection, setSelection] = useState<GeoChestSelection | null>(null);
    const [opened, setOpened] = useState<GeoChestSelection | null>(null);

    useEffect(() => {
        if (!view.chestSelectionId) return;
        chestsApi
            .list()
            .then((chests) => setSelection(chests.pending.find((pending) => pending.id === view.chestSelectionId) ?? null))
            .catch(() => {});
    }, [view.chestSelectionId]);

    const won = view.status === "won";
    const inParty = view.party.length > 1;
    const outcome = partyOutcome(view.party);
    const title = won ? "Dungeon cleared" : inParty ? OUT_TITLES[outcome] : "Dungeon lost";
    return (
        <View style={styles.scrim}>
            <View style={styles.result}>
                <Text style={styles.resultTitle}>{title}</Text>
                <Text style={styles.resultBody}>
                    {won
                        ? `Score ${view.score}. Pick a chest, or decide later.`
                        : `${view.outReason ? `${OUT_REASONS[view.outReason]} ` : ""}No chests for you this time. Your purse is safe.`}
                    {!won && outcome === "going" && inParty ? " The rest of the party plays on." : ""}
                    {!won && outcome !== "going" && inParty ? ` Party score ${view.score}.` : ""}
                </Text>
                {inParty && <PartyResult party={view.party} />}
                {won && selection && (
                    <ChestPicker selection={opened ?? selection} onOpened={setOpened} />
                )}
                <View style={styles.resultActions}>
                    {won && selection && !opened ? (
                        <OutcomeButton
                            label="Decide later"
                            onPress={() => {
                                showToast("Your chests are waiting in the Inbox's Chests tab", "info");
                                router.back();
                            }}
                        />
                    ) : (
                        <OutcomeButton label="Leave" onPress={() => router.back()} primary />
                    )}
                </View>
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    missingText: { color: p.textMuted, textAlign: "center" },
    arena: { paddingHorizontal: 12, paddingVertical: 12, gap: 14 },
    pressed: { opacity: 0.7 },
    puzzle: {
        gap: 10,
        padding: 14,
    },
    puzzleHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    puzzleTitle: { color: p.text, fontWeight: "700" },
    puzzlePrompt: { color: p.text, fontSize: 16 },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
        minWidth: 64,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.outline,
        alignItems: "center",
    },
    optionText: { color: p.text, fontSize: 16, fontVariant: ["tabular-nums"] },
    panel: { gap: 10, paddingHorizontal: 16, paddingTop: 10 },
    healthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    healthTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: p.track, overflow: "hidden" },
    healthFill: { height: "100%", backgroundColor: p.game.health },
    healthText: { color: p.text, fontVariant: ["tabular-nums"], minWidth: 56, textAlign: "right" },
    lunchbox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    stats: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
    stat: { flexDirection: "row", alignItems: "center", gap: 6 },
    statText: { color: p.textMuted, fontVariant: ["tabular-nums"] },
    tierDot: { width: 10, height: 10, borderRadius: 5 },
    scrim: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: "center",
        backgroundColor: "rgba(4, 3, 3, 0.6)",
    },
    result: {
        alignItems: "center",
        gap: 10,
        paddingVertical: 22,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        borderRadius: 16,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.outline,
    },
    resultTitle: { color: p.text, fontSize: 22, fontWeight: "700" },
    resultBody: { color: p.textMuted, textAlign: "center" },
    resultActions: { flexDirection: "row", gap: 10, marginTop: 6 },
}));
