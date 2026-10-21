import { useEffect, useState } from "react";
import {
    Animated,
    PanResponder,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STATUS_BAR_CLEARANCE } from "@/theme/layout";
import { FONTS, type Palette } from "@/theme/palette";
import { createStyles, inked, useTheme } from "@/theme/theme";
import { TOAST_LEAVE_MS, useToastStore, type Toast, type ToastKind } from "./toastStore";

/** Share of the screen width a toast takes. */
const TOAST_WIDTH = 0.7;
/** How far right a toast is dragged before letting go dismisses it. */
const SWIPE_DISMISS_DISTANCE = 60;
const ENTER_MS = 220;

/** A toast's stripe, by kind, from the mood's own colours. */
function stripeColor(kind: ToastKind, palette: Palette): string {
    if (kind === "error") return palette.danger;
    if (kind === "success") return palette.heal;
    return palette.info;
}

/**
 * Where toasts appear: the top right, newest on top.
 *
 * Mounted once in the root layout and once inside every Modal, because a
 * native modal draws over everything in the app, toasts included. Toasts live
 * in one store, so each host shows the same ones and only the topmost is seen.
 */
export default function ToastHost() {
    const styles = useStyles();
    const toasts = useToastStore((state) => state.toasts);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    if (toasts.length === 0) return null;

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.host,
                { top: insets.top + STATUS_BAR_CLEARANCE, width: width * TOAST_WIDTH },
            ]}
        >
            {[...toasts].reverse().map((toast) => (
                <ToastCard key={toast.id} toast={toast} offscreen={width * TOAST_WIDTH + 24} />
            ))}
        </View>
    );
}

/**
 * One toast. Slides in from the right edge and back out the same way. Tap it,
 * or swipe it right, to dismiss it early. The message wraps over as many lines
 * as it needs; nothing is cut off.
 */
function ToastCard({ toast, offscreen }: { toast: Toast; offscreen: number }) {
    const styles = useStyles();
    const palette = useTheme();
    const dismiss = useToastStore((state) => state.dismiss);
    const [progress] = useState(() => new Animated.Value(0));
    const [drag] = useState(() => new Animated.Value(0));

    useEffect(() => {
        Animated.timing(progress, {
            toValue: toast.leaving ? 0 : 1,
            duration: toast.leaving ? TOAST_LEAVE_MS : ENTER_MS,
            useNativeDriver: true,
        }).start();
    }, [progress, toast.leaving]);

    const [swipe] = useState(() =>
        PanResponder.create({
            // Only a mostly sideways drag; a tap still reaches the Pressable.
            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
            onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dx)),
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_DISMISS_DISTANCE || gesture.vx > 0.5) {
                    dismiss(toast.id);
                } else {
                    Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
                }
            },
            onPanResponderTerminate: () =>
                Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
        }),
    );

    const enterX = progress.interpolate({ inputRange: [0, 1], outputRange: [offscreen, 0] });

    return (
        <Animated.View
            {...swipe.panHandlers}
            style={{ opacity: progress, transform: [{ translateX: Animated.add(enterX, drag) }] }}
        >
            <Pressable
                onPress={() => dismiss(toast.id)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                accessibilityRole="alert"
                accessibilityLabel={toast.message}
                accessibilityHint="Tap to dismiss"
            >
                <View style={[styles.stripe, { backgroundColor: stripeColor(toast.kind, palette) }]} />
                <Text style={styles.message}>{toast.message}</Text>
            </Pressable>
        </Animated.View>
    );
}

const useStyles = createStyles((p) => ({
    host: {
        position: "absolute",
        right: 12,
        gap: 8,
        zIndex: 1000,
        elevation: 1000,
    },
    card: {
        flexDirection: "row",
        overflow: "hidden",
        borderRadius: 14,
        backgroundColor: p.surface,
        ...inked(p),
    },
    pressed: {
        opacity: 0.85,
    },
    stripe: {
        width: 6,
        borderRightWidth: 2,
        borderRightColor: p.outline,
    },
    message: {
        flex: 1,
        paddingVertical: 11,
        paddingHorizontal: 12,
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 14,
        lineHeight: 19,
    },
}));
