import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { rarityInfo, type Rarity } from "@/features/inventory/rarity";
import { colors } from "@/theme/colors";

export type HaulLine = {
    key: string;
    name: string;
    icon: GameIconName;
    rarity: Rarity;
    qty: number;
    /** A quality word shown before the name: Flawless, Prize, Ripe… */
    grade?: string;
    color?: string;
    /** Struck through: lost, buried, spoiled. */
    lost?: boolean;
};

/**
 * The end of a gathering Run, popped over the scene: what you got, what you
 * lost, and the buttons. Shared by mining, farming and foraging so the three
 * end the same way.
 */
export default function HaulCard({
    icon,
    iconColor,
    title,
    body,
    lines,
    meta,
    actions,
}: {
    icon: GameIconName;
    iconColor: string;
    title: string;
    body?: string;
    lines: HaulLine[];
    meta?: string;
    actions: ReactNode;
}) {
    const [pop] = useState(() => new Animated.Value(0));
    useEffect(() => {
        Animated.timing(pop, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }).start();
    }, [pop]);
    return (
        <Animated.View
            style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }] }]}
        >
            <Icon name={icon} size={44} color={iconColor} />
            <Text style={styles.title}>{title}</Text>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {lines.length > 0 ? (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {lines.map((line) => (
                        <View key={line.key + (line.lost ? "-lost" : "")} style={styles.line}>
                            <Icon name={line.icon} size={18} color={line.color ?? rarityInfo(line.rarity).color} />
                            <Text style={[styles.lineText, line.lost && styles.lost]} numberOfLines={1}>
                                {line.grade ? <Text style={styles.grade}>{line.grade} </Text> : null}
                                {line.name}
                            </Text>
                            <Text style={[styles.qty, line.lost && styles.lost]}>×{line.qty}</Text>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <Text style={styles.body}>Nothing this time.</Text>
            )}
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            <View style={styles.actions}>{actions}</View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: "center",
        gap: 6,
        width: 320,
        maxWidth: "90%",
        maxHeight: "86%",
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    title: {
        color: colors.effect,
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        textAlign: "center",
    },
    body: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: "center",
    },
    list: {
        alignSelf: "stretch",
        flexGrow: 0,
    },
    listContent: {
        gap: 4,
        paddingVertical: 4,
    },
    line: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: colors.surfaceRaised,
    },
    lineText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
    },
    grade: {
        color: colors.tierGold,
        fontWeight: "700",
    },
    qty: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    lost: {
        color: colors.textSecondary,
        textDecorationLine: "line-through",
    },
    meta: {
        color: colors.textSecondary,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 6,
    },
});
