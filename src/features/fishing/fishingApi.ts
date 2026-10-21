import { api, apiPath } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoFishingAction,
    type GeoFishingRunView,
    type GeoFishingTier,
} from "@/lib/geo/contracts";


/** Every call a fishing Run makes. All throw ApiError with the server's reason. */
export const fishingApi = {
    /** Opens a fishing Run at water of this tier, or resumes the open one. */
    start: (tier: GeoFishingTier) => api.post<GeoFishingRunView>(GEO_API_PATHS.fishing.start, { tier }),

    /** One step: cast, wait, strike, play a card… */
    act: (runId: string, action: GeoFishingAction) =>
        api.post<GeoFishingRunView>(apiPath(GEO_API_PATHS.fishing.actions, { runId }), action),

    leave: (runId: string) => api.post<void>(apiPath(GEO_API_PATHS.fishing.leave, { runId })),
};
