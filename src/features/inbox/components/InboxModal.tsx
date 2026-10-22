import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import EmptyState from "@/components/EmptyState/EmptyState";
import Icon from "@/components/Icon/Icon";
import Tabs from "@/components/Tabs/Tabs";
import Modal from "@/components/Modal/Modal";
import ChestsPage from "@/features/chests/components/ChestsPage";
import { formatDateTime, formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { inboxApi } from "../inboxApi";
import { useInboxStore } from "../inboxStore";
import { mailInfo, toMail, type Mail } from "../mail";

type InboxModalProps = {
    onClose: () => void;
};

type InboxTab = "mail" | "chests";

/**
 * The inbox, in two tabs. Mail: replies to the player's feedback, and
 * announcements to everyone (news, updates, events, a new mayor), newest
 * first. Chests: chests won and waiting to be opened, then the history, kept
 * apart so a run of dungeon wins doesn't bury the mail.
 *
 * Opening it reads all the mail: the button's badge drops it at once, while
 * what was new keeps its marker (and the tab its count) until the inbox
 * closes. Chests count until they're opened. It opens on Chests when chests
 * are all that's waiting. Friend requests aren't here; they're with friends.
 */
export default function InboxModal({ onClose }: InboxModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [tab, setTab] = useState<InboxTab>(() => {
        const { unread, pendingChests } = useInboxStore.getState();
        return unread === 0 && pendingChests > 0 ? "chests" : "mail";
    });
    const pendingChests = useInboxStore((state) => state.pendingChests);
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
                // If this fails the badge comes back with the next push; nothing else lost.
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
            {!open && (
                <Tabs
                    tabs={[
                        { id: "mail", label: "Mail", badge: mail?.filter((entry) => !entry.item.read).length ?? 0 },
                        { id: "chests", label: "Chests", badge: pendingChests },
                    ]}
                    value={tab}
                    onChange={setTab}
                    style={styles.tabs}
                />
            )}
            {tab === "chests" && !open ? (
                <ChestsPage />
            ) : !mail ? (
                <View style={styles.loading}>
                    {error ? <EmptyState title={error} /> : <ActivityIndicator color={palette.ember} />}
                </View>
            ) : open ? (
                <MailPage mail={open} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {mail.length === 0 && <EmptyState title="Nothing here yet. News and replies land here." />}
                    {mail.map((entry) => (
                        <MailRow key={entry.id} mail={entry} onPress={() => setOpen(entry)} />
                    ))}
                </ScrollView>
            )}
        </Modal>
    );
}


function MailRow({ mail, onPress }: { mail: Mail; onPress: () => void }) {
    const styles = useStyles();
    const info = mailInfo(mail);
    const isNew = !mail.item.read;

    return (
        <Panel compact
            onPress={onPress}
            style={[styles.row, isNew && styles.rowNew]}
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
        </Panel>
    );
}

function MailPage({ mail }: { mail: Mail }) {
    const styles = useStyles();
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

const useStyles = createStyles((p) => ({
    tabs: {
        marginBottom: 12,
    },
    loading: {
        paddingVertical: 32,
        alignItems: "center",
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
    },
    rowNew: {
        borderColor: p.ember,
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
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    preview: {
        color: p.textMuted,
        fontSize: 12,
    },
    when: {
        color: p.textMuted,
        fontSize: 11,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: p.danger,
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
        color: p.text,
        fontSize: 18,
        fontFamily: FONTS.bodyHeavy,
    },
    body: {
        color: p.text,
        fontSize: 15,
        lineHeight: 22,
    },
    quote: {
        gap: 4,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: p.outline,
        borderRadius: 6,
        backgroundColor: p.surfaceAlt,
    },
    quoteLabel: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    quoteTitle: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    quoteBody: {
        color: p.textMuted,
        fontSize: 13,
        lineHeight: 19,
    },
}));
