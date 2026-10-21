import { useState } from "react";
import { ScrollView, Text } from "react-native";
import Button from "@/components/Button/Button";
import { Hint } from "@/components/Text/Text";
import { Field, QuantityInput } from "@/features/market/components/FormFields";
import { formatCoins } from "@/features/market/market";
import { createStyles } from "@/theme/theme";
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
    const styles = useStyles();
    const status = useRecipeStatuses().find((candidate) => candidate.recipe.id === recipeId);
    const [text, setText] = useState("1");
    const [isBusy, setIsBusy] = useState(false);
    if (!status) return <Hint>That recipe no longer exists.</Hint>;

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

            <Button
                label={`Craft ${formatCoins(made)} ${status.output.name}`}
                variant="primary"
                size="large"
                icon="anvil"
                onPress={() => void submit()}
                disabled={problem !== null}
                busy={isBusy}
                stretch
            />
            {problem && <Text style={styles.problem}>{problem}</Text>}
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    craft: {
        gap: 14,
    },
    problem: {
        color: p.textMuted,
        fontSize: 12,
        textAlign: "center",
    },
}));
