import { Text } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type CoinCounterProps = {
    coins: number;
};

/**
 * The coin readout — icon plus count. Coins are the currency: what Vendors
 * and the Market price things in.
 *
 * Unpositioned: the world screen places it (bottom-left, above the bar), so
 * this stays a plain row that can be dropped anywhere.
 */
export default function CoinCounter({ coins }: CoinCounterProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel tone="surface" style={styles.row} accessibilityRole="text" accessibilityLabel={`${coins} coins`}>
            <Icon name="two-coins" size={18} color={palette.reward} />
            {/* `toLocaleString` because balances reach six figures and an
                unseparated run of digits is unreadable at a glance. */}
            <Text style={styles.count}>{coins.toLocaleString()}</Text>
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    // A pill of its own, so it reads over any patch of map.
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingLeft: 8,
        paddingRight: 12,
    },
    count: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 15,
        // Tabular figures so the row doesn't jitter as the count changes.
        fontVariant: ["tabular-nums"],
    },
}));
