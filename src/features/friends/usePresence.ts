import { useCallback, useEffect } from "react";
import { useInboxStore } from "@/features/inbox/inboxStore";
import { useGeoSocketListener, useGeoSocketStore } from "@/lib/realtime/geoSocket";
import { friendsApi } from "./friendsApi";
import { currentActivity, usePresenceStore } from "./presenceStore";

/**
 * The player's presence and the HUD badges, over the geo socket. Online is
 * the socket itself (open while the app is in the foreground). What the
 * player is doing goes to the server when it changes and each time the
 * socket comes up; the friends, inbox and chest badge counts arrive pushed.
 * Mount once, at the root.
 */
export function usePresence() {
    const isConnected = useGeoSocketStore((state) => state.isConnected);
    // Two selectors: one returning an object would be new on every call.
    const activity = usePresenceStore((state) => currentActivity(state.reports).activity);
    const skill = usePresenceStore((state) => currentActivity(state.reports).skill);

    // Failures are silent: the next change or reconnect sends it again.
    useEffect(() => {
        if (isConnected) friendsApi.report({ activity, skill }).catch(() => {});
    }, [isConnected, activity, skill]);

    useGeoSocketListener(
        useCallback((message) => {
            if (message.type !== "badges") return;
            const { incomingRequests, unreadInbox, pendingChests } = message.badges;
            usePresenceStore.getState().setIncomingRequests(incomingRequests);
            useInboxStore.getState().setUnread(unreadInbox);
            useInboxStore.getState().setPendingChests(pendingChests);
        }, []),
    );
}
