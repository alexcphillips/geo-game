import { memo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Icon from "@/components/Icon/Icon";
import {
    type GeoCropView,
    type GeoFarmPest,
    type GeoFarmTile,
    type GeoPestView,
    type GeoStructureView,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { cropIcon, pestArrow, pestIcon, structureIcon, threatenedTiles } from "../farmText";

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
 * colour is its ground on the coming cycle (dry, normal, wet), locked ones dark, and the ones that can be bought
 * next with a dashed rim. A crop's icon grows with its stage; ripe crops get
 * a gold rim, and a planned crop shows as a faded ghost on an empty tile.
 * A pest sits in a tile's corner with an arrow toward where it's headed, and
 * every tile it will harm on the next turn gets a red rim. Mutations grow
 * in violet, and a Hand Pollinated tile shows pollen in its corner. A
 * structure fills its tile, with what it holds (a caged pest, a Jukebox's
 * tune, compost) in the corner; the other tiles a multi-tile one covers show
 * it faded. Tiles under a Greenhouse roof get a pane of glass over them.
 */
export default function FarmGrid({ tiles, size, crops, pests, pestTypes, structureTypes, selected, preview, onPress, onPressIn }: FarmGridProps) {
    const styles = useStyles();
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
                    structure={standingOn(tiles, tile, structureTypes)}
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

const SOIL_BY_GROUND: Record<GeoFarmTile["ground"], string> = { dry: colors.soilDry, normal: colors.soilNormal, wet: colors.soilWet };

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
    const styles = useStyles();
    const palette = useTheme();
    const pestType = pest ? pestTypes[pest.pestId] : undefined;
    const covered = tile.partOf !== null;
    const held = tile.structure?.caged ?? tile.structure?.tune;
    const heldType = held ? pestTypes[held] : undefined;
    const growth = tile.crop ? Math.max(0.35, tile.crop.stage / tile.crop.stages) : 0;
    const iconSize = Math.round(size * (0.3 + 0.45 * growth));
    const background = !tile.owned
        ? palette.game.tileLocked
        : tile.waste
          ? palette.game.waste
          : tile.crop?.rotten
            ? palette.game.cropRotten
            : SOIL_BY_GROUND[tile.ground];

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
                        color={crop.mutation ? palette.game.cropMutant : tile.crop.ripe ? palette.game.cropRipe : palette.game.cropLeaf}
                    />
                </View>
            )}
            {tile.waste && <Icon name="nuclear-waste" size={Math.round(size * 0.5)} color={palette.game.wasteGlow} />}
            {structure && (
                <View style={covered && styles.covered}>
                    <Icon name={structureIcon(structure.icon)} size={Math.round(size * 0.6)} color={tile.structure?.open ? palette.game.cropMutant : palette.game.structure} />
                </View>
            )}
            {tile.roof && <View style={styles.glass} pointerEvents="none" />}
            {heldType && (
                <View style={styles.held}>
                    <Icon name={pestIcon(heldType.icon)} size={11} color={tile.structure?.caged ? palette.game.pest : palette.game.cropMutant} />
                </View>
            )}
            {tile.structure && tile.structure.compost > 0 && <Text style={styles.compost}>{tile.structure.compost}</Text>}
            {ghost && (
                <View style={styles.ghost}>
                    <Icon name={cropIcon(ghost.icon)} size={Math.round(size * 0.5)} color={palette.text} />
                </View>
            )}
            {tile.unlockable && <Text style={styles.plus}>+</Text>}
            {tile.crop?.ripe && !tile.crop.held && tile.crop.rotChance > 0 && (
                <Text style={styles.rot}>{Math.round(tile.crop.rotChance * 100)}%</Text>
            )}
            {tile.crop?.held && (
                <View style={styles.corner}>
                    <Icon name="hourglass" size={10} color={palette.game.cropRipe} />
                </View>
            )}
            {tile.pollinated && (
                <View style={styles.pollinated}>
                    <Icon name="pollen-dust" size={11} color={palette.game.cropMutant} />
                </View>
            )}
            {tile.trap && (
                <View style={styles.trap}>
                    <Icon name="wolf-trap" size={11} color={palette.textMuted} />
                </View>
            )}
            {pest && pestType && (
                <View style={styles.pest}>
                    <Icon name={pestIcon(pestType.icon)} size={Math.max(12, Math.round(size * 0.32))} color={palette.game.pest} />
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

/** The structure standing on the tile, or on the tile whose multi-tile structure covers it. */
function standingOn(tiles: GeoFarmTile[], tile: GeoFarmTile, structureTypes: Record<string, GeoStructureView>): GeoStructureView | undefined {
    const structure = tile.partOf !== null ? tiles[tile.partOf]?.structure : tile.structure;
    return structure ? structureTypes[structure.structureId] : undefined;
}

function tileLabel(tile: GeoFarmTile, cropName: string | undefined, pestName: string | undefined, pestCount: number, threatened: boolean): string {
    const where = `Tile ${tile.x + 1}, ${tile.y + 1}`;
    if (!tile.owned) return `${where}, locked${tile.unlockable ? ", can be bought" : ""}`;
    const what = tile.crop ? `${tile.crop.rotten ? "rotten " : tile.crop.ripe ? "ripe " : ""}${cropName ?? "crop"}` : "empty";
    const pests = pestName ? `, ${pestCount > 1 ? `${pestCount} pests` : pestName}` : "";
    return `${where}, ${what}${pests}${tile.waste ? ", nuclear waste" : ""}${threatened ? ", under threat" : ""}${tile.trap ? ", trapped" : ""}${tile.roof ? ", under glass" : ""}${tile.ground !== "normal" ? `, ${tile.ground} next cycle` : ""}`;
}

const useStyles = createStyles((p) => ({
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
        borderColor: p.game.tileUnlockable,
    },
    ripe: {
        borderColor: p.game.cropRipe,
    },
    threatened: {
        borderColor: p.game.pest,
        borderStyle: "dashed",
    },
    selected: {
        borderColor: p.ember,
        borderWidth: 2,
    },
    rotten: {
        opacity: 0.55,
    },
    ghost: {
        opacity: 0.25,
    },
    plus: {
        color: p.game.tileUnlockable,
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    rot: {
        position: "absolute",
        top: 1,
        right: 2,
        color: p.game.pest,
        fontSize: 8,
        fontFamily: FONTS.bodyHeavy,
    },
    corner: {
        position: "absolute",
        top: 2,
        left: 2,
    },
    pest: {
        position: "absolute",
        right: 1,
        bottom: 3,
        flexDirection: "row",
        alignItems: "center",
    },
    pestMark: {
        color: p.game.pest,
        fontSize: 9,
        fontFamily: FONTS.bodyHeavy,
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
        color: p.game.nutrients,
        fontSize: 9,
        fontFamily: FONTS.bodyHeavy,
    },
    covered: {
        opacity: 0.45,
    },
    glass: {
        ...StyleSheet.absoluteFill,
        backgroundColor: p.game.glass,
        borderWidth: 1,
        borderColor: p.game.glassEdge,
        borderRadius: 4,
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
}));
