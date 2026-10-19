// Copied from cozy-app/shared/src/geo/quest.contract.ts by scripts/sync-geo-contracts.mjs — do not edit.

/**
 * Quests: a player's active quests and how far along each one is.
 *
 * The server counts progress (a kill, a catch, an item gathered) and writes
 * each objective's label, so a new kind of objective needs no app change: the
 * app draws `label (current/target)`. When every objective is met the quest is
 * `ready` and waits to be turned in for its reward; claimed quests leave the
 * list.
 *
 * Not served yet: the app shows dev samples until the quest system is built.
 */

/** One thing to do, e.g. Kill Green Slime (10/25). */
export type GeoQuestObjective = {
    id: string;
    /** What to do, without the count: "Kill Green Slime". */
    label: string;
    current: number;
    target: number;
};

/** `active` while objectives remain; `ready` once all are met, until claimed. */
export type GeoQuestStatus = "active" | "ready";

export type GeoQuestView = {
    id: string;
    title: string;
    /** Who gave it, e.g. "The Angler"; null for quests with no giver. */
    giver: string | null;
    status: GeoQuestStatus;
    objectives: GeoQuestObjective[];
    /** The one the player follows: shown in the HUD tracker when it's collapsed. */
    tracked: boolean;
    /** ISO time it was taken. Orders quests of the same status, oldest first. */
    startedAt: string;
};
