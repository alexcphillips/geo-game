import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Modal from "@/components/Modal/Modal";
import { craftingActions } from "@/features/crafting/craftingActions";
import { useRecipeStatuses, type RecipeStatus } from "@/features/crafting/recipes";
import ItemTile from "@/features/inventory/components/ItemTile";
import { rarityInfo, RARITIES } from "@/features/inventory/rarity";
import { formatCoins } from "@/features/market/market";
import { useSkillXp } from "@/features/player/usePlayer";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { skillLabel, skillProgress } from "@/features/skills/skills";
import { colors } from "@/theme/colors";

const rarityRank = (status: RecipeStatus) => RARITIES.find((info) => info.id === status.output.rarity)?.rank ?? 0;

/**
 * Cooking: one row per cooking recipe (`station: "cooking"`), commonest
 * first. Each row shows what it makes, what it heals, the XP it gives, and
 * what it costs against what you have. Cooked food goes to the inventory,
 * ready to pack in the lunchbox at Camp.
 */
export default function CookingModal({ onClose }: { onClose: () => void }) {
    const statuses = useRecipeStatuses();
    const xp = useSkillXp();
    const { level, progress, isMax } = skillProgress(xp.cooking ?? 0);
    const [busy, setBusy] = useState<string | null>(null);

    const rows = useMemo(
        () =>
            statuses
                .filter((status) => status.recipe.station === "cooking")
                .sort((a, b) => rarityRank(a) - rarityRank(b) || a.output.name.localeCompare(b.output.name)),
        [statuses],
    );

    const cook = async (status: RecipeStatus, times: number) => {
        setBusy(status.recipe.id);
        await craftingActions.craft(status.recipe.id, times, status.output.name, status.recipe.output.quantity * times, "Cooked");
        setBusy(null);
    };

    return (
        <Modal title="Cooking" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                <View style={styles.level}>
                    <Text style={styles.levelText}>
                        Cooking {level}
                        {isMax ? " · max" : ` · ${Math.floor(progress * 100)}% to ${level + 1}`}
                    </Text>
                    <View style={styles.meter}>
                        <View style={[styles.meterFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                </View>

                {rows.map((status) => (
                    <CookingRow
                        key={status.recipe.id}
                        status={status}
                        busy={busy === status.recipe.id}
                        onCook={(times) => void cook(status, times)}
                    />
                ))}
                {rows.length === 0 && <Text style={styles.empty}>No cooking recipes yet.</Text>}
            </ScrollView>
        </Modal>
    );
}

function CookingRow({ status, busy, onCook }: { status: RecipeStatus; busy: boolean; onCook: (times: number) => void }) {
    const { output, recipe } = status;
    const rarity = rarityInfo(output.rarity);
    const heals = output.stats.find((row) => row.label === "Heals")?.value;
    const lockedBy = status.skills.find((skill) => skill.have < skill.level);
    const canCook = status.maxCrafts > 0 && !busy;
    const details = [heals && `Heals ${heals}`, recipe.xp && `+${recipe.xp.amount} ${skillLabel(recipe.xp.skill)} XP`]
        .filter(Boolean)
        .join(" · ");

    return (
        <View style={[styles.row, { borderLeftColor: rarity.color }]}>
            <View style={styles.tile}>
                <ItemTile item={{ ...catalogueItem(output, `cook-${output.id}`), quantity: recipe.output.quantity }} compact />
            </View>

            <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                    {output.name}
                </Text>
                {details !== "" && <Text style={styles.details}>{details}</Text>}
                <Text style={styles.cost} numberOfLines={2}>
                    <Text style={styles.costLabel}>Cost </Text>
                    {status.inputs.map(({ def, need, have }, i) => (
                        <Text key={def.id} style={have < need ? styles.short : undefined}>
                            {i > 0 ? ", " : ""}
                            {formatCoins(need)} {def.name} ({formatCoins(have)})
                        </Text>
                    ))}
                </Text>
                {lockedBy && (
                    <Text style={[styles.cost, styles.short]}>
                        Needs {skillLabel(lockedBy.skill)} {lockedBy.level}
                    </Text>
                )}
            </View>

            <View style={styles.buttons}>
                <Pressable
                    onPress={() => onCook(1)}
                    disabled={!canCook}
                    style={({ pressed }) => [styles.button, !canCook && styles.disabled, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Cook one ${output.name}`}
                    accessibilityState={{ disabled: !canCook }}
                >
                    <Text style={styles.buttonText}>Cook</Text>
                </Pressable>
                {status.maxCrafts > 1 && (
                    <Pressable
                        onPress={() => onCook(status.maxCrafts)}
                        disabled={!canCook}
                        style={({ pressed }) => [styles.buttonAll, !canCook && styles.disabled, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Cook ${status.maxCrafts} ${output.name}`}
                        accessibilityState={{ disabled: !canCook }}
                    >
                        <Text style={styles.buttonAllText}>All ×{formatCoins(status.maxCrafts)}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    level: {
        gap: 6,
        paddingBottom: 4,
    },
    levelText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    meter: {
        height: 6,
        borderRadius: 999,
        backgroundColor: colors.surface,
        overflow: "hidden",
    },
    meterFill: {
        height: "100%",
        backgroundColor: colors.ember,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
    },
    tile: {
        width: 52,
    },
    text: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
    },
    details: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    cost: {
        color: colors.textPrimary,
        fontSize: 12,
    },
    costLabel: {
        color: colors.textSecondary,
        fontWeight: "700",
    },
    short: {
        color: colors.toastError,
    },
    buttons: {
        gap: 6,
        alignItems: "stretch",
    },
    button: {
        alignItems: "center",
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    buttonText: {
        color: colors.textOnEmber,
        fontSize: 13,
        fontWeight: "800",
    },
    buttonAll: {
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    buttonAllText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "700",
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    empty: {
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
        textAlign: "center",
        paddingTop: 16,
    },
});
