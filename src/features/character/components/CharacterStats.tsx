import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useStats } from "@/features/player/usePlayer";
import type { GeoStatGroup, GeoStatLine } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";

const GROUPS: { id: GeoStatGroup; label: string }[] = [
    { id: "combat", label: "Combat" },
    { id: "fishing", label: "Fishing" },
    { id: "farming", label: "Farming" },
];

const GAP = 8;
const TOOLTIP_WIDTH = 220;
/** Keeps the tooltip off the screen's edges. */
const EDGE = 12;

/** Where the tapped cell sits on screen, to hang the tooltip under it. */
type Anchor = { x: number; y: number; width: number; height: number };

/**
 * The character screen's Stats tab: every stat's total, two to a row, by
 * skill. The server sums them as its rules read them, so what's shown is
 * what counts. Tapping a stat opens a tooltip under it saying what it does
 * and where the total comes from — Base, Equipment, Talismans, Pet and so on.
 */
export default function CharacterStats() {
    const styles = useStyles();
    const stats = useStats();
    const [open, setOpen] = useState<{ line: GeoStatLine; anchor: Anchor } | null>(null);

    return (
        <View style={styles.container}>
            {GROUPS.map((group) => {
                const lines = stats.filter((line) => line.group === group.id);
                if (lines.length === 0) return null;
                return (
                    <View key={group.id} style={styles.group}>
                        <Text style={styles.groupLabel}>{group.label}</Text>
                        <View style={styles.grid}>
                            {lines.map((line) => (
                                <StatCell
                                    key={line.id}
                                    line={line}
                                    isOpen={open?.line.id === line.id}
                                    onPress={(anchor) => setOpen({ line, anchor })}
                                />
                            ))}
                        </View>
                    </View>
                );
            })}

            {open && <StatTooltip line={open.line} anchor={open.anchor} onClose={() => setOpen(null)} />}
        </View>
    );
}

function StatCell({
    line,
    isOpen,
    onPress,
}: {
    line: GeoStatLine;
    isOpen: boolean;
    onPress: (anchor: Anchor) => void;
}) {
    const styles = useStyles();
    const ref = useRef<View>(null);
    return (
        <View style={styles.cellWrap}>
            <Pressable
                ref={ref}
                onPress={() => ref.current?.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }))}
                style={({ pressed }) => [styles.cell, (pressed || isOpen) && styles.cellActive]}
                accessibilityRole="button"
                accessibilityLabel={`${line.label} ${line.value}`}
                accessibilityHint="Shows where this stat comes from"
            >
                <Text style={styles.cellLabel} numberOfLines={2}>
                    {line.label}
                </Text>
                <Text style={styles.cellValue}>{line.value}</Text>
            </Pressable>
        </View>
    );
}

/** The breakdown, under the tapped cell (or over it, near the bottom). Tap anywhere to close. */
function StatTooltip({ line, anchor, onClose }: { line: GeoStatLine; anchor: Anchor; onClose: () => void }) {
    const styles = useStyles();
    const window = useWindowDimensions();
    const [height, setHeight] = useState(0);
    const left = Math.min(
        Math.max(EDGE, anchor.x + anchor.width / 2 - TOOLTIP_WIDTH / 2),
        window.width - TOOLTIP_WIDTH - EDGE,
    );
    const below = anchor.y + anchor.height + 6;
    const top = below + height > window.height - EDGE ? anchor.y - height - 6 : below;

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
            <View
                style={[styles.tooltip, { left, top, opacity: height ? 1 : 0 }]}
                onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
                pointerEvents="none"
            >
                <View style={styles.tooltipHeader}>
                    <Text style={styles.tooltipTitle}>{line.label}</Text>
                    <Text style={styles.tooltipTotal}>{line.value}</Text>
                </View>
                {!!line.description && <Text style={styles.tooltipDescription}>{line.description}</Text>}
                {line.sources.map((source) => (
                    <View key={source.label} style={styles.tooltipRow}>
                        <Text style={styles.tooltipLabel}>{source.label}</Text>
                        <Text style={styles.tooltipValue}>{source.value}</Text>
                    </View>
                ))}
            </View>
        </Modal>
    );
}

const useStyles = createStyles((p) => ({
    container: {
        gap: 20,
    },
    group: {
        gap: 8,
    },
    groupLabel: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    // Negative margin cancels the cells' outer padding, as in the menu grid.
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -GAP / 2,
    },
    cellWrap: {
        width: "50%",
        padding: GAP / 2,
    },
    cell: {
        flex: 1,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: p.surfaceAlt,
        ...inked(p),
    },
    cellActive: {
        borderColor: p.ember,
    },
    cellLabel: {
        flex: 1,
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    cellValue: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    tooltip: {
        position: "absolute",
        width: TOOLTIP_WIDTH,
        padding: 12,
        gap: 6,
        borderRadius: 10,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.ember,
    },
    tooltipHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
        paddingBottom: 6,
        marginBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: p.outline,
    },
    tooltipTitle: {
        flex: 1,
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    tooltipTotal: {
        color: p.text,
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    tooltipDescription: {
        color: p.text,
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 4,
    },
    tooltipRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    tooltipLabel: {
        color: p.textMuted,
        fontSize: 12,
    },
    tooltipValue: {
        color: p.game.effect,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
        fontVariant: ["tabular-nums"],
    },
}));
