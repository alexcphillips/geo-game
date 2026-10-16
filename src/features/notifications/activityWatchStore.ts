import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** A spot the player asked to hear about, and the alert scheduled for it. */
export type ActivityWatch = {
    notificationId: string;
    /** ISO time the alert fires; the watch is over after that. */
    firesAt: string;
};

type ActivityWatchState = {
    /** Keyed by place id. */
    watches: Record<string, ActivityWatch>;
    setWatch: (placeId: string, watch: ActivityWatch) => void;
    clearWatch: (placeId: string) => void;
    /** Forget every watch — their alerts were cancelled together. */
    clearAll: () => void;
};

/**
 * Which spots have an activity alert pending, persisted so the bell stays lit
 * across launches. A watch covers the *next* change only — scaffold — so it
 * lapses once its alert fires; re-arming on every change comes with the
 * server, which will know about changes the app can't predict.
 */
export const useActivityWatchStore = create<ActivityWatchState>()(
    persist(
        (set) => ({
            watches: {},
            setWatch: (placeId, watch) =>
                set((state) => ({ watches: { ...state.watches, [placeId]: watch } })),
            clearWatch: (placeId) =>
                set((state) => {
                    const next = { ...state.watches };
                    delete next[placeId];
                    return { watches: next };
                }),
            clearAll: () => set({ watches: {} }),
        }),
        {
            name: "geo-game.activity-watches",
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
