import { api } from "@/lib/api";
import { GEO_API_PATHS, type GeoInboxReadRequest, type GeoInboxResponse } from "@/lib/geo/contracts";

export const inboxApi = {
    get: () => api.get<GeoInboxResponse>(GEO_API_PATHS.inbox.root),
    /** Everything up to the inbox's `asOf` is read; what came after stays unread. */
    markRead: (asOf: string) => {
        const request: GeoInboxReadRequest = { asOf };
        return api.post<void>(GEO_API_PATHS.inbox.read, request);
    },
};
