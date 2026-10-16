import { StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

type CoinCounterProps = {
    coins: number;
};

/**
 * The coin readout — icon plus count. Coins are the currency: what Vendors
 * and the Market price things in.
 *
 * Unpositioned: `PlayerStatusHud` owns where it sits, so this stays a plain
 * row that can be dropped anywhere.
 */
export default function CoinCounter({ coins }: CoinCounterProps) {
    return (
        <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${coins} coins`}>
            <Icon name="coins" size={18} color={colors.coins} />
            {/* `toLocaleString` because balances reach six figures and an
                unseparated run of digits is unreadable at a glance. */}
            <Text style={styles.count}>{coins.toLocaleString()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    count: {
        color: colors.coins,
        fontSize: 15,
        fontWeight: "600",
        // Tabular figures so the row doesn't jitter as the count changes.
        fontVariant: ["tabular-nums"],
        // The HUD floats over the map with no panel behind it, so the text
        // carries its own contrast.
        textShadowColor: "rgba(0, 0, 0, 0.95)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
