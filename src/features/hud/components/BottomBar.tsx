import { useEffect, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/components/Badge/Badge";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import MenuTile from "@/components/MenuTile/MenuTile";
import CharacterPortraitButton from "@/features/character/components/CharacterPortraitButton";
import { ACTION_GROUPS, ACTIONS, type ActionBindings } from "@/features/hud/actions";
import {
    ABOVE_BAR_GAP,
    ACTIONS_BUTTON_DIAMETER,
    BOTTOM_BAR_HEIGHT,
} from "@/theme/layout";
import { FONTS } from "@/theme/palette";
import { createStyles, inked, useMood, useTheme } from "@/theme/theme";

export type BarSlotId = "character" | "inventory" | "skills" | "deck";

type BottomBarProps = {
    onOpenCharacter: () => void;
    onOpenInventory: () => void;
    onOpenSkills: () => void;
    onOpenDeck: () => void;
    /** Each slot's badge count; a missing one shows nothing. */
    badges?: Partial<Record<BarSlotId, number>>;
    /** What each entry in the Actions sheet does, keyed by its registry id. */
    actions: ActionBindings;
};

/** How far the Actions button rises above the bar's top edge. */
const ACTIONS_RAISE = 14;

/** Tiles per row in the Actions sheet. */
const SHEET_COLUMNS = 4;
const SHEET_GAP = 8;

/** Portrait size in the bar: the other slots' icons are drawn about this big. */
const PORTRAIT_SIZE = 42;

/**
 * The bar's height on screen, safe-area inset included: what the map and
 * anything floating above the bar keep clear of. The raised Actions button
 * pokes above this, on purpose.
 */
export function useBottomBarHeight(): number {
    return BOTTOM_BAR_HEIGHT + useSafeAreaInsets().bottom;
}

/**
 * The world screen's bottom bar: Character · Inventory · Actions · Skills ·
 * Deck, icons only, each able to carry a badge.
 *
 * Actions, in the centre and raised, opens a sheet above the bar with
 * everything else, grouped, rendered from the registry in `actions.ts`. Its
 * badge adds up the badges inside. Tapping outside the sheet, or Actions
 * again, closes it.
 *
 * A HUD over the map rather than navigator tabs: every slot opens a modal and
 * the map's WebView stays mounted underneath. The dark strip lets taps through
 * to the map everywhere except on the buttons (`box-none`). The container is
 * as tall as the raised button, so on Android its top isn't outside its
 * parent's bounds, where taps wouldn't reach it.
 */
export default function BottomBar({
    onOpenCharacter,
    onOpenInventory,
    onOpenSkills,
    onOpenDeck,
    badges = {},
    actions,
}: BottomBarProps) {
    const styles = useStyles();
    const palette = useTheme();
    const mood = useMood();
    const insets = useSafeAreaInsets();
    const barHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
    const { height: screenHeight } = useWindowDimensions();
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [progress] = useState(() => new Animated.Value(0));

    useEffect(() => {
        Animated.timing(progress, {
            toValue: isActionsOpen ? 1 : 0,
            duration: isActionsOpen ? 160 : 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [isActionsOpen, progress]);

    const visibleActions = ACTIONS.filter((action) => actions[action.id].isVisible !== false);
    const actionsBadge = visibleActions.reduce((sum, action) => sum + (actions[action.id].badge ?? 0), 0);

    const choose = (onPress: () => void) => {
        setIsActionsOpen(false);
        onPress();
    };

    return (
        <>
            {/* Catches the tap that closes the sheet, so it doesn't also land
                on the map. */}
            {isActionsOpen && (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setIsActionsOpen(false)}
                    accessibilityLabel="Close actions"
                />
            )}

            <Animated.View
                style={[
                    styles.sheet,
                    {
                        bottom: barHeight + ACTIONS_RAISE + ABOVE_BAR_GAP,
                        maxHeight: screenHeight * 0.6,
                        opacity: progress,
                        transform: [
                            {
                                translateY: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [12, 0],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents={isActionsOpen ? "auto" : "none"}
                accessibilityElementsHidden={!isActionsOpen}
                importantForAccessibility={isActionsOpen ? "auto" : "no-hide-descendants"}
            >
                <ScrollView contentContainerStyle={styles.sheetContent}>
                    {ACTION_GROUPS.map((group) => {
                        const inGroup = visibleActions.filter((action) => action.group === group.id);
                        if (inGroup.length === 0) return null;
                        return (
                            <View key={group.id}>
                                <Text style={styles.groupLabel}>{group.label}</Text>
                                <View style={styles.grid}>
                                    {inGroup.map((action) => (
                                        <View key={action.id} style={styles.cell}>
                                            <MenuTile
                                                label={action.label}
                                                icon={action.icon}
                                                badge={actions[action.id].badge}
                                                onPress={() => choose(actions[action.id].onPress)}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </Animated.View>

            <View
                style={[styles.bar, { height: barHeight + ACTIONS_RAISE }]}
                pointerEvents="box-none"
            >
                <View style={[styles.strip, { height: barHeight }]} pointerEvents="none" />

                <View style={[styles.slots, { height: BOTTOM_BAR_HEIGHT, marginBottom: insets.bottom }]} pointerEvents="box-none">
                    <View style={styles.slot} pointerEvents="box-none">
                        <CharacterPortraitButton
                            size={PORTRAIT_SIZE}
                            badge={badges.character}
                            onPress={onOpenCharacter}
                        />
                    </View>
                    <BarSlot icon="knapsack" label="Inventory" badge={badges.inventory} onPress={onOpenInventory} />

                    <View style={[styles.slot, styles.actionsSlot]} pointerEvents="box-none">
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionsButton,
                                isActionsOpen && styles.actionsButtonOpen,
                                pressed && styles.pressed,
                            ]}
                            onPress={() => setIsActionsOpen((open) => !open)}
                            accessibilityRole="button"
                            accessibilityLabel={isActionsOpen ? "Close actions" : "Open actions"}
                            accessibilityState={{ expanded: isActionsOpen }}
                        >
                            {isActionsOpen ? (
                                <Text style={styles.closeIcon}>✕</Text>
                            ) : (
                                <Icon name="magic-swirl" size={28} color={mood === "day" ? "#FFFFFF" : palette.onPrimary} />
                            )}
                            <Badge count={isActionsOpen ? 0 : actionsBadge} />
                        </Pressable>
                    </View>

                    <BarSlot icon="histogram" label="Skills" badge={badges.skills} onPress={onOpenSkills} />
                    <BarSlot icon="card-pick" label="Deck" badge={badges.deck} onPress={onOpenDeck} />
                </View>
            </View>
        </>
    );
}

type BarSlotProps = {
    icon: GameIconName;
    /** For screen readers only: the bar is icons only. */
    label: string;
    badge?: number;
    onPress: () => void;
};

function BarSlot({ icon, label, badge = 0, onPress }: BarSlotProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={styles.slot} pointerEvents="box-none">
            <Pressable
                style={({ pressed }) => [styles.slotButton, pressed && styles.pressed]}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={badge > 0 ? `Open ${label.toLowerCase()}, ${badge} new` : `Open ${label.toLowerCase()}`}
                hitSlop={6}
            >
                <Icon name={icon} size={26} color={palette.text} />
                <Badge count={badge} />
            </Pressable>
        </View>
    );
}

/** The Actions button is the bar's one bright thing: ember by day, lantern at dusk. */
const useStyles = createStyles((p, mood) => ({
    bar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-end",
    },
    strip: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: p.surface,
        borderTopWidth: 3,
        borderTopColor: p.outline,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    slots: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    // Equal widths, so Actions stays centred on the screen.
    slot: {
        flex: 1,
        alignItems: "center",
    },
    // Pinned to the top of the row, so the raise is exact whatever the sizes.
    actionsSlot: {
        alignSelf: "stretch",
    },
    slotButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
    },
    pressed: {
        transform: [{ scale: 0.94 }],
        backgroundColor: p.surfaceAlt,
    },
    actionsButton: {
        width: ACTIONS_BUTTON_DIAMETER,
        height: ACTIONS_BUTTON_DIAMETER,
        borderRadius: ACTIONS_BUTTON_DIAMETER / 2,
        // Up by the raise, so it straddles the strip's top edge.
        marginTop: -ACTIONS_RAISE,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: mood === "day" ? p.ember : p.primary,
        ...inked(p, 4),
        borderWidth: 3,
    },
    actionsButtonOpen: {
        backgroundColor: p.surfaceAlt,
    },
    closeIcon: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 18,
        lineHeight: 20,
    },
    sheet: {
        position: "absolute",
        left: 12,
        right: 12,
        borderRadius: 22,
        backgroundColor: p.surface,
        ...inked(p, 4),
    },
    sheetContent: {
        padding: 12,
        gap: 12,
    },
    groupLabel: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    // Negative margin cancels the cells' outer padding, so tiles line up with
    // the group label.
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -SHEET_GAP / 2,
    },
    cell: {
        width: `${100 / SHEET_COLUMNS}%`,
        padding: SHEET_GAP / 2,
    },
}));
