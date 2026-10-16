import { useEffect } from "react";
import { create } from "zustand";
import type { GeoActivity } from "@/lib/geo/contracts";

type Report = { id: number; activity: GeoActivity; skill: string | null };

type PresenceState = {
    /** What each mounted screen or menu says the player is doing; the last one wins. */
    reports: Report[];
    /** Incoming friend requests, from the last heartbeat or friends fetch. */
    incomingRequests: number;
    setIncomingRequests: (count: number) => void;
};

export const usePresenceStore = create<PresenceState>()((set) => ({
    reports: [],
    incomingRequests: 0,
    setIncomingRequests: (incomingRequests) => set({ incomingRequests }),
}));

/** What the heartbeat sends: the newest report, or exploring with none. */
export function currentActivity(reports: Report[]): { activity: GeoActivity; skill: string | null } {
    const top = reports[reports.length - 1];
    return top ? { activity: top.activity, skill: top.skill } : { activity: "exploring", skill: null };
}

let nextId = 1;

/**
 * Says what the player is doing while the calling screen or menu is mounted.
 *
 * A stack rather than a single value, because screens stay mounted under the
 * ones pushed over them: the world reports exploring, a fight pushed on top
 * reports fighting, and when the fight closes, exploring is current again
 * without the world doing anything.
 */
export function useReportActivity(activity: GeoActivity, skill: string | null = null) {
    useEffect(() => {
        const id = nextId++;
        usePresenceStore.setState((state) => ({ reports: [...state.reports, { id, activity, skill }] }));
        return () =>
            usePresenceStore.setState((state) => ({ reports: state.reports.filter((report) => report.id !== id) }));
    }, [activity, skill]);
}
