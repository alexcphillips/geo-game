import { Image, Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { SLOT_SIZE } from "@/features/character/components/EquipmentSlot";
import { rarityInfo } from "@/features/inventory/rarity";
import { useActivePetId, useInventory } from "@/features/player/usePlayer";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme, inked } from "@/theme/theme";
import { petArt } from "../petArt";

type PetSlotProps = {
    /** Opens the roster, to pick the active pet. */
    onPress: () => void;
    /** Hold with a pet out: opens that pet's page. */
    onLongPress: (petId: string) => void;
};

/**
 * The active pet on the character screen's paper doll, sized and drawn like
 * an equipment slot since the pet is part of the build. It isn't a server
 * equipment slot: the pet is whichever one is active. Shows its art in its
 * rarity colour with its level, or "Pet" when none is out.
 */
export default function PetSlot({ onPress, onLongPress }: PetSlotProps) {
    const styles = useStyles();
    const palette = useTheme();
    const activeId = useActivePetId();
    const pet = useInventory().find((item) => item.id === activeId && item.pet);
    const art = petArt(pet?.petInfo?.image);

    return (
        <Pressable
            onPress={onPress}
            onLongPress={pet ? () => onLongPress(pet.id) : undefined}
            accessibilityRole="button"
            accessibilityLabel={pet ? `Pet slot, ${pet.name}, level ${pet.pet?.level}` : "Pet slot, empty"}
            accessibilityHint={pet ? "Hold for details" : undefined}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
            <View style={[styles.square, pet && { borderColor: rarityInfo(pet.rarity).color }]}>
                {pet ? (
                    art ? (
                        <Image source={art} style={styles.art} resizeMode="contain" />
                    ) : (
                        <Icon name={pet.icon} size={40} color={palette.ember} />
                    )
                ) : (
                    <Text style={styles.label}>Pet</Text>
                )}
                {pet?.pet && <Text style={styles.level}>Lv {pet.pet.level}</Text>}
            </View>
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    // Matches EquipmentSlot's square.
    square: {
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.surfaceAlt,
        ...inked(p),
        borderRadius: 14,
    },
    art: {
        width: SLOT_SIZE - 14,
        height: SLOT_SIZE - 14,
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.96 }],
    },
    label: {
        color: p.textMuted,
        fontSize: 10,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    level: {
        position: "absolute",
        right: 3,
        bottom: 2,
        color: p.text,
        fontSize: 9,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
        textShadowColor: "rgba(0, 0, 0, 0.95)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
}));
