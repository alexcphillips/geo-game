import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ToastHost from "@/components/Toast/ToastHost";
import SignInScreen from "@/features/auth/components/SignInScreen";
import { usePresenceHeartbeat } from "@/features/friends/usePresenceHeartbeat";
import { configureNotifications } from "@/features/notifications/notifications";
import { usePlayerStore } from "@/features/player/playerStore";
import { colors } from "@/theme/colors";
import { TRANSITION_DURATION_MS } from "@/theme/layout";

/**
 * Root layout. Every screen in `src/app/` renders inside this.
 *
 * Headers are off globally: this is a full-bleed map game, and each screen
 * draws its own chrome over the top of the world.
 */
// Once, at startup, before any screen can schedule an alert.
configureNotifications();
// Signs in and fetches the player while the map finds a location. A failure
// leaves the world screen's banner up with a Retry.
void usePlayerStore.getState().load();

export default function RootLayout() {
    const isSignedOut = usePlayerStore((state) => state.status === "signedOut");
    // Online for friends from anywhere in the app, not just the world screen.
    usePresenceHeartbeat();

    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            {/* Nothing else is reachable until signed in. */}
            {isSignedOut ? (
                <SignInScreen />
            ) : (
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.void },
                        animation: "fade",
                        // The default is 500ms, which feels sluggish for screens
                        // you flick in and out of mid-walk. iOS only — the prop is
                        // ignored on Android, where `fade` uses the platform
                        // default, so the two will not feel identical.
                        animationDuration: TRANSITION_DURATION_MS,
                    }}
                />
            )}
            {/* Over every screen. Modals mount their own, since a native
                modal covers this one. */}
            <ToastHost />
        </SafeAreaProvider>
    );
}
