import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type SettingsToggleProps = {
    label: string;
    hint: string;
    value: boolean;
    onToggle: () => void;
};

/** One on/off row in a settings page: label, a line of explanation, On/Off. */
export default function SettingsToggle({ label, hint, value, onToggle }: SettingsToggleProps) {
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

const styles = StyleSheet.create({
    toggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleActive: {
        borderColor: colors.ember,
        backgroundColor: "rgba(201, 100, 30, 0.18)",
    },
    togglePressed: {
        transform: [{ scale: 0.98 }],
    },
    toggleText: {
        flex: 1,
        gap: 4,
    },
    toggleLabel: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "600",
    },
    toggleHint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    toggleState: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    toggleStateActive: {
        color: colors.emberBright,
    },
});
