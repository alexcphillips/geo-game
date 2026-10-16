import { create } from "zustand";
import type { SuggestionKind } from "./suggestionKinds";

export type Coordinates = { latitude: number; longitude: number };

type SuggestionDraftState = {
    kind: SuggestionKind;
    note: string;
    /** Null until the player drops a pin; their own position is used instead. */
    pin: Coordinates | null;
    setKind: (kind: SuggestionKind) => void;
    setNote: (note: string) => void;
    setPin: (pin: Coordinates | null) => void;
    reset: () => void;
};

const EMPTY = { kind: "landmark" as SuggestionKind, note: "", pin: null };

/**
 * The location suggestion being written.
 *
 * A store rather than component state because dropping a pin closes the
 * settings modal so the map is visible, and the modal resets its content on
 * unmount by design. The draft has to survive that round trip.
 */
export const useSuggestionDraft = create<SuggestionDraftState>((set) => ({
    ...EMPTY,
    setKind: (kind) => set({ kind }),
    setNote: (note) => set({ note }),
    setPin: (pin) => set({ pin }),
    reset: () => set(EMPTY),
}));
