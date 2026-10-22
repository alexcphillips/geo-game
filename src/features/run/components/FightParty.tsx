import { View } from "react-native";
import Meter from "@/components/Meter/Meter";
import Pill from "@/components/Pill/Pill";
import { Label } from "@/components/Text/Text";
import { useTermCountdown } from "@/features/community/useTermCountdown";
import type { GeoCombatantView } from "@/lib/geo/contracts";
import { createStyles, useTheme } from "@/theme/theme";

type FightPartyProps = {
    /** The other players in a shared fight. */
    teammates: GeoCombatantView[];
    /** Whose turn it is. */
    actorId: string | null;
    /** When the current player's turn is skipped (ms, server clock), if a player's is running. */
    deadline: number | null;
    /** The server's clock minus the phone's. */
    clockOffsetMs: number;
};

/** "0:24". */
const secondsLeft = (ms: number) => {
    const total = Math.ceil(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * The rest of the party in a shared fight: each one's health, whose turn it
 * is with its clock, and who's down or fled. Their figures aren't drawn in
 * the arena; this is where they live.
 */
export default function FightParty({ teammates, actorId, deadline, clockOffsetMs }: FightPartyProps) {
    const styles = useStyles();
    const palette = useTheme();
    const left = useTermCountdown(deadline, clockOffsetMs);
    if (teammates.length === 0) return null;
    return (
        <View style={styles.row}>
            {teammates.map((mate) => {
                const isDown = mate.health <= 0;
                const isTheirTurn = mate.id === actorId && !isDown && !mate.left;
                const status = mate.left
                    ? { label: "Fled", color: palette.textMuted }
                    : isDown
                      ? { label: "Down", color: palette.textMuted }
                      : isTheirTurn
                        ? { label: deadline !== null ? `Their turn ${secondsLeft(left)}` : "Their turn", color: palette.ember }
                        : null;
                return (
                    <View
                        key={mate.id}
                        style={[styles.mate, (isDown || mate.left) && styles.out]}
                        accessible
                        accessibilityLabel={`${mate.name}, health ${mate.health} of ${mate.maxHealth}${status ? `, ${status.label}` : ""}`}
                    >
                        <View style={styles.head}>
                            <Label numberOfLines={1} style={styles.name}>
                                {mate.name}
                            </Label>
                            {status && <Pill label={status.label} color={status.color} />}
                        </View>
                        <Meter value={mate.maxHealth > 0 ? mate.health / mate.maxHealth : 0} color={palette.game.health} height={5} />
                    </View>
                );
            })}
        </View>
    );
}

const useStyles = createStyles(() => ({
    row: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingTop: 6 },
    mate: { flexGrow: 1, flexBasis: "30%", gap: 4 },
    out: { opacity: 0.5 },
    head: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1 },
}));
