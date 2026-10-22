import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import Panel from "@/components/Panel/Panel";
import Divider from "@/components/Divider/Divider";
import EmptyState from "@/components/EmptyState/EmptyState";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { SectionTitle } from "@/components/Text/Text";
import { formatListedAgo } from "@/features/market/market";
import { SKILLS } from "@/features/skills/skills";
import { toErrorMessage } from "@/lib/api";
import { useLiveRead } from "@/lib/realtime/useLiveRead";
import { latestOnly } from "@/lib/usePolling";
import type { GeoFriend, GeoFriendRequest, GeoFriendsResponse, GeoFriendStatus } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { friendsApi } from "../friendsApi";
import { usePresenceStore } from "../presenceStore";

/** While the list is open and the geo socket is down, read it this often. */
const FALLBACK_POLL_MS = 30_000;

type FriendsModalProps = {
    onClose: () => void;
};

/**
 * Friends: add by username, then the friend list, online first. Requests
 * live on their own page, reached by a button showing how many are waiting;
 * the HUD button's badge is the same count.
 *
 * Friendship is mutual: adding sends a request, and both players see each
 * other only once it's accepted. Status says what a friend is doing, never
 * where.
 */
export default function FriendsModal({ onClose }: FriendsModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [page, setPage] = useState<"friends" | "requests">("friends");
    const [data, setData] = useState<GeoFriendsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const show = useCallback((response: GeoFriendsResponse) => {
        setData(response);
        setError(null);
        usePresenceStore.getState().setIncomingRequests(response.incoming.length);
    }, []);

    // A refresh still out when a change's answer lands is older; it's dropped.
    const [reads] = useState(latestOnly);
    const refresh = useCallback(async () => {
        const ticket = reads.start();
        try {
            const response = await friendsApi.list();
            if (reads.isCurrent(ticket)) show(response);
        } catch (failure) {
            if (reads.isCurrent(ticket)) setError(toErrorMessage(failure));
        }
    }, [reads, show]);

    // Read again when a friend comes or goes, changes activity, or a request changes.
    useLiveRead(refresh, "friends", FALLBACK_POLL_MS);

    /** Runs a change that answers with the new list; failures are a toast. */
    const change = async (send: () => Promise<GeoFriendsResponse>, success?: string) => {
        try {
            const response = await send();
            reads.start();
            show(response);
            if (success) showToast(success, "success");
        } catch (failure) {
            showToast(toErrorMessage(failure), "error");
        }
    };

    return (
        <Modal
            title={page === "friends" ? "Friends" : "Friend requests"}
            size="fill"
            showBack
            onBack={page === "friends" ? undefined : () => setPage("friends")}
            closePlacement="footer"
            onClose={onClose}
        >
            {!data ? (
                <View style={styles.loading}>
                    {error ? <EmptyState title={error} /> : <ActivityIndicator color={palette.ember} />}
                </View>
            ) : page === "friends" ? (
                <FriendsPage
                    data={data}
                    onAdded={refresh}
                    onOpenRequests={() => setPage("requests")}
                    onRemove={(friend) =>
                        Alert.alert(`Remove ${friend.name}?`, "You'll both stop seeing each other's status.", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Remove",
                                style: "destructive",
                                onPress: () => void change(() => friendsApi.remove(friend.playerId)),
                            },
                        ])
                    }
                />
            ) : (
                <RequestsPage
                    data={data}
                    onAccept={(request) =>
                        void change(() => friendsApi.accept(request.id), `You and ${request.name} are friends`)
                    }
                    onDismiss={(request) => void change(() => friendsApi.dismiss(request.id))}
                />
            )}
        </Modal>
    );
}

function FriendsPage({
    data,
    onAdded,
    onOpenRequests,
    onRemove,
}: {
    data: GeoFriendsResponse;
    onAdded: () => void;
    onOpenRequests: () => void;
    onRemove: (friend: GeoFriend) => void;
}) {
    const styles = useStyles();
    const [username, setUsername] = useState("");
    const [isSending, setIsSending] = useState(false);
    const incoming = data.incoming.length;

    const add = async () => {
        const name = username.trim();
        if (!name || isSending) return;
        setIsSending(true);
        try {
            const { result } = await friendsApi.send(name);
            setUsername("");
            showToast(result === "accepted" ? `They'd already asked: you're friends` : `Request sent to ${name}`, "success");
            onAdded();
        } catch (failure) {
            showToast(toErrorMessage(failure), "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <View style={styles.addRow}>
                <TextField
                    value={username}
                    onChangeText={setUsername}
                    onSubmitEditing={() => void add()}
                    placeholder="Add by username"
                    containerStyle={styles.grow}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                />
                <Button label="Add" variant="primary" onPress={() => void add()} disabled={!username.trim()} busy={isSending} accessibilityLabel="Send friend request" />
            </View>

            <Pressable
                onPress={onOpenRequests}
                style={({ pressed }) => [styles.requestsButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Friend requests, ${incoming} waiting`}
            >
                <Text style={styles.requestsLabel}>Friend requests</Text>
                <View style={[styles.count, incoming === 0 && styles.countNone]}>
                    <Text style={[styles.countText, incoming === 0 && styles.countTextNone]}>{incoming}</Text>
                </View>
            </Pressable>

            <SectionTitle>
                Friends · {data.friends.filter((friend) => friend.status.online).length} online
            </SectionTitle>
            {data.friends.length === 0 && <EmptyState title="No friends yet. Add someone by their username." />}
            {data.friends.map((friend) => (
                <Panel compact key={friend.playerId} style={styles.row}>
                    <View style={[styles.dot, friend.status.online && styles.dotOnline]} />
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {friend.name}
                        </Text>
                        <Text style={[styles.detail, friend.status.online && styles.detailOnline]} numberOfLines={1}>
                            {describeStatus(friend.status)}
                        </Text>
                    </View>
                    <Button label="Remove" size="small" onPress={() => onRemove(friend)} accessibilityLabel={`Remove ${friend.name}`} />
                </Panel>
            ))}
        </ScrollView>
    );
}

function RequestsPage({
    data,
    onAccept,
    onDismiss,
}: {
    data: GeoFriendsResponse;
    onAccept: (request: GeoFriendRequest) => void;
    onDismiss: (request: GeoFriendRequest) => void;
}) {
    const styles = useStyles();
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
            <SectionTitle>Incoming</SectionTitle>
            {data.incoming.length === 0 && <EmptyState title="No requests waiting." />}
            {data.incoming.map((request) => (
                <Panel compact key={request.id} style={styles.row}>
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {request.name}
                        </Text>
                        <Text style={styles.detail}>Asked {formatListedAgo(request.createdAt)}</Text>
                    </View>
                    <Button label="Decline" size="small" onPress={() => onDismiss(request)} accessibilityLabel={`Decline ${request.name}`} />
                    <Button label="Accept" size="small" variant="primary" onPress={() => onAccept(request)} accessibilityLabel={`Accept ${request.name}`} />
                </Panel>
            ))}

            <Divider />

            <SectionTitle>Sent</SectionTitle>
            {data.outgoing.length === 0 && <EmptyState title="No requests sent." />}
            {data.outgoing.map((request) => (
                <Panel compact key={request.id} style={styles.row}>
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {request.name}
                        </Text>
                        <Text style={styles.detail}>Sent {formatListedAgo(request.createdAt)}</Text>
                    </View>
                    <Button label="Cancel" size="small" onPress={() => onDismiss(request)} accessibilityLabel={`Cancel request to ${request.name}`} />
                </Panel>
            ))}
        </ScrollView>
    );
}

/** "Fishing", "In a fight", "Offline". */
function describeStatus(status: GeoFriendStatus): string {
    if (!status.online) return "Offline";
    switch (status.activity) {
        case "fighting":
            return "In a fight";
        case "trading":
            return "Trading";
        case "skilling":
            return SKILLS.find((skill) => skill.id === status.skill)?.label ?? "Training a skill";
        default:
            return "Exploring";
    }
}

const useStyles = createStyles((p) => ({
    grow: {
        flex: 1,
    },
    loading: {
        paddingVertical: 32,
        alignItems: "center",
    },
    page: {
        gap: 10,
        paddingBottom: 12,
    },
    addRow: {
        flexDirection: "row",
        gap: 8,
    },
    pressed: {
        transform: [{ scale: 0.96 }],
    },
    requestsButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: p.ember,
        backgroundColor: p.surfaceAlt,
    },
    requestsLabel: {
        color: p.ember,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    count: {
        minWidth: 24,
        height: 24,
        paddingHorizontal: 6,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.danger,
    },
    countNone: {
        backgroundColor: p.outline,
    },
    countText: {
        color: p.text,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    countTextNone: {
        color: p.textMuted,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: p.game.rarityCommon,
    },
    dotOnline: {
        backgroundColor: p.heal,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    detail: {
        color: p.textMuted,
        fontSize: 12,
    },
    detailOnline: {
        color: p.heal,
    },
}));
