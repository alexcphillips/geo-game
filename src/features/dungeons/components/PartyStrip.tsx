import { View } from "react-native";
import Meter from "@/components/Meter/Meter";
import Pill from "@/components/Pill/Pill";
import { Label } from "@/components/Text/Text";
import type { GeoDungeonPartyMember } from "@/lib/geo/contracts";
import { createStyles, useTheme } from "@/theme/theme";

/**
 * The rest of the party under the map: each one's health, and whether
 * they're fighting, through, or out. Live: it moves with the socket's pushes.
 * Their health is as of their last room; mid-fight it catches up when the
 * fight ends.
 */
export default function PartyStrip({ party }: { party: GeoDungeonPartyMember[] }) {
    const styles = useStyles();
    const palette = useTheme();
    const others = party.filter((member) => !member.isYou);
    if (others.length === 0) return null;
    return (
        <View style={styles.strip}>
            {others.map((member) => {
                const share = member.maxHealth > 0 ? member.health / member.maxHealth : 0;
                const status =
                    member.status === "won"
                        ? { label: "Cleared", icon: "trophy" as const, color: palette.reward }
                        : member.status === "failed"
                          ? { label: "Out", icon: undefined, color: palette.textMuted }
                          : member.isFighting
                            ? { label: "Fighting", icon: "crossed-swords" as const, color: palette.game.health }
                            : member.isReady
                              ? { label: "At the boss", icon: "check-mark" as const, color: palette.game.dungeonDone }
                              : null;
                return (
                    <View
                        key={member.displayName}
                        style={[styles.member, member.status !== "active" && styles.out]}
                        accessible
                        accessibilityLabel={`${member.displayName}, health ${member.health} of ${member.maxHealth}${status ? `, ${status.label}` : ""}`}
                    >
                        <View style={styles.head}>
                            <Label numberOfLines={1} style={styles.name}>
                                {member.displayName}
                            </Label>
                            {status && <Pill label={status.label} icon={status.icon} color={status.color} />}
                        </View>
                        <Meter value={share} color={palette.game.health} height={5} />
                    </View>
                );
            })}
        </View>
    );
}

const useStyles = createStyles(() => ({
    strip: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    member: { flexGrow: 1, flexBasis: "45%", gap: 4 },
    out: { opacity: 0.55 },
    head: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1 },
}));
