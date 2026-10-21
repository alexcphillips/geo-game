import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import { Hint } from "@/components/Text/Text";
import type { GeoFarmAction, GeoFarmView, GeoItemView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

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
    const styles = useStyles();
    const palette = useTheme();
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
                <Hint>Bring me pests alive, in a cage. Each pays points; I keep the pest, so no drops.</Hint>

                <Text style={styles.heading}>Caged</Text>
                {caged.map(({ tile, pest }) => (
                    <View key={tile} style={styles.row}>
                        <Icon name={iconOf(pest.icon)} size={24} color={palette.text} />
                        <View style={styles.text}>
                            <Text style={styles.name}>{pest.name}</Text>
                            <Hint>Worth {pest.bounty} points</Hint>
                        </View>
                        <RowButton label="Turn in" disabled={busy} onPress={() => void act({ type: "turn-in", tile })} />
                    </View>
                ))}
                {caged.length === 0 && <Hint>No pests caged. Build a Pest Cage and catch one with Cage.</Hint>}

                <Text style={styles.heading}>Shop</Text>
                {shop.map((offer, index) => {
                    const item = items[offer.itemId];
                    return (
                        <View key={offer.itemId} style={styles.row}>
                            <Icon name={iconOf(item?.icon ?? "")} size={24} color={palette.text} />
                            <View style={styles.text}>
                                <Text style={styles.name}>{item?.name ?? offer.itemId}</Text>
                                <Hint>{offer.price} points</Hint>
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
    return <Button label={label} size="small" variant="primary" onPress={onPress} disabled={disabled} />;
}

const useStyles = createStyles((p) => ({
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
        color: p.text,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    heading: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        marginTop: 4,
    },
    name: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
}));
