import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import Button from "@/components/Button/Button";
import TextField from "@/components/TextField/TextField";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon/Icon";
import { usePlayerStore } from "@/features/player/playerStore";
import { toErrorMessage } from "@/lib/api";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type Mode = "signIn" | "register";

/**
 * Sign in, or make an account. Shown instead of the whole app until signed in.
 */
export default function SignInScreen() {
    const styles = useStyles();
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

                <Button
                    label={isRegister ? "Make account" : "Sign in"}
                    variant="primary"
                    size="large"
                    onPress={() => void submit()}
                    disabled={!canSubmit}
                    busy={isBusy}
                    stretch
                    style={styles.submit}
                />

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
    return <TextField {...input} label={label} autoCapitalize="none" autoCorrect={false} accessibilityLabel={label} />;
}

/** A Field with an eye toggle, to check what was typed before submitting. */
function PasswordField({ label, ...input }: { label: string } & React.ComponentProps<typeof TextInput>) {
    const styles = useStyles();
    const palette = useTheme();
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
                    placeholderTextColor={palette.textMuted}
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
                    <Icon name={isVisible ? "semi-closed-eye" : "eyeball"} size={22} color={palette.textMuted} />
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    screen: {
        flex: 1,
        backgroundColor: p.background,
    },
    content: {
        paddingHorizontal: 24,
        gap: 16,
    },
    title: {
        color: p.text,
        fontSize: 28,
        fontFamily: FONTS.bodyHeavy,
        marginBottom: 8,
    },
    field: {
        gap: 6,
    },
    label: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    // Matches TextField; the password field draws its own for the eye toggle.
    input: {
        color: p.text,
        fontFamily: FONTS.bodyBold,
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 2.5,
        borderColor: p.outline,
        backgroundColor: p.background,
    },
    submit: {
        marginTop: 8,
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
        color: p.danger,
        fontSize: 14,
    },
    switch: {
        alignSelf: "center",
        paddingVertical: 8,
    },
    switchText: {
        color: p.ember,
        fontSize: 14,
    },
}));
