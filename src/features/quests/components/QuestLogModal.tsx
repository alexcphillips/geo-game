import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Pill from "@/components/Pill/Pill";
import EmptyState from "@/components/EmptyState/EmptyState";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import { toErrorMessage } from "@/lib/api";
import type { GeoQuestView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { nextTierNote, sortQuests } from "../quests";
import { useQuestStore } from "../questStore";
import ObjectiveLine from "./ObjectiveLine";

/**
 * Every quest in full, in the tracker's order, with each objective's label
 * written out rather than cut short. Track picks the quest the HUD follows;
 * Claim turns in a ready one, from anywhere. Above them, what the next enemy
 * tier still needs (its combat level, its Trial).
 */
export default function QuestLogModal({ onClose }: { onClose: () => void }) {
    const styles = useStyles();
    const quests = useQuestStore((state) => state.quests);
    const combatTier = useQuestStore((state) => state.combatTier);
    const sorted = useMemo(() => sortQuests(quests), [quests]);
    const tierNote = combatTier && nextTierNote(combatTier);

    useEffect(() => {
        void useQuestStore.getState().refresh();
    }, []);

    return (
        <Modal title="Quests" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <View style={styles.body}>
                {tierNote && <Text style={styles.tierNote}>{tierNote}</Text>}
                {sorted.length === 0 ? (
                    <EmptyState title="No quests yet." />
                ) : (
                    sorted.map((quest) => <QuestCard key={quest.id} quest={quest} />)
                )}
            </View>
        </Modal>
    );
}

function QuestCard({ quest }: { quest: GeoQuestView }) {
    const styles = useStyles();
    const palette = useTheme();
    const track = useQuestStore((state) => state.track);
    const claim = useQuestStore((state) => state.claim);
    const [isBusy, setIsBusy] = useState(false);
    const isReady = quest.status === "ready";

    const act = async (action: () => Promise<void>, done?: string) => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            await action();
            if (done) showToast(done, "success");
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <Panel compact style={[styles.card, quest.tracked && styles.cardTracked]}>
            <View style={styles.titleRow}>
                {isReady && <Icon name="check-mark" size={16} color={palette.heal} />}
                <Text style={[styles.title, isReady && styles.titleReady]}>{quest.title}</Text>
                {quest.tracked && <Pill label="Tracked" icon="scroll-unfurled" color={palette.ember} />}
            </View>
            {quest.unlocksTier !== null && <Text style={styles.trial}>Trial · opens tier {quest.unlocksTier} enemies</Text>}
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
                        onPress={() => void act(() => claim(quest.id), `Claimed ${quest.title}`)}
                    />
                )}
                {!quest.tracked && <ActionButton label="Track" onPress={() => void act(() => track(quest.id))} />}
            </View>
        </Panel>
    );
}

function ActionButton({ label, onPress, isPrimary = false }: { label: string; onPress: () => void; isPrimary?: boolean }) {
    return <Button label={label} size="small" variant={isPrimary ? "primary" : "secondary"} onPress={onPress} />;
}

const useStyles = createStyles((p) => ({
    body: {
        gap: 10,
        paddingBottom: 12,
    },
    card: {
        gap: 6,
        padding: 12,
    },
    cardTracked: {
        borderColor: p.ember,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    title: {
        flexShrink: 1,
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    titleReady: {
        color: p.heal,
    },
    giver: {
        color: p.textMuted,
        fontSize: 12,
    },
    trial: {
        color: p.ember,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    tierNote: {
        color: p.textMuted,
        fontSize: 13,
        textAlign: "center",
    },
    objectives: {
        gap: 2,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
}));
