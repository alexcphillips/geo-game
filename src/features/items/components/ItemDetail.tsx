import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import { SectionTitle } from "@/components/Text/Text";
import CraftingModal from "@/features/crafting/components/CraftingModal";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { CARD_SKILLS } from "@/features/cards/cardSkills";
import { INVENTORY_TABS, isFaded, type InventoryItem } from "../inventoryItems";
import { QUALITY_TIER_COLORS, QUALITY_TIER_LABELS } from "@/features/fishing/fishingText";
import { rarityInfo } from "../rarity";
import ItemArt from "./ItemArt";

type ItemDetailProps = {
    item: InventoryItem;
    /** Shown under the item's name, e.g. an Equip button. */
    action?: ReactNode;
    /**
     * What the Usage button does. Omitted, it opens the Usage menu over
     * this screen; inside that menu, it moves to this item's usage page.
     */
    onUsage?: () => void;
};

/** e.g. "8 Oct 2026". Locale-aware, so it reads naturally wherever you are. */
function formatObtained(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * One item, in full: the item, its blurb, stats and info, then effects.
 *
 * Shown in place of the grid inside the inventory modal; back returns to the
 * grid. Effects are a separate section in yellow, below the stats, because
 * they change what the player does rather than a number in a calculation.
 * Card unlocks from equipment are listed first in that section.
 */
export default function ItemDetail({ item, action, onUsage }: ItemDetailProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [isUsageOpen, setIsUsageOpen] = useState(false);
    const faded = isFaded(item);
    const charges = item.charges;
    const tabLabel =
        item.equipSlot === "talisman"
            ? "Talisman"
            : item.tab === "pets"
              ? "Pet"
              : INVENTORY_TABS.find((tab) => tab.id === item.tab)?.label;
    const rarity = rarityInfo(item.rarity);
    const skillLabel = CARD_SKILLS.find((skill) => skill.id === item.skill)?.label;
    const unlocks = item.unlocksCards ?? [];
    const effects = item.effects ?? [];

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            alwaysBounceHorizontal={false}
            showsHorizontalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <View style={[styles.iconFrame, faded && styles.iconFrameFaded]}>
                    <ItemArt item={item} size={64} color={faded ? palette.textMuted : palette.ember} />
                </View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.category}>
                    <Text style={{ color: rarity.color }}>{rarity.label}</Text>
                    {" · "}
                    {skillLabel
                        ? `${skillLabel} ${item.tab === "cards" ? "card" : "material"}`
                        : tabLabel}
                    {item.quantity !== undefined && item.quantity > 1
                        ? ` · ×${item.quantity}`
                        : ""}
                </Text>
                {item.quality && (
                    <Text style={styles.category}>
                        <Text style={{ color: QUALITY_TIER_COLORS[item.quality], fontWeight: "700" }}>
                            {QUALITY_TIER_LABELS[item.quality]} quality
                        </Text>
                        {item.soulbound ? " · Soulbound: can't be traded or sold" : ""}
                    </Text>
                )}
                {faded && (
                    <Text style={styles.fadedBanner}>
                        Faded — out of charges. It can be sold, shattered for
                        materials, or sacrificed, but never played again.
                    </Text>
                )}
            </View>

            {action}

            <Pressable
                onPress={onUsage ?? (() => setIsUsageOpen(true))}
                style={({ pressed }) => [styles.usage, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Usage: how it's obtained and what it's used in"
            >
                <Icon name="anvil" size={15} color={palette.ember} />
                <Text style={styles.usageText}>Usage</Text>
            </Pressable>

            <Text style={styles.description}>{item.description}</Text>

            <SectionTitle>Stats</SectionTitle>
            <Panel compact style={styles.table}>
                {charges && (
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Charges</Text>
                        <View style={styles.chargeValue}>
                            <View style={styles.chargeTrack}>
                                <View
                                    style={[
                                        styles.chargeFill,
                                        { width: `${(charges.remaining / charges.max) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.rowValue, faded && styles.fadedValue]}>
                                {charges.remaining}/{charges.max}
                            </Text>
                        </View>
                    </View>
                )}
                {item.stats.map((stat) => (
                    <View key={stat.label} style={styles.row}>
                        <Text style={styles.rowLabel}>{stat.label}</Text>
                        <Text style={styles.rowValue}>{stat.value}</Text>
                    </View>
                ))}
                <View style={[styles.row, styles.rowLast]}>
                    <Text style={styles.rowLabel}>Obtained</Text>
                    <Text style={styles.rowValue}>{formatObtained(item.obtainedAt)}</Text>
                </View>
            </Panel>

            {(unlocks.length > 0 || effects.length > 0) && (
                <>
                    <SectionTitle>Effects</SectionTitle>
                    <View style={styles.effects}>
                        {/* Card unlocks lead the section: for equipment they
                            are the effect that matters most. */}
                        {unlocks.map((card) => (
                            <View key={`unlock-${card}`} style={styles.unlock}>
                                <Icon name="card-pick" size={16} color={palette.game.effect} />
                                <Text style={styles.effect}>Unlocks card: {card}</Text>
                            </View>
                        ))}
                        {effects.map((effect) => (
                            <Text key={effect} style={styles.effect}>
                                {effect}
                            </Text>
                        ))}
                    </View>
                </>
            )}
            {isUsageOpen && (
                <CraftingModal
                    itemId={item.itemId}
                    onClose={() => setIsUsageOpen(false)}
                    renderDetail={(shown, showUsage) => <ItemDetail item={shown} onUsage={showUsage} />}
                />
            )}
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 10,
        paddingBottom: 12,
    },
    hero: {
        alignItems: "center",
        gap: 6,
        paddingTop: 4,
    },
    iconFrame: {
        width: 104,
        height: 104,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: p.surfaceAlt,
        borderWidth: 1.5,
        borderColor: p.ember,
        marginBottom: 4,
    },
    iconFrameFaded: {
        borderColor: p.outline,
        opacity: 0.6,
    },
    name: {
        color: p.text,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
        textAlign: "center",
    },
    category: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    fadedBanner: {
        marginTop: 4,
        color: p.textMuted,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
        fontStyle: "italic",
    },
    usage: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.ember,
    },
    usageText: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    description: {
        color: p.text,
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
        marginVertical: 4,
    },
    table: {
        gap: 0,
        paddingHorizontal: 14,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: p.outline,
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowLabel: {
        color: p.textMuted,
        fontSize: 13,
    },
    rowValue: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
        fontVariant: ["tabular-nums"],
    },
    fadedValue: {
        color: p.textMuted,
    },
    chargeValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    chargeTrack: {
        width: 72,
        height: 5,
        borderRadius: 3,
        backgroundColor: p.track,
        overflow: "hidden",
    },
    chargeFill: {
        height: "100%",
        backgroundColor: p.ember,
    },
    effects: {
        gap: 6,
    },
    unlock: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    effect: {
        flexShrink: 1,
        color: p.game.effect,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
        lineHeight: 20,
    },
}));
