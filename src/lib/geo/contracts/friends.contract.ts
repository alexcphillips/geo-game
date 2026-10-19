// Copied from cozy-app/shared/src/geo/friends.contract.ts by scripts/sync-geo-contracts.mjs — do not edit.

/**
 * Friends: mutual, by username. A request waits until the other player
 * accepts; declining, cancelling and removing all just delete the row.
 *
 * Presence is a heartbeat for now (websockets later): the app sends what the
 * player is doing every GEO_PRESENCE_INTERVAL_SECONDS while open, and a
 * friend counts as online while the last one is younger than
 * GEO_ONLINE_WINDOW_SECONDS. Activity says what, never where.
 */

/** How often the app reports presence while in the foreground. */
export const GEO_PRESENCE_INTERVAL_SECONDS = 60;
/** A heartbeat older than this means offline. Covers one missed beat. */
export const GEO_ONLINE_WINDOW_SECONDS = 150;
/** Friends plus requests either way, per player. */
export const GEO_FRIENDS_MAX = 200;

/**
 * What a player is doing. `fighting` is the server's own call (an active
 * Run), whatever the app reports.
 */
export const GEO_ACTIVITIES = ["exploring", "fighting", "skilling", "trading"] as const;
export type GeoActivity = (typeof GEO_ACTIVITIES)[number];

/** POST: still here, doing this. `skill` only with `skilling`. */
export type GeoPresenceRequest = {
    activity: GeoActivity;
    skill?: string | null;
};

/** The heartbeat's answer: what the HUD badges show. */
export type GeoPresenceResponse = {
    incomingRequests: number;
    /** Unread inbox mail (messages and announcements). */
    unreadInbox: number;
    /** Chest selections won but not opened yet: the inbox's Chests tab. */
    pendingChests: number;
};

export type GeoFriendStatus =
    | { online: true; activity: GeoActivity; skill: string | null }
    | { online: false; lastSeenAt: string | null };

export type GeoFriend = {
    playerId: string;
    name: string;
    status: GeoFriendStatus;
    /** When the request was accepted. */
    since: string;
};

export type GeoFriendRequest = {
    id: string;
    /** The other player: the sender of an incoming request, the receiver of an outgoing one. */
    playerId: string;
    name: string;
    createdAt: string;
};

export type GeoFriendsResponse = {
    /** Online first, then by name. */
    friends: GeoFriend[];
    incoming: GeoFriendRequest[];
    outgoing: GeoFriendRequest[];
};

/** POST: ask a player, by username, to be friends. */
export type GeoSendFriendRequest = {
    username: string;
};

/**
 * `accepted` when they had already asked you: asking back accepts theirs
 * rather than making a second request.
 */
export type GeoSendFriendResponse = {
    result: "sent" | "accepted";
};
