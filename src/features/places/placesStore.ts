import { create } from "zustand";

type PlacesState = {
    /** Bumped after an admin changes a place, so the map fetches them again now. */
    version: number;
    refetch: () => void;
};

export const usePlacesStore = create<PlacesState>((set) => ({
    version: 0,
    refetch: () => set((state) => ({ version: state.version + 1 })),
}));
