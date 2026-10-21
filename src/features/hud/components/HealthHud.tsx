import { Pressable, Text } from "react-native";
import { useHealth } from "@/features/player/usePlayer";
import { FONTS } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";
import StatBar from "./StatBar";

const BAR_WIDTH = 110;

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
    const styles = useStyles();
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

const useStyles = createStyles((p) => ({
    // A panel of its own, so it reads over any patch of map.
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: p.surface,
        ...inked(p),
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
    count: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 13,
        fontVariant: ["tabular-nums"],
    },
}));
