import { View } from "react-native";
import Badge from "@/components/Badge/Badge";
import Button from "@/components/Button/Button";
import { Hint } from "@/components/Text/Text";
import { createStyles } from "@/theme/theme";
import type { NextStep } from "../nextStep";

type NextStepRowProps = {
    step: NextStep;
    busy: boolean;
    onStep: () => void;
    /** What's waiting across the Farm menu. */
    menuBadge: number;
    onOpenMenu: () => void;
};

/** The one next thing to do, big, and the Farm menu beside it. */
export default function NextStepButton({ step, busy, onStep, menuBadge, onOpenMenu }: NextStepRowProps) {
    const styles = useStyles();
    const actionable = step.kind === "harvest-all" || step.kind === "plant-all" || step.kind === "tile";
    return (
        <View style={styles.row}>
            <Button
                label={step.label}
                icon={step.icon}
                variant={actionable ? "primary" : "secondary"}
                size="large"
                disabled={!actionable}
                busy={busy && (step.kind === "harvest-all" || step.kind === "plant-all")}
                onPress={onStep}
                style={styles.step}
            />
            <View>
                <Button label="Farm" icon="farmer" size="large" onPress={onOpenMenu} accessibilityLabel={menuBadge > 0 ? `Farm menu, ${menuBadge} waiting` : "Farm menu"} />
                <Badge count={menuBadge} />
            </View>
        </View>
    );
}

/** In place of the row while a card or structure is being aimed: what to tap, and a way out. */
export function AimingRow({ hint, onCancel }: { hint: string; onCancel: () => void }) {
    const styles = useStyles();
    return (
        <View style={styles.row}>
            <Hint style={styles.step}>{hint}</Hint>
            <Button label="Cancel" size="large" onPress={onCancel} />
        </View>
    );
}

const useStyles = createStyles(() => ({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
    },
    step: {
        flex: 1,
    },
}));
