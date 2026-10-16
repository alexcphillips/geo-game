import { showToast } from "@/components/Toast/toastStore";
import { usePlayerStore } from "@/features/player/playerStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoMeResponse } from "@/lib/geo/contracts";

const fill = (path: string, vendorId: string) => path.replace(":vendorId", encodeURIComponent(vendorId));

/** Sends a trade, adopts the player the server sends back, and says how it went. */
async function trade(send: () => Promise<GeoMeResponse>, success: string | ((me: GeoMeResponse) => string)): Promise<boolean> {
    try {
        const me = await send();
        usePlayerStore.setState({ me });
        showToast(typeof success === "string" ? success : success(me), "success");
        return true;
    } catch (error) {
        showToast(toErrorMessage(error), "error");
        return false;
    }
}

/** Trading with an NPC vendor. Each resolves true when the server took it. */
export const vendorActions = {
    buy: (vendorId: string, itemId: string, quantity: number, itemName: string) =>
        trade(
            () => api.post(fill(GEO_API_PATHS.vendors.buy, vendorId), { itemId, quantity }),
            `Bought ${quantity.toLocaleString()} ${itemName}`,
        ),

    sell: (vendorId: string, inventoryId: string, quantity: number, itemName: string) =>
        trade(
            () => api.post(fill(GEO_API_PATHS.vendors.sell, vendorId), { inventoryId, quantity }),
            `Sold ${quantity.toLocaleString()} ${itemName}`,
        ),

    /** Rerolls one copy's reforge; the toast names what it became. */
    reforge: (vendorId: string, inventoryId: string, itemName: string) =>
        trade(
            () => api.post(fill(GEO_API_PATHS.vendors.reforge, vendorId), { inventoryId }),
            (me) => {
                const reforgeId = me.inventory.find((entry) => entry.id === inventoryId)?.reforge;
                const reforge = reforgeId ? usePlayerStore.getState().reforges[reforgeId] : undefined;
                return reforge ? `It's now a ${reforge.name} ${itemName}` : "Reforged";
            },
        ),

    /** Leaves a pet with Kat to raise its rarity. */
    upgradePet: (vendorId: string, inventoryId: string, petName: string) =>
        trade(() => api.post(fill(GEO_API_PATHS.vendors.petUpgrade, vendorId), { inventoryId }), `Left your ${petName} with Kat`),

    /** Takes the pet back from Kat, a rarity higher. */
    collectPetUpgrade: (vendorId: string, petName: string) =>
        trade(() => api.post(fill(GEO_API_PATHS.vendors.collectPetUpgrade, vendorId)), `Your ${petName} is back`),
};
