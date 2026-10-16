import type { GameIconName } from "@/components/Icon/Icon";
import {
    GEO_COMBAT_DAMAGE_PER_LEVEL,
    geoSkillProgress,
    geoXpToNextLevel,
    type GeoSkillProgress,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

export type SkillId =
    | "farming"
    | "mining"
    | "fishing"
    | "foraging"
    | "firemaking"
    | "combat"
    | "slayer"
    | "necromancy"
    | "archaeology"
    | "cartography"
    | "cooking";

export type SkillInfo = {
    id: SkillId;
    label: string;
    icon: GameIconName;
    color: string;
    /** World skills are trained at real places; the rest from menus. */
    kind: "world" | "menu";
};

/** Every skill, in display order: world skills first, then menu skills. */
export const SKILLS: SkillInfo[] = [
    { id: "farming", label: "Farming", icon: "wheat", color: colors.skillFarming, kind: "world" },
    { id: "mining", label: "Mining", icon: "mining", color: colors.skillMining, kind: "world" },
    { id: "fishing", label: "Fishing", icon: "fishing-pole", color: colors.skillFishing, kind: "world" },
    { id: "foraging", label: "Foraging", icon: "pine-tree", color: colors.skillForaging, kind: "world" },
    // Trained alongside foraging, at the same places.
    { id: "firemaking", label: "Firemaking", icon: "campfire", color: colors.skillForaging, kind: "world" },
    { id: "combat", label: "Combat", icon: "crossed-swords", color: colors.emberBright, kind: "menu" },
    // A task layer on combat.
    { id: "slayer", label: "Slayer", icon: "skull-crossed-bones", color: colors.emberBright, kind: "menu" },
    { id: "necromancy", label: "Necromancy", icon: "raise-zombie", color: colors.emberBright, kind: "menu" },
    { id: "archaeology", label: "Archaeology", icon: "spade", color: colors.emberBright, kind: "menu" },
    // Earned by filling collection logs and quests.
    { id: "cartography", label: "Cartography", icon: "quill-ink", color: colors.emberBright, kind: "menu" },
    { id: "cooking", label: "Cooking", icon: "cooking-pot", color: colors.emberBright, kind: "menu" },
];

/**
 * XP needed to go from `level` to the next. The curve lives in the contracts
 * so the server checks the same levels the app shows (e.g. recipe requirements).
 */
export const xpToNextLevel = geoXpToNextLevel;

/** A skill's label, e.g. "combat" → "Combat"; unknown ids are capitalised. */
export function skillLabel(skill: string): string {
    return SKILLS.find((info) => info.id === skill)?.label ?? skill.charAt(0).toUpperCase() + skill.slice(1);
}

/** A skill's level, and how far through it the player is, 0–1. */
export type SkillProgress = GeoSkillProgress;

/** Total XP, as a level (at most 50) and progress through it. Shared with the server. */
export const skillProgress = geoSkillProgress;

/** Combat's extra damage at a level, as a whole percent: level 12 → 12. */
export function combatDamageBonus(level: number): number {
    return Math.round(level * GEO_COMBAT_DAMAGE_PER_LEVEL * 100);
}
