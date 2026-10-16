/**
 * Every kind of notification the game sends. Each one is its own switch in
 * Settings → Notifications and, on Android, its own system channel, so it can
 * be muted from the phone's settings too.
 *
 * Adding a kind of notification is one entry here; scheduling with its id
 * picks up the switch and the channel automatically.
 */
export type NotificationCategoryId = "fishingActivity";

export type NotificationCategory = {
    id: NotificationCategoryId;
    /** The switch's label, and the Android channel's name. */
    label: string;
    /** One line under the switch. */
    description: string;
    /** Whether it's on before the player has touched the switch. */
    defaultEnabled: boolean;
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
    {
        id: "fishingActivity",
        label: "Fishing activity",
        description: "When a fishing spot you asked about changes activity.",
        defaultEnabled: true,
    },
];
