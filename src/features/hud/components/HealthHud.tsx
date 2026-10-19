import { Pressable, StyleSheet, Text } from "react-native";
import { useHealth } from "@/features/player/usePlayer";
import { colors } from "@/theme/colors";
import StatBar from "./StatBar";

const BAR_WIDTH = 120;

type HealthHudProps = {
    /** Tapping it opens the lunchbox, the only food there is between fights. */
    onPress: () => void;
};

/**
 * The player's health between fights, on the world screen. It carries from
 * fight to fight and never comes back by itself, so it's always in view.
 *
 * Unpositioned: `PlayerStatusHud` places it.
 */
export default function HealthHud({ onPress }: HealthHudProps) {
    const health = useHealth();
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Health ${health.current} of ${health.max}. Open lunchbox`}
        >
            <StatBar
                current={health.current}
                max={health.max}
                gradient={colors.healthGradient}
                width={BAR_WIDTH}
                label="Health"
                animateChanges
            />
            <Text style={styles.count}>
                {health.current}/{health.max}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    pressed: {
        opacity: 0.7,
    },
    count: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        // Floats over the map, so the text carries its own contrast.
        textShadowColor: "rgba(0, 0, 0, 0.95)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
