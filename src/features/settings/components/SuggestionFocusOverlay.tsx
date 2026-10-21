import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";

/**
 * Shown over the map while an admin looks at a suggestion. Replaces the HUD,
 * like the pin drop, so the only way out is back to the review list.
 */
export default function SuggestionFocusOverlay({ onBack }: { onBack: () => void }) {
    const styles = useStyles();
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
                <Button label="Back to suggestions" variant="primary" onPress={onBack} />
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    banner: {
        position: "absolute",
        left: 16,
        right: 16,
        alignItems: "center",
        gap: 2,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.outline,
    },
    bannerTitle: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    bannerHint: {
        color: p.textMuted,
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
}));
