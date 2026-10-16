import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";

type RunScreenProps = {
    /** e.g. "Combat". Shown as "Combat Run" in the header. */
    kind: string;
    /** Replaces "<kind> Run" in the header, for screens that aren't a Run (the farm). */
    title?: string;
    /** Leave the Run. Its label is the Run type's own word for it. */
    onLeave: () => void;
    leaveLabel?: string;
    /** The scene: combatants, a fishing spot, a rock face — whatever the Run is. */
    arena: ReactNode;
    /** The player's hand, pinned to the bottom. */
    hand: ReactNode;
    /** Who acts in what order, shown just above the hand. */
    turnOrder?: ReactNode;
};

/**
 * The shell every Run is built on: a header, the arena, and the hand.
 *
 * Owns layout and safe areas only. What goes in the arena and how the hand
 * plays are up to each Run type, so combat, fishing and mining share one frame
 * and differ only in their content. The hand sits at the bottom, under the
 * thumb, because playing a card is the action a Run is made of.
 */
export default function RunScreen({
    kind,
    title,
    onLeave,
    leaveLabel = "Flee",
    arena,
    hand,
    turnOrder,
}: RunScreenProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* A faint horizon glow, so the arena reads as a place and not a
                blank page. */}
            <LinearGradient
                colors={["#1A1513", colors.void, "#15110F"]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
            />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable
                    onPress={onLeave}
                    style={({ pressed }) => [styles.leave, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${leaveLabel} — leave the run`}
                    hitSlop={10}
                >
                    <Text style={styles.leaveIcon}>‹</Text>
                    <Text style={styles.leaveText}>{leaveLabel}</Text>
                </Pressable>
                <Text style={styles.title}>{title ?? `${kind} Run`}</Text>
                {/* Balances the leave button so the title stays centred. */}
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.arena}>{arena}</View>

            {turnOrder && <View style={styles.turnOrder}>{turnOrder}</View>}

            <View
                style={[
                    styles.hand,
                    { paddingBottom: insets.bottom + HOME_INDICATOR_CLEARANCE },
                ]}
            >
                {hand}
            </View>
        </View>
    );
}

const HEADER_SIDE_WIDTH = 72;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.void,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    leave: {
        width: HEADER_SIDE_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 6,
    },
    leaveIcon: {
        color: colors.emberBright,
        fontSize: 28,
        lineHeight: 30,
        marginTop: -3,
    },
    leaveText: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "600",
    },
    pressed: {
        opacity: 0.6,
    },
    title: {
        flex: 1,
        textAlign: "center",
        color: colors.ember,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    headerSpacer: {
        width: HEADER_SIDE_WIDTH,
    },
    arena: {
        flex: 1,
    },
    turnOrder: {
        paddingHorizontal: 12,
        paddingBottom: 10,
    },
    hand: {
        paddingTop: 12,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: "rgba(20, 16, 15, 0.92)",
    },
});
