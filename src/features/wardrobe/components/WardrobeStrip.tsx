import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import Icon from "@/components/Icon/Icon";
import { playerActions } from "@/features/player/playerStore";
import { useWardrobe } from "@/features/player/usePlayer";
import type { GeoLoadout } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { AUTO_ICONS, defaultLoadoutName } from "../wardrobe";

type WardrobeStripProps = {
    /** Hold a loadout, or tap the cog: manage the wardrobe, open on that slot if given. */
    onManage: (slot?: number) => void;
};

/**
 * The wardrobe at the top of the character screen: one chip per loadout slot,
 * the one worn lit. Tap a saved loadout to wear it, an empty slot to save
 * what's worn there; hold one (or tap the cog) to rename, re-save, clear or
 * tag it for auto-swap.
 */
export default function WardrobeStrip({ onManage }: WardrobeStripProps) {
    const styles = useStyles();
    const palette = useTheme();
    const wardrobe = useWardrobe();
    const [busySlot, setBusySlot] = useState<number | null>(null);
    if (!wardrobe) return null;

    const run = async (slot: number, action: () => Promise<boolean>) => {
        setBusySlot(slot);
        await action();
        setBusySlot(null);
    };

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.strip}>
            {Array.from({ length: wardrobe.slots }, (_, slot) => {
                const loadout = wardrobe.loadouts.find((entry) => entry.slot === slot);
                return (
                    <LoadoutChip
                        key={slot}
                        loadout={loadout}
                        slot={slot}
                        isActive={wardrobe.activeSlot === slot}
                        isBusy={busySlot === slot}
                        disabled={busySlot !== null}
                        onPress={() => {
                            if (!loadout) void run(slot, () => playerActions.saveLoadout(slot, defaultLoadoutName(slot), true));
                            else if (wardrobe.activeSlot !== slot) void run(slot, () => playerActions.wearLoadout(slot));
                        }}
                        onLongPress={() => onManage(slot)}
                    />
                );
            })}
            <Pressable
                onPress={() => onManage()}
                style={({ pressed }) => [styles.chip, styles.manage, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Manage wardrobe"
                hitSlop={4}
            >
                <Icon name="cog" size={16} color={palette.textMuted} />
            </Pressable>
        </ScrollView>
    );
}

type LoadoutChipProps = {
    loadout: GeoLoadout | undefined;
    slot: number;
    isActive: boolean;
    isBusy: boolean;
    disabled: boolean;
    onPress: () => void;
    onLongPress: () => void;
};

function LoadoutChip({ loadout, slot, isActive, isBusy, disabled, onPress, onLongPress }: LoadoutChipProps) {
    const styles = useStyles();
    const palette = useTheme();
    const autoIcon = loadout?.autoFor ? AUTO_ICONS[loadout.autoFor] : null;

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.chip,
                !loadout && styles.chipEmpty,
                isActive && styles.chipActive,
                (pressed || isBusy) && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={
                loadout
                    ? `${loadout.name}${isActive ? ", worn" : ""}${loadout.autoFor ? `, auto for ${loadout.autoFor}` : ""}`
                    : `Empty loadout ${slot + 1}. Save what you're wearing here`
            }
            accessibilityHint="Hold to manage"
        >
            {autoIcon && <Icon name={autoIcon} size={12} color={isActive ? palette.onPrimary : palette.ember} />}
            <Text style={[styles.label, !loadout && styles.labelEmpty, isActive && styles.labelActive]} numberOfLines={1}>
                {loadout ? loadout.name : "+ Save"}
            </Text>
        </Pressable>
    );
}

const useStyles = createStyles((p) => ({
    // Out to the screen edges past the character screen's padding, so chips scroll edge to edge.
    scroller: {
        flexGrow: 0,
        marginHorizontal: -16,
        marginTop: -12,
        marginBottom: 12,
    },
    strip: {
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        maxWidth: 140,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.ember,
        backgroundColor: p.surfaceAlt,
    },
    chipEmpty: {
        borderStyle: "dashed",
        borderColor: p.outline,
        backgroundColor: "transparent",
    },
    chipActive: {
        backgroundColor: p.ember,
    },
    manage: {
        borderColor: p.outline,
        backgroundColor: "transparent",
    },
    pressed: {
        opacity: 0.6,
    },
    label: {
        flexShrink: 1,
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    labelEmpty: {
        color: p.textMuted,
    },
    labelActive: {
        color: p.onPrimary,
    },
}));
