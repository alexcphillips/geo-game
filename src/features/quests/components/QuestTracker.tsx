import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutAnimation, Pressable, Text, useWindowDimensions, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import { useIsFocused } from "expo-router";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import type { GeoQuestView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { headlineQuest, isObjectiveDone, objectiveCount, sortQuests } from "../quests";
import { toErrorMessage } from "@/lib/api";
import { useQuestStore } from "../questStore";
import ObjectiveLine, { glowStyles, useCountGlow } from "./ObjectiveLine";

type QuestTrackerProps = {
    onOpenLog: () => void;
};

/** Quests listed when expanded; the log has the rest. */
const MAX_EXPANDED = 5;

/** Room for "Catch Salmon at any river or lake (2/5)" on a phone, clear of the compass. */
const WIDTH_FRACTION = 0.68;
const MAX_WIDTH = 340;

/**
 * The quest tracker on the world screen's left edge, under health and coins.
 *
 * Collapsed, it's one line: the tracked quest's next unfinished objective,
 * "Kill Green Slime (10/25)", and how many more quests there are (or the
 * quest's title and "Ready" once it's done). Tapping it expands every quest in order (ready to
 * turn in first, then tracked, then oldest), where tapping a quest tracks it,
 * plus a link to the full quest log. Hidden when there are no quests.
 *
 * Counts glow as they go up. When a quest's last objective is met it gets a
 * tick, moves to the top, and a toast says it's ready; the list slides into
 * its new order rather than jumping.
 */
export default function QuestTracker({ onOpenLog }: QuestTrackerProps) {
    const styles = useStyles();
    const palette = useTheme();
    const quests = useQuestStore((state) => state.quests);
    const track = useQuestStore((state) => state.track);
    const sorted = useMemo(() => sortQuests(quests), [quests]);
    const [isOpen, setIsOpen] = useState(false);
    const { width } = useWindowDimensions();
    useQuestUpdates();

    const headline = headlineQuest(sorted);
    if (!headline) return null;

    const readyCount = sorted.filter((quest) => quest.status === "ready").length;
    const shown = isOpen ? sorted.slice(0, MAX_EXPANDED) : [headline];

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOpen((open) => !open);
    };

    const maxWidth = Math.min(width * WIDTH_FRACTION, MAX_WIDTH);

    if (!isOpen) {
        return (
            <Panel tone="surface" style={[styles.panel, styles.panelCollapsed, { maxWidth }]}>
                <CollapsedQuest quest={headline} others={sorted.length - 1} othersReady={readyCount - (headline.status === "ready" ? 1 : 0)} onPress={toggle} />
            </Panel>
        );
    }

    return (
        <Panel tone="surface" style={[styles.panel, { maxWidth }]}>
            <Pressable
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
                onPress={toggle}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`Quests, ${sorted.length}${readyCount > 0 ? `, ${readyCount} ready` : ""}. ${isOpen ? "Collapse" : "Expand"}`}
            >
                <Icon name="scroll-unfurled" size={14} color={palette.ember} />
                <Text style={styles.headerLabel}>Quests</Text>
                {readyCount > 0 && <Text style={styles.readyCount}>{readyCount} ready</Text>}
                {!isOpen && sorted.length > 1 && <Text style={styles.more}>+{sorted.length - 1}</Text>}
                <Text style={styles.chevron}>{isOpen ? "▾" : "▸"}</Text>
            </Pressable>

            {shown.map((quest) => (
                <QuestBlock
                    key={quest.id}
                    quest={quest}
                    // Collapsed, the whole panel opens the list; expanded, a quest tracks itself.
                    onPress={isOpen ? () => void track(quest.id).catch((error) => showToast(toErrorMessage(error), "error")) : toggle}
                    isMarked={isOpen && quest.tracked}
                />
            ))}

            {isOpen && (
                <Pressable
                    style={({ pressed }) => [styles.logLink, pressed && styles.pressed]}
                    onPress={onOpenLog}
                    hitSlop={6}
                    accessibilityRole="button"
                >
                    <Text style={styles.logLinkText}>
                        {sorted.length > MAX_EXPANDED ? `Quest log (${sorted.length}) ›` : "Quest log ›"}
                    </Text>
                </Pressable>
            )}
        </Panel>
    );
}

type CollapsedQuestProps = {
    quest: GeoQuestView;
    /** Quests not shown, and how many of those are ready. */
    others: number;
    othersReady: number;
    onPress: () => void;
};

/** The collapsed tracker: one line, the next thing to do. */
function CollapsedQuest({ quest, others, othersReady, onPress }: CollapsedQuestProps) {
    const styles = useStyles();
    const palette = useTheme();
    const isReady = quest.status === "ready";
    const next = quest.objectives.find((objective) => !isObjectiveDone(objective)) ?? quest.objectives[0];
    // Keyed on the quest's total, so a step on any objective lights the line.
    const glow = useCountGlow(quest.objectives.reduce((sum, objective) => sum + objective.current, 0));

    return (
        <Pressable
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            onPress={onPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ expanded: false }}
            accessibilityLabel={`Quest: ${quest.title}${isReady ? ", ready to turn in" : ""}${others > 0 ? `, ${others} more` : ""}. Expand`}
        >
            <View style={styles.titleRow}>
                <Animated.View style={[glowStyles.glow, { opacity: glow }]} pointerEvents="none" />
                <Icon
                    name={isReady ? "check-mark" : "scroll-unfurled"}
                    size={12}
                    color={isReady ? palette.heal : palette.ember}
                />
                {isReady || !next ? (
                    <Text style={[styles.titleCompact, styles.titleReady]} numberOfLines={1}>
                        {quest.title} · Ready
                    </Text>
                ) : (
                    <>
                        {/* Shrinks first, so the count always stays whole. */}
                        <Text style={styles.titleCompact} numberOfLines={1}>
                            {next.label}
                        </Text>
                        <Text style={styles.countCompact}>{objectiveCount(next)}</Text>
                    </>
                )}
                {others > 0 && (
                    <Text style={[styles.more, othersReady > 0 && styles.moreReady]}>+{others}</Text>
                )}
                <Text style={styles.chevron}>▸</Text>
            </View>
        </Pressable>
    );
}

type QuestBlockProps = {
    quest: GeoQuestView;
    onPress: () => void;
    /** The tracked quest in the expanded list. */
    isMarked: boolean;
};

function QuestBlock({ quest, onPress, isMarked }: QuestBlockProps) {
    const styles = useStyles();
    const palette = useTheme();
    const isReady = quest.status === "ready";

    return (
        <Pressable
            style={({ pressed }) => [styles.quest, isMarked && styles.questMarked, pressed && styles.pressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${quest.title}${isReady ? ", ready to turn in" : ""}${quest.tracked ? ", tracked" : ""}`}
        >
            <View style={styles.titleRow}>
                {isReady && <Icon name="check-mark" size={13} color={palette.heal} />}
                <Text style={[styles.title, isReady && styles.titleReady]} numberOfLines={1}>
                    {quest.title}
                </Text>
            </View>
            {isReady ? (
                <Text style={styles.readyLine}>Ready to turn in</Text>
            ) : (
                quest.objectives.map((objective) => (
                    <ObjectiveLine key={objective.id} objective={objective} singleLine />
                ))
            )}
        </Pressable>
    );
}

/**
 * Reacts to quest changes as they land, before React draws them: slides the
 * list into a new order, and says when a quest becomes ready. Only while the
 * world screen is in front, so a change during a fight doesn't animate the
 * fight's layout; the toast shows wherever the player is.
 */
function useQuestUpdates() {
    const isFocused = useIsFocused();
    const isFocusedRef = useRef(isFocused);
    useEffect(() => {
        isFocusedRef.current = isFocused;
    }, [isFocused]);

    useEffect(
        () =>
            useQuestStore.subscribe((state, previous) => {
                const before = new Map(previous.quests.map((quest) => [quest.id, quest]));
                const newlyReady = state.quests.filter(
                    (quest) => quest.status === "ready" && before.get(quest.id)?.status === "active",
                );
                const order = (list: GeoQuestView[]) => sortQuests(list).map((quest) => quest.id).join();
                const isReordered = order(state.quests) !== order(previous.quests);

                if (isFocusedRef.current && (isReordered || newlyReady.length > 0)) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                }
                for (const quest of newlyReady) {
                    showToast(`Quest complete: ${quest.title}. Turn it in from the quest log.`, "success");
                }
            }),
        [],
    );
}

const useStyles = createStyles((p) => ({
    // An inked panel, like the health above it, so it reads over any map.
    panel: {
        marginTop: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 6,
    },
    panelCollapsed: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    titleCompact: {
        flexShrink: 1,
        color: p.text,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    countCompact: {
        color: p.ember,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
        fontVariant: ["tabular-nums"],
    },
    moreReady: {
        color: p.heal,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    headerLabel: {
        color: p.ember,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    readyCount: {
        color: p.heal,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
    },
    more: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyBold,
    },
    chevron: {
        color: p.textMuted,
        fontSize: 11,
    },
    pressed: {
        opacity: 0.7,
    },
    quest: {
        gap: 1,
        paddingLeft: 4,
        borderLeftWidth: 2,
        borderLeftColor: "transparent",
    },
    questMarked: {
        borderLeftColor: p.ember,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    title: {
        flexShrink: 1,
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    titleReady: {
        color: p.heal,
    },
    readyLine: {
        color: p.heal,
        fontFamily: FONTS.bodyBold,
        fontSize: 12,
    },
    logLink: {
        alignSelf: "flex-start",
    },
    logLinkText: {
        color: p.ember,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
}));
