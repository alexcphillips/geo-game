import { useEffect, useState } from "react";
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { STATUS_BAR_CLEARANCE } from "@/theme/layout";
import { TOAST_LEAVE_MS, useToastStore, type Toast, type ToastKind } from "./toastStore";

/** Share of the screen width a toast takes. */
const TOAST_WIDTH = 0.7;
/** How far right a toast is dragged before letting go dismisses it. */
const SWIPE_DISMISS_DISTANCE = 60;
const ENTER_MS = 220;

const STRIPE: Record<ToastKind, string> = {
    error: colors.toastError,
    success: colors.toastSuccess,
    info: colors.toastInfo,
};

/**
 * Where toasts appear: the top right, newest on top.
 *
 * Mounted once in the root layout and once inside every Modal, because a
 * native modal draws over everything in the app, toasts included. Toasts live
 * in one store, so each host shows the same ones and only the topmost is seen.
 */
export default function ToastHost() {
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
                <View style={[styles.stripe, { backgroundColor: STRIPE[toast.kind] }]} />
                <Text style={styles.message}>{toast.message}</Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
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
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    pressed: {
        opacity: 0.85,
    },
    stripe: {
        width: 4,
    },
    message: {
        flex: 1,
        paddingVertical: 11,
        paddingHorizontal: 12,
        color: colors.textPrimary,
        fontSize: 14,
        lineHeight: 19,
    },
});
