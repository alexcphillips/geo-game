import { View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Panel from "@/components/Panel/Panel";
import Pill from "@/components/Pill/Pill";
import { Body, Hint, Label } from "@/components/Text/Text";
import { useTermCountdown } from "@/features/community/useTermCountdown";
import type { GeoDungeonPartyMember, GeoDungeonReadyUp } from "@/lib/geo/contracts";
import { createStyles, useTheme } from "@/theme/theme";
import { ROOM_KINDS } from "../dungeonRooms";

/** "1:05": minutes and seconds left. */
const minSec = (ms: number) => {
    const total = Math.ceil(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * The boss's ready-up, over the map: who's in the boss room, and the clock.
 * In the room, you're waiting for the rest; out of it with the clock on you,
 * it's how long you have to get there before you're out. `clockOffsetMs` is
 * the server's clock minus the phone's.
 */
export default function ReadyUpCard({
    readyUp,
    party,
    clockOffsetMs,
}: {
    readyUp: GeoDungeonReadyUp;
    party: GeoDungeonPartyMember[];
    clockOffsetMs: number;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const mine = useTermCountdown(readyUp.yourDeadline ? Date.parse(readyUp.yourDeadline) : null, clockOffsetMs);
    const stillIn = party.filter((member) => member.status === "active");

    const headline = readyUp.youAreReady
        ? readyUp.ready === readyUp.total
            ? "Everyone's here"
            : `Waiting for ${readyUp.total - readyUp.ready} more`
        : readyUp.yourDeadline
          ? `${minSec(mine)} to reach the boss`
          : "The party is gathering at the boss";
    const explain = readyUp.youAreReady
        ? readyUp.clockRunning
            ? "The others are on the clock. The boss starts when everyone still in is here. Walk out to stop waiting."
            : `The clock starts for the rest once ${readyUp.needed} are here. Walk out to stop waiting.`
        : readyUp.yourDeadline
          ? "Get to the boss room, or you're out of the dungeon. Your clock waits while you're in a fight."
          : `The clock starts once ${readyUp.needed} of ${readyUp.total} are in the boss room.`;

    return (
        <Panel compact style={[styles.card, !readyUp.youAreReady && readyUp.yourDeadline ? styles.urgent : null]}>
            <View style={styles.head}>
                <Icon name={ROOM_KINDS.boss.icon ?? "crossed-swords"} size={18} color={ROOM_KINDS.boss.color} />
                <Label style={styles.headline}>{headline}</Label>
                <Pill label={`${readyUp.ready}/${readyUp.total} ready`} color={readyUp.clockRunning ? palette.ember : undefined} />
            </View>
            <Hint>{explain}</Hint>
            <View style={styles.members}>
                {stillIn.map((member) => (
                    <MemberRow key={member.displayName} member={member} clockOffsetMs={clockOffsetMs} />
                ))}
            </View>
        </Panel>
    );
}

function MemberRow({ member, clockOffsetMs }: { member: GeoDungeonPartyMember; clockOffsetMs: number }) {
    const styles = useStyles();
    const palette = useTheme();
    const left = useTermCountdown(member.readyDeadline ? Date.parse(member.readyDeadline) : null, clockOffsetMs);
    return (
        <View style={styles.member}>
            <Body numberOfLines={1} style={styles.name}>
                {member.isYou ? "You" : member.displayName}
            </Body>
            {member.isReady ? (
                <Pill label="Ready" icon="check-mark" color={palette.game.dungeonDone} />
            ) : member.isFighting ? (
                <Pill label="Fighting" icon="crossed-swords" color={palette.game.health} />
            ) : member.readyDeadline ? (
                <Pill label={minSec(left)} color={palette.ember} />
            ) : (
                <Pill label="On the way" />
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    card: { gap: 8, padding: 14 },
    urgent: { borderColor: p.ember },
    head: { flexDirection: "row", alignItems: "center", gap: 8 },
    headline: { flex: 1 },
    members: { gap: 6 },
    member: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    name: { flexShrink: 1 },
}));
