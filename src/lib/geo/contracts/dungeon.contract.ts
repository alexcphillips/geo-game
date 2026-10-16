// Copied from cozy-app/shared/src/geo/dungeon.contract.ts by scripts/sync-geo-contracts.mjs — do not edit.

/**
 * Dungeons: raid-style boss fights, gathered for in lobbies.
 *
 * A POI is a lobby entrance. Every POI opens the same worldwide list of open
 * lobbies, so a lobby never says where anyone is. Creating or joining one
 * needs you at a POI; once in, you can walk off and still be taken along.
 *
 * A lobby has no countdown: it waits until the host starts it, and starting
 * takes everyone in at once. A host who walks off and closes the app doesn't
 * leave it up forever: it closes once they've been gone
 * GEO_DUNGEON_HOST_AWAY_SECONDS. For now each player gets their own solo Run
 * against the boss; shared multiplayer Runs come later. A dungeon Run is
 * fought at full health and leaves the player's own health (GeoHealth) as it
 * was, win or lose; food eaten and coins lost to a defeat still count.
 */
import type { GeoPoint } from "./distance";
import type { GeoRunResponse } from "./run.contract";

/**
 * PLACEHOLDER: an unstarted lobby closes once its host hasn't been seen (the
 * app's presence heartbeat) for this long.
 */
export const GEO_DUNGEON_HOST_AWAY_SECONDS = 600;

/** A dungeon as the lobby menu shows it: one per kind of dungeon. */
export type GeoDungeon = {
    id: string;
    name: string;
    description: string;
    /** The boss's name and the app's sprite for it. */
    bossName: string;
    bossSprite: string;
    /** The combat level needed to make or join a lobby for it; 0 = none. */
    requiredLevel: number;
    maxPlayers: number;
};

export type GeoDungeonLobbyMember = {
    displayName: string;
    isHost: boolean;
    /** The player asking. */
    isYou: boolean;
};

/** A lobby waiting for its host to start it. Started lobbies are gone from the menu. */
export type GeoDungeonLobby = {
    id: string;
    dungeonId: string;
    hostName: string;
    /** The combat level needed to join: the dungeon's, or more if the host asked. */
    requiredLevel: number;
    playerCount: number;
    maxPlayers: number;
    /** Only filled in for the player's own lobby. */
    members?: GeoDungeonLobbyMember[];
};

/**
 * `GET /geo/dungeons`: every dungeon, the open lobbies (newest first,
 * the player's own left out), and the player's own lobby, if any.
 */
export type GeoDungeonsResponse = {
    dungeons: GeoDungeon[];
    lobbies: GeoDungeonLobby[];
    myLobby: GeoDungeonLobby | null;
    /** The player's combat level, for "can I join this". */
    combatLevel: number;
};

/**
 * Proof the player is at a POI: where they are, and the POI's marker. The
 * server checks the two are within GEO_PLACE_REACH_METRES.
 */
export type GeoDungeonEntrance = {
    position: GeoPoint;
    place: GeoPoint;
};

/** `POST /geo/dungeons/lobbies`: replies 201 with the new lobby as `myLobby`. */
export type GeoCreateDungeonLobbyRequest = GeoDungeonEntrance & {
    dungeonId: string;
    /** From the dungeon's requiredLevel up to the host's own combat level. */
    requiredLevel: number;
};

/** `POST /geo/dungeons/lobbies/:lobbyId/join`. */
export type GeoJoinDungeonLobbyRequest = GeoDungeonEntrance;

/**
 * `POST /geo/dungeons/lobbies/:lobbyId/start`, host only: everyone in the
 * lobby goes in at once, and the lobby is done. The host gets their Run back
 * to open at once; the others find theirs as the lobby leaves their menu.
 */
export type GeoStartDungeonLobbyResponse = {
    opened: GeoRunResponse;
    /** Members who couldn't fight right now (already in a Run, empty hand…) and were left out. */
    leftOut: string[];
};
