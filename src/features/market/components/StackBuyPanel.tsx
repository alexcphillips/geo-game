import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { geoStackCost } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { formatCoins, totalForSale, type MarketProduct } from "../market";
import { Field, NumberInput } from "./FormFields";

/**
 * Buying from a stack: how many, what that costs from the cheapest offers up,
 * and Buy. The cost shown is sent along, so if prices move before the tap
 * lands the server refuses rather than charging more.
 */
export default function StackBuyPanel({
    product,
    coins,
    isBusy,
    onBuy,
}: {
    product: MarketProduct;
    coins: number;
    isBusy: boolean;
    onBuy: (quantity: number, total: number) => void;
}) {
    const [text, setText] = useState("1");
    const available = totalForSale(product);
    const quantity = Number(text) || 0;
    const total = quantity > 0 ? geoStackCost(product.offers, quantity) : null;

    const problem =
        quantity < 1
            ? "Choose how many."
            : total === null
              ? `Only ${formatCoins(available)} for sale.`
              : total > coins
                ? `That costs ${formatCoins(total)}. You have ${formatCoins(coins)}.`
                : null;
    const canBuy = problem === null && !isBusy && total !== null;

    return (
        <View style={styles.wrap}>
            <Field label="How many" hint={`${formatCoins(available)} for sale, cheapest first`}>
                <NumberInput value={text} onChange={setText} accessibilityLabel="How many to buy" />
            </Field>
            <Pressable
                onPress={() => total !== null && onBuy(quantity, total)}
                disabled={!canBuy}
                style={({ pressed }) => [styles.primary, !canBuy && styles.disabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canBuy }}
            >
                <Text style={styles.primaryText}>Buy {formatCoins(quantity)}</Text>
                <Icon name="coins" size={15} color={colors.textOnEmber} />
                <Text style={styles.primaryText}>{formatCoins(total ?? 0)}</Text>
            </Pressable>
            {problem && <Text style={styles.hint}>{problem}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 8,
    },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
    },
    disabled: {
        opacity: 0.4,
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: "center",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
});
