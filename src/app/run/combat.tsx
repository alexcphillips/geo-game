import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Animated, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Meter from "@/components/Meter/Meter";
import Combatant from "@/features/run/components/Combatant";
import EnemyIntent, { IntentSpacer } from "@/features/run/components/EnemyIntent";
import PreviewParts, { describeParts } from "@/features/run/components/PreviewParts";
import StatusChips from "@/features/run/components/StatusChips";
import RunHand from "@/features/run/components/RunHand";
import RunLunchbox from "@/features/run/components/RunLunchbox";
import { packedSlots } from "@/features/lunchbox/lunchbox";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import DuskBackdrop from "@/features/run/components/DuskBackdrop";
import RunScreen from "@/features/run/components/RunScreen";
import TurnOrder, { type TurnOrderEntry } from "@/features/run/components/TurnOrder";
import { displayName, playBattleLog } from "@/features/run/combat/playBattleLog";
import { runsApi } from "@/features/run/combat/runsApi";
import { HitEffectLayer } from "@/features/run/fx/HitEffects";
import { useCombatHits, type SideNumbers } from "@/features/run/fx/useCombatHits";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import DeathCard from "@/features/death/components/DeathCard";
import { showToast } from "@/components/Toast/toastStore";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import RewardGrid from "@/features/inventory/components/RewardGrid";
import ChestPicker from "@/features/chests/components/ChestPicker";
import { pendingChestActions } from "@/features/inbox/inboxStore";
import { refreshAfterRunStart } from "@/features/wardrobe/autoSwap";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { usePlayerStore } from "@/features/player/playerStore";
import { toInventoryItem } from "@/features/player/toInventoryItem";
import { SPRITES, spriteScale, type SpriteName } from "@/features/spawns/sprites";
import { combatDamageBonus, skillLabel, skillProgress, type SkillProgress } from "@/features/skills/skills";
import { toErrorMessage } from "@/lib/api";
import type {
    GeoChestSelection,
    GeoCombatantView,
    GeoIntentPart,
    GeoItemView,
    GeoRunResponse,
    GeoRunView,
    GeoStartRunRequest,
} from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, MoodProvider, useTheme } from "@/theme/theme";
import { useReportActivity } from "@/features/friends/presenceStore";

/** Natural aspect of `knight_portrait.png` (432×578). */
const PLAYER_ASPECT_RATIO = 432 / 578;
const PLAYER_HEIGHT = 210;
const ENEMY_HEIGHT = 96;

type CombatParams = {
    /** The spawn tapped on the map, and where the player stood when they tapped it. */
    spawn?: string;
    latitude?: string;
    longitude?: string;
    /** Dev servers only: fight this enemy anywhere, no spawn needed. */
    enemy?: string;
};

/** What to ask the server for, from the route's params; null for nothing. */
function startRequest(params: CombatParams): GeoStartRunRequest | null {
    if (params.spawn) {
        const position = { latitude: Number(params.latitude), longitude: Number(params.longitude) };
        return { kind: "combat", spawnId: params.spawn, position };
    }
    if (__DEV__ && params.enemy) return { kind: "combat", enemyId: params.enemy };
    return null;
}

/**
 * A combat Run: the player on the left, the enemy on the right, the turn
 * order and combat hand along the bottom.
 *
 * A route rather than a modal: a Run is a place you are *in* until it ends.
 * Opened as `/run/combat?spawn=…&latitude=…&longitude=…` from a map tap, or
 * bare to resume. The server runs the fight: a Run in progress is always
 * resumed first (there is only ever one), every card played is sent to it,
 * and its battle log is played back as the animation. Flee forfeits the Run;
 * leaving any other way (a swipe back) leaves it open to resume.
 */
export default function CombatRunScreen() {
    // Fights are always at dusk, whatever the time or the rest of the app.
    return (
        <MoodProvider mood="dusk">
            <CombatRunContent />
        </MoodProvider>
    );
}

function CombatRunContent() {
    const styles = useStyles();
    useReportActivity("fighting");
    const params = useLocalSearchParams<CombatParams>();
    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const [opened, setOpened] = useState<GeoRunResponse | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const request = useMemo(
        () => startRequest(params),
        // The params object changes identity each render; its values don't.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [params.spawn, params.latitude, params.longitude, params.enemy],
    );

    const startNew = useCallback(async () => {
        if (!request) {
            setProblem("Nothing here to fight.");
            return;
        }
        try {
            setOpened(await runsApi.start(request));
            void refreshAfterRunStart();
        } catch (error) {
            setProblem(toErrorMessage(error));
        }
    }, [request]);

    // Resume what's open, else start what was asked for. Once per visit.
    const didOpen = useRef(false);
    useEffect(() => {
        if (!isPlayerReady || didOpen.current) return;
        didOpen.current = true;
        void (async () => {
            try {
                const active = await runsApi.active();
                if (active) setOpened(active);
                else await startNew();
            } catch (error) {
                setProblem(toErrorMessage(error));
            }
        })();
    }, [isPlayerReady, startNew]);

    if (!opened) {
        return (
            <RunScreen
                kind="Combat"
                onLeave={() => router.back()}
                leaveLabel="Back"
                arena={
                    <View style={styles.missing}>
                        <Text style={styles.missingText}>{problem ?? "Finding your foe…"}</Text>
                    </View>
                }
                hand={null}
            />
        );
    }

    return (
        <CombatRun
            // A new Run is a fresh fight: remount rather than carry state over.
            key={opened.run.id}
            opened={opened}
            onFightAgain={
                request
                    ? () => {
                          setOpened(null);
                          setProblem(null);
                          void startNew();
                      }
                    : null
            }
        />
    );
}

const playerOf = (run: GeoRunView) => run.combatants.find((c) => c.side === "player");
/** The arena draws one enemy; the first is the one shown. */
const enemyOf = (run: GeoRunView) => run.combatants.find((c) => c.side === "enemy");

function numbersOf(run: GeoRunView, pick: (c: GeoCombatantView) => number): SideNumbers {
    const player = playerOf(run);
    const enemy = enemyOf(run);
    return { player: player ? pick(player) : 0, enemy: enemy ? pick(enemy) : 0 };
}

/**
 * Health before a log played: the server's figures after it, with the log's
 * damage given back and its healing taken away. HP carries between fights, so
 * a fresh Run can open below max.
 */
function healthBefore(response: GeoRunResponse): SideNumbers {
    const player = playerOf(response.run);
    const enemy = enemyOf(response.run);
    const before = (combatant: GeoCombatantView | undefined) => {
        if (!combatant) return 0;
        const net = response.log.reduce((sum, entry) => {
            if (entry.type === "damage" && entry.target === combatant.id) return sum + entry.amount;
            if (entry.type === "heal" && entry.target === combatant.id) return sum - entry.amount;
            return sum;
        }, 0);
        return Math.min(combatant.maxHealth, Math.max(0, combatant.health + net));
    };
    return { player: before(player), enemy: before(enemy) };
}

function spriteOf(name: string | undefined) {
    return SPRITES[name as SpriteName] ?? Object.values(SPRITES)[0]!;
}

/** A hand card, drawn like the inventory draws it. */
function handItems(run: GeoRunView, items: Record<string, GeoItemView>): InventoryItem[] {
    return run.hand.flatMap((card) => {
        const def = items[card.itemId];
        if (!def) return [];
        const entry = {
            id: card.inventoryId,
            itemId: card.itemId,
            quantity: 1,
            chargesLeft: card.chargesLeft,
            reforge: null,
            pet: null,
            obtainedAt: "",
        };
        return [toInventoryItem(entry, def)];
    });
}

function CombatRun({
    opened,
    onFightAgain,
}: {
    opened: GeoRunResponse;
    /** Start a new Run against the same spawn; null when there's no spawn to go back to. */
    onFightAgain: (() => void) | null;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const items = usePlayerStore((state) => state.items);
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    // Can't change mid-Run, so the slots unlocked when it started still hold.
    const lunchboxSlots = usePlayerStore((state) => state.me?.lunchbox.slots ?? 1);
    // Skill XP before this fight, for the level meter and level-up toasts on a win.
    const [skillXpBefore] = useState(() => usePlayerStore.getState().me?.skillXp ?? {});
    const xpBefore = skillXpBefore.combat ?? 0;

    // The opening log applies its own statuses as it plays, so start without them.
    const [run, setRun] = useState(() =>
        opened.log.length > 0
            ? { ...opened.run, combatants: opened.run.combatants.map((c) => ({ ...c, statuses: [] })) }
            : opened.run,
    );
    const [order, setOrder] = useState(opened.run.order);
    const [actorId, setActorId] = useState<string | null>(opened.run.currentActor);
    const [narration, setNarration] = useState<string | null>(null);
    // Counts enemy moves as the log plays them, to pulse the intent badge.
    const [enemyMoves, setEnemyMoves] = useState(0);
    // On while a log plays or a turn is in flight: no card can be played.
    const [isBusy, setIsBusy] = useState(opened.log.length > 0);
    const [inspected, setInspected] = useState<InventoryItem | null>(null);

    // A fresh Run's log is rewound to find where health stood before it; a
    // resumed one has no log, so it starts where the server says it is.
    const hasOpeningLog = opened.log.length > 0;
    const {
        playerRef,
        enemyRef,
        arenaRef,
        arenaShake,
        effects,
        removeEffect,
        health,
        guard,
        barrier,
        perform,
        dropGuard,
        sync,
    } = useCombatHits(
        hasOpeningLog ? healthBefore(opened) : numbersOf(opened.run, (c) => c.health),
        hasOpeningLog ? { player: 0, enemy: 0 } : numbersOf(opened.run, (c) => c.guard),
        // A starting barrier arrives in the opening log, like a cast one.
        hasOpeningLog ? { player: 0, enemy: 0 } : numbersOf(opened.run, (c) => c.barrier),
    );

    const player = playerOf(run);
    const enemy = enemyOf(run);
    const sprite = spriteOf(enemy?.sprite);

    /** Plays a log, then adopts the server's view of the Run as truth. */
    const play = useCallback(
        async (response: GeoRunResponse) => {
            const names = new Map(response.run.combatants.map((c) => [c.id, c.side === "player" ? "You" : c.name]));
            const cards = new Map(response.run.hand.map((card) => [card.cardId, items[card.itemId]?.name]));
            await playBattleLog(response.log, {
                sideOf: (id) => {
                    const combatant = response.run.combatants.find((c) => c.id === id);
                    if (!combatant) return null;
                    if (combatant.side === "player") return "player";
                    return combatant.id === enemyOf(response.run)?.id ? "enemy" : null;
                },
                nameOf: (id) => names.get(id) ?? displayName(id),
                cardName: (cardId) => cards.get(cardId) ?? displayName(cardId),
                foodName: (foodId) => items[foodId]?.name ?? displayName(foodId),
                perform,
                dropGuard,
                narrate: setNarration,
                setOrder,
                setActor: setActorId,
                onEnemyMove: () => setEnemyMoves((n) => n + 1),
                setStatus: (combatantId, statusId, stacks) =>
                    setRun((current) => ({
                        ...current,
                        combatants: current.combatants.map((c) => {
                            if (c.id !== combatantId) return c;
                            const others = c.statuses.filter((s) => s.statusId !== statusId);
                            if (stacks === null) return { ...c, statuses: others };
                            const existing = c.statuses.find((s) => s.statusId === statusId);
                            return {
                                ...c,
                                statuses: existing
                                    ? c.statuses.map((s) => (s.statusId === statusId ? { ...s, stacks } : s))
                                    : [...others, { statusId, stacks, turnsLeft: null }],
                            };
                        }),
                    })),
            });
            sync(
                numbersOf(response.run, (c) => c.health),
                numbersOf(response.run, (c) => c.guard),
                numbersOf(response.run, (c) => c.barrier),
            );
            setRun(response.run);
            setOrder(response.run.order);
            setActorId(response.run.currentActor);
            // Charges, loot and XP changed on the server: fetch them once it's over.
            if (response.run.status !== "active") void refreshPlayer();
        },
        [items, perform, dropGuard, sync, refreshPlayer],
    );

    // The opening log: an enemy faster than you acts before your first card.
    const playedOpening = useRef(false);
    useEffect(() => {
        if (playedOpening.current || !hasOpeningLog) return;
        playedOpening.current = true;
        void play(opened).finally(() => setIsBusy(false));
    }, [hasOpeningLog, opened, play]);

    const isOver = run.status !== "active";
    const isPlayerTurn = !isOver && !isBusy && actorId === player?.id;

    const playCard = async (card: InventoryItem) => {
        if (!isPlayerTurn) return;
        setIsBusy(true);
        try {
            await play(await runsApi.playCard(run.id, { inventoryId: card.id, targetId: enemy?.id }));
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsBusy(false);
        }
    };

    /** Eats from a lunchbox slot: the server takes the food, then applies it. */
    const eat = async (slot: number) => {
        if (!isPlayerTurn) return;
        setIsBusy(true);
        try {
            await play(await runsApi.playCard(run.id, { lunchboxSlot: slot }));
            // The stored lunchbox changed too, for the character screen.
            void refreshPlayer();
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsBusy(false);
        }
    };

    const flee = async () => {
        if (!isOver) {
            try {
                await runsApi.flee(run.id);
                void refreshPlayer();
            } catch (error) {
                // Leave anyway: an unfled Run is resumed, or abandoned after a while.
                showToast(toErrorMessage(error), "error");
            }
        }
        router.back();
    };

    const status = isOver
        ? null
        : (narration ??
          (isPlayerTurn ? "Your turn · play a card" : actorId === enemy?.id ? `${enemy?.name}'s turn` : "…"));

    // The strip shows who acts next on the left, so it turns with the Run.
    const turnEntries = useMemo<TurnOrderEntry[]>(() => {
        const start = Math.max(0, order.indexOf(actorId ?? ""));
        const rotated = [...order.slice(start), ...order.slice(0, start)];
        return rotated.flatMap((id): TurnOrderEntry[] => {
            const combatant = run.combatants.find((c) => c.id === id);
            if (!combatant) return [];
            return combatant.side === "player"
                ? [{ id, name: "You", image: require("@/features/character/assets/knight_head_portrait.png"), isPlayer: true }]
                : [{ id, name: combatant.name, image: { uri: spriteOf(combatant.sprite).uri } }];
        });
    }, [order, actorId, run.combatants]);

    const hand = useMemo(() => handItems(run, items), [run, items]);
    // What each card would do now, by inventory id: shown on the card while it's your turn.
    const previews = useMemo(
        () => new Map(run.hand.map((card) => [card.inventoryId, (card.preview ?? []).filter((part) => part.kind !== "status")])),
        [run],
    );
    // Ids of cards the server says can't be played now (a self-buff already up).
    const unplayable = useMemo(
        () => new Set(run.hand.filter((card) => card.playable === false).map((card) => card.inventoryId)),
        [run],
    );
    const lunchbox = useMemo(() => packedSlots(run.lunchbox, items), [run.lunchbox, items]);
    const drops = run.rewards?.items ?? [];
    // A win that gave chests: picked from here, or left pending for later.
    const chestReward = run.rewards?.chests ?? null;
    const [openedChests, setOpenedChests] = useState<GeoChestSelection | null>(null);
    const wonSelectionId = chestReward?.selectionId ?? null;
    useEffect(() => {
        if (wonSelectionId) pendingChestActions.won(wonSelectionId);
    }, [wonSelectionId]);
    // "Combat 12 → 13" for each skill this fight levelled up, once.
    const xpRewards = run.rewards?.xp ?? null;
    useEffect(() => {
        for (const { skill, amount } of xpRewards ?? []) {
            const before = skillProgress(skillXpBefore[skill] ?? 0).level;
            const after = skillProgress((skillXpBefore[skill] ?? 0) + amount).level;
            if (after > before) showToast(`${skillLabel(skill)} ${before} → ${after}`, "success");
        }
    }, [xpRewards, skillXpBefore]);
    const xpAmount = run.rewards?.xp.find((gain) => gain.skill === "combat")?.amount ?? 0;
    const xpGain = useMemo(() => {
        if (!xpAmount) return null;
        const before = skillProgress(xpBefore);
        const after = skillProgress(xpBefore + xpAmount);
        return { amount: xpAmount, after, levelledUp: after.level > before.level };
    }, [xpAmount, xpBefore]);

    return (
        <View style={styles.screen}>
            <RunScreen
                kind="Combat"
                onLeave={() => void flee()}
                leaveLabel={isOver ? "Leave" : "Flee"}
                arena={
                    <Animated.View
                        ref={arenaRef}
                        style={[styles.arenaFrame, { transform: [{ translateY: arenaShake }] }]}
                    >
                        <DuskBackdrop />
                        <View style={styles.statusRow}>
                            {status && (
                                <View style={styles.statusLine}>
                                    <Text style={[styles.status, isPlayerTurn && !narration && styles.statusYours]}>
                                        {status}
                                    </Text>
                                    {isPlayerTurn && !narration && <View style={styles.statusUnderline} />}
                                </View>
                            )}
                        </View>

                        <View style={styles.arena}>
                            <View style={styles.side}>
                                <Combatant
                                    ref={playerRef}
                                    image={require("@/features/character/assets/knight_portrait.png")}
                                    aspectRatio={PLAYER_ASPECT_RATIO}
                                    height={PLAYER_HEIGHT}
                                    name={player?.name ?? "You"}
                                    health={{ current: health.player, max: player?.maxHealth ?? 1, barrier: barrier.player }}
                                    flashOnHit={false}
                                    defense={player?.defense}
                                    guard={isOver ? 0 : guard.player}
                                />
                                <StatusChips combatant={player} />
                                <IntentSpacer />
                            </View>
                            <View style={styles.side}>
                                <Combatant
                                    ref={enemyRef}
                                    image={{ uri: sprite.uri }}
                                    aspectRatio={sprite.width / sprite.height}
                                    height={ENEMY_HEIGHT * spriteScale(enemy?.sprite)}
                                    name={enemy?.name}
                                    health={{ current: health.enemy, max: enemy?.maxHealth ?? 1, barrier: barrier.enemy }}
                                    defense={enemy?.defense}
                                    guard={isOver ? 0 : guard.enemy}
                                />
                                <StatusChips combatant={enemy} />
                                <EnemyIntent
                                    intent={isOver ? undefined : enemy?.intent}
                                    revealKey={`${run.round}:${enemy?.intent?.moveId ?? ""}`}
                                    active={isPlayerTurn}
                                    firedKey={enemyMoves}
                                />
                            </View>
                        </View>

                        <HitEffectLayer effects={effects} onDone={removeEffect} />
                    </Animated.View>
                }
                turnOrder={<TurnOrder entries={turnEntries} />}
                hand={
                    <RunHand
                        cards={hand}
                        onPlay={(card) => void playCard(card)}
                        disabled={!isPlayerTurn}
                        isPlayable={(card) => !unplayable.has(card.id)}
                        tag={(card) => <CardPreview parts={isPlayerTurn ? previews.get(card.id) : undefined} />}
                        accessory={
                            <RunLunchbox
                                packed={lunchbox}
                                unlocked={lunchboxSlots}
                                canUse={isPlayerTurn}
                                onUse={(slot) => void eat(slot)}
                            />
                        }
                    />
                }
            />

            {inspected && (
                <Modal
                    title="Rewards"
                    size="fill"
                    showBack
                    closePlacement="footer"
                    onClose={() => setInspected(null)}
                >
                    <ItemDetail item={inspected} />
                </Modal>
            )}

            {/* Over the whole screen, hand included, so nothing behind it can be
                played once the fight is over. Waits for the log to finish, so
                the killing blow is seen first. */}
            {isOver && !isBusy && run.status !== "fled" && (
                <View style={styles.outcomeScrim}>
                    {run.status === "victory" ? (
                        <Panel tone="surface" style={styles.outcome}>
                            <Text style={styles.outcomeTitle}>Victory</Text>
                            {xpGain && <XpGain {...xpGain} />}
                            {(drops.length > 0 || (run.rewards?.coins ?? 0) > 0) && (
                                <Text style={styles.lootLabel}>Rewards</Text>
                            )}
                            {(run.rewards?.coins ?? 0) > 0 && (
                                <View
                                    style={styles.coinReward}
                                    accessible
                                    accessibilityLabel={`Plus ${run.rewards?.coins} coins`}
                                >
                                    <Icon name="two-coins" size={18} color={palette.reward} />
                                    <Text style={styles.coinRewardText}>+{run.rewards?.coins}</Text>
                                </View>
                            )}
                            {chestReward ? (
                                <View style={styles.chests}>
                                    <ChestPicker
                                        selection={openedChests ?? { id: chestReward.selectionId, chests: chestReward.chests, opened: null }}
                                        onOpened={setOpenedChests}
                                        onInspect={setInspected}
                                    />
                                </View>
                            ) : (
                                <>
                                    <RewardGrid items={drops} onInspect={setInspected} />
                                    {drops.length > 0 && <Text style={styles.lootHint}>Hold a reward for details</Text>}
                                </>
                            )}
                            <View style={styles.outcomeActions}>
                                {chestReward && !openedChests ? (
                                    <OutcomeButton
                                        label="Decide later"
                                        onPress={() => {
                                            showToast("Your chests are waiting in Character → Chests", "info");
                                            router.back();
                                        }}
                                    />
                                ) : (
                                    <OutcomeButton label="Leave" onPress={() => router.back()} primary />
                                )}
                            </View>
                        </Panel>
                    ) : (
                        <DeathCard
                            body={
                                run.dungeonRunId
                                    ? `The ${(enemy?.name ?? "enemy").toLowerCase()} got the better of you. The dungeon is lost; your purse is safe.`
                                    : `The ${(enemy?.name ?? "enemy").toLowerCase()} got the better of you.`
                            }
                            coinsLost={run.dungeonRunId ? null : run.coinsLost}
                            actions={
                                <>
                                    {onFightAgain && !run.enemyLeft && (
                                        <OutcomeButton label="Fight again" onPress={onFightAgain} />
                                    )}
                                    <OutcomeButton label="Leave" onPress={() => router.back()} primary />
                                </>
                            }
                        />
                    )}
                </View>
            )}
        </View>
    );
}

/** A card's live effect on its target, pinned to its top edge: "⚔ 6", "⚔ 2 ×2". */
function CardPreview({ parts }: { parts: GeoIntentPart[] | undefined }) {
    const styles = useStyles();
    if (!parts || parts.length === 0) return null;
    return (
        <View style={styles.cardPreview} accessible accessibilityLabel={describeParts(parts, "player")}>
            <PreviewParts parts={parts} compact />
        </View>
    );
}

/** "+40 Combat XP", then the combat level's progress after it. */
function XpGain({
    amount,
    after,
    levelledUp,
}: {
    amount: number;
    after: SkillProgress;
    levelledUp: boolean;
}) {
    const palette = useTheme();
    const styles = useStyles();
    return (
        <View
            style={styles.xp}
            accessible
            accessibilityLabel={`Plus ${amount} combat XP. ${levelledUp ? `Combat level ${after.level}! ` : ""}${after.isMax ? "Max level." : `${after.xpIntoLevel} of ${after.xpForLevel} XP to level ${after.level + 1}.`}`}
        >
            <View style={styles.xpGainRow}>
                <Icon name="crossed-swords" size={16} color={palette.game.effect} />
                <Text style={styles.xpGain}>+{amount} Combat XP</Text>
            </View>
            {levelledUp && (
                <Text style={styles.levelUp}>
                    Combat level {after.level}! +{combatDamageBonus(after.level)}% damage
                </Text>
            )}
            <View style={styles.xpMeter}>
                <Text style={styles.xpLevel}>Lv {after.level}</Text>
                <Meter value={after.progress} style={styles.xpTrack} />
                <Text style={styles.xpCount}>
                    {after.isMax ? "Max" : `${after.xpIntoLevel}/${after.xpForLevel}`}
                </Text>
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    screen: {
        flex: 1,
    },
    lootLabel: {
        marginTop: 4,
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    chests: {
        marginTop: 6,
    },
    coinReward: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    coinRewardText: {
        color: p.reward,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    lootHint: {
        color: p.textMuted,
        fontSize: 11,
    },
    arenaFrame: {
        flex: 1,
    },
    side: {
        alignItems: "center",
    },
    // Both figures stand on the same ground line, a little below centre.
    arena: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        paddingHorizontal: 12,
        paddingBottom: "18%",
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        minHeight: 22,
        paddingTop: 4,
    },
    statusLine: {
        alignItems: "center",
        gap: 3,
    },
    status: {
        color: p.textMuted,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    // "Your turn" is the line that matters most: big, in lantern gold.
    statusYours: {
        color: p.primary,
        fontFamily: FONTS.display,
        fontSize: 26,
    },
    statusUnderline: {
        width: 48,
        height: 4,
        borderRadius: 2,
        backgroundColor: p.primary,
    },
    cardPreview: {
        paddingHorizontal: 7,
        height: 20,
        justifyContent: "center",
        borderRadius: 999,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    outcomeScrim: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(11, 10, 16, 0.6)",
    },
    outcome: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 22,
        paddingHorizontal: 26,
        marginHorizontal: 24,
    },
    xp: {
        alignItems: "center",
        gap: 6,
    },
    xpGainRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    xpGain: {
        color: p.game.effect,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    levelUp: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    xpMeter: {
        width: 200,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    xpLevel: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    xpTrack: {
        flex: 1,
    },
    xpCount: {
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    outcomeTitle: {
        color: p.primary,
        fontFamily: FONTS.display,
        fontSize: 30,
    },
    outcomeActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
    missing: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    missingText: {
        color: p.textMuted,
        fontSize: 14,
        fontStyle: "italic",
    },
}));
