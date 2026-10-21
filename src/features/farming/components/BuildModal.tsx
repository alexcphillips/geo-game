import { Pressable, ScrollView, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import type { GeoFarmView, GeoItemView, GeoStructureView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { structureIcon } from "../farmText";

type BuildModalProps = {
    farm: GeoFarmView;
    structureTypes: Record<string, GeoStructureView>;
    items: Record<string, GeoItemView>;
    /** How many of each item the player holds, for the costs. */
    held: Record<string, number>;
    /** Building needs a farming place; away, the list is to look at. */
    canBuild: boolean;
    /** The tile it'll go on, when opened from one; null = pick a tile next. */
    tile: number | null;
    onBuild: (structureId: string) => void;
    onClose: () => void;
};

/**
 * The farm's Build list: every structure the player's farming level has
 * reached, with what it costs against what they hold. Building spends the
 * materials there and then; demolishing gives nothing back.
 */
export default function BuildModal({ farm, structureTypes, items, held, canBuild, tile, onBuild, onClose }: BuildModalProps) {
    const palette = useTheme();
    const styles = useStyles();
    const options = farm.buildList.flatMap((id) => (structureTypes[id] ? [structureTypes[id]] : []));

    return (
        <Modal title="Build" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Hint>
                    {tile === null ? "Pick a structure, then the tile to centre it on." : "Pick a structure to centre on that tile."} Building spends its
                    materials; demolishing gives nothing back. More unlock as your farming level grows.
                </Hint>
                {options.length === 0 && <Hint>Nothing to build yet.</Hint>}
                {options.map((structure) => {
                    const affordable = structure.cost.every((entry) => (held[entry.itemId] ?? 0) >= entry.quantity);
                    const enabled = canBuild && affordable;
                    const { width, height } = structure.size;
                    return (
                        <View key={structure.id} style={styles.row}>
                            <Icon name={structureIcon(structure.icon)} size={30} color={palette.game.structure} />
                            <View style={styles.text}>
                                <Text style={styles.name}>
                                    {structure.name}
                                    {width * height > 1 ? <Text style={styles.size}> · {width}×{height}</Text> : null}
                                </Text>
                                <Hint>{structure.description}</Hint>
                                {structure.stats.map((stat) => (
                                    <Text key={stat.label} style={styles.hint}>
                                        {stat.label}: {stat.value}
                                    </Text>
                                ))}
                                <Text style={styles.inputs}>
                                    {structure.cost.map((entry, i) => {
                                        const have = held[entry.itemId] ?? 0;
                                        return (
                                            <Text key={entry.itemId} style={have >= entry.quantity ? styles.have : styles.short}>
                                                {i > 0 ? " · " : ""}
                                                {entry.quantity} {items[entry.itemId]?.name ?? entry.itemId} ({have})
                                            </Text>
                                        );
                                    })}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => onBuild(structure.id)}
                                disabled={!enabled}
                                style={({ pressed }) => [styles.build, !enabled && styles.buildDisabled, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Build ${structure.name}`}
                                accessibilityState={{ disabled: !enabled }}
                            >
                                <Text style={[styles.buildText, !enabled && styles.buildTextDisabled]}>{tile === null ? "Place" : "Build"}</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </ScrollView>
        </Modal>
    );
}

const useStyles = createStyles((p) => ({
    list: {
        gap: 14,
        paddingBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    text: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
    size: {
        color: p.textMuted,
        fontFamily: FONTS.bodyBold,
    },
    hint: {
        color: p.textMuted,
        fontSize: 12,
    },
    inputs: {
        fontSize: 12,
    },
    have: {
        color: p.text,
    },
    short: {
        color: p.game.pest,
    },
    build: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: p.ember,
    },
    buildDisabled: {
        backgroundColor: p.game.tileLocked,
    },
    buildText: {
        color: p.onPrimary,
        fontFamily: FONTS.bodyHeavy,
    },
    buildTextDisabled: {
        color: p.textMuted,
    },
    pressed: {
        opacity: 0.75,
    },
}));
