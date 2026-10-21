import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type PillProps = {
    label: string;
    /** Text and icon colour; the pill's edge stays inked. Defaults to muted text. */
    color?: string;
    icon?: GameIconName;
    style?: StyleProp<ViewStyle>;
};

/**
 * A small inked tag: a status, a rarity, "Equipped", "2 ready". Never a
 * button — for something tappable, use a small `Button` or a `Chip`.
 */
export default function Pill({ label, color, icon, style }: PillProps) {
    const styles = useStyles();
    const palette = useTheme();
    const ink = color ?? palette.textMuted;
    return (
        <View style={[styles.pill, style]}>
            {icon && <Icon name={icon} size={11} color={ink} />}
            <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    label: {
        fontFamily: FONTS.bodyHeavy,
        fontSize: 11,
    },
}));
