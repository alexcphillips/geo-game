import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import EmptyState from "@/components/EmptyState/EmptyState";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import { craftingActions } from "@/features/crafting/craftingActions";
import { useRecipeStatuses, type RecipeStatus } from "@/features/crafting/recipes";
import ItemTile from "@/features/inventory/components/ItemTile";
import { rarityInfo, RARITIES } from "@/features/inventory/rarity";
import { formatCoins } from "@/features/market/market";
import { useSkillXp } from "@/features/player/usePlayer";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { skillLabel, skillProgress } from "@/features/skills/skills";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";

const rarityRank = (status: RecipeStatus) => RARITIES.find((info) => info.id === status.output.rarity)?.rank ?? 0;

/**
 * Cooking: one row per cooking recipe (`station: "cooking"`), commonest
 * first. Each row shows what it makes, what it heals, the XP it gives, and
 * what it costs against what you have. Cooked food goes to the inventory,
 * ready to pack in the lunchbox at Camp.
 */
export default function CookingModal({ onClose }: { onClose: () => void }) {
    const styles = useStyles();
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
                {rows.length === 0 && <EmptyState title="No cooking recipes yet." />}
            </ScrollView>
        </Modal>
    );
}

function CookingRow({ status, busy, onCook }: { status: RecipeStatus; busy: boolean; onCook: (times: number) => void }) {
    const styles = useStyles();
    const { output, recipe } = status;
    const rarity = rarityInfo(output.rarity);
    const heals = output.stats.find((row) => row.label === "Heals")?.value;
    const lockedBy = status.skills.find((skill) => skill.have < skill.level);
    const canCook = status.maxCrafts > 0 && !busy;
    const details = [heals && `Heals ${heals}`, recipe.xp && `+${recipe.xp.amount} ${skillLabel(recipe.xp.skill)} XP`]
        .filter(Boolean)
        .join(" · ");

    return (
        <Panel compact style={[styles.row, { borderLeftColor: rarity.color }]}>
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
                <Button
                    label="Cook"
                    variant="primary"
                    icon="cooking-pot"
                    onPress={() => onCook(1)}
                    disabled={!canCook}
                    style={styles.grow}
                    accessibilityLabel={`Cook one ${output.name}`}
                />
                {status.maxCrafts > 1 && (
                    <Button
                        label={`All ×${formatCoins(status.maxCrafts)}`}
                        onPress={() => onCook(status.maxCrafts)}
                        disabled={!canCook}
                        accessibilityLabel={`Cook ${status.maxCrafts} ${output.name}`}
                    />
                )}
            </View>
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    grow: {
        flex: 1,
    },
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    level: {
        gap: 6,
        paddingBottom: 4,
    },
    levelText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    meter: {
        height: 6,
        borderRadius: 999,
        backgroundColor: p.surface,
        overflow: "hidden",
    },
    meterFill: {
        height: "100%",
        backgroundColor: p.ember,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
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
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    details: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    cost: {
        color: p.text,
        fontSize: 12,
    },
    costLabel: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
    },
    short: {
        color: p.danger,
    },
    buttons: {
        gap: 6,
        alignItems: "stretch",
    },
}));
