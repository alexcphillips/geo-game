import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type InboxState = {
    /** Unread mail, from the last badge push or inbox fetch. */
    unread: number;
    /** Chests won and not opened yet: the Chests tab's badge. */
    pendingChests: number;
    setUnread: (count: number) => void;
    setPendingChests: (count: number) => void;
};

/**
 * The inbox button's badge adds both up; each tab badges its own. The
 * server pushes both counts over the geo socket whenever they change.
 */
export const useInboxStore = create<InboxState>()((set) => ({
    unread: 0,
    pendingChests: 0,
    setUnread: (unread) => set({ unread }),
    setPendingChests: (pendingChests) => set({ pendingChests }),
}));

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
