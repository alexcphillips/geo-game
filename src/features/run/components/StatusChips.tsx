import { Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { displayName, statusColor } from "@/features/run/combat/playBattleLog";
import type { GeoCombatantView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/**
 * A combatant's statuses as small pills under it: a dot in the status's hue,
 * its name, stacks, and the turns it has left. Always the same height, so
 * figures don't shift as statuses come and go.
 */
export default function StatusChips({ combatant }: { combatant: GeoCombatantView | undefined }) {
    const styles = useStyles();
    const palette = useTheme();
    const statuses = combatant?.statuses ?? [];
    return (
        <View style={styles.row}>
            {statuses.map((status) => {
                const color = statusColor(status.statusId) ?? palette.game.effect;
                const name = displayName(status.statusId);
                const turns = status.turnsLeft;
                return (
                    <View
                        key={status.statusId}
                        style={styles.chip}
                        accessible
                        accessibilityLabel={`${name}${status.stacks > 1 ? `, ${status.stacks} stacks` : ""}${turns ? `, ${turns} turns left` : ""}`}
                    >
                        <View style={[styles.dot, { backgroundColor: color }]} />
                        <Text style={[styles.name, { color }]} numberOfLines={1}>
                            {name}
                            {status.stacks > 1 ? ` ×${status.stacks}` : ""}
                        </Text>
                        {turns !== null && turns > 0 && (
                            <View style={styles.turns}>
                                <Icon name="hourglass" size={9} color={palette.textMuted} />
                                <Text style={styles.turnsText}>{turns}</Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 4,
        maxWidth: 170,
        minHeight: 20,
        marginTop: 6,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 20,
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    name: {
        maxWidth: 90,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
    },
    turns: {
        flexDirection: "row",
        alignItems: "center",
        gap: 1,
    },
    turnsText: {
        color: p.textMuted,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
}));
