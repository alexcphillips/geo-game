import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Icon from "@/components/Icon/Icon";
import { Field, QuantityInput } from "@/features/market/components/FormFields";
import { formatCoins } from "@/features/market/market";
import { colors } from "@/theme/colors";
import { craftingActions } from "../craftingActions";
import { useRecipeStatuses } from "../recipes";
import { RecipeCard } from "./RecipeCard";

/** One recipe: how many times to craft it, what that takes, and the button. */
export default function CraftPage({
    recipeId,
    onInspect,
    onDone,
}: {
    recipeId: string;
    onInspect: (itemId: string) => void;
    onDone: () => void;
}) {
    const status = useRecipeStatuses().find((candidate) => candidate.recipe.id === recipeId);
    const [text, setText] = useState("1");
    const [isBusy, setIsBusy] = useState(false);
    if (!status) return <Text style={styles.emptyText}>That recipe no longer exists.</Text>;

    const times = Number(text) || 0;
    const made = times * status.recipe.output.quantity;
    const problem =
        status.maxCrafts < 1
            ? "You're missing something this needs."
            : times < 1
              ? "Choose how many."
              : times > status.maxCrafts
                ? `You can craft at most ${formatCoins(status.maxCrafts)}.`
                : null;

    const submit = async () => {
        if (problem || isBusy) return;
        setIsBusy(true);
        const ok = await craftingActions.craft(recipeId, times, status.output.name, made);
        setIsBusy(false);
        if (ok) onDone();
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.craft} keyboardShouldPersistTaps="handled">
            <RecipeCard status={status} times={times} onInspect={onInspect} />

            <Field label="How many" hint={`You can craft ${formatCoins(status.maxCrafts)}`}>
                <QuantityInput
                    value={text}
                    onChange={setText}
                    max={Math.max(1, status.maxCrafts)}
                    accessibilityLabel="How many to craft"
                />
            </Field>

            <Pressable
                onPress={() => void submit()}
                disabled={problem !== null || isBusy}
                style={({ pressed }) => [
                    styles.primary,
                    (problem !== null || isBusy) && styles.disabled,
                    pressed && styles.pressed,
                ]}
                accessibilityRole="button"
            >
                <Icon name="anvil" size={16} color={colors.textOnEmber} />
                <Text style={styles.primaryText}>
                    Craft {formatCoins(made)} {status.output.name}
                </Text>
            </Pressable>
            {problem && <Text style={styles.problem}>{problem}</Text>}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    emptyText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
        textAlign: "center",
        paddingTop: 16,
    },
    craft: {
        gap: 14,
    },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
    },
    disabled: {
        opacity: 0.4,
    },
    problem: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: "center",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
