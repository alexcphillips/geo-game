import { api, apiPath } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoChestsResponse,
    type GeoOpenChestRequest,
    type GeoOpenChestResponse,
} from "@/lib/geo/contracts";

/** Every call chests make. All throw ApiError with the server's reason. */
export const chestsApi = {
    /** Pending selections, oldest first, then the history, newest first. */
    list: () => api.get<GeoChestsResponse>(GEO_API_PATHS.chests.root),

    /** Opens one chest of a pending selection, paying its cost. The rest are gone. */
    open: (selectionId: string, index: number) => {
        const request: GeoOpenChestRequest = { index };
        return api.post<GeoOpenChestResponse>(
            apiPath(GEO_API_PATHS.chests.open, { selectionId }),
            request,
        );
    },
};
