import { useEffect } from "react";
import { AppState } from "react-native";
import { create } from "zustand";
import { getAuthToken, refreshAuthToken } from "@/lib/api/client";
import { CONFIG } from "@/lib/config";
import {
    GEO_SOCKET_CLOSE,
    GEO_SOCKET_PATH,
    GEO_SOCKET_PING,
    GEO_SOCKET_PING_SECONDS,
    GEO_SOCKET_PONG,
    GEO_SOCKET_PONG_TIMEOUT_SECONDS,
    type GeoSocketAuthMessage,
    type GeoSocketServerMessage,
} from "@/lib/geo/contracts";

/**
 * The geo socket: what other players change, pushed as it happens (a
 * party's map, the lobby you wait in). One connection for the whole app,
 * open while signed in and in the foreground; the protocol is in
 * `realtime.contract.ts`.
 *
 * It only listens. Everything the player does still goes through `api`, and
 * every screen still reads over HTTP when it opens, so a dropped socket
 * costs freshness, never correctness: it reconnects on its own, and the
 * server sends fresh snapshots each time.
 */

type Listener = (message: GeoSocketServerMessage) => void;

const listeners = new Set<Listener>();

/** Calls `listener` with every message; returns the unsubscribe. */
export function onGeoSocket(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Like `onGeoSocket`, for a component's lifetime. Keep `listener` stable (useCallback). */
export function useGeoSocketListener(listener: Listener) {
    useEffect(() => onGeoSocket(listener), [listener]);
}

/** Connected and signed in: pushes are arriving, so polling can ease off. */
export const useGeoSocketStore = create<{ isConnected: boolean }>()(() => ({ isConnected: false }));

/** Waits before each reconnect, by attempt; the last repeats. */
const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

const socketUrl = () => CONFIG.apiBaseUrl.replace(/^http/, "ws") + GEO_SOCKET_PATH;

/**
 * Keeps one connection up until the returned stop is called: connects,
 * signs in, pings, and reconnects with backoff. A refused token gets a
 * refresh first; a ban, or a session that can't be refreshed, stops it.
 */
function keepConnected(): () => void {
    let ws: WebSocket | null = null;
    let stopped = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let pongTimer: ReturnType<typeof setTimeout> | undefined;

    const setConnected = (isConnected: boolean) => useGeoSocketStore.setState({ isConnected });

    function connect() {
        const token = getAuthToken();
        if (stopped || !token) return;
        const socket = new WebSocket(socketUrl());
        ws = socket;

        socket.onopen = () => {
            const auth: GeoSocketAuthMessage = { type: "auth", token };
            socket.send(JSON.stringify(auth));
            pingTimer = setInterval(() => {
                socket.send(GEO_SOCKET_PING);
                clearTimeout(pongTimer);
                // No answer: the connection died without saying so.
                pongTimer = setTimeout(() => socket.close(), GEO_SOCKET_PONG_TIMEOUT_SECONDS * 1000);
            }, GEO_SOCKET_PING_SECONDS * 1000);
        };

        socket.onmessage = (event: WebSocketMessageEvent) => {
            const text = String(event.data);
            clearTimeout(pongTimer);
            if (text === GEO_SOCKET_PONG) return;
            let message: GeoSocketServerMessage;
            try {
                message = JSON.parse(text) as GeoSocketServerMessage;
            } catch {
                return;
            }
            if (message.type === "ready") {
                attempt = 0;
                setConnected(true);
            }
            if (message.type === "reauth") {
                // The token runs out soon: a fresh one on this socket keeps it open.
                void refreshAuthToken().then((ok) => {
                    const fresh = getAuthToken();
                    if (!ok || !fresh || socket.readyState !== WebSocket.OPEN) return;
                    const auth: GeoSocketAuthMessage = { type: "auth", token: fresh };
                    socket.send(JSON.stringify(auth));
                });
                return;
            }
            for (const listener of listeners) listener(message);
        };

        socket.onclose = (event: WebSocketCloseEvent) => {
            clearInterval(pingTimer);
            clearTimeout(pongTimer);
            if (ws === socket) ws = null;
            setConnected(false);
            if (stopped) return;
            if (event.code === GEO_SOCKET_CLOSE.banned) return;
            if (event.code === GEO_SOCKET_CLOSE.unauthorized) {
                // A fresh token, then straight back; no session left, no socket.
                void refreshAuthToken().then((ok) => {
                    if (ok) connect();
                });
                return;
            }
            const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
            attempt += 1;
            retryTimer = setTimeout(connect, delay);
        };
    }

    connect();
    return () => {
        stopped = true;
        clearTimeout(retryTimer);
        ws?.close(1000, "Bye");
        ws = null;
        setConnected(false);
    };
}

/**
 * Holds the geo socket open while `isEnabled` (signed in, player loaded) and
 * the app is in the foreground; closed in the background, back on return.
 * Mount once, at the root.
 */
export function useGeoSocket(isEnabled: boolean) {
    useEffect(() => {
        if (!isEnabled) return;
        let stop: (() => void) | null = AppState.currentState === "background" ? null : keepConnected();
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "background") {
                stop?.();
                stop = null;
            } else if (!stop) {
                stop = keepConnected();
            }
        });
        return () => {
            subscription.remove();
            stop?.();
        };
    }, [isEnabled]);
}
