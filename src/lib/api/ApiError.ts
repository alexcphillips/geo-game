/**
 * A non-2xx response. `message` is the server's `{ error }` text when it sent
 * one, so it is already safe and useful to show to the player.
 *
 * Mirrors cozy-app's `lib/api/ApiError.ts` deliberately: the two codebases
 * share a backend, so sharing error semantics keeps them readable together.
 */
export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }

    /** True when the session is missing or expired and the player must re-login. */
    get isUnauthorized(): boolean {
        return this.status === 401;
    }
}

/**
 * The server couldn't be reached at all: no connection, or no answer in
 * time. `detail` keeps the technical reason (the address, fetch's own
 * words) for logs and dev builds; players see {@link NETWORK_ERROR_MESSAGE}.
 */
export class NetworkError extends Error {
    readonly detail: string;

    constructor(detail: string) {
        super(NETWORK_ERROR_MESSAGE);
        this.name = "NetworkError";
        this.detail = detail;
    }
}

export const NETWORK_ERROR_MESSAGE = "Can't reach the game server. Check your internet connection and try again.";

/** Narrows an unknown catch value to a message worth rendering. */
export function toErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof NetworkError) return error.message;
    if (error instanceof Error) return error.message;
    return String(error);
}
