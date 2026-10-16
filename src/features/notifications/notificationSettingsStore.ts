import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
    NOTIFICATION_CATEGORIES,
    type NotificationCategoryId,
} from "./notificationCategories";

type NotificationSettingsState = {
    /** Only categories the player has changed; the rest use their default. */
    overrides: Partial<Record<NotificationCategoryId, boolean>>;
    setEnabled: (category: NotificationCategoryId, enabled: boolean) => void;
};

/** Which kinds of notification the player wants, persisted on the device. */
export const useNotificationSettingsStore = create<NotificationSettingsState>()(
    persist(
        (set) => ({
            overrides: {},
            setEnabled: (category, enabled) =>
                set((state) => ({ overrides: { ...state.overrides, [category]: enabled } })),
        }),
        {
            name: "geo-game.notification-settings",
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);

export function isCategoryEnabled(
    overrides: NotificationSettingsState["overrides"],
    category: NotificationCategoryId,
): boolean {
    return (
        overrides[category] ??
        NOTIFICATION_CATEGORIES.find((info) => info.id === category)?.defaultEnabled ??
        true
    );
}
