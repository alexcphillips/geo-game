import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import RewardGrid from "@/features/inventory/components/RewardGrid";
import { formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import type { GeoChestSelection, GeoChestsResponse } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { useInboxStore } from "@/features/inbox/inboxStore";
import { chestsApi } from "../chestsApi";
import { CHEST_TIER_COLORS } from "../chestTiers";
import ChestPicker from "./ChestPicker";
import { ChestCost } from "./ChestTile";

/**
 * Inbox → Chests: selections waiting to be opened, then the history of
 * opened ones. Fetched once per visit, so a chest opened here shows what it
 * held in place, and moves down to the history the next time the page opens.
 */
export default function ChestsPage() {
    const [chests, setChests] = useState<GeoChestsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        chestsApi
            .list()
            .then((list) => {
                setChests(list);
                // Fresher than the last heartbeat's count.
                useInboxStore.getState().setPendingChests(list.pending.length);
            })
            .catch((failure) => setError(toErrorMessage(failure)));
    }, []);

    if (!chests) {
        return (
            <View style={styles.loading}>
                {error ? <Text style={styles.empty}>{error}</Text> : <ActivityIndicator color={colors.emberBright} />}
            </View>
        );
    }

    const replacePending = (opened: GeoChestSelection) =>
        setChests((current) =>
            current && {
                ...current,
                pending: current.pending.map((selection) => (selection.id === opened.id ? opened : selection)),
            },
        );

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
            <Text style={styles.sectionTitle}>Pending</Text>
            {chests.pending.length === 0 && <Text style={styles.empty}>No chests waiting.</Text>}
            {chests.pending.map((selection) => (
                <View key={selection.id} style={styles.card}>
                    <Source selection={selection} />
                    <ChestPicker selection={selection} onOpened={replacePending} />
                </View>
            ))}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>History</Text>
            {chests.history.length === 0 && <Text style={styles.empty}>Nothing opened yet.</Text>}
            {chests.history.map((selection) => (
                <HistoryRow key={selection.id} selection={selection} />
            ))}
        </ScrollView>
    );
}

/** "From Test Hoarder · 2h ago". */
function Source({ selection, when = selection.createdAt }: { selection: GeoChestSelection; when?: string }) {
    return (
        <Text style={styles.source}>
            From {selection.source.name} · {formatListedAgo(when)}
        </Text>
    );
}

/** An opened selection: which chest, what it cost, what was in it. */
function HistoryRow({ selection }: { selection: GeoChestSelection }) {
    const opened = selection.opened;
    const chest = opened ? selection.chests[opened.index] : undefined;
    if (!opened || !chest) return null;
    const color = CHEST_TIER_COLORS[chest.tier];
    return (
        <View style={styles.card}>
            <View style={styles.historyHeader}>
                <Icon name="open-treasure-chest" size={22} color={color} />
                <Text style={[styles.chestName, { color }]}>{chest.name}</Text>
                <ChestCost cost={chest.cost} />
            </View>
            <Source selection={selection} when={opened.openedAt} />
            <RewardGrid items={opened.items} compact />
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 12,
        paddingBottom: 12,
    },
    loading: {
        paddingVertical: 32,
        alignItems: "center",
    },
    sectionTitle: {
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
    card: {
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    source: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    divider: {
        height: 1,
        marginVertical: 4,
        backgroundColor: colors.border,
    },
    historyHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    chestName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
    },
});
