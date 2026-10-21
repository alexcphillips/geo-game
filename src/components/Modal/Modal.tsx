import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    Animated,
    Modal as NativeModal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToastHost from "@/components/Toast/ToastHost";
import { BOTTOM_ACTION_DIAMETER } from "@/theme/layout";
import { FONTS, INK } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";

/**
 * How much vertical room the panel may take.
 *
 * Fractions of the *available* height (screen minus safe areas) rather than
 * fixed pixel heights, so the same size reads consistently from an SE to a Pro
 * Max. `large` deliberately stops short of the full screen: the gap is what
 * tells the player this is a layer over the world rather than a new place. If
 * something genuinely wants the whole screen, it should be a route, not a modal
 * — see the note in the component doc.
 */
const SIZE_FRACTION = {
    small: 0.34,
    medium: 0.58,
    large: 0.85,
} as const;

/**
 * `fill` takes all the available height, leaving only this gap on every edge.
 * Its height is fixed rather than a maximum, so a short page doesn't shrink
 * the panel as you move between pages.
 */
const FILL_EDGE_GAP = 12;

export type ModalSize = keyof typeof SIZE_FRACTION | "fill";

export type ModalProps = {
    /**
     * Called once the modal has finished animating out. Render the modal
     * conditionally and let unmounting reset whatever state its content holds.
     */
    onClose: () => void;
    children: ReactNode;
    /** Renders a header with the title and a close button. */
    title?: string;
    size?: ModalSize;
    /**
     * Shows a back button at the top left. Calls `onBack` when given, and
     * otherwise closes the modal, so the first page of a multi-page modal can
     * use it too. Android's hardware back follows the same rule.
     */
    showBack?: boolean;
    onBack?: () => void;
    /**
     * Where the close button sits: an ✕ in the header, or a round button
     * centred at the bottom of the panel.
     */
    closePlacement?: "header" | "footer";
    /**
     * A small control at the header's right edge, e.g. an info button. Only
     * shown with `closePlacement="footer"`, since otherwise the ✕ sits there.
     */
    headerAccessory?: ReactNode;
    /**
     * Set false to force a deliberate choice — a boss confirmation shouldn't be
     * dismissible by a stray tap on the backdrop.
     */
    dismissOnBackdropPress?: boolean;
};

const ENTER_DURATION = 190;
const EXIT_DURATION = 150;

/**
 * The modal shell. Owns *being a modal*; knows nothing about what it contains.
 *
 * Everything it is responsible for: the backdrop, the panel, entry and exit
 * animation, the Android hardware back button, safe-area padding, sizing, and
 * marking itself as a modal to assistive technology. Content is just
 * `children` — a boss preview, an inventory grid, a confirmation, anything.
 *
 * ## Usage
 *
 * Render it conditionally rather than passing a visibility flag:
 *
 * ```tsx
 * {isInventoryOpen && (
 *     <Modal title="Inventory" size="large" onClose={closeInventory}>
 *         <InventoryContents />
 *     </Modal>
 * )}
 * ```
 *
 * Unmounting is what resets the content's state, so a modal can't reopen
 * half-filled. A `visible` prop would keep the content mounted and make stale
 * state the default — the same trap that cost us in cozy-app's drawers.
 *
 * The exit animation still works despite unmount-to-close: a close request
 * animates out *first*, then calls `onClose`. The parent only unmounts after
 * the animation it never had to know about.
 *
 * ## Not for full-screen
 *
 * `fill` is as big as this goes. Something occupying the whole screen is a
 * *place*, not an overlay: it wants its own URL, a real back button, and
 * navigation history. That is an Expo Router screen in `src/app/`, not this.
 */
export default function Modal({
    onClose,
    children,
    title,
    size = "medium",
    showBack = false,
    onBack,
    closePlacement = "header",
    headerAccessory,
    dismissOnBackdropPress = true,
}: ModalProps) {
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    // `useState` with an initialiser rather than `useRef(new Animated.Value())`:
    // both give a stable value, but reading `ref.current` during render is a
    // lint error under React's current rules.
    const [progress] = useState(() => new Animated.Value(0));
    /** Guards against a double-tap firing two exit animations. */
    const isClosing = useRef(false);

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: ENTER_DURATION,
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const requestClose = useCallback(() => {
        if (isClosing.current) return;
        isClosing.current = true;

        Animated.timing(progress, {
            toValue: 0,
            duration: EXIT_DURATION,
            useNativeDriver: true,
        }).start(() => onClose());
    }, [onClose, progress]);

    const goBack = onBack ?? requestClose;

    const availableHeight = windowHeight - insets.top - insets.bottom;
    const panelHeight =
        size === "fill"
            ? { height: availableHeight - FILL_EDGE_GAP * 2 }
            : { maxHeight: availableHeight * SIZE_FRACTION[size] };
    const hasHeader = title !== undefined || showBack;

    return (
        <NativeModal
            visible
            transparent
            // Animation is ours, so the native presentation does none of its own.
            animationType="none"
            // Android's hardware back button routes here. Without this the
            // modal would be undismissable by the system gesture.
            onRequestClose={showBack ? goBack : requestClose}
            statusBarTranslucent
        >
            <View style={styles.root}>
                <Animated.View
                    style={[styles.backdrop, { opacity: progress }]}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={dismissOnBackdropPress ? requestClose : undefined}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                    />
                </Animated.View>

                <Animated.View
                    // Tells iOS VoiceOver that content behind this is
                    // unreachable, which is what makes it a modal rather than
                    // just a panel that happens to be on top.
                    accessibilityViewIsModal
                    style={[
                        styles.panel,
                        {
                            ...panelHeight,
                            marginBottom: insets.bottom + FILL_EDGE_GAP,
                            opacity: progress,
                            transform: [
                                {
                                    translateY: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [24, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {hasHeader && (
                        <View
                            style={[
                                styles.header,
                                showBack && styles.headerWithBack,
                            ]}
                        >
                            {/* With a back button, the title is part of it: the
                                whole "‹ Title" pill is one target, which is a
                                far easier tap than the chevron alone. */}
                            {showBack ? (
                                <Pressable
                                    onPress={goBack}
                                    style={({ pressed }) => [
                                        styles.backButton,
                                        pressed && styles.headerButtonPressed,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel="Back"
                                    hitSlop={10}
                                >
                                    <Text style={styles.backIcon}>‹</Text>
                                    <Text
                                        style={styles.backTitle}
                                        numberOfLines={1}
                                    >
                                        {title}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text style={styles.title} numberOfLines={1}>
                                    {title}
                                </Text>
                            )}

                            {closePlacement === "footer" && headerAccessory}

                            {closePlacement === "header" && (
                                <Pressable
                                    onPress={requestClose}
                                    style={({ pressed }) => [
                                        styles.headerButton,
                                        pressed && styles.headerButtonPressed,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close"
                                    // Generous touch target without a large visual one.
                                    hitSlop={10}
                                >
                                    <Text style={styles.closeIcon}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    <View style={[styles.content, size === "fill" && styles.contentFill]}>
                        {children}
                    </View>

                    {closePlacement === "footer" && (
                        <View style={styles.footer}>
                            <Pressable
                                onPress={requestClose}
                                style={({ pressed }) => [
                                    styles.footerClose,
                                    pressed && styles.footerClosePressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                            >
                                <Text style={styles.footerCloseIcon}>✕</Text>
                            </Pressable>
                        </View>
                    )}
                </Animated.View>

                {/* A native modal draws over the root layout's toasts. */}
                <ToastHost />
            </View>
        </NativeModal>
    );
}

const useStyles = createStyles((p) => ({
    root: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "stretch",
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(11, 10, 16, 0.45)",
    },
    panel: {
        marginHorizontal: 12,
        backgroundColor: p.surface,
        borderRadius: 24,
        ...inked(p, INK.liftLarge),
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 18,
        paddingRight: 10,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: p.surfaceAlt,
    },
    headerWithBack: {
        paddingLeft: 6,
    },
    title: {
        flex: 1,
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 20,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        // Shrinks rather than pushing the close button off a narrow header.
        flexShrink: 1,
        gap: 6,
        height: 36,
        paddingLeft: 8,
        paddingRight: 12,
        borderRadius: 18,
    },
    backTitle: {
        flexShrink: 1,
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 20,
    },
    headerButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        backgroundColor: p.surfaceAlt,
    },
    headerButtonPressed: {
        backgroundColor: p.track,
    },
    backIcon: {
        color: p.text,
        fontSize: 30,
        lineHeight: 32,
        // The chevron sits high and left in its glyph box.
        marginTop: -3,
        marginLeft: -2,
    },
    closeIcon: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 16,
    },
    // Sized panels hug their content (shrinking to the max height); `flex: 1`
    // there would collapse it to nothing, since the panel has no set height.
    content: {
        flexShrink: 1,
        padding: 18,
    },
    contentFill: {
        flex: 1,
    },
    // Same look as the character screen's bottom-centre close, so "close"
    // reads the same wherever the player meets it.
    footer: {
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: 16,
    },
    footerClose: {
        width: BOTTOM_ACTION_DIAMETER,
        height: BOTTOM_ACTION_DIAMETER,
        borderRadius: BOTTOM_ACTION_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    footerClosePressed: {
        transform: [{ scale: 0.94 }],
        backgroundColor: p.track,
    },
    footerCloseIcon: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 18,
        lineHeight: 20,
    },
}));
