import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { ReactNode } from "react";
import Icon from "@/components/Icon/Icon";
import FishDrawing from "@/features/fishing/components/FishDrawing";
import { fishArt } from "@/features/fishing/fishArt";
import { QUALITY_TIER_COLORS, QUALITY_TIER_LABELS } from "@/features/fishing/fishingText";
import type { GeoFishingOutcome, GeoQualityTier } from "@/lib/geo/contracts";
import { rarityInfo } from "@/features/items/rarity";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

const ART = 200;
const RIM = 76;

/**
 * The end of a cast, popped over the scene: the fish in its quality rim, or
 * what went wrong. The tier is a metal rim (and a gem for Ruby) rather than a
 * colour, so it never clashes with the fish's rarity.
 */
export default function CatchCard({ outcome, actions }: { outcome: GeoFishingOutcome; actions: ReactNode }) {
    const styles = useStyles();
    const palette = useTheme();
    const [pop] = useState(() => new Animated.Value(0));
    useEffect(() => {
        Animated.timing(pop, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
    }, [pop]);

    return (
        <Animated.View
            style={[
                styles.card,
                { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
            ]}
        >
            {outcome.kind === "landed" ? (
                <Landed outcome={outcome} />
            ) : outcome.kind === "creature" ? (
                <>
                    <Icon name="kraken-tentacle" size={48} color={palette.game.statusPoison} />
                    <Text style={styles.title}>{outcome.name}!</Text>
                    <Text style={styles.body}>It drags you into a fight…</Text>
                </>
            ) : (
                <>
                    <Icon name="fish-escape" size={48} color={palette.textMuted} />
                    <Text style={styles.title}>Got away</Text>
                    <Text style={styles.body}>{outcome.reason}</Text>
                    {outcome.turns > 0 && <Text style={styles.meta}>{turnsText(outcome.turns)}</Text>}
                </>
            )}
            <View style={styles.actions}>{actions}</View>
        </Animated.View>
    );
}

function Landed({ outcome }: { outcome: Extract<GeoFishingOutcome, { kind: "landed" }> }) {
    const styles = useStyles();
    const palette = useTheme();
    const { tier } = outcome;
    const fish = fishArt(outcome.fishId);
    const rarity = rarityInfo(outcome.rarity);
    const tierColor = tier ? QUALITY_TIER_COLORS[tier] : palette.textMuted;
    return (
        <>
            <Svg width={ART} height={ART * 0.72} viewBox={`${-ART / 2} ${-ART * 0.36} ${ART} ${ART * 0.72}`}>
                {tier && <QualityRim tier={tier} />}
                <G>
                    <FishDrawing fish={fish} length={Math.min(140, 70 + fish.length * 40)} />
                </G>
            </Svg>
            <Text style={[styles.tier, { color: tierColor }]}>
                {tier ? `${QUALITY_TIER_LABELS[tier]} quality` : "Regular catch"}
            </Text>
            <Text style={styles.name}>{outcome.name}</Text>
            <View style={styles.badges}>
                <Badge text={rarity.label} color={rarity.color} />
                {tier ? (
                    <Badge text="Soulbound" color={palette.game.tierRuby} />
                ) : (
                    <Badge text="Tradable · cookable" color={palette.game.fishStamina} />
                )}
            </View>
            <Text style={styles.meta}>
                {outcome.how}
                {outcome.turns > 0 ? ` · ${turnsText(outcome.turns)}` : ""} · +{outcome.xp} Fishing XP
            </Text>
        </>
    );
}

function QualityRim({ tier }: { tier: GeoQualityTier }) {
    const palette = useTheme();
    const color = QUALITY_TIER_COLORS[tier];
    const studded = tier === "gold" || tier === "ruby";
    return (
        <G>
            <Circle r={RIM - 14} fill="none" stroke={color} strokeWidth={5} />
            <Circle r={RIM - 20} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
            {studded &&
                Array.from({ length: 8 }, (_, i) => {
                    const angle = (i * Math.PI) / 4;
                    return <Circle key={i} cx={Math.cos(angle) * (RIM - 14)} cy={Math.sin(angle) * (RIM - 14)} r={2.4} fill={color} />;
                })}
            {tier === "ruby" && (
                <Path d={`M0 ${-RIM - 3} l9 9 l-9 11 l-9 -11 Z`} fill={palette.game.tierRuby} stroke="#FFD1DF" strokeWidth={1} />
            )}
        </G>
    );
}

function Badge({ text, color }: { text: string; color: string }) {
    const styles = useStyles();
    return <Text style={[styles.badge, { color, borderColor: color }]}>{text}</Text>;
}

const turnsText = (turns: number) => `${turns} turn${turns === 1 ? "" : "s"}`;

const useStyles = createStyles((p) => ({
    card: {
        alignItems: "center",
        gap: 6,
        maxWidth: 340,
        paddingVertical: 22,
        paddingHorizontal: 26,
        marginHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    tier: {
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    name: {
        color: p.text,
        fontSize: 22,
        fontFamily: FONTS.bodyHeavy,
    },
    title: {
        color: p.game.effect,
        fontSize: 24,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    body: {
        color: p.textMuted,
        fontSize: 14,
        textAlign: "center",
    },
    badges: {
        flexDirection: "row",
        gap: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 1,
        borderRadius: 999,
        borderWidth: 1,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        overflow: "hidden",
    },
    meta: {
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
}));
