import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { formatDateTime, formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import { colors } from "@/theme/colors";
import { inboxApi } from "../inboxApi";
import { useInboxStore } from "../inboxStore";
import { mailInfo, toMail, type Mail } from "../mail";

type InboxModalProps = {
    onClose: () => void;
};

/**
 * The inbox: replies to the player's feedback, and announcements to everyone
 * (news, updates, events, a new mayor), newest first.
 *
 * Opening it reads everything in it: the badge clears at once, while what
 * was new keeps its marker until the inbox closes. Friend requests aren't
 * here; they're with friends.
 */
export default function InboxModal({ onClose }: InboxModalProps) {
    const [mail, setMail] = useState<Mail[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<Mail | null>(null);

    useEffect(() => {
        let isCurrent = true;
        inboxApi
            .get()
            .then((inbox) => {
                if (!isCurrent) return;
                setMail(toMail(inbox));
                useInboxStore.getState().setUnread(0);
                // The badge can come back on the next heartbeat if this fails; nothing else lost.
                if (inbox.unread > 0) inboxApi.markRead(inbox.asOf).catch(() => {});
            })
            .catch((failure) => isCurrent && setError(toErrorMessage(failure)));
        return () => {
            isCurrent = false;
        };
    }, []);

    return (
        <Modal
            title={open ? mailInfo(open).label : "Inbox"}
            size="fill"
            showBack
            onBack={open ? () => setOpen(null) : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {!mail ? (
                <View style={styles.loading}>
                    {error ? <Text style={styles.empty}>{error}</Text> : <ActivityIndicator color={colors.emberBright} />}
                </View>
            ) : open ? (
                <MailPage mail={open} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {mail.length === 0 && <Text style={styles.empty}>Nothing here yet. News and replies land here.</Text>}
                    {mail.map((entry) => (
                        <MailRow key={entry.id} mail={entry} onPress={() => setOpen(entry)} />
                    ))}
                </ScrollView>
            )}
        </Modal>
    );
}

function MailRow({ mail, onPress }: { mail: Mail; onPress: () => void }) {
    const info = mailInfo(mail);
    const isNew = !mail.item.read;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.row, isNew && styles.rowNew, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${isNew ? "New: " : ""}${info.label}, ${mail.item.title}`}
        >
            <Icon name={info.icon} size={24} color={info.color} />
            <View style={styles.rowText}>
                <Text style={styles.title} numberOfLines={1}>
                    {mail.item.title}
                </Text>
                <Text style={styles.preview} numberOfLines={1}>
                    {mail.item.body || info.label}
                </Text>
            </View>
            <View style={styles.rowEnd}>
                <Text style={styles.when}>{formatListedAgo(mail.item.createdAt)}</Text>
                {isNew && <View style={styles.dot} />}
            </View>
        </Pressable>
    );
}

function MailPage({ mail }: { mail: Mail }) {
    const info = mailInfo(mail);

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
            <View style={styles.header}>
                <Icon name={info.icon} size={28} color={info.color} />
                <View style={styles.rowText}>
                    <Text style={styles.pageTitle}>{mail.item.title}</Text>
                    <Text style={styles.when}>
                        {formatDateTime(mail.item.createdAt)}
                        {mail.type === "message" && mail.item.from ? ` · from ${mail.item.from}` : ""}
                        {mail.type === "announcement" && mail.item.version ? ` · version ${mail.item.version}` : ""}
                    </Text>
                </View>
            </View>
            {mail.item.body ? (
                <Text style={styles.body} selectable>
                    {mail.item.body}
                </Text>
            ) : null}
            {mail.type === "message" && mail.item.feedback && (
                <View style={styles.quote}>
                    <Text style={styles.quoteLabel}>You wrote</Text>
                    <Text style={styles.quoteTitle}>{mail.item.feedback.title}</Text>
                    {mail.item.feedback.body ? <Text style={styles.quoteBody}>{mail.item.feedback.body}</Text> : null}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: 32,
        alignItems: "center",
    },
    empty: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: "center",
        paddingVertical: 16,
    },
    list: {
        gap: 8,
        paddingBottom: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    rowNew: {
        borderColor: colors.ember,
    },
    pressed: {
        transform: [{ scale: 0.98 }],
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowEnd: {
        alignItems: "flex-end",
        gap: 6,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "600",
    },
    preview: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    when: {
        color: colors.textSecondary,
        fontSize: 11,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.toastError,
    },
    page: {
        gap: 14,
        paddingBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    pageTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
    },
    body: {
        color: colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    quote: {
        gap: 4,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        borderRadius: 6,
        backgroundColor: colors.surfaceRaised,
    },
    quoteLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    quoteTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    quoteBody: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
});
