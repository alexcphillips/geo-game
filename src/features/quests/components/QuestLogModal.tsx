import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import type { GeoQuestView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { sortQuests } from "../quests";
import { useQuestStore } from "../questStore";
import ObjectiveLine from "./ObjectiveLine";

/**
 * Every quest in full, in the tracker's order, with each objective's label
 * written out rather than cut short. Track picks the quest the HUD follows;
 * Claim turns in a ready one.
 *
 * Claiming and progress run on dev samples until the server serves quests:
 * Claim only drops the quest, and dev builds get a +1 button per quest to try
 * out the tracker's updates.
 */
export default function QuestLogModal({ onClose }: { onClose: () => void }) {
    const quests = useQuestStore((state) => state.quests);
    const sorted = useMemo(() => sortQuests(quests), [quests]);

    return (
        <Modal title="Quests" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <View style={styles.body}>
                {sorted.length === 0 ? (
                    <Text style={styles.empty}>No quests yet.</Text>
                ) : (
                    sorted.map((quest) => <QuestCard key={quest.id} quest={quest} />)
                )}
            </View>
        </Modal>
    );
}

function QuestCard({ quest }: { quest: GeoQuestView }) {
    const track = useQuestStore((state) => state.track);
    const devAdvance = useQuestStore((state) => state.devAdvance);
    const devClaim = useQuestStore((state) => state.devClaim);
    const isReady = quest.status === "ready";

    return (
        <View style={[styles.card, quest.tracked && styles.cardTracked]}>
            <View style={styles.titleRow}>
                {isReady && <Icon name="check-mark" size={16} color={colors.toastSuccess} />}
                <Text style={[styles.title, isReady && styles.titleReady]}>{quest.title}</Text>
                {quest.tracked && <Text style={styles.trackedTag}>Tracked</Text>}
            </View>
            {quest.giver && <Text style={styles.giver}>From {quest.giver}</Text>}

            <View style={styles.objectives}>
                {quest.objectives.map((objective) => (
                    <ObjectiveLine key={objective.id} objective={objective} />
                ))}
            </View>

            <View style={styles.actions}>
                {isReady && (
                    <ActionButton
                        label="Claim"
                        isPrimary
                        onPress={() => {
                            devClaim(quest.id);
                            showToast(`Claimed ${quest.title}`, "success");
                        }}
                    />
                )}
                {!quest.tracked && <ActionButton label="Track" onPress={() => track(quest.id)} />}
                {__DEV__ && !isReady && <ActionButton label="+1 (dev)" onPress={() => devAdvance(quest.id)} />}
            </View>
        </View>
    );
}

function ActionButton({ label, onPress, isPrimary = false }: { label: string; onPress: () => void; isPrimary?: boolean }) {
    return (
        <Pressable
            style={({ pressed }) => [styles.button, isPrimary && styles.buttonPrimary, pressed && styles.buttonPressed]}
            onPress={onPress}
            accessibilityRole="button"
        >
            <Text style={[styles.buttonLabel, isPrimary && styles.buttonLabelPrimary]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    body: {
        gap: 10,
        paddingBottom: 12,
    },
    empty: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: "center",
        marginTop: 24,
    },
    card: {
        gap: 6,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTracked: {
        borderColor: colors.ember,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    title: {
        flexShrink: 1,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
    },
    titleReady: {
        color: colors.toastSuccess,
    },
    trackedTag: {
        marginLeft: "auto",
        color: colors.emberBright,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    giver: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    objectives: {
        gap: 2,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    buttonPrimary: {
        backgroundColor: colors.ember,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonLabel: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "600",
    },
    buttonLabelPrimary: {
        color: colors.textOnEmber,
    },
});
