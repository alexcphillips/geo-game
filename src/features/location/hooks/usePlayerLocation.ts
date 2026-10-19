import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useLocationStore } from "../locationStore";

export type PlayerPosition = {
    latitude: number;
    longitude: number;
    /** Metres of uncertainty reported by the OS, or null if unknown. */
    accuracy: number | null;
};

export type LocationPermissionState =
    | "pending"
    | "granted"
    | "denied"
    /** Granted, but the device can't get a fix (airplane mode, indoors, etc.). */
    | "unavailable";

/**
 * The player's live position.
 *
 * Foreground only, deliberately: the game loop is "open the app, walk to a
 * thing, fight it", so there is nothing to accumulate while the phone is
 * pocketed. Background location also triggers a far more invasive permission
 * prompt and extra store review. See ARCHITECTURE.md → "Location".
 *
 * Each fix is kept in `locationStore` and read back from there, so the map
 * shows the newest fix even when it came from another screen's watch (a Run's)
 * while the map was covered.
 *
 * The watch runs only while the screen is focused, and restarts with a fresh
 * one-shot fix on coming back to it (closing a Run): a watch left running
 * under another screen can go quiet, leaving the map on a stale spot.
 *
 * `BestForNavigation` accuracy would drain the battery for no benefit — spawn
 * proximity is judged in tens of metres, not centimetres — so this uses
 * `High` with a distance threshold instead of a tight time interval, which lets
 * the OS stay quiet while the player is standing still.
 */
export function usePlayerLocation() {
    const position = useLocationStore((state) => state.position);
    const [permission, setPermission] =
        useState<LocationPermissionState>("pending");
    const [error, setError] = useState<string | null>(null);

    // Held in a ref so the cleanup below can always reach the live
    // subscription, even though it's created asynchronously.
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
    // The newest fix's time, so a slow one-shot can't overwrite a newer watch fix.
    const lastFixAt = useRef(0);

    const applyFix = useCallback((update: Location.LocationObject) => {
        if (update.timestamp < lastFixAt.current) return;
        lastFixAt.current = update.timestamp;
        useLocationStore.setState({
            position: {
                latitude: update.coords.latitude,
                longitude: update.coords.longitude,
                accuracy: update.coords.accuracy ?? null,
            },
        });
        setError(null);
    }, []);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            async function startWatching() {
                const { granted } =
                    await Location.requestForegroundPermissionsAsync();

                if (cancelled) return;

                if (!granted) {
                    setPermission("denied");
                    return;
                }

                setPermission("granted");

                // A fresh fix now, rather than waiting on the watch's first.
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
                    .then((update) => {
                        if (!cancelled) applyFix(update);
                    })
                    .catch(() => {
                        // The watch below reports errors; this is only a head start.
                    });

                try {
                    const subscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            // Only wake us when the player has actually moved far
                            // enough to matter for proximity checks.
                            distanceInterval: 5,
                            timeInterval: 2000,
                        },
                        applyFix,
                    );
                    if (cancelled) {
                        subscription.remove();
                        return;
                    }
                    subscriptionRef.current = subscription;
                } catch (err) {
                    if (cancelled) return;
                    setPermission("unavailable");
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Could not read your location.",
                    );
                }
            }

            startWatching();

            return () => {
                cancelled = true;
                subscriptionRef.current?.remove();
                subscriptionRef.current = null;
            };
        }, [applyFix]),
    );

    return { position, permission, error };
}
