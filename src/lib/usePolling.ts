import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Calls `read` now and every `everyMs` while `enabled`, for a screen that
 * shows live server state (the Market, the mayor's votes, a lobby).
 *
 * - One read at a time: a tick while the last read is still out is skipped,
 *   so a slow server doesn't pile up requests.
 * - Nothing while the app is in the background, and a read straight away
 *   when it comes back, so what's shown is never a stale screen's worth old.
 *
 * `read` may change every render; the newest one is called.
 */
export function usePolling(read: () => Promise<unknown> | void, everyMs: number, enabled = true) {
    const readRef = useRef(read);
    useEffect(() => {
        readRef.current = read;
    }, [read]);

    useEffect(() => {
        if (!enabled) return;
        let isBusy = false;
        const tick = () => {
            if (isBusy || AppState.currentState === "background") return;
            isBusy = true;
            Promise.resolve()
                .then(() => readRef.current())
                .catch(() => {
                    // Each read shows its own failure; polling just carries on.
                })
                .finally(() => {
                    isBusy = false;
                });
        };
        tick();
        const timer = setInterval(tick, everyMs);
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") tick();
        });
        return () => {
            clearInterval(timer);
            subscription.remove();
        };
    }, [everyMs, enabled]);
}

/**
 * Keeps an older read from overwriting newer data. Take a ticket with
 * `start()` before a read and keep its answer only if `isCurrent(ticket)`
 * still holds; an action that answers with fresh data calls `start()` as it
 * lands, so reads already out (from before the change) are dropped.
 */
export function latestOnly() {
    let current = 0;
    return {
        start: () => ++current,
        isCurrent: (ticket: number) => ticket === current,
    };
}
