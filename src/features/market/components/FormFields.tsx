import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { Hint } from "@/components/Text/Text";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme, inked } from "@/theme/theme";

/** A labelled form field, with an optional hint under it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    const styles = useStyles();
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            {children}
            {hint && <Hint>{hint}</Hint>}
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
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={styles.input}>
            {coins && <Icon name="two-coins" size={16} color={palette.reward} />}
            <TextInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                returnKeyType="done"
                placeholder={placeholder}
                placeholderTextColor={palette.textMuted}
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
    const styles = useStyles();
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
    const styles = useStyles();
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

const useStyles = createStyles((p) => ({
    field: {
        gap: 6,
    },
    label: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    input: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: p.background,
        borderWidth: 2.5,
        borderColor: p.outline,
    },
    inputText: {
        flex: 1,
        paddingVertical: 10,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 16,
        fontVariant: ["tabular-nums"],
    },
    inputCoins: {
        color: p.reward,
        fontFamily: FONTS.bodyHeavy,
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
        borderRadius: 14,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    stepButtonText: {
        color: p.ember,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
