import { Image, Pressable, StyleSheet } from "react-native";
import Badge from "@/components/Badge/Badge";
import { colors } from "@/theme/colors";

type CharacterPortraitButtonProps = {
    onPress: () => void;
    /** Diameter; defaults to 56. */
    size?: number;
    /** A count of what's waiting on the character screen; nothing shows at 0. */
    badge?: number;
};

const DIAMETER = 56;

/**
 * The portrait in the bottom bar's first slot — the way into the character screen.
 *
 * The source art (170×128) is a head-and-shoulders bust, already framed the way
 * a portrait wants to be, so `cover` inside a circular clip is all it needs:
 * the image scales to fill the circle and the wider dimension is cropped
 * evenly. If the helm ends up off-centre on device, the fix is a small
 * horizontal offset here rather than re-cropping the file.
 */
export default function CharacterPortraitButton({
    onPress,
    size = DIAMETER,
    badge = 0,
}: CharacterPortraitButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Open character screen"
            hitSlop={6}
        >
            {({ pressed }) => (
                <>
                    {/* The clip is its own view so the badge can sit outside it. */}
                    <Image
                        source={require("../assets/knight_head_portrait.png")}
                        style={[
                            styles.portrait,
                            { width: size, height: size, borderRadius: size / 2 },
                            pressed && styles.portraitPressed,
                        ]}
                        resizeMode="cover"
                        accessible={false}
                    />
                    <Badge count={badge} />
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // The image's own border radius clips it to the circle, so the square
    // corners don't sit outside the ring.
    portrait: {
        borderWidth: 2,
        borderColor: colors.ember,
        backgroundColor: colors.surface,
    },
    portraitPressed: {
        transform: [{ scale: 0.94 }],
        borderColor: colors.emberBright,
    },
});
