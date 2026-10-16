import { Image, Pressable, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

type CharacterPortraitButtonProps = {
    onPress: () => void;
};

const DIAMETER = 56;

/**
 * The bottom-left portrait badge — the way into the character screen.
 *
 * The source art (170×128) is a head-and-shoulders bust, already framed the way
 * a portrait wants to be, so `cover` inside a circular clip is all it needs:
 * the image scales to fill the circle and the wider dimension is cropped
 * evenly. If the helm ends up off-centre on device, the fix is a small
 * horizontal offset here rather than re-cropping the file.
 */
export default function CharacterPortraitButton({
    onPress,
}: CharacterPortraitButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Open character screen"
            style={({ pressed }) => [
                styles.badge,
                pressed && styles.badgePressed,
            ]}
        >
            <Image
                source={require("../assets/knight_head_portrait.png")}
                style={styles.portrait}
                resizeMode="cover"
                accessible={false}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    badge: {
        width: DIAMETER,
        height: DIAMETER,
        borderRadius: DIAMETER / 2,
        borderWidth: 2,
        borderColor: colors.ember,
        backgroundColor: colors.surface,
        // Clips the image to the circle. Without this the square image corners
        // would sit outside the ring.
        overflow: "hidden",
    },
    badgePressed: {
        transform: [{ scale: 0.94 }],
        borderColor: colors.emberBright,
    },
    portrait: {
        width: "100%",
        height: "100%",
    },
});
