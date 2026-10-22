import Constants from "expo-constants";

/** Port geo-game-server listens on (its `PORT`). */
const BACKEND_PORT = 3001;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Where geo-game-server lives.
 *
 * `localhost` is useless from a phone — it resolves to the phone itself — so in
 * development the dev machine's LAN address is used, with the backend port:
 *
 * - normally it's the host Expo is serving this bundle from (`hostUri` looks
 *   like "192.168.1.5:8081"), so a new address from the network needs no
 *   editing;
 * - under `expo start --tunnel` that host is the tunnel's, which can't reach
 *   the backend, so the LAN address `app.config.js` read at start is used
 *   instead. That works while the phone is on the same Wi-Fi.
 *
 * Set `EXPO_PUBLIC_API_URL` to override — required off the home network (a
 * deployed server, or a tunnel to port 3001), and for any real build.
 */
function resolveApiBaseUrl(): string {
    const explicit = process.env.EXPO_PUBLIC_API_URL;

    if (explicit) return explicit.replace(/\/$/, "");

    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(":")[0];

    if (host && IPV4.test(host)) return `http://${host}:${BACKEND_PORT}`;

    const lanHost: unknown = Constants.expoConfig?.extra?.devLanHost;
    if (typeof lanHost === "string" && lanHost) return `http://${lanHost}:${BACKEND_PORT}`;

    if (host) return `http://${host}:${BACKEND_PORT}`;

    // Simulator on the same machine, or a build with no override configured.
    return `http://localhost:${BACKEND_PORT}`;
}

export const CONFIG = {
    apiBaseUrl: resolveApiBaseUrl(),
} as const;
