import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import { formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import {
    GEO_FEEDBACK_BODY_MAX,
    GEO_FEEDBACK_TITLE_MAX,
    type GeoFeedbackKind,
    type GeoMyFeedback,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { FEEDBACK_KINDS, feedbackApi, feedbackKindInfo, feedbackStatusInfo } from "../feedback";

/**
 * Settings → Feedback: report a bug, suggest something, or anything else,
 * with a title and a description. The app's version and platform go with
 * it. Below, what the player has sent and where each stands; replies land
 * in their inbox.
 */
export default function FeedbackPage() {
    const [kind, setKind] = useState<GeoFeedbackKind>("bug");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState<GeoMyFeedback[] | null>(null);

    useEffect(() => {
        feedbackApi
            .mine()
            .then((response) => setSent(response.feedback))
            .catch(() => setSent([]));
    }, []);

    const canSend = title.trim().length > 0 && !isSending;

    const send = async () => {
        if (!canSend) return;
        setIsSending(true);
        try {
            const response = await feedbackApi.send(kind, title.trim(), body.trim());
            setSent(response.feedback);
            setTitle("");
            setBody("");
            showToast("Thanks! Your feedback was sent", "success");
        } catch (error) {
            // The draft stays, so nothing typed is lost.
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            // iOS: keeps the description above the keyboard.
            automaticallyAdjustKeyboardInsets
        >
            <Text style={styles.sectionTitle}>What is it?</Text>
            <View style={styles.kinds}>
                {FEEDBACK_KINDS.map((info) => {
                    const isSelected = info.id === kind;
                    return (
                        <Pressable
                            key={info.id}
                            onPress={() => setKind(info.id)}
                            style={({ pressed }) => [
                                styles.kind,
                                isSelected && { borderColor: info.color },
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={info.label}
                        >
                            <Icon name={info.icon} size={22} color={isSelected ? info.color : colors.textSecondary} />
                            <Text style={[styles.kindLabel, isSelected && styles.kindLabelSelected]}>{info.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={styles.sectionTitle}>Title</Text>
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={kind === "bug" ? "e.g. Map goes black after a fight" : "In a few words"}
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                maxLength={GEO_FEEDBACK_TITLE_MAX}
                returnKeyType="next"
            />

            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={
                    kind === "bug"
                        ? "What happened, what you expected, and how to make it happen again"
                        : "Tell us more"
                }
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.body]}
                multiline
                maxLength={GEO_FEEDBACK_BODY_MAX}
                textAlignVertical="top"
            />

            <Pressable
                onPress={() => void send()}
                disabled={!canSend}
                style={({ pressed }) => [styles.sendButton, !canSend && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ busy: isSending, disabled: !canSend }}
            >
                {isSending ? (
                    <ActivityIndicator color={colors.textOnEmber} />
                ) : (
                    <Icon name="share" size={18} color={colors.textOnEmber} />
                )}
                <Text style={styles.sendButtonText}>Send feedback</Text>
            </Pressable>
            <Text style={styles.hint}>Your app version and phone type are sent with it. Replies arrive in your inbox.</Text>

            {sent && sent.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>{"What you've sent"}</Text>
                    {sent.map((item) => {
                        const kindInfo = feedbackKindInfo(item.kind);
                        const statusInfo = feedbackStatusInfo(item.status);
                        return (
                            <View key={item.id} style={styles.row}>
                                <Icon name={kindInfo.icon} size={18} color={kindInfo.color} />
                                <View style={styles.rowText}>
                                    <Text style={styles.rowTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.rowDetail}>
                                        {formatListedAgo(item.createdAt)}
                                        {item.replies > 0 ? ` · ${item.replies} repl${item.replies === 1 ? "y" : "ies"} in your inbox` : ""}
                                    </Text>
                                </View>
                                <Text style={[styles.status, { color: statusInfo.color, borderColor: statusInfo.color }]}>
                                    {statusInfo.label}
                                </Text>
                            </View>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 10,
        paddingBottom: 8,
    },
    sectionTitle: {
        marginTop: 6,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    kinds: {
        flexDirection: "row",
        gap: 8,
    },
    kind: {
        flex: 1,
        alignItems: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    kindLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    kindLabelSelected: {
        color: colors.textPrimary,
    },
    input: {
        color: colors.textPrimary,
        fontSize: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    body: {
        minHeight: 120,
    },
    sendButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 6,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    sendButtonText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    rowDetail: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    status: {
        fontSize: 11,
        fontWeight: "700",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        overflow: "hidden",
    },
});
