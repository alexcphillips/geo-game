import type { GeoQuestObjective, GeoQuestView } from "@/lib/geo/contracts";

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

/** Dev only, until the server serves quests: enough to see sorting, long labels and completion. */
export const SAMPLE_QUESTS: GeoQuestView[] = [
    {
        id: "sample.slime-cull",
        title: "Slime Cull",
        giver: "The Mayor",
        status: "active",
        tracked: true,
        startedAt: "2026-10-18T09:00:00.000Z",
        objectives: [{ id: "kill", label: "Kill Green Slime", current: 10, target: 25 }],
    },
    {
        id: "sample.angler-favour",
        title: "The Angler's Favour",
        giver: "The Angler",
        status: "active",
        tracked: false,
        startedAt: "2026-10-18T10:00:00.000Z",
        objectives: [
            { id: "catch", label: "Catch Salmon at any river or lake", current: 2, target: 5 },
            { id: "bait", label: "Gather Worm Bait", current: 3, target: 3 },
        ],
    },
    {
        id: "sample.ore-run",
        title: "Ore for the Smith",
        giver: null,
        status: "active",
        tracked: false,
        startedAt: "2026-10-18T11:00:00.000Z",
        objectives: [{ id: "ore", label: "Mine Copper Ore", current: 7, target: 8 }],
    },
];
