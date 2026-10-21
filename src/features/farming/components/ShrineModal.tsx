import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import { Hint } from "@/components/Text/Text";
import type { GeoFarmAction, GeoItemView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type ShrineModalProps = {
    tile: number;
    items: Record<string, GeoItemView>;
    /** How many of each item the player holds. */
    held: Record<string, number>;
    busy: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    onClose: () => void;
};

/**
 * The Mysterious Shrine: offer materials from the inventory. The more
 * they're worth to an NPC, the better the odds of a blessing, but never
 * certain, and a failed roll can be a curse. What it said shows in the log.
 */
export default function ShrineModal({ tile, items, held, busy, act, onClose }: ShrineModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    const offerable = Object.entries(held)
        .flatMap(([itemId, quantity]) => {
            const item = items[itemId];
            return item && item.kind === "material" && item.sellValue > 0 && quantity > 0 ? [{ item, quantity }] : [];
        })
        .sort((a, b) => b.item.sellValue - a.item.sellValue);

    const offer = (itemId: string, quantity: number) => {
        onClose();
        void act({ type: "offer", tile, itemId, quantity });
    };

    return (
        <Modal title="Mysterious Shrine" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Hint>
                    Lay something on the stone. The more it&apos;s worth, the likelier a blessing. It never promises, and sometimes it answers with a curse.
                </Hint>
                {offerable.map(({ item, quantity }) => (
                    <View key={item.id} style={styles.row}>
                        <Icon name={item.icon in GAME_ICONS ? (item.icon as keyof typeof GAME_ICONS) : "chest"} size={24} color={palette.text} />
                        <View style={styles.text}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Hint>
                                Worth {item.sellValue} each · you have {quantity}
                            </Hint>
                        </View>
                        <OfferButton label="1" disabled={busy} onPress={() => offer(item.id, 1)} />
                        {quantity > 1 && <OfferButton label={`All ${quantity}`} disabled={busy} onPress={() => offer(item.id, quantity)} />}
                    </View>
                ))}
                {offerable.length === 0 && <Hint>You have nothing the Shrine wants.</Hint>}
            </ScrollView>
        </Modal>
    );
}

function OfferButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return <Button label={label} size="small" variant="primary" onPress={onPress} disabled={disabled} accessibilityLabel={`Offer ${label}`} />;
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
    name: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
}));
