import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { SectionTitle } from "@/components/Text/Text";
import { ANNOUNCEMENT_KINDS } from "@/features/inbox/mail";
import { APP_VERSION } from "@/features/inbox/useWhatsNew";
import { formatDateTime } from "@/features/market/market";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    GEO_MAIL_BODY_MAX,
    GEO_MAIL_TITLE_MAX,
    GEO_POSTABLE_ANNOUNCEMENT_KINDS,
    type GeoAdminAnnouncement,
    type GeoAdminAnnouncementRequest,
    type GeoAdminAnnouncementsResponse,
    type GeoPostableAnnouncementKind,
} from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { Action } from "./AdminSuggestionsPage";

const EXPIRIES: { label: string; hours: number | undefined }[] = [
    { label: "Never", hours: undefined },
    { label: "1 day", hours: 24 },
    { label: "3 days", hours: 72 },
    { label: "1 week", hours: 168 },
];

/**
 * Game admins: send an announcement to every player's inbox — news, an
 * update's changelog, or an event — and see or delete what's been sent.
 *
 * A changelog names the app version it's for: players see it as "What's
 * new" once they're on that version or later. New mayors are announced by
 * the server on its own.
 */
export default function AdminAnnouncementsPage() {
    const styles = useStyles();
    const palette = useTheme();
    const [kind, setKind] = useState<GeoPostableAnnouncementKind>("news");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [version, setVersion] = useState(APP_VERSION);
    const [expiresInHours, setExpiresInHours] = useState<number | undefined>(undefined);
    const [isPosting, setIsPosting] = useState(false);
    const [sent, setSentState] = useState<GeoAdminAnnouncement[] | null>(null);
    /** When the list was loaded: what "expired" is judged against. */
    const [loadedAt, setLoadedAt] = useState(0);
    const setSent = (announcements: GeoAdminAnnouncement[]) => {
        setSentState(announcements);
        setLoadedAt(Date.now());
    };

    useEffect(() => {
        api.get<GeoAdminAnnouncementsResponse>(GEO_API_PATHS.admin.announcements)
            .then((response) => setSent(response.announcements))
            .catch((error) => showToast(toErrorMessage(error), "error"));
    }, []);

    const canPost = title.trim().length > 0 && (kind !== "changelog" || version.trim().length > 0) && !isPosting;

    const post = async () => {
        setIsPosting(true);
        try {
            const request: GeoAdminAnnouncementRequest = {
                kind,
                title: title.trim(),
                body: body.trim(),
                version: kind === "changelog" ? version.trim() : undefined,
                expiresInHours,
            };
            const response = await api.post<GeoAdminAnnouncementsResponse>(GEO_API_PATHS.admin.announcements, request);
            setSent(response.announcements);
            setTitle("");
            setBody("");
            showToast("Sent to every inbox", "success");
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsPosting(false);
        }
    };

    const confirmPost = () =>
        Alert.alert("Send to every player?", `"${title.trim()}" goes into everyone's inbox.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Send", onPress: () => void post() },
        ]);

    const confirmDelete = (announcement: GeoAdminAnnouncement) =>
        Alert.alert("Delete it?", `"${announcement.title}" leaves every inbox, for good.`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () =>
                    void api
                        .delete<GeoAdminAnnouncementsResponse>(
                            GEO_API_PATHS.admin.announcement.replace(":announcementId", encodeURIComponent(announcement.id)),
                        )
                        .then((response) => {
                            setSent(response.announcements);
                            showToast("Deleted", "success");
                        })
                        .catch((error) => showToast(toErrorMessage(error), "error")),
            },
        ]);

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
        >
            <View style={styles.chips}>
                {GEO_POSTABLE_ANNOUNCEMENT_KINDS.map((id) => {
                    const info = ANNOUNCEMENT_KINDS[id];
                    const isSelected = id === kind;
                    return (
                        <Panel compact
                            key={id}
                            onPress={() => setKind(id)}
                            style={[styles.kind, isSelected && { borderColor: info.color }]}
                            accessibilityRole="radio"
                            accessibilityLabel={info.label}
                        >
                            <Icon name={info.icon} size={20} color={isSelected ? info.color : palette.textMuted} />
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{info.label}</Text>
                        </Panel>
                    );
                })}
            </View>

            <TextField
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                maxLength={GEO_MAIL_TITLE_MAX}
            />
            <TextField
                value={body}
                onChangeText={setBody}
                placeholder={kind === "changelog" ? "• What changed, one per line" : "Message"}
                multiline
                maxLength={GEO_MAIL_BODY_MAX}
            />
            {kind === "changelog" && (
                <>
                    <TextField
                        value={version}
                        onChangeText={setVersion}
                        placeholder="App version, e.g. 1.2.0"
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                    />
                    <Text style={styles.muted}>
                        {`Shown as "What's new" to players on this version or later. This app is ${APP_VERSION}.`}
                    </Text>
                </>
            )}

            <SectionTitle>Leaves the inbox after</SectionTitle>
            <View style={styles.chips}>
                {EXPIRIES.map((option) => {
                    const isSelected = option.hours === expiresInHours;
                    return (
                        <Pressable
                            key={option.label}
                            onPress={() => setExpiresInHours(option.hours)}
                            style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.pressed]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                        >
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.postRow, !canPost && styles.disabled]} pointerEvents={canPost ? "auto" : "none"}>
                {isPosting ? <ActivityIndicator color={palette.ember} /> : <Action label="Send to everyone" onPress={confirmPost} />}
            </View>

            <SectionTitle>Sent</SectionTitle>
            {!sent ? (
                <ActivityIndicator color={palette.textMuted} />
            ) : (
                sent.map((announcement) => {
                    const info = ANNOUNCEMENT_KINDS[announcement.kind];
                    const isExpired = announcement.expiresAt !== null && new Date(announcement.expiresAt).getTime() < loadedAt;
                    return (
                        <Panel compact key={announcement.id} style={[styles.card, isExpired && styles.expired]}>
                            <View style={styles.cardHeader}>
                                <Icon name={info.icon} size={18} color={info.color} />
                                <Text style={styles.title} numberOfLines={1}>
                                    {announcement.title}
                                </Text>
                            </View>
                            <Text style={styles.muted}>
                                {info.label}
                                {announcement.version ? ` ${announcement.version}` : ""} · {formatDateTime(announcement.createdAt)}
                                {` · ${announcement.postedBy ?? "the server"}`}
                                {announcement.expiresAt
                                    ? ` · ${isExpired ? "expired" : "until"} ${formatDateTime(announcement.expiresAt)}`
                                    : ""}
                            </Text>
                            <Action label="Delete" danger onPress={() => confirmDelete(announcement)} />
                        </Panel>
                    );
                })
            )}
            {sent && sent.length === 0 && <Text style={styles.muted}>Nothing sent yet.</Text>}
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 10,
        paddingBottom: 8,
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    kind: {
        flex: 1,
        alignItems: "center",
        gap: 4,
        paddingVertical: 10,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: p.outline,
    },
    chipSelected: {
        borderColor: p.ember,
    },
    chipText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    chipTextSelected: {
        color: p.text,
    },
    postRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 4,
    },
    disabled: {
        opacity: 0.4,
    },
    card: {
        gap: 6,
        padding: 12,
    },
    expired: {
        opacity: 0.55,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    title: {
        flex: 1,
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    muted: {
        color: p.textMuted,
        fontSize: 12,
        lineHeight: 17,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
