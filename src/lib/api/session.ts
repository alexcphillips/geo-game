import * as SecureStore from "expo-secure-store";
import { GEO_API_PATHS, type GeoSession } from "@/lib/geo/contracts";
import { ApiError } from "./ApiError";
import { api, setAuthToken, setUnauthorizedHandler } from "./client";

/**
 * The player's session. Signing in uses a geo-game account (email and
 * password, separate from cozy-app's); the server answers with tokens. The refresh token
 * is kept in the device's secure storage, so a restart stays signed in; the
 * access token is short-lived and held in memory only.
 */
const REFRESH_TOKEN_KEY = "geo-game.refresh-token";

async function adopt(session: GeoSession): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
    setAuthToken(session.accessToken);
}

async function forget(): Promise<void> {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Called when the server stops accepting the session (expired, revoked,
 * banned), so the app can go back to the sign-in screen. Set by the player
 * store.
 */
let onSessionEnded: (() => void) | null = null;

export function setSessionEndedHandler(handler: (() => void) | null): void {
    onSessionEnded = handler;
}

/**
 * Swaps the stored refresh token for a new pair. False when the server
 * rejects it; a network failure throws instead, so being offline is never
 * mistaken for a dead account.
 */
async function refresh(): Promise<boolean> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
        await adopt(
            await api.post<GeoSession>(GEO_API_PATHS.auth.refresh, { refreshToken }, { auth: false }),
        );
        return true;
    } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
            await forget();
            return false;
        }
        throw error;
    }
}

/**
 * One refresh at a time. A refresh token works once, so two requests failing
 * together must share a refresh rather than each spending the token: the
 * second would look like a stolen token and end every session.
 */
let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
    refreshing ??= refresh().finally(() => {
        refreshing = null;
    });
    return refreshing;
}

// A request refused mid-play: try a refresh, and if that fails too, the
// session is over and the app shows sign-in.
setUnauthorizedHandler(async () => {
    const ok = await refreshOnce();
    if (!ok) onSessionEnded?.();
    return ok;
});

/**
 * Resumes the stored session. False when there is none, or the server no
 * longer accepts it: the player has to sign in. Throws when the server can't
 * be reached.
 */
export async function resumeSession(): Promise<boolean> {
    return refreshOnce();
}

/** Signs in with a geo-game account's email and password. */
export async function signIn(email: string, password: string): Promise<void> {
    await adopt(await api.post<GeoSession>(GEO_API_PATHS.auth.login, { email, password }, { auth: false }));
}

/** Makes a geo-game account, and its player, and signs in. */
export async function register(username: string, email: string, password: string): Promise<void> {
    await adopt(
        await api.post<GeoSession>(GEO_API_PATHS.auth.register, { username, email, password }, { auth: false }),
    );
}

/** Ends this device's session on the server too, then forgets it. */
export async function signOut(): Promise<void> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
        if (refreshToken) await api.post(GEO_API_PATHS.auth.logout, { refreshToken }, { auth: false });
    } catch {
        // Offline: the token is forgotten here anyway and expires on its own.
    }
    await forget();
}
