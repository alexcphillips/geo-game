import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type BadgeProps = {
    /** What's waiting; nothing shows at 0. */
    count: number;
};

/**
 * The red count on a button's corner: unread mail, a skill that levelled, new
 * items. Sits at the top-right of its parent, so the parent needs no
 * `overflow: "hidden"`.
 */
export default function Badge({ count }: BadgeProps) {
    if (count <= 0) return null;

    return (
        <View style={styles.badge} pointerEvents="none">
            <Text style={styles.text}>{count > 9 ? "9+" : count}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.toastError,
        borderWidth: 1.5,
        borderColor: colors.void,
    },
    text: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
});
