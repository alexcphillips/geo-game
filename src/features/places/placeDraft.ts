import { create } from "zustand";
import {
    GEO_PLACE_KINDS,
    type GeoAdminSuggestion,
    type GeoPlace,
    type GeoPlaceKind,
    type GeoPlaceSettings,
} from "@/lib/geo/contracts";
import type { Coordinates } from "@/features/location/distance";

/** Where the place editor goes back to: an admin page, or the map (from a place's modal). */
export type PlaceEditorReturn = "places" | "suggestions" | "map";

type PlaceDraftFields = {
    /** Null for a new place. */
    placeId: string | null;
    kind: GeoPlaceKind;
    name: string;
    description: string;
    pin: Coordinates | null;
    active: boolean;
    /** Per-kind settings, e.g. a fishing spot's tier; left out = from the map. */
    settings: GeoPlaceSettings;
    /** Set when making a place from a suggestion; saving accepts it. */
    suggestionId: string | null;
    returnTo: PlaceEditorReturn;
};

type PlaceDraftState = PlaceDraftFields & {
    update: (fields: Partial<PlaceDraftFields>) => void;
    startNew: (pin: Coordinates, returnTo: PlaceEditorReturn) => void;
    /** `name` pre-fills the place's name, e.g. from the review note typed. */
    startFromSuggestion: (suggestion: GeoAdminSuggestion, name?: string) => void;
    startEdit: (place: GeoPlace & { active?: boolean }, returnTo: PlaceEditorReturn) => void;
};

const EMPTY: PlaceDraftFields = {
    placeId: null,
    kind: "landmark",
    name: "",
    description: "",
    pin: null,
    active: true,
    settings: {},
    suggestionId: null,
    returnTo: "places",
};

const isPlaceKind = (kind: string): kind is GeoPlaceKind => GEO_PLACE_KINDS.includes(kind as GeoPlaceKind);

/**
 * The hand-made place an admin is making or editing.
 *
 * A store for the same reason as the suggestion draft: dropping a pin closes
 * the settings modal, which resets its pages, and the draft must survive it.
 */
export const usePlaceDraft = create<PlaceDraftState>((set) => ({
    ...EMPTY,
    update: (fields) => set(fields),
    startNew: (pin, returnTo) => set({ ...EMPTY, pin, returnTo }),
    startFromSuggestion: (suggestion, name = "") =>
        set({
            ...EMPTY,
            name,
            // "other" has no place kind; the admin picks one.
            kind: isPlaceKind(suggestion.kind) ? suggestion.kind : "landmark",
            description: suggestion.note,
            pin: { latitude: suggestion.latitude, longitude: suggestion.longitude },
            suggestionId: suggestion.id,
            returnTo: "suggestions",
        }),
    startEdit: (place, returnTo) =>
        set({
            ...EMPTY,
            placeId: place.id,
            kind: place.kind,
            name: place.name,
            description: place.description,
            pin: { latitude: place.latitude, longitude: place.longitude },
            active: place.active ?? true,
            settings: place.settings,
            returnTo,
        }),
}));
