import type { GeoCombatTier, GeoQuestObjective, GeoQuestView } from "@/lib/geo/contracts";

/** "Kill Green Slime (10/25)". */
export function objectiveCount(objective: GeoQuestObjective): string {
    return `(${Math.min(objective.current, objective.target)}/${objective.target})`;
}

export function isObjectiveDone(objective: GeoQuestObjective): boolean {
    return objective.current >= objective.target;
}

/**
 * Tracker and log order: ready to turn in first (there's something to claim),
 * then the tracked quest, then the rest, oldest first.
 */
export function sortQuests(quests: GeoQuestView[]): GeoQuestView[] {
    const rank = (quest: GeoQuestView) => (quest.status === "ready" ? 0 : quest.tracked ? 1 : 2);
    return [...quests].sort((a, b) => rank(a) - rank(b) || a.startedAt.localeCompare(b.startedAt));
}

/**
 * The quest the collapsed tracker shows: the tracked one, else the first in
 * order.
 */
export function headlineQuest(sorted: GeoQuestView[]): GeoQuestView | null {
    return sorted.find((quest) => quest.tracked) ?? sorted[0] ?? null;
}

/**
 * What stands between the player and the next enemy tier, or null at the top:
 * "Tier 2 enemies: reach combat level 5 and turn in Trial I."
 */
export function nextTierNote({ next }: GeoCombatTier): string | null {
    if (!next) return null;
    const needs = [
        ...(next.levelMet ? [] : [`reach combat level ${next.level}`]),
        ...(next.trial && !next.trial.done ? [`turn in ${next.trial.title}`] : []),
    ];
    return `Tier ${next.tier} enemies: ${needs.join(" and ")}.`;
}
