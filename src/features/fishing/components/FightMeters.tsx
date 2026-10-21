import { Text, View } from "react-native";
import { traitLabel } from "@/features/fishing/fishingText";
import type { GeoFishingFightView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * The fight's numbers, over the top of the scene: Tension with its sweet
 * zone, Distance, the fish's Stamina, and your Finesse as ✦ marks. Finesse
 * shows its influence, never the tier it adds up to: quality stays a
 * surprise until the fish lands.
 */
export default function FightMeters({ fight }: { fight: GeoFishingFightView }) {
    const styles = useStyles();
    const palette = useTheme();
    const tensionColor =
        fight.tension > fight.cap * 0.9
            ? palette.game.tensionDanger
            : fight.tension > fight.zoneHigh
              ? palette.game.tensionHigh
              : fight.tension < fight.zoneLow
                ? palette.game.tensionSlack
                : palette.game.tensionZone;
    const pastPar = fight.turn >= fight.par;

    return (
        <View style={styles.panel}>
            <View style={styles.grid}>
                <Meter
                    label="Tension"
                    value={`${fmt(fight.tension)}/${fight.cap}`}
                    share={fight.tension / fight.cap}
                    color={tensionColor}
                    zone={{ from: fight.zoneLow / fight.cap, to: fight.zoneHigh / fight.cap }}
                />
                <Meter
                    label="Distance"
                    value={`${fmt(fight.distance)}m · runs at ${fight.maxDistance}`}
                    share={fight.distance / fight.maxDistance}
                    color={palette.ember}
                />
                <Meter
                    label="Fish stamina"
                    value={fight.exhausted ? "Exhausted" : `${fmt(fight.stamina)}/${fight.maxStamina}`}
                    share={fight.stamina / fight.maxStamina}
                    color={palette.game.fishStamina}
                />
                <View style={styles.meter}>
                    <View style={styles.meterTop}>
                        <Text style={styles.label}>Finesse</Text>
                        <Text style={[styles.value, pastPar && styles.warn]}>
                            Turn {fight.turn + 1} · par {fight.par}
                        </Text>
                    </View>
                    <FinesseMarks finesse={fight.finesse} />
                </View>
            </View>
            <StatusChips fight={fight} />
        </View>
    );
}

function Meter({
    label,
    value,
    share,
    color,
    zone,
}: {
    label: string;
    value: string;
    share: number;
    color: string;
    zone?: { from: number; to: number };
}) {
    const styles = useStyles();
    const clamped = Math.min(1, Math.max(0, share));
    return (
        <View style={styles.meter} accessible accessibilityLabel={`${label} ${value}`}>
            <View style={styles.meterTop}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value} numberOfLines={1}>
                    {value}
                </Text>
            </View>
            <View style={styles.track}>
                {zone && (
                    <View style={[styles.zone, { left: `${zone.from * 100}%`, width: `${(zone.to - zone.from) * 100}%` }]} />
                )}
                <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
                {zone && <View style={[styles.marker, { left: `${clamped * 100}%` }]} />}
            </View>
        </View>
    );
}

/** ✦ per point of Finesse, ▼ per point below zero. */
function FinesseMarks({ finesse }: { finesse: number }) {
    const styles = useStyles();
    const marks = Math.round(finesse);
    return (
        <Text
            style={styles.marks}
            numberOfLines={1}
            accessibilityLabel={marks === 0 ? "No Finesse yet" : `Finesse ${marks}`}
        >
            {marks > 0 ? (
                <Text style={styles.up}>{"✦".repeat(Math.min(16, marks))}</Text>
            ) : marks < 0 ? (
                <Text style={styles.down}>{"▼".repeat(Math.min(10, -marks))}</Text>
            ) : (
                <Text style={styles.none}>none yet</Text>
            )}
        </Text>
    );
}

function StatusChips({ fight }: { fight: GeoFishingFightView }) {
    const palette = useTheme();
    const styles = useStyles();
    const { hooked, momentum, focus, tired, reading } = fight.statuses;
    const chips: { text: string; color?: string }[] = [];
    if (fight.exhausted) chips.push({ text: "Exhausted", color: palette.game.fishStamina });
    if (fight.frenzy) chips.push({ text: "Frenzy", color: palette.game.tensionDanger });
    if (hooked) chips.push({ text: `Hook set ${hooked}` });
    if (momentum) chips.push({ text: `Momentum ${momentum}` });
    if (focus) chips.push({ text: `Focus ${focus}` });
    if (tired) chips.push({ text: "Tired" });
    if (reading) chips.push({ text: `Reading ${reading}` });
    for (const trait of fight.traits) chips.push({ text: traitLabel(trait), color: palette.game.rarityEpic });
    if (chips.length === 0) return null;
    return (
        <View style={styles.chips}>
            {chips.map((chip) => (
                <Text key={chip.text} style={[styles.chip, chip.color ? { color: chip.color, borderColor: chip.color } : null]}>
                    {chip.text}
                </Text>
            ))}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    panel: {
        gap: 8,
        marginHorizontal: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: 8,
        columnGap: 14,
    },
    meter: {
        width: "47%",
        flexGrow: 1,
        gap: 4,
    },
    meterTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 6,
    },
    label: {
        color: p.textMuted,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    value: {
        flexShrink: 1,
        color: p.text,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    warn: {
        color: p.game.tensionHigh,
    },
    track: {
        height: 8,
        borderRadius: 4,
        backgroundColor: p.track,
        overflow: "hidden",
    },
    zone: {
        position: "absolute",
        top: 0,
        bottom: 0,
        backgroundColor: "rgba(79, 179, 191, 0.25)",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: p.game.tensionZone,
    },
    fill: {
        height: "100%",
        borderRadius: 4,
        opacity: 0.9,
    },
    marker: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 2,
        marginLeft: -1,
        backgroundColor: p.text,
    },
    marks: {
        fontSize: 12,
        lineHeight: 15,
        letterSpacing: 1,
    },
    up: {
        color: p.game.tierGold,
    },
    down: {
        color: p.game.tensionDanger,
    },
    none: {
        color: p.textMuted,
        fontSize: 11,
        fontStyle: "italic",
        letterSpacing: 0,
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
    },
    chip: {
        paddingHorizontal: 7,
        paddingVertical: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
        color: p.text,
        fontSize: 10,
        fontFamily: FONTS.bodyBold,
        overflow: "hidden",
    },
}));
