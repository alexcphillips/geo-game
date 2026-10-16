import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AdminSettingsState = {
    /** The ring around the player showing how far out enemies spawn. */
    showSpawnRadius: boolean;
    setShowSpawnRadius: (show: boolean) => void;
    /** Dev servers: keep the most enemies allowed around you, not the usual roll. */
    fillSpawns: boolean;
    setFillSpawns: (fill: boolean) => void;
    /** Bumped to make the map fetch its enemies again now, e.g. after a dev spawn. */
    spawnsVersion: number;
    refetchSpawns: () => void;
    /**
     * Free camera: pan anywhere, and count as in reach of every place (the
     * map's Start, and working the farm from the character screen).
     */
    isFreeCamera: boolean;
    setIsFreeCamera: (on: boolean) => void;
};

/**
 * Admin page settings, most persisted on the device to survive a restart.
 * The free camera lives here so other screens can see it, but is left out of
 * `partialize`: it should never come back on by surprise.
 */
export const useAdminSettingsStore = create<AdminSettingsState>()(
    persist(
        (set) => ({
            showSpawnRadius: true,
            setShowSpawnRadius: (show) => set({ showSpawnRadius: show }),
            fillSpawns: false,
            setFillSpawns: (fill) => set({ fillSpawns: fill }),
            spawnsVersion: 0,
            refetchSpawns: () => set((state) => ({ spawnsVersion: state.spawnsVersion + 1 })),
            isFreeCamera: false,
            setIsFreeCamera: (on) => set({ isFreeCamera: on }),
        }),
        {
            name: "geo-game.admin-settings",
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ showSpawnRadius: state.showSpawnRadius, fillSpawns: state.fillSpawns }),
        },
    ),
);
