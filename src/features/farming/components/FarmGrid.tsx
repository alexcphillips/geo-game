import { memo, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import {
    type GeoCropView,
    type GeoFarmPest,
    type GeoFarmTile,
    type GeoPestView,
    type GeoStructureView,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { FONTS, INK } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { cropIcon, pestArrow, pestIcon, structureIcon, threatenedTiles } from "../farmText";
import { inArea, tileBadge, type FarmArea, type TileBadge } from "../farmView";

type FarmGridProps = {
    tiles: GeoFarmTile[];
    size: number;
    /** The part of the farm drawn: owned tiles and the ring around them. */
    area: FarmArea;
    tileSize: number;
    crops: Record<string, GeoCropView>;
    pests: GeoFarmPest[];
    pestTypes: Record<string, GeoPestView>;
    structureTypes: Record<string, GeoStructureView>;
    /** The tile whose sheet is open. */
    selected: number | null;
    /** Tiles a card or structure being aimed would touch. */
    preview: Set<number>;
    /** Hold the threat pulse still. */
    reduceMotion: boolean;
    onPress: (index: number) => void;
    /** Shows where a card would land while a finger is down. */
    onPressIn?: (index: number) => void;
};

export const GRID_GAP = 4;

/** Square tiles that fit `width` for an area this many tiles across or down. */
export function gridTileSize(width: number, area: FarmArea): number {
    const span = Math.max(area.width, area.height);
    return Math.min(84, Math.floor((width - GRID_GAP * (span - 1)) / span));
}

/** Where a tile's top-left sits inside the grid, for things floated over it. */
export function tileOrigin(tile: GeoFarmTile, area: FarmArea, tileSize: number): { x: number; y: number } {
    return { x: (tile.x - area.left) * (tileSize + GRID_GAP), y: (tile.y - area.top) * (tileSize + GRID_GAP) };
}

/**
 * The farm, top-down, cropped to what's owned plus one ring of tiles around
 * it. Owned tiles are soil coloured by their ground on the coming cycle
 * (dry, normal, wet); a tile that can be bought next shows a "+"; the rest of
 * the ring is grass. A crop's icon grows with its stage and glows gold when
 * ripe, and a planned crop is a faded ghost on an empty tile. Each tile
 * carries at most one badge, the most urgent (pest, threat, ripe, then the
 * quieter ones), and a tile a pest will hurt next cycle pulses red.
 */
export default function FarmGrid({
    tiles,
    size,
    area,
    tileSize,
    crops,
    pests,
    pestTypes,
    structureTypes,
    selected,
    preview,
    reduceMotion,
    onPress,
    onPressIn,
}: FarmGridProps) {
    const styles = useStyles();
    const threatened = threatenedTiles(pests);
    // One pulse for every threatened tile, so they beat together.
    const [pulse] = useState(() => new Animated.Value(1));
    useEffect(() => {
        if (reduceMotion) {
            pulse.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse, reduceMotion]);

    return (
        <View style={[styles.grid, { width: tileSize * area.width + GRID_GAP * (area.width - 1) }]}>
            {tiles
                .filter((tile) => inArea(tile, area))
                .map((tile) => {
                    const here = pests.filter((pest) => pest.tile === tile.index);
                    return (
                        <FarmTile
                            key={tile.index}
                            tile={tile}
                            crop={tile.crop ? crops[tile.crop.cropId] : undefined}
                            ghost={!tile.crop && tile.blueprint ? crops[tile.blueprint] : undefined}
                            pest={here[0]}
                            pestCount={here.length}
                            pestTypes={pestTypes}
                            structure={standingOn(tiles, tile, structureTypes)}
                            threatened={threatened.has(tile.index) && Boolean(tile.crop)}
                            pulse={pulse}
                            size={tileSize}
                            gridSize={size}
                            selected={selected === tile.index}
                            previewed={preview.has(tile.index)}
                            onPress={onPress}
                            onPressIn={onPressIn}
                        />
                    );
                })}
        </View>
    );
}

type FarmTileProps = {
    tile: GeoFarmTile;
    crop: GeoCropView | undefined;
    ghost: GeoCropView | undefined;
    /** The first pest on the tile, drawn; `pestCount` says how many there are. */
    pest: GeoFarmPest | undefined;
    pestCount: number;
    pestTypes: Record<string, GeoPestView>;
    structure: GeoStructureView | undefined;
    threatened: boolean;
    pulse: Animated.Value;
    size: number;
    gridSize: number;
    selected: boolean;
    previewed: boolean;
    onPress: (index: number) => void;
    onPressIn?: (index: number) => void;
};

const SOIL_BY_GROUND: Record<GeoFarmTile["ground"], string> = { dry: colors.soilDry, normal: colors.soilNormal, wet: colors.soilWet };

const FarmTile = memo(function FarmTile({
    tile,
    crop,
    ghost,
    pest,
    pestCount,
    pestTypes,
    structure,
    threatened,
    pulse,
    size,
    gridSize,
    selected,
    previewed,
    onPress,
    onPressIn,
}: FarmTileProps) {
    const styles = useStyles();
    const palette = useTheme();
    const press = {
        onPress: () => onPress(tile.index),
        onPressIn: onPressIn ? () => onPressIn(tile.index) : undefined,
        accessibilityRole: "button" as const,
    };

    // The ring around the farm: a "+" to buy next, or plain grass.
    if (!tile.owned) {
        if (!tile.unlockable) return <View style={{ width: size, height: size }} />;
        return (
            <Pressable
                {...press}
                style={({ pressed }) => [styles.tile, styles.unlockable, { width: size, height: size }, pressed && styles.pressed, selected && styles.selected]}
                accessibilityLabel={`Tile ${tile.x + 1}, ${tile.y + 1}, can be bought`}
            >
                <Text style={[styles.plus, { fontSize: Math.round(size * 0.4) }]}>+</Text>
            </Pressable>
        );
    }

    const pestType = pest ? pestTypes[pest.pestId] : undefined;
    const covered = tile.partOf !== null;
    const growth = tile.crop ? Math.max(0.35, tile.crop.stage / tile.crop.stages) : 0;
    const ripe = Boolean(tile.crop?.ripe && !tile.crop.rotten);
    const badge = tileBadge(tile, Boolean(pest), threatened);
    const background = tile.waste ? palette.game.waste : tile.crop?.rotten ? palette.game.cropRotten : SOIL_BY_GROUND[tile.ground];
    const kept = tile.structure?.caged ?? tile.structure?.tune;
    const keptType = kept ? pestTypes[kept] : undefined;

    return (
        <Pressable
            {...press}
            style={({ pressed }) => [
                styles.tile,
                styles.soil,
                { width: size, height: size, backgroundColor: background },
                ripe && styles.ripe,
                selected && styles.selected,
                pressed && styles.pressed,
            ]}
            accessibilityLabel={tileLabel(tile, structure?.name ?? crop?.name, pestType?.name, pestCount, threatened)}
        >
            {tile.crop && crop && (
                <View style={tile.crop.rotten && styles.rotten}>
                    <Icon
                        name={cropIcon(crop.icon)}
                        size={Math.round(size * (0.3 + 0.42 * growth))}
                        color={crop.mutation ? palette.game.cropMutant : ripe ? colors.cropRipe : colors.cropLeaf}
                    />
                </View>
            )}
            {tile.waste && <Icon name="nuclear-waste" size={Math.round(size * 0.5)} color={colors.wasteGlow} />}
            {structure && (
                <View style={covered && styles.covered}>
                    <Icon name={structureIcon(structure.icon)} size={Math.round(size * 0.62)} color={tile.structure?.open ? colors.cropMutant : colors.structure} />
                </View>
            )}
            {ghost && (
                <View style={styles.ghost}>
                    <Icon name={cropIcon(ghost.icon)} size={Math.round(size * 0.5)} color={colors.structure} />
                </View>
            )}
            {tile.roof && <View style={styles.glass} pointerEvents="none" />}
            {threatened && <Animated.View style={[styles.threat, { opacity: pulse }]} pointerEvents="none" />}
            {badge ? (
                <Badge badge={badge} pest={pestType} pestCount={pestCount} pestHp={pest?.hp ?? 1} arrow={pest ? pestArrow(pest, gridSize) : ""} />
            ) : keptType ? (
                <Corner icon={pestIcon(keptType.icon)} color={tile.structure?.caged ? palette.game.pest : palette.game.cropMutant} />
            ) : tile.structure && tile.structure.compost > 0 ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tile.structure.compost}</Text>
                </View>
            ) : null}
            {previewed && <View style={styles.preview} pointerEvents="none" />}
        </Pressable>
    );
});

const BADGE_ICON: Record<Exclude<TileBadge, "pest" | null>, { icon: GameIconName; tone: "danger" | "ripe" | "muted" | "mutant" }> = {
    threat: { icon: "fangs", tone: "danger" },
    ripe: { icon: "sparkles", tone: "ripe" },
    held: { icon: "hourglass", tone: "ripe" },
    trap: { icon: "wolf-trap", tone: "muted" },
    pollinated: { icon: "pollen-dust", tone: "mutant" },
};

/** The tile's one mark, in its top-right corner. */
function Badge({
    badge,
    pest,
    pestCount,
    pestHp,
    arrow,
}: {
    badge: Exclude<TileBadge, null>;
    pest: GeoPestView | undefined;
    pestCount: number;
    pestHp: number;
    arrow: string;
}) {
    const styles = useStyles();
    const palette = useTheme();
    if (badge === "pest") {
        const extra = `${pestCount > 1 ? `×${pestCount}` : ""}${pestHp > 1 ? `${pestHp}♥` : ""}${arrow}`;
        return (
            <View style={[styles.badge, styles.badgePest]}>
                <Icon name={pestIcon(pest?.icon ?? "")} size={13} color="#FFFFFF" />
                {extra !== "" && <Text style={styles.badgeTextLight}>{extra}</Text>}
            </View>
        );
    }
    const { icon, tone } = BADGE_ICON[badge];
    const color = tone === "danger" ? palette.danger : tone === "ripe" ? palette.reward : tone === "mutant" ? palette.game.cropMutant : palette.textMuted;
    return <Corner icon={icon} color={color} />;
}

function Corner({ icon, color }: { icon: GameIconName; color: string }) {
    const styles = useStyles();
    return (
        <View style={styles.badge}>
            <Icon name={icon} size={12} color={color} />
        </View>
    );
}

/** The structure standing on the tile, or on the tile whose multi-tile structure covers it. */
function standingOn(tiles: GeoFarmTile[], tile: GeoFarmTile, structureTypes: Record<string, GeoStructureView>): GeoStructureView | undefined {
    const structure = tile.partOf !== null ? tiles[tile.partOf]?.structure : tile.structure;
    return structure ? structureTypes[structure.structureId] : undefined;
}

function tileLabel(tile: GeoFarmTile, cropName: string | undefined, pestName: string | undefined, pestCount: number, threatened: boolean): string {
    const what = tile.crop ? `${tile.crop.rotten ? "rotten " : tile.crop.ripe ? "ripe " : ""}${cropName ?? "crop"}` : (cropName ?? "empty soil");
    const pests = pestName ? `, ${pestCount > 1 ? `${pestCount} pests` : pestName}` : "";
    return `${what}${pests}${tile.waste ? ", nuclear waste" : ""}${threatened ? ", under threat" : ""}${tile.trap ? ", trapped" : ""}${tile.roof ? ", under glass" : ""}${tile.ground !== "normal" ? `, ${tile.ground} next cycle` : ""}`;
}

const useStyles = createStyles((p) => ({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GRID_GAP,
        alignSelf: "center",
    },
    tile: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
    },
    soil: {
        borderWidth: 2,
        borderColor: p.outline,
        boxShadow: `0px 2px 0px ${p.outline}`,
    },
    unlockable: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: p.surface,
        backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
    plus: {
        color: p.surface,
        fontFamily: FONTS.display,
    },
    ripe: {
        borderColor: p.reward,
        borderWidth: INK.border + 0.5,
        boxShadow: `0px 0px 10px ${colors.cropRipe}`,
    },
    selected: {
        borderColor: p.ember,
        borderWidth: 3,
    },
    pressed: {
        transform: [{ translateY: 1 }],
    },
    rotten: {
        opacity: 0.55,
    },
    ghost: {
        opacity: 0.35,
    },
    covered: {
        opacity: 0.45,
    },
    glass: {
        ...StyleSheet.absoluteFill,
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassEdge,
        borderRadius: 8,
    },
    threat: {
        ...StyleSheet.absoluteFill,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: p.danger,
    },
    badge: {
        position: "absolute",
        top: -6,
        right: -6,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 3,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: p.outline,
        backgroundColor: p.surface,
    },
    badgePest: {
        backgroundColor: p.danger,
    },
    badgeText: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 10,
    },
    badgeTextLight: {
        color: "#FFFFFF",
        fontFamily: FONTS.bodyHeavy,
        fontSize: 9,
    },
    preview: {
        ...StyleSheet.absoluteFill,
        borderRadius: 8,
        backgroundColor: "rgba(232, 135, 60, 0.35)",
    },
}));
