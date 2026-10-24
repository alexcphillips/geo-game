import { useImperativeHandle, useRef, useState, type ComponentRef, type Ref } from "react";
import {
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
    type ImageSourcePropType,
} from "react-native";
import Icon from "@/components/Icon/Icon";
import StatBar from "@/features/hud/components/StatBar";
import { HIT_TIMING as T } from "@/features/run/fx/hitTiming";
import type { Box } from "@/features/run/fx/HitEffects";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/** What a hit sequence can make a combatant do. */
export type CombatantHandle = {
    /**
     * Steps toward the other side and back. Resolves at the peak — the moment
     * of contact — so the impact lands on time; the return finishes on its own.
     */
    lunge: (direction: 1 | -1) => Promise<void>;
    /** Shake and flash white: "that hurt". */
    react: () => void;
    /** Where the figure is, in window coordinates. */
    measure: () => Promise<Box>;
};

type CombatantProps = {
    ref?: Ref<CombatantHandle>;
    image: ImageSourcePropType;
    /** Natural width ÷ height of the art, so it sizes without distortion. */
    aspectRatio: number;
    /** On-screen height of the art. */
    height: number;
    /** Shown above the health bar. Omit for no nameplate. */
    name?: string;
    /** Omit to draw the art with no health bar. `barrier` draws gold over it. */
    health?: { current: number; max: number; barrier?: number };
    /** Flash white when hit. Off for the player's knight. */
    flashOnHit?: boolean;
    /** Shown as a shield chip by the name when above 0: taken off each hit. */
    defense?: number;
    /** Guard up until its bearer's next turn: a blue shield badge at the bar's end. */
    guard?: number;
};

const HEALTH_BAR_WIDTH = 130;

/**
 * One side of a fight: name, then health bar, then the figure standing on a
 * soft ground shadow. Name and bar sit *above* the figure — the opposite of
 * the HUD — so the eye reads who it is, how hurt it is, then what it is.
 *
 * The hit flash is a second copy of the art drawn as a solid white silhouette
 * with `tintColor`, faded in and out over the original — no extra artwork.
 */
export default function Combatant({
    ref,
    image,
    aspectRatio,
    height,
    name,
    health,
    flashOnHit = true,
    defense = 0,
    guard = 0,
}: CombatantProps) {
    const styles = useStyles();
    const palette = useTheme();
    const figureRef = useRef<ComponentRef<typeof View>>(null);
    const [offset] = useState(() => new Animated.Value(0));
    const [shake] = useState(() => new Animated.Value(0));
    const [flash] = useState(() => new Animated.Value(0));
    const width = height * aspectRatio;

    useImperativeHandle(ref, () => ({
        lunge: (direction) =>
            new Promise<void>((resolve) => {
                Animated.timing(offset, {
                    toValue: direction * T.lungeDistance,
                    duration: T.lungeOut,
                    easing: Easing.bezier(0.3, 0, 0.7, 1),
                    useNativeDriver: true,
                }).start(() => {
                    resolve();
                    Animated.timing(offset, {
                        toValue: 0,
                        duration: T.lungeBack,
                        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
                        useNativeDriver: true,
                    }).start();
                });
            }),

        react: () => {
            const s = T.shakeDistance;
            const steps = [-s, s, -s * 0.7, s * 0.6, -s * 0.3, 0];
            Animated.sequence(
                steps.map((toValue) =>
                    Animated.timing(shake, {
                        toValue,
                        duration: T.shake / steps.length,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ),
            ).start();

            if (!flashOnHit) return;
            flash.setValue(0.95);
            Animated.timing(flash, {
                toValue: 0,
                duration: T.flash,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }).start();
        },

        measure: () =>
            new Promise<Box>((resolve) => {
                figureRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) =>
                    resolve({ x, y, width: measuredWidth, height: measuredHeight }),
                );
            }),
    }));

    return (
        <View style={styles.container}>
            {(name !== undefined || health) && (
                <View style={styles.plate}>
                    {name !== undefined && (
                        <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>
                                {name}
                            </Text>
                            {defense > 0 && (
                                <View style={styles.defense} accessible accessibilityLabel={`Defense ${defense}`}>
                                    <Icon name="shield" size={11} color={palette.textMuted} />
                                    <Text style={styles.defenseText}>{defense}</Text>
                                </View>
                            )}
                        </View>
                    )}
                    {health && (
                        <View>
                            <StatBar
                                label={`${name ?? "Enemy"} health`}
                                current={health.current}
                                max={health.max}
                                barrier={health.barrier}
                                width={HEALTH_BAR_WIDTH}
                                animateChanges
                            />
                            {guard > 0 && (
                                <View style={styles.guard} accessible accessibilityLabel={`Guard ${guard}`}>
                                    <Icon name="checked-shield" size={12} color={palette.game.guard} />
                                    <Text style={styles.guardText}>{guard}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            <View style={styles.figure}>
                <View style={[styles.shadow, { width: width * 0.9 }]} />
                <Animated.View
                    ref={figureRef}
                    style={{ transform: [{ translateX: Animated.add(offset, shake) }] }}
                >
                    <Image
                        source={image}
                        style={{ height, width }}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                    />
                    {flashOnHit && (
                        <Animated.Image
                            source={image}
                            style={[StyleSheet.absoluteFill, { opacity: flash, tintColor: "#FFFFFF" }]}
                            resizeMode="contain"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                        />
                    )}
                </Animated.View>
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    container: {
        alignItems: "center",
        gap: 10,
    },
    plate: {
        alignItems: "center",
        gap: 6,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    name: {
        maxWidth: HEALTH_BAR_WIDTH,
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
    },
    defense: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    defenseText: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    // Hangs off the bar's right end, centred on it, so the bar keeps its width.
    guard: {
        position: "absolute",
        left: HEALTH_BAR_WIDTH - 10,
        top: -3,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingHorizontal: 5,
        height: 23,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: p.game.guard,
        backgroundColor: p.surface,
    },
    guardText: {
        color: p.game.guard,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    figure: {
        alignItems: "center",
        justifyContent: "flex-end",
    },
    shadow: {
        position: "absolute",
        bottom: -6,
        height: 14,
        borderRadius: 999,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
}));
