import { useEffect, useRef } from "react";
import { create } from "zustand";
import { showToast } from "@/components/Toast/toastStore";
import { api, apiPath, toErrorMessage } from "@/lib/api";
import { latestOnly, usePolling } from "@/lib/usePolling";
import {
    GEO_API_PATHS,
    type GeoCreateDungeonLobbyRequest,
    type GeoDungeonEntrance,
    type GeoDungeonRunResponse,
    type GeoDungeonsResponse,
    type GeoRunResponse,
    type GeoStartDungeonLobbyResponse,
} from "@/lib/geo/contracts";

/** Where a started lobby takes the player: their dungeon map, or a lone boss fight. */
export type DungeonEntry = "map" | "fight";


type DungeonState = {
    /** The server's last word on the dungeon menu. Null until first read. */
    data: GeoDungeonsResponse | null;
    error: string | null;
    /**
     * Set when the player left or started their own lobby, so its going away
     * isn't mistaken for the host starting or closing it.
     */
    leftOwnLobby: boolean;
    refresh: () => Promise<void>;
    create: (request: GeoCreateDungeonLobbyRequest) => Promise<void>;
    join: (lobbyId: string, entrance: GeoDungeonEntrance) => Promise<void>;
    leave: (lobbyId: string) => Promise<void>;
    /** Host only: takes everyone in. Open the reply's map at `/run/dungeon`, or its Run at `/run/combat`. */
    start: (lobbyId: string) => Promise<GeoStartDungeonLobbyResponse>;
};

/**
 * The dungeon menu: dungeons, open lobbies, and the player's own lobby. Every
 * action replies with the whole menu, so it shows at once. Actions throw
 * ApiError with the server's reason.
 */
export const useDungeonStore = create<DungeonState>()((set, get) => {
    // A poll sent before a join or leave can land after its answer; it's dropped.
    const reads = latestOnly();
    const adopt = (data: GeoDungeonsResponse) => {
        reads.start();
        set({ data, error: null });
    };

    return {
        data: null,
        error: null,
        leftOwnLobby: false,
        refresh: async () => {
            const ticket = reads.start();
            try {
                const data = await api.get<GeoDungeonsResponse>(GEO_API_PATHS.dungeons.root);
                if (reads.isCurrent(ticket)) set({ data, error: null });
            } catch (error) {
                if (reads.isCurrent(ticket)) set({ error: toErrorMessage(error) });
            }
        },
        create: async (request) => adopt(await api.post<GeoDungeonsResponse>(GEO_API_PATHS.dungeons.lobbies, request)),
        join: async (lobbyId, entrance) =>
            adopt(await api.post<GeoDungeonsResponse>(apiPath(GEO_API_PATHS.dungeons.join, { lobbyId }), entrance)),
        leave: async (lobbyId) => {
            const data = await api.post<GeoDungeonsResponse>(apiPath(GEO_API_PATHS.dungeons.leave, { lobbyId }));
            set({ leftOwnLobby: true });
            adopt(data);
        },
        start: async (lobbyId) => {
            const started = await api.post<GeoStartDungeonLobbyResponse>(apiPath(GEO_API_PATHS.dungeons.start, { lobbyId }));
            set({ leftOwnLobby: true });
            void get().refresh();
            return started;
        },
    };
});

/** While the menu is open: often enough to see players join. */
const OPEN_POLL_MS = 3_000;
/** While waiting in a lobby with the menu shut: soon enough to be taken in when it starts. */
const LOBBY_POLL_MS = 5_000;

/**
 * Keeps the dungeon menu fresh: read once on mount, then polled quickly while
 * the menu is open, a little slower while the player waits in a lobby, and
 * not at all otherwise.
 */
export function useDungeonPolling(isMenuOpen: boolean, isEnabled = true) {
    const refresh = useDungeonStore((state) => state.refresh);
    const isInLobby = useDungeonStore((state) => state.data?.myLobby != null);

    useEffect(() => {
        if (isEnabled) void refresh();
    }, [isEnabled, refresh]);

    usePolling(refresh, isMenuOpen ? OPEN_POLL_MS : LOBBY_POLL_MS, isEnabled && (isMenuOpen || isInLobby));
}

/**
 * Notices the player's lobby going away without them leaving it: either the
 * host started it, which put them straight into the dungeon (`onTakenIn`,
 * with its map or boss fight), or the host closed it. Tells them apart by
 * whether a dungeon map or a Run is now open.
 */
export function useLobbyExitWatcher(onTakenIn: (where: DungeonEntry) => void) {
    const lobbyId = useDungeonStore((state) => state.data?.myLobby?.id ?? null);
    const previous = useRef(lobbyId);
    const onTakenInRef = useRef(onTakenIn);
    useEffect(() => {
        onTakenInRef.current = onTakenIn;
    }, [onTakenIn]);

    useEffect(() => {
        const was = previous.current;
        previous.current = lobbyId;
        if (!was || lobbyId === was) return;
        if (useDungeonStore.getState().leftOwnLobby) {
            useDungeonStore.setState({ leftOwnLobby: false });
            return;
        }
        void (async () => {
            if (await api.get<GeoDungeonRunResponse | null>(GEO_API_PATHS.dungeonRuns.active)) onTakenInRef.current("map");
            else if (await api.get<GeoRunResponse | null>(GEO_API_PATHS.runs.active)) onTakenInRef.current("fight");
            else showToast("Your lobby closed, or started without you");
        })().catch(() => {});
    }, [lobbyId]);
}
