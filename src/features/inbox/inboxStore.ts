import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type InboxState = {
    /** Unread mail, from the last heartbeat or inbox fetch: the HUD badge. */
    unread: number;
    setUnread: (count: number) => void;
};

export const useInboxStore = create<InboxState>()((set) => ({
    unread: 0,
    setUnread: (unread) => set({ unread }),
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
