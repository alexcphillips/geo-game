import type { ReactNode } from "react";
import { View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import { Hint, SectionTitle } from "@/components/Text/Text";
import TextField from "@/components/TextField/TextField";
import { createStyles, useTheme } from "@/theme/theme";

/** A labelled form row around any control (a number, segments, a line of text), with an optional hint under it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    const styles = useStyles();
    return (
        <View style={styles.field}>
            <SectionTitle>{label}</SectionTitle>
            {children}
            {hint && <Hint>{hint}</Hint>}
        </View>
    );
}

/** A whole-number input: anything but digits is dropped as it's typed. `coins` shows it as an amount of coins. */
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
    const palette = useTheme();
    return (
        <TextField
            value={value}
            onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder={placeholder}
            accessibilityLabel={accessibilityLabel}
            selectTextOnFocus
            numeric
            tone={coins ? "reward" : "default"}
            leading={coins ? <Icon name="two-coins" size={16} color={palette.reward} /> : undefined}
        />
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
            <Button label="-10" size="small" onPress={() => step(-10)} disabled={quantity <= 1} style={styles.stepButton} />
            <View style={styles.stepperInput}>
                <NumberInput value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} />
            </View>
            <Button label="+10" size="small" onPress={() => step(10)} disabled={quantity >= max} style={styles.stepButton} />
        </View>
    );
}

const useStyles = createStyles(() => ({
    field: {
        gap: 6,
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
    },
}));
