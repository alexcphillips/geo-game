import { memo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Icon from "@/components/Icon/Icon";
import {
    GEO_FARM_MAX_FERTILITY,
    type GeoCropView,
    type GeoFarmPest,
    type GeoFarmTile,
    type GeoPestView,
    type GeoStructureView,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { cropIcon, pestArrow, pestIcon, SOIL_INFO, structureIcon, threatenedTiles } from "../farmText";

type FarmGridProps = {
    tiles: GeoFarmTile[];
    size: number;
    crops: Record<string, GeoCropView>;
    pests: GeoFarmPest[];
    pestTypes: Record<string, GeoPestView>;
    structureTypes: Record<string, GeoStructureView>;
    /** The tile whose panel is open. */
    selected: number | null;
    /** Tiles a card being aimed would touch. */
    preview: Set<number>;
    onPress: (index: number) => void;
    /** Shows where a card would land while a finger is down. */
    onPressIn?: (index: number) => void;
};

const GAP = 3;
const SIDE_PADDING = 12;

/**
 * The farm, top-down: every tile of the square, owned ones as soil whose
 * colour is its moisture, locked ones dark, and the ones that can be bought
 * next with a dashed rim. A crop's icon grows with its stage; ripe crops get
 * a gold rim, and a planned crop shows as a faded ghost on an empty tile.
 * A pest sits in a tile's corner with an arrow toward where it's headed, and
 * every tile it will harm on the next turn gets a red rim. Mutations grow
 * in violet, and a Hand Pollinated tile shows pollen in its corner. A
 * structure fills its tile, with what it holds (a caged pest, a Jukebox's
 * tune, compost) in the corner.
 */
export default function FarmGrid({ tiles, size, crops, pests, pestTypes, structureTypes, selected, preview, onPress, onPressIn }: FarmGridProps) {
    const { width } = useWindowDimensions();
    const tileSize = Math.floor((Math.min(width, 520) - SIDE_PADDING * 2 - GAP * (size - 1)) / size);
    const threatened = threatenedTiles(pests);

    return (
        <View style={[styles.grid, { width: tileSize * size + GAP * (size - 1) }]}>
            {tiles.map((tile) => (
                <FarmTile
                    key={tile.index}
                    tile={tile}
                    crop={tile.crop ? crops[tile.crop.cropId] : undefined}
                    ghost={!tile.crop && tile.blueprint ? crops[tile.blueprint] : undefined}
                    pest={pests.find((pest) => pest.tile === tile.index)}
                    pestCount={pests.filter((pest) => pest.tile === tile.index).length}
                    pestTypes={pestTypes}
                    structure={tile.structure ? structureTypes[tile.structure.structureId] : undefined}
                    gridSize={size}
                    threatened={threatened.has(tile.index)}
                    size={tileSize}
                    selected={selected === tile.index}
                    previewed={preview.has(tile.index)}
                    onPress={onPress}
                    onPressIn={onPressIn}
                />
            ))}
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
    gridSize: number;
    threatened: boolean;
    size: number;
    selected: boolean;
    previewed: boolean;
    onPress: (index: number) => void;
    onPressIn?: (index: number) => void;
};

const SOIL_BY_MOISTURE = [colors.soilDry, colors.soilMoist, colors.soilMoist, colors.soilWet];

const FarmTile = memo(function FarmTile({
    tile,
    crop,
    ghost,
    pest,
    pestCount,
    pestTypes,
    structure,
    gridSize,
    threatened,
    size,
    selected,
    previewed,
    onPress,
    onPressIn,
}: FarmTileProps) {
    const pestType = pest ? pestTypes[pest.pestId] : undefined;
    const held = tile.structure?.caged ?? tile.structure?.tune;
    const heldType = held ? pestTypes[held] : undefined;
    const growth = tile.crop ? Math.max(0.35, tile.crop.stage / tile.crop.stages) : 0;
    const iconSize = Math.round(size * (0.3 + 0.45 * growth));
    const background = !tile.owned
        ? colors.tileLocked
        : tile.waste
          ? colors.waste
          : tile.crop?.rotten
            ? colors.cropRotten
            : SOIL_BY_MOISTURE[tile.moisture];

    return (
        <Pressable
            onPress={() => onPress(tile.index)}
            onPressIn={onPressIn ? () => onPressIn(tile.index) : undefined}
            style={[
                styles.tile,
                { width: size, height: size, backgroundColor: background },
                tile.unlockable && styles.unlockable,
                tile.crop?.ripe && styles.ripe,
                threatened && styles.threatened,
                selected && styles.selected,
            ]}
            accessibilityRole="button"
            accessibilityLabel={tileLabel(tile, structure?.name ?? crop?.name, pestType?.name, pestCount, threatened)}
        >
            {tile.crop && crop && (
                <View style={tile.crop.rotten && styles.rotten}>
                    <Icon
                        name={cropIcon(crop.icon)}
                        size={iconSize}
                        color={crop.mutation ? colors.cropMutant : tile.crop.ripe ? colors.cropRipe : colors.cropLeaf}
                    />
                </View>
            )}
            {tile.owned && SOIL_INFO[tile.soilOverlay?.soil ?? tile.soil].color && (
                <View
                    style={[
                        styles.soil,
                        { backgroundColor: SOIL_INFO[tile.soilOverlay?.soil ?? tile.soil].color ?? undefined },
                        tile.soilOverlay && styles.soilOverlay,
                    ]}
                />
            )}
            {tile.waste && <Icon name="nuclear-waste" size={Math.round(size * 0.5)} color={colors.wasteGlow} />}
            {structure && (
                <Icon name={structureIcon(structure.icon)} size={Math.round(size * 0.6)} color={tile.structure?.open ? colors.cropMutant : colors.structure} />
            )}
            {heldType && (
                <View style={styles.held}>
                    <Icon name={pestIcon(heldType.icon)} size={11} color={tile.structure?.caged ? colors.pest : colors.cropMutant} />
                </View>
            )}
            {tile.structure && tile.structure.compost > 0 && <Text style={styles.compost}>{tile.structure.compost}</Text>}
            {tile.structure && tile.structure.water > 0 && <Text style={[styles.compost, styles.wellWater]}>{tile.structure.water}</Text>}
            {ghost && (
                <View style={styles.ghost}>
                    <Icon name={cropIcon(ghost.icon)} size={Math.round(size * 0.5)} color={colors.textPrimary} />
                </View>
            )}
            {tile.unlockable && <Text style={styles.plus}>+</Text>}
            {tile.crop?.ripe && !tile.crop.held && tile.crop.rotChance > 0 && (
                <Text style={styles.rot}>{Math.round(tile.crop.rotChance * 100)}%</Text>
            )}
            {tile.crop?.held && (
                <View style={styles.corner}>
                    <Icon name="hourglass" size={10} color={colors.cropRipe} />
                </View>
            )}
            {tile.owned && (
                <View style={styles.fertilityTrack}>
                    <View style={[styles.fertility, { width: `${(tile.fertility / GEO_FARM_MAX_FERTILITY) * 100}%` }]} />
                </View>
            )}
            {tile.pollinated && (
                <View style={styles.pollinated}>
                    <Icon name="pollen-dust" size={11} color={colors.cropMutant} />
                </View>
            )}
            {tile.trap && (
                <View style={styles.trap}>
                    <Icon name="wolf-trap" size={11} color={colors.textSecondary} />
                </View>
            )}
            {pest && pestType && (
                <View style={styles.pest}>
                    <Icon name={pestIcon(pestType.icon)} size={Math.max(12, Math.round(size * 0.32))} color={colors.pest} />
                    <Text style={styles.pestMark}>
                        {pestCount > 1 ? `×${pestCount}` : ""}
                        {pest.hp > 1 ? `${pest.hp}♥` : ""}
                        {pestArrow(pest, gridSize)}
                    </Text>
                </View>
            )}
            {previewed && <View style={styles.preview} pointerEvents="none" />}
        </Pressable>
    );
});

function tileLabel(tile: GeoFarmTile, cropName: string | undefined, pestName: string | undefined, pestCount: number, threatened: boolean): string {
    const where = `Tile ${tile.x + 1}, ${tile.y + 1}`;
    if (!tile.owned) return `${where}, locked${tile.unlockable ? ", can be bought" : ""}`;
    const what = tile.crop ? `${tile.crop.rotten ? "rotten " : tile.crop.ripe ? "ripe " : ""}${cropName ?? "crop"}` : "empty";
    const pests = pestName ? `, ${pestCount > 1 ? `${pestCount} pests` : pestName}` : "";
    return `${where}, ${what}${pests}${tile.waste ? ", nuclear waste" : ""}${threatened ? ", under threat" : ""}${tile.trap ? ", trapped" : ""}, water ${tile.moisture}, fertility ${tile.fertility}`;
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GAP,
        alignSelf: "center",
    },
    tile: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "transparent",
        overflow: "hidden",
    },
    unlockable: {
        borderStyle: "dashed",
        borderColor: colors.tileUnlockable,
    },
    ripe: {
        borderColor: colors.cropRipe,
    },
    threatened: {
        borderColor: colors.pest,
        borderStyle: "dashed",
    },
    selected: {
        borderColor: colors.emberBright,
        borderWidth: 2,
    },
    rotten: {
        opacity: 0.55,
    },
    ghost: {
        opacity: 0.25,
    },
    plus: {
        color: colors.tileUnlockable,
        fontSize: 16,
        fontWeight: "700",
    },
    rot: {
        position: "absolute",
        top: 1,
        right: 2,
        color: colors.pest,
        fontSize: 8,
        fontWeight: "700",
    },
    corner: {
        position: "absolute",
        top: 2,
        left: 2,
    },
    fertilityTrack: {
        position: "absolute",
        left: 3,
        right: 3,
        bottom: 2,
        height: 2,
        borderRadius: 1,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    fertility: {
        height: 2,
        borderRadius: 1,
        backgroundColor: colors.nutrients,
    },
    pest: {
        position: "absolute",
        right: 1,
        bottom: 3,
        flexDirection: "row",
        alignItems: "center",
    },
    pestMark: {
        color: colors.pest,
        fontSize: 9,
        fontWeight: "800",
    },
    held: {
        position: "absolute",
        top: 2,
        right: 2,
    },
    compost: {
        position: "absolute",
        top: 1,
        right: 3,
        color: colors.nutrients,
        fontSize: 9,
        fontWeight: "800",
    },
    soil: {
        position: "absolute",
        top: 3,
        alignSelf: "center",
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    soilOverlay: {
        opacity: 0.55,
    },
    wellWater: {
        color: colors.moisture,
    },
    pollinated: {
        position: "absolute",
        top: 2,
        right: 2,
    },
    trap: {
        position: "absolute",
        left: 2,
        bottom: 4,
    },
    preview: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(232, 135, 60, 0.28)",
    },
});
