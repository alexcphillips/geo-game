import { useMemo } from "react";
import { ScrollView, Text } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import SearchField from "@/components/SearchField/SearchField";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { formatCoins } from "@/features/market/market";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { searchRecipes, useSources, useUsages, type RecipeSort } from "../recipes";
import { RecipeRow, RecipeSortChips } from "./RecipeCard";

/**
 * An item's Usage: first how it's obtained (drops, vendors, the recipes that
 * make it), then every recipe that uses it up, searchable and sorted rarest
 * first.
 */
export default function UsagePage({
    itemId,
    query,
    onQuery,
    sort,
    onSort,
    onInspect,
    onCraft,
}: {
    itemId: string;
    query: string;
    onQuery: (query: string) => void;
    sort: RecipeSort;
    onSort: (sort: RecipeSort) => void;
    onInspect: (itemId: string) => void;
    onCraft: (recipeId: string) => void;
}) {
    const styles = useStyles();
    const usages = useUsages(itemId);
    const shown = useMemo(() => searchRecipes(usages, query, sort), [usages, query, sort]);

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            <Obtained itemId={itemId} onInspect={onInspect} onCraft={onCraft} />

            <SectionTitle>Used in</SectionTitle>
            {usages.length === 0 ? (
                <Text style={styles.sectionEmpty}>Nothing uses this yet.</Text>
            ) : (
                <>
                    <SearchField value={query} onChange={onQuery} placeholder="Search uses" />
                    <RecipeSortChips sort={sort} onSort={onSort} />

                    {shown.map((status) => (
                        <RecipeRow
                            key={status.recipe.id}
                            status={status}
                            highlight={itemId}
                            onInspect={onInspect}
                            onCraft={() => onCraft(status.recipe.id)}
                        />
                    ))}
                    {shown.length === 0 && <Hint>No uses match “{query.trim()}”.</Hint>}
                </>
            )}
        </ScrollView>
    );
}

/**
 * How the item is normally obtained, at the top of the menu: drops and
 * vendors as one-line rows, then the recipes that make it (craftable here).
 * Useful when looking at an item on the Market that you don't own.
 */
function Obtained({
    itemId,
    onInspect,
    onCraft,
}: {
    itemId: string;
    onInspect: (itemId: string) => void;
    onCraft: (recipeId: string) => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const { sources, recipes } = useSources(itemId);
    return (
        <>
            <SectionTitle>Obtained from</SectionTitle>
            {sources.length === 0 && recipes.length === 0 && (
                <Text style={styles.sectionEmpty}>No known way to get this yet.</Text>
            )}
            {sources.map((source) => (
                <Panel compact key={`${source.kind}-${source.name}`} style={styles.source}>
                    <Icon
                        name={source.kind === "enemy" ? "crossed-swords" : "shop"}
                        size={18}
                        color={palette.ember}
                    />
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <Text style={styles.sourceDetail}>
                        {source.kind === "enemy"
                            ? `Drop · ${formatChance(source.chance)}${formatQuantity(source.quantity)}`
                            : "Vendor"}
                    </Text>
                </Panel>
            ))}
            {recipes.map((status) => (
                <RecipeRow
                    key={status.recipe.id}
                    status={status}
                    onInspect={onInspect}
                    onCraft={() => onCraft(status.recipe.id)}
                />
            ))}
        </>
    );
}

/** 1 → "Always", 0.5 → "50%", 0.004 → "0.4%". */
function formatChance(chance: number): string {
    if (chance >= 1) return "Always";
    const percent = chance * 100;
    return `${percent >= 1 ? Math.round(percent) : Number(percent.toPrecision(2))}%`;
}

/** {1,1} → "", {2,2} → " · ×2", {1,3} → " · ×1–3". */
function formatQuantity({ min, max }: { min: number; max: number }): string {
    if (max <= 1) return "";
    return min === max ? ` · ×${formatCoins(min)}` : ` · ×${formatCoins(min)}–${formatCoins(max)}`;
}

const useStyles = createStyles((p) => ({
    list: {
        gap: 10,
        paddingBottom: 8,
    },
    sectionEmpty: {
        color: p.textMuted,
        fontSize: 13,
        fontStyle: "italic",
    },
    source: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    sourceName: {
        flex: 1,
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    sourceDetail: {
        color: p.textMuted,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
    },
}));
