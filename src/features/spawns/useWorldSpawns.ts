import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { distanceMetres, type Coordinates } from "@/features/location/distance";
import type { MapNearPlaces, MapNearWater } from "@/features/map/mapHtml";
import { useAdminSettingsStore } from "@/features/settings/adminSettingsStore";
import { api } from "@/lib/api";
import { GEO_API_PATHS, type GeoSpawn, type GeoWorldResponse } from "@/lib/geo/contracts";

/**
 * Walk this far from the last fetch and the spawns are fetched again. Kept
 * well inside the 50 m reach: the server drops spawns that fall out of reach,
 * so the map keeps up with it as you walk.
 */
const REFETCH_AFTER_METRES = 15;
/** Spawns reroll on the server every 15 minutes; check well inside that. */
const REFETCH_EVERY_MS = 60_000;
/** Until the server says otherwise. Matches its 50 m reach, which the ring shows. */
const DEFAULT_REACH_METRES = 50;
const DEFAULT_SPAWN_RADIUS_METRES = DEFAULT_REACH_METRES;

/**
 * Enemies in reach of the player, from the server, which decides where they
 * are so they can't be faked. Fetched when the player has moved far enough, every
 * minute, and each time the world screen comes back into view (a beaten
 * enemy is gone when you return from the fight).
 *
 * `enabled` waits for a signed-in player; until then there are no spawns.
 * `nearWater`, the nearest water edge the map sees, and `nearPlaces`, the
 * nearest mine, woods, farmland and POI, go with each fetch: the server mixes
 * in the enemies that live by them.
 */
export function useWorldSpawns(
    position: Coordinates | null,
    enabled: boolean,
    nearWater: MapNearWater | null = null,
    nearPlaces: MapNearPlaces = {},
) {
    const [spawns, setSpawns] = useState<GeoSpawn[]>([]);
    const [reachMetres, setReachMetres] = useState(DEFAULT_REACH_METRES);
    const [spawnRadiusMetres, setSpawnRadiusMetres] = useState(DEFAULT_SPAWN_RADIUS_METRES);
    const lastFetchedAt = useRef<Coordinates | null>(null);
    const positionRef = useRef(position);
    const nearWaterRef = useRef(nearWater);
    const nearPlacesRef = useRef(nearPlaces);
    // Only the newest request's answer is kept, whatever order they return in.
    const latestRequest = useRef(0);
    // Dev servers: the admin page's "Max enemies", and its "fetch now" signal.
    const fillSetting = useAdminSettingsStore((state) => state.fillSpawns);
    const fill = __DEV__ && fillSetting;
    const spawnsVersion = useAdminSettingsStore((state) => state.spawnsVersion);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    useEffect(() => {
        nearWaterRef.current = nearWater;
    }, [nearWater]);

    useEffect(() => {
        nearPlacesRef.current = nearPlaces;
    }, [nearPlaces]);

    const fetchSpawns = useCallback(async () => {
        const at = positionRef.current;
        if (!at || !enabled) return;
        const request = ++latestRequest.current;
        lastFetchedAt.current = { latitude: at.latitude, longitude: at.longitude };
        try {
            const world = await api.get<GeoWorldResponse>(GEO_API_PATHS.world, {
                latitude: at.latitude,
                longitude: at.longitude,
                waterLatitude: nearWaterRef.current?.latitude,
                waterLongitude: nearWaterRef.current?.longitude,
                waterKind: nearWaterRef.current?.kind,
                ...placeParams(nearPlacesRef.current),
                fill: fill || undefined,
            });
            if (request !== latestRequest.current) return;
            setSpawns(world.spawns);
            setReachMetres(world.reachMetres);
            setSpawnRadiusMetres(world.spawnRadiusMetres);
        } catch {
            // Keep what's on the map; the next move or tick tries again, and a
            // server that's down entirely shows its own banner.
        }
    }, [enabled, fill]);

    // Straight away when the admin page changes something.
    useEffect(() => {
        void fetchSpawns();
    }, [fetchSpawns, spawnsVersion]);

    // Moved far enough (or the first fix arrived).
    useEffect(() => {
        if (!position || !enabled) return;
        const last = lastFetchedAt.current;
        if (last && distanceMetres(last, position) < REFETCH_AFTER_METRES) return;
        void fetchSpawns();
    }, [position, enabled, fetchSpawns]);

    // On a timer, and on coming back to the screen; both stop while away.
    useFocusEffect(
        useCallback(() => {
            void fetchSpawns();
            const timer = setInterval(() => void fetchSpawns(), REFETCH_EVERY_MS);
            return () => clearInterval(timer);
        }, [fetchSpawns]),
    );

    // Fetch again as the soonest spawn leaves (one walked away from goes 45s
    // later), so it leaves the map on time rather than at the next tick.
    useEffect(() => {
        if (spawns.length === 0) return;
        const soonest = Math.min(...spawns.map((spawn) => new Date(spawn.despawnsAt).getTime()));
        const timer = setTimeout(() => void fetchSpawns(), Math.max(0, soonest - Date.now()) + 500);
        return () => clearTimeout(timer);
    }, [spawns, fetchSpawns]);

    return { spawns, reachMetres, spawnRadiusMetres };
}

/** `miningLatitude`, `miningLongitude` and so on, for each place near. */
function placeParams(places: MapNearPlaces): Record<string, number> {
    const params: Record<string, number> = {};
    for (const [habitat, place] of Object.entries(places)) {
        params[`${habitat}Latitude`] = place.latitude;
        params[`${habitat}Longitude`] = place.longitude;
    }
    return params;
}
