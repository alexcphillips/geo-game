import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import SearchField from "@/components/SearchField/SearchField";
import { showToast } from "@/components/Toast/toastStore";
import { formatCoins, formatDateTime } from "@/features/market/market";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoAdminPlayer, type GeoAdminPlayerDetail } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

const fill = (path: string, playerId: string) => path.replace(":playerId", encodeURIComponent(playerId));

/**
 * Game admins: find a player, then see their coins and recent ledger, give or
 * take coins, make them an admin, or suspend them. The server checks the
 * admin role on every call and audits every change.
 */
export default function AdminPlayersPage() {
    const [search, setSearch] = useState("");
    const [players, setPlayers] = useState<GeoAdminPlayer[] | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        let isCurrent = true;
        const timer = setTimeout(() => {
            api.get<GeoAdminPlayer[]>(GEO_API_PATHS.admin.players, { search: search.trim() || undefined })
                .then((list) => isCurrent && setPlayers(list))
                .catch((error) => showToast(toErrorMessage(error), "error"));
        }, 300);
        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [search]);

    if (openId) return <PlayerDetail playerId={openId} onBack={() => setOpenId(null)} />;

    return (
        <View style={styles.page}>
            <SearchField value={search} onChange={setSearch} placeholder="Name or email" />
            {!players ? (
                <ActivityIndicator color={colors.textSecondary} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                    {players.map((player) => (
                        <Pressable
                            key={player.id}
                            onPress={() => setOpenId(player.id)}
                            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                            accessibilityRole="button"
                        >
                            <View style={styles.rowText}>
                                <Text style={styles.name}>
                                    {player.displayName}
                                    {player.role === "admin" ? " · admin" : ""}
                                    {player.bannedAt ? " · suspended" : ""}
                                </Text>
                                <Text style={styles.muted}>{player.email}</Text>
                            </View>
                            <Icon name="coins" size={13} color={colors.coins} />
                            <Text style={styles.coins}>{formatCoins(player.coins)}</Text>
                        </Pressable>
                    ))}
                    {players.length === 0 && <Text style={styles.muted}>Nobody matches.</Text>}
                </ScrollView>
            )}
        </View>
    );
}

function PlayerDetail({ playerId, onBack }: { playerId: string; onBack: () => void }) {
    const myId = usePlayerStore((state) => state.me?.player.id);
    const refreshMe = usePlayerStore((state) => state.refresh);
    const [player, setPlayer] = useState<GeoAdminPlayerDetail | null>(null);
    const [amount, setAmount] = useState("100");
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        api.get<GeoAdminPlayerDetail>(fill(GEO_API_PATHS.admin.player, playerId))
            .then((detail) => isCurrent && setPlayer(detail))
            .catch((error) => showToast(toErrorMessage(error), "error"));
        return () => {
            isCurrent = false;
        };
    }, [playerId, version]);

    const change = async (send: () => Promise<unknown>, success: string) => {
        try {
            await send();
            showToast(success, "success");
            setVersion((current) => current + 1);
            if (playerId === myId) await refreshMe();
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    if (!player) return <ActivityIndicator color={colors.textSecondary} />;
    const isMe = player.id === myId;
    const coins = Number(amount) || 0;

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>‹ All players</Text>
            </Pressable>
            <Text style={styles.title}>{player.displayName}</Text>
            <Text style={styles.muted}>
                {player.email} · joined {formatDateTime(player.createdAt)}
            </Text>
            <View style={styles.coinLine}>
                <Icon name="coins" size={16} color={colors.coins} />
                <Text style={styles.coinsLarge}>{formatCoins(player.coins)}</Text>
            </View>

            <View style={styles.grantRow}>
                <TextInput
                    value={amount}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    style={styles.amount}
                    accessibilityLabel="Coins"
                />
                <Action
                    label="Give"
                    disabled={coins < 1}
                    onPress={() =>
                        void change(
                            () => api.post(fill(GEO_API_PATHS.admin.playerCoins, player.id), { amount: coins, note: "admin page" }),
                            `Gave ${formatCoins(coins)} coins`,
                        )
                    }
                />
                <Action
                    label="Take"
                    disabled={coins < 1}
                    onPress={() =>
                        void change(
                            () => api.post(fill(GEO_API_PATHS.admin.playerCoins, player.id), { amount: -coins, note: "admin page" }),
                            `Took ${formatCoins(coins)} coins`,
                        )
                    }
                />
            </View>

            {!isMe && (
                <View style={styles.grantRow}>
                    <Action
                        label={player.role === "admin" ? "Remove admin" : "Make admin"}
                        onPress={() =>
                            void change(
                                () =>
                                    api.put(fill(GEO_API_PATHS.admin.playerRole, player.id), {
                                        role: player.role === "admin" ? "player" : "admin",
                                    }),
                                "Role changed",
                            )
                        }
                    />
                    <Action
                        label={player.bannedAt ? "Lift suspension" : "Suspend"}
                        danger={!player.bannedAt}
                        onPress={() =>
                            void change(
                                () => api.post(fill(GEO_API_PATHS.admin.playerBan, player.id), { banned: !player.bannedAt }),
                                player.bannedAt ? "Suspension lifted" : "Suspended, and signed out everywhere",
                            )
                        }
                    />
                </View>
            )}

            <Text style={styles.heading}>Ledger, newest first</Text>
            {player.ledger.map((entry, index) => (
                <View key={index} style={styles.ledgerRow}>
                    <Text style={styles.ledgerReason}>{entry.reason}</Text>
                    <Text style={styles.muted}>{formatDateTime(entry.createdAt)}</Text>
                    <Text style={[styles.ledgerDelta, entry.delta < 0 && styles.negative]}>
                        {entry.delta > 0 ? "+" : ""}
                        {formatCoins(entry.delta)}
                    </Text>
                </View>
            ))}
            {player.ledger.length === 0 && <Text style={styles.muted}>No coins have moved yet.</Text>}
        </ScrollView>
    );
}

function Action({
    label,
    onPress,
    disabled = false,
    danger = false,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.action,
                danger && styles.actionDanger,
                disabled && styles.disabled,
                pressed && styles.pressed,
            ]}
            accessibilityRole="button"
        >
            <Text style={[styles.actionText, danger && styles.actionTextDanger]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    page: {
        flexGrow: 1,
        gap: 10,
    },
    list: {
        gap: 8,
        paddingBottom: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
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
    muted: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    coins: {
        color: colors.coins,
        fontSize: 14,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    back: {
        alignSelf: "flex-start",
    },
    link: {
        color: colors.emberBright,
        fontSize: 14,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: "700",
    },
    coinLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    coinsLarge: {
        color: colors.coins,
        fontSize: 20,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    grantRow: {
        flexDirection: "row",
        gap: 8,
    },
    amount: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    action: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    actionDanger: {
        borderColor: colors.blood,
    },
    actionText: {
        color: colors.emberBright,
        fontSize: 14,
        fontWeight: "700",
    },
    actionTextDanger: {
        color: colors.damage,
    },
    disabled: {
        opacity: 0.4,
    },
    heading: {
        marginTop: 8,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    ledgerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ledgerReason: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
    },
    ledgerDelta: {
        minWidth: 64,
        textAlign: "right",
        color: colors.toastSuccess,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    negative: {
        color: colors.toastError,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
