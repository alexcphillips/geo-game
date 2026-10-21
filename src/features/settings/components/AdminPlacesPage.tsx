import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import { distanceMetres, type Coordinates } from "@/features/location/distance";
import { TIER_LABELS } from "@/features/places/fishingWaters";
import { confirmRemovePlace } from "@/features/places/placeAdmin";
import { usePlaceDraft } from "@/features/places/placeDraft";
import { PLACE_TYPES, kindToSkill, placeTitle } from "@/features/places/places";
import { usePlacesStore } from "@/features/places/placesStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoAdminPlace, type GeoAdminPlacesResponse } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { Action, type SuggestionFocus } from "./AdminSuggestionsPage";

type AdminPlacesPageProps = {
    position: Coordinates;
    /** Opens the place editor, its draft already set. */
    onOpenEditor: () => void;
    /** Closes the menu and flies the free camera to the place. */
    onShowOnMap: (focus: SuggestionFocus) => void;
};

/**
 * Game admins: every hand-made place, nearest first, inactive ones included.
 * Make a new one at your position, or show, edit or remove one.
 */
export default function AdminPlacesPage({ position, onOpenEditor, onShowOnMap }: AdminPlacesPageProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [places, setPlaces] = useState<GeoAdminPlace[] | null>(null);
    const version = usePlacesStore((state) => state.version);
    const startNew = usePlaceDraft((draft) => draft.startNew);
    const startEdit = usePlaceDraft((draft) => draft.startEdit);

    useEffect(() => {
        let isCurrent = true;
        api.get<GeoAdminPlacesResponse>(GEO_API_PATHS.admin.places)
            .then((response) => isCurrent && setPlaces(response.places))
            .catch((error) => showToast(toErrorMessage(error), "error"));
        return () => {
            isCurrent = false;
        };
    }, [version]);

    const sorted = places
        ?.map((place) => ({ place, distance: distanceMetres(position, place) }))
        .sort((a, b) => a.distance - b.distance);

    return (
        <View style={styles.page}>
            <Pressable
                onPress={() => {
                    startNew({ latitude: position.latitude, longitude: position.longitude }, "places");
                    onOpenEditor();
                }}
                style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
                accessibilityRole="button"
            >
                <Icon name="pin" size={18} color={palette.onPrimary} />
                <Text style={styles.newText}>New place here</Text>
            </Pressable>
            {!sorted ? (
                <ActivityIndicator color={palette.textMuted} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {sorted.map(({ place, distance }) => {
                        const info = PLACE_TYPES[place.kind];
                        return (
                            <Panel compact key={place.id} style={[styles.card, !place.active && styles.inactive]}>
                                <View style={styles.cardHeader}>
                                    <Icon name={info.icon} size={20} color={info.color} />
                                    <Text style={styles.name} numberOfLines={1}>
                                        {placeTitle(place.name, kindToSkill(place.kind))}
                                    </Text>
                                    <Text style={styles.muted}>{formatDistance(distance)}</Text>
                                </View>
                                <Text style={styles.muted}>
                                    {info.label}
                                    {place.settings.fishing?.tier ? ` · ${TIER_LABELS[place.settings.fishing.tier]} tier` : ""}
                                    {place.active ? "" : " · inactive"}
                                    {place.suggestionId ? " · from a suggestion" : ""}
                                    {place.createdBy ? ` · by ${place.createdBy}` : ""}
                                </Text>
                                {place.description ? <Text style={styles.description}>{place.description}</Text> : null}
                                <View style={styles.row}>
                                    <Action
                                        label="Show"
                                        onPress={() =>
                                            onShowOnMap({ latitude: place.latitude, longitude: place.longitude, color: info.color, returnTo: "places" })
                                        }
                                    />
                                    <Action
                                        label="Edit"
                                        onPress={() => {
                                            startEdit(place, "places");
                                            onOpenEditor();
                                        }}
                                    />
                                    <Action label="Remove" danger onPress={() => confirmRemovePlace(place, () => {})} />
                                </View>
                            </Panel>
                        );
                    })}
                    {sorted.length === 0 && <Text style={styles.muted}>No hand-made places yet.</Text>}
                </ScrollView>
            )}
        </View>
    );
}

function formatDistance(metres: number): string {
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

const useStyles = createStyles((p) => ({
    page: {
        flex: 1,
        gap: 10,
    },
    newButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: p.ember,
    },
    newText: {
        color: p.onPrimary,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    list: {
        gap: 10,
        paddingBottom: 8,
    },
    card: {
        gap: 6,
        padding: 14,
    },
    inactive: {
        opacity: 0.6,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    name: {
        flex: 1,
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    description: {
        color: p.text,
        fontSize: 14,
        lineHeight: 19,
    },
    muted: {
        color: p.textMuted,
        fontSize: 12,
        lineHeight: 17,
    },
    row: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
