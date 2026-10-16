import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import type { PlayerPosition } from "@/features/location/hooks/usePlayerLocation";
import PlaceEditorPage from "@/features/places/components/PlaceEditorPage";
import { usePlaceDraft } from "@/features/places/placeDraft";
import FeedbackPage from "@/features/feedback/components/FeedbackPage";
import SuggestLocationPage from "@/features/suggestions/components/SuggestLocationPage";
import AdminAnnouncementsPage from "./AdminAnnouncementsPage";
import AdminFeedbackPage from "./AdminFeedbackPage";
import AdminPlacesPage from "./AdminPlacesPage";
import AdminPlayersPage from "./AdminPlayersPage";
import AdminSuggestionsPage, { type SuggestionFocus } from "./AdminSuggestionsPage";
import CreditsPage from "./CreditsPage";
import NotificationsPage from "./NotificationsPage";
import SettingsToggle from "./SettingsToggle";
import { useAdminSettingsStore } from "../adminSettingsStore";
import { showToast } from "@/components/Toast/toastStore";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoAdminSeaCreatures,
    type GeoAdminSuggestion,
    type GeoDeathResponse,
    type GeoDevSpawnRequest,
} from "@/lib/geo/contracts";
import MenuTile from "@/components/MenuTile/MenuTile";
import { usePlayerStore } from "@/features/player/playerStore";
import { colors } from "@/theme/colors";

export type SettingsPage =
    | "menu"
    | "admin"
    | "players"
    | "suggestions"
    | "places"
    | "placeEditor"
    | "credits"
    | "notifications"
    | "feedback"
    | "suggest"
    | "adminFeedback"
    | "announcements";

const PAGE_TITLES: Record<SettingsPage, string> = {
    menu: "Settings",
    admin: "Admin",
    players: "Players",
    suggestions: "Suggestions",
    places: "Places",
    placeEditor: "Place",
    credits: "Credits",
    notifications: "Notifications",
    feedback: "Feedback",
    suggest: "Suggest a place",
    adminFeedback: "Player feedback",
    announcements: "Announcements",
};

/** Admin pages: back goes up to Admin, not the menu. */
const ADMIN_PAGES: SettingsPage[] = ["players", "suggestions", "places", "adminFeedback", "announcements"];

const GRID_COLUMNS = 3;
const GRID_GAP = 12;

type SettingsModalProps = {
    onClose: () => void;
    isFreeCamera: boolean;
    onToggleFreeCamera: () => void;
    position: PlayerPosition;
    /** Admins: close the modal and place the pin of the place being made or edited. */
    onDropPlacePin: () => void;
    /** Close the modal so the player can place a suggestion's pin on the map. */
    onDropSuggestionPin: () => void;
    /** Where to open — used to come back to the place editor or Suggest after a pin drop. */
    initialPage?: SettingsPage;
    /** Admins: close the modal and fly the free camera to a suggestion. */
    onShowSuggestionOnMap: (focus: SuggestionFocus) => void;
    /** Admins: close the modal and move a suggestion's pin on the map. */
    onMoveSuggestionPin: (suggestion: GeoAdminSuggestion) => void;
};

/**
 * The settings menu: a grid of tiles, each opening a page in the same modal.
 *
 * Pages swap the modal's content rather than stacking a second modal, so there
 * is only ever one backdrop and back always means "up one page". Back on the
 * menu itself closes the modal.
 *
 * The page lives in local state, so closing and reopening always starts back
 * at the menu — see the unmount-to-reset note in Modal.
 */
export default function SettingsModal({
    onClose,
    isFreeCamera,
    onToggleFreeCamera,
    position,
    onDropPlacePin,
    onDropSuggestionPin,
    initialPage = "menu",
    onShowSuggestionOnMap,
    onMoveSuggestionPin,
}: SettingsModalProps) {
    const [page, setPage] = useState<SettingsPage>(initialPage);
    const placeEditorReturn = usePlaceDraft((draft) => draft.returnTo);

    // Up one page; the place editor goes back to where it was opened from,
    // which is the map itself when it came from a place's modal.
    const leavePage = () => {
        if (ADMIN_PAGES.includes(page)) setPage("admin");
        else if (page !== "placeEditor") setPage("menu");
        else if (placeEditorReturn === "map") onClose();
        else setPage(placeEditorReturn);
    };
    const isAdmin = usePlayerStore((state) => state.me?.player.role === "admin");
    const signOut = usePlayerStore((state) => state.signOut);

    return (
        <Modal
            title={PAGE_TITLES[page]}
            size="fill"
            showBack
            onBack={page === "menu" ? undefined : leavePage}
            closePlacement="footer"
            headerAccessory={
                page === "menu" && (
                    <Pressable
                        onPress={() => setPage("credits")}
                        style={({ pressed }) => [styles.infoButton, pressed && styles.infoButtonPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Credits"
                        hitSlop={10}
                    >
                        <Icon name="info" size={18} color={colors.textSecondary} />
                    </Pressable>
                )
            }
            onClose={onClose}
        >
            {page === "menu" && (
                <View style={styles.grid}>
                    <View style={styles.cell}>
                        <MenuTile label="Notifications" icon="ringing-bell" onPress={() => setPage("notifications")} />
                    </View>

                    <View style={styles.cell}>
                        <MenuTile label="Feedback" icon="scroll-quill" onPress={() => setPage("feedback")} />
                    </View>

                    <View style={styles.cell}>
                        <MenuTile label="Suggest place" icon="pin" onPress={() => setPage("suggest")} />
                    </View>

                    {/* Game admins only, dev builds included: the free camera
                        breaks the walk-to-explore rule, so plain players must
                        never see it. */}
                    {isAdmin && (
                        <View style={styles.cell}>
                            <MenuTile label="Admin" icon="spanner" onPress={() => setPage("admin")} />
                        </View>
                    )}

                    <View style={styles.cell}>
                        <MenuTile
                            label="Sign out"
                            icon="exit-door"
                            onPress={() => {
                                onClose();
                                void signOut();
                            }}
                        />
                    </View>
                </View>
            )}

            {page === "credits" && <CreditsPage />}

            {page === "notifications" && <NotificationsPage />}

            {page === "feedback" && <FeedbackPage />}

            {page === "suggest" && <SuggestLocationPage position={position} onDropPin={onDropSuggestionPin} />}

            {page === "adminFeedback" && <AdminFeedbackPage />}

            {page === "announcements" && <AdminAnnouncementsPage />}

            {page === "players" && <AdminPlayersPage />}

            {page === "suggestions" && (
                <AdminSuggestionsPage
                    onShowOnMap={onShowSuggestionOnMap}
                    onOpenPlaceEditor={() => setPage("placeEditor")}
                    onMovePin={onMoveSuggestionPin}
                />
            )}

            {page === "places" && (
                <AdminPlacesPage
                    position={position}
                    onOpenEditor={() => setPage("placeEditor")}
                    onShowOnMap={onShowSuggestionOnMap}
                />
            )}

            {page === "placeEditor" && (
                <PlaceEditorPage position={position} onDropPin={onDropPlacePin} onDone={leavePage} />
            )}

            {page === "admin" && (
                <AdminPage
                    onOpenPlayers={() => setPage("players")}
                    onOpenSuggestions={() => setPage("suggestions")}
                    onOpenPlaces={() => setPage("places")}
                    onOpenFeedback={() => setPage("adminFeedback")}
                    onOpenAnnouncements={() => setPage("announcements")}
                    onClose={onClose}
                    isFreeCamera={isFreeCamera}
                    onToggleFreeCamera={onToggleFreeCamera}
                    position={position}
                />
            )}
        </Modal>
    );
}

function AdminPage({
    onClose,
    isFreeCamera,
    onToggleFreeCamera,
    position,
    onOpenPlayers,
    onOpenSuggestions,
    onOpenPlaces,
    onOpenFeedback,
    onOpenAnnouncements,
}: Pick<SettingsModalProps, "onClose" | "isFreeCamera" | "onToggleFreeCamera" | "position"> & {
    onOpenPlayers: () => void;
    onOpenSuggestions: () => void;
    onOpenPlaces: () => void;
    onOpenFeedback: () => void;
    onOpenAnnouncements: () => void;
}) {
    const showSpawnRadius = useAdminSettingsStore((state) => state.showSpawnRadius);
    const setShowSpawnRadius = useAdminSettingsStore((state) => state.setShowSpawnRadius);
    const fillSpawns = useAdminSettingsStore((state) => state.fillSpawns);
    const setFillSpawns = useAdminSettingsStore((state) => state.setFillSpawns);
    const refetchSpawns = useAdminSettingsStore((state) => state.refetchSpawns);

    const devSpawn = async (enemyId: string, success: string) => {
        try {
            const request: GeoDevSpawnRequest = {
                enemyId,
                latitude: position.latitude,
                longitude: position.longitude,
            };
            await api.post(GEO_API_PATHS.dev.spawn, request);
            refetchSpawns();
            showToast(success, "success");
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    const isAdmin = usePlayerStore((state) => state.me?.player.role === "admin");
    const playerId = usePlayerStore((state) => state.me?.player.id);
    const refreshPlayer = usePlayerStore((state) => state.refresh);

    /** Game-admin calls: say how it went in a toast. */
    const adminCall = async (send: () => Promise<unknown>, success: string) => {
        try {
            await send();
            await refreshPlayer();
            showToast(success, "success");
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    // Kept on the server, for this admin only: read it once the page opens.
    const [alwaysSeaCreatures, setAlwaysSeaCreatures] = useState<boolean | null>(null);
    useEffect(() => {
        if (!isAdmin) return;
        api.get<GeoAdminSeaCreatures>(GEO_API_PATHS.admin.seaCreatures)
            .then((reply) => setAlwaysSeaCreatures(reply.always))
            .catch(() => {});
    }, [isAdmin]);
    const toggleSeaCreatures = async () => {
        try {
            const reply = await api.put<GeoAdminSeaCreatures>(GEO_API_PATHS.admin.seaCreatures, {
                always: !alwaysSeaCreatures,
            } satisfies GeoAdminSeaCreatures);
            setAlwaysSeaCreatures(reply.always);
            showToast(reply.always ? "Every bite is a sea creature" : "Sea creatures back to normal", "success");
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    const killMe = async () => {
        try {
            const death = await api.post<GeoDeathResponse>(GEO_API_PATHS.dev.kill);
            // A native modal sits over every screen, so close it first.
            onClose();
            router.push({
                pathname: "/death",
                params: { cause: death.cause, coinsLost: String(death.coinsLost) },
            });
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.adminPage}>
            <SettingsToggle
                label="Free camera"
                hint="Pan anywhere and zoom without limits. Turning it off returns the camera to you."
                value={isFreeCamera}
                onToggle={onToggleFreeCamera}
            />
            <SettingsToggle
                label="Spawn radius"
                hint="A ring around you showing how far out enemies appear."
                value={showSpawnRadius}
                onToggle={() => setShowSpawnRadius(!showSpawnRadius)}
            />
            {/* Game admins only: the server checks the role too. */}
            {isAdmin && playerId && (
                <>
                    <AdminAction
                        label="Players"
                        hint="Find a player: coins and ledger, give or take coins, admin role, suspend."
                        onPress={onOpenPlayers}
                    />
                    <AdminAction
                        label="Suggestions"
                        hint="Places players think should be hubs or POIs: see each on the map, then accept or reject."
                        onPress={onOpenSuggestions}
                    />
                    <AdminAction
                        label="Feedback"
                        hint="Bugs, suggestions and the rest from players: move each along, and reply to their inbox."
                        onPress={onOpenFeedback}
                    />
                    <AdminAction
                        label="Announcements"
                        hint="Send news, a changelog or an event to every player's inbox."
                        onPress={onOpenAnnouncements}
                    />
                    <AdminAction
                        label="Places"
                        hint="Hand-made places: make one here or at a pin, then edit, move, hide or remove them."
                        onPress={onOpenPlaces}
                    />
                    {alwaysSeaCreatures !== null && (
                        <SettingsToggle
                            label="Always sea creatures"
                            hint="Every bite you strike while fishing is a sea creature (none live in puddles). Yours only."
                            value={alwaysSeaCreatures}
                            onToggle={() => void toggleSeaCreatures()}
                        />
                    )}
                    <AdminAction
                        label="End the election now"
                        hint="The candidate with the most votes takes office at once, and a new election opens."
                        onPress={() =>
                            void adminCall(() => api.post(GEO_API_PATHS.admin.endElection), "Election ended")
                        }
                    />
                    <AdminAction
                        label="End the election in 2 minutes"
                        hint="To watch the countdown run out and the new mayor take office."
                        onPress={() =>
                            void adminCall(
                                () =>
                                    api.put(GEO_API_PATHS.admin.electionEndsAt, {
                                        endsAt: new Date(Date.now() + 2 * 60_000).toISOString(),
                                    }),
                                "The election ends in 2 minutes",
                            )
                        }
                    />
                    <AdminAction
                        label="Give me 1,000 coins"
                        hint="An admin grant, written to the coin ledger and the audit log."
                        onPress={() =>
                            void adminCall(
                                () =>
                                    api.post(GEO_API_PATHS.admin.playerCoins.replace(":playerId", playerId), {
                                        amount: 1_000,
                                        note: "admin page",
                                    }),
                                "Added 1,000 coins",
                            )
                        }
                    />
                </>
            )}
            {/* Testing tools: dev servers only, so dev builds only. */}
            {__DEV__ && (
                <>
                    <SettingsToggle
                        label="Max enemies"
                        hint="Keep the most enemies allowed around you (6), instead of the usual few."
                        value={fillSpawns}
                        onToggle={() => {
                            setFillSpawns(!fillSpawns);
                            refetchSpawns();
                        }}
                    />
                    <Pressable
                        onPress={() => void devSpawn("test-dragon", "A test dragon appeared nearby")}
                        style={({ pressed }) => [styles.adminAction, pressed && styles.adminActionPressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.adminActionLabel}>Spawn a test dragon</Text>
                        <Text style={styles.adminActionHint}>
                            A red circle within reach that kills you before your first card. For testing defeat.
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => void devSpawn("test-chest-boss", "A test hoarder appeared nearby")}
                        style={({ pressed }) => [styles.adminAction, pressed && styles.adminActionPressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.adminActionLabel}>Spawn a test hoarder</Text>
                        <Text style={styles.adminActionHint}>
                            A red circle within reach, easy to beat, that always gives a chest selection. For testing
                            chests.
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => void killMe()}
                        style={({ pressed }) => [styles.adminAction, pressed && styles.adminActionPressed]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.adminActionLabel}>Kill me</Text>
                        <Text style={styles.adminActionHint}>
                            Die on the spot (admin-kill): lose every coin and see the death screen.
                        </Text>
                    </Pressable>
                </>
            )}
        </ScrollView>
    );
}

function AdminAction({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.adminAction,
                styles.adminServerAction,
                pressed && styles.adminActionPressed,
            ]}
            accessibilityRole="button"
        >
            <Text style={[styles.adminActionLabel, styles.adminServerLabel]}>{label}</Text>
            <Text style={styles.adminActionHint}>{hint}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        // Negative margin cancels the cells' outer padding, so the grid's edges
        // line up with the modal's content padding.
        margin: -GRID_GAP / 2,
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    infoButton: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 17,
    },
    infoButtonPressed: {
        backgroundColor: colors.surfaceRaised,
    },
    adminAction: {
        gap: 4,
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.blood,
    },
    adminServerAction: {
        borderColor: colors.ember,
    },
    adminServerLabel: {
        color: colors.emberBright,
    },
    adminActionPressed: {
        transform: [{ scale: 0.98 }],
    },
    adminActionLabel: {
        color: colors.damage,
        fontSize: 15,
        fontWeight: "600",
    },
    adminActionHint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    adminPage: {
        gap: 12,
    },
});
