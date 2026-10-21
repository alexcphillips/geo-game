import { Pressable, Text, View } from "react-native";
import { FONTS } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";

type SettingsToggleProps = {
    label: string;
    hint: string;
    value: boolean;
    onToggle: () => void;
};

/** One on/off row in a settings page: label, a line of explanation, On/Off. */
export default function SettingsToggle({ label, hint, value, onToggle }: SettingsToggleProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={({ pressed }) => [
                styles.toggle,
                value && styles.toggleActive,
                pressed && styles.togglePressed,
            ]}
            onPress={onToggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            accessibilityLabel={label}
            accessibilityHint={hint}
        >
            <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleHint}>{hint}</Text>
            </View>
            <Text style={[styles.toggleState, value && styles.toggleStateActive]}>
                {value ? "On" : "Off"}
            </Text>
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    toggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    toggleActive: {
        borderColor: p.ember,
        backgroundColor: p.track,
    },
    togglePressed: {
        transform: [{ scale: 0.98 }],
    },
    toggleText: {
        flex: 1,
        gap: 4,
    },
    toggleLabel: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    toggleHint: {
        color: p.textMuted,
        fontSize: 12,
        lineHeight: 17,
    },
    toggleState: {
        color: p.textMuted,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    toggleStateActive: {
        color: p.ember,
    },
}));
