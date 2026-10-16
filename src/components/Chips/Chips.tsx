import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/theme/colors";

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
    return (
        <Svg width={10} height={10} viewBox="0 0 10 10" style={descending ? undefined : styles.flipped}>
            <Path
                d="M1.5 3.5 L5 7 L8.5 3.5"
                stroke={colors.emberBright}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginRight: 2,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipOn: {
        borderColor: colors.ember,
        backgroundColor: "rgba(201, 100, 30, 0.18)",
    },
    text: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    textOn: {
        color: colors.emberBright,
    },
    flipped: {
        transform: [{ rotate: "180deg" }],
    },
});
