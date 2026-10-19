import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import SearchField from "@/components/SearchField/SearchField";
import { colors } from "@/theme/colors";
import {
    RECIPE_CATEGORIES,
    recipeCategory,
    searchRecipes,
    useRecipeStatuses,
    type RecipeCategory,
    type RecipeSort,
} from "../recipes";
import { RecipeRow, RecipeSortChips } from "./RecipeCard";

/** Whether to show recipes that can be crafted now, ones that can't, or both. */
export type Availability = "all" | "craftable" | "uncraftable";

const AVAILABILITIES: { id: Availability; label: string }[] = [
    { id: "all", label: "All" },
    { id: "craftable", label: "Craftable" },
    { id: "uncraftable", label: "Not craftable" },
];

/**
 * The Crafting menu: every recipe, filtered by what it makes and whether it
 * can be crafted now, searchable (by output or input) and sorted rarest
 * first. Only categories that have a recipe get a chip.
 */
export default function RecipesPage({
    query,
    onQuery,
    sort,
    onSort,
    category,
    onCategory,
    availability,
    onAvailability,
    onInspect,
    onCraft,
}: {
    query: string;
    onQuery: (query: string) => void;
    sort: RecipeSort;
    onSort: (sort: RecipeSort) => void;
    category: RecipeCategory | "all";
    onCategory: (category: RecipeCategory | "all") => void;
    availability: Availability;
    onAvailability: (availability: Availability) => void;
    onInspect: (itemId: string) => void;
    onCraft: (recipeId: string) => void;
}) {
    // Cooking recipes live on the Cooking menu.
    const all = useRecipeStatuses();
    const statuses = useMemo(() => all.filter((status) => status.recipe.station !== "cooking"), [all]);
    const categories = useMemo(() => {
        const present = new Set(statuses.map(recipeCategory));
        return RECIPE_CATEGORIES.filter((candidate) => present.has(candidate.id));
    }, [statuses]);

    const shown = useMemo(() => {
        const filtered = statuses.filter(
            (status) =>
                (category === "all" || recipeCategory(status) === category) &&
                (availability === "all" || (status.maxCrafts > 0) === (availability === "craftable")),
        );
        return searchRecipes(filtered, query, sort);
    }, [statuses, category, availability, query, sort]);

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
        >
            <SearchField value={query} onChange={onQuery} placeholder="Search recipes or materials" />

            <ChipRow label="Makes" radio>
                <Chip label="All" selected={category === "all"} onPress={() => onCategory("all")} />
                {categories.map((candidate) => (
                    <Chip
                        key={candidate.id}
                        label={candidate.label}
                        selected={category === candidate.id}
                        onPress={() => onCategory(candidate.id)}
                    />
                ))}
            </ChipRow>

            <ChipRow label="Show" radio>
                {AVAILABILITIES.map((option) => (
                    <Chip
                        key={option.id}
                        label={option.label}
                        selected={availability === option.id}
                        onPress={() => onAvailability(option.id)}
                    />
                ))}
            </ChipRow>

            <RecipeSortChips sort={sort} onSort={onSort} />

            {shown.map((status) => (
                <RecipeRow
                    key={status.recipe.id}
                    status={status}
                    onInspect={onInspect}
                    onCraft={() => onCraft(status.recipe.id)}
                />
            ))}
            {shown.length === 0 && (
                <Text style={styles.emptyText}>
                    {statuses.length === 0
                        ? "No recipes yet."
                        : query.trim()
                          ? `No recipes match “${query.trim()}”.`
                          : availability === "craftable"
                            ? "Nothing here you can craft yet."
                            : "No recipes match these filters."}
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 10,
        paddingBottom: 8,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
        textAlign: "center",
        paddingTop: 16,
    },
});
