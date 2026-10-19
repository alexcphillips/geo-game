import { create } from "zustand";
import type { GeoQuestView } from "@/lib/geo/contracts";
import { SAMPLE_QUESTS } from "./quests";

type QuestState = {
    /** Active and ready quests, as the server sends them (unsorted). */
    quests: GeoQuestView[];
    setQuests: (quests: GeoQuestView[]) => void;
    /** Follow this quest in the tracker; only one is tracked at a time. */
    track: (questId: string) => void;
    /** Dev only: one step on the first unmet objective, for testing updates. */
    devAdvance: (questId?: string) => void;
    /** Dev only: claims a ready quest by dropping it, as the server will. */
    devClaim: (questId: string) => void;
};

/**
 * The player's quests. Starts with samples in dev builds and empty otherwise,
 * so the tracker stays hidden in release builds until the server serves
 * quests. `track` is local for now; it becomes a request then.
 */
export const useQuestStore = create<QuestState>()((set) => ({
    quests: __DEV__ ? SAMPLE_QUESTS : [],
    setQuests: (quests) => set({ quests }),
    track: (questId) =>
        set((state) => ({
            quests: state.quests.map((quest) => ({ ...quest, tracked: quest.id === questId })),
        })),
    devAdvance: (questId) =>
        set((state) => {
            const target =
                state.quests.find((quest) => quest.id === questId) ??
                state.quests.find((quest) => quest.tracked && quest.status === "active") ??
                state.quests.find((quest) => quest.status === "active");
            if (!target) return state;
            let stepped = false;
            const objectives = target.objectives.map((objective) => {
                if (stepped || objective.current >= objective.target) return objective;
                stepped = true;
                return { ...objective, current: objective.current + 1 };
            });
            const isDone = objectives.every((objective) => objective.current >= objective.target);
            const next = { ...target, objectives, status: isDone ? ("ready" as const) : target.status };
            return { quests: state.quests.map((quest) => (quest.id === target.id ? next : quest)) };
        }),
    devClaim: (questId) => set((state) => ({ quests: state.quests.filter((quest) => quest.id !== questId) })),
}));
