import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";

/**
 * Shown over the map while an admin looks at a suggestion. Replaces the HUD,
 * like the pin drop, so the only way out is back to the review list.
 */
export default function SuggestionFocusOverlay({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={[styles.banner, { top: insets.top + 8 }]} pointerEvents="none">
                <Text style={styles.bannerTitle}>Suggested spot</Text>
                <Text style={styles.bannerHint}>Free camera: pan and zoom to look around.</Text>
            </View>
            <View
                style={[styles.actions, { paddingBottom: insets.bottom + HOME_INDICATOR_CLEARANCE }]}
                pointerEvents="box-none"
            >
                <Pressable
                    onPress={onBack}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Text style={styles.buttonText}>Back to suggestions</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: "absolute",
        left: 16,
        right: 16,
        alignItems: "center",
        gap: 2,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1,
        borderColor: colors.border,
    },
    bannerTitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "600",
    },
    bannerHint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    actions: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        paddingHorizontal: 20,
    },
    button: {
        paddingVertical: 13,
        paddingHorizontal: 28,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    buttonText: {
        color: colors.textOnEmber,
        fontSize: 14,
        fontWeight: "600",
    },
    pressed: {
        transform: [{ scale: 0.96 }],
    },
});
