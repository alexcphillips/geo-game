import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/** One labelled row of chips, e.g. "Sort  Rarity  Name". Wraps when full. */
export function ChipRow({
    label,
    radio,
    children,
}: {
    label?: string;
    /** The chips are a pick-one group. */
    radio?: boolean;
    children: ReactNode;
}) {
    const styles = useStyles();
    return (
        <View style={styles.row} accessibilityRole={radio ? "radiogroup" : undefined}>
            {label && <Text style={styles.label}>{label}</Text>}
            {children}
        </View>
    );
}

/**
 * A pill to pick an option. `direction` adds a chevron for a sort chip:
 * down for descending, up for ascending.
 */
export function Chip({
    label,
    selected,
    onPress,
    direction,
    accessibilityLabel,
    accessibilityHint,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    direction?: "ascending" | "descending";
    accessibilityLabel?: string;
    accessibilityHint?: string;
}) {
    const styles = useStyles();
    return (
        <Pressable
            onPress={onPress}
            style={[styles.chip, selected && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
        >
            <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
            {direction && <Chevron descending={direction === "descending"} />}
        </Pressable>
    );
}

function Chevron({ descending }: { descending: boolean }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Svg width={10} height={10} viewBox="0 0 10 10" style={descending ? undefined : styles.flipped}>
            <Path
                d="M1.5 3.5 L5 7 L8.5 3.5"
                stroke={palette.onPrimary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

const useStyles = createStyles((p) => ({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
    },
    label: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginRight: 2,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surfaceAlt,
    },
    chipOn: {
        backgroundColor: p.primary,
    },
    text: {
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 12,
    },
    textOn: {
        color: p.onPrimary,
    },
    flipped: {
        transform: [{ rotate: "180deg" }],
    },
}));
