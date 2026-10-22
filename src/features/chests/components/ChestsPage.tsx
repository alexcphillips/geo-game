import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Divider from "@/components/Divider/Divider";
import EmptyState from "@/components/EmptyState/EmptyState";
import Icon from "@/components/Icon/Icon";
import { SectionTitle } from "@/components/Text/Text";
import RewardGrid from "@/features/items/components/RewardGrid";
import { formatListedAgo } from "@/features/market/market";
import { toErrorMessage } from "@/lib/api";
import type { GeoChestSelection, GeoChestsResponse } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
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
    const styles = useStyles();
    const palette = useTheme();
    const [chests, setChests] = useState<GeoChestsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        chestsApi
            .list()
            .then((list) => {
                setChests(list);
                // Matches the list shown; the server pushes it too.
                useInboxStore.getState().setPendingChests(list.pending.length);
            })
            .catch((failure) => setError(toErrorMessage(failure)));
    }, []);

    if (!chests) {
        return (
            <View style={styles.loading}>
                {error ? <EmptyState title={error} /> : <ActivityIndicator color={palette.ember} />}
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
            <SectionTitle>Pending</SectionTitle>
            {chests.pending.length === 0 && <EmptyState title="No chests waiting." />}
            {chests.pending.map((selection) => (
                <Panel compact key={selection.id} style={styles.card}>
                    <Source selection={selection} />
                    <ChestPicker selection={selection} onOpened={replacePending} />
                </Panel>
            ))}

            <Divider />

            <SectionTitle>History</SectionTitle>
            {chests.history.length === 0 && <EmptyState title="Nothing opened yet." />}
            {chests.history.map((selection) => (
                <HistoryRow key={selection.id} selection={selection} />
            ))}
        </ScrollView>
    );
}

/** "From Test Hoarder · 2h ago". */
function Source({ selection, when = selection.createdAt }: { selection: GeoChestSelection; when?: string }) {
    const styles = useStyles();
    return (
        <Text style={styles.source}>
            From {selection.source.name} · {formatListedAgo(when)}
        </Text>
    );
}

/** An opened selection: which chest, what it cost, what was in it. */
function HistoryRow({ selection }: { selection: GeoChestSelection }) {
    const styles = useStyles();
    const opened = selection.opened;
    const chest = opened ? selection.chests[opened.index] : undefined;
    if (!opened || !chest) return null;
    const color = CHEST_TIER_COLORS[chest.tier];
    return (
        <Panel compact style={styles.card}>
            <View style={styles.historyHeader}>
                <Icon name="open-treasure-chest" size={22} color={color} />
                <Text style={[styles.chestName, { color }]}>{chest.name}</Text>
                <ChestCost cost={chest.cost} />
            </View>
            <Source selection={selection} when={opened.openedAt} />
            <RewardGrid items={opened.items} compact />
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 12,
        paddingBottom: 12,
    },
    loading: {
        paddingVertical: 32,
        alignItems: "center",
    },
    card: {
        gap: 10,
        padding: 14,
    },
    source: {
        color: p.textMuted,
        fontSize: 12,
    },
    historyHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    chestName: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
}));
