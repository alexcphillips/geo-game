import { useEffect, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon/Icon";
import CharacterPortraitButton from "@/features/character/components/CharacterPortraitButton";
import { colors } from "@/theme/colors";
import {
    BOTTOM_ACTION_DIAMETER,
    HOME_INDICATOR_CLEARANCE,
} from "@/theme/layout";

type ActionBarProps = {
    onOpenCharacter: () => void;
    onOpenInventory: () => void;
    onOpenCrafting: () => void;
    onOpenVendors: () => void;
    onOpenMarket: () => void;
    onOpenCommunityCenter: () => void;
    onOpenDeck: () => void;
};

/** Gap between the hub button and the menu that rises above it. */
const MENU_GAP = 12;

/**
 * Bottom action bar: character portrait on the left, the actions hub centred,
 * the deck on the right.
 *
 * Three zones rather than `space-between`, so the hub stays centred on the
 * *screen* regardless of what the side zones contain.
 *
 * The hub is a round button that opens a small menu above it — Inventory,
 * Crafting, Vendors, Market and Community Center — with room for more actions without
 * crowding the HUD. Tapping anywhere else, or the hub again, closes it. The menu is a child of the full-width bar
 * rather than of the button, since Android won't deliver taps to a child drawn
 * outside its parent's bounds.
 *
 * `pointerEvents="box-none"` on the container so taps pass through to the map
 * everywhere except on the controls themselves — the bar spans the full width
 * but must not swallow interaction with the world behind it.
 */
export default function ActionBar({
    onOpenCharacter,
    onOpenInventory,
    onOpenCrafting,
    onOpenVendors,
    onOpenMarket,
    onOpenCommunityCenter,
    onOpenDeck,
}: ActionBarProps) {
    const insets = useSafeAreaInsets();
    const bottomInset = insets.bottom + HOME_INDICATOR_CLEARANCE;
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [progress] = useState(() => new Animated.Value(0));

    useEffect(() => {
        Animated.timing(progress, {
            toValue: isHubOpen ? 1 : 0,
            duration: isHubOpen ? 160 : 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [isHubOpen, progress]);

    const choose = (action: () => void) => {
        setIsHubOpen(false);
        action();
    };

    return (
        <>
            {/* Catches the tap that closes the menu, so it doesn't also land
                on the map. */}
            {isHubOpen && (
                <Pressable
                    style={styles.dismissLayer}
                    onPress={() => setIsHubOpen(false)}
                    accessibilityLabel="Close actions"
                />
            )}

            <View
                style={[styles.bar, { paddingBottom: bottomInset }]}
                pointerEvents="box-none"
            >
                <View style={[styles.side, styles.sideStart]}>
                    <CharacterPortraitButton onPress={onOpenCharacter} />
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.hubButton,
                        isHubOpen && styles.hubButtonOpen,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setIsHubOpen((open) => !open)}
                    accessibilityRole="button"
                    accessibilityLabel={
                        isHubOpen ? "Close actions" : "Open actions"
                    }
                    accessibilityState={{ expanded: isHubOpen }}
                >
                    {isHubOpen ? (
                        <Text style={styles.closeIcon}>✕</Text>
                    ) : (
                        <Icon
                            name="magic-swirl"
                            size={26}
                            color={colors.emberBright}
                        />
                    )}
                </Pressable>

                <View style={[styles.side, styles.sideEnd]}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.deckButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={onOpenDeck}
                        accessibilityRole="button"
                        accessibilityLabel="Open deck"
                    >
                        <Icon
                            name="card-pick"
                            size={24}
                            color={colors.emberBright}
                        />
                    </Pressable>
                </View>

                <Animated.View
                    style={[
                        styles.menu,
                        {
                            bottom:
                                bottomInset + BOTTOM_ACTION_DIAMETER + MENU_GAP,
                            opacity: progress,
                            transform: [
                                {
                                    translateY: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                                {
                                    scale: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents={isHubOpen ? "box-none" : "none"}
                    accessibilityElementsHidden={!isHubOpen}
                    importantForAccessibility={
                        isHubOpen ? "auto" : "no-hide-descendants"
                    }
                >
                    <View style={styles.menuPanel}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => choose(onOpenInventory)}
                            accessibilityRole="button"
                            accessibilityLabel="Open inventory"
                        >
                            <Text style={styles.buttonText}>Inventory</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => choose(onOpenCrafting)}
                            accessibilityRole="button"
                            accessibilityLabel="Open crafting"
                        >
                            <Text style={styles.buttonText}>Crafting</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => choose(onOpenVendors)}
                            accessibilityRole="button"
                            accessibilityLabel="Open vendors"
                        >
                            <Text style={styles.buttonText}>Vendors</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => choose(onOpenMarket)}
                            accessibilityRole="button"
                            accessibilityLabel="Open market"
                        >
                            <Text style={styles.buttonText}>Market</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => choose(onOpenCommunityCenter)}
                            accessibilityRole="button"
                            accessibilityLabel="Open community center"
                        >
                            <Text style={styles.buttonText}>Community Center</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    dismissLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    side: {
        flex: 1,
    },
    sideStart: {
        alignItems: "flex-start",
    },
    sideEnd: {
        alignItems: "flex-end",
    },
    button: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    buttonPressed: {
        transform: [{ scale: 0.96 }],
        backgroundColor: "rgba(201, 100, 30, 0.25)",
    },
    hubButton: {
        width: BOTTOM_ACTION_DIAMETER,
        height: BOTTOM_ACTION_DIAMETER,
        borderRadius: BOTTOM_ACTION_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    hubButtonOpen: {
        backgroundColor: "rgba(201, 100, 30, 0.25)",
    },
    closeIcon: {
        color: colors.emberBright,
        fontSize: 18,
        lineHeight: 20,
    },
    menu: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
    },
    menuPanel: {
        padding: 10,
        gap: 8,
        borderRadius: 16,
        backgroundColor: "rgba(11, 9, 8, 0.88)",
        borderWidth: 1,
        borderColor: colors.border,
    },
    deckButton: {
        width: BOTTOM_ACTION_DIAMETER,
        height: BOTTOM_ACTION_DIAMETER,
        borderRadius: BOTTOM_ACTION_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(20, 16, 15, 0.92)",
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    // Centred text on a stretched pill, so stacked menu buttons share a width.
    buttonText: {
        textAlign: "center",
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
});
