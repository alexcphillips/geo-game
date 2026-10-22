import { useCallback, useEffect, useRef } from "react";
import type { GeoSocketTopic } from "@/lib/geo/contracts";
import { usePolling } from "@/lib/usePolling";
import { useGeoSocketListener, useGeoSocketStore } from "./geoSocket";

/**
 * Keeps a screen of shared server state fresh (the Market, the election):
 * reads on open, again on each `changed` hint for `topic`, and once each
 * time the socket comes up (hints sent while it was down are gone). Only
 * while the socket is down does it fall back to polling every `fallbackMs`.
 *
 * `read` may change every render; the newest one is called.
 */
export function useLiveRead(read: () => Promise<unknown> | void, topic: GeoSocketTopic, fallbackMs: number) {
    const isConnected = useGeoSocketStore((state) => state.isConnected);
    const readRef = useRef(read);
    useEffect(() => {
        readRef.current = read;
    }, [read]);

    // Down (or not up yet): poll, which also makes the first read.
    usePolling(read, fallbackMs, !isConnected);

    useEffect(() => {
        if (isConnected) void readRef.current();
    }, [isConnected]);

    useGeoSocketListener(
        useCallback(
            (message) => {
                if (message.type === "changed" && message.topic === topic) void readRef.current();
            },
            [topic],
        ),
    );
}
