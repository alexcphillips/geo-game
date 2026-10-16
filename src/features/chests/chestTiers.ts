import { formatCoins } from "@/features/market/market";
import type { GeoChestTier } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** Each tier's colour. Names and costs come from the server. */
export const CHEST_TIER_COLORS: Record<GeoChestTier, string> = {
    plain: colors.chestPlain,
    gold: colors.chestGold,
    ruby: colors.chestRuby,
    void: colors.chestVoid,
};

/** "Free", or "1,500". */
export function chestCostLabel(cost: number): string {
    return cost === 0 ? "Free" : formatCoins(cost);
}
