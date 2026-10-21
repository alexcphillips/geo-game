import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { PALETTES } from "@/theme/palette";

const DUSK = PALETTES.dusk;

/**
 * The twilight behind a fight: a moon, a few stars, and two inked hills the
 * combatants stand in front of. Drawn once, under everything, and ignores
 * touches.
 *
 * One fixed 390×520 drawing, scaled to cover the arena and anchored to its
 * bottom, so the hills always meet the ground line however tall the arena is.
 * Dusk only: fights are always at dusk.
 */
export default function DuskBackdrop() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
            <Svg width="100%" height="100%" viewBox="0 0 390 520" preserveAspectRatio="xMidYMax slice">
                <Defs>
                    <RadialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
                        <Stop offset="0" stopColor={DUSK.text} stopOpacity={0.28} />
                        <Stop offset="1" stopColor={DUSK.text} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={312} cy={110} r={66} fill="url(#moonGlow)" />
                <Circle cx={312} cy={110} r={22} fill={DUSK.text} stroke={DUSK.outline} strokeWidth={2.5} />
                {STARS.map(([x, y, r]) => (
                    <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={DUSK.text} opacity={0.55} />
                ))}
                <Path
                    d="M-5 300 C 60 260, 120 270, 180 290 S 300 250, 395 270 L 395 525 L -5 525Z"
                    fill="#25223A"
                    stroke={DUSK.outline}
                    strokeWidth={2.5}
                />
                <Path
                    d="M30 288 l 6 -22 l 6 22z M 52 282 l 5 -18 l 5 18z M 330 266 l 6 -24 l 6 24z M 352 270 l 5 -18 l 5 18z"
                    fill="#1C1A2C"
                    stroke={DUSK.outline}
                    strokeWidth={2}
                />
                <Path
                    d="M-5 350 C 80 320, 150 340, 230 330 S 340 310, 395 330 L 395 525 L -5 525Z"
                    fill="#1F1C30"
                    stroke={DUSK.outline}
                    strokeWidth={2.5}
                />
                <Rect x={0} y={420} width={390} height={100} fill="#1B1928" />
            </Svg>
        </View>
    );
}

/** [x, y, radius] */
const STARS = [
    [40, 70, 1.4],
    [96, 120, 1],
    [150, 56, 1.6],
    [220, 96, 1],
    [360, 190, 1.2],
    [250, 44, 1.2],
] as const;
