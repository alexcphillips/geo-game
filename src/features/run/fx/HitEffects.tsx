import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    Mask,
    Path,
    RadialGradient,
    Stop,
} from "react-native-svg";
import Icon from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { HIT_TIMING as T } from "./hitTiming";

/**
 * The hit effects from the Combat Hit Lab, drawn with react-native-svg.
 *
 * Each effect is a short-lived component: it runs once on mount and calls
 * `onDone`, and the layer drops it. SVG properties (stroke offsets, radii,
 * endpoints) can't use the native driver, so these run on the JS thread; at
 * under half a second each that is fine, and Reanimated is the upgrade if a
 * busy JS thread ever makes them stutter.
 */

export type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };

export type HitEffect =
    | { id: number; kind: "slash"; target: Box; double?: boolean }
    | { id: number; kind: "burst"; target: Box; color: string }
    | { id: number; kind: "projectile"; from: Box; to: Box }
    | { id: number; kind: "label"; target: Box; text: string; tone: LabelTone; color?: string; defended?: number };

/**
 * Damage taken (red), a critical hit (gold, bigger), a block (blue), health
 * back (green), or a status coming or going (pale, smaller).
 */
export type LabelTone = "damage" | "crit" | "guard" | "barrier" | "heal" | "status";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

const centre = (box: Box): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** Draws every live effect over the arena. Ignores touches. */
export function HitEffectLayer({
    effects,
    onDone,
}: {
    effects: HitEffect[];
    onDone: (id: number) => void;
}) {
    return (
        <>
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                    <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor="#FFF6D6" />
                        <Stop offset="0.35" stopColor="#FFC35A" />
                        <Stop offset="0.7" stopColor="#E8632A" />
                        <Stop offset="1" stopColor="#E8632A" stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                {effects.map((effect) => {
                    const done = () => onDone(effect.id);
                    switch (effect.kind) {
                        case "slash":
                            return effect.double ? (
                                <G key={effect.id}>
                                    <Slash id={`${effect.id}a`} target={effect.target} onDone={() => {}} />
                                    {/* Starts as the first finishes drawing, so it ends last. */}
                                    <Slash
                                        id={`${effect.id}b`}
                                        target={effect.target}
                                        mirror
                                        delay={T.slashDraw}
                                        onDone={done}
                                    />
                                </G>
                            ) : (
                                <Slash key={effect.id} id={effect.id} target={effect.target} onDone={done} />
                            );
                        case "burst":
                            return <Burst key={effect.id} target={effect.target} color={effect.color} onDone={done} />;
                        case "projectile":
                            return <Projectile key={effect.id} from={effect.from} to={effect.to} onDone={done} />;
                        default:
                            return null;
                    }
                })}
            </Svg>
            {/* Text over SVG: floating labels are plain views, which can use
                the native driver. */}
            {effects.map((effect) =>
                effect.kind === "label" ? (
                    <FloatingLabel
                        key={effect.id}
                        target={effect.target}
                        text={effect.text}
                        tone={effect.tone}
                        color={effect.color}
                        defended={effect.defended}
                        onDone={() => onDone(effect.id)}
                    />
                ) : null,
            )}
        </>
    );
}

/** Length of a quadratic Bézier, by sampling. Exact enough for a dash. */
function quadLength(a: Point, c: Point, b: Point, steps = 24): number {
    let length = 0;
    let prev = a;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const point = {
            x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
            y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
        };
        length += Math.hypot(point.x - prev.x, point.y - prev.y);
        prev = point;
    }
    return length;
}

/**
 * A crescent swipe: a filled shape, thick in the middle and pointed at both
 * ends, revealed tip to tail by a mask whose stroke draws along its spine,
 * then faded out. A wider, faint stroke of the same shape stands in for glow.
 *
 * `mirror` flips it left to right, so a mirrored second slash crosses the
 * first in an X; `delay` holds it hidden before it draws.
 */
function Slash({
    id,
    target,
    mirror = false,
    delay = 0,
    onDone,
}: {
    id: number | string;
    target: Box;
    mirror?: boolean;
    delay?: number;
    onDone: () => void;
}) {
    const [draw] = useState(() => new Animated.Value(0));
    const [fade] = useState(() => new Animated.Value(1));

    const c = centre(target);
    const r = Math.max(target.width, target.height) * 0.8;
    const sx = mirror ? -1 : 1;
    const start = { x: c.x - sx * r, y: c.y - r * 0.6 };
    const end = { x: c.x + sx * r * 0.95, y: c.y + r * 0.55 };
    const outer = { x: c.x + sx * r * 0.35, y: c.y - r * 0.55 };
    const inner = { x: c.x + sx * r * 0.1, y: c.y - r * 0.2 };
    const spineControl = { x: (outer.x + inner.x) / 2, y: (outer.y + inner.y) / 2 };
    const crescent =
        `M ${start.x} ${start.y} Q ${outer.x} ${outer.y} ${end.x} ${end.y} ` +
        `Q ${inner.x} ${inner.y} ${start.x} ${start.y} Z`;
    const spine = `M ${start.x} ${start.y} Q ${spineControl.x} ${spineControl.y} ${end.x} ${end.y}`;
    const length = quadLength(start, spineControl, end);

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(draw, {
                toValue: 1,
                duration: T.slashDraw,
                easing: Easing.bezier(0.2, 0.7, 0.3, 1),
                useNativeDriver: false,
            }),
            Animated.timing(fade, { toValue: 0, duration: T.slashFade, useNativeDriver: false }),
        ]).start(onDone);
        // Runs once per effect; onDone is stable for its lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const maskId = `slash-${id}`;
    return (
        <>
            <Defs>
                <Mask id={maskId} maskUnits="userSpaceOnUse">
                    <AnimatedPath
                        d={spine}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={r * 0.7}
                        strokeLinecap="round"
                        strokeDasharray={[length, length]}
                        strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })}
                    />
                </Mask>
            </Defs>
            <AnimatedG mask={`url(#${maskId})`} opacity={fade}>
                <Path d={crescent} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeOpacity={0.3} strokeLinejoin="round" />
                <Path d={crescent} fill="#FFFFFF" />
            </AnimatedG>
        </>
    );
}

/** An expanding ring plus rays shooting outward, all fading to nothing. */
function Burst({ target, color, onDone }: { target: Box; color: string; onDone: () => void }) {
    const [progress] = useState(() => new Animated.Value(0));
    const c = centre(target);

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: T.burst,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start(onDone);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fade = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const from = 8;
    const travel = T.burstRingTo - 2;

    return (
        <G>
            <AnimatedCircle
                cx={c.x}
                cy={c.y}
                r={progress.interpolate({ inputRange: [0, 1], outputRange: [T.burstRingFrom, T.burstRingTo] })}
                fill="none"
                stroke={color}
                strokeWidth={progress.interpolate({ inputRange: [0, 1], outputRange: [4, 0.5] })}
                opacity={fade}
            />
            {Array.from({ length: T.burstRays }, (_, i) => {
                const angle = (i / T.burstRays) * Math.PI * 2 + 0.3;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                const along = (base: number, axis: number, offset: number) =>
                    progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [base + axis * offset, base + axis * (offset + travel)],
                    });
                return (
                    <AnimatedLine
                        key={i}
                        x1={along(c.x, dx, from)}
                        y1={along(c.y, dy, from)}
                        x2={along(c.x, dx, from + 10)}
                        y2={along(c.y, dy, from + 10)}
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                        opacity={fade}
                    />
                );
            })}
        </G>
    );
}

/**
 * A glowing orb on a shallow arc from caster to target, trailed by fading
 * copies. The arc is sampled into a piecewise-linear interpolation, since
 * Animated can't evaluate a curve directly.
 */
function Projectile({ from, to, onDone }: { from: Box; to: Box; onDone: () => void }) {
    const [t] = useState(() => new Animated.Value(0));
    const a = centre(from);
    const b = centre(to);
    const mid = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - T.projectileArc };

    useEffect(() => {
        Animated.timing(t, {
            toValue: 1,
            duration: T.projectile,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(onDone);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bezier = (u: number): Point => ({
        x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * mid.x + u ** 2 * b.x,
        y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * mid.y + u ** 2 * b.y,
    });

    /** Position along the arc for an orb that lags `lag` behind the lead. */
    const track = (lag: number, axis: "x" | "y") => {
        const samples = 16;
        const inputRange: number[] = lag > 0 ? [0] : [];
        const outputRange: number[] = lag > 0 ? [bezier(0)[axis]] : [];
        for (let k = 0; k <= samples; k++) {
            const input = lag + (k / samples) * (1 - lag);
            if (inputRange.length > 0 && input <= inputRange[inputRange.length - 1]!) continue;
            inputRange.push(input);
            outputRange.push(bezier(input - lag)[axis]);
        }
        return t.interpolate({ inputRange, outputRange });
    };

    return (
        <G>
            {Array.from({ length: T.trail + 1 }, (_, i) => T.trail - i).map((lagIndex) => (
                <AnimatedCircle
                    key={lagIndex}
                    cx={track(lagIndex * 0.045, "x")}
                    cy={track(lagIndex * 0.045, "y")}
                    r={lagIndex === 0 ? 11 : 9 - lagIndex}
                    fill="url(#orb)"
                    opacity={lagIndex === 0 ? 1 : 0.5 - lagIndex * 0.1}
                />
            ))}
        </G>
    );
}

/**
 * Text popping up over a target, rising and fading: "−12" in red for damage,
 * bigger and gold for a crit, "Guard" in blue for a block.
 */
function FloatingLabel({
    target,
    text,
    tone,
    color,
    defended = 0,
    onDone,
}: {
    target: Box;
    text: string;
    tone: LabelTone;
    /** Overrides the tone's colour, e.g. a status's own hue. */
    color?: string;
    /** Stopped by the target's defense: a small shield and number under the damage. */
    defended?: number;
    onDone: () => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const crit = tone === "crit";
    const [progress] = useState(() => new Animated.Value(0));
    const c = centre(target);

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: T.damageRise,
            easing: Easing.bezier(0.2, 0.7, 0.3, 1),
            useNativeDriver: true,
        }).start(onDone);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pop = crit ? 1.35 : 1.1;
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.damage,
                {
                    left: c.x - 60,
                    // Centred where the old 40-high box was; the extra room is for the defense line.
                    top: c.y - target.height * 0.35 - 28,
                    opacity: progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 0] }),
                    transform: [
                        {
                            translateY: progress.interpolate({
                                inputRange: [0, 0.18, 1],
                                outputRange: [0, -8, -T.damageLift],
                            }),
                        },
                        {
                            scale: progress.interpolate({
                                inputRange: [0, 0.18, 1],
                                outputRange: [0.6, pop, 1],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Text
                style={[
                    styles.damageText,
                    crit && styles.damageCrit,
                    tone === "guard" && styles.guardText,
                    tone === "barrier" && styles.barrierText,
                    tone === "heal" && styles.healText,
                    tone === "status" && styles.statusText,
                    color !== undefined && { color },
                ]}
            >
                {text}
            </Text>
            {defended > 0 && (
                <View style={styles.defended}>
                    <Icon name="shield" size={11} color={palette.textMuted} />
                    <Text style={styles.defendedText}>{defended}</Text>
                </View>
            )}
        </Animated.View>
    );
}

const useStyles = createStyles((p) => ({
    // A fixed-width box centred on the target, so the number centres on it.
    damage: {
        position: "absolute",
        width: 120,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    damageText: {
        color: p.game.damage,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
        textShadowColor: "#000000",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 3,
    },
    damageCrit: {
        color: p.game.effect,
        fontSize: 28,
    },
    guardText: {
        color: p.game.guard,
        fontSize: 18,
    },
    barrierText: {
        color: p.game.barrierGradient[1],
        fontSize: 18,
    },
    healText: {
        color: p.heal,
    },
    defended: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        marginTop: -2,
    },
    defendedText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
        textShadowColor: "#000000",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statusText: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
}));
