import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { suggestionKindInfo, type SuggestionKind } from "../suggestionKinds";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
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
    const styles = useStyles();
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
                <Button label="Cancel" onPress={onCancel} style={styles.grow} />
                <Button label="Done" variant="primary" onPress={onDone} style={styles.grow} />
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    grow: {
        flex: 1,
    },
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
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 20,
    },
}));
