import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

/** A labelled form field, with an optional hint under it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
            {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
    );
}

/** A whole-number input: anything but digits is dropped as it's typed. */
export function NumberInput({
    value,
    onChange,
    accessibilityLabel,
    coins = false,
    placeholder,
}: {
    value: string;
    onChange: (text: string) => void;
    accessibilityLabel: string;
    coins?: boolean;
    placeholder?: string;
}) {
    return (
        <View style={styles.input}>
            {coins && <Icon name="two-coins" size={16} color={colors.coins} />}
            <TextInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                returnKeyType="done"
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.inputText, coins && styles.inputCoins]}
                accessibilityLabel={accessibilityLabel}
                selectTextOnFocus
            />
        </View>
    );
}

/**
 * A whole-number input between −10 and +10 buttons. The buttons keep the
 * amount within 1..`max` (+10 adds only what fits, e.g. 2 when 2 are
 * affordable); typing isn't clamped, so the form explains an amount too big.
 */
export function QuantityInput({
    value,
    onChange,
    max,
    accessibilityLabel,
}: {
    value: string;
    onChange: (text: string) => void;
    max: number;
    accessibilityLabel: string;
}) {
    const quantity = Number(value) || 0;
    const step = (by: number) => onChange(String(Math.min(max, Math.max(1, quantity + by))));
    return (
        <View style={styles.stepper}>
            <StepButton label="-10" onPress={() => step(-10)} disabled={quantity <= 1} />
            <View style={styles.stepperInput}>
                <NumberInput value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} />
            </View>
            <StepButton label="+10" onPress={() => step(10)} disabled={quantity >= max} />
        </View>
    );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.stepButton, disabled && styles.disabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Text style={styles.stepButtonText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    field: {
        gap: 6,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    input: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputText: {
        flex: 1,
        paddingVertical: 10,
        color: colors.textPrimary,
        fontSize: 16,
        fontVariant: ["tabular-nums"],
    },
    inputCoins: {
        color: colors.coins,
        fontWeight: "700",
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    stepperInput: {
        flex: 1,
    },
    stepButton: {
        alignSelf: "stretch",
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepButtonText: {
        color: colors.emberBright,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
