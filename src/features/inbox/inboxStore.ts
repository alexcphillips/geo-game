import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type InboxState = {
    /** Unread mail, from the last heartbeat or inbox fetch. */
    unread: number;
    /** Chests won and not opened yet: the Chests tab's badge. */
    pendingChests: number;
    setUnread: (count: number) => void;
    setPendingChests: (count: number) => void;
};

/** The inbox button's badge adds both up; each tab badges its own. */
export const useInboxStore = create<InboxState>()((set) => ({
    unread: 0,
    pendingChests: 0,
    setUnread: (unread) => set({ unread }),
    setPendingChests: (pendingChests) => set({ pendingChests }),
}));

/** Selections already counted by `chestsWon`, so showing a win twice counts it once. */
const countedSelections = new Set<string>();

/**
 * Keeps the Chests badge right between heartbeats: a fight that awards
 * chests adds one, opening one takes one away. The next heartbeat has the
 * last word either way.
 */
export const pendingChestActions = {
    won(selectionId: string) {
        if (countedSelections.has(selectionId)) return;
        countedSelections.add(selectionId);
        useInboxStore.setState((state) => ({ pendingChests: state.pendingChests + 1 }));
    },
    opened() {
        useInboxStore.setState((state) => ({ pendingChests: Math.max(0, state.pendingChests - 1) }));
    },
};

type WhatsNewState = {
    /** The changelog last shown as "What's new", so each shows once per device. */
    lastShownChangelogId: string | null;
    setLastShown: (id: string) => void;
};

/** Persisted on the device: a reinstall may show the newest changelog once more. */
export const useWhatsNewStore = create<WhatsNewState>()(
    persist(
        (set) => ({
            lastShownChangelogId: null,
            setLastShown: (lastShownChangelogId) => set({ lastShownChangelogId }),
        }),
        {
            name: "geo-game.whats-new",
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
