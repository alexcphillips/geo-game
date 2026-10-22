const { networkInterfaces } = require("node:os");

/**
 * The dev machine's LAN address (e.g. 192.168.1.92), read when Expo starts.
 *
 * With `EXPO_PUBLIC_API_URL=lan` the app finds the local Worker from the Expo
 * dev server's own address, but under `expo start --tunnel` that address is the
 * tunnel's, which can't reach port 8787 on this machine. Passing the LAN address
 * along lets a phone on the same Wi-Fi still find it. See `src/lib/config.ts`.
 */
function lanAddress() {
    for (const addresses of Object.values(networkInterfaces())) {
        for (const address of addresses ?? []) {
            if (address.family === "IPv4" && !address.internal) return address.address;
        }
    }
    return null;
}

/** app.json stays the config; this only adds what has to be worked out at start. */
module.exports = ({ config }) => ({
    ...config,
    extra: {
        ...config.extra,
        devLanHost: lanAddress(),
    },
});
