/**
 * How each fish is drawn — placeholder art until fish have sprites. Keyed by
 * the server's fish id; a fish the app doesn't know yet gets a plain shape.
 */
export type FishLook = "plain" | "stripes" | "spots" | "scales" | "plates" | "whiskers";

export type FishArt = {
    /** Body length, roughly metres: bigger fish draw bigger. */
    length: number;
    /** Height as a share of length. */
    height: number;
    color: string;
    look: FishLook;
    eyeColor?: string;
};

const FISH_ART: Record<string, FishArt> = {
    perch: { length: 0.55, height: 0.42, color: "#9AA45A", look: "stripes" },
    trout: { length: 0.6, height: 0.32, color: "#A88A5A", look: "spots" },
    salmon: { length: 0.72, height: 0.3, color: "#C98A7A", look: "plain" },
    pike: { length: 0.95, height: 0.22, color: "#6F8A4A", look: "spots" },
    carp: { length: 0.85, height: 0.42, color: "#B9933F", look: "scales" },
    catfish: { length: 1.3, height: 0.26, color: "#5C5A52", look: "whiskers" },
    sturgeon: { length: 1.45, height: 0.2, color: "#6D7780", look: "plates" },
    musky: { length: 1.6, height: 0.22, color: "#7F8F5A", look: "stripes" },
    whiskers: { length: 2.2, height: 0.3, color: "#3B3F4A", look: "whiskers", eyeColor: "#F2C94C" },
};

const FALLBACK_ART: FishArt = { length: 0.7, height: 0.3, color: "#8A8F96", look: "plain" };

export const fishArt = (fishId: string | null | undefined): FishArt => (fishId && FISH_ART[fishId]) || FALLBACK_ART;
