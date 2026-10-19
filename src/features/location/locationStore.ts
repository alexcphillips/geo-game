import { create } from "zustand";
import type { Coordinates } from "./distance";

/**
 * The player's last GPS fix, for screens and actions that aren't handed the
 * position as a prop: the Character screen's lunchbox, and the requests that
 * the server checks against camp. Written by `usePlayerLocation`, which also
 * reads it back, so every screen shows the newest fix any of them got.
 */
export const useLocationStore = create<{ position: (Coordinates & { accuracy: number | null }) | null }>()(() => ({ position: null }));

/** The last fix, outside React: what a request sends as `position`. */
export function lastPosition(): Coordinates | null {
    return useLocationStore.getState().position;
}
