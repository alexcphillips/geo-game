import { useEffect, useState } from "react";
import { distanceMetres } from "@/features/location/distance";
import { useLocationStore } from "@/features/location/locationStore";
import { usePlayerStore } from "@/features/player/playerStore";
import {
    GEO_CAMP_MOVE_DAYS,
    GEO_CAMP_RADIUS_METRES,
    type GeoCamp,
} from "@/lib/geo/contracts";

export { GEO_CAMP_MOVE_DAYS as CAMP_MOVE_DAYS, GEO_CAMP_RADIUS_METRES as CAMP_RADIUS_METRES };

/**
 * Where the player stands against their camp, judged the way the server
 * judges it (same distance function and radius), so the screens can say no
 * at once. The server still checks, and has the last word.
 */
export type CampStatus = {
    camp: GeoCamp | null;
    /** Metres from camp; null with no camp or no GPS fix yet. */
    distance: number | null;
    isAtCamp: boolean;
    /**
     * Packing the lunchbox and bait is allowed here: at camp,
     * or a game admin anywhere (the server skips the check for them too).
     */
    canRestock: boolean;
    /** Camp can be set or moved now: none yet, the wait is up, or an admin. */
    canMove: boolean;
    /** When it can next move; null when it can now. */
    movableAt: Date | null;
};

export function useCampStatus(): CampStatus {
    const camp = usePlayerStore((state) => state.me?.camp ?? null);
    const isAdmin = usePlayerStore((state) => state.me?.player.role === "admin");
    const position = useLocationStore((state) => state.position);
    const now = useNow(camp ? new Date(camp.movableAt) : null);

    const distance = camp && position ? distanceMetres(position, camp.position) : null;
    const isAtCamp = distance !== null && distance <= GEO_CAMP_RADIUS_METRES;
    const movableAt = camp && new Date(camp.movableAt).getTime() > now && !isAdmin ? new Date(camp.movableAt) : null;

    return {
        camp,
        distance,
        isAtCamp,
        canRestock: isAtCamp || isAdmin,
        canMove: movableAt === null,
        movableAt,
    };
}

/** The clock, ticking over once when `until` passes so "can move" turns on by itself. */
function useNow(until: Date | null): number {
    const [now, setNow] = useState(() => Date.now());
    const untilMs = until?.getTime() ?? null;
    useEffect(() => {
        if (untilMs === null || untilMs <= now) return;
        // setTimeout caps out around 24.8 days; the move wait is well inside it.
        const timer = setTimeout(() => setNow(Date.now()), untilMs - now + 1000);
        return () => clearTimeout(timer);
    }, [untilMs, now]);
    return now;
}

/** "80 m", "1.2 km". */
export function formatDistance(metres: number): string {
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** "Tue 21 Oct". */
export function formatDay(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * One line on whether packing works here, for the lunchbox and bait screens:
 * the rule, and how far there is to go. Null for an admin away from camp, who can pack anyway.
 */
export function restockNote(status: CampStatus): string | null {
    if (status.isAtCamp) return "You're at camp: pack as much as you like.";
    if (status.canRestock) return null;
    if (!status.camp) return "Packing happens only at camp, and you haven't made one. Make camp from the Character screen.";
    const away = status.distance === null ? "" : ` (${formatDistance(status.distance)} away)`;
    return `Packing happens only at camp${away}. Unpacking works anywhere.`;
}
