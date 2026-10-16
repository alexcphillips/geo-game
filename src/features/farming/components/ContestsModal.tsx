import { ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import type { GeoCropView, GeoFarmContestId, GeoFarmContests } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { untilText } from "../farmText";

type ContestsModalProps = {
    contests: GeoFarmContests;
    crops: Record<string, GeoCropView>;
    now: number;
    onClose: () => void;
};

const CONTEST_INFO: Record<GeoFarmContestId, { name: string; rule: string }> = {
    harvest: { name: "Total Harvest", rule: "Everything you harvest this week, at NPC value. Mutations don't count." },
    mutation: { name: "Top Mutation", rule: "Your best single mutation harvest this week, at NPC value." },
    crop: { name: "Crop Contest", rule: "Every harvest of this week's crop, at NPC value." },
};

/**
 * This week's three farm contests: the leaders, where the player stands,
 * and the prizes. Harvests count as they happen; prizes are paid Monday.
 */
export default function ContestsModal({ contests, crops, now, onClose }: ContestsModalProps) {
    const prizes = contests.prizes.map((prize, i) => `${["1st", "2nd", "3rd"][i] ?? `${i + 1}th`} ${prize.toLocaleString()}`).join(" · ");
    return (
        <Modal title="Contests" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Text style={styles.hint}>
                    Close and pay out {untilText(contests.endsAt, now)}. Prizes in each: {prizes} coins, and {contests.participation} for everyone else who
                    entered.
                </Text>
                {contests.standings.map((standing) => {
                    const info = CONTEST_INFO[standing.contest];
                    const title = standing.contest === "crop" ? `${info.name}: ${crops[contests.cropId]?.name ?? contests.cropId}` : info.name;
                    return (
                        <View key={standing.contest} style={styles.contest}>
                            <View style={styles.header}>
                                <Icon name="trophy" size={18} color={colors.coins} />
                                <Text style={styles.name}>{title}</Text>
                            </View>
                            <Text style={styles.hint}>{info.rule}</Text>
                            {standing.top.length === 0 ? (
                                <Text style={styles.hint}>Nobody has entered yet.</Text>
                            ) : (
                                standing.top.map((leader, i) => (
                                    <Text key={i} style={styles.row}>
                                        {i + 1}. {leader.name} · {leader.score.toLocaleString()}
                                    </Text>
                                ))
                            )}
                            <Text style={styles.mine}>
                                {standing.rank === null
                                    ? "You haven't entered yet."
                                    : `You: ${standing.rank} of ${standing.entrants} · ${standing.score.toLocaleString()}`}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 16,
        paddingBottom: 16,
    },
    contest: {
        gap: 4,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
    },
    row: {
        color: colors.textPrimary,
        fontSize: 13,
    },
    mine: {
        color: colors.cropRipe,
        fontSize: 13,
        fontWeight: "600",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
});
