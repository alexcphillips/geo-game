import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Divider from "@/components/Divider/Divider";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/items/components/ItemTile";
import { rarityInfo } from "@/features/items/rarity";
import { formatCoins } from "@/features/market/market";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { skillLabel } from "@/features/skills/skills";
import type { GeoItemView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { type RecipeSort, type RecipeStatus } from "../recipes";

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
            return "Item";
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
    const styles = useStyles();
    const { output, recipe } = status;
    const rarity = rarityInfo(output.rarity);
    return (
        <Panel compact style={[styles.card, { borderLeftColor: rarity.color }]}>
            <View style={styles.outputRow}>
                <View style={styles.outputTile}>
                    <ItemTile
                        item={{ ...catalogueItem(output, `made-${output.id}`), quantity: recipe.output.quantity }}
                        onPress={() => onInspect(output.id)}
                        onLongPress={() => onInspect(output.id)}
                        showName={false}
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

            <Divider />

            <Requirements status={status} times={times} highlight={highlight} onInspect={onInspect} />
            {footer}
        </Panel>
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
    const styles = useStyles();
    const palette = useTheme();
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
                                        color={short ? palette.danger : palette.heal}
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
    const styles = useStyles();
    const palette = useTheme();
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
                        <Icon name="anvil" size={15} color={palette.onPrimary} />
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

const useStyles = createStyles((p) => ({
    card: {
        gap: 12,
        padding: 12,
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
        color: p.text,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    outputMeta: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    requirements: {
        gap: 8,
    },
    label: {
        color: p.textMuted,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
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
        backgroundColor: p.ember,
    },
    count: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: p.surface,
        borderWidth: 1,
    },
    countMet: {
        borderColor: p.outline,
    },
    countShort: {
        borderColor: p.danger,
    },
    countText: {
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    countNeed: {
        color: p.textMuted,
        fontFamily: FONTS.bodyBold,
    },
    short: {
        color: p.danger,
    },
    met: {
        color: p.text,
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
        borderColor: p.outline,
    },
    skillShort: {
        borderColor: p.danger,
    },
    skillText: {
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
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
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    craftButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: p.ember,
    },
    craftText: {
        color: p.onPrimary,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
