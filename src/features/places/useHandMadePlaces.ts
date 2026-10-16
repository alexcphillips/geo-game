import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { distanceMetres, type Coordinates } from "@/features/location/distance";
import { api } from "@/lib/api";
import { GEO_API_PATHS, type GeoPlace, type GeoPlacesResponse } from "@/lib/geo/contracts";
import { usePlacesStore } from "./placesStore";

/**
 * Walk this far from the last fetch and places are fetched again. The server
 * sends 2 km around you, so the map never runs out of them in between.
 */
const REFETCH_AFTER_METRES = 500;

/**
 * Hand-made places around the player, from the server. They hardly ever
 * change, so unlike spawns there's no timer: a fetch when the player has
 * walked far enough, on coming back to the screen, and straight after an
 * admin changes one.
 *
 * `enabled` waits for a signed-in player; until then there are none.
 */
export function useHandMadePlaces(position: Coordinates | null, enabled: boolean) {
    const [places, setPlaces] = useState<GeoPlace[]>([]);
    const lastFetchedAt = useRef<Coordinates | null>(null);
    const positionRef = useRef(position);
    // Only the newest request's answer is kept, whatever order they return in.
    const latestRequest = useRef(0);
    const version = usePlacesStore((state) => state.version);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const fetchPlaces = useCallback(async () => {
        const at = positionRef.current;
        if (!at || !enabled) return;
        const request = ++latestRequest.current;
        lastFetchedAt.current = { latitude: at.latitude, longitude: at.longitude };
        try {
            const response = await api.get<GeoPlacesResponse>(GEO_API_PATHS.places, {
                latitude: at.latitude,
                longitude: at.longitude,
            });
            if (request === latestRequest.current) setPlaces(response.places);
        } catch {
            // Keep what's on the map; the next move or visit tries again.
        }
    }, [enabled]);

    useEffect(() => {
        void fetchPlaces();
    }, [fetchPlaces, version]);

    useEffect(() => {
        if (!position || !enabled) return;
        const last = lastFetchedAt.current;
        if (last && distanceMetres(last, position) < REFETCH_AFTER_METRES) return;
        void fetchPlaces();
    }, [position, enabled, fetchPlaces]);

    useFocusEffect(
        useCallback(() => {
            void fetchPlaces();
        }, [fetchPlaces]),
    );

    return places;
}
