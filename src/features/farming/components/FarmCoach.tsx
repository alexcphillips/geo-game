import { Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import type { GeoFarmView } from "@/lib/geo/contracts";
import { FONTS, INK } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { untilText } from "../farmText";

/** The coach's line for where a new farmer is: plant, then wait, then harvest. */
export function coachLine(farm: GeoFarmView, hasSeeds: boolean, now: number): string {
    const crops = farm.tiles.filter((tile) => tile.crop && !tile.crop.rotten);
    if (crops.some((tile) => tile.crop!.ripe)) return "Ripe! Tap Harvest to pick it.";
    if (crops.length > 0) return `Crops grow each cycle. Come back ${untilText(farm.nextTurnAt, now)} to see them grow.`;
    return hasSeeds ? "Tap Plant below to sow your first seeds." : "Get seeds from the Farmer, then plant them here.";
}

/** A speech bubble over the plot's top edge, until the first harvest (or a tap on ✕). */
export default function FarmCoach({ line, onDismiss }: { line: string; onDismiss: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={styles.bubble} accessibilityRole="text" accessibilityLiveRegion="polite">
            <Icon name="farmer" size={22} color={palette.primary} />
            <Text style={styles.text}>{line}</Text>
            <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the guide">
                <Text style={styles.close}>✕</Text>
            </Pressable>
            <View style={styles.tail} />
        </View>
    );
}

const useStyles = createStyles((p) => ({
    bubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "stretch",
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: p.surface,
        borderWidth: INK.border,
        borderColor: p.outline,
    },
    text: {
        flex: 1,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 13,
    },
    close: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 13,
    },
    // A small inked point toward the plot.
    tail: {
        position: "absolute",
        bottom: -8,
        left: 28,
        width: 14,
        height: 14,
        backgroundColor: p.surface,
        borderRightWidth: INK.border,
        borderBottomWidth: INK.border,
        borderColor: p.outline,
        transform: [{ rotate: "45deg" }],
    },
}));
