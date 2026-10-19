import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/components/Badge/Badge";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { colors } from "@/theme/colors";
import {
    STATUS_BAR_CLEARANCE,
    TOP_BUTTON_DIAMETER,
    TOP_BUTTON_EDGE_INSET,
    TOP_BUTTON_GAP,
} from "@/theme/layout";

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
            <Icon name={icon} size={22} color={colors.emberBright} />
            <Badge count={badge} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        position: "absolute",
        width: TOP_BUTTON_DIAMETER,
        height: TOP_BUTTON_DIAMETER,
        borderRadius: TOP_BUTTON_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    pressed: {
        transform: [{ scale: 0.94 }],
        backgroundColor: "rgba(201, 100, 30, 0.25)",
    },
});
