import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { FONTS, INK } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";

export type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

type ButtonProps = {
    label: string;
    onPress: () => void;
    /**
     * - `primary`: the one thing to do next on a screen. One per screen, ideally.
     * - `secondary`: everything else that's a button.
     * - `danger`: can't be undone (demolish, sell, release).
     * - `quiet`: a text-weight action that shouldn't compete (Cancel, "Quest log ›").
     */
    variant?: ButtonVariant;
    size?: "small" | "medium" | "large";
    icon?: GameIconName;
    disabled?: boolean;
    /** Working on it: a spinner in place of the label, and no second tap. */
    busy?: boolean;
    /** Fill the row's width. */
    stretch?: boolean;
    /** Something on the right, e.g. a price or a count. */
    trailing?: ReactNode;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    style?: StyleProp<ViewStyle>;
};

/**
 * The button. Inked: a thick outline and a hard shadow that it presses down
 * into, so a tap feels like pushing something. Every screen's buttons come
 * from here, so they look and behave the same everywhere.
 */
export default function Button({
    label,
    onPress,
    variant = "secondary",
    size = "medium",
    icon,
    disabled = false,
    busy = false,
    stretch = false,
    trailing,
    accessibilityLabel,
    accessibilityHint,
    style,
}: ButtonProps) {
    const styles = useStyles();
    const palette = useTheme();
    const isDisabled = disabled || busy;
    const ink =
        variant === "primary" ? palette.onPrimary : variant === "danger" ? "#FFFFFF" : variant === "quiet" ? palette.ember : palette.text;

    return (
        <Pressable
            onPress={isDisabled ? undefined : onPress}
            style={({ pressed }) => [
                styles.button,
                styles[size],
                styles[variant],
                stretch && styles.stretch,
                disabled && styles.disabled,
                pressed && !isDisabled && (variant === "quiet" ? styles.quietPressed : styles.pressed),
                style,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
        >
            {busy ? (
                <ActivityIndicator color={ink} />
            ) : (
                <>
                    {icon && <Icon name={icon} size={size === "small" ? 14 : 18} color={ink} />}
                    <Text style={[styles.label, styles[`${size}Label`], { color: ink }]} numberOfLines={1}>
                        {label}
                    </Text>
                    {trailing && <View>{trailing}</View>}
                </>
            )}
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 999,
        ...inked(p),
    },
    small: {
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    medium: {
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    large: {
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 20,
        boxShadow: `0px ${INK.liftLarge}px 0px ${p.outline}`,
    },
    primary: {
        backgroundColor: p.primary,
    },
    secondary: {
        backgroundColor: p.surfaceAlt,
    },
    danger: {
        backgroundColor: p.danger,
    },
    quiet: {
        backgroundColor: "transparent",
        borderColor: "transparent",
        boxShadow: "none",
    },
    stretch: {
        alignSelf: "stretch",
    },
    disabled: {
        opacity: 0.45,
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
    quietPressed: {
        opacity: 0.6,
    },
    label: {
        fontFamily: FONTS.bodyHeavy,
    },
    smallLabel: {
        fontSize: 12,
    },
    mediumLabel: {
        fontSize: 14,
    },
    largeLabel: {
        fontFamily: FONTS.display,
        fontSize: 19,
    },
}));
