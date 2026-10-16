import { useEffect } from "react";
import { AppState } from "react-native";
import { GEO_PRESENCE_INTERVAL_SECONDS } from "@/lib/geo/contracts";
import { useInboxStore } from "@/features/inbox/inboxStore";
import { usePlayerStore } from "@/features/player/playerStore";
import { friendsApi } from "./friendsApi";
import { currentActivity, usePresenceStore } from "./presenceStore";

/**
 * Tells the server the player is here, and doing what, so friends see them
 * online. Beats every GEO_PRESENCE_INTERVAL_SECONDS, at once when the
 * activity changes or the app comes back, and says it's leaving when the app
 * goes to the background. The answer carries the friends and inbox badge counts.
 *
 * A stand-in for websockets: the server only knows about the app's last beat.
 * Failures are silent; the next beat tries again.
 */
export function usePresenceHeartbeat() {
    const isReady = usePlayerStore((state) => state.status === "ready");
    // Two selectors: one returning an object would be new on every call.
    const activity = usePresenceStore((state) => currentActivity(state.reports).activity);
    const skill = usePresenceStore((state) => currentActivity(state.reports).skill);

    useEffect(() => {
        if (!isReady) return;
        // "inactive" (iOS: Control Center, a call coming in) is still here.
        let isActive = AppState.currentState !== "background";

        const beat = () => {
            if (!isActive) return;
            friendsApi
                .beat({ activity, skill })
                .then(({ incomingRequests, unreadInbox }) => {
                    usePresenceStore.getState().setIncomingRequests(incomingRequests);
                    useInboxStore.getState().setUnread(unreadInbox);
                })
                .catch(() => {});
        };

        beat();
        const interval = setInterval(beat, GEO_PRESENCE_INTERVAL_SECONDS * 1000);
        const subscription = AppState.addEventListener("change", (state) => {
            const wasActive = isActive;
            isActive = state !== "background";
            if (isActive && !wasActive) beat();
            else if (!isActive && wasActive) friendsApi.leave().catch(() => {});
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [isReady, activity, skill]);
}
