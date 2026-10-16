import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing, StyleSheet, View, type ColorValue } from "react-native";
import { HIT_TIMING } from "@/features/run/fx/hitTiming";
import { colors } from "@/theme/colors";

type StatBarProps = {
    current: number;
    max: number;
    /**
     * Three vertical stops for the fill, e.g. `colors.healthGradient`.
     */
    gradient: readonly [ColorValue, ColorValue, ...ColorValue[]];
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
const FRAME_THICKNESS = 1;

/** Vertical, so the gradients read as light falling from above. */
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 0, y: 1 };

/**
 * One vital bar: a framed, lit track.
 *
 * Generic over which stat it shows, so any future vital is the same component
 * with different stops — they differ only in hue and what feeds them.
 *
 * ## Why it is built from three layers
 *
 * A flat rectangle reads as a debug widget. Three cheap layers make it read as
 * an object instead:
 *
 * 1. **A gradient frame.** The outer view *is* the border — it has a gradient
 *    background and one point of padding, so the track inset inside it leaves a
 *    hairline of gradient showing on all sides. React Native cannot gradient a
 *    real `borderColor`, and this gets there without an SVG dependency.
 * 2. **A gradient fill**, lit at the top and shadowed at the bottom, which is
 *    what makes the bar look rounded rather than printed.
 * 3. **A gloss** across the upper half of the whole track, including the empty
 *    part, so the frame reads as one piece of glass rather than a lit fill
 *    sitting in a dull hole.
 *
 * No visible readout: the bar's *length* is the information. `current` and
 * `max` still drive the fill and are reported to assistive tech, which is the
 * one place the exact values are genuinely needed.
 */
export default function StatBar({
    current,
    max,
    gradient,
    width,
    label,
    animateChanges = false,
}: StatBarProps) {
    // Clamped because a bar is a lie if it can overflow its track — buffs that
    // push current past max shouldn't paint outside the frame.
    const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;

    // Scale, not width, so the animation runs on the native driver. The fill
    // gradient is vertical, so stretching it horizontally changes nothing.
    const [fill] = useState(() => new Animated.Value(ratio));
    const [chip] = useState(() => new Animated.Value(ratio));

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
        <LinearGradient
            colors={colors.barFrameGradient}
            start={GRADIENT_START}
            end={GRADIENT_END}
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
                                colors={gradient}
                                start={GRADIENT_START}
                                end={GRADIENT_END}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </>
                ) : (
                    <LinearGradient
                        colors={gradient}
                        start={GRADIENT_START}
                        end={GRADIENT_END}
                        style={[styles.fill, { width: `${ratio * 100}%` }]}
                    />
                )}
                <View style={styles.gloss} pointerEvents="none" />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    frame: {
        height: BAR_HEIGHT,
        padding: FRAME_THICKNESS,
        borderRadius: 4,
    },
    track: {
        flex: 1,
        borderRadius: 3,
        backgroundColor: colors.barTrack,
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
    gloss: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "45%",
        backgroundColor: "rgba(255, 255, 255, 0.07)",
    },
});
