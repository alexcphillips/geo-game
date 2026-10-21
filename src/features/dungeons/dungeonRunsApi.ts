import { api } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoDungeonMoveRequest,
    type GeoDungeonPuzzleRequest,
    type GeoDungeonRunResponse,
} from "@/lib/geo/contracts";

const paths = GEO_API_PATHS.dungeonRuns;
const withId = (path: string, dungeonRunId: string) => path.replace(":dungeonRunId", encodeURIComponent(dungeonRunId));

/**
 * Every call a dungeon map makes. The server holds the map and checks every
 * step: these only ask. All throw ApiError with the server's reason.
 */
export const dungeonRunsApi = {
    /** The dungeon in progress, if any. */
    active: () => api.get<GeoDungeonRunResponse | null>(paths.active),
    /** One dungeon run, finished or not: how it ended. */
    one: (dungeonRunId: string) => api.get<GeoDungeonRunResponse>(withId(paths.one, dungeonRunId)),
    move: (dungeonRunId: string, roomId: number) => {
        const request: GeoDungeonMoveRequest = { roomId };
        return api.post<GeoDungeonRunResponse>(withId(paths.move, dungeonRunId), request);
    },
    answer: (dungeonRunId: string, answer: number) => {
        const request: GeoDungeonPuzzleRequest = { answer };
        return api.post<GeoDungeonRunResponse>(withId(paths.puzzle, dungeonRunId), request);
    },
    /** Leaving counts as failing the dungeon. */
    leave: (dungeonRunId: string) => api.post<GeoDungeonRunResponse>(withId(paths.leave, dungeonRunId)),
};
