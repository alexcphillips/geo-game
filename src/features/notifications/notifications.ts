import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
    NOTIFICATION_CATEGORIES,
    type NotificationCategoryId,
} from "./notificationCategories";
import { isCategoryEnabled, useNotificationSettingsStore } from "./notificationSettingsStore";

/**
 * Notifications — the shared plumbing every kind of notification goes
 * through. Local notifications only, which run in Expo Go.
 *
 * Kinds are declared in `notificationCategories.ts`. Scheduling always names
 * one, which is what lets Settings switch a kind off and cancel what's
 * already pending for it. When notifications start coming from a server as
 * push, permission, channels, categories and the settings switches all stay;
 * only where alerts are scheduled moves.
 *
 * Call `configureNotifications` once, at startup.
 */
export function configureNotifications(): void {
    // Show alerts even while the app is open — the player may be looking at
    // the map, not whatever the alert is about.
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === "android") {
        for (const category of NOTIFICATION_CATEGORIES) {
            void Notifications.setNotificationChannelAsync(category.id, {
                name: category.label,
                description: category.description,
                importance: Notifications.AndroidImportance.DEFAULT,
            });
        }
    }
}

/** Asks only if not yet decided. Resolves to whether alerts may be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
}

export function isNotificationCategoryEnabled(category: NotificationCategoryId): boolean {
    return isCategoryEnabled(useNotificationSettingsStore.getState().overrides, category);
}

/**
 * Schedules one alert at `at`. Resolves to its id, for cancelling — or to
 * null if the player has switched this kind of notification off.
 */
export async function scheduleAlert({
    category,
    title,
    body,
    at,
}: {
    category: NotificationCategoryId;
    title: string;
    body: string;
    at: Date;
}): Promise<string | null> {
    if (!isNotificationCategoryEnabled(category)) return null;

    return Notifications.scheduleNotificationAsync({
        content: { title, body, data: { category } },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
            channelId: category,
        },
    });
}

export function cancelAlert(id: string): Promise<void> {
    return Notifications.cancelScheduledNotificationAsync(id);
}

/** Cancels everything pending for one kind — when its switch goes off. */
export async function cancelCategory(category: NotificationCategoryId): Promise<void> {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        pending
            .filter((request) => request.content.data?.category === category)
            .map((request) => cancelAlert(request.identifier)),
    );
}
