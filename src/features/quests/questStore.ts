import { create } from "zustand";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, apiPath } from "@/lib/api";
import { GEO_API_PATHS, type GeoCombatTier, type GeoQuestsResponse, type GeoQuestView } from "@/lib/geo/contracts";


type QuestState = {
    /** Active and ready quests, as the server sends them (unsorted). */
    quests: GeoQuestView[];
    /** The player's enemy tier and what the next one needs. Null until first read. */
    combatTier: GeoCombatTier | null;
    /** Re-reads the quests; failures are quiet, the next refresh tries again. */
    refresh: () => Promise<void>;
    /** Follow this quest in the tracker; only one is tracked at a time. */
    track: (questId: string) => Promise<void>;
    /** Turns in a ready quest. Throws ApiError with the server's reason. */
    claim: (questId: string) => Promise<void>;
};

let inFlight: Promise<void> | null = null;
let again = false;

/**
 * The player's quests, from the server. The server counts progress (kills,
 * dungeons, cooking, banking), so this re-reads whenever the player does:
 * a finished Run, a craft or a deposit all refresh the player.
 */
export const useQuestStore = create<QuestState>()((set) => {
    const adopt = ({ quests, combatTier }: GeoQuestsResponse) => set({ quests, combatTier });

    return {
        quests: [],
        combatTier: null,
        refresh: () => {
            // One read at a time; a refresh asked for mid-read runs once more after.
            if (inFlight) {
                again = true;
                return inFlight;
            }
            inFlight = (async () => {
                try {
                    do {
                        again = false;
                        adopt(await api.get<GeoQuestsResponse>(GEO_API_PATHS.quests.root));
                    } while (again);
                } catch {
                    // Offline or signed out: keep what's shown.
                } finally {
                    inFlight = null;
                }
            })();
            return inFlight;
        },
        track: async (questId) => adopt(await api.put<GeoQuestsResponse>(apiPath(GEO_API_PATHS.quests.track, { questId }))),
        claim: async (questId) => {
            adopt(await api.post<GeoQuestsResponse>(apiPath(GEO_API_PATHS.quests.claim, { questId })));
            // The reward landed in the purse and inventory.
            void usePlayerStore.getState().refresh();
        },
    };
});

usePlayerStore.subscribe((state, previous) => {
    if (state.me === previous.me) return;
    if (state.me) void useQuestStore.getState().refresh();
    else useQuestStore.setState({ quests: [], combatTier: null });
});
