import { ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/items/components/ItemTile";
import type { InventoryItem } from "@/features/items/inventoryItems";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
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
    const styles = useStyles();
    const palette = useTheme();
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
                    <ItemTile item={{ ...item, quantity: isStack ? result.quantity : undefined }} showName={false} />
                </View>
                <View style={styles.itemText}>
                    <Text style={styles.itemName}>
                        {item.name}
                        {isStack ? ` ×${formatCoins(result.quantity)}` : ""}
                    </Text>
                    <SaleBadge type={draft.type} />
                </View>
            </View>

            <Panel compact
                style={[
                    styles.panel,
                    { borderLeftColor: isAuction ? palette.game.listingAuction : palette.game.listingBuyNow },
                ]}
            >
                {rows.map(([label, value, isCoins]) => (
                    <View key={label} style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <View style={styles.rowValue}>
                            {isCoins && <Icon name="two-coins" size={13} color={palette.reward} />}
                            <Text style={[styles.rowValueText, !isCoins && styles.rowValuePlain]}>
                                {value}
                            </Text>
                        </View>
                    </View>
                ))}
            </Panel>

            <View style={styles.warning}>
                <Icon name="info" size={16} color={palette.ember} />
                <Text style={styles.warningText}>{warning}</Text>
            </View>

            <Button
                label={`Pay ${formatCoins(result.listingFee)} and list`}
                variant="primary"
                size="large"
                onPress={onConfirm}
                disabled={result.problem !== null}
                stretch
            />
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
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
        color: p.text,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    panel: {
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderLeftWidth: 3,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLabel: {
        color: p.textMuted,
        fontSize: 13,
    },
    rowValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    rowValueText: {
        color: p.reward,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    rowValuePlain: {
        color: p.text,
    },
    warning: {
        flexDirection: "row",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.ember,
    },
    warningText: {
        flex: 1,
        color: p.text,
        fontSize: 13,
        lineHeight: 18,
    },
}));
