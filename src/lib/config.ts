import Constants from "expo-constants";

/** The deployed game: geo-game-server's Worker on Cloudflare. */
const DEPLOYED_API_URL = "https://geo-game.alexphillipsdev.workers.dev";

/** Port `wrangler dev` serves geo-game-server's Worker on. */
const LOCAL_WORKER_PORT = 8787;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Where geo-game-server lives: the deployed Worker unless `EXPO_PUBLIC_API_URL`
 * says otherwise. A URL there is used as is; `lan` means a Worker on this dev
 * machine (`npm run dev:worker -- --ip 0.0.0.0` in geo-game-server, so the
 * phone can reach it).
 *
 * `localhost` is useless from a phone — it resolves to the phone itself — so
 * for `lan` the dev machine's LAN address is used:
 *
 * - normally it's the host Expo is serving this bundle from (`hostUri` looks
 *   like "192.168.1.5:8081"), so a new address from the network needs no
 *   editing;
 * - under `expo start --tunnel` that host is the tunnel's, which can't reach
 *   the Worker, so the LAN address `app.config.js` read at start is used
 *   instead. That works while the phone is on the same Wi-Fi.
 */
function resolveApiBaseUrl(): string {
    const explicit = process.env.EXPO_PUBLIC_API_URL;

    if (!explicit) return DEPLOYED_API_URL;
    if (explicit !== "lan") return explicit.replace(/\/$/, "");

    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(":")[0];

    if (host && IPV4.test(host)) return `http://${host}:${LOCAL_WORKER_PORT}`;

    const lanHost: unknown = Constants.expoConfig?.extra?.devLanHost;
    if (typeof lanHost === "string" && lanHost) return `http://${lanHost}:${LOCAL_WORKER_PORT}`;

    if (host) return `http://${host}:${LOCAL_WORKER_PORT}`;

    // Simulator on the same machine.
    return `http://localhost:${LOCAL_WORKER_PORT}`;
}

export const CONFIG = {
    apiBaseUrl: resolveApiBaseUrl(),
} as const;
