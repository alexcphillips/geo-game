import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import BuildModal from "@/features/farming/components/BuildModal";
import ContestsModal from "@/features/farming/components/ContestsModal";
import FarmGrid from "@/features/farming/components/FarmGrid";
import OrderBoardModal from "@/features/farming/components/OrderBoardModal";
import PesthunterModal from "@/features/farming/components/PesthunterModal";
import ShrineModal from "@/features/farming/components/ShrineModal";
import { farmingApi } from "@/features/farming/farmingApi";
import {
    cropIcon,
    cropLine,
    fortuneMultiplier,
    pestIcon,
    SHAPE_HINT,
    SOIL_INFO,
    shapeTiles,
    structureIcon,
    untilText,
    WEATHER_INFO,
} from "@/features/farming/farmText";
import { useReportActivity } from "@/features/friends/presenceStore";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { packedSlots } from "@/features/lunchbox/lunchbox";
import { usePlayerStore } from "@/features/player/playerStore";
import { useInventory } from "@/features/player/usePlayer";
import { useAdminSettingsStore } from "@/features/settings/adminSettingsStore";
import { toInventoryItem } from "@/features/player/toInventoryItem";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import RunHand from "@/features/run/components/RunHand";
import RunLunchbox from "@/features/run/components/RunLunchbox";
import RunScreen from "@/features/run/components/RunScreen";
import { toErrorMessage } from "@/lib/api";
import {
    GEO_FARM_MAX_FERTILITY,
    GEO_FARM_MAX_MOISTURE,
    type GeoCropView,
    type GeoFarmAction,
    type GeoFarmHandCard,
    type GeoFarmView,
    type GeoItemView,
    type GeoPestView,
    type GeoStructureView,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/**
 * The farm: one grid on a real clock. Every 12h it takes a turn on its own
 * (crops grow, weather lands, pests move) and Labor refills for watering,
 * harvesting and farming cards. After a couple of turns unvisited it waits
 * for you. The server plays the turns when the farm is next looked at.
 *
 * Opened as `/farm?place=…&latitude=…&longitude=…` from a farming place,
 * where it can be worked,
 * or as `/farm` from the character screen, where it can only be looked at
 * and planned (blueprints) — unless an admin has the free camera on, which
 * counts as being at a place. The server runs every rule.
 */
export default function FarmScreen() {
    const params = useLocalSearchParams<{ place?: string; latitude?: string; longitude?: string }>();
    const isFreeCamera = useAdminSettingsStore((state) => state.isFreeCamera);
    const atPlace = Boolean(params.place) || isFreeCamera;
    // Friends see real farming only, not an admin testing from anywhere.
    useReportActivity(params.place ? "skilling" : "exploring", params.place ? "farming" : null);
    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    const items = usePlayerStore((state) => state.items);

    const [farm, setFarm] = useState<GeoFarmView | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [aiming, setAiming] = useState<GeoFarmHandCard | null>(null);
    const [aimAt, setAimAt] = useState<number | null>(null);
    const [planning, setPlanning] = useState<number | null>(null);
    const [isLabOpen, setIsLabOpen] = useState(false);
    const [isBuildOpen, setIsBuildOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isContestsOpen, setIsContestsOpen] = useState(false);
    const [isPesthunterOpen, setIsPesthunterOpen] = useState(false);
    const [shrineTile, setShrineTile] = useState<number | null>(null);
    const inventory = useInventory();
    const held = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const entry of inventory) counts[entry.itemId] = (counts[entry.itemId] ?? 0) + (entry.quantity ?? 1);
        return counts;
    }, [inventory]);
    const [inspected, setInspected] = useState<InventoryItem | null>(null);
    const [now, setNow] = useState(() => Date.now());

    /** A look at the farm plays the turns that came due, which may have dropped something. */
    const onLook = useCallback(
        (next: GeoFarmView) => {
            setFarm(next);
            if (next.gained.length === 0) return;
            showToast(next.gained.map((gain) => `+${gain.quantity} ${items[gain.itemId]?.name ?? gain.itemId}`).join(" · "), "success");
            void refreshPlayer();
        },
        [items, refreshPlayer],
    );

    useEffect(() => {
        if (!isPlayerReady) return;
        farmingApi
            .get()
            .then(onLook)
            .catch((error: unknown) => setProblem(toErrorMessage(error)));
        // Only on arrival: `onLook` changes as the inventory does.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlayerReady]);

    // The turn countdown, and a fresh look once the farm's turn is due.
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);
    const nextTurnAt = farm?.nextTurnAt ?? null;
    useEffect(() => {
        // Asks again each tick until the server agrees the turn is due.
        if (!nextTurnAt || new Date(nextTurnAt).getTime() > now) return;
        void farmingApi
            .get()
            .then(onLook)
            .catch(() => {});
    }, [nextTurnAt, now, onLook]);
    const [logOpen, setLogOpen] = useState(false);

    const act = useCallback(
        async (action: GeoFarmAction) => {
            if (busy) return;
            setBusy(true);
            try {
                const next = await farmingApi.act(action);
                setFarm(next);
                const gains = next.gained.map((gain) => `+${gain.quantity} ${items[gain.itemId]?.name ?? gain.itemId}`);
                if (next.xpGained > 0) gains.push(`+${next.xpGained} Farming XP`);
                if (gains.length > 0) showToast(gains.join(" · "), "success");
                // Seeds, charges, coins and harvests all live on the player.
                const touchesPlayer = ["plant", "play", "unlock", "place", "buy", "accept-order", "deliver-order", "offer"].includes(action.type);
                if (touchesPlayer || next.gained.length > 0) {
                    void refreshPlayer();
                }
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            } finally {
                setBusy(false);
            }
        },
        [busy, items, refreshPlayer],
    );

    const research = useCallback(
        async (mutationId: string) => {
            if (busy) return;
            setBusy(true);
            try {
                const next = await farmingApi.research({ mutationId });
                setFarm(next);
                showToast(next.log.join(" "), "success");
                void refreshPlayer();
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            } finally {
                setBusy(false);
            }
        },
        [busy, refreshPlayer],
    );

    const crops = useMemo(() => Object.fromEntries((farm?.crops ?? []).map((crop) => [crop.id, crop])), [farm?.crops]);
    const structureTypes = useMemo(
        () => Object.fromEntries((farm?.structureTypes ?? []).map((structure) => [structure.id, structure])),
        [farm?.structureTypes],
    );
    const pestTypes = useMemo(() => Object.fromEntries((farm?.pestTypes ?? []).map((pest) => [pest.id, pest])), [farm?.pestTypes]);
    const hand = useMemo(() => (farm ? handItems(farm, items) : []), [farm, items]);
    const packedSeeds = useMemo(
        () => (farm ? packedSlots(farm.seedBag.contents, items, "seeds") : []),
        [farm, items],
    );
    const preview = useMemo(
        () => (aiming && aimAt !== null && farm ? shapeTiles(aiming.shape, aimAt, farm.size) : new Set<number>()),
        [aiming, aimAt, farm],
    );

    if (!farm) {
        return (
            <RunScreen
                kind="Farm"
                title="Your Farm"
                leaveLabel="Back"
                onLeave={() => router.back()}
                arena={
                    <View style={styles.missing}>
                        <Text style={styles.missingText}>{problem ?? "Walking out to the farm…"}</Text>
                    </View>
                }
                hand={null}
            />
        );
    }

    const pressTile = (index: number) => {
        if (aiming) {
            setAiming(null);
            setAimAt(null);
            void act({ type: "play", inventoryId: aiming.inventoryId, tile: index });
            return;
        }
        setSelected(selected === index ? null : index);
    };

    const playCard = (card: InventoryItem) => {
        const farmCard = farm.hand.find((entry) => entry.inventoryId === card.id);
        if (!farmCard) return;
        if (farmCard.shape === "none") {
            void act({ type: "play", inventoryId: farmCard.inventoryId, tile: 0 });
            return;
        }
        setSelected(null);
        setAiming(aiming?.inventoryId === farmCard.inventoryId ? null : farmCard);
        setAimAt(null);
    };

    const tile = selected !== null ? farm.tiles[selected] : undefined;

    return (
        <View style={styles.screen}>
            <RunScreen
                kind="Farm"
                title={params.place || "Your Farm"}
                leaveLabel={atPlace ? "Leave" : "Back"}
                onLeave={() => router.back()}
                arena={
                    <ScrollView contentContainerStyle={styles.arena}>
                        <FarmStatus farm={farm} now={now} />
                        <EventBanner farm={farm} items={items} canBuy={atPlace && !busy} act={act} />
                        <FarmGrid
                            tiles={farm.tiles}
                            size={farm.size}
                            crops={crops}
                            pests={farm.pests}
                            pestTypes={pestTypes}
                            structureTypes={structureTypes}
                            selected={selected}
                            preview={preview}
                            onPress={pressTile}
                            onPressIn={aiming ? setAimAt : undefined}
                        />
                        <Text style={styles.log} numberOfLines={logOpen ? undefined : 3} onPress={() => setLogOpen((open) => !open)}>
                            {farm.log.length > 0
                                ? farm.log.join(" ")
                                : atPlace
                                  ? "Tap a tile to work it, or a card to aim it."
                                  : "Looking from afar: plan with blueprints, and work it at a farming place."}
                        </Text>
                    </ScrollView>
                }
                turnOrder={
                    aiming ? (
                        <Actions hint={`${SHAPE_HINT[aiming.shape]} for ${items[aiming.itemId]?.name ?? "the card"} · ${aiming.labor} Labor`}>
                            <OutcomeButton label="Cancel" onPress={() => setAiming(null)} />
                        </Actions>
                    ) : tile ? (
                        <TilePanel
                            farm={farm}
                            index={selected!}
                            crops={crops}
                            pestTypes={pestTypes}
                            structureTypes={structureTypes}
                            held={held}
                            items={items}
                            atPlace={atPlace}
                            act={act}
                            onPlan={() => setPlanning(selected)}
                            onOpenShrine={() => setShrineTile(selected)}
                            onClose={() => setSelected(null)}
                        />
                    ) : (
                        <TurnActions
                            farm={farm}
                            atPlace={atPlace}
                            act={act}
                            onOpenLab={() => setIsLabOpen(true)}
                            onOpenBuild={() => setIsBuildOpen(true)}
                            onOpenOrders={() => setIsOrdersOpen(true)}
                            onOpenContests={() => setIsContestsOpen(true)}
                            onOpenPesthunter={() => setIsPesthunterOpen(true)}
                        />
                    )
                }
                hand={
                    <RunHand
                        cards={hand}
                        disabled={!atPlace || busy}
                        onPlay={atPlace ? playCard : undefined}
                        onInspect={setInspected}
                        cornerMark={(card) => <LaborMark labor={farm.hand.find((entry) => entry.inventoryId === card.id)?.labor} />}
                        accessory={
                            <RunLunchbox kind="seeds" packed={packedSeeds} unlocked={farm.seedBag.slots} canUse={false} onUse={() => {}} />
                        }
                    />
                }
            />

            {inspected && (
                <Modal title={inspected.name} size="medium" showBack onClose={() => setInspected(null)}>
                    <ItemDetail item={inspected} />
                </Modal>
            )}

            {shrineTile !== null && (
                <ShrineModal tile={shrineTile} items={items} held={held} busy={busy} act={act} onClose={() => setShrineTile(null)} />
            )}

            {isContestsOpen && <ContestsModal contests={farm.contests} crops={crops} now={now} onClose={() => setIsContestsOpen(false)} />}

            {isOrdersOpen && (
                <OrderBoardModal
                    board={farm.orders}
                    items={items}
                    held={held}
                    busy={busy}
                    now={now}
                    act={act}
                    onClose={() => setIsOrdersOpen(false)}
                />
            )}

            {isBuildOpen && (
                <BuildModal
                    held={Object.fromEntries(farm.structureKit.map((kit) => [kit.itemId, kit.quantity]))}
                    onCrafted={() => void farmingApi.get().then(setFarm).catch(() => {})}
                    onClose={() => setIsBuildOpen(false)}
                />
            )}

            {isPesthunterOpen && (
                <PesthunterModal farm={farm} items={items} busy={busy} act={act} onClose={() => setIsPesthunterOpen(false)} />
            )}

            {isLabOpen && (
                <ResearchLabModal farm={farm} items={items} busy={busy} onResearch={(id) => void research(id)} onClose={() => setIsLabOpen(false)} />
            )}

            {planning !== null && (
                <PlanModal
                    crops={farm.crops}
                    current={farm.tiles[planning]?.blueprint ?? null}
                    onPick={(cropId) => {
                        const index = planning;
                        setPlanning(null);
                        void act({ type: "blueprint", tile: index, cropId });
                    }}
                    onClose={() => setPlanning(null)}
                />
            )}
        </View>
    );
}

/** The farming hand, drawn like the inventory draws cards. */
function handItems(farm: GeoFarmView, items: Record<string, GeoItemView>): InventoryItem[] {
    return farm.hand.flatMap((card) => {
        const def = items[card.itemId];
        if (!def) return [];
        const entry = { id: card.inventoryId, itemId: card.itemId, quantity: 1, chargesLeft: card.chargesLeft, reforge: null, pet: null, obtainedAt: "" };
        return [toInventoryItem(entry, def)];
    });
}

/** Cycle, Labor, the next cycle's countdown and the forecast, over the grid. */
function FarmStatus({ farm, now }: { farm: GeoFarmView; now: number }) {
    return (
        <View style={styles.status}>
            <Text style={styles.statusText}>
                Cycle {farm.turn} · Labor{" "}
                <Text style={styles.labor}>
                    {"●".repeat(farm.labor)}
                    <Text style={styles.laborSpent}>{"○".repeat(Math.max(0, farm.laborPerTurn - farm.labor))}</Text>
                </Text>{" "}
                · Next cycle {untilText(farm.nextTurnAt, now)}
                {farm.fortune > 0 && ` · Fortune ${farm.fortune} (×${fortuneMultiplier(farm.fortune)} crops)`}
            </Text>
            <View style={styles.forecast}>
                <Text style={[styles.weatherText, styles.weatherLater]}>Weather:</Text>
                {farm.forecast.map((weather, i) => (
                    <View key={i} style={styles.weather}>
                        <Icon name={WEATHER_INFO[weather].icon} size={14} color={i === 0 ? colors.textPrimary : colors.textSecondary} />
                        <Text style={[styles.weatherText, i > 0 && styles.weatherLater]}>{WEATHER_INFO[weather].label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * Farm events: this week's server-wide one (shown all week, so it can be
 * planned for), the one on this turn (a Travelling Merchant's offers can be
 * bought at a farming place), and the one telegraphed for the next turn.
 */
function EventBanner({
    farm,
    items,
    canBuy,
    act,
}: {
    farm: GeoFarmView;
    items: Record<string, GeoItemView>;
    canBuy: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
}) {
    const { active, next } = farm.events;
    const global = farm.global;
    const blessings = farm.blessings;
    if (!active && !next && !global && blessings.length === 0) return null;
    return (
        <View style={styles.events}>
            {blessings.map((blessing) => (
                <View key={blessing.id} style={styles.event}>
                    <Icon name="stone-tablet" size={18} color={blessing.curse ? colors.pest : colors.cropMutant} />
                    <Text style={[styles.eventText, styles.hint]}>
                        <Text style={styles.eventName}>{blessing.name}</Text> · {blessing.turnsLeft} cycle{blessing.turnsLeft === 1 ? "" : "s"} left.{" "}
                        {blessing.description}
                    </Text>
                </View>
            ))}
            {global && (
                <View style={styles.event}>
                    <Icon name={eventIcon(global.event.icon)} size={18} color={global.active ? colors.cropMutant : colors.textSecondary} />
                    <Text style={[styles.eventText, styles.hint]}>
                        <Text style={styles.eventName}>{global.event.name}</Text>
                        {global.active ? " everywhere now, until " : " everywhere, from "}
                        {new Date(global.active ? global.endsAt : global.startsAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                        . Farm cycles then get it. {global.event.description}
                    </Text>
                </View>
            )}
            {active && (
                <View style={styles.event}>
                    <Icon name={eventIcon(active.icon)} size={18} color={colors.cropRipe} />
                    <View style={styles.eventText}>
                        <Text style={styles.eventName}>
                            {active.name} <Text style={styles.hint}>{active.description}</Text>
                        </Text>
                        {active.offers.length > 0 && (
                            <View style={styles.chips}>
                                {active.offers.map((offer, i) => (
                                    <Chip
                                        key={i}
                                        label={`${offer.bought ? "Sold: " : ""}${items[offer.itemId]?.name ?? offer.itemId} · ${offer.price}`}
                                        primary={!offer.bought && canBuy}
                                        onPress={() => {
                                            if (!offer.bought && canBuy) void act({ type: "buy", offer: i });
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            )}
            {next && (
                <View style={styles.event}>
                    <Icon name={eventIcon(next.icon)} size={18} color={colors.textSecondary} />
                    <Text style={[styles.eventText, styles.hint]}>
                        Next cycle: <Text style={styles.eventName}>{next.name}</Text>. {next.description}
                    </Text>
                </View>
            )}
        </View>
    );
}

/** An event's icon if this build has it; a scroll otherwise. */
function eventIcon(name: string): Parameters<typeof Icon>[0]["name"] {
    return name in GAME_ICONS ? (name as Parameters<typeof Icon>[0]["name"]) : "scroll-unfurled";
}

/** With no tile picked: the farm's menus, and what the next turn's weather will do. */
function TurnActions({
    farm,
    atPlace,
    act,
    onOpenLab,
    onOpenBuild,
    onOpenOrders,
    onOpenContests,
    onOpenPesthunter,
}: {
    farm: GeoFarmView;
    atPlace: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    onOpenLab: () => void;
    onOpenBuild: () => void;
    onOpenOrders: () => void;
    onOpenContests: () => void;
    onOpenPesthunter: () => void;
}) {
    const next = farm.forecast[0];
    const ready = farm.lab.ready.length;
    const caged = farm.tiles.filter((tile) => tile.structure?.caged).length;
    const lab = (
        <>
            <OutcomeButton label={ready > 0 ? `Research Lab (${ready})` : "Research Lab"} onPress={onOpenLab} />
            <OutcomeButton label="Build" onPress={onOpenBuild} />
            <OutcomeButton label="Orders" onPress={onOpenOrders} />
            <OutcomeButton label="Contests" onPress={onOpenContests} />
            <OutcomeButton label={caged > 0 ? `Pesthunter (${caged})` : "Pesthunter"} onPress={onOpenPesthunter} />
        </>
    );
    if (!atPlace) return <Actions hint="Work your farm at any farming place.">{lab}</Actions>;
    const hint = [
        next ? `Next: ${WEATHER_INFO[next].label}. ${WEATHER_INFO[next].effect}` : "",
        farm.labor > 0 ? `${farm.labor} Labor left; it refills next cycle, so spend it.` : "",
        farm.pests.length > 0 ? `${farm.pests.length} pest${farm.pests.length === 1 ? "" : "s"} on the farm: red rims show what they'll hit.` : "",
        `The farm moves on its own, and waits for you after ${farm.maxTurnsAway} cycles away.`,
    ]
        .filter(Boolean)
        .join(" ");
    return (
        <Actions hint={hint}>{lab}</Actions>
    );
}

type TilePanelProps = {
    farm: GeoFarmView;
    index: number;
    crops: Record<string, GeoCropView>;
    pestTypes: Record<string, GeoPestView>;
    structureTypes: Record<string, GeoStructureView>;
    held: Record<string, number>;
    items: Record<string, GeoItemView>;
    atPlace: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    onPlan: () => void;
    onOpenShrine: () => void;
    onClose: () => void;
};

/** A picked tile: what's on it, and every plain action it allows. */
function TilePanel({ farm, index, crops, pestTypes, structureTypes, held, items, atPlace, act, onPlan, onOpenShrine, onClose }: TilePanelProps) {
    const tile = farm.tiles[index]!;
    const where = `Tile ${tile.x + 1}, ${tile.y + 1}`;
    const plan = tile.blueprint ? crops[tile.blueprint]?.name : null;
    const buttons: ReactNode[] = [];

    if (!tile.owned) {
        if (atPlace && tile.unlockable && farm.unlockCost !== null) {
            buttons.push(<Chip key="buy" label={`Buy · ${farm.unlockCost} coins`} onPress={() => void act({ type: "unlock", tile: index })} />);
        }
    } else if (atPlace && tile.structure) {
        const kind = structureTypes[tile.structure.structureId]?.kind;
        if (kind === "jukebox") {
            for (const pest of Object.values(pestTypes)) {
                buttons.push(
                    <Chip
                        key={`tune-${pest.id}`}
                        label={`♪ ${pest.name}`}
                        primary={tile.structure.tune === pest.id}
                        onPress={() => void act({ type: "tune", tile: index, pestId: pest.id })}
                    />,
                );
            }
            if (tile.structure.tune) buttons.push(<Chip key="tune-off" label="Quiet" onPress={() => void act({ type: "tune", tile: index, pestId: null })} />);
        }
        if (kind === "shrine") buttons.push(<Chip key="offer" label="Make an offering" icon="stone-tablet" primary onPress={onOpenShrine} />);
        if (kind === "portal") {
            buttons.push(
                <Text key="portal" style={styles.hint}>
                    {tile.structure.open ? "Torn open: elite pests come through on the next cycle." : "Shut. A Tear the Veil card opens it."}
                </Text>,
            );
        }
        if (kind === "cage" && tile.structure.caged) {
            buttons.push(<Chip key="release" label="Let out" onPress={() => void act({ type: "release", tile: index })} />);
        }
        buttons.push(<Chip key="pickup" label="Pick up" onPress={() => void act({ type: "pickup", tile: index })} />);
    } else if (atPlace && tile.waste) {
        buttons.push(<Chip key="scrub" label="Scrub · 3" icon="gas-mask" primary onPress={() => void act({ type: "scrub", tile: index })} />);
    } else if (atPlace) {
        if (!tile.crop) {
            for (const kit of farm.structureKit) {
                const structure = structureTypes[kit.structureId];
                if (!structure) continue;
                buttons.push(
                    <Chip
                        key={`build-${kit.structureId}`}
                        label={`Build ${structure.name} (${kit.quantity})`}
                        icon={structureIcon(structure.icon)}
                        onPress={() => void act({ type: "place", tile: index, itemId: kit.itemId })}
                    />,
                );
            }
            for (const packed of farm.seedBag.contents) {
                const crop = Object.values(crops).find((entry) => entry.seedItemId === packed.itemId);
                if (!crop) continue;
                buttons.push(
                    <Chip
                        key={`plant-${packed.slot}`}
                        label={`Plant ${crop.name} (${packed.quantity})`}
                        icon={cropIcon(crop.icon)}
                        primary={tile.blueprint === crop.id}
                        onPress={() => void act({ type: "plant", tile: index, slot: packed.slot })}
                    />,
                );
            }
            if (farm.seedBag.contents.length === 0) buttons.push(<Text key="noseeds" style={styles.hint}>Pack seeds in the Seed Bag to plant.</Text>);
        }
        if (tile.crop?.ripe) buttons.push(<Chip key="harvest" label="Harvest · 1" primary onPress={() => void act({ type: "harvest", tile: index })} />);
        if (tile.moisture < GEO_FARM_MAX_MOISTURE) {
            const fromWell = farm.tiles.some((entry) => (entry.structure?.water ?? 0) > 0);
            buttons.push(
                <Chip key="water" label={fromWell ? "Water · Well" : "Water · 1"} icon="watering-can" onPress={() => void act({ type: "water", tile: index })} />,
            );
        }
        if (tile.crop) buttons.push(<Chip key="clear" label="Clear · 1" onPress={() => void act({ type: "clear", tile: index })} />);
        for (const amendment of farm.amendments) {
            const have = held[amendment.itemId] ?? 0;
            if (have === 0 || tile.soil === amendment.soil) continue;
            buttons.push(
                <Chip
                    key={`amend-${amendment.itemId}`}
                    label={`${items[amendment.itemId]?.name ?? amendment.itemId} (${have})`}
                    onPress={() => void act({ type: "amend", tile: index, itemId: amendment.itemId })}
                />,
            );
        }
    }
    if (atPlace && tile.owned && farm.pests.some((pest) => pest.tile === index)) {
        if (hasEmptyCageBy(farm, index, structureTypes)) {
            buttons.unshift(<Chip key="cage" label="Cage · 2" icon="cage" onPress={() => void act({ type: "cage", tile: index })} />);
        }
        buttons.unshift(<Chip key="swat" label="Swat · 2" icon="bug-net" primary onPress={() => void act({ type: "swat", tile: index })} />);
    }
    buttons.push(<Chip key="plan" label={plan ? `Plan: ${plan}` : "Plan…"} onPress={onPlan} />);

    const soil = tile.soilOverlay
        ? ` · ${SOIL_INFO[tile.soilOverlay.soil].label} for ${tile.soilOverlay.turnsLeft} cycle${tile.soilOverlay.turnsLeft === 1 ? "" : "s"}`
        : tile.soil !== "normal"
          ? ` · ${SOIL_INFO[tile.soil].label} soil`
          : "";
    const facts = tile.owned
        ? `water ${tile.moisture}/${GEO_FARM_MAX_MOISTURE} · fertility ${tile.fertility}/${GEO_FARM_MAX_FERTILITY}${tile.soakTurns > 0 ? ` · soaked ${tile.soakTurns}` : ""}${soil}`
        : tile.unlockable
          ? "Locked · can be bought"
          : "Locked · buy a tile next to it first";

    return (
        <View style={styles.panel}>
            <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>
                    {where} <Text style={styles.panelFacts}>· {facts}</Text>
                </Text>
                <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close tile">
                    <Text style={styles.close}>✕</Text>
                </Pressable>
            </View>
            {tile.owned && (
                <Text style={styles.cropLine}>
                    {tile.waste
                        ? "Nuclear waste: nothing grows here, and it may spread. Mutations stir beside it."
                        : tile.structure
                        ? structureLine(tile.structure, structureTypes, pestTypes)
                        : cropLine(tile, tile.crop ? (crops[tile.crop.cropId]?.name ?? "crop") : "")}
                </Text>
            )}
            <PestLines farm={farm} index={index} pestTypes={pestTypes} />
            <View style={styles.chips}>{buttons}</View>
            {atPlace && tile.owned && <Text style={styles.hint}>Numbers are Labor. Planting is free.</Text>}
        </View>
    );
}

/** A structure in one line: what it is and what it holds. */
function structureLine(
    structure: NonNullable<GeoFarmView["tiles"][number]["structure"]>,
    structureTypes: Record<string, GeoStructureView>,
    pestTypes: Record<string, GeoPestView>,
): string {
    const type = structureTypes[structure.structureId];
    const name = type?.name ?? "Structure";
    const pestName = (id: string | null) => (id ? (pestTypes[id]?.name ?? "a pest") : null);
    switch (type?.kind) {
        case "jukebox":
            return `${name} · ${structure.tune ? `playing the ${pestName(structure.tune)}'s tune` : "quiet"}`;
        case "cage":
            return `${name} · ${structure.caged ? `holds a ${pestName(structure.caged)}` : "empty"}`;
        case "compost":
            return `${name} · ${structure.compost} compost`;
        case "well":
            return `${name} · ${structure.water} water stored`;
        default:
            return type ? `${name} · ${type.description}` : name;
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
    const here = farm.pests.filter((pest) => pest.tile === index);
    const coming = farm.pests.filter((pest) => pest.tile !== index && pest.intent.tile === index && pest.intent.kind !== "move");
    const trap = farm.tiles[index]?.trap;
    if (here.length === 0 && coming.length === 0 && !trap && !farm.tiles[index]?.pollinated) return null;
    const at = (tile: number) => `(${(tile % farm.size) + 1}, ${Math.floor(tile / farm.size) + 1})`;
    return (
        <View style={styles.pestLines}>
            {here.map((pest) => (
                <View key={pest.id} style={styles.pestLine}>
                    <Icon name={pestIcon(pestTypes[pest.pestId]?.icon ?? "")} size={14} color={colors.pest} />
                    <Text style={styles.pestText}>
                        <Text style={styles.pestName}>{pestTypes[pest.pestId]?.name ?? "Pest"}</Text>: {pest.intentText}.
                    </Text>
                </View>
            ))}
            {coming.map((pest) => (
                <Text key={pest.id} style={styles.pestText}>
                    ⚠ The {pestTypes[pest.pestId]?.name ?? "pest"} at {at(pest.tile)} is coming for this tile.
                </Text>
            ))}
            {trap && <Text style={styles.hint}>A Snap Trap is set here for the next cycle.</Text>}
            {farm.tiles[index]?.pollinated && <Text style={styles.hint}>Hand pollinated: better odds of a mutation here on the next cycle.</Text>}
        </View>
    );
}

/**
 * The Research Lab: mutations found so far with their recipes, the ones the
 * player could turn in now, and how many are still out there. No hints:
 * recipes are found by experimenting.
 */
function ResearchLabModal({
    farm,
    items,
    busy,
    onResearch,
    onClose,
}: {
    farm: GeoFarmView;
    items: Record<string, GeoItemView>;
    busy: boolean;
    onResearch: (mutationId: string) => void;
    onClose: () => void;
}) {
    const { found, total, ready } = farm.lab;
    return (
        <Modal title="Research Lab" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.lab}>
                <Text style={styles.planHint}>
                    Mutations sprout on empty tiles when the crops, weather, soil or pests around them are just right. Bring the first of each here to
                    record its recipe. {found.length} of {total} found.
                </Text>
                {ready.map((entry) => (
                    <View key={entry.mutationId} style={styles.labReady}>
                        <Text style={styles.labName}>{items[entry.itemId]?.name ?? "A mutation"}</Text>
                        <Text style={styles.hint}>
                            New to the Lab. Turn it in for {entry.coins} coins and {entry.xp} Farming XP, and its recipe goes in the journal.
                        </Text>
                        <Chip label={busy ? "…" : "Turn in"} icon="microscope" primary onPress={() => onResearch(entry.mutationId)} />
                    </View>
                ))}
                {found.map((entry) => (
                    <View key={entry.mutationId} style={styles.labEntry}>
                        <Icon name={cropIcon(entry.icon)} size={28} color={colors.cropMutant} />
                        <View style={styles.labText}>
                            <Text style={styles.labName}>{entry.name}</Text>
                            <Text style={styles.pestText}>{entry.recipe}.</Text>
                            <Text style={styles.hint}>{entry.description}</Text>
                        </View>
                    </View>
                ))}
                {Array.from({ length: total - found.length }, (_, i) => (
                    <View key={`unknown-${i}`} style={styles.labEntry}>
                        <Text style={styles.labUnknown}>?</Text>
                        <Text style={styles.hint}>Not yet found.</Text>
                    </View>
                ))}
            </ScrollView>
        </Modal>
    );
}

/** Choose the ghost crop for a tile, or clear it. */
function PlanModal({
    crops,
    current,
    onPick,
    onClose,
}: {
    crops: GeoCropView[];
    current: string | null;
    onPick: (cropId: string | null) => void;
    onClose: () => void;
}) {
    return (
        <Modal title="Plan this tile" size="medium" onClose={onClose}>
            <Text style={styles.planHint}>A faded ghost of the crop, so you remember the layout when you&apos;re back.</Text>
            <View style={styles.planList}>
                {crops.map((crop) => (
                    <Chip key={crop.id} label={crop.name} icon={cropIcon(crop.icon)} primary={current === crop.id} onPress={() => onPick(crop.id)} />
                ))}
                {current && <Chip label="No plan" onPress={() => onPick(null)} />}
            </View>
        </Modal>
    );
}

function Chip({ label, icon, primary = false, onPress }: { label: string; icon?: Parameters<typeof Icon>[0]["name"]; primary?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.chip, primary && styles.chipPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            {icon && <Icon name={icon} size={14} color={primary ? colors.textOnEmber : colors.textPrimary} />}
            <Text style={[styles.chipText, primary && styles.chipTextPrimary]}>{label}</Text>
        </Pressable>
    );
}

function Actions({ hint, children }: { hint: string; children?: ReactNode }) {
    return (
        <View style={styles.actions}>
            {children && <View style={styles.actionRow}>{children}</View>}
            <Text style={styles.hint}>{hint}</Text>
        </View>
    );
}

/** A card's Labor cost, in its corner. */
function LaborMark({ labor }: { labor: number | undefined }) {
    if (labor === undefined) return null;
    return <Text style={styles.laborMark}>{labor}</Text>;
}

const styles = StyleSheet.create({
    lab: {
        gap: 12,
        paddingBottom: 16,
    },
    labReady: {
        gap: 6,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.cropMutant,
    },
    labEntry: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    labText: {
        flex: 1,
        gap: 2,
    },
    labName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    labUnknown: {
        width: 28,
        textAlign: "center",
        color: colors.textSecondary,
        fontSize: 20,
        fontWeight: "800",
    },
    pestLines: {
        gap: 3,
    },
    pestLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    pestText: {
        flexShrink: 1,
        color: colors.textPrimary,
        fontSize: 12,
    },
    pestName: {
        color: colors.pest,
        fontWeight: "700",
    },
    screen: {
        flex: 1,
    },
    arena: {
        gap: 10,
        paddingTop: 4,
        paddingBottom: 12,
    },
    status: {
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
    },
    statusText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
    },
    labor: {
        color: colors.emberBright,
        letterSpacing: 1,
    },
    laborSpent: {
        color: colors.textSecondary,
    },
    forecast: {
        flexDirection: "row",
        gap: 12,
    },
    weather: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    weatherText: {
        color: colors.textPrimary,
        fontSize: 11,
    },
    weatherLater: {
        color: colors.textSecondary,
    },
    log: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: "center",
        paddingHorizontal: 16,
        minHeight: 32,
    },
    panel: {
        gap: 6,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    panelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    panelTitle: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
    },
    panelFacts: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "400",
    },
    close: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    cropLine: {
        color: colors.textPrimary,
        fontSize: 12,
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    chipPrimary: {
        borderColor: colors.emberBright,
        backgroundColor: colors.emberBright,
    },
    chipText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
    },
    chipTextPrimary: {
        color: colors.textOnEmber,
    },
    pressed: {
        opacity: 0.6,
    },
    actions: {
        alignItems: "center",
        gap: 6,
    },
    actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    events: {
        gap: 6,
    },
    event: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    eventText: {
        flex: 1,
        gap: 4,
    },
    eventName: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: "700",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 11,
        textAlign: "center",
    },
    laborMark: {
        color: colors.emberBright,
        fontSize: 10,
        fontWeight: "700",
    },
    planHint: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 10,
    },
    planList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    missing: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    missingText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontStyle: "italic",
        textAlign: "center",
    },
});
