import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { Hint, SectionTitle } from "@/components/Text/Text";
import { formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import {
    GEO_FEEDBACK_BODY_MAX,
    GEO_FEEDBACK_TITLE_MAX,
    type GeoFeedbackKind,
    type GeoMyFeedback,
} from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { FEEDBACK_KINDS, feedbackApi, feedbackKindInfo, feedbackStatusInfo } from "../feedback";

/**
 * Settings → Feedback: report a bug, suggest something, or anything else,
 * with a title and a description. The app's version and platform go with
 * it. Below, what the player has sent and where each stands; replies land
 * in their inbox.
 */
export default function FeedbackPage() {
    const styles = useStyles();
    const palette = useTheme();
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
            <SectionTitle>What is it?</SectionTitle>
            <View style={styles.kinds}>
                {FEEDBACK_KINDS.map((info) => {
                    const isSelected = info.id === kind;
                    return (
                        <Panel compact
                            key={info.id}
                            onPress={() => setKind(info.id)}
                            style={[styles.kind, isSelected && { borderColor: info.color }]}
                            accessibilityRole="radio"
                            accessibilityLabel={info.label}
                        >
                            <Icon name={info.icon} size={22} color={isSelected ? info.color : palette.textMuted} />
                            <Text style={[styles.kindLabel, isSelected && styles.kindLabelSelected]}>{info.label}</Text>
                        </Panel>
                    );
                })}
            </View>

            <SectionTitle>Title</SectionTitle>
            <TextField
                value={title}
                onChangeText={setTitle}
                placeholder={kind === "bug" ? "e.g. Map goes black after a fight" : "In a few words"}
                maxLength={GEO_FEEDBACK_TITLE_MAX}
                returnKeyType="next"
            />

            <SectionTitle>Description</SectionTitle>
            <TextField
                value={body}
                onChangeText={setBody}
                placeholder={
                    kind === "bug"
                        ? "What happened, what you expected, and how to make it happen again"
                        : "Tell us more"
                }
                multiline
                maxLength={GEO_FEEDBACK_BODY_MAX}
            />

            <Button label="Send feedback" variant="primary" size="large" icon="share" onPress={() => void send()} disabled={!canSend} busy={isSending} stretch />
            <Hint>Your app version and phone type are sent with it. Replies arrive in your inbox.</Hint>

            {sent && sent.length > 0 && (
                <>
                    <SectionTitle>{"What you've sent"}</SectionTitle>
                    {sent.map((item) => {
                        const kindInfo = feedbackKindInfo(item.kind);
                        const statusInfo = feedbackStatusInfo(item.status);
                        return (
                            <Panel compact key={item.id} style={styles.row}>
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
                            </Panel>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 10,
        paddingBottom: 8,
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
    },
    kindLabel: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    kindLabelSelected: {
        color: p.text,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowTitle: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    rowDetail: {
        color: p.textMuted,
        fontSize: 12,
    },
    status: {
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        overflow: "hidden",
    },
}));
