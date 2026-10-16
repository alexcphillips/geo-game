import { Pressable, StyleSheet, Text } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";

type MenuTileProps = {
    label: string;
    icon: GameIconName;
    onPress: () => void;
};

/**
 * One square tile in a menu grid — settings, the character screen.
 *
 * Square via `aspectRatio` rather than a fixed size, so the grid's column count
 * alone decides how big tiles are on any screen width.
 */
export default function MenuTile({ label, icon, onPress }: MenuTileProps) {
    return (
        <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Icon name={icon} size={32} color={colors.emberBright} />
            <Text style={styles.label} numberOfLines={1}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tile: {
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tilePressed: {
        transform: [{ scale: 0.96 }],
        borderColor: colors.ember,
    },
    label: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
});
