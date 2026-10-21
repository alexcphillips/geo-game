import { Pressable, ScrollView, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { HAND_SIZE } from "@/features/cards/cardSkills";
import type { MockCardBase } from "@/features/gathering/mockCards";
import { rarityInfo } from "@/features/inventory/rarity";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/**
 * PLACEHOLDER pre-Run hand picker for the gathering mocks: tick 6 of the
 * skill's mock card pool, then start. It stands in for the Deck's real hand
 * until these skills' cards exist on the server, so different kits can be
 * tried against each other.
 */
export default function KitPicker<C extends MockCardBase>({
    title,
    blurb,
    pool,
    kit,
    onChange,
    onStart,
}: {
    title: string;
    blurb: string;
    pool: C[];
    kit: string[];
    onChange: (kit: string[]) => void;
    onStart: () => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const toggle = (id: string) => {
        if (kit.includes(id)) onChange(kit.filter((k) => k !== id));
        else if (kit.length < HAND_SIZE) onChange([...kit, id]);
    };
    return (
        <View style={styles.panel}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.blurb}>{blurb}</Text>
            <Text style={styles.count}>
                Hand {kit.length}/{HAND_SIZE} · placeholder cards
            </Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {pool.map((card) => {
                    const on = kit.includes(card.id);
                    return (
                        <Pressable
                            key={card.id}
                            onPress={() => toggle(card.id)}
                            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                        >
                            <View style={[styles.icon, { borderColor: rarityInfo(card.rarity).color }]}>
                                <Icon name={card.icon} size={20} color={palette.ember} />
                            </View>
                            <View style={styles.rowText}>
                                <Text style={styles.name}>
                                    {card.name} <Text style={styles.role}>· {card.role} · {card.family}</Text>
                                </Text>
                                <Text style={styles.text}>{card.text}</Text>
                            </View>
                            <Text style={[styles.tick, on && styles.tickOn]}>{on ? "✓" : ""}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <View style={styles.start}>
                <OutcomeButton label={kit.length === HAND_SIZE ? "Start" : `Pick ${HAND_SIZE - kit.length} more`} onPress={kit.length === HAND_SIZE ? onStart : () => {}} primary={kit.length === HAND_SIZE} />
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    panel: {
        flex: 1,
        paddingHorizontal: 14,
        gap: 4,
    },
    title: {
        color: p.text,
        fontSize: 18,
        fontFamily: FONTS.bodyHeavy,
    },
    blurb: {
        color: p.textMuted,
        fontSize: 12,
    },
    count: {
        color: p.ember,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginTop: 4,
    },
    list: {
        flex: 1,
    },
    listContent: {
        gap: 6,
        paddingVertical: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    rowOn: {
        borderColor: p.ember,
        backgroundColor: p.surfaceAlt,
    },
    pressed: {
        opacity: 0.7,
    },
    icon: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
        borderWidth: 1.5,
        backgroundColor: p.surfaceAlt,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    role: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.body,
    },
    text: {
        color: p.textMuted,
        fontSize: 11,
    },
    tick: {
        width: 18,
        color: p.textMuted,
        fontSize: 16,
        textAlign: "center",
    },
    tickOn: {
        color: p.ember,
    },
    start: {
        alignItems: "center",
        paddingVertical: 8,
    },
}));
