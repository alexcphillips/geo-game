import { api } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoPlayTurnRequest,
    type GeoRunResponse,
    type GeoStartRunRequest,
} from "@/lib/geo/contracts";

const withRunId = (path: string, runId: string) => path.replace(":runId", encodeURIComponent(runId));

/** Every call a combat Run makes. All throw ApiError with the server's reason. */
export const runsApi = {
    /** The Run in progress, if any: one at a time, so this comes first. */
    active: () => api.get<GeoRunResponse | null>(GEO_API_PATHS.runs.active),

    start: (request: GeoStartRunRequest) => api.post<GeoRunResponse>(GEO_API_PATHS.runs.start, request),

    /**
     * Takes the player's turn: a card, or `{ lunchboxSlot }` to eat. The reply
     * holds every turn up to the player's next decision.
     */
    playCard: (runId: string, request: GeoPlayTurnRequest) =>
        api.post<GeoRunResponse>(withRunId(GEO_API_PATHS.runs.turns, runId), request),

    flee: (runId: string) => api.post<GeoRunResponse>(withRunId(GEO_API_PATHS.runs.flee, runId)),
};
