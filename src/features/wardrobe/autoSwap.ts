import { showToast } from "@/components/Toast/toastStore";
import { usePlayerStore } from "@/features/player/playerStore";

/**
 * After a fight or a fishing Run starts: the server may have auto-swapped the
 * loadout as it started, so the player is refetched, and a toast says which
 * loadout is on when it changed.
 */
export async function refreshAfterRunStart() {
    const before = usePlayerStore.getState().me?.wardrobe.activeSlot ?? null;
    await usePlayerStore.getState().refresh();
    const wardrobe = usePlayerStore.getState().me?.wardrobe;
    if (!wardrobe?.autoSwap || wardrobe.activeSlot === null || wardrobe.activeSlot === before) return;
    const name = wardrobe.loadouts.find((loadout) => loadout.slot === wardrobe.activeSlot)?.name;
    if (name) showToast(`Auto-swap: wearing ${name}`, "info");
}
