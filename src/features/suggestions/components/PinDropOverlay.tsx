import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { suggestionKindInfo, type SuggestionKind } from "../suggestionKinds";
import { colors } from "@/theme/colors";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";

type PinDropOverlayProps = {
    kind: SuggestionKind;
    /** The line under the title; a player's suggestion has its own. */
    hint?: string;
    onCancel: () => void;
    onDone: () => void;
};

/**
 * Shown over the map while the player places a suggestion pin.
 *
 * Replaces the HUD rather than sitting on top of it, so there is exactly one
 * thing to do: tap the map or drag the pin, then Done. `box-none` lets those taps through to
 * the map everywhere except the two bars.
 */
export default function PinDropOverlay({ kind, hint = "Somewhere public, close to you.", onCancel, onDone }: PinDropOverlayProps) {
    const insets = useSafeAreaInsets();
    const info = suggestionKindInfo(kind);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={[styles.banner, { top: insets.top + 8 }]} pointerEvents="none">
                <Text style={styles.bannerTitle}>
                    Tap or drag the pin to the <Text style={{ color: info.color }}>{info.label}</Text> spot
                </Text>
                <Text style={styles.bannerHint}>{hint}</Text>
            </View>

            <View
                style={[
                    styles.actions,
                    { paddingBottom: insets.bottom + HOME_INDICATOR_CLEARANCE },
                ]}
                pointerEvents="box-none"
            >
                <Pressable
                    onPress={onCancel}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable
                    onPress={onDone}
                    style={({ pressed }) => [
                        styles.button,
                        styles.doneButton,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                >
                    <Text style={[styles.buttonText, styles.doneButtonText]}>Done</Text>
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
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 20,
    },
    button: {
        flex: 1,
        maxWidth: 160,
        alignItems: "center",
        paddingVertical: 13,
        borderRadius: 999,
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    doneButton: {
        backgroundColor: colors.ember,
    },
    buttonText: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "600",
    },
    doneButtonText: {
        color: colors.textOnEmber,
    },
    pressed: {
        transform: [{ scale: 0.96 }],
    },
});
