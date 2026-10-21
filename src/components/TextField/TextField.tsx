import { forwardRef } from "react";
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type TextFieldProps = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
    /** Small caps over the field. */
    label?: string;
    /** Quiet text under it: a limit, a rule, an error. */
    note?: string;
    /** For the field as a whole, e.g. `flex: 1` in a row beside a button. */
    containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A text input, inked like the rest: a sunk well with a thick outline. Takes
 * every `TextInput` prop, so it drops in wherever one was.
 */
const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, note, multiline, containerStyle, ...input }, ref) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={[styles.field, containerStyle]}>
            {label && <SectionTitle>{label}</SectionTitle>}
            <TextInput
                ref={ref}
                multiline={multiline}
                placeholderTextColor={palette.textMuted}
                style={[styles.input, multiline && styles.multiline]}
                {...input}
            />
            {note && <Hint>{note}</Hint>}
        </View>
    );
});

export default TextField;

const useStyles = createStyles((p) => ({
    field: {
        gap: 6,
    },
    input: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: 2.5,
        borderColor: p.outline,
        backgroundColor: p.background,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 15,
    },
    multiline: {
        minHeight: 96,
        textAlignVertical: "top",
    },
}));
