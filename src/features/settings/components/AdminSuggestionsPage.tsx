import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { Hint } from "@/components/Text/Text";
import { formatDateTime } from "@/features/market/market";
import { usePlaceDraft } from "@/features/places/placeDraft";
import { distanceMetres } from "@/features/location/distance";
import { SUGGESTION_KINDS, suggestionKindInfo, type SuggestionKind } from "@/features/suggestions/suggestionKinds";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoAdminAdjustSuggestionRequest,
    type GeoAdminReviewSuggestionRequest,
    type GeoAdminSuggestion,
    type GeoAdminSuggestionsResponse,
    type GeoSuggestionStatus,
} from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

const STATUSES: { id: GeoSuggestionStatus; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "accepted", label: "Accepted" },
    { id: "rejected", label: "Rejected" },
];

/** A spot an admin is looking at on the map; Back reopens `returnTo`. */
export type SuggestionFocus = {
    latitude: number;
    longitude: number;
    color: string;
    returnTo: "suggestions" | "places";
};

type AdminSuggestionsPageProps = {
    /** Closes the menu and flies the free camera to the spot. */
    onShowOnMap: (focus: SuggestionFocus) => void;
    /** Opens the place editor, its draft filled from a suggestion. */
    onOpenPlaceEditor: () => void;
    /** Closes the menu so the admin can drag the suggestion's pin on the map. */
    onMovePin: (suggestion: GeoAdminSuggestion) => void;
};

/**
 * Game admins: players' location suggestions, to judge whether each should
 * become a place. Agreeing means placing it: Accept opens the place editor
 * filled from it, and saving the place accepts it (the server refuses a
 * plain accept). One accepted before that rule, or whose place was removed,
 * gets Create place.
 */
export default function AdminSuggestionsPage({ onShowOnMap, onOpenPlaceEditor, onMovePin }: AdminSuggestionsPageProps) {
    const styles = useStyles();
    const palette = useTheme();
    const startFromSuggestion = usePlaceDraft((draft) => draft.startFromSuggestion);
    const [status, setStatus] = useState<GeoSuggestionStatus>("open");
    const [data, setData] = useState<GeoAdminSuggestionsResponse | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        api.get<GeoAdminSuggestionsResponse>(GEO_API_PATHS.admin.suggestions, { status })
            .then((response) => isCurrent && setData(response))
            .catch((error) => showToast(toErrorMessage(error), "error"));
        return () => {
            isCurrent = false;
        };
    }, [status, version]);

    const review = async (id: string, request: GeoAdminReviewSuggestionRequest, success: string) => {
        try {
            await api.put(GEO_API_PATHS.admin.suggestion.replace(":suggestionId", encodeURIComponent(id)), request);
            showToast(success, "success");
            setVersion((current) => current + 1);
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    const adjust = async (id: string, request: GeoAdminAdjustSuggestionRequest, success: string) => {
        try {
            await api.patch(GEO_API_PATHS.admin.suggestion.replace(":suggestionId", encodeURIComponent(id)), request);
            showToast(success, "success");
            setVersion((current) => current + 1);
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    };

    return (
        <View style={styles.page}>
            <View style={styles.filters}>
                {STATUSES.map((option) => {
                    const isSelected = option.id === status;
                    const count = data?.counts[option.id];
                    return (
                        <Panel
                            key={option.id}
                            onPress={() => setStatus(option.id)}
                            style={[styles.filter, isSelected && styles.filterSelected]}
                            accessibilityRole="tab"
                        >
                            <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                                {option.label}
                                {count === undefined ? "" : ` · ${count}`}
                            </Text>
                        </Panel>
                    );
                })}
            </View>
            {!data ? (
                <ActivityIndicator color={palette.textMuted} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                    {data.suggestions.map((suggestion) => (
                        <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onShowOnMap={onShowOnMap}
                            onMovePin={() => onMovePin(suggestion)}
                            onChangeKind={(kind) => void adjust(suggestion.id, { kind }, "Kind changed")}
                            onCreatePlace={(name) => {
                                startFromSuggestion(suggestion, name);
                                onOpenPlaceEditor();
                            }}
                            onReview={(request, success) => void review(suggestion.id, request, success)}
                        />
                    ))}
                    {data.suggestions.length === 0 && <Text style={styles.muted}>Nothing here.</Text>}
                </ScrollView>
            )}
        </View>
    );
}

function SuggestionCard({
    suggestion,
    onShowOnMap,
    onMovePin,
    onChangeKind,
    onCreatePlace,
    onReview,
}: {
    suggestion: GeoAdminSuggestion;
    onShowOnMap: (focus: SuggestionFocus) => void;
    onMovePin: () => void;
    onChangeKind: (kind: SuggestionKind) => void;
    onCreatePlace: (name: string) => void;
    onReview: (request: GeoAdminReviewSuggestionRequest, success: string) => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const [reviewNote, setReviewNote] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);
    const info = suggestionKindInfo(suggestion.kind);
    const lat = suggestion.latitude.toFixed(6);
    const lng = suggestion.longitude.toFixed(6);
    const accuracy = suggestion.gpsAccuracy === null ? "unknown" : `±${Math.round(suggestion.gpsAccuracy)} m`;
    // OpenStreetMap shows the spot with the map's own data underneath.
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;
    const note = reviewNote.trim() || undefined;

    return (
        <Panel compact style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon name={info.icon} size={20} color={info.color} />
                <Text style={styles.kind}>{info.label}</Text>
                <Text style={styles.muted}>{formatDateTime(suggestion.createdAt)}</Text>
            </View>
            <Text style={styles.coords} selectable>
                {lat}, {lng}
            </Text>
            <Text style={styles.muted}>
                {suggestion.playerName ?? "Deleted player"} · sent from {suggestion.distanceMetres} m away (GPS {accuracy})
            </Text>
            {suggestion.originalLatitude !== null && suggestion.originalLongitude !== null && (
                <Text style={styles.muted}>
                    Pin moved{" "}
                    {Math.round(
                        distanceMetres(
                            { latitude: suggestion.originalLatitude, longitude: suggestion.originalLongitude },
                            suggestion,
                        ),
                    )}{" "}
                    m from where the player put it
                </Text>
            )}
            {suggestion.note ? <Hint>“{suggestion.note}”</Hint> : null}
            {suggestion.status !== "open" && (
                <Text style={styles.muted}>
                    {suggestion.status === "accepted" ? "Accepted" : "Rejected"}
                    {suggestion.reviewedBy ? ` by ${suggestion.reviewedBy}` : ""}
                    {suggestion.reviewedAt ? ` · ${formatDateTime(suggestion.reviewedAt)}` : ""}
                    {suggestion.reviewNote ? ` — ${suggestion.reviewNote}` : ""}
                </Text>
            )}

            <View style={styles.row}>
                <Action
                    label="Show on map"
                    onPress={() =>
                        onShowOnMap({
                            latitude: suggestion.latitude,
                            longitude: suggestion.longitude,
                            color: info.color,
                            returnTo: "suggestions",
                        })
                    }
                />
                <Action label="OpenStreetMap" onPress={() => void Linking.openURL(osmUrl)} />
                <Action label={isAdjusting ? "Done" : "Adjust"} onPress={() => setIsAdjusting(!isAdjusting)} />
            </View>

            {isAdjusting && (
                <View style={styles.adjust}>
                    <View style={styles.kinds}>
                        {SUGGESTION_KINDS.map((option) => {
                            const isSelected = option.id === suggestion.kind;
                            return (
                                <Pressable
                                    key={option.id}
                                    onPress={() => !isSelected && onChangeKind(option.id)}
                                    style={({ pressed }) => [
                                        styles.kindChip,
                                        isSelected && { borderColor: option.color },
                                        pressed && styles.pressed,
                                    ]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: isSelected }}
                                    accessibilityLabel={option.label}
                                >
                                    <Icon name={option.icon} size={14} color={isSelected ? option.color : palette.textMuted} />
                                    <Text style={[styles.kindChipText, isSelected && styles.kindChipTextSelected]}>{option.label}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Action label="Move pin" onPress={onMovePin} />
                </View>
            )}

            {suggestion.placeId ? (
                <Text style={styles.muted}>A place has been made from it.</Text>
            ) : (
                suggestion.status === "accepted" && (
                    <View style={styles.row}>
                        <Action label="Create place" onPress={() => onCreatePlace(suggestion.reviewNote ?? "")} />
                    </View>
                )
            )}

            {suggestion.status === "open" ? (
                <>
                    <TextField
                        value={reviewNote}
                        onChangeText={setReviewNote}
                        placeholder="Place name, or a note for a rejection"
                        maxLength={280}
                    />
                    <View style={styles.row}>
                        <Action label="Accept" onPress={() => onCreatePlace(reviewNote.trim())} />
                        <Action label="Reject" danger onPress={() => onReview({ status: "rejected", reviewNote: note }, "Rejected")} />
                    </View>
                </>
            ) : (
                <Action label="Reopen" onPress={() => onReview({ status: "open" }, "Reopened")} />
            )}
        </Panel>
    );
}

export function Action({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
    return <Button label={label} size="small" variant={danger ? "danger" : "secondary"} onPress={onPress} />;
}

const useStyles = createStyles((p) => ({
    page: {
        flex: 1,
        gap: 10,
    },
    filters: {
        flexDirection: "row",
        gap: 8,
    },
    filter: {
        gap: 0,
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
    },
    filterSelected: {
        borderColor: p.ember,
    },
    filterText: {
        color: p.textMuted,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    filterTextSelected: {
        color: p.ember,
    },
    list: {
        gap: 10,
        paddingBottom: 8,
    },
    card: {
        gap: 6,
        padding: 14,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    kind: {
        flex: 1,
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    coords: {
        color: p.text,
        fontSize: 13,
        fontVariant: ["tabular-nums"],
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
    adjust: {
        gap: 8,
        marginTop: 4,
    },
    kinds: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    kindChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: p.outline,
    },
    kindChipText: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    kindChipTextSelected: {
        color: p.text,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
