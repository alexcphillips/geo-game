import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { PlayerPosition } from "@/features/location/hooks/usePlayerLocation";
import { handMadeMapPlace, kindToSkill, type MapPlace } from "@/features/places/places";
import { SPRITES } from "@/features/spawns/sprites";
import type { GeoPlace, GeoSpawn } from "@/lib/geo/contracts";
import { buildMapHtml, type MapMessage, type MapNearPlaces, type MapNearWater } from "../mapHtml";
import { MAP_COLORS, TILE_ORIGIN } from "@/theme/mapStyle";
import { useMood } from "@/theme/theme";

type GameMapProps = {
    position: PlayerPosition;
    /** Enemies to draw. Each change replaces the set on the map. */
    spawns?: GeoSpawn[];
    onSpawnPress?: (spawn: GeoSpawn) => void;
    /** Draws a ring this many metres around the player; null for none. */
    spawnRadiusMetres?: number | null;
    /** Hand-made places, drawn like the tile ones. Each change replaces the set. */
    places?: GeoPlace[];
    /** A landmark or skill hub marker was tapped. Reach is the caller's call. */
    onPlacePress?: (place: MapPlace) => void;
    /** The player's camp, with a ring this far out; null for none. */
    camp?: { latitude: number; longitude: number; radiusMetres: number } | null;
    /** The camp marker was tapped. */
    onCampPress?: () => void;
    /** The nearest water edge in view changed; null when there's none near. */
    onNearWater?: (water: MapNearWater | null) => void;
    /** The nearest mine, woods, farmland or POI in view changed; a habitat left out has none near. */
    onNearPlaces?: (places: MapNearPlaces) => void;
    /** Free camera: pan, unrestricted zoom, no lock to the player. */
    isAdminMode?: boolean;
    /** Pixels at the bottom covered by the HUD; the player is centred above them. */
    bottomPadding?: number;
    /**
     * Pin-drop mode: when set, taps place a pin, starting at `initial`.
     * Each placement is reported through `onPinPlaced`.
     */
    pinDrop?: {
        initial: { latitude: number; longitude: number };
        color: string;
        onPinPlaced: (pin: { latitude: number; longitude: number }) => void;
    } | null;
    /**
     * A point to fly to and mark. Only sticks with the free camera on; the
     * player lock pulls the camera back otherwise.
     */
    focus?: { latitude: number; longitude: number; color: string } | null;
    /** Surfaced so the screen can show map failures instead of a black void. */
    onError?: (message: string) => void;
};

/**
 * The world map: MapLibre GL JS hosted in a WebView.
 *
 * Why a WebView rather than MapLibre's native module — Expo Go compatibility —
 * is documented in `mapHtml.ts` and ARCHITECTURE.md → decision 3c.
 *
 * This component owns only the bridge. Everything about how the map *looks*
 * lives in `theme/mapStyle.ts` and `mapHtml.ts`, so there is one place to go for
 * appearance and one for plumbing.
 */
/** Stable default, so an absent prop doesn't re-send an empty list every render. */
const NO_SPAWNS: GeoSpawn[] = [];
const NO_PLACES: GeoPlace[] = [];

export default function GameMap({
    position,
    spawns = NO_SPAWNS,
    places = NO_PLACES,
    onSpawnPress,
    spawnRadiusMetres = null,
    onPlacePress,
    camp = null,
    onCampPress,
    onNearWater,
    onNearPlaces,
    isAdminMode = false,
    bottomPadding = 0,
    pinDrop = null,
    focus = null,
    onError,
}: GameMapProps) {
    const webViewRef = useRef<WebView | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Built once: re-rendering the HTML would reload the whole map and lose the
    // camera. Position updates go over the bridge instead.
    // The map follows the mood it's drawn in: built in the first one, then
    // repainted in place, since rebuilding the page would reload every tile.
    const mood = useMood();
    const [initialMood] = useState(mood);
    const html = useMemo(() => buildMapHtml(initialMood), [initialMood]);

    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(`window.gameMap.setMood(${JSON.stringify(mood)}); true;`);
    }, [isMapReady, mood]);

    useEffect(() => {
        if (!isMapReady) return;

        // The trailing `true;` keeps the WebView from warning about a
        // non-primitive evaluation result.
        webViewRef.current?.injectJavaScript(
            `window.gameMap.setPlayer(${position.longitude}, ${position.latitude}); true;`,
        );
    }, [isMapReady, position.latitude, position.longitude]);

    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(
            `window.gameMap.setAdminMode(${isAdminMode}); true;`,
        );
    }, [isMapReady, isAdminMode]);

    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(
            `window.gameMap.setBottomPadding(${bottomPadding}); true;`,
        );
    }, [isMapReady, bottomPadding]);

    // After the admin-mode effect, so the camera is already free when it flies.
    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(
            focus
                ? `window.gameMap.focusOn(${focus.longitude}, ${focus.latitude}, ${JSON.stringify(focus.color)}); true;`
                : "window.gameMap.clearFocus(); true;",
        );
    }, [isMapReady, focus]);

    useEffect(() => {
        if (!isMapReady) return;

        // The page only needs where and what to draw. A sprite this build
        // doesn't have (newer server content) is left off the map rather
        // than drawn as nothing.
        const drawable = spawns
            .filter((spawn) => spawn.sprite in SPRITES)
            .map((spawn) => ({
                id: spawn.id,
                sprite: spawn.sprite,
                latitude: spawn.latitude,
                longitude: spawn.longitude,
            }));
        webViewRef.current?.injectJavaScript(
            `window.gameMap.setSpawns(${JSON.stringify(drawable)}); true;`,
        );
    }, [isMapReady, spawns]);

    useEffect(() => {
        if (!isMapReady) return;

        const drawable = places.map((place) => ({
            id: place.id,
            name: place.name,
            skill: kindToSkill(place.kind),
            latitude: place.latitude,
            longitude: place.longitude,
        }));
        webViewRef.current?.injectJavaScript(
            `window.gameMap.setPlaces(${JSON.stringify(drawable)}); true;`,
        );
    }, [isMapReady, places]);

    const campLatitude = camp?.latitude ?? null;
    const campLongitude = camp?.longitude ?? null;
    const campRadius = camp?.radiusMetres ?? 0;
    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(
            campLatitude === null
                ? "window.gameMap.setCamp(null); true;"
                : `window.gameMap.setCamp(${campLongitude}, ${campLatitude}, ${campRadius}); true;`,
        );
    }, [isMapReady, campLatitude, campLongitude, campRadius]);

    useEffect(() => {
        if (!isMapReady) return;

        webViewRef.current?.injectJavaScript(
            `window.gameMap.setSpawnRadius(${JSON.stringify(spawnRadiusMetres)}); true;`,
        );
    }, [isMapReady, spawnRadiusMetres]);

    // Only entering and leaving the mode touches the map; where the pin starts
    // and its colour are read at that moment. Later pin moves come *from* the
    // map, so re-sending them here would fight the player's taps.
    const pinDropRef = useRef(pinDrop);
    // Read from the message handler, which is created once, so it always sees
    // the latest values.
    const spawnsRef = useRef(spawns);
    const placesRef = useRef(places);
    const onSpawnPressRef = useRef(onSpawnPress);
    const onPlacePressRef = useRef(onPlacePress);
    const onCampPressRef = useRef(onCampPress);
    const onNearWaterRef = useRef(onNearWater);
    const onNearPlacesRef = useRef(onNearPlaces);
    useEffect(() => {
        pinDropRef.current = pinDrop;
        spawnsRef.current = spawns;
        placesRef.current = places;
        onSpawnPressRef.current = onSpawnPress;
        onPlacePressRef.current = onPlacePress;
        onCampPressRef.current = onCampPress;
        onNearWaterRef.current = onNearWater;
        onNearPlacesRef.current = onNearPlaces;
    });
    const isPinDropping = pinDrop !== null;

    useEffect(() => {
        if (!isMapReady || !isPinDropping) return;

        const current = pinDropRef.current;
        if (!current) return;

        const webView = webViewRef.current;
        webView?.injectJavaScript(
            `window.gameMap.startPinDrop(${current.initial.longitude}, ${current.initial.latitude}, ${JSON.stringify(current.color)}); true;`,
        );

        return () => {
            webView?.injectJavaScript("window.gameMap.stopPinDrop(); true;");
        };
    }, [isMapReady, isPinDropping]);

    const handleMessage = useCallback(
        (event: WebViewMessageEvent) => {
            let message: MapMessage;

            try {
                message = JSON.parse(event.nativeEvent.data) as MapMessage;
            } catch {
                return;
            }

            if (message.type === "ready") setIsMapReady(true);
            if (message.type === "error") onError?.(message.message);
            if (message.type === "spawn") {
                const spawn = spawnsRef.current.find((candidate) => candidate.id === message.id);
                if (spawn) onSpawnPressRef.current?.(spawn);
            }
            if (message.type === "camp") onCampPressRef.current?.();
            if (message.type === "place") {
                // A hand-made place opens from the server's copy, which has
                // its description; the page adds any water it sits on.
                const handMade = placesRef.current.find((place) => place.id === message.id);
                if (handMade) {
                    onPlacePressRef.current?.(handMadeMapPlace(handMade, message.water));
                    return;
                }
                onPlacePressRef.current?.({
                    id: message.id,
                    name: message.name,
                    skill: message.skill,
                    latitude: message.latitude,
                    longitude: message.longitude,
                    water: message.water,
                });
            }
            if (message.type === "water") onNearWaterRef.current?.(message.water);
            if (message.type === "habitats") onNearPlacesRef.current?.(message.places);
            if (message.type === "pin") {
                pinDropRef.current?.onPinPlaced({
                    latitude: message.latitude,
                    longitude: message.longitude,
                });
            }
        },
        [onError],
    );

    return (
        <View style={[styles.container, { backgroundColor: MAP_COLORS[mood].land }]}>
            <WebView
                ref={webViewRef}
                // `baseUrl` gives the page a real secure origin rather than
                // about:blank. Without it, MapLibre's Cache Storage tile cache
                // is unavailable and silently falls back to HTTP caching only.
                // Pointed at the tile host so tile requests are same-origin too.
                source={{ html, baseUrl: TILE_ORIGIN }}
                originWhitelist={["*"]}
                onMessage={handleMessage}
                style={[styles.webView, { backgroundColor: MAP_COLORS[mood].land }]}
                // Default is already true; explicit because tile and library
                // caching is the only thing keeping this app's data use sane.
                cacheEnabled
                // Android: prefer the cache even when an entry is stale.
                // Streets don't move, so a day-old tile is no worse than a
                // fresh one, and it keeps the map working on a flaky signal.
                cacheMode="LOAD_CACHE_ELSE_NETWORK"
                // The map canvas fills the view and MapLibre handles its own
                // gestures; native scrolling would fight panning.
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                javaScriptEnabled
                domStorageEnabled
                onError={(event) =>
                    onError?.(
                        event.nativeEvent.description || "WebView failed to load",
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // The land colour is set inline, per mood: the page body paints it
        // too, and setting it here means no white flash before the first frame.
    },
    webView: {
        flex: 1,
    },
});
