import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

/** A pill button on an end-of-Run card: Leave, Fight again. */
export default function OutcomeButton({
    label,
    onPress,
    primary = false,
}: {
    label: string;
    onPress: () => void;
    primary?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            <Text style={[styles.text, primary && styles.textPrimary]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    buttonPrimary: {
        backgroundColor: colors.ember,
    },
    text: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "600",
    },
    textPrimary: {
        color: colors.textOnEmber,
    },
    pressed: {
        transform: [{ scale: 0.95 }],
    },
});
