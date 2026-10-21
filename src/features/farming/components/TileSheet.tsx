import { useRef, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import Meter from "@/components/Meter/Meter";
import { useCloseModal } from "@/components/Modal/Modal";
import Panel from "@/components/Panel/Panel";
import Sheet from "@/components/Sheet/Sheet";
import { Body, Hint } from "@/components/Text/Text";
import type { GeoCropView, GeoFarmAction, GeoFarmTile, GeoFarmView, GeoItemView, GeoPestView, GeoStructureView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { cropIcon, pestIcon, structureIcon } from "../farmText";
import { isPlantable } from "../farmView";
import SeedPicker, { heldSeeds } from "./SeedPicker";

type TileSheetProps = {
    farm: GeoFarmView;
    index: number;
    crops: Record<string, GeoCropView>;
    pestTypes: Record<string, GeoPestView>;
    structureTypes: Record<string, GeoStructureView>;
    held: Record<string, number>;
    items: Record<string, GeoItemView>;
    atPlace: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    /** These open something else, once the sheet has gone. */
    onPlan: () => void;
    onOpenShrine: () => void;
    onBuildHere: () => void;
    onClose: () => void;
};

/**
 * A tapped tile: what's on it in plain words, one big button for the thing
 * to do, and the rest (clear, plan, build, demolish) under More.
 */
export default function TileSheet(props: TileSheetProps) {
    // What to open once the sheet has slid away; a ref, since the close was made before it was set.
    const then = useRef<(() => void) | null>(null);
    return (
        <Sheet
            size="large"
            onClose={() => {
                props.onClose();
                then.current?.();
            }}
        >
            <TileContent {...props} openAfter={(open) => (then.current = open)} />
        </Sheet>
    );
}

type Action = { label: string; icon?: GameIconName; variant?: "primary" | "secondary" | "danger"; run: () => void; trailing?: ReactNode };

function TileContent({
    farm,
    index,
    crops,
    pestTypes,
    structureTypes,
    held,
    items,
    atPlace,
    act,
    onPlan,
    onOpenShrine,
    onBuildHere,
    openAfter,
}: TileSheetProps & { openAfter: (open: () => void) => void }) {
    const styles = useStyles();
    const palette = useTheme();
    const close = useCloseModal();
    const [showMore, setShowMore] = useState(false);
    // Demolishing gives nothing back, so it takes a second tap.
    const [confirming, setConfirming] = useState(false);
    const tile = farm.tiles[index]!;
    const standing = (tile.partOf !== null ? farm.tiles[tile.partOf]?.structure : tile.structure) ?? null;
    const standingType = standing ? structureTypes[standing.structureId] : undefined;
    const roofName = tile.roof ? (structureTypes[tile.roof.structureId]?.name ?? "Greenhouse") : null;
    const crop = tile.crop ? crops[tile.crop.cropId] : undefined;
    const pestsHere = farm.pests.filter((pest) => pest.tile === index);

    const seeds = heldSeeds(crops, held);
    const planned = seeds.find((entry) => entry.id === tile.blueprint);
    const [seedId, setSeedId] = useState<string | null>(planned?.id ?? seeds[0]?.id ?? null);
    const seed = seeds.find((entry) => entry.id === seedId);

    /** Do it and let the sheet go, so the plot shows what happened. */
    const doAndClose = (action: GeoFarmAction) => {
        close();
        void act(action);
    };
    const leaveFor = (open: () => void) => {
        openAfter(open);
        close();
    };

    // The one big button, then the rest.
    let primary: Action | null = null;
    const more: Action[] = [];

    if (!tile.owned) {
        if (atPlace && tile.unlockable && farm.unlockCost) {
            const { coins, compost } = farm.unlockCost;
            const compostName = items[farm.compostItemId]?.name ?? "Compost";
            primary = {
                label: compost > 0 ? `Buy · ${coins} coins + ${compost} ${compostName}` : `Buy · ${coins} coins`,
                icon: "two-coins",
                variant: "primary",
                run: () => doAndClose({ type: "unlock", tile: index }),
            };
        }
    } else if (atPlace) {
        if (pestsHere.length > 0 && hasEmptyCageBy(farm, index, structureTypes)) {
            const name = pestTypes[pestsHere[0]!.pestId]?.name ?? "pest";
            primary = { label: `Cage the ${name}`, icon: "cage", variant: "primary", run: () => doAndClose({ type: "cage", tile: index }) };
        }
        if (standing && standingType) {
            if (standingType.kind === "shrine") primary ??= { label: "Make an offering", icon: "stone-tablet", variant: "primary", run: () => leaveFor(onOpenShrine) };
            if (standingType.kind === "cage" && standing.caged) more.push({ label: "Let it out", run: () => doAndClose({ type: "release", tile: index }) });
        } else if (!tile.waste) {
            if (tile.crop?.rotten) primary ??= { label: "Clear it", icon: "sickle", variant: "primary", run: () => doAndClose({ type: "clear", tile: index }) };
            else if (tile.crop?.ripe) primary ??= { label: "Harvest", icon: "basket", variant: "primary", run: () => doAndClose({ type: "harvest", tile: index }) };
            else if (isPlantable(tile) && seed) {
                primary ??= {
                    label: `Plant ${seed.name}`,
                    icon: cropIcon(seed.icon),
                    variant: "primary",
                    run: () => doAndClose({ type: "plant", tile: index, itemId: seed.seedItemId! }),
                };
            }
            if (tile.crop && !tile.crop.rotten) more.push({ label: "Clear", icon: "sickle", run: () => doAndClose({ type: "clear", tile: index }) });
            // Nothing is built under a roof; a roof (a Greenhouse) can go over a crop.
            const buildable = farm.buildList.some((id) => !tile.crop || structureTypes[id]?.kind === "greenhouse");
            if (!tile.roof && buildable) more.push({ label: "Build here", icon: "spanner", run: () => leaveFor(onBuildHere) });
        }
    }
    if (tile.owned) more.push({ label: tile.blueprint ? `Plan: ${crops[tile.blueprint]?.name ?? "crop"}` : "Plan", icon: "scroll-quill", run: () => leaveFor(onPlan) });
    if (atPlace && (standing || roofName)) {
        const name = standing ? (standingType?.name ?? "structure") : roofName!;
        more.push(
            confirming
                ? { label: `Tear down the ${name}: nothing back`, variant: "danger", run: () => doAndClose({ type: "demolish", tile: index }) }
                : { label: `Demolish ${name}`, variant: "secondary", run: () => setConfirming(true) },
        );
    }
    // With nothing to do but plan (looking from afar), planning is the button.
    if (!primary && more.length === 1) primary = more.pop()!;

    const { title, icon, iconColor } = heading(tile, crop, standingType, palette);

    return (
        <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.head}>
                <Panel compact style={styles.picture}>
                    {icon === "plus" ? <Text style={styles.plus}>+</Text> : <Icon name={icon} size={52} color={iconColor} />}
                </Panel>
                <View style={styles.headText}>
                    <Text style={styles.title}>{title}</Text>
                    <Lines tile={tile} crop={crop} standing={standing} standingType={standingType} roofName={roofName} crops={crops} pestTypes={pestTypes} />
                </View>
            </View>

            {tile.crop?.ripe && !tile.crop.rotten && (
                <View style={styles.rot}>
                    {tile.crop.held ? (
                        <Hint>Held: it won&apos;t rot this cycle.</Hint>
                    ) : (
                        <>
                            <Meter value={tile.crop.rotChance} color={palette.danger} accessibilityLabel="Rot risk" />
                            <Hint>{Math.round(tile.crop.rotChance * 100)}% chance it rots next cycle</Hint>
                        </>
                    )}
                </View>
            )}

            <PestLines farm={farm} index={index} pestTypes={pestTypes} />

            {standingType?.kind === "jukebox" && atPlace && standing && (
                <ChipRow label="Tune" radio>
                    {Object.values(pestTypes).map((pest) => (
                        <Chip key={pest.id} label={pest.name} selected={standing.tune === pest.id} onPress={() => void act({ type: "tune", tile: index, pestId: pest.id })} />
                    ))}
                    <Chip label="Quiet" selected={!standing.tune} onPress={() => void act({ type: "tune", tile: index, pestId: null })} />
                </ChipRow>
            )}

            {atPlace && isPlantable(tile) && <SeedPicker seeds={seeds} held={held} selected={seedId} onSelect={setSeedId} />}

            {(primary || more.length > 0) && (
                <View style={styles.actions}>
                    {primary && (
                        <Button
                            label={primary.label}
                            icon={primary.icon}
                            variant={primary.variant ?? "primary"}
                            size="large"
                            stretch
                            onPress={primary.run}
                            style={styles.primary}
                        />
                    )}
                    {more.length > 0 && <Button label={showMore ? "Less" : "More ⋯"} variant="quiet" size="small" onPress={() => setShowMore((open) => !open)} />}
                </View>
            )}
            {showMore && (
                <View style={styles.more}>
                    {more.map((action) => (
                        <Button key={action.label} label={action.label} icon={action.icon} variant={action.variant ?? "secondary"} size="small" onPress={action.run} />
                    ))}
                </View>
            )}
            {!atPlace && tile.owned && <Hint center>Work your farm at any farming place.</Hint>}
        </ScrollView>
    );
}

function heading(
    tile: GeoFarmTile,
    crop: GeoCropView | undefined,
    structure: GeoStructureView | undefined,
    palette: ReturnType<typeof useTheme>,
): { title: string; icon: GameIconName | "plus"; iconColor: string } {
    if (!tile.owned) return { title: tile.unlockable ? "Land for sale" : "Wild land", icon: tile.unlockable ? "plus" : "padlock", iconColor: palette.textMuted };
    if (tile.waste) return { title: "Nuclear waste", icon: "nuclear-waste", iconColor: palette.game.wasteGlow };
    if (structure) return { title: structure.name, icon: structureIcon(structure.icon), iconColor: palette.game.structure };
    if (tile.crop && crop) {
        const ripe = tile.crop.ripe && !tile.crop.rotten;
        return {
            title: tile.crop.rotten ? `Rotten ${crop.name}` : crop.name,
            icon: cropIcon(crop.icon),
            iconColor: crop.mutation ? palette.game.cropMutant : ripe ? palette.reward : palette.game.cropLeaf,
        };
    }
    return { title: "Empty soil", icon: "spade", iconColor: palette.textMuted };
}

const GROUND_LINE: Record<GeoFarmTile["ground"], string> = {
    normal: "Good ground for the next cycle.",
    wet: "Wet next cycle: good for growing.",
    dry: "Dry next cycle: crops here won't grow.",
};

/** What's true of the tile, in short plain lines. */
function Lines({
    tile,
    crop,
    standing,
    standingType,
    roofName,
    crops,
    pestTypes,
}: {
    tile: GeoFarmTile;
    crop: GeoCropView | undefined;
    standing: GeoFarmTile["structure"];
    standingType: GeoStructureView | undefined;
    roofName: string | null;
    crops: Record<string, GeoCropView>;
    pestTypes: Record<string, GeoPestView>;
}) {
    const lines: string[] = [];
    if (!tile.owned) {
        lines.push(tile.unlockable ? "Buy it to grow more." : "Buy the land next to it first.");
    } else if (tile.waste) {
        lines.push("Nothing grows here, and it may spread. A Hazmat Scrub card cleans it. Mutations stir beside it.");
    } else if (standing && standingType) {
        lines.push(structureLine(standing, standingType, pestTypes));
    } else {
        if (tile.crop && crop) {
            if (tile.crop.rotten) lines.push("Clear it to plant again.");
            else if (tile.crop.ripe) lines.push(tile.crop.ripeTurns > 0 ? `Ready to pick · +${tile.crop.ripeTurns} from waiting` : "Ready to pick");
            else lines.push(`Growing · stage ${tile.crop.stage} of ${tile.crop.stages}`);
        }
        if (!roofName) lines.push(GROUND_LINE[tile.ground]);
        else lines.push(`Under the ${roofName}: no weather, pests or mutations.`);
        for (const setup of tile.setups) {
            lines.push(`${crops[setup.mutationId]?.name ?? "A mutation"} setup held ${setup.cycles} cycle${setup.cycles === 1 ? "" : "s"}: likelier next cycle if it holds.`);
        }
        if (tile.blueprint && !tile.crop) lines.push(`Planned for ${crops[tile.blueprint]?.name ?? "a crop"}.`);
    }
    if (tile.trap) lines.push("A Snap Trap is set here for the next cycle.");
    if (tile.pollinated) lines.push("Hand pollinated: better mutation odds next cycle.");
    return (
        <>
            {lines.map((line) => (
                <Body key={line}>{line}</Body>
            ))}
        </>
    );
}

/** A structure in one line: what it is and what it holds. */
function structureLine(structure: NonNullable<GeoFarmTile["structure"]>, type: GeoStructureView, pestTypes: Record<string, GeoPestView>): string {
    const pestName = (id: string | null) => (id ? (pestTypes[id]?.name ?? "a pest") : null);
    switch (type.kind) {
        case "jukebox":
            return structure.tune ? `Playing the ${pestName(structure.tune)}'s tune.` : "Quiet. Pick a tune to draw a pest in.";
        case "cage":
            return structure.caged ? `Holds a ${pestName(structure.caged)}. Turn it in to the Pesthunter.` : "Empty. Cage a pest on a tile beside it.";
        case "compost":
            return `${structure.compost} of ${type.capacity ?? "?"} harvests and clears toward the next Compost.`;
        case "portal":
            return structure.open ? "Torn open: elite pests come through on the next cycle." : "Shut. A Tear the Veil card opens it.";
        default:
            return type.description;
    }
}

/** An empty Pest Cage on the tile or one of the 8 around it. */
function hasEmptyCageBy(farm: GeoFarmView, index: number, structureTypes: Record<string, GeoStructureView>): boolean {
    const x = index % farm.size;
    const y = Math.floor(index / farm.size);
    return farm.tiles.some(
        (tile) =>
            Math.abs(tile.x - x) <= 1 &&
            Math.abs(tile.y - y) <= 1 &&
            tile.structure !== null &&
            structureTypes[tile.structure.structureId]?.kind === "cage" &&
            !tile.structure.caged,
    );
}

/** The pests on a tile and what each will do, then any pest elsewhere coming for it. */
function PestLines({ farm, index, pestTypes }: { farm: GeoFarmView; index: number; pestTypes: Record<string, GeoPestView> }) {
    const styles = useStyles();
    const palette = useTheme();
    const here = farm.pests.filter((pest) => pest.tile === index);
    const coming = farm.pests.filter((pest) => pest.tile !== index && pest.intent.tile === index && pest.intent.kind !== "move");
    if (here.length === 0 && coming.length === 0) return null;
    return (
        <Panel compact flat style={styles.pests}>
            {here.map((pest) => (
                <View key={pest.id} style={styles.pestLine}>
                    <Icon name={pestIcon(pestTypes[pest.pestId]?.icon ?? "")} size={20} color={palette.danger} />
                    <Body style={styles.pestText}>
                        <Text style={styles.pestName}>{pestTypes[pest.pestId]?.name ?? "Pest"}</Text>: {pest.intentText}.
                    </Body>
                </View>
            ))}
            {coming.map((pest) => (
                <View key={pest.id} style={styles.pestLine}>
                    <Icon name="fangs" size={20} color={palette.danger} />
                    <Body style={styles.pestText}>A {pestTypes[pest.pestId]?.name ?? "pest"} next door is coming for this tile.</Body>
                </View>
            ))}
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    body: {
        gap: 14,
        paddingBottom: 8,
    },
    head: {
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
    },
    picture: {
        width: 84,
        height: 84,
        alignItems: "center",
        justifyContent: "center",
    },
    plus: {
        color: p.textMuted,
        fontFamily: FONTS.display,
        fontSize: 44,
    },
    headText: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 22,
    },
    rot: {
        gap: 4,
    },
    pests: {
        gap: 6,
    },
    pestLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    pestText: {
        flex: 1,
    },
    pestName: {
        color: p.danger,
        fontFamily: FONTS.bodyHeavy,
    },
    actions: {
        alignItems: "center",
        gap: 6,
    },
    primary: {
        alignSelf: "stretch",
    },
    more: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
    },
}));
