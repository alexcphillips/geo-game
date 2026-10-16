import { colors } from "@/theme/colors";

export type FishingActivityId = "calm" | "rippling" | "active" | "frenzied";

export type FishingActivity = {
    id: FishingActivityId;
    label: string;
    color: string;
    /** 1–4, for the meter's filled segments. */
    level: number;
};

/** Lowest to highest. `weight` is how often each comes up, out of 100. */
const ACTIVITY_LEVELS: (FishingActivity & { weight: number })[] = [
    { id: "calm", label: "Calm", color: colors.textSecondary, level: 1, weight: 35 },
    { id: "rippling", label: "Rippling", color: colors.skillFarming, level: 2, weight: 35 },
    { id: "active", label: "Active", color: colors.skillFishing, level: 3, weight: 22 },
    { id: "frenzied", label: "Frenzied", color: colors.emberBright, level: 4, weight: 8 },
];

export const ACTIVITY_LEVEL_COUNT = ACTIVITY_LEVELS.length;

const HOUR_MS = 3_600_000;

/**
 * How lively the fish are at a spot right now — placeholder.
 *
 * Steady for an hour at a time and different from spot to spot, so it's
 * worth checking another pond, but never flickers while you look: a hash of
 * the place and the current hour picks a level, weighted so Frenzied is rare.
 * The server will own this later, where it can follow real time of day,
 * season and weather.
 */
export function fishingActivity(placeId: string, now: number): FishingActivity {
    const roll = hash(`${placeId}:${Math.floor(now / HOUR_MS)}`) % 100;
    let threshold = 0;
    for (const { weight, ...activity } of ACTIVITY_LEVELS) {
        threshold += weight;
        if (roll < threshold) return activity;
    }
    const { weight: _weight, ...top } = ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1]!;
    return top;
}

/** Milliseconds until the activity next changes — the top of the hour. */
export function msUntilActivityChange(now: number): number {
    return HOUR_MS - (now % HOUR_MS);
}

/** "Changes in 23m", "Changes in 1h 0m". */
export function formatActivityChange(ms: number): string {
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    return minutes >= 60
        ? `Changes in ${Math.floor(minutes / 60)}h ${minutes % 60}m`
        : `Changes in ${minutes}m`;
}

/** FNV-1a: small, fast, and well spread for short strings. */
function hash(text: string): number {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 0x01000193);
    }
    return value >>> 0;
}
