import { CONFIG } from "../config";
import { ApiError, NetworkError } from "./ApiError";

type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Bearer token for the current session.
 *
 * Held in a module variable rather than a store so that `api` has no React
 * dependency and can be called from anywhere. `session.ts` owns setting it;
 * nothing else should. It lives in memory only: the refresh token is what
 * persists, and a cold start swaps it for a new access token.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
    authToken = token;
}

/** The current access token, for the geo socket's sign-in. */
export function getAuthToken(): string | null {
    return authToken;
}

/**
 * Called on a 401: gets a new access token and says whether it did. Set by
 * `session.ts`, so this file stays free of how sessions work.
 */
let onUnauthorized: (() => Promise<boolean>) | null = null;

export function setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void {
    onUnauthorized = handler;
}

/** Gets a new access token after the geo socket was refused one; false if the session is over. */
export async function refreshAuthToken(): Promise<boolean> {
    return onUnauthorized ? onUnauthorized() : false;
}

/**
 * How long a request may take before it counts as unreachable. Without it, a
 * request to an address nothing answers on can hang for minutes.
 */
const TIMEOUT_MS = 10_000;

/**
 * fetch with a time limit. A timeout and fetch's own failure (no connection,
 * "Network request failed") both throw a {@link NetworkError}, whose message
 * is fit for players; the technical reason stays in its `detail`.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted) throw new NetworkError(`No answer from ${url} in ${TIMEOUT_MS / 1000}s`);
        throw new NetworkError(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        clearTimeout(timer);
    }
}

/** `auth: false` for the sign-in calls themselves, which must never retry. */
type RequestOptions = RequestInit & { auth?: boolean };

function withQuery(path: string, params?: QueryParams): string {
    if (!params) return path;

    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
    }

    const queryString = search.toString();
    return queryString ? `${path}?${queryString}` : path;
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body: unknown = await response.json();

        if (
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
        ) {
            return body.error;
        }
    } catch {
        // Non-JSON error body; fall through to the generic message.
    }

    return `Request failed (${response.status})`;
}

async function request<T>(
    path: string,
    { auth = true, ...options }: RequestOptions = {},
): Promise<T> {
    const formattedPath = path.startsWith("/") ? path : `/${path}`;

    const send = () =>
        fetchWithTimeout(`${CONFIG.apiBaseUrl}${formattedPath}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                ...options.headers,
            },
        });

    let response = await send();

    // An expired access token: get a new one and try once more.
    if (response.status === 401 && auth && onUnauthorized && (await onUnauthorized())) {
        response = await send();
    }

    if (!response.ok) {
        throw new ApiError(response.status, await readErrorMessage(response));
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
}

/**
 * Typed JSON access to geo-game-server. Every feature's `*.api.ts` is
 * built from these calls and names its own response type, so a contract change
 * breaks the call site rather than failing at runtime.
 *
 * All of them throw {@link ApiError} on a non-2xx response — callers use
 * try/catch rather than checking `response.ok`.
 */
export const api = {
    get<T>(path: string, params?: QueryParams): Promise<T> {
        return request<T>(withQuery(path, params));
    },

    post<T>(path: string, body?: unknown, options?: { auth?: boolean }): Promise<T> {
        return request<T>(path, {
            ...options,
            method: "POST",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },

    put<T>(path: string, body?: unknown): Promise<T> {
        return request<T>(path, {
            method: "PUT",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },

    patch<T>(path: string, body?: unknown): Promise<T> {
        return request<T>(path, {
            method: "PATCH",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },

    delete<T>(path: string): Promise<T> {
        return request<T>(path, { method: "DELETE" });
    },
};
