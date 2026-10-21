import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing, StyleSheet, View, type ColorValue } from "react-native";
import { HIT_TIMING } from "@/features/run/fx/hitTiming";
import { createStyles, useTheme } from "@/theme/theme";

type StatBarProps = {
    current: number;
    max: number;
    /**
     * A shield over the bar, in the same units as `max`: drawn gold from where
     * the fill ends, as wide as barrier ÷ max. When that would run past the
     * end it slides left over the fill, so it's never drawn narrower.
     */
    barrier?: number;
    /**
     * Three vertical stops for the fill. Defaults to the mood's health red.
     */
    gradient?: readonly [ColorValue, ColorValue, ...ColorValue[]];
    width: number;
    /** Screen-reader name only; nothing is drawn beside the bar. */
    label: string;
    /**
     * Animate changes instead of jumping: on damage the fill drops quickly
     * and a pale chunk lingers where the lost health was, then catches up —
     * so a hit reads as a hit even if you blinked. Off by default: a static
     * readout should just be true.
     */
    animateChanges?: boolean;
};

/** Outer height including the frame. */
const BAR_HEIGHT = 17;
/** The inked outline around the track. */
const FRAME_THICKNESS = 2;

/** Vertical, so the gradients read as light falling from above. */
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 0, y: 1 };

/**
 * One vital bar: an inked, lit track.
 *
 * Generic over which stat it shows, so any future vital is the same component
 * with different stops — they differ only in hue and what feeds them.
 *
 * ## Why it is built from three layers
 *
 * A flat rectangle reads as a debug widget. Three cheap layers make it read as
 * an object instead:
 *
 * 1. **An inked outline**, the same edge every panel and button has, so the
 *    bar belongs to the storybook UI around it.
 * 2. **A gradient fill**, lit at the top and shadowed at the bottom, which is
 *    what makes the bar look rounded rather than printed.
 * 3. **A gloss** across the upper half of the whole track, including the empty
 *    part, so the track reads as one piece rather than a lit fill sitting in a
 *    dull hole.
 *
 * No visible readout: the bar's *length* is the information. `current` and
 * `max` still drive the fill and are reported to assistive tech, which is the
 * one place the exact values are genuinely needed.
 */
export default function StatBar({
    current,
    max,
    barrier = 0,
    gradient,
    width,
    label,
    animateChanges = false,
}: StatBarProps) {
    const styles = useStyles();
    const palette = useTheme();
    const fillStops = gradient ?? palette.healthFill;
    // Clamped because a bar is a lie if it can overflow its track — buffs that
    // push current past max shouldn't paint outside the frame.
    const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;

    // Scale, not width, so the animation runs on the native driver. The fill
    // gradient is vertical, so stretching it horizontally changes nothing.
    const [fill] = useState(() => new Animated.Value(ratio));
    const [chip] = useState(() => new Animated.Value(ratio));

    const barrierRatio = max > 0 ? Math.min(1, Math.max(0, barrier / max)) : 0;
    const barrierStart = Math.min(ratio, 1 - barrierRatio);
    // Left and width, so these run on the JS driver; they move rarely.
    const [shieldStart] = useState(() => new Animated.Value(barrierStart));
    const [shieldWidth] = useState(() => new Animated.Value(barrierRatio));

    useEffect(() => {
        if (!animateChanges) {
            shieldStart.setValue(barrierStart);
            shieldWidth.setValue(barrierRatio);
            return;
        }
        const move = Animated.parallel(
            [
                [shieldStart, barrierStart],
                [shieldWidth, barrierRatio],
            ].map(([value, toValue]) =>
                Animated.timing(value as Animated.Value, {
                    toValue: toValue as number,
                    duration: HIT_TIMING.drain,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                }),
            ),
        );
        move.start();
        return () => move.stop();
    }, [animateChanges, barrierStart, barrierRatio, shieldStart, shieldWidth]);

    useEffect(() => {
        if (!animateChanges) {
            fill.setValue(ratio);
            chip.setValue(ratio);
            return;
        }

        const drop = Animated.timing(fill, {
            toValue: ratio,
            duration: HIT_TIMING.drain,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        });
        // Healing: no chunk to linger, so both move together.
        const catchUp = Animated.sequence([
            Animated.delay(HIT_TIMING.chipHold),
            Animated.timing(chip, {
                toValue: ratio,
                duration: HIT_TIMING.chipCatchUp,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
            }),
        ]);
        drop.start();
        catchUp.start();
        return () => {
            drop.stop();
            catchUp.stop();
        };
    }, [animateChanges, ratio, fill, chip]);

    return (
        <View
            style={[styles.frame, { width }]}
            accessibilityRole="progressbar"
            accessibilityLabel={label}
            accessibilityValue={{ now: current, min: 0, max }}
        >
            <View style={styles.track}>
                {animateChanges ? (
                    <>
                        <Animated.View
                            style={[styles.fullFill, styles.chip, { transform: [{ scaleX: chip }] }]}
                        />
                        <Animated.View style={[styles.fullFill, { transform: [{ scaleX: fill }] }]}>
                            <LinearGradient
                                colors={fillStops}
                                start={GRADIENT_START}
                                end={GRADIENT_END}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </>
                ) : (
                    <LinearGradient
                        colors={fillStops}
                        start={GRADIENT_START}
                        end={GRADIENT_END}
                        style={[styles.fill, { width: `${ratio * 100}%` }]}
                    />
                )}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.barrier,
                        {
                            left: shieldStart.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                            width: shieldWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                            // No seam left behind once it's gone.
                            borderLeftWidth: shieldWidth.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }),
                        },
                    ]}
                >
                    <LinearGradient
                        colors={palette.barrierFill}
                        start={GRADIENT_START}
                        end={GRADIENT_END}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
                <View style={styles.gloss} pointerEvents="none" />
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    frame: {
        height: BAR_HEIGHT,
        borderWidth: FRAME_THICKNESS,
        borderColor: p.outline,
        borderRadius: BAR_HEIGHT / 2,
        backgroundColor: p.outline,
    },
    track: {
        flex: 1,
        borderRadius: BAR_HEIGHT / 2 - FRAME_THICKNESS,
        backgroundColor: p.track,
        // Clips the fill's square corners to the track's rounded ones.
        overflow: "hidden",
    },
    fill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
    },
    fullFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        // Scale from the left edge, so the bar shrinks toward empty.
        transformOrigin: "left",
    },
    /** The pale chunk of just-lost health. */
    chip: {
        backgroundColor: "#D9B7A6",
    },
    /** Gold over the fill; a dark seam keeps it apart from the health beside it. */
    barrier: {
        position: "absolute",
        top: 0,
        bottom: 0,
        borderLeftColor: p.outline,
        overflow: "hidden",
    },
    gloss: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "40%",
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
}));
