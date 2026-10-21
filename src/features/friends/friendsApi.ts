import { api, apiPath } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoFriendsResponse,
    type GeoPresenceRequest,
    type GeoPresenceResponse,
    type GeoSendFriendRequest,
    type GeoSendFriendResponse,
} from "@/lib/geo/contracts";


export const friendsApi = {
    list: () => api.get<GeoFriendsResponse>(GEO_API_PATHS.friends.root),
    send: (username: string) => {
        const request: GeoSendFriendRequest = { username };
        return api.post<GeoSendFriendResponse>(GEO_API_PATHS.friends.requests, request);
    },
    accept: (requestId: string) =>
        api.post<GeoFriendsResponse>(apiPath(GEO_API_PATHS.friends.accept, { requestId })),
    /** Declines theirs or cancels yours. */
    dismiss: (requestId: string) =>
        api.delete<GeoFriendsResponse>(apiPath(GEO_API_PATHS.friends.request, { requestId })),
    remove: (playerId: string) =>
        api.delete<GeoFriendsResponse>(apiPath(GEO_API_PATHS.friends.friend, { playerId })),
    beat: (request: GeoPresenceRequest) => api.post<GeoPresenceResponse>(GEO_API_PATHS.presence, request),
    leave: () => api.delete<void>(GEO_API_PATHS.presence),
};
