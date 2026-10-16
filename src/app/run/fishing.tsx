import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import CatchCard from "@/features/fishing/components/CatchCard";
import FightMeters from "@/features/fishing/components/FightMeters";
import FishIntents from "@/features/fishing/components/FishIntents";
import FishingScene from "@/features/fishing/components/FishingScene";
import { fishingApi } from "@/features/fishing/fishingApi";
import { QUALITY_TIER_COLORS, QUALITY_TIER_LABELS } from "@/features/fishing/fishingText";
import { useReportActivity } from "@/features/friends/presenceStore";
import { distanceMetres } from "@/features/location/distance";
import { usePlayerLocation } from "@/features/location/hooks/usePlayerLocation";
import { PLACE_REACH_METRES } from "@/features/places/places";
import { useAdminSettingsStore } from "@/features/settings/adminSettingsStore";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { packedSlots } from "@/features/lunchbox/lunchbox";
import { usePlayerStore } from "@/features/player/playerStore";
import { toInventoryItem } from "@/features/player/toInventoryItem";
import { useBait } from "@/features/player/usePlayer";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import RunHand from "@/features/run/components/RunHand";
import RunLunchbox from "@/features/run/components/RunLunchbox";
import RunScreen from "@/features/run/components/RunScreen";
import { toErrorMessage } from "@/lib/api";
import {
    GEO_FISHING_TIERS,
    type GeoFishingAction,
    type GeoFishingRunView,
    type GeoFishingTier,
    type GeoItemView,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** How long the bobber sits after a cast before the fish takes it. */
const BITE_DELAY_MS = 1500;

/**
 * How far past a place's reach you can drift before casting stops. A little
 * slack, so GPS wobble at the water's edge doesn't block a cast.
 */
const LEAVE_SLACK_METRES = 20;

const isFishingTier = (value: string | undefined): value is GeoFishingTier =>
    (GEO_FISHING_TIERS as readonly string[]).includes(value ?? "");

/**
 * A fishing Run at a fishing spot: cast, wait for the bobber to plunge,
 * strike, then fight the fish one card per turn until it lands or gets away.
 * Cast again as many times as you like; leaving the screen ends the Run.
 *
 * Casting needs you at the water: walk away and Cast is blocked until you're
 * back in reach. A bite or fight already under way can still be finished.
 *
 * Opened as `/run/fishing?name=…&tier=…&latitude=…&longitude=…` from a
 * fishing place. The server
 * runs every step: each cast takes one packed bait, each card a charge, and
 * a landed fish goes straight into the inventory. The fishing hand is locked
 * while the Run is open, like combat's. Fighting a sea creature swaps this
 * screen for the combat screen: the server has already started that fight.
 */
export default function FishingRunScreen() {
    useReportActivity("skilling", "fishing");
    const params = useLocalSearchParams<{ name?: string; tier?: string; latitude?: string; longitude?: string }>();
    const tier: GeoFishingTier = isFishingTier(params.tier) ? params.tier : "pond";
    const atSpot = useAtSpot(params.latitude, params.longitude);
    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    const items = usePlayerStore((state) => state.items);
    const bait = useBait();
    const packedBait = useMemo(() => packedSlots(bait.contents, items, "bait"), [bait.contents, items]);

    const [run, setRun] = useState<GeoFishingRunView | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [inspected, setInspected] = useState<InventoryItem | null>(null);
    const [biting, setBiting] = useState(false);

    // Open (or resume) the Run once per visit, and leave it when the screen
    // goes, however it goes: a fishing Run only lives while you're at the spot.
    const runId = useRef<string | null>(null);
    useEffect(() => {
        if (!isPlayerReady || runId.current) return;
        runId.current = "opening";
        fishingApi
            .start(tier)
            .then((opened) => {
                runId.current = opened.id;
                setRun(opened);
            })
            .catch((error: unknown) => setProblem(toErrorMessage(error)));
    }, [isPlayerReady, tier]);
    useEffect(
        () => () => {
            const id = runId.current;
            if (id && id !== "opening") {
                void fishingApi
                    .leave(id)
                    .catch(() => {})
                    // The fishing hand is free again.
                    .finally(() => void refreshPlayer());
            }
        },
        [refreshPlayer],
    );

    const act = useCallback(
        async (action: GeoFishingAction) => {
            if (!run || busy) return;
            if (action.type === "cast" && !atSpot) {
                showToast("Too far from the water to cast.", "error");
                return;
            }
            setBusy(true);
            if (action.type === "cast") setBiting(false);
            try {
                const next = await fishingApi.act(run.id, action);
                // The sea creature's fight has started, and the fishing Run is
                // over: on to the combat screen, which resumes it.
                if (next.outcome?.kind === "creature") {
                    runId.current = null;
                    void refreshPlayer();
                    router.replace("/run/combat");
                    return;
                }
                setRun(next);
                // A cast spent bait; a catch is in the inventory; cards spent charges.
                if (action.type === "cast" || next.phase === "over") void refreshPlayer();
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            } finally {
                setBusy(false);
            }
        },
        [run, busy, atSpot, refreshPlayer],
    );

    // The server hooks a bite on the cast; the bobber sits a moment first.
    const waiting = run?.phase === "waiting";
    useEffect(() => {
        if (!waiting) return;
        const timer = setTimeout(() => setBiting(true), BITE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [waiting]);

    const hand = useMemo(() => (run ? handItems(run, items) : []), [run, items]);

    if (!run) {
        return (
            <RunScreen
                kind="Fishing"
                leaveLabel="Back"
                onLeave={() => router.back()}
                arena={
                    <View style={styles.missing}>
                        <Text style={styles.missingText}>{problem ?? "Finding a good spot…"}</Text>
                    </View>
                }
                hand={null}
            />
        );
    }

    const { fight, phase } = run;

    return (
        <View style={styles.screen}>
            <RunScreen
                kind="Fishing"
                leaveLabel="Leave"
                onLeave={() => router.back()}
                arena={
                    <View style={styles.arena}>
                        <FishingScene phase={phase} biting={biting} fishId={run.fish?.fishId ?? null} fight={fight} />
                        <View style={styles.overlay} pointerEvents="box-none">
                            <View style={styles.statusRow}>
                                <Text style={styles.status}>{(phase === "waiting" && !biting ? "Waiting for a bite…" : run.message) || " "}</Text>
                                {phase === "fight" && run.lastTurn.length > 0 && (
                                    <Text style={styles.turnLog} numberOfLines={2}>
                                        {run.lastTurn.join(" · ")}
                                    </Text>
                                )}
                            </View>
                            {phase === "fight" && fight ? <FightMeters fight={fight} /> : <SpotInfo name={params.name} run={run} />}
                        </View>
                    </View>
                }
                turnOrder={
                    phase === "fight" && fight ? (
                        <FishIntents intents={fight.intents} reading={fight.statuses.reading > 0} />
                    ) : (
                        <PhaseActions
                            run={run}
                            act={act}
                            hasBait={packedBait.length > 0}
                            biting={biting}
                            atSpot={atSpot}
                            spotName={params.name}
                        />
                    )
                }
                hand={
                    <RunHand
                        cards={hand}
                        disabled={phase !== "fight" || busy}
                        onPlay={(card) => void act({ type: "play", inventoryId: card.id })}
                        onInspect={setInspected}
                        cornerMark={(card) => <FinesseMark finesse={items[card.itemId]?.finesse} />}
                        accessory={
                            <RunLunchbox kind="bait" packed={packedBait} unlocked={bait.slots} canUse={false} onUse={() => {}} />
                        }
                    />
                }
            />

            {inspected && (
                <Modal title={inspected.name} size="medium" showBack onClose={() => setInspected(null)}>
                    <ItemDetail item={inspected} />
                </Modal>
            )}

            {phase === "over" && run.outcome && (
                <View style={styles.outcomeScrim}>
                    <CatchCard
                        outcome={run.outcome}
                        actions={
                            <>
                                <OutcomeButton label="Leave" onPress={() => router.back()} />
                                <OutcomeButton
                                    label={!atSpot ? "Too far away" : packedBait.length > 0 ? "Cast again" : "Out of bait"}
                                    onPress={() => void act({ type: "cast" })}
                                    primary={atSpot && packedBait.length > 0}
                                />
                            </>
                        }
                    />
                </View>
            )}
        </View>
    );
}

/**
 * Whether you're still at the fishing spot. Until the first fix arrives you
 * count as there, since the Run only opens in reach. Without the spot's
 * coordinates there's nothing to check against, so you count as away. The
 * admin free camera lifts the limit, as it does on the map.
 */
function useAtSpot(latitude: string | undefined, longitude: string | undefined): boolean {
    const isFreeCamera = useAdminSettingsStore((state) => state.isFreeCamera);
    const { position } = usePlayerLocation();
    if (isFreeCamera) return true;
    const spot = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : null;
    if (!spot || !Number.isFinite(spot.latitude) || !Number.isFinite(spot.longitude)) return false;
    if (!position) return true;
    return distanceMetres(position, spot) <= PLACE_REACH_METRES + LEAVE_SLACK_METRES;
}

/** The Run's hand, drawn like the inventory draws cards, with the Run's charges. */
function handItems(run: GeoFishingRunView, items: Record<string, GeoItemView>): InventoryItem[] {
    return run.hand.flatMap((card) => {
        const def = items[card.itemId];
        if (!def) return [];
        const entry = { id: card.inventoryId, itemId: card.itemId, quantity: 1, chargesLeft: card.chargesLeft, reforge: null, pet: null, obtainedAt: "" };
        return [toInventoryItem(entry, def)];
    });
}

/**
 * The buttons for everything that isn't a card: casting, the bobber, a sea
 * creature, an outclassed fish. They sit where the fish's moves show during
 * a fight, just above the hand, so every choice is under the thumb.
 */
function PhaseActions({
    run,
    act,
    hasBait,
    biting,
    atSpot,
    spotName,
}: {
    run: GeoFishingRunView;
    act: (action: GeoFishingAction) => Promise<void>;
    hasBait: boolean;
    biting: boolean;
    atSpot: boolean;
    spotName: string | undefined;
}) {
    switch (run.phase) {
        case "ready":
        case "over":
            if (!atSpot) {
                return (
                    <Actions hint={`Walk back to ${spotName || "the water"} to cast.`}>
                        <OutcomeButton label="Too far away" onPress={() => void act({ type: "cast" })} />
                    </Actions>
                );
            }
            return (
                <Actions hint={hasBait ? "One bait per cast." : "Pack some bait first: the Angler sells worms."}>
                    <OutcomeButton label="Cast" onPress={() => void act({ type: "cast" })} primary={hasBait} />
                </Actions>
            );
        case "waiting":
            if (!biting) return null;
            return (
                <Actions hint="It's under: strike!">
                    <OutcomeButton label="Strike!" onPress={() => void act({ type: "strike" })} primary />
                </Actions>
            );
        case "creature":
            return (
                <Actions hint="Something huge is on the line. Low on health? Cut it.">
                    <OutcomeButton label="Cut the line" onPress={() => void act({ type: "cutLine" })} />
                    <OutcomeButton label="Fight it" onPress={() => void act({ type: "fightCreature" })} primary />
                </Actions>
            );
        case "outclassed":
            return (
                <Actions hint="Quick land is instant but always a regular fish. Play it out for a chance at quality.">
                    <OutcomeButton label="Quick land" onPress={() => void act({ type: "quickLand" })} primary />
                    <OutcomeButton label="Play it out" onPress={() => void act({ type: "playOut" })} />
                </Actions>
            );
        case "fight":
            return null;
    }
}

function Actions({ hint, children }: { hint: string; children: ReactNode }) {
    return (
        <View style={styles.actions}>
            <View style={styles.actionRow}>{children}</View>
            <Text style={styles.hint}>{hint}</Text>
        </View>
    );
}

/** Before a fight: where you are and what you're fishing with. */
function SpotInfo({ name, run }: { name: string | undefined; run: GeoFishingRunView }) {
    return (
        <View style={styles.spot}>
            <Text style={styles.spotName}>{name || "Fishing spot"}</Text>
            <Text style={styles.spotGear}>
                {run.rod.name} · Power {run.power} · quality up to{" "}
                <Text style={{ color: QUALITY_TIER_COLORS[run.rod.maxTier] }}>{QUALITY_TIER_LABELS[run.rod.maxTier]}</Text>
            </Text>
        </View>
    );
}

/** ✦ on a card that raises quality odds, ▼ on one that lowers them. */
function FinesseMark({ finesse }: { finesse: GeoItemView["finesse"] }) {
    if (!finesse) return null;
    return <Text style={finesse === "raises" ? styles.markUp : styles.markDown}>{finesse === "raises" ? "✦" : "▼"}</Text>;
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    arena: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        gap: 8,
    },
    statusRow: {
        alignItems: "center",
        gap: 2,
        minHeight: 22,
        paddingTop: 4,
        paddingHorizontal: 16,
    },
    status: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.5,
        textAlign: "center",
        textShadowColor: "#000",
        textShadowRadius: 3,
    },
    turnLog: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
        textShadowColor: "#000",
        textShadowRadius: 3,
    },
    spot: {
        alignItems: "center",
        gap: 2,
    },
    spotName: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
        textShadowColor: "#000",
        textShadowRadius: 3,
    },
    spotGear: {
        color: colors.textSecondary,
        fontSize: 12,
        textShadowColor: "#000",
        textShadowRadius: 3,
    },
    actions: {
        alignItems: "center",
        gap: 6,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
    },
    markUp: {
        color: colors.tierGold,
        fontSize: 10,
    },
    markDown: {
        color: colors.tensionDanger,
        fontSize: 9,
    },
    missing: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    missingText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontStyle: "italic",
        textAlign: "center",
    },
    outcomeScrim: {
        ...StyleSheet.absoluteFill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(4, 3, 3, 0.6)",
    },
});
