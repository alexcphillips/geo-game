import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/components/Badge/Badge";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import {
    STATUS_BAR_CLEARANCE,
    TOP_BUTTON_DIAMETER,
    TOP_BUTTON_EDGE_INSET,
    TOP_BUTTON_GAP,
} from "@/theme/layout";
import { createStyles, inked, useTheme } from "@/theme/theme";

type TopCornerButtonProps = {
    icon: GameIconName;
    /** 0 is the corner (settings); each next one sits to its left. */
    slot: number;
    /** The badge's count; nothing shows at 0. */
    badge?: number;
    accessibilityLabel: string;
    onPress: () => void;
};

/**
 * A round button in the top-right row: settings in the corner, then
 * friends, then the inbox, leftwards. A badge counts what's waiting.
 */
export default function TopCornerButton({ icon, slot, badge = 0, accessibilityLabel, onPress }: TopCornerButtonProps) {
    const styles = useStyles();
    const palette = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                {
                    top: insets.top + STATUS_BAR_CLEARANCE,
                    right: TOP_BUTTON_EDGE_INSET + slot * (TOP_BUTTON_DIAMETER + TOP_BUTTON_GAP),
                },
                pressed && styles.pressed,
            ]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={6}
        >
            <Icon name={icon} size={22} color={palette.text} />
            <Badge count={badge} />
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    button: {
        position: "absolute",
        width: TOP_BUTTON_DIAMETER,
        height: TOP_BUTTON_DIAMETER,
        borderRadius: TOP_BUTTON_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surface,
        ...inked(p),
    },
    pressed: {
        transform: [{ translateY: 2 }],
        boxShadow: `0px 1px 0px ${p.outline}`,
    },
}));
