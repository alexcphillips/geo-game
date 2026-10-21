import { View, type StyleProp, type ViewStyle } from "react-native";
import { createStyles, useTheme } from "@/theme/theme";

type MeterProps = {
    /** 0–1; clamped. */
    value: number;
    /** The fill. Defaults to the mood's primary. */
    color?: string;
    /** Bar height; the outline adds to it. */
    height?: number;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
};

/**
 * A plain inked progress bar: XP to the next level, a stack filling up,
 * durability. Vitals with gradients and hit animations use `StatBar`.
 */
export default function Meter({ value, color, height = 8, style, accessibilityLabel }: MeterProps) {
    const styles = useStyles();
    const palette = useTheme();
    const ratio = Math.min(1, Math.max(0, value));
    return (
        <View
            style={[styles.track, { height: height + 4, borderRadius: (height + 4) / 2 }, style]}
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        >
            <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color ?? palette.primary }]} />
        </View>
    );
}

const useStyles = createStyles((p) => ({
    track: {
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.track,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
    },
}));
