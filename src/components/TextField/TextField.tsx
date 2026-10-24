import { forwardRef, type ComponentRef, type ReactNode } from "react";
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type TextFieldProps = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
    /** Small caps over the field. */
    label?: string;
    /** Quiet text under it: a limit, a rule, an error. */
    note?: string;
    /** Inside the well, before the text, e.g. a coin icon. */
    leading?: ReactNode;
    /** Inside the well, after the text, e.g. a show-password toggle. */
    trailing?: ReactNode;
    /** Digits that line up as they change (amounts, prices). */
    numeric?: boolean;
    /** `reward`: the text in coin gold, for an amount of coins. */
    tone?: "default" | "reward";
    /** For the field as a whole, e.g. `flex: 1` in a row beside a button. */
    containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A text input, inked like the rest: a sunk well with a thick outline. Takes
 * every `TextInput` prop, so it drops in wherever one was.
 */
const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
    { label, note, leading, trailing, numeric = false, tone = "default", multiline, containerStyle, ...input },
    ref,
) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={[styles.field, containerStyle]}>
            {label && <SectionTitle>{label}</SectionTitle>}
            <View style={[styles.well, multiline && styles.wellMultiline]}>
                {leading}
                <TextInput
                    ref={ref}
                    multiline={multiline}
                    placeholderTextColor={palette.textMuted}
                    style={[styles.input, multiline && styles.multiline, numeric && styles.numeric, tone === "reward" && styles.reward]}
                    {...input}
                />
                {trailing}
            </View>
            {note && <Hint>{note}</Hint>}
        </View>
    );
});

export default TextField;

const useStyles = createStyles((p) => ({
    field: {
        gap: 6,
    },
    well: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 2.5,
        borderColor: p.outline,
        backgroundColor: p.background,
    },
    wellMultiline: {
        alignItems: "flex-start",
    },
    input: {
        flex: 1,
        paddingVertical: 11,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 15,
    },
    multiline: {
        minHeight: 96,
        textAlignVertical: "top",
    },
    numeric: {
        fontSize: 16,
        fontVariant: ["tabular-nums"],
    },
    reward: {
        color: p.reward,
        fontFamily: FONTS.bodyHeavy,
    },
}));
