import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Icon from "@/components/Icon/Icon";
import Pill from "@/components/Pill/Pill";
import { showToast } from "@/components/Toast/toastStore";
import { GEO_HAND_SIZE, type GeoFarmView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { FONTS, INK } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { untilText, WEATHER_INFO } from "../farmText";

const RING = 34;
const RING_STROKE = 4;

/**
 * Over the plot: the coming cycle's weather (tap for what it does) and the
 * two after it if the sky has been read, card plays left, and a ring
 * running down to the next cycle.
 */
export default function SkyStrip({ farm, now, atPlace }: { farm: GeoFarmView; now: number; atPlace: boolean }) {
    const styles = useStyles();
    const palette = useTheme();
    const [coming, ...later] = farm.forecast;
    const left = new Date(farm.nextTurnAt).getTime() - now;
    const done = 1 - Math.min(1, Math.max(0, left / (farm.turnHours * 3_600_000)));
    const radius = (RING - RING_STROKE) / 2;
    const circumference = 2 * Math.PI * radius;
    const hours = Math.max(0, Math.ceil(left / 3_600_000));

    return (
        <View style={styles.strip}>
            {coming && (
                <Pressable
                    style={styles.weather}
                    onPress={() => showToast(`${WEATHER_INFO[coming].label} next cycle. ${WEATHER_INFO[coming].effect}`, "info")}
                    accessibilityRole="button"
                    accessibilityLabel={`${WEATHER_INFO[coming].label} next cycle`}
                    accessibilityHint="Says what this weather does"
                >
                    <Icon name={WEATHER_INFO[coming].icon} size={26} color={palette.text} />
                    <Text style={styles.weatherLabel}>{WEATHER_INFO[coming].label}</Text>
                    {later.map((weather, i) => (
                        <Icon key={i} name={WEATHER_INFO[weather].icon} size={16} color={palette.textMuted} />
                    ))}
                </Pressable>
            )}
            <View style={styles.spacer} />
            {!atPlace && <Pill label="Viewing from afar" icon="eyeball" />}
            {atPlace && (
                <View style={styles.plays} accessibilityLabel={`${farm.playsLeft} card plays left`}>
                    {Array.from({ length: GEO_HAND_SIZE }, (_, i) => (
                        <View key={i} style={[styles.pip, i < farm.playsLeft && styles.pipOn]} />
                    ))}
                </View>
            )}
            <View style={styles.ring} accessibilityLabel={`Next cycle ${untilText(farm.nextTurnAt, now)}`}>
                <Svg width={RING} height={RING} style={styles.ringSvg}>
                    <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke={palette.track} strokeWidth={RING_STROKE} fill="none" />
                    <Circle
                        cx={RING / 2}
                        cy={RING / 2}
                        r={radius}
                        stroke={palette.primary}
                        strokeWidth={RING_STROKE}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={circumference * (1 - done)}
                        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                    />
                </Svg>
                <Text style={styles.ringText}>{hours > 0 ? `${hours}h` : "…"}</Text>
            </View>
        </View>
    );
}

const useStyles = createStyles((p, mood) => ({
    strip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: mood === "dusk" ? colors.skyNight : colors.sky,
        borderWidth: INK.border,
        borderColor: p.outline,
    },
    weather: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    weatherLabel: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 14,
        marginRight: 2,
    },
    spacer: {
        flex: 1,
    },
    plays: {
        flexDirection: "row",
        gap: 3,
    },
    pip: {
        width: 9,
        height: 13,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    pipOn: {
        backgroundColor: p.ember,
    },
    ring: {
        width: RING,
        height: RING,
        alignItems: "center",
        justifyContent: "center",
    },
    ringSvg: {
        position: "absolute",
    },
    ringText: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 10,
    },
}));
