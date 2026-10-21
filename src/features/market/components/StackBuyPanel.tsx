import { useState } from "react";
import { View } from "react-native";
import Button from "@/components/Button/Button";
import { Hint } from "@/components/Text/Text";
import { geoStackCost } from "@/lib/geo/contracts";
import { createStyles } from "@/theme/theme";
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
    const styles = useStyles();
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
            <Button
                label={`Buy ${formatCoins(quantity)} · ${formatCoins(total ?? 0)}`}
                variant="primary"
                size="large"
                icon="two-coins"
                onPress={() => total !== null && onBuy(quantity, total)}
                disabled={!canBuy}
                stretch
            />
            {problem && <Hint>{problem}</Hint>}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    wrap: {
        gap: 8,
    },
}));
