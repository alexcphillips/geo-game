import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FarmGuideState = {
    /** The first-visit coach is over: a first harvest, or dismissed. */
    isDone: boolean;
    finish: () => void;
};

/**
 * The farm's first-visit coach (plant → wait → harvest), remembered on the
 * device. A new device shows it again, which does no harm.
 */
export const useFarmGuideStore = create<FarmGuideState>()(
    persist(
        (set) => ({
            isDone: false,
            finish: () => set({ isDone: true }),
        }),
        {
            name: "geo-game.farm-guide",
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
