import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka/600SemiBold";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ToastHost from "@/components/Toast/ToastHost";
import SignInScreen from "@/features/auth/components/SignInScreen";
import { usePresenceHeartbeat } from "@/features/friends/usePresenceHeartbeat";
import { configureNotifications } from "@/features/notifications/notifications";
import { usePlayerStore } from "@/features/player/playerStore";
import { TRANSITION_DURATION_MS } from "@/theme/layout";
import { PALETTES } from "@/theme/palette";
import { MoodProvider } from "@/theme/theme";

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
    // The storybook fonts (see FONTS in theme/palette.ts). Only the weights in
    // use, imported one by one so the bundle doesn't carry every weight.
    const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });

    // A moment at startup; a failure falls back to the system font rather than
    // holding the game hostage.
    if (!fontsLoaded && !fontError) return null;

    return (
        <SafeAreaProvider>
            {/* Day unless a screen says otherwise: fights and dungeons are
                dusk, and the map follows the phone's light or dark mode. */}
            <MoodProvider mood="day">
                {/* Nothing else is reachable until signed in. */}
                {isSignedOut ? (
                    <SignInScreen />
                ) : (
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: PALETTES.day.background },
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
            </MoodProvider>
        </SafeAreaProvider>
    );
}
