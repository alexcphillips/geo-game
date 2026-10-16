import type { ImageSourcePropType } from "react-native";
import type { GameIconName } from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import type { GeoCandidate, GeoMayor, GeoMayorPerk } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/**
 * Mayors: an elected office whose perks are global boosters — every player
 * gets them while that mayor is in office. Who's in office, the election,
 * the perks and the votes all come from the server (`GET /geo/mayor`); this
 * file only adds how each mayor looks.
 */

export type MayorPerk = Omit<GeoMayorPerk, "icon"> & { icon: GameIconName };

export type Mayor = Omit<GeoMayor, "perks"> & {
    image: ImageSourcePropType;
    perks: MayorPerk[];
};

export type Candidate = Mayor & {
    /** Border colour on the candidate's tab, so candidates read apart. */
    color: string;
    votes: number;
};

/** Every mayor shares the knight's portrait until mayors have their own art. */
const PLACEHOLDER_PORTRAIT = require("@/features/character/assets/knight_portrait.png");

/** Each mayor's colour; one the server adds later falls back to ember. */
const MAYOR_COLORS: Record<string, string> = {
    marlon: colors.candidateMarlon,
    siegmoor: colors.candidateSiegmoor,
    malphas: colors.candidateMalphas,
    luna: colors.candidateLuna,
};

function iconOf(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "crown";
}

export function toMayor(mayor: GeoMayor): Mayor {
    return {
        ...mayor,
        image: PLACEHOLDER_PORTRAIT,
        perks: mayor.perks.map((perk) => ({ ...perk, icon: iconOf(perk.icon) })),
    };
}

export function toCandidate(candidate: GeoCandidate): Candidate {
    return { ...toMayor(candidate), color: MAYOR_COLORS[candidate.id] ?? colors.ember, votes: candidate.votes };
}
