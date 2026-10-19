import type { GameIconName } from "@/components/Icon/Icon";
import { playerActions } from "@/features/player/playerStore";
import { useBait, useLunchbox } from "@/features/player/usePlayer";
import {
    GEO_BAIT_MAX_SLOTS,
    GEO_BAIT_STACK_SIZE,
    type GeoItemView,
    type GeoLunchbox,
} from "@/lib/geo/contracts";
import { isBait, isFood, LUNCHBOX_MAX_SLOTS, LUNCHBOX_STACK_SIZE } from "./lunchbox";

/**
 * Things packed into slots before a Run, all handled the same way: the
 * lunchbox (food, for combat) and bait (for fishing). Each slot holds a
 * stack of one item; packed items leave the inventory until unpacked or used.
 * Both pack only at camp.
 */
export type PackKind = "lunchbox" | "bait";

export type PackInfo = {
    title: string;
    icon: GameIconName;
    /** Under the icon on the Run's tile. */
    tileLabel: string;
    /** What it holds, lower case: "food", "bait". */
    noun: string;
    maxSlots: number;
    stackSize: number;
    /** Whether an item can be packed into it. */
    holds: (def: GeoItemView | undefined) => boolean;
    /** At the top of the packing screen. */
    hint: string;
    /** When the inventory has nothing to pack. */
    noneOwned: string;
    /** Packing works only at camp (unpacking works anywhere). */
    needsCamp: boolean;
    /** In the Run's sheet: what a tap does, and what to say while it can't. */
    useHint: string;
    waitHint: string;
    pack: (slot: number, itemId: string, quantity: number) => Promise<boolean>;
    unpack: (slot: number) => Promise<boolean>;
};

export const PACKS: Record<PackKind, PackInfo> = {
    lunchbox: {
        title: "Lunchbox",
        icon: "knife-fork",
        tileLabel: "Food",
        noun: "food",
        maxSlots: LUNCHBOX_MAX_SLOTS,
        stackSize: LUNCHBOX_STACK_SIZE,
        holds: isFood,
        hint: "Eat from it in a Run (it takes your turn), or between fights from a food's page. A slot holds one kind of food.",
        noneOwned: "No food to pack. Cook some, or buy bread from the Baker.",
        needsCamp: true,
        useHint: "Tap to eat · takes your turn. Hold for details.",
        waitHint: "Wait for your turn to eat. Hold for details.",
        pack: playerActions.packLunchbox,
        unpack: playerActions.unpackLunchbox,
    },
    bait: {
        title: "Bait",
        icon: "fishing-hook",
        tileLabel: "Bait",
        noun: "bait",
        maxSlots: GEO_BAIT_MAX_SLOTS,
        stackSize: GEO_BAIT_STACK_SIZE,
        holds: isBait,
        hint: "Use it in a fishing Run: each cast takes one. A slot holds one kind of bait.",
        noneOwned: "No bait to pack. Buy worms from the Angler.",
        needsCamp: true,
        useHint: "Tap to use. Hold for details.",
        waitHint: "Bait is used once casting arrives. Hold for details.",
        pack: playerActions.packBait,
        unpack: playerActions.unpackBait,
    },
};

/** Slots unlocked, and what's packed in them, for either kind. */
export function usePack(kind: PackKind): GeoLunchbox {
    const lunchbox = useLunchbox();
    const bait = useBait();
    return kind === "bait" ? bait : lunchbox;
}
