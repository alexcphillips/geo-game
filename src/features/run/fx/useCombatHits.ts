import { useCallback, useRef, useState } from "react";
import { Animated, Easing, type View } from "react-native";
import type { CombatantHandle } from "@/features/run/components/Combatant";
import { colors } from "@/theme/colors";
import type { Box, HitEffect, LabelTone } from "./HitEffects";
import { HIT_TIMING as T } from "./hitTiming";

export type Side = "player" | "enemy";

/**
 * One thing to show happening. The numbers are already decided by the
 * server; a move only says how to draw them.
 */
export type Move =
    | {
          /** A blow from one side to the other. */
          kind: "attack";
          attacker: Side;
          /** How the attack travels: a lunge to contact, or a projectile. */
          delivery: "lunge" | "projectile";
          /** A slash over the target as it lands; "double" adds a mirrored second. */
          slash: false | "single" | "double";
          /** Health lost, after guard and barrier. */
          dealt: number;
          /** Soaked by guard. */
          blocked: number;
          /** Soaked by barrier. */
          absorbed: number;
          /** Stopped by the target's defense. */
          defended: number;
          crit: boolean;
          burstColor: string;
      }
    | {
          /** Damage with no attacker behind it: a burn, a talisman's lightning. */
          kind: "hit";
          target: Side;
          dealt: number;
          blocked: number;
          absorbed: number;
          defended: number;
          color: string;
      }
    | { kind: "heal"; target: Side; amount: number }
    | {
          kind: "block";
          side: Side;
          /** Guard added, soaking the next hits. */
          amount: number;
      }
    | {
          kind: "barrier";
          side: Side;
          /** The barrier is now this: set, not added to. */
          amount: number;
      }
    /** Just words over a combatant: a status taken or lost, a skipped turn. */
    | { kind: "label"; target: Side; text: string; tone: LabelTone; color?: string };

const GUARD_COLOR = colors.guard;
const BARRIER_COLOR = colors.barrierGradient[0];
const HEAL_COLOR = colors.toastSuccess;

/** Health, guard or barrier for both sides, as the arena shows them. */
export type SideNumbers = Record<Side, number>;

const other = (side: Side): Side => (side === "player" ? "enemy" : "player");

/** How long after contact before the next move may start. */
const SETTLE_MS = 520;
/** Shorter beats for things that aren't blows. */
const SHORT_SETTLE_MS = 320;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Plays moves: the attacker moves, effects fire at contact, the target
 * reacts, its number pops and its health drains. Every number comes from the
 * server's battle log; this only decides how it looks and when.
 *
 * `perform` resolves once the move has settled, so a log can be played one
 * entry after another. `sync` snaps health and guard to the server's figures
 * once a log is done, so nothing drawn can drift from the truth.
 */
export function useCombatHits(initialHealth: SideNumbers, initialGuard: SideNumbers, initialBarrier: SideNumbers) {
    const playerRef = useRef<CombatantHandle>(null);
    const enemyRef = useRef<CombatantHandle>(null);
    const arenaRef = useRef<View>(null);
    const [arenaShake] = useState(() => new Animated.Value(0));
    const [effects, setEffects] = useState<HitEffect[]>([]);
    const [health, setHealth] = useState<SideNumbers>(initialHealth);
    const [guard, setGuard] = useState<SideNumbers>(initialGuard);
    const [barrier, setBarrier] = useState<SideNumbers>(initialBarrier);
    // Mirrors of state, read synchronously inside `perform`.
    const healthRef = useRef(initialHealth);
    const guardRef = useRef(initialGuard);
    const barrierRef = useRef(initialBarrier);
    const nextId = useRef(0);

    const handle = (side: Side) => (side === "player" ? playerRef : enemyRef).current;

    /** A combatant's box relative to the arena, which is where effects draw. */
    const boxOf = useCallback(async (side: Side): Promise<Box | null> => {
        const combatant = handle(side);
        const arena = arenaRef.current;
        if (!combatant || !arena) return null;

        const [figure, origin] = await Promise.all([
            combatant.measure(),
            new Promise<{ x: number; y: number }>((resolve) =>
                arena.measureInWindow((x, y) => resolve({ x, y })),
            ),
        ]);
        return { ...figure, x: figure.x - origin.x, y: figure.y - origin.y };
    }, []);

    const add = useCallback((effect: NewEffect) => {
        const id = nextId.current++;
        setEffects((current) => [...current, { ...effect, id } as HitEffect]);
    }, []);

    const removeEffect = useCallback((id: number) => {
        setEffects((current) => current.filter((effect) => effect.id !== id));
    }, []);

    const shakeArena = useCallback(() => {
        const steps = [-6, 5, -4, 3, 0];
        Animated.sequence(
            steps.map((toValue) =>
                Animated.timing(arenaShake, {
                    toValue,
                    duration: T.critScreenShake / steps.length,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ),
        ).start();
    }, [arenaShake]);

    const setGuardFor = (side: Side, amount: number) => {
        guardRef.current = { ...guardRef.current, [side]: Math.max(0, amount) };
        setGuard(guardRef.current);
    };

    const setBarrierFor = (side: Side, amount: number) => {
        barrierRef.current = { ...barrierRef.current, [side]: Math.max(0, amount) };
        setBarrier(barrierRef.current);
    };

    const setHealthFor = (side: Side, amount: number) => {
        healthRef.current = { ...healthRef.current, [side]: Math.max(0, amount) };
        setHealth(healthRef.current);
    };

    /** Damage landing on a side: guard and barrier spent, number popped, health drained. */
    const land = useCallback(
        async (target: Side, dealt: number, blocked: number, absorbed: number, defended: number, color: string, tone: LabelTone) => {
            if (blocked > 0) setGuardFor(target, guardRef.current[target] - blocked);
            if (absorbed > 0) setBarrierFor(target, barrierRef.current[target] - absorbed);
            const box = await boxOf(target);
            if (box) {
                // Nothing got through: show what stopped it, the barrier when guard had no part.
                const soak = blocked > 0 ? { color: GUARD_COLOR, text: "Blocked", tone: "guard" as const } : { color: BARRIER_COLOR, text: "Absorbed", tone: "barrier" as const };
                const isSoaked = dealt === 0 && blocked + absorbed > 0;
                add({ kind: "burst", target: box, color: isSoaked ? soak.color : color });
                add({
                    kind: "label",
                    target: box,
                    text: isSoaked ? soak.text : `−${dealt}`,
                    tone: isSoaked ? soak.tone : tone,
                    defended,
                });
            }
            handle(target)?.react();
            setHealthFor(target, healthRef.current[target] - dealt);
        },
        [add, boxOf],
    );

    const perform = useCallback(
        async (move: Move): Promise<void> => {
            switch (move.kind) {
                case "block": {
                    const box = await boxOf(move.side);
                    if (box) {
                        add({ kind: "burst", target: box, color: GUARD_COLOR });
                        add({ kind: "label", target: box, text: `Guard ${move.amount}`, tone: "guard" });
                    }
                    setGuardFor(move.side, guardRef.current[move.side] + move.amount);
                    await wait(SETTLE_MS);
                    return;
                }
                case "barrier": {
                    const box = await boxOf(move.side);
                    if (box) {
                        add({ kind: "burst", target: box, color: BARRIER_COLOR });
                        add({ kind: "label", target: box, text: `Barrier ${move.amount}`, tone: "barrier" });
                    }
                    setBarrierFor(move.side, move.amount);
                    await wait(SETTLE_MS);
                    return;
                }
                case "heal": {
                    const box = await boxOf(move.target);
                    if (box) {
                        add({ kind: "burst", target: box, color: HEAL_COLOR });
                        add({ kind: "label", target: box, text: `+${move.amount}`, tone: "heal" });
                    }
                    setHealthFor(move.target, healthRef.current[move.target] + move.amount);
                    await wait(SHORT_SETTLE_MS);
                    return;
                }
                case "label": {
                    const box = await boxOf(move.target);
                    if (box) add({ kind: "label", target: box, text: move.text, tone: move.tone, color: move.color });
                    await wait(SHORT_SETTLE_MS);
                    return;
                }
                case "hit":
                    await land(move.target, move.dealt, move.blocked, move.absorbed, move.defended, move.color, "damage");
                    await wait(SHORT_SETTLE_MS);
                    return;
                case "attack": {
                    const targetSide = other(move.attacker);
                    const attacker = handle(move.attacker);
                    if (!attacker || !handle(targetSide)) return;

                    if (move.delivery === "lunge") {
                        await attacker.lunge(move.attacker === "player" ? 1 : -1);
                    } else {
                        const [from, to] = await Promise.all([boxOf(move.attacker), boxOf(targetSide)]);
                        if (from && to) {
                            add({ kind: "projectile", from, to });
                            await wait(T.projectile);
                        }
                    }

                    if (move.slash) {
                        const box = await boxOf(targetSide);
                        if (box) add({ kind: "slash", target: box, double: move.slash === "double" });
                    }
                    await land(
                        targetSide,
                        move.dealt,
                        move.blocked,
                        move.absorbed,
                        move.defended,
                        move.burstColor,
                        move.crit ? "crit" : "damage",
                    );
                    if (move.crit) shakeArena();
                    await wait(SETTLE_MS);
                    return;
                }
            }
        },
        [add, boxOf, land, shakeArena],
    );

    /** Guard lapses when its bearer's next turn starts. */
    const dropGuard = useCallback((side: Side) => {
        guardRef.current = { ...guardRef.current, [side]: 0 };
        setGuard(guardRef.current);
    }, []);

    /** Snaps to the server's numbers, e.g. after a log or when resuming. */
    const sync = useCallback((nextHealth: SideNumbers, nextGuard: SideNumbers, nextBarrier: SideNumbers) => {
        healthRef.current = nextHealth;
        guardRef.current = nextGuard;
        barrierRef.current = nextBarrier;
        setHealth(nextHealth);
        setGuard(nextGuard);
        setBarrier(nextBarrier);
    }, []);

    return {
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
    };
}

/** `Omit` that keeps a union a union, so each effect kind keeps its own fields. */
type NewEffect = HitEffect extends infer E ? (E extends HitEffect ? Omit<E, "id"> : never) : never;
