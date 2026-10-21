import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import PreviewParts, { describeParts } from "@/features/run/components/PreviewParts";
import type { GeoEnemyIntent } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";

type EnemyIntentProps = {
    intent: GeoEnemyIntent | undefined;
    /** Changes whenever a fresh intent is shown, so the badge settles in again even for a repeated move. */
    revealKey: string;
    /** Dimmed while the enemy is carrying it out, or the fight is waiting on something else. */
    active: boolean;
    /** Changes the moment the enemy makes its move: the badge pulses, tying it to what happens. */
    firedKey: number;
};

/**
 * What the enemy will do on its turn, under its figure: the move's name in
 * small caps over a dark pill of icon-and-number parts. A hit reads
 * "⚔ 4 ×3": the number is per hit and already counts your defense, so it
 * drops when you equip armor.
 */
export default function EnemyIntent({ intent, revealKey, active, firedKey }: EnemyIntentProps) {
    const styles = useStyles();
    const [reveal] = useState(() => new Animated.Value(0));
    const [fire] = useState(() => new Animated.Value(0));

    useEffect(() => {
        reveal.setValue(0);
        Animated.timing(reveal, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [revealKey, reveal]);

    useEffect(() => {
        if (firedKey === 0) return;
        fire.setValue(0);
        Animated.sequence([
            Animated.timing(fire, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(fire, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start();
    }, [firedKey, fire]);

    if (!intent || intent.parts.length === 0) return <IntentSpacer />;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    // Dimmed while waiting, lit back up for the pulse as it fires.
                    opacity: Animated.multiply(reveal, Animated.add(active ? 1 : 0.45, Animated.multiply(fire, active ? 0 : 0.55))),
                    transform: [
                        { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
                        { scale: fire.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                    ],
                },
            ]}
            accessible
            accessibilityLabel={`Next move: ${intent.name}. ${describeParts(intent.parts, "enemy")}.`}
        >
            <Text style={styles.name} numberOfLines={1}>
                {intent.name}
            </Text>
            <View style={styles.pill}>
                <PreviewParts parts={intent.parts} />
            </View>
        </Animated.View>
    );
}

/** Same height as a badge, so the figures don't jump when one comes or goes. */
const BADGE_HEIGHT = 46;

/** The badge's room, under a combatant with no intent (the player), so both stand on one ground line. */
export function IntentSpacer() {
    const styles = useStyles();
    return <View style={styles.spacer} />;
}

const useStyles = createStyles((p) => ({
    container: {
        alignItems: "center",
        gap: 4,
        height: BADGE_HEIGHT,
        marginTop: 6,
    },
    spacer: {
        height: BADGE_HEIGHT,
        marginTop: 6,
    },
    name: {
        maxWidth: 170,
        color: p.textMuted,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    pill: {
        paddingVertical: 4,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: p.surface,
        ...inked(p),
    },
}));
