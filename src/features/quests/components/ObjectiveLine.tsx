import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import type { GeoQuestObjective } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { isObjectiveDone, objectiveCount } from "../quests";

type ObjectiveLineProps = {
    objective: GeoQuestObjective;
    /**
     * The HUD keeps each objective to one line, cutting the label short but
     * never the count; the quest log lets it wrap.
     */
    singleLine?: boolean;
};

/** An opacity that flashes to 1 and fades whenever `count` goes up. */
export function useCountGlow(count: number): Animated.Value {
    const [glow] = useState(() => new Animated.Value(0));
    const lastCount = useRef(count);

    useEffect(() => {
        if (count > lastCount.current) {
            glow.setValue(1);
            Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }).start();
        }
        lastCount.current = count;
    }, [count, glow]);

    return glow;
}

/**
 * "Kill Green Slime (10/25)". Glows briefly when the count goes up, so a kill
 * registering is visible at a glance, and turns into a ticked line once met.
 */
export default function ObjectiveLine({ objective, singleLine = false }: ObjectiveLineProps) {
    const isDone = isObjectiveDone(objective);
    const glow = useCountGlow(objective.current);

    return (
        <View
            style={styles.row}
            accessible
            accessibilityLabel={`${objective.label}, ${Math.min(objective.current, objective.target)} of ${objective.target}${isDone ? ", done" : ""}`}
        >
            <Animated.View style={[glowStyles.glow, { opacity: glow }]} pointerEvents="none" />
            {isDone ? (
                <Icon name="check-mark" size={12} color={colors.toastSuccess} />
            ) : (
                <View style={styles.bulletSlot}>
                    <View style={styles.bullet} />
                </View>
            )}
            <Text
                style={[styles.label, isDone && styles.labelDone]}
                numberOfLines={singleLine ? 1 : undefined}
            >
                {objective.label}
            </Text>
            <Text style={[styles.count, isDone && styles.countDone]}>{objectiveCount(objective)}</Text>
        </View>
    );
}

const TEXT_SHADOW = {
    // Floats over the map in the HUD, so the text carries its own contrast.
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
} as const;

export const glowStyles = StyleSheet.create({
    glow: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: 4,
        backgroundColor: "rgba(232, 135, 60, 0.35)",
    },
});

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 1,
        paddingHorizontal: 2,
    },
    // Same width as the check, so labels line up whether done or not.
    bulletSlot: {
        width: 12,
        alignItems: "center",
    },
    bullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.textSecondary,
    },
    // Shrinks first, so the count always stays whole.
    label: {
        flexShrink: 1,
        color: colors.textPrimary,
        fontSize: 12,
        ...TEXT_SHADOW,
    },
    labelDone: {
        color: colors.textSecondary,
    },
    count: {
        color: colors.emberBright,
        fontSize: 12,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        ...TEXT_SHADOW,
    },
    countDone: {
        color: colors.toastSuccess,
    },
});
