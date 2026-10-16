import { useActivityWatchStore } from "./activityWatchStore";
import type { NotificationCategoryId } from "./notificationCategories";
import { useNotificationSettingsStore } from "./notificationSettingsStore";
import { cancelCategory } from "./notifications";

/**
 * What else to reset when a kind of notification is switched off, beyond
 * cancelling its pending alerts — anything that remembers them, like the lit
 * bell on a fishing spot. A `Record` so a new category can't be added without
 * deciding what its cleanup is.
 */
const ON_DISABLE: Record<NotificationCategoryId, () => void> = {
    fishingActivity: () => useActivityWatchStore.getState().clearAll(),
};

/** The Settings switch: save the choice, and on "off" cancel what's pending. */
export async function setCategoryEnabled(
    category: NotificationCategoryId,
    enabled: boolean,
): Promise<void> {
    useNotificationSettingsStore.getState().setEnabled(category, enabled);
    if (enabled) return;
    await cancelCategory(category);
    ON_DISABLE[category]();
}
