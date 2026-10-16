import { useEffect, useState } from "react";

/**
 * Milliseconds until `endsAt`, ticking every second. `clockOffsetMs` is the
 * server's clock minus the phone's, so a phone set wrong still counts down
 * to the server's moment.
 */
export function useTermCountdown(endsAt: number | null, clockOffsetMs = 0): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    return endsAt === null ? 0 : Math.max(0, endsAt - (now + clockOffsetMs));
}

/** "6d 04h 12m 09s" — the leading unit unpadded, the rest two digits. */
export function formatCountdown(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}
