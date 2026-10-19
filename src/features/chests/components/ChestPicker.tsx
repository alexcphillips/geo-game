import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import RewardGrid from "@/features/inventory/components/RewardGrid";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { formatCoins } from "@/features/market/market";
import { usePlayerStore } from "@/features/player/playerStore";
import { useCoins } from "@/features/player/usePlayer";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import { toErrorMessage } from "@/lib/api";
import type { GeoChestOffer, GeoChestSelection } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { pendingChestActions } from "@/features/inbox/inboxStore";
import { chestsApi } from "../chestsApi";
import { CHEST_TIER_COLORS } from "../chestTiers";
import ChestTile, { ChestCost } from "./ChestTile";

/** What the picker needs of a selection: a fresh win has no dates yet. */
export type PickableSelection = Pick<GeoChestSelection, "id" | "chests" | "opened">;

/**
 * Choosing one chest of a selection: the closed chests, then one's details
 * and Open, then what it held. Opening is final — the server takes the cost,
 * hands over the items, and the other chests are gone, unseen.
 */
export default function ChestPicker({
    selection,
    onOpened,
    onInspect,
}: {
    selection: PickableSelection;
    onOpened: (selection: GeoChestSelection) => void;
    onInspect?: (item: InventoryItem) => void;
}) {
    const coins = useCoins();
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    const [focused, setFocused] = useState<number | null>(null);
    const [isOpening, setIsOpening] = useState(false);

    if (selection.opened) {
        const chest = selection.chests[selection.opened.index];
        return (
            <View style={styles.result}>
                {chest && <ChestHeading chest={chest} opened />}
                <RewardGrid items={selection.opened.items} onInspect={onInspect} />
                {onInspect && <Text style={styles.hint}>Hold a reward for details</Text>}
            </View>
        );
    }

    const chest = focused === null ? undefined : selection.chests[focused];
    if (focused !== null && chest) {
        const shortBy = chest.cost - coins;
        const open = async () => {
            setIsOpening(true);
            try {
                const { selection: opened } = await chestsApi.open(selection.id, focused);
                pendingChestActions.opened();
                void refreshPlayer();
                onOpened(opened);
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            } finally {
                setIsOpening(false);
            }
        };
        return (
            <View style={styles.detail}>
                <ChestHeading chest={chest} />
                <ChestCost cost={chest.cost} affordable={shortBy <= 0} />
                {chest.cost > 0 && (
                    <Text style={styles.balance}>
                        You have {formatCoins(coins)}
                        {shortBy > 0 ? ` · ${formatCoins(shortBy)} short` : ""}
                    </Text>
                )}
                <Text style={styles.hint}>Opening this one leaves the others behind.</Text>
                <View style={styles.actions}>
                    <OutcomeButton label="Back" onPress={() => setFocused(null)} />
                    {isOpening ? (
                        <ActivityIndicator color={colors.emberBright} style={styles.spinner} />
                    ) : shortBy > 0 ? (
                        <Text style={styles.cantOpen}>Not enough coins</Text>
                    ) : (
                        <OutcomeButton label="Open" onPress={() => void open()} primary />
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.choose}>
            <Text style={styles.label}>Choose one chest</Text>
            <View style={styles.chests}>
                {selection.chests.map((offer, index) => (
                    <ChestTile
                        key={index}
                        chest={offer}
                        affordable={offer.cost <= coins}
                        onPress={() => setFocused(index)}
                    />
                ))}
            </View>
        </View>
    );
}

function ChestHeading({ chest, opened = false }: { chest: GeoChestOffer; opened?: boolean }) {
    const color = CHEST_TIER_COLORS[chest.tier];
    const icon = opened ? "open-treasure-chest" : chest.cost === 0 ? "chest" : "locked-chest";
    return (
        <View style={styles.heading}>
            <Icon name={icon} size={opened ? 40 : 56} color={color} />
            <Text style={[styles.headingName, { color }]}>{chest.name}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    choose: {
        alignItems: "center",
        gap: 8,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    chests: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 10,
    },
    detail: {
        alignItems: "center",
        gap: 8,
    },
    heading: {
        alignItems: "center",
        gap: 4,
    },
    headingName: {
        fontSize: 16,
        fontWeight: "800",
    },
    balance: {
        color: colors.textSecondary,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    spinner: {
        paddingHorizontal: 24,
    },
    cantOpen: {
        color: colors.damage,
        fontSize: 13,
        fontWeight: "600",
    },
    result: {
        alignItems: "center",
        gap: 8,
    },
});
