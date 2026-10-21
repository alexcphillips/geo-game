import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { GeoCropView, GeoFarmView, GeoFarmWeather, GeoPestView, GeoStructureView } from "@/lib/geo/contracts";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { colors } from "@/theme/colors";
import { FONTS, INK } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
import { visibleArea } from "../farmView";
import FarmGrid, { GRID_GAP, gridTileSize, tileOrigin } from "./FarmGrid";

/** "+3 Wheat" rising off a tile (or the middle of the plot) after an action. */
export type FloatingGain = { id: number; text: string; tile: number | null };

type FarmPlotProps = {
    farm: GeoFarmView;
    crops: Record<string, GeoCropView>;
    pestTypes: Record<string, GeoPestView>;
    structureTypes: Record<string, GeoStructureView>;
    selected: number | null;
    preview: Set<number>;
    gains: FloatingGain[];
    onGainDone: (id: number) => void;
    onPress: (index: number) => void;
    onPressIn?: (index: number) => void;
    /** Drawn over the plot's top edge: the first-visit coach. */
    coach?: ReactNode;
};

/** The screen's side gutter plus the grass border, each side. */
const SCREEN_GUTTER = 16;
const GRASS_PADDING = 14;

/**
 * The plot in its patch of grass, with the coming cycle's weather drawn
 * over it (rain streaks, a frost wash, a heat shimmer) and what an action
 * gave floating up off the tile it came from.
 */
export default function FarmPlot({ farm, crops, pestTypes, structureTypes, selected, preview, gains, onGainDone, onPress, onPressIn, coach }: FarmPlotProps) {
    const styles = useStyles();
    const reduceMotion = useReduceMotion();
    const { width } = useWindowDimensions();
    const area = visibleArea(farm.tiles, farm.size);
    const tileSize = gridTileSize(Math.min(width, 520) - (SCREEN_GUTTER + GRASS_PADDING) * 2, area);
    const gridWidth = tileSize * area.width + GRID_GAP * (area.width - 1);
    const gridHeight = tileSize * area.height + GRID_GAP * (area.height - 1);

    return (
        <View style={styles.grass}>
            {coach}
            <View style={{ width: gridWidth, height: gridHeight }}>
                <FarmGrid
                    tiles={farm.tiles}
                    size={farm.size}
                    area={area}
                    tileSize={tileSize}
                    crops={crops}
                    pests={farm.pests}
                    pestTypes={pestTypes}
                    structureTypes={structureTypes}
                    selected={selected}
                    preview={preview}
                    reduceMotion={reduceMotion}
                    onPress={onPress}
                    onPressIn={onPressIn}
                />
                <Weather weather={farm.forecast[0] ?? "clear"} width={gridWidth} height={gridHeight} still={reduceMotion} />
                {gains.map((gain) => {
                    const tile = gain.tile !== null ? farm.tiles[gain.tile] : undefined;
                    const origin = tile ? tileOrigin(tile, area, tileSize) : { x: gridWidth / 2 - tileSize / 2, y: gridHeight / 2 - tileSize / 2 };
                    return <Gain key={gain.id} gain={gain} x={origin.x} y={origin.y} tileSize={tileSize} onDone={onGainDone} />;
                })}
            </View>
        </View>
    );
}

const RAIN_STREAKS = 18;

/** Weather over the plot. Rain falls; with Reduce Motion it hangs still. */
function Weather({ weather, width, height, still }: { weather: GeoFarmWeather; width: number; height: number; still: boolean }) {
    const styles = useStyles();
    const [fall] = useState(() => new Animated.Value(0));
    const [shimmer] = useState(() => new Animated.Value(1));
    useEffect(() => {
        if (still || weather === "clear" || weather === "frost") return;
        const loop =
            weather === "rain"
                ? Animated.loop(Animated.timing(fall, { toValue: 1, duration: 900, useNativeDriver: true }))
                : Animated.loop(
                      Animated.sequence([
                          Animated.timing(shimmer, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
                          Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: true }),
                      ]),
                  );
        loop.start();
        return () => loop.stop();
    }, [fall, shimmer, still, weather]);

    if (weather === "frost") return <View style={[styles.weather, { backgroundColor: colors.frostWash }]} pointerEvents="none" />;
    if (weather === "heatwave") return <Animated.View style={[styles.weather, { backgroundColor: colors.heatWash, opacity: shimmer }]} pointerEvents="none" />;
    if (weather !== "rain") return null;
    return (
        <View style={[styles.weather, styles.rain]} pointerEvents="none">
            {Array.from({ length: RAIN_STREAKS }, (_, i) => {
                // Spread the streaks evenly but not in a grid: each gets its own column and start height.
                const x = ((i * 37) % 100) / 100;
                const start = ((i * 53) % 100) / 100;
                const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [start * height - height, start * height] });
                return (
                    <Animated.View
                        key={i}
                        style={[styles.streak, { left: x * width, top: 0, transform: [{ translateY: still ? start * height : translateY }, { rotate: "12deg" }] }]}
                    />
                );
            })}
        </View>
    );
}

function Gain({ gain, x, y, tileSize, onDone }: { gain: FloatingGain; x: number; y: number; tileSize: number; onDone: (id: number) => void }) {
    const styles = useStyles();
    const [rise] = useState(() => new Animated.Value(0));
    useEffect(() => {
        Animated.timing(rise, { toValue: 1, duration: 1600, useNativeDriver: true }).start(() => onDone(gain.id));
    }, [gain.id, onDone, rise]);
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.gain,
                {
                    left: x - tileSize,
                    top: y,
                    width: tileSize * 3,
                    opacity: rise.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -tileSize * 0.9] }) }],
                },
            ]}
        >
            <Text style={styles.gainText}>{gain.text}</Text>
        </Animated.View>
    );
}

const useStyles = createStyles((p, mood) => ({
    grass: {
        alignSelf: "center",
        alignItems: "center",
        padding: GRASS_PADDING,
        borderRadius: 24,
        backgroundColor: mood === "dusk" ? colors.grassNight : colors.grass,
        borderWidth: INK.border,
        borderColor: p.outline,
        boxShadow: `0px ${INK.liftLarge}px 0px ${mood === "dusk" ? colors.grassEdgeNight : colors.grassEdge}`,
    },
    weather: {
        ...StyleSheet.absoluteFill,
        borderRadius: 10,
    },
    rain: {
        overflow: "hidden",
    },
    streak: {
        position: "absolute",
        width: 2,
        height: 16,
        borderRadius: 1,
        backgroundColor: colors.rainStreak,
    },
    gain: {
        position: "absolute",
        alignItems: "center",
    },
    gainText: {
        color: "#FFFFFF",
        fontFamily: FONTS.display,
        fontSize: 16,
        textShadowColor: p.outline,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 0,
    },
}));
