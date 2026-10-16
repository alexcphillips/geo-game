import type { GameIconName } from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

/**
 * The skills that have their own card pool. A card belongs to exactly one, and
 * a hand only ever holds cards from one: no fireballs in a farming Run.
 *
 * Adding a skill with Runs is one entry here.
 */
export type CardSkill = "combat" | "fishing" | "mining" | "farming" | "foraging";

export type CardSkillInfo = {
    id: CardSkill;
    label: string;
    icon: GameIconName;
    color: string;
};

export const CARD_SKILLS: CardSkillInfo[] = [
    { id: "combat", label: "Combat", icon: "crossed-swords", color: colors.emberBright },
    { id: "fishing", label: "Fishing", icon: "fishing-pole", color: colors.skillFishing },
    { id: "mining", label: "Mining", icon: "mining", color: colors.skillMining },
    { id: "farming", label: "Farming", icon: "wheat", color: colors.skillFarming },
    { id: "foraging", label: "Foraging", icon: "pine-tree", color: colors.skillForaging },
];

/** How many cards a hand holds. One constant so it is trivial to rebalance. */
export const HAND_SIZE = 5;
