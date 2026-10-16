import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import type { GeoChestOffer } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { CHEST_TIER_COLORS, chestCostLabel } from "../chestTiers";

/**
 * One closed chest to choose: its icon in the tier's colour, its name, and
 * what it costs to open. One the player can't pay for yet still opens its
 * details, with the cost in red, so they can see what they're missing.
 */
export default function ChestTile({
    chest,
    affordable,
    onPress,
}: {
    chest: GeoChestOffer;
    affordable: boolean;
    onPress: () => void;
}) {
    const color = CHEST_TIER_COLORS[chest.tier];
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.tile, { borderColor: color }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${chest.name}, ${chest.cost === 0 ? "free" : `${chest.cost} coins`}${affordable ? "" : ", can't afford yet"}`}
        >
            <Icon name={chest.cost === 0 ? "chest" : "locked-chest"} size={34} color={color} />
            <Text style={styles.name} numberOfLines={2}>
                {chest.name}
            </Text>
            <ChestCost cost={chest.cost} affordable={affordable} />
        </Pressable>
    );
}

/** "Free", or the coin icon and the cost, red when it can't be paid. */
export function ChestCost({ cost, affordable = true }: { cost: number; affordable?: boolean }) {
    return (
        <View style={styles.cost}>
            {cost > 0 && <Icon name="coins" size={13} color={affordable ? colors.coins : colors.damage} />}
            <Text style={[styles.costText, !affordable && styles.unaffordable]}>{chestCostLabel(cost)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    tile: {
        width: 92,
        alignItems: "center",
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: colors.surfaceRaised,
    },
    pressed: {
        transform: [{ scale: 0.95 }],
    },
    name: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
    cost: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    costText: {
        color: colors.coins,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    unaffordable: {
        color: colors.damage,
    },
});
