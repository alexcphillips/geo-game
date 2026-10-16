import { api } from "@/lib/api";
import { GEO_API_PATHS, type GeoFarmAction, type GeoFarmView, type GeoResearchRequest } from "@/lib/geo/contracts";

/** Every call the farm makes. All throw ApiError with the server's reason. */
export const farmingApi = {
    /** The farm as it stands, from anywhere. Banks the turns that came in. */
    get: () => api.get<GeoFarmView>(GEO_API_PATHS.farm.root),

    /** One action: plant, water, a card, a harvest… */
    act: (action: GeoFarmAction) => api.post<GeoFarmView>(GEO_API_PATHS.farm.actions, action),

    /** Turn the first of a mutation in at the Research Lab, from anywhere. */
    research: (request: GeoResearchRequest) => api.post<GeoFarmView>(GEO_API_PATHS.farm.lab, request),
};
