import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useMood } from "@/theme/theme";

/** A faint glow toward the top, per mood, so the arena reads as a place. */
const HORIZON = {
    day: ["#F6EFDF", "#EFE6D2", "#E9DFC8"],
    dusk: ["#221F31", "#17151F", "#131119"],
} as const;

type RunScreenProps = {
    /** e.g. "Combat". Shown as "Combat Run" in the header. */
    kind: string;
    /** Replaces "<kind> Run" in the header, e.g. a dungeon's own name. */
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
    const styles = useStyles();
    const mood = useMood();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* A faint horizon glow, so the arena reads as a place and not a
                blank page. */}
            <LinearGradient
                colors={HORIZON[mood]}
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

const useStyles = createStyles((p) => ({
    screen: {
        flex: 1,
        backgroundColor: p.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    // An inked pill, so leaving is always easy to find.
    leave: {
        minWidth: HEADER_SIDE_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        height: 38,
        paddingLeft: 8,
        paddingRight: 14,
        borderRadius: 19,
        backgroundColor: p.surface,
        ...inked(p),
    },
    leaveIcon: {
        color: p.text,
        fontSize: 26,
        lineHeight: 28,
        marginTop: -3,
    },
    leaveText: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 14,
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
    title: {
        flex: 1,
        textAlign: "center",
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 20,
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
    // A tray the cards sit in: rounded and inked along its top.
    hand: {
        paddingTop: 16,
        paddingHorizontal: 12,
        borderTopWidth: 3,
        borderTopColor: p.outline,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: p.surface,
    },
}));
