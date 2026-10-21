import { Pressable, Text } from "react-native";
import Badge from "@/components/Badge/Badge";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";

type MenuTileProps = {
    label: string;
    icon: GameIconName;
    onPress: () => void;
    /** A count of what's waiting behind the tile; nothing shows at 0. */
    badge?: number;
};

/**
 * One square tile in a menu grid — settings, the character screen, the
 * world screen's Actions sheet.
 *
 * Square via `aspectRatio` rather than a fixed size, so the grid's column count
 * alone decides how big tiles are on any screen width.
 */
export default function MenuTile({ label, icon, onPress, badge = 0 }: MenuTileProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Icon name={icon} size={32} color={palette.ember} />
            <Text style={styles.label} numberOfLines={1}>
                {label}
            </Text>
            <Badge count={badge} />
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    tile: {
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 18,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    tilePressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
    label: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 12,
    },
}));
