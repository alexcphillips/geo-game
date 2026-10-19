import { useEffect, useRef, useState } from "react";
import { router, useIsFocused } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { usePlayerLocation } from "@/features/location/hooks/usePlayerLocation";
import GameMap from "@/features/map/components/GameMap";
import type { MapNearPlaces, MapNearWater } from "@/features/map/mapHtml";
import BottomBar, { useBottomBarHeight } from "@/features/hud/components/BottomBar";
import SettingsButton from "@/features/hud/components/SettingsButton";
import FriendsButton from "@/features/hud/components/FriendsButton";
import InboxButton from "@/features/hud/components/InboxButton";
import LobbyButton from "@/features/hud/components/LobbyButton";
import DungeonsModal from "@/features/dungeons/components/DungeonsModal";
import { useDungeonPolling, useLobbyExitWatcher } from "@/features/dungeons/dungeonStore";
import InboxModal from "@/features/inbox/components/InboxModal";
import WhatsNewModal from "@/features/inbox/components/WhatsNewModal";
import { useWhatsNew } from "@/features/inbox/useWhatsNew";
import FriendsModal from "@/features/friends/components/FriendsModal";
import CraftingModal from "@/features/crafting/components/CraftingModal";
import DeckModal from "@/features/deck/components/DeckModal";
import { CAMP_RADIUS_METRES } from "@/features/camp/camp";
import CampModal from "@/features/camp/components/CampModal";
import CookingModal from "@/features/cooking/components/CookingModal";
import SkillsModal from "@/features/skills/components/SkillsModal";
import QuestLogModal from "@/features/quests/components/QuestLogModal";
import LunchboxModal from "@/features/lunchbox/components/LunchboxModal";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import CoinCounter from "@/features/hud/components/CoinCounter";
import PlayerStatusHud from "@/features/hud/components/PlayerStatusHud";
import { distanceMetres } from "@/features/location/distance";
import PlaceModal from "@/features/places/components/PlaceModal";
import { confirmRemovePlace } from "@/features/places/placeAdmin";
import { usePlaceDraft } from "@/features/places/placeDraft";
import { fishingTier } from "@/features/places/fishingWaters";
import { PLACE_REACH_METRES, PLACE_TYPES, placeTitle, type MapPlace } from "@/features/places/places";
import { useHandMadePlaces } from "@/features/places/useHandMadePlaces";
import InventoryModal from "@/features/inventory/components/InventoryModal";
import MarketModal from "@/features/market/components/MarketModal";
import VendorsModal from "@/features/vendors/components/VendorsModal";
import CommunityCenterModal, {
    type CommunityCenterTab,
} from "@/features/community/components/CommunityCenterModal";
import type { SuggestionFocus } from "@/features/settings/components/AdminSuggestionsPage";
import SuggestionFocusOverlay from "@/features/settings/components/SuggestionFocusOverlay";
import SettingsModal, {
    type SettingsPage,
} from "@/features/settings/components/SettingsModal";
import PinDropOverlay from "@/features/suggestions/components/PinDropOverlay";
import {
    useSuggestionDraft,
    type Coordinates,
} from "@/features/suggestions/suggestionDraft";
import { suggestionKindInfo } from "@/features/suggestions/suggestionKinds";
import ServerStatusBanner from "@/features/player/components/ServerStatusBanner";
import { usePlayerStore } from "@/features/player/playerStore";
import { useCoins } from "@/features/player/usePlayer";
import { useAdminSettingsStore } from "@/features/settings/adminSettingsStore";
import { useWorldSpawns } from "@/features/spawns/useWorldSpawns";
import { showToast } from "@/components/Toast/toastStore";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoAdminAdjustSuggestionRequest,
    type GeoAdminSuggestion,
    type GeoRunResponse,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { ABOVE_BAR_GAP } from "@/theme/layout";

/**
 * The world screen — the game's home. Everything else is reached from here.
 *
 * Three states: waiting on a fix, refused permission, and playing. There is no
 * "map with no player on it" state, because a location game with no location
 * has nothing to show.
 */
export default function WorldScreen() {
    const { position, permission, error } = usePlayerLocation();
    const [mapError, setMapError] = useState<string | null>(null);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isVendorsOpen, setIsVendorsOpen] = useState(false);
    const [isMarketOpen, setIsMarketOpen] = useState(false);
    const [communityCenterTab, setCommunityCenterTab] = useState<CommunityCenterTab | null>(null);
    const [isFriendsOpen, setIsFriendsOpen] = useState(false);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeckOpen, setIsDeckOpen] = useState(false);
    const [isCraftingOpen, setIsCraftingOpen] = useState(false);
    const [isCampOpen, setIsCampOpen] = useState(false);
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [isCookingOpen, setIsCookingOpen] = useState(false);
    const [isQuestLogOpen, setIsQuestLogOpen] = useState(false);
    const barHeight = useBottomBarHeight();
    // Opened from Camp (to restock), or the lunchbox from the health bar (to eat).
    const [openPack, setOpenPack] = useState<"lunchbox" | "bait" | null>(null);
    const [settingsPage, setSettingsPage] = useState<SettingsPage>("menu");
    const isFreeCamera = useAdminSettingsStore((state) => state.isFreeCamera);
    const setIsFreeCamera = useAdminSettingsStore((state) => state.setIsFreeCamera);
    const [openPlace, setOpenPlace] = useState<MapPlace | null>(null);
    // The dungeon menu, opened from a POI (`place`) or the HUD's lobby button.
    const [dungeonMenu, setDungeonMenu] = useState<{ place: MapPlace | null } | null>(null);

    const isPlayerReady = usePlayerStore((state) => state.status === "ready");
    const coins = useCoins();
    const camp = usePlayerStore((state) => state.me?.camp ?? null);
    const [nearWater, setNearWater] = useState<MapNearWater | null>(null);
    const [nearPlaces, setNearPlaces] = useState<MapNearPlaces>({});
    const { spawns, reachMetres, spawnRadiusMetres } = useWorldSpawns(position, isPlayerReady, nearWater, nearPlaces);
    const handMadePlaces = useHandMadePlaces(position, isPlayerReady);
    const isAdmin = usePlayerStore((state) => state.me?.player.role === "admin");
    const showSpawnRadius = useAdminSettingsStore((state) => state.showSpawnRadius);
    const whatsNew = useWhatsNew();
    const isFocused = useIsFocused();
    // "What's new" waits for the map to be free: never over a menu or a fight.
    const isAnythingOpen =
        isInventoryOpen ||
        isVendorsOpen ||
        isMarketOpen ||
        communityCenterTab !== null ||
        isFriendsOpen ||
        isInboxOpen ||
        isSettingsOpen ||
        isDeckOpen ||
        isCraftingOpen ||
        isCampOpen ||
        openPack !== null ||
        dungeonMenu !== null ||
        openPlace !== null;
    useDungeonPolling(dungeonMenu !== null, isPlayerReady);
    // The host started the lobby: this player's fight is already open.
    useLobbyExitWatcher(() => {
        setDungeonMenu(null);
        router.push("/run/combat");
    });

    // A fight left open (the app closed mid-Run) picks back up on launch.
    // Once per launch: after that, the player is free to walk away from it.
    const checkedActiveRun = useRef(false);
    useEffect(() => {
        if (!isPlayerReady || checkedActiveRun.current) return;
        checkedActiveRun.current = true;
        api.get<GeoRunResponse | null>(GEO_API_PATHS.runs.active)
            .then((active) => {
                if (active) router.push("/run/combat");
            })
            .catch(() => {});
    }, [isPlayerReady]);

    // Pin drop: the modal it started from closes so the map is visible, then
    // reopens where it was: Settings' Suggest page for a suggestion, or
    // Settings for (admins) a hand-made place or a player's
    // suggestion being corrected. `pinBeforeDrop` is what Cancel restores.
    const [pinDropFor, setPinDropFor] = useState<"suggestion" | "place" | "review" | null>(null);
    // Admins correcting a suggestion's pin: which one, and where it is now.
    const [reviewPin, setReviewPin] = useState<{ suggestion: GeoAdminSuggestion; pin: Coordinates } | null>(null);
    const isDroppingPin = pinDropFor !== null;
    const [pinBeforeDrop, setPinBeforeDrop] = useState<Coordinates | null>(null);
    const suggestionKind = useSuggestionDraft((draft) => draft.kind);
    const suggestionPin = useSuggestionDraft((draft) => draft.pin);
    const setSuggestionPin = useSuggestionDraft((draft) => draft.setPin);
    const placeKind = usePlaceDraft((draft) => draft.kind);
    const placePin = usePlaceDraft((draft) => draft.pin);
    const updatePlaceDraft = usePlaceDraft((draft) => draft.update);
    const startEditPlace = usePlaceDraft((draft) => draft.startEdit);
    const setPlacePin = (pin: Coordinates | null) => updatePlaceDraft({ pin });

    const openSettings = (page: SettingsPage = "menu") => {
        setSettingsPage(page);
        setIsSettingsOpen(true);
    };

    // Admin pin drops use the free camera, so a pin far from the admin can
    // be reached; the camera goes back as it was afterwards.
    const [wasFreeCameraBeforeDrop, setWasFreeCameraBeforeDrop] = useState(false);
    const freeCameraForDrop = () => {
        setWasFreeCameraBeforeDrop(isFreeCamera);
        setIsFreeCamera(true);
    };

    const startReviewPinDrop = (suggestion: GeoAdminSuggestion) => {
        setReviewPin({ suggestion, pin: { latitude: suggestion.latitude, longitude: suggestion.longitude } });
        freeCameraForDrop();
        setIsSettingsOpen(false);
        setPinDropFor("review");
    };

    // Done saves the new spot; either way, back to the review list.
    const finishReviewPinDrop = async (keep: boolean) => {
        const review = reviewPin;
        setPinDropFor(null);
        setReviewPin(null);
        setIsFreeCamera(wasFreeCameraBeforeDrop);
        if (keep && review) {
            try {
                const request: GeoAdminAdjustSuggestionRequest = review.pin;
                await api.patch(
                    GEO_API_PATHS.admin.suggestion.replace(":suggestionId", encodeURIComponent(review.suggestion.id)),
                    request,
                );
                showToast("Pin moved", "success");
            } catch (error) {
                showToast(toErrorMessage(error), "error");
            }
        }
        openSettings("suggestions");
    };

    const startPinDrop = (purpose: "suggestion" | "place") => {
        setPinBeforeDrop(purpose === "place" ? placePin : suggestionPin);
        if (purpose === "place") freeCameraForDrop();
        setIsSettingsOpen(false);
        setPinDropFor(purpose);
    };

    // An admin looking at a suggestion: the free camera flies to it, and Back
    // puts the camera as it was and reopens the review list.
    const [suggestionFocus, setSuggestionFocus] = useState<SuggestionFocus | null>(null);
    const [wasFreeCamera, setWasFreeCamera] = useState(false);

    const showSuggestionOnMap = (focus: SuggestionFocus) => {
        setWasFreeCamera(isFreeCamera);
        setIsFreeCamera(true);
        setIsSettingsOpen(false);
        setSuggestionFocus(focus);
    };

    const finishSuggestionFocus = () => {
        const returnTo = suggestionFocus?.returnTo ?? "suggestions";
        setSuggestionFocus(null);
        setIsFreeCamera(wasFreeCamera);
        openSettings(returnTo);
    };

    const canEditOpenPlace = isAdmin && openPlace?.handMade !== undefined;

    // The map's own UI is hidden while placing a pin or looking at a suggestion.
    const isMapTakenOver = isDroppingPin || suggestionFocus !== null;

    const finishPinDrop = (keep: boolean) => {
        const isPlace = pinDropFor === "place";
        if (!keep) (isPlace ? setPlacePin : setSuggestionPin)(pinBeforeDrop);
        if (isPlace) setIsFreeCamera(wasFreeCameraBeforeDrop);
        setPinDropFor(null);
        openSettings(isPlace ? "placeEditor" : "suggest");
    };

    if (permission === "denied") {
        return (
            <Message
                title="The world is dark"
                body="geo-game needs your location to place you in the world. Enable location access in Settings to continue."
            />
        );
    }

    if (permission === "unavailable" || (error && !position)) {
        return (
            <Message
                title="Lost"
                body={error ?? "Your location could not be read. Step outside?"}
            />
        );
    }

    if (!position) {
        return <Message title="Awakening" body="Finding you..." />;
    }

    return (
        <View style={styles.container}>
            <GameMap
                position={position}
                isAdminMode={isFreeCamera}
                // The bar is hidden while the map is taken over, so the whole map is free then.
                bottomPadding={isMapTakenOver ? 0 : barHeight}
                spawns={spawns}
                places={handMadePlaces}
                spawnRadiusMetres={showSpawnRadius ? spawnRadiusMetres : null}
                onNearWater={setNearWater}
                onNearPlaces={setNearPlaces}
                onSpawnPress={(spawn) => {
                    // Mid pin-drop the player is placing a pin, not starting a fight.
                    if (isDroppingPin) return;
                    // Checked here to answer at once; the server checks again
                    // with the position sent, and has the last word.
                    const distance = Math.round(distanceMetres(position, spawn));
                    if (distance > reachMetres) {
                        showToast(`Too far away (${distance} m). Get within ${reachMetres} m to fight.`, "info");
                        return;
                    }
                    router.push({
                        pathname: "/run/combat",
                        params: {
                            spawn: spawn.id,
                            latitude: String(position.latitude),
                            longitude: String(position.longitude),
                        },
                    });
                }}
                onPlacePress={(place) => {
                    if (!isDroppingPin) setOpenPlace(place);
                }}
                camp={
                    camp
                        ? { latitude: camp.position.latitude, longitude: camp.position.longitude, radiusMetres: CAMP_RADIUS_METRES }
                        : null
                }
                onCampPress={() => {
                    if (!isDroppingPin) setIsCampOpen(true);
                }}
                pinDrop={
                    pinDropFor === "review" && reviewPin
                        ? {
                              initial: reviewPin.pin,
                              color: suggestionKindInfo(reviewPin.suggestion.kind).color,
                              onPinPlaced: (pin) => setReviewPin((current) => current && { ...current, pin }),
                          }
                        : pinDropFor === "place"
                        ? {
                              initial: placePin ?? position,
                              color: PLACE_TYPES[placeKind].color,
                              onPinPlaced: setPlacePin,
                          }
                        : pinDropFor === "suggestion"
                          ? {
                                initial: suggestionPin ?? position,
                                color: suggestionKindInfo(suggestionKind).color,
                                onPinPlaced: setSuggestionPin,
                            }
                          : null
                }
                focus={suggestionFocus}
                onError={setMapError}
            />

            {suggestionFocus && <SuggestionFocusOverlay onBack={finishSuggestionFocus} />}

            {isDroppingPin && (
                <PinDropOverlay
                    kind={
                        pinDropFor === "review" && reviewPin
                            ? reviewPin.suggestion.kind
                            : pinDropFor === "place"
                              ? placeKind
                              : suggestionKind
                    }
                    hint={
                        pinDropFor === "review"
                            ? "Correcting the player's pin. Their first pin is kept."
                            : pinDropFor === "place"
                              ? "Where the new place's marker goes."
                              : undefined
                    }
                    onCancel={() => (pinDropFor === "review" ? void finishReviewPinDrop(false) : finishPinDrop(false))}
                    onDone={() => (pinDropFor === "review" ? void finishReviewPinDrop(true) : finishPinDrop(true))}
                />
            )}

            {!isMapTakenOver && (
                <>
                    <PlayerStatusHud
                        onPressHealth={() => setOpenPack("lunchbox")}
                        onOpenQuestLog={() => setIsQuestLogOpen(true)}
                    />

                    {/* Bottom-left, just above the bar. Lets taps through to the
                        map, which is a rotation surface everywhere. */}
                    <View style={[styles.coins, { bottom: barHeight + ABOVE_BAR_GAP }]} pointerEvents="none">
                        <CoinCounter coins={coins} />
                    </View>

                    <InboxButton onPress={() => setIsInboxOpen(true)} />

                    <LobbyButton onPress={() => setDungeonMenu({ place: null })} />

                    <FriendsButton onPress={() => setIsFriendsOpen(true)} />

                    <SettingsButton onPress={() => openSettings()} />

                    <BottomBar
                        onOpenCharacter={() => router.push("/character")}
                        onOpenInventory={() => setIsInventoryOpen(true)}
                        onOpenSkills={() => setIsSkillsOpen(true)}
                        onOpenDeck={() => setIsDeckOpen(true)}
                        actions={{
                            camp: { onPress: () => setIsCampOpen(true) },
                            lunchbox: { onPress: () => setOpenPack("lunchbox") },
                            bait: { onPress: () => setOpenPack("bait") },
                            farm: { onPress: () => router.push("/farm") },
                            crafting: { onPress: () => setIsCraftingOpen(true) },
                            cooking: { onPress: () => setIsCookingOpen(true) },
                            vendors: { onPress: () => setIsVendorsOpen(true) },
                            market: { onPress: () => setIsMarketOpen(true) },
                            communityCenter: { onPress: () => setCommunityCenterTab("mayor") },
                        }}
                    />
                </>
            )}

            {/* The map lives in a WebView and depends on the network for both
                its library and its tiles, so a failure there is silent black
                unless it is surfaced. */}
            {!isMapTakenOver && <ServerStatusBanner bottom={barHeight + ABOVE_BAR_GAP + (mapError ? 60 : 0)} />}

            {mapError && (
                <View style={[styles.mapError, { bottom: barHeight + ABOVE_BAR_GAP }]}>
                    <Text style={styles.mapErrorText}>{mapError}</Text>
                </View>
            )}

            {openPlace && (
                <PlaceModal
                    place={openPlace}
                    distance={distanceMetres(position, openPlace)}
                    // Like a PokéStop: any place can be looked at, but a Run
                    // only starts in reach. The free camera is for inspecting
                    // anywhere, so it lifts the limit.
                    inReach={
                        isFreeCamera ||
                        distanceMetres(position, openPlace) <= PLACE_REACH_METRES
                    }
                    // A POI is a dungeon lobby entrance: its menu can be
                    // browsed from anywhere, but joined only in reach.
                    startLabel={openPlace.skill === null ? "Dungeons" : undefined}
                    startNeedsReach={openPlace.skill !== null}
                    onStart={() => {
                        setOpenPlace(null);
                        if (openPlace.skill === null) {
                            setDungeonMenu({ place: openPlace });
                            return;
                        }
                        router.push(
                            openPlace.skill === "fishing"
                                ? {
                                      pathname: "/run/fishing",
                                      params: {
                                          name: openPlace.name,
                                          tier: fishingTier(openPlace.water ?? null, openPlace.handMade?.settings.fishing).id,
                                          // So the Run can tell when you've walked away from the water.
                                          latitude: String(openPlace.latitude),
                                          longitude: String(openPlace.longitude),
                                      },
                                  }
                                : openPlace.skill === "farming"
                                  ? // Every farming place opens the player's one farm, ready to work.
                                    {
                                          pathname: "/farm",
                                          params: {
                                              place: placeTitle(openPlace.name, openPlace.skill),
                                              latitude: String(openPlace.latitude),
                                              longitude: String(openPlace.longitude),
                                          },
                                      }
                                  : {
                                      pathname: "/run/place",
                                      params: { name: openPlace.name, skill: openPlace.skill ?? "" },
                                  },
                        );
                    }}
                    onClose={() => setOpenPlace(null)}
                    // Admins, hand-made places only.
                    onEdit={
                        canEditOpenPlace
                            ? () => {
                                  const place = handMadePlaces.find((candidate) => candidate.id === openPlace.id);
                                  if (!place) return;
                                  startEditPlace(place, "map");
                                  setOpenPlace(null);
                                  openSettings("placeEditor");
                              }
                            : undefined
                    }
                    onRemove={
                        canEditOpenPlace
                            ? () => confirmRemovePlace(openPlace, () => setOpenPlace(null))
                            : undefined
                    }
                />
            )}

            {dungeonMenu && (
                <DungeonsModal
                    entrance={
                        dungeonMenu.place &&
                        (isFreeCamera || distanceMetres(position, dungeonMenu.place) <= PLACE_REACH_METRES)
                            ? {
                                  position: { latitude: position.latitude, longitude: position.longitude },
                                  place: { latitude: dungeonMenu.place.latitude, longitude: dungeonMenu.place.longitude },
                              }
                            : null
                    }
                    onEntered={() => {
                        setDungeonMenu(null);
                        // Bare: the combat screen resumes the Run the start opened.
                        router.push("/run/combat");
                    }}
                    onClose={() => setDungeonMenu(null)}
                />
            )}

            {/* Rendered conditionally so unmounting resets the tab and search
                — see the note in Modal. */}
            {isInventoryOpen && (
                <InventoryModal onClose={() => setIsInventoryOpen(false)} />
            )}

            {isVendorsOpen && <VendorsModal onClose={() => setIsVendorsOpen(false)} />}

            {isMarketOpen && <MarketModal onClose={() => setIsMarketOpen(false)} />}

            {communityCenterTab && (
                <CommunityCenterModal
                    onClose={() => setCommunityCenterTab(null)}
                    initialTab={communityCenterTab}
                />
            )}

            {isFriendsOpen && <FriendsModal onClose={() => setIsFriendsOpen(false)} />}

            {isInboxOpen && <InboxModal onClose={() => setIsInboxOpen(false)} />}

            {whatsNew.changelog && isFocused && !isAnythingOpen && !isMapTakenOver && (
                <WhatsNewModal changelog={whatsNew.changelog} onClose={whatsNew.dismiss} />
            )}

            {isDeckOpen && <DeckModal onClose={() => setIsDeckOpen(false)} />}

            {isSkillsOpen && <SkillsModal onClose={() => setIsSkillsOpen(false)} />}

            {isCookingOpen && <CookingModal onClose={() => setIsCookingOpen(false)} />}

            {isQuestLogOpen && <QuestLogModal onClose={() => setIsQuestLogOpen(false)} />}

            {isCampOpen && (
                <CampModal
                    onClose={() => setIsCampOpen(false)}
                    onOpenPack={(kind) => {
                        // One native modal at a time: Camp closes, the pack opens.
                        setIsCampOpen(false);
                        setOpenPack(kind);
                    }}
                />
            )}

            {openPack && <LunchboxModal kind={openPack} onClose={() => setOpenPack(null)} />}

            {isCraftingOpen && (
                <CraftingModal
                    onClose={() => setIsCraftingOpen(false)}
                    renderDetail={(shown, showUsage) => <ItemDetail item={shown} onUsage={showUsage} />}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsOpen(false)}
                    isFreeCamera={isFreeCamera}
                    onToggleFreeCamera={() => setIsFreeCamera(!isFreeCamera)}
                    position={position}
                    onDropPlacePin={() => startPinDrop("place")}
                    onDropSuggestionPin={() => startPinDrop("suggestion")}
                    initialPage={settingsPage}
                    onShowSuggestionOnMap={showSuggestionOnMap}
                    onMoveSuggestionPin={startReviewPinDrop}
                />
            )}
        </View>
    );
}

function Message({ title, body }: { title: string; body: string }) {
    return (
        <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>{title}</Text>
            <Text style={styles.messageBody}>{body}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },
    coins: {
        position: "absolute",
        left: 16,
    },
    mapError: {
        position: "absolute",
        left: 20,
        right: 20,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "rgba(140, 36, 32, 0.9)",
        borderWidth: 1,
        borderColor: colors.blood,
    },
    mapErrorText: {
        color: colors.textPrimary,
        fontSize: 12,
        textAlign: "center",
    },
    messageContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        backgroundColor: colors.void,
    },
    messageTitle: {
        color: colors.ember,
        fontSize: 26,
        letterSpacing: 2,
        marginBottom: 12,
    },
    messageBody: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },
});
