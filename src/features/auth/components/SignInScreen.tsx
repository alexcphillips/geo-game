import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon/Icon";
import { usePlayerStore } from "@/features/player/playerStore";
import { toErrorMessage } from "@/lib/api";
import { colors } from "@/theme/colors";

type Mode = "signIn" | "register";

/**
 * Sign in, or make an account. Shown instead of the whole app until signed in.
 */
export default function SignInScreen() {
    const insets = useSafeAreaInsets();
    const signIn = usePlayerStore((state) => state.signIn);
    const register = usePlayerStore((state) => state.register);
    const [mode, setMode] = useState<Mode>("signIn");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const isRegister = mode === "register";
    const canSubmit = !isBusy && email.trim() !== "" && password !== "" && (!isRegister || username.trim() !== "");

    const submit = async () => {
        if (!canSubmit) return;
        setIsBusy(true);
        setError(null);
        try {
            if (isRegister) await register(username.trim(), email.trim(), password);
            else await signIn(email.trim(), password);
        } catch (failure) {
            setError(toErrorMessage(failure));
            setIsBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>{isRegister ? "Make an account" : "Sign in"}</Text>

                {isRegister && (
                    <Field
                        label="Username"
                        value={username}
                        onChangeText={setUsername}
                        autoComplete="username"
                        textContentType="username"
                    />
                )}
                <Field
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                />
                <PasswordField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    textContentType={isRegister ? "newPassword" : "password"}
                    onSubmitEditing={() => void submit()}
                />

                {error && (
                    <Text style={styles.error} accessibilityLiveRegion="polite">
                        {error}
                    </Text>
                )}

                <Pressable
                    onPress={() => void submit()}
                    disabled={!canSubmit}
                    style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    {isBusy ? (
                        <ActivityIndicator color={colors.textOnEmber} />
                    ) : (
                        <Text style={styles.buttonText}>{isRegister ? "Make account" : "Sign in"}</Text>
                    )}
                </Pressable>

                <Pressable
                    onPress={() => {
                        setMode(isRegister ? "signIn" : "register");
                        setError(null);
                    }}
                    style={styles.switch}
                    accessibilityRole="button"
                    hitSlop={8}
                >
                    <Text style={styles.switchText}>
                        {isRegister ? "Have an account? Sign in" : "New here? Make an account"}
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Field({ label, ...input }: { label: string } & React.ComponentProps<typeof TextInput>) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...input}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                accessibilityLabel={label}
            />
        </View>
    );
}

/** A Field with an eye toggle, to check what was typed before submitting. */
function PasswordField({ label, ...input }: { label: string } & React.ComponentProps<typeof TextInput>) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.passwordRow}>
                <TextInput
                    {...input}
                    secureTextEntry={!isVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, styles.passwordInput]}
                    accessibilityLabel={label}
                />
                <Pressable
                    onPress={() => setIsVisible((visible) => !visible)}
                    style={styles.eye}
                    accessibilityRole="button"
                    accessibilityLabel={isVisible ? "Hide password" : "Show password"}
                    hitSlop={8}
                >
                    <Icon name={isVisible ? "semi-closed-eye" : "eyeball"} size={22} color={colors.textSecondary} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.void,
    },
    content: {
        paddingHorizontal: 24,
        gap: 16,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    field: {
        gap: 6,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    input: {
        color: colors.textPrimary,
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    passwordRow: {
        justifyContent: "center",
    },
    passwordInput: {
        paddingRight: 48,
    },
    eye: {
        position: "absolute",
        right: 12,
    },
    error: {
        color: colors.toastError,
        fontSize: 14,
    },
    button: {
        marginTop: 8,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.textOnEmber,
        fontSize: 16,
        fontWeight: "700",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    switch: {
        alignSelf: "center",
        paddingVertical: 8,
    },
    switchText: {
        color: colors.emberBright,
        fontSize: 14,
    },
});
