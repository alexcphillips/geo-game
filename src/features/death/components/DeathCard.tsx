import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

type DeathCardProps = {
    /** What happened, e.g. "The giant spider got the better of you." */
    body: string;
    /** Every coin carried goes on death; null when the server didn't say. */
    coinsLost: number | null;
    /** The buttons along the bottom. */
    actions: ReactNode;
};

/**
 * The card shown when you die, however it happened: a lost fight, or the
 * admin kill. The caller places it, over a fight or on its own screen.
 */
export default function DeathCard({ body, coinsLost, actions }: DeathCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Defeated</Text>
            <Text style={styles.body}>{body}</Text>
            {coinsLost !== null && (
                <View style={styles.coins}>
                    <Icon name="coins" size={18} color={colors.coins} />
                    <Text style={styles.coinsText}>
                        You lost {coinsLost.toLocaleString()} {coinsLost === 1 ? "coin" : "coins"}!
                    </Text>
                </View>
            )}
            <View style={styles.actions}>{actions}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 22,
        paddingHorizontal: 26,
        marginHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    title: {
        color: colors.damage,
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    body: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: "center",
    },
    coins: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    coinsText: {
        color: colors.damage,
        fontSize: 16,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
});
