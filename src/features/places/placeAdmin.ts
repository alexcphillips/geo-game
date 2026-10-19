import { Alert } from "react-native";
import { showToast } from "@/components/Toast/toastStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS } from "@/lib/geo/contracts";
import { usePlacesStore } from "./placesStore";

export function placePath(placeId: string): string {
    return GEO_API_PATHS.admin.place.replace(":placeId", encodeURIComponent(placeId));
}

/**
 * Game admins: asks, then removes a hand-made place for good (the server's
 * audit log keeps what it was). Making it inactive is the undoable way.
 */
export function confirmRemovePlace(place: { id: string; name: string }, onRemoved: () => void) {
    const title = place.name || "this place";
    Alert.alert(`Remove ${title}?`, "It leaves the map for everyone, for good. To hide it for now, make it inactive instead.", [
        { text: "Cancel", style: "cancel" },
        {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
                try {
                    await api.delete(placePath(place.id));
                    usePlacesStore.getState().refetch();
                    showToast(`${place.name || "The place"} was removed`, "success");
                    onRemoved();
                } catch (error) {
                    showToast(toErrorMessage(error), "error");
                }
            },
        },
    ]);
}
