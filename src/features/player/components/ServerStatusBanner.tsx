import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { usePlayerStore } from "../playerStore";

type ServerStatusBannerProps = {
    /** Distance from the bottom of the screen, to clear the action bar. */
    bottom: number;
};

/**
 * Says when the game server isn't there. The map still works without it, but
 * everything that's yours — inventory, hands, fights — waits for it, so this
 * stays up with a Retry until it answers. Nothing shows once it has.
 */
export default function ServerStatusBanner({ bottom }: ServerStatusBannerProps) {
    const styles = useStyles();
    const palette = useTheme();
    const status = usePlayerStore((state) => state.status);
    const error = usePlayerStore((state) => state.error);
    const load = usePlayerStore((state) => state.load);

    if (status === "ready") return null;

    const isLoading = status === "loading";

    return (
        <View style={[styles.banner, isLoading && styles.loading, { bottom }]} accessibilityLiveRegion="polite">
            {isLoading ? (
                <>
                    <ActivityIndicator size="small" color={palette.textMuted} />
                    <Text style={styles.text}>Connecting to the game server…</Text>
                </>
            ) : (
                <>
                    <Text style={[styles.text, styles.textFill]}>{error}</Text>
                    <Pressable
                        onPress={() => void load()}
                        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
                        accessibilityRole="button"
                        hitSlop={8}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </>
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    banner: {
        position: "absolute",
        left: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: p.danger,
        borderWidth: 1,
        borderColor: p.game.blood,
    },
    loading: {
        justifyContent: "center",
        backgroundColor: p.surface,
        borderColor: p.outline,
    },
    text: {
        color: p.text,
        fontSize: 12,
        lineHeight: 17,
    },
    textFill: {
        flex: 1,
    },
    retry: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: p.ember,
    },
    retryText: {
        color: p.onPrimary,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    pressed: {
        transform: [{ scale: 0.95 }],
    },
}));
