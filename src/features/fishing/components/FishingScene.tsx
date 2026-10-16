import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import FishDrawing, { fishLength } from "@/features/fishing/components/FishDrawing";
import { fishArt, type FishArt } from "@/features/fishing/fishArt";
import { INTENTS } from "@/features/fishing/fishingText";
import type { GeoFishIntent, GeoFishingFightView, GeoFishingPhase } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

type FishingSceneProps = {
    phase: GeoFishingPhase;
    /** While waiting: whether the bobber has plunged under yet. */
    biting: boolean;
    /** The hooked fish; drawn as a dark shape, never named. */
    fishId: string | null;
    fight: GeoFishingFightView | null;
};

/** A fish's depth by the move it's making, as a share of the water's height. */
const INTENT_DEPTH = { run: 0.3, thrash: 0.26, dive: 0.62, rest: 0.18, jump: 0.04 } as const;

/**
 * The fishing spot: the angler on a dock at dusk, the line, and whatever is
 * on the end of it. Drawn in pixels from its own size, so it fills any arena.
 *
 * Distance places the fish across the water, its move sets its depth, and
 * the line's colour is the Tension, so the scene reads the fight at a glance
 * and the meters give the exact numbers. Moving parts (bobber, a thrashing
 * fish, ripples) are Animated views laid over the drawing.
 */
export default function FishingScene({ phase, biting, fishId, fight }: FishingSceneProps) {
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
    };

    return (
        <View style={styles.scene} onLayout={onLayout}>
            {size && <Drawing {...size} phase={phase} biting={biting} fishId={fishId} fight={fight} />}
        </View>
    );
}

function Drawing({ width: W, height: H, phase, biting, fishId, fight }: FishingSceneProps & { width: number; height: number }) {
    const fish = fishId ? fishArt(fishId) : null;
    const horizon = Math.round(H * 0.3);
    const waterH = H - horizon;
    const dockEnd = Math.min(120, W * 0.3);

    // The rod bends further the harder the line pulls.
    const pull = fight ? Math.min(1, Math.max(0, fight.tension / fight.cap)) : 0.15;
    const hands = { x: 64, y: horizon - 30 };
    const tip = { x: hands.x + 84 - 22 * pull, y: horizon - 82 + 34 * pull };

    const lineColor = !fight
        ? colors.textSecondary
        : fight.tension > fight.cap * 0.9
          ? colors.tensionDanger
          : fight.tension > fight.zoneHigh
            ? colors.tensionHigh
            : fight.tension < fight.zoneLow
              ? colors.tensionSlack
              : colors.textPrimary;

    // Where the line ends, and what's there.
    const bobber = { x: W * 0.64, y: horizon + 6 };
    let fishAt: { x: number; y: number; length: number } | null = null;
    if (fish && (phase === "fight" || phase === "outclassed")) {
        const length = fishLength(fish, Math.min(1, W / 420));
        const reach = fight ? Math.min(1, fight.distance / fight.maxDistance) : 0.4;
        const near = dockEnd + length / 2 + 12;
        const far = W - length / 2 - 18;
        const depth = fight ? (fight.exhausted ? 0.08 : INTENT_DEPTH[fight.intents[0] ?? "run"]) : 0.12;
        fishAt = { x: near + (far - near) * reach, y: horizon + 14 + depth * (waterH - 40), length };
    }

    const intent = fight?.intents[0];

    return (
        <>
            <Svg width={W} height={H}>
                <Defs>
                    <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.sceneSkyTop} />
                        <Stop offset="1" stopColor={colors.sceneSkyHorizon} />
                    </LinearGradient>
                    <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.sceneWaterTop} />
                        <Stop offset="1" stopColor={colors.sceneWaterDeep} />
                    </LinearGradient>
                </Defs>

                <Rect x={0} y={0} width={W} height={horizon} fill="url(#sky)" />
                {/* The far shore. */}
                <Path d={shoreline(W, horizon)} fill="#141017" />
                <Rect x={0} y={horizon} width={W} height={waterH} fill="url(#water)" />
                <Line x1={0} y1={horizon} x2={W} y2={horizon} stroke={colors.sceneFoam} strokeOpacity={0.3} />

                {/* The dock and the angler on it. */}
                <Rect x={0} y={horizon - 8} width={dockEnd} height={8} fill="#3B2A1F" />
                {[0.15, 0.55, 0.92].map((at) => (
                    <Rect key={at} x={dockEnd * at} y={horizon} width={6} height={48} fill="#2A1D15" />
                ))}
                <G transform={`translate(${hands.x - 66}, ${horizon - 112})`} fill="#0B0A0D">
                    <Path d="M52 112 L56 88 L62 88 L60 112 Z" />
                    <Path d="M62 112 L64 88 L70 88 L70 112 Z" />
                    <Path d="M50 90 Q50 64 62 62 Q74 64 74 90 Z" />
                    <Circle cx={62} cy={55} r={8} />
                    <Path d="M70 70 L84 80 L80 84 L68 76 Z" />
                </G>
                <Rod hands={hands} tip={tip} pull={pull} />

                {/* The line. */}
                {phase === "waiting" ? (
                    <Path
                        d={`M${tip.x} ${tip.y} Q${(tip.x + bobber.x) / 2} ${bobber.y - 4} ${bobber.x} ${bobber.y}`}
                        stroke={colors.textSecondary}
                        strokeWidth={0.9}
                        fill="none"
                    />
                ) : phase === "creature" ? (
                    <Line x1={tip.x} y1={tip.y} x2={W * 0.7} y2={horizon + 10} stroke={colors.textPrimary} strokeWidth={1} />
                ) : fishAt ? (
                    <Path
                        d={`M${tip.x} ${tip.y} Q${(tip.x + fishAt.x - fishAt.length / 2) / 2} ${Math.max(tip.y, fishAt.y) + (1 - pull) * 50 - 30} ${fishAt.x - fishAt.length / 2} ${fishAt.y}`}
                        stroke={lineColor}
                        strokeWidth={0.8 + pull * 1.2}
                        fill="none"
                    />
                ) : (
                    <Path
                        d={`M${tip.x} ${tip.y} Q${tip.x + 6} ${horizon - 20} ${tip.x + 4} ${horizon}`}
                        stroke={colors.textSecondary}
                        strokeWidth={0.8}
                        fill="none"
                        opacity={0.6}
                    />
                )}
            </Svg>

            {phase === "waiting" && <Bobber x={bobber.x} y={bobber.y} bite={biting} />}

            {phase === "creature" && <SeaCreature x={W * 0.7} top={horizon} width={W} />}

            {fish && fishAt && (
                <FloatingFish
                    fish={fish}
                    {...fishAt}
                    surfaceY={horizon}
                    thrashing={intent === "thrash" && !fight?.exhausted}
                    jumping={intent === "jump" && !fight?.exhausted}
                    tilt={fight?.exhausted ? 18 : intent === "dive" ? -18 : 0}
                />
            )}

            {fishAt && (phase === "outclassed" || (intent && phase === "fight")) && (
                <ScenePill
                    x={fishAt.x}
                    y={fishAt.y - fishAt.length * (fish?.height ?? 0.3) * 0.8 - 26}
                    width={W}
                    text={phase === "outclassed" ? "Outclassed" : `${INTENTS[intent!].glyph} ${INTENTS[intent!].label}`}
                    color={phase === "outclassed" ? colors.emberBright : intentColor(intent!)}
                />
            )}
        </>
    );
}

type Point = { x: number; y: number };

/** A point on a quadratic curve, `t` from 0 (start) to 1 (end). */
function onCurve(a: Point, c: Point, b: Point, t: number): Point {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** The part of a quadratic curve from its start to `t`, as an SVG path. */
function curveTo(a: Point, c: Point, b: Point, t: number): string {
    const control = { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t };
    const end = onCurve(a, c, b, t);
    return `M${a.x} ${a.y} Q${control.x} ${control.y} ${end.x} ${end.y}`;
}

/**
 * A carbon spinning rod: a cork grip behind the hands, a reel hanging under
 * it, a blank that tapers to the tip with line guides along it, and an ember
 * wrap at the tip. It bends with the pull on the line.
 */
function Rod({ hands, tip, pull }: { hands: Point; tip: Point; pull: number }) {
    const bend = { x: (hands.x + tip.x) / 2 + 6 * pull, y: (hands.y + tip.y) / 2 - 12 + 16 * pull };
    const blank = `M${hands.x} ${hands.y} Q${bend.x} ${bend.y} ${tip.x} ${tip.y}`;
    // Back along the rod's first direction, for the grip behind the hands.
    const length = Math.hypot(bend.x - hands.x, bend.y - hands.y) || 1;
    const back = { x: (hands.x - bend.x) / length, y: (hands.y - bend.y) / length };
    const butt = { x: hands.x + back.x * 16, y: hands.y + back.y * 16 };
    const foregrip = { x: hands.x - back.x * 6, y: hands.y - back.y * 6 };
    const reel = { x: hands.x - back.x * 2 + 1, y: hands.y + 6 };
    const tipWrap = onCurve(hands, bend, tip, 0.94);

    return (
        <G>
            {/* Grip: cork from the butt to just past the hands, with an end cap. */}
            <Line x1={butt.x} y1={butt.y} x2={foregrip.x} y2={foregrip.y} stroke={colors.rodGrip} strokeWidth={4.5} strokeLinecap="round" />
            <Circle cx={butt.x} cy={butt.y} r={2.6} fill={colors.rodBlank} />
            {/* Reel, hanging under the rod. */}
            <Line x1={hands.x} y1={hands.y} x2={reel.x} y2={reel.y} stroke={colors.rodReel} strokeWidth={1.5} />
            <Circle cx={reel.x} cy={reel.y} r={4.5} fill={colors.rodBlank} stroke={colors.rodReel} strokeWidth={1.4} />
            <Circle cx={reel.x} cy={reel.y} r={1.6} fill={colors.rodReel} />
            <Line x1={reel.x} y1={reel.y} x2={reel.x + 5} y2={reel.y + 3} stroke={colors.rodReel} strokeWidth={1.2} strokeLinecap="round" />
            {/* The blank, tapering: thick through the butt section, fine at the tip. */}
            <Path d={blank} stroke={colors.rodBlank} strokeWidth={1.4} strokeLinecap="round" fill="none" />
            <Path d={curveTo(hands, bend, tip, 0.55)} stroke={colors.rodBlank} strokeWidth={2.8} strokeLinecap="round" fill="none" />
            <Path d={curveTo(hands, bend, tip, 0.5)} stroke={colors.rodHighlight} strokeWidth={0.7} strokeLinecap="round" fill="none" />
            {/* Line guides. */}
            {[0.3, 0.55, 0.76, 0.92].map((t) => {
                const at = onCurve(hands, bend, tip, t);
                return <Circle key={t} cx={at.x} cy={at.y + 1.6} r={1.5} fill="none" stroke={colors.rodReel} strokeWidth={0.8} />;
            })}
            <Path d={`M${tipWrap.x} ${tipWrap.y} L${tip.x} ${tip.y}`} stroke={colors.emberBright} strokeWidth={1.6} strokeLinecap="round" />
        </G>
    );
}

export function intentColor(intent: GeoFishIntent): string {
    return {
        run: colors.tensionZone,
        thrash: colors.tensionDanger,
        dive: colors.rarityRare,
        rest: colors.fishStamina,
        jump: colors.tensionHigh,
    }[intent];
}

function shoreline(W: number, horizon: number): string {
    const points = [0, 12, 6, 16, 4, 14, 8, 12, 2, 14, 6, 10, 4];
    const step = W / (points.length - 1);
    const ridge = points.map((p, i) => `L${i * step} ${horizon - p}`).join(" ");
    return `M0 ${horizon} ${ridge} L${W} ${horizon} Z`;
}

/** A looping 0→1 value, for bobbing, ripples and thrashing. */
function useLoop(duration: number, enabled = true, easing = Easing.inOut(Easing.sin)) {
    const [value] = useState(() => new Animated.Value(0));
    useEffect(() => {
        if (!enabled) {
            value.setValue(0);
            return;
        }
        const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [duration, enabled, easing, value]);
    return value;
}

function Ripple({ x, y, size = 28, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
    const [value] = useState(() => new Animated.Value(0));
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(value, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [delay, value]);
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.ripple,
                {
                    left: x - size / 2,
                    top: y - size / 8,
                    width: size,
                    height: size / 4,
                    borderRadius: size,
                    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
                },
            ]}
        />
    );
}

function Bobber({ x, y, bite }: { x: number; y: number; bite: boolean }) {
    const bob = useLoop(bite ? 900 : 2400);
    const translateY = bite
        ? bob.interpolate({ inputRange: [0, 1], outputRange: [6, 16] })
        : bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.5, 0] });
    return (
        <>
            <Ripple x={x} y={y + 2} />
            {bite && <Ripple x={x} y={y + 2} size={44} delay={400} />}
            <Animated.View pointerEvents="none" style={[styles.bobber, { left: x - 7, top: y - 16, transform: [{ translateY }] }]}>
                <Svg width={14} height={22}>
                    <Rect x={6} y={0} width={2} height={8} fill={colors.bobberBelly} />
                    <Circle cx={7} cy={15} r={6} fill={colors.bobber} />
                    <Path d="M1 15 A6 6 0 0 0 13 15 Z" fill={colors.bobberBelly} />
                </Svg>
            </Animated.View>
        </>
    );
}

function FloatingFish({
    fish,
    x,
    y,
    length,
    surfaceY,
    thrashing,
    jumping,
    tilt,
}: {
    fish: FishArt;
    x: number;
    y: number;
    length: number;
    surfaceY: number;
    thrashing: boolean;
    jumping: boolean;
    tilt: number;
}) {
    const wiggle = useLoop(thrashing ? 250 : 2400);
    const rotate = thrashing
        ? wiggle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [`${tilt - 7}deg`, `${tilt + 7}deg`, `${tilt - 7}deg`] })
        : `${tilt}deg`;
    const translateY = thrashing ? 0 : wiggle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 3, 0] });
    const box = length * 1.6;
    return (
        <>
            <Ripple x={x - length / 2 + 14} y={surfaceY} size={20} />
            {jumping && (
                <>
                    <Ripple x={x} y={surfaceY} size={32} />
                    <Ripple x={x} y={surfaceY} size={48} delay={300} />
                </>
            )}
            <Animated.View
                pointerEvents="none"
                style={[styles.fish, { left: x - box / 2, top: y - box / 2, width: box, height: box, transform: [{ translateY }, { rotate }] }]}
            >
                <Svg width={box} height={box}>
                    <G transform={`translate(${box / 2}, ${box / 2})`}>
                        <FishDrawing fish={fish} length={length} silhouette />
                    </G>
                </Svg>
            </Animated.View>
        </>
    );
}

function SeaCreature({ x, top, width }: { x: number; top: number; width: number }) {
    const [rise] = useState(() => new Animated.Value(0));
    const glow = useLoop(1800);
    useEffect(() => {
        Animated.timing(rise, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [rise]);
    const w = Math.min(240, width * 0.6);
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.creature,
                {
                    left: x - w / 2,
                    top: top + 16,
                    width: w,
                    height: w,
                    opacity: rise,
                    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
                },
            ]}
        >
            <Svg width={w} height={w} viewBox="0 0 240 240">
                <Path d="M0 240 Q0 40 120 30 Q240 40 240 240 Z" fill="#020507" opacity={0.92} />
                {[0, 1, 2, 3].map((i) => (
                    <Path
                        key={i}
                        d={`M${30 + i * 60} 200 q${i % 2 ? 30 : -30} -40 ${i % 2 ? 10 : -10} -80`}
                        stroke="#020507"
                        strokeWidth={12}
                        strokeLinecap="round"
                        fill="none"
                    />
                ))}
            </Svg>
            <Animated.View style={[styles.eyes, { opacity: glow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] }) }]}>
                <View style={styles.eye} />
                <View style={styles.eye} />
            </Animated.View>
        </Animated.View>
    );
}

function ScenePill({ x, y, width, text, color }: { x: number; y: number; width: number; text: string; color: string }) {
    const pillWidth = text.length * 7.5 + 22;
    const left = Math.max(6, Math.min(width - pillWidth - 6, x - pillWidth / 2));
    return (
        <View pointerEvents="none" style={[styles.pill, { left, top: Math.max(8, y), width: pillWidth, borderColor: color }]}>
            <Text style={[styles.pillText, { color }]} numberOfLines={1}>
                {text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    scene: {
        flex: 1,
        overflow: "hidden",
    },
    ripple: {
        position: "absolute",
        borderWidth: 1,
        borderColor: colors.sceneFoam,
    },
    bobber: {
        position: "absolute",
    },
    fish: {
        position: "absolute",
    },
    creature: {
        position: "absolute",
    },
    eyes: {
        position: "absolute",
        top: "34%",
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 36,
    },
    eye: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: "#EFFFBF",
        shadowColor: "#D8FF7A",
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },
    pill: {
        position: "absolute",
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1.2,
        backgroundColor: "rgba(11, 9, 8, 0.85)",
    },
    pillText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
