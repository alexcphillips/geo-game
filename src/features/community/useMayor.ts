import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/Toast/toastStore";
import { api, toErrorMessage } from "@/lib/api";
import { GEO_API_PATHS, type GeoMayorResponse } from "@/lib/geo/contracts";
import { toCandidate, toMayor, type Candidate, type Mayor } from "./mayors";

/** Vote counts are live: read again this often while the screen is open. */
const POLL_MS = 30_000;

export type MayorState = {
    mayor: Mayor | null;
    election: {
        id: string;
        endsAt: number;
        candidates: Candidate[];
        yourVote: { candidateId: string; weight: number } | null;
        yourVoteWeight: number;
    } | null;
    /** Server clock minus the phone's, for the countdown. */
    clockOffsetMs: number;
    error: string | null;
    refresh: () => Promise<void>;
    /** Casts the player's one vote. Resolves true when the server took it. */
    vote: (candidateId: string) => Promise<boolean>;
};

/** A reply, and the server's clock minus the phone's when it arrived. */
type Reading = { response: GeoMayorResponse; clockOffsetMs: number };

function read(response: GeoMayorResponse): Reading {
    return { response, clockOffsetMs: new Date(response.serverTime).getTime() - Date.now() };
}

async function fetchMayor(): Promise<Reading | { error: string }> {
    try {
        return read(await api.get<GeoMayorResponse>(GEO_API_PATHS.mayor.root));
    } catch (failure) {
        return { error: toErrorMessage(failure) };
    }
}

/**
 * The mayor in office and the running election, from the server: read on
 * open, every 30 seconds, just after the countdown ends (to show the new
 * mayor), and after voting.
 */
export function useMayor(): MayorState {
    const [reading, setReading] = useState<Reading | null>(null);
    const [error, setError] = useState<string | null>(null);
    const response = reading?.response ?? null;
    const clockOffsetMs = reading?.clockOffsetMs ?? 0;

    const adopt = useCallback((result: Reading | { error: string }) => {
        if ("error" in result) setError(result.error);
        else {
            setReading(result);
            setError(null);
        }
    }, []);

    const refresh = useCallback(async () => adopt(await fetchMayor()), [adopt]);

    useEffect(() => {
        let isOpen = true;
        const load = () => fetchMayor().then((result) => isOpen && adopt(result));
        void load();
        const timer = setInterval(() => void load(), POLL_MS);
        return () => {
            isOpen = false;
            clearInterval(timer);
        };
    }, [adopt]);

    // When the election ends, read again a moment after, for the new mayor.
    const endsAt = response ? new Date(response.election.endsAt).getTime() : null;
    useEffect(() => {
        if (endsAt === null) return;
        const wait = Math.max(0, endsAt - (Date.now() + clockOffsetMs)) + 3_000;
        // Past a day the 30-second poll is enough (and setTimeout tops out at ~24 days).
        if (wait > 86_400_000) return;
        const timer = setTimeout(() => void refresh(), wait);
        return () => clearTimeout(timer);
        // clockOffsetMs moves a little on every read; the end time is what matters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endsAt, refresh]);

    const vote = useCallback(
        async (candidateId: string) => {
            if (!response) return false;
            try {
                const path = GEO_API_PATHS.mayor.vote.replace(":electionId", encodeURIComponent(response.election.id));
                adopt(read(await api.post<GeoMayorResponse>(path, { candidateId })));
                showToast("Vote cast", "success");
                return true;
            } catch (failure) {
                showToast(toErrorMessage(failure), "error");
                await refresh();
                return false;
            }
        },
        [adopt, refresh, response],
    );

    return useMemo(
        () => ({
            mayor: response ? toMayor(response.mayor) : null,
            election: response
                ? {
                      id: response.election.id,
                      endsAt: new Date(response.election.endsAt).getTime(),
                      candidates: response.election.candidates.map(toCandidate),
                      yourVote: response.election.yourVote,
                      yourVoteWeight: response.election.yourVoteWeight,
                  }
                : null,
            clockOffsetMs,
            error,
            refresh,
            vote,
        }),
        [response, clockOffsetMs, error, refresh, vote],
    );
}
