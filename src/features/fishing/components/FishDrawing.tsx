import { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { FishArt } from "@/features/fishing/fishArt";
import { colors } from "@/theme/colors";

const SILHOUETTE = "#04090C";

type FishDrawingProps = {
    fish: FishArt;
    /** Body length in px. The fish is centred on (0, 0), facing left. */
    length: number;
    /** A dark shape under the water: the fish isn't known until it lands. */
    silhouette?: boolean;
};

/**
 * A fish drawn from its data — placeholder art until fish have sprites. Head
 * left, so it faces the angler while it fights. Drawn inside an `Svg`; place
 * it with a `G` transform.
 */
export default function FishDrawing({ fish, length: L, silhouette = false }: FishDrawingProps) {
    const H = L * fish.height * 1.6;
    const fill = silhouette ? SILHOUETTE : fish.color;
    const tail = L / 2;
    const head = -L / 2;
    const eyeX = head + L * 0.12;
    const eyeY = -H * 0.1;

    return (
        <G opacity={silhouette ? 0.82 : 1}>
            <Path
                d={`M${tail - 2} 0 L${tail + H * 0.75} ${-H * 0.6} Q${tail + H * 0.45} 0 ${tail + H * 0.75} ${H * 0.6} Z`}
                fill={fill}
            />
            <Path d={`M${-L * 0.1} ${-H * 0.42} Q${L * 0.08} ${-H * 0.95} ${L * 0.22} ${-H * 0.4} Z`} fill={fill} />
            <Ellipse cx={0} cy={0} rx={L / 2} ry={H / 2} fill={fill} />
            {!silhouette && <Markings look={fish.look} L={L} H={H} />}
            {fish.look === "whiskers" && (
                <>
                    <Path
                        d={`M${head + 3} ${H * 0.1} q${-L * 0.15} ${H * 0.3} ${-L * 0.22} ${H * 0.9}`}
                        stroke={silhouette ? SILHOUETTE : "#2A2A26"}
                        strokeWidth={Math.max(1, L / 60)}
                        fill="none"
                    />
                    <Path
                        d={`M${head + 5} ${H * 0.15} q${-L * 0.05} ${H * 0.4} ${-L * 0.12} ${H * 1.1}`}
                        stroke={silhouette ? SILHOUETTE : "#2A2A26"}
                        strokeWidth={Math.max(1, L / 70)}
                        fill="none"
                    />
                </>
            )}
            {silhouette ? (
                <Circle cx={eyeX} cy={eyeY} r={Math.max(1, H * 0.06)} fill={colors.sceneFoam} opacity={0.35} />
            ) : (
                <>
                    <Circle cx={eyeX} cy={eyeY} r={Math.max(1.5, H * 0.1)} fill={fish.eyeColor ?? colors.bobberBelly} />
                    <Circle cx={eyeX - H * 0.02} cy={eyeY} r={Math.max(0.8, H * 0.05)} fill="#111" />
                </>
            )}
        </G>
    );
}

function Markings({ look, L, H }: { look: FishArt["look"]; L: number; H: number }) {
    return (
        <>
            {/* A soft belly highlight, so the body reads as round. */}
            <Ellipse cx={L * 0.05} cy={H * 0.15} rx={L * 0.38} ry={H * 0.22} fill="#FFFFFF" opacity={0.12} />
            {look === "stripes" &&
                Array.from({ length: 5 }, (_, i) => (
                    <Rect
                        key={i}
                        x={-L * 0.2 + i * L * 0.12}
                        y={-H * 0.38}
                        width={L * 0.035}
                        height={H * 0.6}
                        rx={2}
                        fill="#000"
                        opacity={0.28}
                    />
                ))}
            {look === "spots" &&
                Array.from({ length: 9 }, (_, i) => (
                    <Circle
                        key={i}
                        cx={-L * 0.25 + (i % 5) * L * 0.12 + (i < 5 ? 0 : L * 0.06)}
                        cy={i < 5 ? -H * 0.15 : H * 0.05}
                        r={Math.max(1.2, H * 0.06)}
                        fill="#2A1A10"
                        opacity={0.5}
                    />
                ))}
            {look === "scales" &&
                Array.from({ length: 4 }, (_, i) => (
                    <Circle
                        key={i}
                        cx={-L * 0.15 + i * L * 0.13}
                        cy={-H * 0.05}
                        r={H * 0.12}
                        fill="#FFFFFF"
                        fillOpacity={0.2}
                        stroke="#000"
                        strokeOpacity={0.2}
                    />
                ))}
            {look === "plates" &&
                Array.from({ length: 6 }, (_, i) => (
                    <Path
                        key={i}
                        d={`M${-L * 0.3 + i * L * 0.11} ${-H * 0.42} l${L * 0.03} ${-H * 0.1} l${L * 0.03} ${H * 0.1} Z`}
                        fill={colors.tierSilver}
                        opacity={0.6}
                    />
                ))}
        </>
    );
}

/** On-screen length for a fish: bigger fish look bigger, within reason. */
export const fishLength = (fish: Pick<FishArt, "length">, scale = 1) => (36 + fish.length * 44) * scale;
