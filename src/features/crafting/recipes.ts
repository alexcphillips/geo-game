import { useMemo } from "react";
import { rarityInfo } from "@/features/inventory/rarity";
import { usePlayerStore } from "@/features/player/playerStore";
import { tabOf } from "@/features/player/toInventoryItem";
import { useInUseIds, useInventory, useSkillXp } from "@/features/player/usePlayer";
import { skillProgress } from "@/features/skills/skills";
import { GEO_CRAFT_MAX_QUANTITY, type GeoItemSource, type GeoItemView, type GeoRecipe } from "@/lib/geo/contracts";

/** One recipe, against what the player has now. */
export type RecipeStatus = {
    recipe: GeoRecipe;
    output: GeoItemView;
    /** Each input, with how many the player has free to use. */
    inputs: { def: GeoItemView; need: number; have: number }[];
    /** Each skill level needed, with the player's level. */
    skills: { skill: string; level: number; have: number }[];
    /** How many times it can be crafted now: 0 when anything is short. */
    maxCrafts: number;
};

/**
 * How many of each item the player could spend on a recipe, as the server
 * counts: nothing worn, bagged or in a hand, and cards only at full charge.
 */
function useFreeCounts(): Record<string, number> {
    const inventory = useInventory();
    const inUse = useInUseIds();
    return useMemo(() => {
        const counts: Record<string, number> = {};
        for (const item of inventory) {
            if (inUse.has(item.id)) continue;
            if (item.charges && item.charges.remaining !== item.charges.max) continue;
            counts[item.itemId] = (counts[item.itemId] ?? 0) + (item.quantity ?? 1);
        }
        return counts;
    }, [inventory, inUse]);
}

/** Every recipe's status, for recipes whose items the app knows. */
export function useRecipeStatuses(): RecipeStatus[] {
    const recipes = usePlayerStore((state) => state.recipes);
    const items = usePlayerStore((state) => state.items);
    const free = useFreeCounts();
    const xp = useSkillXp();
    return useMemo(
        () =>
            recipes.flatMap((recipe) => {
                const output = items[recipe.output.itemId];
                const inputs = recipe.inputs.map(({ itemId, quantity }) => ({
                    def: items[itemId],
                    need: quantity,
                    have: free[itemId] ?? 0,
                }));
                if (!output || inputs.some((input) => !input.def)) return [];
                const skills = recipe.skills.map(({ skill, level }) => ({
                    skill,
                    level,
                    have: skillProgress(xp[skill] ?? 0).level,
                }));
                const skilled = skills.every((skill) => skill.have >= skill.level);
                const affordable = Math.min(...inputs.map((input) => Math.floor(input.have / input.need)));
                return [
                    {
                        recipe,
                        output,
                        inputs: inputs as RecipeStatus["inputs"],
                        skills,
                        maxCrafts: skilled ? Math.min(affordable, GEO_CRAFT_MAX_QUANTITY) : 0,
                    },
                ];
            }),
        [recipes, items, free, xp],
    );
}

/** The recipes that use up this item. */
export function useUsages(itemId: string): RecipeStatus[] {
    const statuses = useRecipeStatuses();
    return useMemo(
        () => statuses.filter((status) => status.recipe.inputs.some((input) => input.itemId === itemId)),
        [statuses, itemId],
    );
}

/** How an item is normally obtained: drops and vendors, then the recipes that make it. */
export function useSources(itemId: string): { sources: GeoItemSource[]; recipes: RecipeStatus[] } {
    const all = usePlayerStore((state) => state.sources);
    const statuses = useRecipeStatuses();
    return useMemo(
        () => ({
            sources: all.filter((source) => source.itemId === itemId),
            recipes: statuses.filter((status) => status.recipe.output.itemId === itemId),
        }),
        [all, statuses, itemId],
    );
}

/** Sort by rarity (descending = rarest first) or by name (descending = Z–A). */
export type RecipeSort = { by: "rarity" | "name"; descending: boolean };

/** Rarest first: where a recipe list starts. */
export const DEFAULT_RECIPE_SORT: RecipeSort = { by: "rarity", descending: true };

/**
 * The recipes whose output or inputs match `query`, in `sort` order. Rarity
 * ties fall back to name.
 */
export function searchRecipes(statuses: RecipeStatus[], query: string, sort: RecipeSort): RecipeStatus[] {
    const needle = query.trim().toLowerCase();
    const matches = needle
        ? statuses.filter((status) =>
              [status.output, ...status.inputs.map((input) => input.def)].some((def) =>
                  def.name.toLowerCase().includes(needle),
              ),
          )
        : statuses;
    const rank = (status: RecipeStatus) => rarityInfo(status.output.rarity).rank;
    const byName = (a: RecipeStatus, b: RecipeStatus) => a.output.name.localeCompare(b.output.name);
    return [...matches].sort((a, b) =>
        sort.by === "name"
            ? (sort.descending ? -1 : 1) * byName(a, b)
            : (sort.descending ? rank(b) - rank(a) : rank(a) - rank(b)) || byName(a, b),
    );
}

/**
 * What a recipe makes, for the Crafting menu's filter: the inventory tab the
 * output goes in, plus Cards.
 */
export type RecipeCategory =
    | "cards"
    | "weapons"
    | "armor"
    | "accessories"
    | "consumables"
    | "materials"
    | "pets"
    | "misc";

/** In display order. */
export const RECIPE_CATEGORIES: { id: RecipeCategory; label: string }[] = [
    { id: "cards", label: "Cards" },
    { id: "weapons", label: "Weapons" },
    { id: "armor", label: "Armor" },
    { id: "accessories", label: "Accessories" },
    { id: "consumables", label: "Consumables" },
    { id: "materials", label: "Materials" },
    { id: "pets", label: "Pets" },
    { id: "misc", label: "Misc" },
];

export function recipeCategory(status: RecipeStatus): RecipeCategory {
    return tabOf(status.output);
}
