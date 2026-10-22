import { View } from "react-native";
import Pill from "@/components/Pill/Pill";
import { Body } from "@/components/Text/Text";
import type { GeoDungeonPartyMember } from "@/lib/geo/contracts";
import { createStyles, useTheme } from "@/theme/theme";

/** How the party's run stands: someone beat the boss, everyone's out, or it's still going. */
export function partyOutcome(party: GeoDungeonPartyMember[]): "cleared" | "fell" | "going" {
    if (party.some((member) => member.status === "won")) return "cleared";
    return party.every((member) => member.status === "failed") ? "fell" : "going";
}

/**
 * What became of everyone in the party, for the result card: cleared, fell,
 * fled, missed the boss, left, or still in it. Live: it moves with the
 * socket's pushes while the others play on.
 */
export default function PartyResult({ party }: { party: GeoDungeonPartyMember[] }) {
    const styles = useStyles();
    const palette = useTheme();
    const fateOf = (member: GeoDungeonPartyMember): { label: string; color: string; icon?: "trophy" | "crossed-swords" } => {
        if (member.status === "won") return { label: "Cleared", color: palette.reward, icon: "trophy" };
        if (member.status === "active") {
            return member.isFighting ? { label: "Fighting", color: palette.game.health, icon: "crossed-swords" } : { label: "Still in", color: palette.ember };
        }
        switch (member.outReason) {
            case "died":
                return { label: "Fell", color: palette.textMuted };
            case "fledBoss":
                return { label: "Fled the boss", color: palette.textMuted };
            case "missedBoss":
                return { label: "Missed the boss", color: palette.textMuted };
            default:
                return { label: "Left", color: palette.textMuted };
        }
    };
    return (
        <View style={styles.list}>
            {party.map((member) => {
                const fate = fateOf(member);
                return (
                    <View
                        key={member.displayName}
                        style={styles.row}
                        accessible
                        accessibilityLabel={`${member.isYou ? "You" : member.displayName}: ${fate.label}`}
                    >
                        <Body numberOfLines={1} style={styles.name}>
                            {member.isYou ? "You" : member.displayName}
                        </Body>
                        <Pill label={fate.label} icon={fate.icon} color={fate.color} />
                    </View>
                );
            })}
        </View>
    );
}

const useStyles = createStyles(() => ({
    list: { alignSelf: "stretch", gap: 6 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    name: { flexShrink: 1 },
}));
