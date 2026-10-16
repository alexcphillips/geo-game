import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import type { GeoFarmAction, GeoFarmView, GeoItemView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

type PesthunterModalProps = {
    farm: GeoFarmView;
    items: Record<string, GeoItemView>;
    busy: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    onClose: () => void;
};

const iconOf = (name: string) => (name in GAME_ICONS ? (name as keyof typeof GAME_ICONS) : "chest");

/**
 * The Pesthunter: caged pests turned in for points (instead of letting them
 * out for their drops), and a small shop the points buy from. Works from
 * anywhere, like the Research Lab.
 */
export default function PesthunterModal({ farm, items, busy, act, onClose }: PesthunterModalProps) {
    const pestTypes = Object.fromEntries(farm.pestTypes.map((pest) => [pest.id, pest]));
    const caged = farm.tiles.flatMap((tile) => {
        const pest = tile.structure?.caged ? pestTypes[tile.structure.caged] : undefined;
        return pest ? [{ tile: tile.index, pest }] : [];
    });
    const { points, shop } = farm.pesthunter;

    return (
        <Modal title="Pesthunter" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Text style={styles.points}>{points} Pesthunter points</Text>
                <Text style={styles.hint}>Bring me pests alive, in a cage. Each pays points; I keep the pest, so no drops.</Text>

                <Text style={styles.heading}>Caged</Text>
                {caged.map(({ tile, pest }) => (
                    <View key={tile} style={styles.row}>
                        <Icon name={iconOf(pest.icon)} size={24} color={colors.textPrimary} />
                        <View style={styles.text}>
                            <Text style={styles.name}>{pest.name}</Text>
                            <Text style={styles.hint}>Worth {pest.bounty} points</Text>
                        </View>
                        <RowButton label="Turn in" disabled={busy} onPress={() => void act({ type: "turn-in", tile })} />
                    </View>
                ))}
                {caged.length === 0 && <Text style={styles.hint}>No pests caged. Build a Pest Cage and catch one with Cage.</Text>}

                <Text style={styles.heading}>Shop</Text>
                {shop.map((offer, index) => {
                    const item = items[offer.itemId];
                    return (
                        <View key={offer.itemId} style={styles.row}>
                            <Icon name={iconOf(item?.icon ?? "")} size={24} color={colors.textPrimary} />
                            <View style={styles.text}>
                                <Text style={styles.name}>{item?.name ?? offer.itemId}</Text>
                                <Text style={styles.hint}>{offer.price} points</Text>
                            </View>
                            <RowButton
                                label="Buy"
                                disabled={busy || points < offer.price}
                                onPress={() => void act({ type: "pesthunter-buy", offer: index })}
                            />
                        </View>
                    );
                })}
            </ScrollView>
        </Modal>
    );
}

function RowButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 12,
        paddingBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    text: {
        flex: 1,
    },
    points: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: "700",
    },
    heading: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
        marginTop: 4,
    },
    name: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        backgroundColor: colors.cropMutant,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.textOnEmber,
        fontWeight: "700",
        fontSize: 12,
    },
    pressed: {
        opacity: 0.75,
    },
});
