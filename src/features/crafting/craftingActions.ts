import { showToast } from "@/components/Toast/toastStore";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoMeResponse } from "@/lib/geo/contracts";

/** Crafting. Each resolves true when the server took it. */
export const craftingActions = {
    /**
     * Crafts a recipe `quantity` times. The server takes the inputs and gives
     * the output together; the player it sends back replaces ours before the
     * toast, so the inventory already shows the change.
     */
    craft: async (recipeId: string, quantity: number, madeName: string, madeCount: number, verb = "Crafted"): Promise<boolean> => {
        try {
            const me = await api.post<GeoMeResponse>(
                GEO_API_PATHS.crafting.craft.replace(":recipeId", encodeURIComponent(recipeId)),
                { quantity },
            );
            usePlayerStore.setState({ me });
            showToast(`${verb} ${madeCount.toLocaleString()} ${madeName}`, "success");
            return true;
        } catch (error) {
            showToast(toErrorMessage(error), "error");
            return false;
        }
    },
};
