import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/inventory/components/ItemTile";
import { rarityInfo } from "@/features/inventory/rarity";
import { formatCoins } from "@/features/market/market";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { skillLabel } from "@/features/skills/skills";
import type { GeoItemView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { isStructure, type RecipeSort, type RecipeStatus } from "../recipes";

/** Rarity · type under an item's name, e.g. "Rare · Weapon". */
function kindLabel(def: GeoItemView): string {
    switch (def.kind) {
        case "card":
            return "Card";
        case "equipment":
            if (def.slot === "ring") return "Ring";
            if (def.slot === "amulet") return "Amulet";
            if (def.rod) return "Rod";
            return def.slot === "mainHand" || def.slot === "offHand" ? "Weapon" : "Armor";
        case "talisman":
            return "Talisman";
        case "material":
            return "Material";
        case "consumable":
            return "Consumable";
        case "misc":
            return isStructure(def) ? "Structure" : "Item";
        case "pet":
            return "Pet";
        case "petItem":
            return "Pet Item";
    }
}

/** Why a recipe can't be crafted now, or how many times it can. */
function craftSummary(status: RecipeStatus): { text: string; ok: boolean } {
    if (status.skills.some((skill) => skill.have < skill.level)) return { text: "Skill level too low", ok: false };
    if (status.maxCrafts < 1) return { text: "Missing materials", ok: false };
    return { text: `You can craft ${formatCoins(status.maxCrafts)}`, ok: true };
}

/**
 * A recipe as a card: the made item on top, a divider, then what it needs.
 * The left edge carries the made item's rarity colour. `footer` sits under
 * the requirements, e.g. the Craft button.
 */
export function RecipeCard({
    status,
    times,
    highlight,
    onInspect,
    footer,
}: {
    status: RecipeStatus;
    times?: number;
    highlight?: string;
    onInspect: (itemId: string) => void;
    footer?: ReactNode;
}) {
    const { output, recipe } = status;
    const rarity = rarityInfo(output.rarity);
    return (
        <View style={[styles.card, { borderLeftColor: rarity.color }]}>
            <View style={styles.outputRow}>
                <View style={styles.outputTile}>
                    <ItemTile
                        item={{ ...catalogueItem(output, `made-${output.id}`), quantity: recipe.output.quantity }}
                        onPress={() => onInspect(output.id)}
                        onLongPress={() => onInspect(output.id)}
                    />
                </View>
                <View style={styles.outputText}>
                    <Text style={styles.outputName}>{output.name}</Text>
                    <Text style={styles.outputMeta}>
                        <Text style={{ color: rarity.color }}>{rarity.label}</Text>
                        {` · ${kindLabel(output)}`}
                        {recipe.output.quantity > 1 ? ` · makes ${formatCoins(recipe.output.quantity)}` : ""}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <Requirements status={status} times={times} highlight={highlight} onInspect={onInspect} />
            {footer}
        </View>
    );
}

/**
 * What a recipe needs: each input as a tile (opens its details) badged with
 * how many it takes, over have/need; then each skill level. Anything short
 * is red.
 */
function Requirements({
    status,
    times = 1,
    highlight,
    onInspect,
}: {
    status: RecipeStatus;
    /** Crafts being made, to scale the amounts needed. */
    times?: number;
    highlight?: string;
    onInspect: (itemId: string) => void;
}) {
    return (
        <View style={styles.requirements}>
            <Text style={styles.label}>Materials</Text>
            <View style={styles.inputs}>
                {status.inputs.map(({ def, need, have }) => {
                    const total = need * Math.max(1, times);
                    const short = have < total;
                    return (
                        <View key={def.id} style={styles.input}>
                            <View style={[styles.inputTile, def.id === highlight && styles.inputTileHighlight]}>
                                <ItemTile
                                    item={{ ...catalogueItem(def, `need-${def.id}`), quantity: total }}
                                    compact
                                    onPress={() => onInspect(def.id)}
                                    onLongPress={() => onInspect(def.id)}
                                />
                            </View>
                            <View
                                style={[styles.count, short ? styles.countShort : styles.countMet]}
                                accessibilityLabel={`${def.name}: have ${have}, need ${total}`}
                            >
                                <Text style={[styles.countText, short ? styles.short : styles.met]}>
                                    {formatCoins(have)}
                                    <Text style={styles.countNeed}>/{formatCoins(total)}</Text>
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
            {status.skills.length > 0 && (
                <>
                    <Text style={styles.label}>Skills</Text>
                    <View style={styles.skills}>
                        {status.skills.map(({ skill, level, have }) => {
                            const short = have < level;
                            return (
                                <View key={skill} style={[styles.skill, short ? styles.skillShort : styles.skillMet]}>
                                    <Icon
                                        name={short ? "padlock" : "check-mark"}
                                        size={11}
                                        color={short ? colors.toastError : colors.toastSuccess}
                                    />
                                    <Text style={[styles.skillText, short ? styles.short : styles.met]}>
                                        {skillLabel(skill)} {level}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </View>
    );
}

/** A recipe in a list: its card, with whether it can be made now and a Craft button. */
export function RecipeRow({
    status,
    highlight,
    onInspect,
    onCraft,
}: {
    status: RecipeStatus;
    /** The item whose menu this is, outlined among the inputs. */
    highlight?: string;
    onInspect: (itemId: string) => void;
    onCraft: () => void;
}) {
    const canCraft = status.maxCrafts > 0;
    const summary = craftSummary(status);
    return (
        <RecipeCard
            status={status}
            highlight={highlight}
            onInspect={onInspect}
            footer={
                <View style={styles.footer}>
                    <Text style={[styles.footerText, !summary.ok && styles.short]}>{summary.text}</Text>
                    <Pressable
                        onPress={onCraft}
                        disabled={!canCraft}
                        style={({ pressed }) => [styles.craftButton, !canCraft && styles.disabled, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Craft ${status.output.name}`}
                        accessibilityState={{ disabled: !canCraft }}
                    >
                        <Icon name="anvil" size={15} color={colors.textOnEmber} />
                        <Text style={styles.craftText}>Craft</Text>
                    </Pressable>
                </View>
            }
        />
    );
}

const SORTS: { id: RecipeSort["by"]; label: string }[] = [
    { id: "rarity", label: "Rarity" },
    { id: "name", label: "Name" },
];

/** Sort chips for a recipe list. */
export function RecipeSortChips({ sort, onSort }: { sort: RecipeSort; onSort: (sort: RecipeSort) => void }) {
    const direction = sort.descending ? "descending" : "ascending";
    return (
        <ChipRow label="Sort" radio>
            {SORTS.map((mode) => {
                const isOn = mode.id === sort.by;
                // Tapping the active sort flips its direction; another starts descending
                // for rarity (rarest first) and ascending for names (A–Z).
                const next: RecipeSort = isOn
                    ? { by: mode.id, descending: !sort.descending }
                    : { by: mode.id, descending: mode.id === "rarity" };
                return (
                    <Chip
                        key={mode.id}
                        label={mode.label}
                        selected={isOn}
                        onPress={() => onSort(next)}
                        direction={isOn ? direction : undefined}
                        accessibilityLabel={isOn ? `${mode.label}, ${direction}` : mode.label}
                        accessibilityHint={isOn ? "Flips the order" : undefined}
                    />
                );
            })}
        </ChipRow>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
    },
    outputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    outputTile: {
        width: 80,
    },
    outputText: {
        flex: 1,
        gap: 3,
    },
    outputName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: "700",
    },
    outputMeta: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: -12,
    },
    requirements: {
        gap: 8,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    inputs: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    input: {
        width: 80,
        alignItems: "center",
        gap: 5,
    },
    inputTile: {
        width: "100%",
        borderRadius: 10,
        padding: 1,
    },
    inputTileHighlight: {
        backgroundColor: colors.ember,
    },
    count: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: colors.surface,
        borderWidth: 1,
    },
    countMet: {
        borderColor: colors.border,
    },
    countShort: {
        borderColor: colors.toastError,
    },
    countText: {
        fontSize: 11,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    countNeed: {
        color: colors.textSecondary,
        fontWeight: "600",
    },
    short: {
        color: colors.toastError,
    },
    met: {
        color: colors.textPrimary,
    },
    skills: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    skill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    skillMet: {
        borderColor: colors.border,
    },
    skillShort: {
        borderColor: colors.toastError,
    },
    skillText: {
        fontSize: 12,
        fontWeight: "600",
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingTop: 2,
    },
    footerText: {
        flex: 1,
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    craftButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    craftText: {
        color: colors.textOnEmber,
        fontSize: 14,
        fontWeight: "800",
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
