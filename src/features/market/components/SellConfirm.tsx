import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { colors } from "@/theme/colors";
import { formatCoins } from "../market";
import { BIN_TAX_PERCENT, quote, type SellDraft } from "../sell";
import { SaleBadge } from "./MarketRows";

type SellConfirmProps = {
    item: InventoryItem;
    draft: SellDraft;
    coins: number;
    onConfirm: () => void;
};

/**
 * Sell, step three: everything the listing will do, in coins, before it's
 * listed. The tax line spells out the consequence of the seller's choice —
 * less than they asked, or a higher price than they typed — since that's
 * the number most likely to surprise them.
 */
export default function SellConfirm({ item, draft, coins, onConfirm }: SellConfirmProps) {
    const result = quote(item, draft, coins);
    const isStack = item.quantity !== undefined;
    const isAuction = draft.type === "auction";

    // [label, value, whether the value is coins]
    type Row = [label: string, value: string, isCoins: boolean];
    const rows: Row[] = isAuction
        ? [
              ["Starting bid", formatCoins(result.unitPrice), true],
              ["Length", `${draft.hours} hours`, false],
              ["Listing fee, paid now", formatCoins(result.listingFee), true],
              ["Your coins after", formatCoins(coins - result.listingFee), true],
          ]
        : [
              ...(isStack ? [["Price each", formatCoins(result.unitPrice), true] satisfies Row] : []),
              ["Asking", formatCoins(result.total), true],
              [`${BIN_TAX_PERCENT}% tax, paid now`, formatCoins(result.tax), true],
              ["Your coins after", formatCoins(coins - result.tax), true],
              ["You get when it sells", formatCoins(result.sellerGets ?? 0), true],
          ];

    const warning = isAuction
        ? `The ${formatCoins(result.listingFee)}-coin fee is not refunded if nobody bids.`
        : `The ${formatCoins(result.tax)}-coin tax is not refunded if it doesn't sell or you cancel.`;

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} alwaysBounceHorizontal={false}>
            <View style={styles.itemRow}>
                <View style={styles.itemTile}>
                    <ItemTile item={{ ...item, quantity: isStack ? result.quantity : undefined }} compact />
                </View>
                <View style={styles.itemText}>
                    <Text style={styles.itemName}>
                        {item.name}
                        {isStack ? ` ×${formatCoins(result.quantity)}` : ""}
                    </Text>
                    <SaleBadge type={draft.type} />
                </View>
            </View>

            <View
                style={[
                    styles.panel,
                    { borderLeftColor: isAuction ? colors.listingAuction : colors.listingBuyNow },
                ]}
            >
                {rows.map(([label, value, isCoins]) => (
                    <View key={label} style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <View style={styles.rowValue}>
                            {isCoins && <Icon name="two-coins" size={13} color={colors.coins} />}
                            <Text style={[styles.rowValueText, !isCoins && styles.rowValuePlain]}>
                                {value}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.warning}>
                <Icon name="info" size={16} color={colors.emberBright} />
                <Text style={styles.warningText}>{warning}</Text>
            </View>

            <Pressable
                onPress={onConfirm}
                disabled={result.problem !== null}
                style={({ pressed }) => [
                    styles.primary,
                    result.problem !== null && styles.primaryDisabled,
                    pressed && styles.pressed,
                ]}
                accessibilityRole="button"
            >
                <Text style={styles.primaryText}>
                    {`Pay ${formatCoins(result.listingFee)} and list`}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 16,
        paddingBottom: 12,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    itemTile: {
        width: 66,
    },
    itemText: {
        flex: 1,
        gap: 4,
    },
    itemName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: "700",
    },
    panel: {
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    rowValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    rowValueText: {
        color: colors.coins,
        fontSize: 15,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    rowValuePlain: {
        color: colors.textPrimary,
    },
    warning: {
        flexDirection: "row",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.ember,
    },
    warningText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 18,
    },
    primary: {
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryDisabled: {
        opacity: 0.4,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "800",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
