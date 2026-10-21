import { create } from "zustand";
import { showToast } from "@/components/Toast/toastStore";
import { lastPosition } from "@/features/location/locationStore";
import { api, apiPath, NetworkError, toErrorMessage } from "@/lib/api";
import { register, resumeSession, setSessionEndedHandler, signIn, signOut } from "@/lib/api/session";
import {
    GEO_API_PATHS,
    type GeoContentResponse,
    type GeoEquipmentSlot,
    type GeoItemSource,
    type GeoItemView,
    type GeoLoadoutActivity,
    type GeoMeResponse,
    type GeoPoint,
    type GeoRecipe,
    type GeoReforgeView,
} from "@/lib/geo/contracts";

/**
 * "loading" covers resuming a session too; "signedOut" means the player has
 * to sign in; "offline" means the server wasn't reached.
 */
export type PlayerStatus = "loading" | "signedOut" | "ready" | "offline";

type PlayerState = {
    status: PlayerStatus;
    /** Why the last load failed, for the offline banner. */
    error: string | null;
    /** Every item definition, by id: names, icons, rules as text. */
    items: Record<string, GeoItemView>;
    /** Every crafting recipe, from the content. */
    recipes: GeoRecipe[];
    /** Where items come from besides crafting: enemy drops, vendors. */
    sources: GeoItemSource[];
    /** Every reforge a vendor can roll onto gear, by id. */
    reforges: Record<string, GeoReforgeView>;
    /** The player as the server last described them. */
    me: GeoMeResponse | null;

    /** Resumes the session and fetches everything. Safe to call again to retry. */
    load: () => Promise<void>;
    /** Signs in, then loads. Throws the server's refusal for the form to show. */
    signIn: (email: string, password: string) => Promise<void>;
    /** Makes an account, then loads. Throws like signIn. */
    register: (username: string, email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    /** Re-reads the player, e.g. after a Run changed the inventory. */
    refresh: () => Promise<void>;
};

/**
 * The player's state, from the server, which is its only source: inventory,
 * equipment, the Talisman Bag, hands, XP and coins. Nothing here is
 * persisted on the phone. Every change goes to the server first and the
 * reply replaces the state, so the screens never show a change the server
 * refused.
 */
export const usePlayerStore = create<PlayerState>()((set, get) => ({
    status: "loading",
    error: null,
    items: {},
    recipes: [],
    sources: [],
    reforges: {},
    me: null,

    load: async () => {
        set({ status: "loading", error: null });
        try {
            if (!(await resumeSession())) {
                set({ status: "signedOut", me: null });
                return;
            }
            await fetchEverything();
        } catch (error) {
            set({ status: "offline", error: describeFailure(error) });
        }
    },

    signIn: async (email, password) => {
        await signIn(email, password);
        await loadSignedIn();
    },

    register: async (username, email, password) => {
        await register(username, email, password);
        await loadSignedIn();
    },

    signOut: async () => {
        // Offline for friends now, while the token still works, not when the
        // presence window runs out.
        await api.delete(GEO_API_PATHS.presence).catch(() => {});
        await signOut();
        set({ status: "signedOut", me: null });
    },

    refresh: async () => {
        if (get().status !== "ready") return;
        try {
            set({ me: await api.get<GeoMeResponse>(GEO_API_PATHS.me.root) });
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        }
    },
}));

async function fetchEverything() {
    const [content, me] = await Promise.all([
        api.get<GeoContentResponse>(GEO_API_PATHS.content),
        api.get<GeoMeResponse>(GEO_API_PATHS.me.root),
    ]);
    usePlayerStore.setState({
        status: "ready",
        items: Object.fromEntries(content.items.map((item) => [item.id, item])),
        recipes: content.recipes,
        sources: content.sources,
        reforges: Object.fromEntries(content.reforges.map((reforge) => [reforge.id, reforge])),
        me,
    });
}

/** Straight after signing in: the tokens are fresh, so no refresh first. */
async function loadSignedIn() {
    usePlayerStore.setState({ status: "loading", error: null });
    try {
        await fetchEverything();
    } catch (error) {
        usePlayerStore.setState({ status: "offline", error: describeFailure(error) });
    }
}

// The server stopped taking the session mid-play: back to sign-in.
setSessionEndedHandler(() => usePlayerStore.setState({ status: "signedOut", me: null }));

/**
 * Why loading failed, for the offline screen. Dev builds add what was tried
 * (the address and fetch's own words), so a wrong address or a stopped
 * server is obvious.
 */
function describeFailure(error: unknown): string {
    const message = toErrorMessage(error);
    return __DEV__ && error instanceof NetworkError ? `${message} (${error.detail})` : message;
}

/**
 * Sends one change and adopts the player the server sends back. A refusal
 * (a full bag, a faded card) shows as a toast with the server's own words.
 * Resolves true when the change went through.
 */
async function change(send: () => Promise<GeoMeResponse>): Promise<boolean> {
    try {
        usePlayerStore.setState({ me: await send() });
        return true;
    } catch (error) {
        showToast(toErrorMessage(error), "error");
        return false;
    }
}

/**
 * Like `change`, for requests the server checks against where the player is
 * (camp): sends the last GPS fix as `position`, or says there isn't one yet.
 */
function changeHere(send: (position: GeoPoint) => Promise<GeoMeResponse>): Promise<boolean> {
    const position = lastPosition();
    if (!position) {
        showToast("Still finding you. Try again in a moment.", "info");
        return Promise.resolve(false);
    }
    return change(() => send(position));
}


/** Every change the player can make to their own state. */
export const playerActions = {
    /** Puts an item in a slot (the server moves it from any other), or empties it with null. */
    equip: (slot: GeoEquipmentSlot, inventoryId: string | null) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.equipmentSlot, { slot }), { inventoryId })),

    addToTalismanBag: (inventoryId: string) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.talismanBagEntry, { inventoryId }))),

    removeFromTalismanBag: (inventoryId: string) =>
        change(() => api.delete(apiPath(GEO_API_PATHS.me.talismanBagEntry, { inventoryId }))),

    setHand: (skill: string, inventoryIds: string[]) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.hand, { skill }), { inventoryIds })),

    /** Saves the skill's current hand under a name. */
    saveHand: (skill: string, name: string) =>
        change(() => api.post(GEO_API_PATHS.me.savedHands, { skill, name })),

    /** Makes a saved hand current; cards since faded are dropped. */
    loadSavedHand: (savedHandId: string) =>
        change(() => api.post(apiPath(GEO_API_PATHS.me.loadSavedHand, { savedHandId }))),

    deleteSavedHand: (savedHandId: string) =>
        change(() => api.delete(apiPath(GEO_API_PATHS.me.savedHand, { savedHandId }))),

    /**
     * The lunchbox slot now holds `quantity` of the food: what it held goes
     * back to the inventory first, so this both packs and tops up.
     */
    packLunchbox: (slot: number, itemId: string, quantity: number) =>
        changeHere((position) =>
            api.put(apiPath(GEO_API_PATHS.me.lunchboxSlot, { slot }), { itemId, quantity, position }),
        ),

    /**
     * Eats one food from a lunchbox slot between fights: only its effect on
     * health counts. Toasts how much health it gave (or took).
     */
    eatLunchbox: async (slot: number) => {
        const before = usePlayerStore.getState().me?.health.current ?? 0;
        const ok = await change(() => api.post(apiPath(GEO_API_PATHS.me.eatLunchbox, { slot })));
        if (!ok) return false;
        const delta = (usePlayerStore.getState().me?.health.current ?? 0) - before;
        showToast(
            delta > 0 ? `+${delta} health` : delta < 0 ? `${delta} health` : "No change to your health",
            delta < 0 ? "error" : delta > 0 ? "success" : "info",
        );
        return true;
    },

    /** Empties a lunchbox slot back into the inventory. */
    unpackLunchbox: (slot: number) =>
        change(() => api.delete(apiPath(GEO_API_PATHS.me.lunchboxSlot, { slot }))),

    /** The bait slot now holds `quantity` of the bait, like `packLunchbox`. */
    packBait: (slot: number, itemId: string, quantity: number) =>
        changeHere((position) =>
            api.put(apiPath(GEO_API_PATHS.me.baitSlot, { slot }), { itemId, quantity, position }),
        ),

    /** Empties a bait slot back into the inventory. */
    unpackBait: (slot: number) =>
        change(() => api.delete(apiPath(GEO_API_PATHS.me.baitSlot, { slot }))),

    /** Camp becomes (about) where the player stands. Once a week; the server rounds it. */
    setCamp: () => changeHere((position) => api.put(GEO_API_PATHS.me.camp, { position })),

    /** Wears a saved loadout: its gear and pet. */
    wearLoadout: (slot: number) => change(() => api.post(apiPath(GEO_API_PATHS.me.wearLoadout, { slot }))),

    /** `save`: stores what's worn now in the slot as `name` (and makes it active); otherwise only renames. */
    saveLoadout: (slot: number, name: string, save: boolean) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.loadout, { slot }), { name, save })),

    /** Clears a loadout slot; what's worn stays on. */
    deleteLoadout: (slot: number) => change(() => api.delete(apiPath(GEO_API_PATHS.me.loadout, { slot }))),

    /** Tags the loadout auto-swap wears for an activity, or untags it. */
    setLoadoutAuto: (slot: number, autoFor: GeoLoadoutActivity | null) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.loadoutAuto, { slot }), { autoFor })),

    buyLoadoutSlot: () => change(() => api.post(GEO_API_PATHS.me.buyLoadoutSlot)),

    /** Purse → bank at camp. Banked coins are safe from death. */
    bankDeposit: (amount: number) =>
        changeHere((position) => api.post(GEO_API_PATHS.me.bankDeposit, { amount, position })),

    /** Bank → purse, at camp. */
    bankWithdraw: (amount: number) =>
        changeHere((position) => api.post(GEO_API_PATHS.me.bankWithdraw, { amount, position })),

    /** Makes a pet the active one, or puts the active pet away with null. */
    setActivePet: (inventoryId: string | null) => change(() => api.put(GEO_API_PATHS.me.activePet, { inventoryId })),

    /** The pet holds one of this stack of pet items; whatever it held comes back. */
    givePetItem: (petInventoryId: string, heldInventoryId: string) =>
        change(() => api.put(apiPath(GEO_API_PATHS.me.petItem, { inventoryId: petInventoryId }), { inventoryId: heldInventoryId })),

    /** Takes the pet's held item back, for coins by its rarity. */
    takePetItem: (petInventoryId: string) =>
        change(() => api.delete(apiPath(GEO_API_PATHS.me.petItem, { inventoryId: petInventoryId }))),
};
