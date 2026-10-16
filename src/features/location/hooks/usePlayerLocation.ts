import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

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
 * `BestForNavigation` accuracy would drain the battery for no benefit — spawn
 * proximity is judged in tens of metres, not centimetres — so this uses
 * `High` with a distance threshold instead of a tight time interval, which lets
 * the OS stay quiet while the player is standing still.
 */
export function usePlayerLocation() {
    const [position, setPosition] = useState<PlayerPosition | null>(null);
    const [permission, setPermission] =
        useState<LocationPermissionState>("pending");
    const [error, setError] = useState<string | null>(null);

    // Held in a ref so the cleanup below can always reach the live
    // subscription, even though it's created asynchronously.
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
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

            try {
                subscriptionRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        // Only wake us when the player has actually moved far
                        // enough to matter for proximity checks.
                        distanceInterval: 5,
                        timeInterval: 2000,
                    },
                    (update) => {
                        setPosition({
                            latitude: update.coords.latitude,
                            longitude: update.coords.longitude,
                            accuracy: update.coords.accuracy ?? null,
                        });
                        setError(null);
                    },
                );
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
    }, []);

    return { position, permission, error };
}
