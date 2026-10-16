import type { GeoFishIntent, GeoQualityTier } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** The words and glyphs for what the server's fishing Run sends. */

export const QUALITY_TIER_LABELS: Record<GeoQualityTier, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    ruby: "Ruby",
};

/** A tier is a metal rim, never a fill, so it never clashes with rarity. */
export const QUALITY_TIER_COLORS: Record<GeoQualityTier, string> = {
    bronze: colors.tierBronze,
    silver: colors.tierSilver,
    gold: colors.tierGold,
    ruby: colors.tierRuby,
};

/** Rank for sorting: higher is better; a regular item has none. */
export const QUALITY_TIER_RANK: Record<GeoQualityTier, number> = { bronze: 1, silver: 2, gold: 3, ruby: 4 };

export const INTENTS: Record<GeoFishIntent, { label: string; glyph: string; text: string }> = {
    run: { label: "Run", glyph: "→", text: "Pulls away: +Distance, +Tension" },
    thrash: { label: "Thrash", glyph: "≋", text: "Tension spike" },
    dive: { label: "Dive", glyph: "↓", text: "Your progress is halved this turn" },
    rest: { label: "Rest", glyph: "…", text: "Tension drops; a cheap turn to reel" },
    jump: { label: "Jump", glyph: "↑", text: "Sudden slack; risks throwing the hook" },
};

export const TRAITS: Record<string, { label: string; text: string }> = {
    slippery: { label: "Slippery", text: "Tension drops by 1 every turn." },
    linebreaker: { label: "Line-Breaker", text: "Its Thrash adds 2 more Tension." },
    deepdiver: { label: "Deep Diver", text: "Your progress is halved until it's Exhausted." },
};

export const traitLabel = (trait: string) => TRAITS[trait]?.label ?? trait;
