import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import Modal from "@/components/Modal/Modal";
import { Body } from "@/components/Text/Text";
import { showToast } from "@/components/Toast/toastStore";
import BuildModal from "@/features/farming/components/BuildModal";
import CardTray from "@/features/farming/components/CardTray";
import ContestsModal from "@/features/farming/components/ContestsModal";
import EventPills, { EventSheet } from "@/features/farming/components/EventPills";
import FarmCoach, { coachLine } from "@/features/farming/components/FarmCoach";
import FarmHeader from "@/features/farming/components/FarmHeader";
import FarmMenuSheet, { farmMenuItems, type FarmMenuEntry } from "@/features/farming/components/FarmMenuSheet";
import FarmPlot, { type FloatingGain } from "@/features/farming/components/FarmPlot";
import JournalSheet, { type JournalEntry } from "@/features/farming/components/JournalSheet";
import NextStepButton, { AimingRow } from "@/features/farming/components/NextStepButton";
import OrderBoardModal from "@/features/farming/components/OrderBoardModal";
import PesthunterModal from "@/features/farming/components/PesthunterModal";
import PlanModal from "@/features/farming/components/PlanModal";
import PlantAllSheet from "@/features/farming/components/PlantAllSheet";
import ResearchLabModal from "@/features/farming/components/ResearchLabModal";
import { heldSeeds } from "@/features/farming/components/SeedPicker";
import ShrineModal from "@/features/farming/components/ShrineModal";
import SkyStrip from "@/features/farming/components/SkyStrip";
import TileSheet from "@/features/farming/components/TileSheet";
import { useFarmGuideStore } from "@/features/farming/farmGuideStore";
import { farmingApi } from "@/features/farming/farmingApi";
import { footprintTiles, fortuneMultiplier, SHAPE_HINT, shapeTiles, untilText } from "@/features/farming/farmText";
import { farmFeatures, isPlantable } from "@/features/farming/farmView";
import { nextStep } from "@/features/farming/nextStep";
import { useReportActivity } from "@/features/friends/presenceStore";
import ItemDetail from "@/features/items/components/ItemDetail";
import type { InventoryItem } from "@/features/items/inventoryItems";
import { usePlayerStore } from "@/features/player/playerStore";
import { toInventoryItem } from "@/features/player/toInventoryItem";
import { useInventory } from "@/features/player/usePlayer";
import { useAdminSettingsStore } from "@/features/settings/adminSettingsStore";
import { toErrorMessage } from "@/lib/api";
import type { GeoFarmAction, GeoFarmGain, GeoFarmHandCard, GeoFarmView, GeoItemView, GeoStructureView } from "@/lib/geo/contracts";
import { createStyles, MoodProvider, useAmbientMood } from "@/theme/theme";

/**
 * The farm: one grid on a real clock. Every cycle it takes a turn on its own
 * (crops grow, weather lands, pests move), and the hand's cards can each play
 * once again. Nobody waters: the sky (and Ponds and Wells) sets each tile's
 * ground. After a few cycles unvisited it waits for you. The server plays
 * the turns when the farm is next looked at, and runs every rule.
 *
 * Opened as `/farm?place=…&latitude=…&longitude=…` from a farming place,
 * where it can be worked, or as `/farm` from the character screen, where it
 * can only be looked at and planned (blueprints), unless an admin has the
 * free camera on, which counts as being at a place.
 *
 * This route holds the data, the actions and which sheet is open; what's
 * drawn lives in `features/farming/components`.
 */
export default function FarmScreen() {
    // Follows the phone's light or dark mode, like the map.
    const mood = useAmbientMood();
    return (
        <MoodProvider mood={mood}>
            <FarmScreenContent />
        </MoodProvider>
    );
}

type Overlay =
    | { kind: "tile"; index: number }
    | { kind: "menu" }
    | { kind: "events" }
    | { kind: "journal" }
    | { kind: "plant-all" }
    | { kind: "lab" }
    | { kind: "orders" }
    | { kind: "contests" }
    | { kind: "pesthunter" }
    | { kind: "plan"; index: number }
    | { kind: "shrine"; index: number }
    /** The Build list: for a tile, or for picking where after (null). */
    | { kind: "build"; tile: number | null }
    | { kind: "card"; item: InventoryItem };

function FarmScreenContent() {
    const styles = useStyles();
    const params = useLocalSearchParams<{ place?: string; latitude?: string; longitude?: string }>();
    const isFreeCamera = useAdminSettingsStore((state) => state.isFreeCamera);
    const isAdmin = usePlayerStore((state) => state.me?.player.role === "admin");
    const atPlace = Boolean(params.place) || isFreeCamera;
    // Friends see real farming only, not an admin testing from anywhere.
    useReportActivity(params.place ? "skilling" : "exploring", params.place ? "farming" : null);
    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const refreshPlayer = usePlayerStore((state) => state.refresh);
    const items = usePlayerStore((state) => state.items);
    const guideDone = useFarmGuideStore((state) => state.isDone);
    const finishGuide = useFarmGuideStore((state) => state.finish);

    const [farm, setFarm] = useState<GeoFarmView | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [overlay, setOverlay] = useState<Overlay | null>(null);
    const [aiming, setAiming] = useState<GeoFarmHandCard | null>(null);
    const [aimAt, setAimAt] = useState<number | null>(null);
    /** A structure picked from the Build list, waiting for the tile to centre it on. */
    const [building, setBuilding] = useState<string | null>(null);
    const [gains, setGains] = useState<FloatingGain[]>([]);
    const [journal, setJournal] = useState<JournalEntry[]>([]);
    const nextId = useRef(0);
    const [now, setNow] = useState(() => Date.now());
    const inventory = useInventory();
    const held = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const entry of inventory) counts[entry.itemId] = (counts[entry.itemId] ?? 0) + (entry.quantity ?? 1);
        return counts;
    }, [inventory]);

    /** Float what came in over the tile it came from, and keep the log for the journal. */
    const record = useCallback(
        (next: GeoFarmView, tile: number | null) => {
            const texts = next.gained.map((gain: GeoFarmGain) => `+${gain.quantity} ${items[gain.itemId]?.name ?? gain.itemId}`);
            if (next.xpGained > 0) texts.push(`+${next.xpGained} Farming XP`);
            if (texts.length > 0) setGains((list) => [...list, ...texts.map((text, i) => ({ id: nextId.current++, text, tile: i === 0 ? tile : null }))]);
            if (next.log.length > 0) setJournal((list) => [{ id: nextId.current++, at: Date.now(), lines: next.log }, ...list].slice(0, 50));
        },
        [items],
    );

    /** A look at the farm plays the turns that came due, which may have dropped something. */
    const onLook = useCallback(
        (next: GeoFarmView) => {
            setFarm(next);
            record(next, null);
            if (next.gained.length > 0) void refreshPlayer();
        },
        [record, refreshPlayer],
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

    // The cycle countdown, and a fresh look once the farm's turn is due.
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

    const act = useCallback(
        async (action: GeoFarmAction) => {
            if (busy) return;
            setBusy(true);
            try {
                const next = await farmingApi.act(action);
                setFarm(next);
                record(next, "tile" in action && typeof action.tile === "number" ? action.tile : null);
                if (action.type === "harvest" || action.type === "harvest-all") finishGuide();
                // Seeds, charges, coins and harvests all live on the player.
                const touchesPlayer = ["plant", "plant-all", "play", "unlock", "place", "buy", "accept-order", "deliver-order", "offer"].includes(action.type);
                if (touchesPlayer || next.gained.length > 0) void refreshPlayer();
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            } finally {
                setBusy(false);
            }
        },
        [busy, finishGuide, record, refreshPlayer],
    );

    /** Playtesting: an admin's farm takes its next cycle now. */
    const adminNext = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            const next = await farmingApi.adminNextCycle();
            setFarm(next);
            record(next, null);
            showToast(`Cycle ${next.turn}`, "success");
            if (next.gained.length > 0) void refreshPlayer();
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setBusy(false);
        }
    }, [busy, record, refreshPlayer]);

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

    const dropGain = useCallback((id: number) => setGains((list) => list.filter((gain) => gain.id !== id)), []);

    const crops = useMemo(() => Object.fromEntries((farm?.crops ?? []).map((crop) => [crop.id, crop])), [farm?.crops]);
    const structureTypes = useMemo(
        () => Object.fromEntries((farm?.structureTypes ?? []).map((structure) => [structure.id, structure])),
        [farm?.structureTypes],
    );
    const pestTypes = useMemo(() => Object.fromEntries((farm?.pestTypes ?? []).map((pest) => [pest.id, pest])), [farm?.pestTypes]);
    const hand = useMemo(() => (farm ? handItems(farm, items) : []), [farm, items]);
    const preview = useMemo(() => {
        if (aimAt === null || !farm) return new Set<number>();
        if (aiming) return shapeTiles(aiming.shape, aimAt, farm.size);
        const structure = building ? structureTypes[building] : undefined;
        return structure ? footprintTiles(structure.size, aimAt, farm.size) : new Set<number>();
    }, [aiming, aimAt, building, farm, structureTypes]);

    const leave = () => router.back();
    const leaveLabel = atPlace ? "Leave" : "Back";
    const title = params.place || "Your Farm";

    if (!farm) {
        return (
            <View style={styles.screen}>
                <FarmHeader title={title} subtitle="" leaveLabel={leaveLabel} onLeave={leave} onOpenJournal={() => {}} />
                <View style={styles.missing}>
                    <Body center>{problem ?? "Walking out to the farm…"}</Body>
                </View>
            </View>
        );
    }

    const close = () => setOverlay(null);
    const pressTile = (index: number) => {
        if (building) {
            setBuilding(null);
            setAimAt(null);
            void act({ type: "place", tile: index, structureId: building });
            return;
        }
        if (aiming) {
            setAiming(null);
            setAimAt(null);
            void act({ type: "play", inventoryId: aiming.inventoryId, tile: index });
            return;
        }
        setOverlay({ kind: "tile", index });
    };

    const playCard = (card: InventoryItem) => {
        const farmCard = farm.hand.find((entry) => entry.inventoryId === card.id);
        if (!farmCard) return;
        if (farmCard.shape === "none") {
            void act({ type: "play", inventoryId: farmCard.inventoryId, tile: 0 });
            return;
        }
        setOverlay(null);
        setBuilding(null);
        setAiming(aiming?.inventoryId === farmCard.inventoryId ? null : farmCard);
        setAimAt(null);
    };

    const cageIds = new Set(Object.values(structureTypes).filter((type) => type.kind === "cage").map((type) => type.id));
    const menuItems = farmMenuItems(farm, held, farmFeatures(farm, cageIds), isAdmin);
    const menuBadge = menuItems.reduce((sum, item) => sum + item.badge, 0);
    const openMenuEntry = (entry: FarmMenuEntry) => {
        if (entry === "admin-next") {
            setOverlay(null);
            void adminNext();
            return;
        }
        setOverlay(entry === "build" ? { kind: "build", tile: null } : { kind: entry });
    };

    const step = nextStep(farm, atPlace, held, now);
    const onStep = () => {
        if (step.kind === "harvest-all") void act({ type: "harvest-all" });
        if (step.kind === "plant-all") {
            // One kind of seed and no plans: nothing to choose, so plant now.
            const seeds = heldSeeds(crops, held);
            const anyPlanned = farm.tiles.some((tile) => isPlantable(tile) && tile.blueprint);
            if (seeds.length === 1 && !anyPlanned) void act({ type: "plant-all", itemId: seeds[0]!.seedItemId });
            else setOverlay({ kind: "plant-all" });
        }
        if (step.kind === "tile") setOverlay({ kind: "tile", index: step.tile });
    };
    const hasSeeds = heldSeeds(crops, held).length > 0;
    const subtitle = [`Farming Lv ${farm.farmingLevel}`, farm.fortune > 0 ? `Fortune ×${fortuneMultiplier(farm.fortune)}` : ""].filter(Boolean).join(" · ");
    const selected = overlay?.kind === "tile" ? overlay.index : null;

    return (
        <View style={styles.screen}>
            <FarmHeader title={title} subtitle={subtitle} leaveLabel={leaveLabel} onLeave={leave} onOpenJournal={() => setOverlay({ kind: "journal" })} />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <SkyStrip farm={farm} now={now} atPlace={atPlace} />
                <EventPills farm={farm} onOpen={() => setOverlay({ kind: "events" })} />
                <FarmPlot
                    farm={farm}
                    crops={crops}
                    pestTypes={pestTypes}
                    structureTypes={structureTypes}
                    selected={selected}
                    preview={preview}
                    gains={gains}
                    onGainDone={dropGain}
                    onPress={pressTile}
                    onPressIn={aiming || building ? setAimAt : undefined}
                    coach={atPlace && !guideDone ? <FarmCoach line={coachLine(farm, hasSeeds, now)} onDismiss={finishGuide} /> : undefined}
                />
                {building ? (
                    <AimingRow
                        hint={buildHint(structureTypes[building])}
                        onCancel={() => {
                            setBuilding(null);
                            setAimAt(null);
                        }}
                    />
                ) : aiming ? (
                    <AimingRow
                        hint={`${SHAPE_HINT[aiming.shape]} for ${items[aiming.itemId]?.name ?? "the card"}.`}
                        onCancel={() => {
                            setAiming(null);
                            setAimAt(null);
                        }}
                    />
                ) : (
                    <NextStepButton step={step} busy={busy} onStep={onStep} menuBadge={menuBadge} onOpenMenu={() => setOverlay({ kind: "menu" })} />
                )}
            </ScrollView>
            <CardTray
                cards={hand}
                played={new Set(farm.hand.filter((card) => card.played).map((card) => card.inventoryId))}
                playsLeft={farm.playsLeft}
                nextCycle={untilText(farm.nextTurnAt, now)}
                canPlay={atPlace && !busy}
                onPlay={playCard}
                onInspect={(item) => setOverlay({ kind: "card", item })}
            />

            {overlay?.kind === "tile" && (
                <TileSheet
                    key={overlay.index}
                    farm={farm}
                    index={overlay.index}
                    crops={crops}
                    pestTypes={pestTypes}
                    structureTypes={structureTypes}
                    held={held}
                    items={items}
                    atPlace={atPlace}
                    act={act}
                    onPlan={() => setOverlay({ kind: "plan", index: overlay.index })}
                    onOpenShrine={() => setOverlay({ kind: "shrine", index: overlay.index })}
                    onBuildHere={() => setOverlay({ kind: "build", tile: overlay.index })}
                    // A follow-on (Plan, Build here) sets the next overlay right after this.
                    onClose={close}
                />
            )}
            {overlay?.kind === "menu" && <FarmMenuSheet items={menuItems} onPick={openMenuEntry} onClose={close} />}
            {overlay?.kind === "events" && <EventSheet farm={farm} items={items} canBuy={atPlace && !busy} act={act} onClose={close} />}
            {overlay?.kind === "plant-all" && <PlantAllSheet farm={farm} crops={crops} held={held} act={act} onClose={close} />}
            {overlay?.kind === "journal" && <JournalSheet entries={journal} onClose={close} />}
            {overlay?.kind === "card" && (
                <Modal title={overlay.item.name} size="medium" showBack onClose={close}>
                    <ItemDetail item={overlay.item} />
                </Modal>
            )}
            {overlay?.kind === "shrine" && <ShrineModal tile={overlay.index} items={items} held={held} busy={busy} act={act} onClose={close} />}
            {overlay?.kind === "contests" && <ContestsModal contests={farm.contests} crops={crops} now={now} onClose={close} />}
            {overlay?.kind === "orders" && <OrderBoardModal board={farm.orders} items={items} held={held} busy={busy} now={now} act={act} onClose={close} />}
            {overlay?.kind === "build" && (
                <BuildModal
                    farm={farm}
                    structureTypes={structureTypes}
                    items={items}
                    held={held}
                    canBuild={atPlace && !busy}
                    tile={overlay.tile}
                    onBuild={(structureId) => {
                        const tile = overlay.tile;
                        setOverlay(null);
                        if (tile !== null) {
                            void act({ type: "place", tile, structureId });
                            return;
                        }
                        setAiming(null);
                        setBuilding(structureId);
                    }}
                    onClose={close}
                />
            )}
            {overlay?.kind === "pesthunter" && <PesthunterModal farm={farm} items={items} busy={busy} act={act} onClose={close} />}
            {overlay?.kind === "lab" && <ResearchLabModal farm={farm} items={items} busy={busy} onResearch={(id) => void research(id)} onClose={close} />}
            {overlay?.kind === "plan" && (
                <PlanModal
                    crops={farm.crops}
                    current={farm.tiles[overlay.index]?.blueprint ?? null}
                    onPick={(cropId) => {
                        const index = overlay.index;
                        setOverlay(null);
                        void act({ type: "blueprint", tile: index, cropId });
                    }}
                    onClose={close}
                />
            )}
        </View>
    );
}

/** What to tap while placing a structure picked from the Build list. */
function buildHint(structure: GeoStructureView | undefined): string {
    if (!structure) return "Tap a tile to build on.";
    const { width, height } = structure.size;
    return width * height > 1
        ? `Tap the middle tile for the ${structure.name} (${width}×${height}). Every tile under it must be yours and clear.`
        : `Tap an empty tile for the ${structure.name}.`;
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

const useStyles = createStyles((p) => ({
    screen: {
        flex: 1,
        backgroundColor: p.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        gap: 14,
        paddingTop: 4,
        paddingBottom: 16,
    },
    missing: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
}));
