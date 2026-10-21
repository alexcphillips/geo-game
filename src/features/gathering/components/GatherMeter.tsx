import { Text, View } from "react-native";
import { FONTS } from "@/theme/palette";
import type { Palette } from "@/theme/palette";
import { createStyles, inked } from "@/theme/theme";

/** One labelled bar for a gathering Run's HUD: Stability, Daylight, Noise… */
export default function GatherMeter({
    label,
    value,
    share,
    color,
    marker,
}: {
    label: string;
    value: string;
    share: number;
    color: string;
    /** A tick on the track, e.g. where the face starts to groan. */
    marker?: number;
}) {
    const styles = useStyles();
    const clamped = Math.min(1, Math.max(0, share));
    return (
        <View style={styles.meter} accessible accessibilityLabel={`${label} ${value}`}>
            <View style={styles.top}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value} numberOfLines={1}>
                    {value}
                </Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
                {marker !== undefined && <View style={[styles.marker, { left: `${marker * 100}%` }]} />}
            </View>
        </View>
    );
}

/** Small pills under a HUD for statuses: Gas 2, Rhythm, Groaning… */
export function StatusPills({ pills }: { pills: { text: string; color?: string }[] }) {
    const styles = useStyles();
    if (pills.length === 0) return null;
    return (
        <View style={styles.pills}>
            {pills.map((pill) => (
                <Text key={pill.text} style={[styles.pill, pill.color ? { color: pill.color, borderColor: pill.color } : null]}>
                    {pill.text}
                </Text>
            ))}
        </View>
    );
}

/** A HUD panel over a gathering scene, inked like the rest of the UI. */
export function hudPanel(p: Palette) {
    return {
        gap: 8,
        marginHorizontal: 10,
        padding: 10,
        borderRadius: 16,
        backgroundColor: p.surface,
        ...inked(p),
    } as const;
}

const useStyles = createStyles((p) => ({
    meter: {
        flex: 1,
        minWidth: "40%",
        gap: 4,
    },
    top: {
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
    track: {
        height: 8,
        borderRadius: 4,
        backgroundColor: p.track,
        overflow: "hidden",
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
        opacity: 0.6,
    },
    pills: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
    },
    pill: {
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
