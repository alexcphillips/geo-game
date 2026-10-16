import { useState } from "react";
import { fishingActivity, msUntilActivityChange } from "@/features/places/fishingActivity";
import { useActivityWatchStore } from "./activityWatchStore";
import { isCategoryEnabled, useNotificationSettingsStore } from "./notificationSettingsStore";
import { cancelAlert, ensureNotificationPermission, scheduleAlert } from "./notifications";

/**
 * The bell on a fishing spot: whether an alert is pending for its next
 * activity change, and a toggle. `placeName` is what the alert calls it.
 * Goes through the "fishingActivity" category, so Settings can switch it off.
 *
 * Turning it on schedules one local alert at the next change, saying what the
 * activity becomes — knowable ahead of time only because the placeholder
 * activity is a pure function of place and hour.
 */
export function useActivityAlert(placeId: string, placeName: string, now: number) {
    const watch = useActivityWatchStore((state) => state.watches[placeId]);
    const setWatch = useActivityWatchStore((state) => state.setWatch);
    const clearWatch = useActivityWatchStore((state) => state.clearWatch);
    const [isBusy, setIsBusy] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const isCategoryOn = useNotificationSettingsStore((state) =>
        isCategoryEnabled(state.overrides, "fishingActivity"),
    );

    // A watch whose alert has already fired is over.
    const isOn = watch !== undefined && new Date(watch.firesAt).getTime() > now;

    const toggle = async () => {
        if (isBusy || !isCategoryOn) return;
        setIsBusy(true);
        try {
            if (isOn) {
                await cancelAlert(watch.notificationId);
                clearWatch(placeId);
                return;
            }

            if (!(await ensureNotificationPermission())) {
                setIsBlocked(true);
                return;
            }
            setIsBlocked(false);

            const at = new Date(now + msUntilActivityChange(now));
            const next = fishingActivity(placeId, at.getTime());
            const current = fishingActivity(placeId, now);
            const notificationId = await scheduleAlert({
                category: "fishingActivity",
                title: "Fishing activity changed",
                body:
                    next.id === current.id
                        ? `${placeName} is still ${next.label}.`
                        : `${placeName} is now ${next.label}.`,
                at,
            });
            if (!notificationId) return;
            setWatch(placeId, { notificationId, firesAt: at.toISOString() });
        } finally {
            setIsBusy(false);
        }
    };

    return {
        isOn,
        isBusy,
        /** The phone has notifications off for the app. */
        isBlocked,
        /** The player switched these off in Settings → Notifications. */
        isCategoryOff: !isCategoryOn,
        toggle,
    };
}
