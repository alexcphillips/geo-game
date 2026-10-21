import { Pressable, ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import ItemTile from "@/features/items/components/ItemTile";
import type { InventoryItem } from "@/features/items/inventoryItems";
import { GEO_AUCTION_HOURS, geoAuctionFee } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { formatCoins } from "../market";
import { BIN_TAX_PERCENT, canAuction, quote, type SellDraft } from "../sell";
import { Field, NumberInput } from "@/components/NumberField/NumberField";
import { SaleBadge } from "./MarketRows";

type SellFormProps = {
    item: InventoryItem;
    draft: SellDraft;
    coins: number;
    onChange: (draft: SellDraft) => void;
    onReview: () => void;
};

/**
 * Sell, step two: how many, how it sells, and for how much.
 *
 * Prices can't go below what an NPC pays. Auctions pick a length, and its
 * listing fee is paid now. Buy-it-now has no timer; its tax is paid now too,
 * and then the seller gets the whole price when it sells.
 */
export default function SellForm({ item, draft, coins, onChange, onReview }: SellFormProps) {
    const palette = useTheme();
    const styles = useStyles();
    const isStack = item.quantity !== undefined;
    const auctionable = canAuction(item);
    const result = quote(item, draft, coins);
    const set = (patch: Partial<SellDraft>) => onChange({ ...draft, ...patch });
    const priceLabel = draft.type === "auction" ? "Starting bid" : isStack ? "Price each" : "Price";

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            alwaysBounceHorizontal={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
        >
            <View style={styles.itemRow}>
                <View style={styles.itemTile}>
                    <ItemTile item={item} showName={false} />
                </View>
                <View style={styles.itemText}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.muted}>
                        NPC pays {formatCoins(item.sellValue)}
                        {isStack ? " each" : ""}
                    </Text>
                </View>
            </View>

            {isStack && (
                <Field label="Quantity" hint={`You have ${formatCoins(item.quantity ?? 1)}`}>
                    <NumberInput
                        value={draft.quantity}
                        onChange={(quantity) => set({ quantity })}
                        accessibilityLabel="Quantity"
                    />
                </Field>
            )}

            <Field label="Sell by" hint={auctionable ? undefined : "Stacks sell buy-it-now only."}>
                <View style={styles.segments}>
                    <Segment
                        isOn={draft.type === "bin"}
                        onPress={() => set({ type: "bin" })}
                        color={palette.game.listingBuyNow}
                        icon="price-tag"
                        label="Buy now"
                    />
                    <Segment
                        isOn={draft.type === "auction"}
                        onPress={() => set({ type: "auction" })}
                        color={palette.game.listingAuction}
                        icon="gavel"
                        label="Auction"
                        disabled={!auctionable}
                    />
                </View>
            </Field>

            <Field label={priceLabel} hint={`At least ${formatCoins(item.sellValue)}`}>
                <NumberInput
                    value={draft.price}
                    onChange={(price) => set({ price })}
                    accessibilityLabel={priceLabel}
                    coins
                />
            </Field>

            {draft.type === "auction" ? (
                <Field label="Length" hint="The listing fee is paid now, win or lose.">
                    <View style={styles.segments}>
                        {GEO_AUCTION_HOURS.map((hours) => (
                            <Segment
                                key={hours}
                                isOn={draft.hours === hours}
                                onPress={() => set({ hours })}
                                color={palette.game.listingAuction}
                                label={`${hours}h`}
                                detail={`${formatCoins(geoAuctionFee(item.sellValue, hours))} fee`}
                            />
                        ))}
                    </View>
                </Field>
            ) : (
                <Field label={`${BIN_TAX_PERCENT}% tax`} hint="Paid now, sold or not. You get the whole price when it sells.">
                    <Text style={styles.taxLine}>
                        {formatCoins(result.tax)} coins now. Buyers pay {formatCoins(result.total)}, and you get all of it.
                    </Text>
                </Field>
            )}

            {result.problem && <Text style={styles.problem}>{result.problem}</Text>}

            <Button
                label="Review listing"
                variant="primary"
                size="large"
                onPress={onReview}
                disabled={result.problem !== null}
                trailing={<SaleBadge type={draft.type} />}
                stretch
            />
        </ScrollView>
    );
}

function Segment({
    isOn,
    onPress,
    color,
    label,
    icon,
    detail,
    disabled = false,
}: {
    isOn: boolean;
    onPress: () => void;
    color: string;
    label: string;
    icon?: "gavel" | "price-tag";
    detail?: string;
    disabled?: boolean;
}) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.segment,
                isOn && { borderColor: color, backgroundColor: palette.surfaceAlt },
                disabled && styles.segmentDisabled,
                pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isOn, disabled }}
        >
            <View style={styles.segmentTop}>
                {icon && <Icon name={icon} size={13} color={isOn ? color : palette.textMuted} />}
                <Text style={[styles.segmentText, isOn && { color }]}>{label}</Text>
            </View>
            {detail && <Text style={styles.segmentDetail}>{detail}</Text>}
        </Pressable>
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
        gap: 2,
    },
    itemName: {
        color: p.text,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    muted: {
        color: p.textMuted,
        fontSize: 12,
    },
    segments: {
        flexDirection: "row",
        gap: 6,
    },
    segment: {
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.outline,
    },
    segmentDisabled: {
        opacity: 0.35,
    },
    segmentTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    segmentText: {
        color: p.textMuted,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    segmentDetail: {
        color: p.textMuted,
        fontSize: 10,
    },
    taxLine: {
        color: p.text,
        fontSize: 13,
        lineHeight: 19,
    },
    problem: {
        color: p.danger,
        fontSize: 13,
        textAlign: "center",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
