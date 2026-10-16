import type { GameIconName } from "@/components/Icon/Icon";
import type { GeoSuggestionKind } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/**
 * What a player can suggest a place should be.
 *
 * Deliberately wider than the skills the map currently draws: suggestions are
 * how we learn where hubs *should* go, including for skills that don't exist
 * yet. The kinds are the server's (`GEO_SUGGESTION_KINDS`); adding one there
 * and here is all a new skill needs.
 */
export type SuggestionKind = GeoSuggestionKind;

export type SuggestionKindInfo = {
    id: SuggestionKind;
    label: string;
    icon: GameIconName;
    color: string;
};

export const SUGGESTION_KINDS: SuggestionKindInfo[] = [
    { id: "mining", label: "Mining", icon: "mining", color: colors.skillMining },
    { id: "fishing", label: "Fishing", icon: "fishing-pole", color: colors.skillFishing },
    { id: "farming", label: "Farming", icon: "wheat", color: colors.skillFarming },
    { id: "foraging", label: "Foraging", icon: "pine-tree", color: colors.skillForaging },
    { id: "landmark", label: "Landmark", icon: "ancient-ruins", color: colors.emberBright },
    { id: "other", label: "Other", icon: "uncertainty", color: colors.textSecondary },
];

export function suggestionKindInfo(kind: SuggestionKind): SuggestionKindInfo {
    // The list covers every kind, so the fallback never runs; it keeps
    // `noUncheckedIndexedAccess` satisfied without a non-null assertion.
    return SUGGESTION_KINDS.find((info) => info.id === kind) ?? SUGGESTION_KINDS[0]!;
}
