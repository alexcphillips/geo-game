import { colors } from "@/theme/colors";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type RarityInfo = { id: Rarity; label: string; color: string; rank: number };

/** Lowest to highest. `rank` is what sorting compares. */
export const RARITIES: RarityInfo[] = [
    { id: "common", label: "Common", color: colors.rarityCommon, rank: 0 },
    { id: "uncommon", label: "Uncommon", color: colors.rarityUncommon, rank: 1 },
    { id: "rare", label: "Rare", color: colors.rarityRare, rank: 2 },
    { id: "epic", label: "Epic", color: colors.rarityEpic, rank: 3 },
    { id: "legendary", label: "Legendary", color: colors.rarityLegendary, rank: 4 },
];

export function rarityInfo(rarity: Rarity): RarityInfo {
    return RARITIES.find((info) => info.id === rarity) ?? RARITIES[0]!;
}
