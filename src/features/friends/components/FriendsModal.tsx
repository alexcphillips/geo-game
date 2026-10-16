import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import { formatListedAgo } from "@/features/market/market";
import { SKILLS } from "@/features/skills/skills";
import { toErrorMessage } from "@/lib/api";
import type { GeoFriend, GeoFriendRequest, GeoFriendsResponse, GeoFriendStatus } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { friendsApi } from "../friendsApi";
import { usePresenceStore } from "../presenceStore";

/** Friends' status is only as fresh as their heartbeat, so no need to poll faster. */
const REFRESH_MS = 30_000;

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
    const [page, setPage] = useState<"friends" | "requests">("friends");
    const [data, setData] = useState<GeoFriendsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const show = useCallback((response: GeoFriendsResponse) => {
        setData(response);
        setError(null);
        usePresenceStore.getState().setIncomingRequests(response.incoming.length);
    }, []);

    const refresh = useCallback(() => {
        friendsApi
            .list()
            .then(show)
            .catch((failure) => setError(toErrorMessage(failure)));
    }, [show]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    /** Runs a change that answers with the new list; failures are a toast. */
    const change = async (send: () => Promise<GeoFriendsResponse>, success?: string) => {
        try {
            show(await send());
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
                    {error ? <Text style={styles.empty}>{error}</Text> : <ActivityIndicator color={colors.emberBright} />}
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
                <TextInput
                    value={username}
                    onChangeText={setUsername}
                    onSubmitEditing={() => void add()}
                    placeholder="Add by username"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                />
                <Pressable
                    onPress={() => void add()}
                    disabled={!username.trim() || isSending}
                    style={({ pressed }) => [
                        styles.primary,
                        (!username.trim() || isSending) && styles.disabled,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send friend request"
                >
                    <Text style={styles.primaryText}>Add</Text>
                </Pressable>
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

            <Text style={styles.sectionTitle}>
                Friends · {data.friends.filter((friend) => friend.status.online).length} online
            </Text>
            {data.friends.length === 0 && <Text style={styles.empty}>No friends yet. Add someone by their username.</Text>}
            {data.friends.map((friend) => (
                <View key={friend.playerId} style={styles.row}>
                    <View style={[styles.dot, friend.status.online && styles.dotOnline]} />
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {friend.name}
                        </Text>
                        <Text style={[styles.detail, friend.status.online && styles.detailOnline]} numberOfLines={1}>
                            {describeStatus(friend.status)}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => onRemove(friend)}
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${friend.name}`}
                        hitSlop={6}
                    >
                        <Text style={styles.secondaryText}>Remove</Text>
                    </Pressable>
                </View>
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
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
            <Text style={styles.sectionTitle}>Incoming</Text>
            {data.incoming.length === 0 && <Text style={styles.empty}>No requests waiting.</Text>}
            {data.incoming.map((request) => (
                <View key={request.id} style={styles.row}>
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {request.name}
                        </Text>
                        <Text style={styles.detail}>Asked {formatListedAgo(request.createdAt)}</Text>
                    </View>
                    <Pressable
                        onPress={() => onDismiss(request)}
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Decline ${request.name}`}
                    >
                        <Text style={styles.secondaryText}>Decline</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onAccept(request)}
                        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Accept ${request.name}`}
                    >
                        <Text style={styles.primaryText}>Accept</Text>
                    </Pressable>
                </View>
            ))}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Sent</Text>
            {data.outgoing.length === 0 && <Text style={styles.empty}>No requests sent.</Text>}
            {data.outgoing.map((request) => (
                <View key={request.id} style={styles.row}>
                    <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {request.name}
                        </Text>
                        <Text style={styles.detail}>Sent {formatListedAgo(request.createdAt)}</Text>
                    </View>
                    <Pressable
                        onPress={() => onDismiss(request)}
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Cancel request to ${request.name}`}
                    >
                        <Text style={styles.secondaryText}>Cancel</Text>
                    </Pressable>
                </View>
            ))}
        </ScrollView>
    );
}

/** "Fishing", "In a fight", "Last seen 2h ago". */
function describeStatus(status: GeoFriendStatus): string {
    if (!status.online) return status.lastSeenAt ? `Last seen ${formatListedAgo(status.lastSeenAt)}` : "Offline";
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

const styles = StyleSheet.create({
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
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
        color: colors.textPrimary,
        fontSize: 14,
    },
    primary: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 13,
        fontWeight: "700",
    },
    secondary: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    disabled: {
        opacity: 0.4,
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
        borderColor: colors.ember,
        backgroundColor: colors.surfaceRaised,
    },
    requestsLabel: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "600",
    },
    count: {
        minWidth: 24,
        height: 24,
        paddingHorizontal: 6,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.toastError,
    },
    countNone: {
        backgroundColor: colors.border,
    },
    countText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    countTextNone: {
        color: colors.textSecondary,
    },
    sectionTitle: {
        marginTop: 6,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    empty: {
        color: colors.textSecondary,
        fontSize: 13,
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
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.rarityCommon,
    },
    dotOnline: {
        backgroundColor: colors.toastSuccess,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "600",
    },
    detail: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    detailOnline: {
        color: colors.toastSuccess,
    },
    divider: {
        height: 1,
        marginVertical: 4,
        backgroundColor: colors.border,
    },
});
