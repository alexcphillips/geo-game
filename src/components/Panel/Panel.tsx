import type { ReactNode } from "react";
import { Pressable, View, type AccessibilityRole, type StyleProp, type ViewStyle } from "react-native";
import { createStyles, inked } from "@/theme/theme";

type PanelProps = {
    children: ReactNode;
    /**
     * - `alt` (default): a panel set into a modal or screen: rows, tiles, cards.
     * - `surface`: a panel standing on its own over the world (HUD-like).
     */
    tone?: "alt" | "surface";
    /** Tappable: the whole panel presses down like a button. */
    onPress?: () => void;
    onLongPress?: () => void;
    /** The chosen one in a set: a primary-coloured edge. */
    selected?: boolean;
    disabled?: boolean;
    /** Tighter padding, for list rows and grid tiles. */
    compact?: boolean;
    /** No hard shadow: for panels stacked in long lists, where it gets heavy. */
    flat?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole;
};

/**
 * The inked card every modal is built from: a rounded panel with a thick
 * outline and a hard shadow. Rows, tiles, item cards, balances — anything
 * boxed — is a Panel, so the boxes all match.
 */
export default function Panel({
    children,
    tone = "alt",
    onPress,
    onLongPress,
    selected = false,
    disabled = false,
    compact = false,
    flat = false,
    style,
    accessibilityLabel,
    accessibilityRole,
}: PanelProps) {
    const styles = useStyles();
    const look = [
        styles.panel,
        tone === "surface" && styles.surface,
        compact && styles.compact,
        flat && styles.flat,
        selected && styles.selected,
        disabled && styles.disabled,
    ];

    if (!onPress && !onLongPress) {
        return (
            <View style={[look, style]} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole}>
                {children}
            </View>
        );
    }

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [look, pressed && !disabled && styles.pressed, style]}
            accessibilityRole={accessibilityRole ?? "button"}
            accessibilityState={{ disabled, selected }}
            accessibilityLabel={accessibilityLabel}
        >
            {children}
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    panel: {
        gap: 8,
        padding: 14,
        borderRadius: 18,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    surface: {
        backgroundColor: p.surface,
    },
    compact: {
        gap: 6,
        padding: 10,
        borderRadius: 14,
    },
    flat: {
        boxShadow: "none",
        borderWidth: 2,
    },
    selected: {
        borderColor: p.primary,
        boxShadow: `0px 3px 0px ${p.primary}`,
    },
    disabled: {
        opacity: 0.5,
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
}));
