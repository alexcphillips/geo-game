import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import type { GeoFarmAction, GeoItemView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

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
                <Text style={styles.hint}>
                    Lay something on the stone. The more it&apos;s worth, the likelier a blessing. It never promises, and sometimes it answers with a curse.
                </Text>
                {offerable.map(({ item, quantity }) => (
                    <View key={item.id} style={styles.row}>
                        <Icon name={item.icon in GAME_ICONS ? (item.icon as keyof typeof GAME_ICONS) : "chest"} size={24} color={colors.textPrimary} />
                        <View style={styles.text}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.hint}>
                                Worth {item.sellValue} each · you have {quantity}
                            </Text>
                        </View>
                        <OfferButton label="1" disabled={busy} onPress={() => offer(item.id, 1)} />
                        {quantity > 1 && <OfferButton label={`All ${quantity}`} disabled={busy} onPress={() => offer(item.id, quantity)} />}
                    </View>
                ))}
                {offerable.length === 0 && <Text style={styles.hint}>You have nothing the Shrine wants.</Text>}
            </ScrollView>
        </Modal>
    );
}

function OfferButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Offer ${label}`}
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
