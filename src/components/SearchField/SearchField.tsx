import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import Icon from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

type SearchFieldProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** For the box, e.g. a margin to line up with a grid. */
    style?: StyleProp<ViewStyle>;
};

/** The search box at the top of a list: a magnifying glass and a text input. */
export default function SearchField({ value, onChange, placeholder, style }: SearchFieldProps) {
    return (
        <View style={[styles.search, style]}>
            <Icon name="magnifying-glass" size={16} color={colors.textSecondary} />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        color: colors.textPrimary,
        fontSize: 14,
    },
});
