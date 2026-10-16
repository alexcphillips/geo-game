import { AccessibilityInfo } from "react-native";
import { create } from "zustand";

/** Sets the stripe colour: something failed, something worked, or just news. */
export type ToastKind = "error" | "success" | "info";

export type Toast = {
    id: number;
    message: string;
    kind: ToastKind;
    /** Set while it animates out, just before it's removed. */
    leaving: boolean;
};

/** Most toasts on screen at once; a new one pushes the oldest out. */
const MAX_TOASTS = 3;
/** How long the exit animation gets before the toast is removed. */
export const TOAST_LEAVE_MS = 200;

/** About 3 seconds, plus time to read anything longer than a short line. */
function visibleMs(message: string): number {
    return Math.min(7000, 3000 + Math.max(0, message.length - 40) * 50);
}

type ToastState = {
    toasts: Toast[];
    show: (message: string, kind?: ToastKind) => void;
    dismiss: (id: number) => void;
};

// Timers live outside the store: they're bookkeeping, not state to render.
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 1;

function clearTimer(id: number) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
}

export const useToastStore = create<ToastState>()((set, get) => ({
    toasts: [],
    show: (message, kind = "info") => {
        AccessibilityInfo.announceForAccessibility(message);

        // The same message again (a repeated tap) restarts its timer rather
        // than stacking a copy.
        const repeat = get().toasts.find(
            (toast) => !toast.leaving && toast.message === message && toast.kind === kind,
        );
        if (repeat) {
            clearTimer(repeat.id);
            timers.set(repeat.id, setTimeout(() => get().dismiss(repeat.id), visibleMs(message)));
            return;
        }

        const id = nextId++;
        const showing = get().toasts.filter((toast) => !toast.leaving);
        for (const old of showing.slice(0, Math.max(0, showing.length - MAX_TOASTS + 1))) {
            get().dismiss(old.id);
        }
        set((state) => ({ toasts: [...state.toasts, { id, message, kind, leaving: false }] }));
        timers.set(id, setTimeout(() => get().dismiss(id), visibleMs(message)));
    },
    dismiss: (id) => {
        const toast = get().toasts.find((candidate) => candidate.id === id);
        if (!toast || toast.leaving) return;
        clearTimer(id);
        set((state) => ({
            toasts: state.toasts.map((candidate) =>
                candidate.id === id ? { ...candidate, leaving: true } : candidate,
            ),
        }));
        setTimeout(
            () => set((state) => ({ toasts: state.toasts.filter((candidate) => candidate.id !== id) })),
            TOAST_LEAVE_MS,
        );
    },
}));

/**
 * Shows a toast from anywhere, inside a component or not:
 * `showToast("Your Talisman Bag is full", "error")`.
 */
export function showToast(message: string, kind: ToastKind = "info") {
    useToastStore.getState().show(message, kind);
}
