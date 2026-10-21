import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import SearchField from "@/components/SearchField/SearchField";
import { showToast } from "@/components/Toast/toastStore";
import { formatCoins, formatDateTime } from "@/features/market/market";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoAdminPlayer, type GeoAdminPlayerDetail } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

const fill = (path: string, playerId: string) => path.replace(":playerId", encodeURIComponent(playerId));

/**
 * Game admins: find a player, then see their coins and recent ledger, give or
 * take coins, make them an admin, or suspend them. The server checks the
 * admin role on every call and audits every change.
 */
export default function AdminPlayersPage() {
    const styles = useStyles();
    const palette = useTheme();
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
                <ActivityIndicator color={palette.textMuted} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                    {players.map((player) => (
                        <Panel compact
                            key={player.id}
                            onPress={() => setOpenId(player.id)}
                            style={styles.row}
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
                            <Icon name="two-coins" size={13} color={palette.reward} />
                            <Text style={styles.coins}>{formatCoins(player.coins)}</Text>
                        </Panel>
                    ))}
                    {players.length === 0 && <Text style={styles.muted}>Nobody matches.</Text>}
                </ScrollView>
            )}
        </View>
    );
}

function PlayerDetail({ playerId, onBack }: { playerId: string; onBack: () => void }) {
    const styles = useStyles();
    const palette = useTheme();
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

    if (!player) return <ActivityIndicator color={palette.textMuted} />;
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
                <Icon name="two-coins" size={16} color={palette.reward} />
                <Text style={styles.coinsLarge}>{formatCoins(player.coins)}</Text>
            </View>

            <View style={styles.grantRow}>
                <TextField
                    value={amount}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    containerStyle={styles.grow}
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
    return <Button label={label} size="small" variant={danger ? "danger" : "secondary"} onPress={onPress} disabled={disabled} />;
}

const useStyles = createStyles((p) => ({
    grow: {
        flex: 1,
    },
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
    muted: {
        color: p.textMuted,
        fontSize: 12,
    },
    coins: {
        color: p.reward,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    back: {
        alignSelf: "flex-start",
    },
    link: {
        color: p.ember,
        fontSize: 14,
    },
    title: {
        color: p.text,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
    },
    coinLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    coinsLarge: {
        color: p.reward,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    grantRow: {
        flexDirection: "row",
        gap: 8,
    },
    heading: {
        marginTop: 8,
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
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
        color: p.text,
        fontSize: 13,
    },
    ledgerDelta: {
        minWidth: 64,
        textAlign: "right",
        color: p.heal,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    negative: {
        color: p.danger,
    },
}));
