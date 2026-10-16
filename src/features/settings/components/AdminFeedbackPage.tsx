import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import { FEEDBACK_STATUSES, feedbackKindInfo, feedbackStatusInfo } from "@/features/feedback/feedback";
import { formatDateTime } from "@/features/market/market";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    GEO_MAIL_BODY_MAX,
    type GeoAdminFeedback,
    type GeoAdminFeedbackReplyRequest,
    type GeoAdminFeedbackResponse,
    type GeoAdminFeedbackStatusRequest,
    type GeoFeedbackStatus,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { Action } from "./AdminSuggestionsPage";

const feedbackPath = (path: string, id: string) => path.replace(":feedbackId", encodeURIComponent(id));

/**
 * Game admins: players' feedback, by status. Each can be moved along
 * (seen, planned, done, won't do) and replied to; a reply lands in the
 * player's inbox and marks new feedback seen.
 */
export default function AdminFeedbackPage() {
    const [status, setStatus] = useState<GeoFeedbackStatus>("new");
    const [data, setData] = useState<GeoAdminFeedbackResponse | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        api.get<GeoAdminFeedbackResponse>(GEO_API_PATHS.admin.feedback, { status })
            .then((response) => isCurrent && setData(response))
            .catch((error) => showToast(toErrorMessage(error), "error"));
        return () => {
            isCurrent = false;
        };
    }, [status, version]);

    /** Runs a change, then reloads the list (an item may have left this filter). */
    const change = async (send: () => Promise<unknown>, success: string): Promise<boolean> => {
        try {
            await send();
            showToast(success, "success");
            setVersion((current) => current + 1);
            return true;
        } catch (error) {
            showToast(toErrorMessage(error), "error");
            return false;
        }
    };

    return (
        <View style={styles.page}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {FEEDBACK_STATUSES.map((option) => {
                    const isSelected = option.id === status;
                    const count = data?.counts[option.id];
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => setStatus(option.id)}
                            style={({ pressed }) => [styles.filter, isSelected && styles.filterSelected, pressed && styles.pressed]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isSelected }}
                        >
                            <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                                {option.label}
                                {count === undefined ? "" : ` · ${count}`}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            {!data ? (
                <ActivityIndicator color={colors.textSecondary} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                >
                    {data.feedback.map((item) => (
                        <FeedbackCard
                            key={item.id}
                            feedback={item}
                            onSetStatus={(next) => {
                                const request: GeoAdminFeedbackStatusRequest = { status: next };
                                void change(
                                    () => api.patch(feedbackPath(GEO_API_PATHS.admin.feedbackItem, item.id), request),
                                    `Marked ${feedbackStatusInfo(next).label.toLowerCase()}`,
                                );
                            }}
                            onReply={(body) => {
                                const request: GeoAdminFeedbackReplyRequest = { body };
                                return change(
                                    () => api.post(feedbackPath(GEO_API_PATHS.admin.feedbackReplies, item.id), request),
                                    "Reply sent to their inbox",
                                );
                            }}
                        />
                    ))}
                    {data.feedback.length === 0 && <Text style={styles.muted}>Nothing here.</Text>}
                </ScrollView>
            )}
        </View>
    );
}

function FeedbackCard({
    feedback,
    onSetStatus,
    onReply,
}: {
    feedback: GeoAdminFeedback;
    onSetStatus: (status: GeoFeedbackStatus) => void;
    /** True once sent, so the draft can be cleared. */
    onReply: (body: string) => Promise<boolean>;
}) {
    const [reply, setReply] = useState("");
    const kindInfo = feedbackKindInfo(feedback.kind);
    const device = [feedback.appVersion && `v${feedback.appVersion}`, feedback.platform].filter(Boolean).join(" · ");

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon name={kindInfo.icon} size={20} color={kindInfo.color} />
                <Text style={styles.title}>{feedback.title}</Text>
            </View>
            <Text style={styles.muted}>
                {kindInfo.label} · {feedback.playerName ?? "Deleted player"} · {formatDateTime(feedback.createdAt)}
                {device ? ` · ${device}` : ""}
            </Text>
            {feedback.body ? (
                <Text style={styles.body} selectable>
                    {feedback.body}
                </Text>
            ) : null}
            {feedback.updatedBy && feedback.updatedAt && (
                <Text style={styles.muted}>
                    {feedbackStatusInfo(feedback.status).label} by {feedback.updatedBy} · {formatDateTime(feedback.updatedAt)}
                </Text>
            )}

            {feedback.replies.map((sent, index) => (
                <View key={index} style={styles.reply}>
                    <Text style={styles.muted}>
                        Reply{sent.from ? ` from ${sent.from}` : ""} · {formatDateTime(sent.createdAt)}
                    </Text>
                    <Text style={styles.replyBody}>{sent.body}</Text>
                </View>
            ))}

            <View style={styles.statuses}>
                {FEEDBACK_STATUSES.filter((option) => option.id !== "new").map((option) => {
                    const isCurrent = option.id === feedback.status;
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => !isCurrent && onSetStatus(option.id)}
                            style={({ pressed }) => [
                                styles.statusChip,
                                isCurrent && { borderColor: option.color },
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isCurrent }}
                        >
                            <Text style={[styles.statusText, isCurrent && { color: option.color }]}>{option.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {feedback.playerId ? (
                <>
                    <TextInput
                        value={reply}
                        onChangeText={setReply}
                        placeholder="Reply to their inbox"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                        multiline
                        maxLength={GEO_MAIL_BODY_MAX}
                    />
                    {reply.trim().length > 0 && (
                        <Action
                            label="Send reply"
                            onPress={() =>
                                void onReply(reply.trim()).then((sent) => {
                                    if (sent) setReply("");
                                })
                            }
                        />
                    )}
                </>
            ) : (
                <Text style={styles.muted}>{"The player's account is gone, so there's no one to reply to."}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        gap: 10,
    },
    filters: {
        gap: 8,
    },
    filter: {
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    filterSelected: {
        borderColor: colors.ember,
    },
    filterText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
    filterTextSelected: {
        color: colors.emberBright,
    },
    list: {
        gap: 10,
        paddingBottom: 8,
    },
    card: {
        gap: 6,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    title: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "600",
    },
    body: {
        color: colors.textPrimary,
        fontSize: 14,
        lineHeight: 19,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    reply: {
        gap: 2,
        paddingLeft: 10,
        borderLeftWidth: 2,
        borderLeftColor: colors.toastSuccess,
    },
    replyBody: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
    },
    statuses: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 4,
    },
    statusChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    input: {
        marginTop: 4,
        minHeight: 44,
        color: colors.textPrimary,
        fontSize: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
