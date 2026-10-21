import { TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import Icon from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type SearchFieldProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** For the box, e.g. a margin to line up with a grid. */
    style?: StyleProp<ViewStyle>;
};

/** The search box at the top of a list: a magnifying glass and a text input. */
export default function SearchField({ value, onChange, placeholder, style }: SearchFieldProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={[styles.search, style]}>
            <Icon name="magnifying-glass" size={16} color={palette.textMuted} />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
            />
        </View>
    );
}

const useStyles = createStyles((p) => ({
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: p.background,
        borderWidth: 2.5,
        borderColor: p.outline,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 14,
    },
}));
