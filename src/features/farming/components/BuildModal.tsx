import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { craftingActions } from "@/features/crafting/craftingActions";
import { isStructure, useRecipeStatuses } from "@/features/crafting/recipes";
import { colors } from "@/theme/colors";
import { structureIcon } from "../farmText";

type BuildModalProps = {
    /** Structures held, by item id, ready to place. */
    held: Record<string, number>;
    /** After a craft: the farm fetches its structure kit again. */
    onCrafted: () => void;
    onClose: () => void;
};

/**
 * Every farm structure's recipe in one place: what it needs against what
 * the player has, and a Craft button. Crafting is the ordinary crafting
 * call; placing happens on a tile afterwards.
 */
export default function BuildModal({ held, onCrafted, onClose }: BuildModalProps) {
    const statuses = useRecipeStatuses().filter((status) => isStructure(status.output));
    const [busy, setBusy] = useState(false);

    const craft = async (recipeId: string, name: string) => {
        if (busy) return;
        setBusy(true);
        if (await craftingActions.craft(recipeId, 1, name, 1)) onCrafted();
        setBusy(false);
    };

    return (
        <Modal title="Build" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Text style={styles.hint}>Structures are crafted from what the farm grows and the pests leave. Place one on an empty tile at a farming place.</Text>
                {statuses.map((status) => {
                    const { output } = status;
                    const owned = held[output.id] ?? 0;
                    const canCraft = status.maxCrafts > 0 && !busy;
                    return (
                        <View key={status.recipe.id} style={styles.row}>
                            <Icon name={structureIcon(output.icon)} size={30} color={colors.structure} />
                            <View style={styles.text}>
                                <Text style={styles.name}>
                                    {output.name}
                                    {owned > 0 ? <Text style={styles.owned}> · {owned} ready</Text> : null}
                                </Text>
                                <Text style={styles.hint}>{output.description}</Text>
                                <Text style={styles.inputs}>
                                    {status.inputs.map((input, i) => (
                                        <Text key={input.def.id} style={input.have >= input.need ? styles.have : styles.short}>
                                            {i > 0 ? " · " : ""}
                                            {input.need} {input.def.name} ({input.have})
                                        </Text>
                                    ))}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => void craft(status.recipe.id, output.name)}
                                disabled={!canCraft}
                                style={({ pressed }) => [styles.craft, !canCraft && styles.craftDisabled, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Craft ${output.name}`}
                                accessibilityState={{ disabled: !canCraft }}
                            >
                                <Text style={[styles.craftText, !canCraft && styles.craftTextDisabled]}>Craft</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </ScrollView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 14,
        paddingBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    text: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    owned: {
        color: colors.cropRipe,
        fontWeight: "600",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    inputs: {
        fontSize: 12,
    },
    have: {
        color: colors.textPrimary,
    },
    short: {
        color: colors.pest,
    },
    craft: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: colors.ember,
    },
    craftDisabled: {
        backgroundColor: colors.tileLocked,
    },
    craftText: {
        color: colors.textOnEmber,
        fontWeight: "700",
    },
    craftTextDisabled: {
        color: colors.textSecondary,
    },
    pressed: {
        opacity: 0.75,
    },
});
