import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/Toast/toastStore";
import { api, apiPath, toErrorMessage } from "@/lib/api";
import { useLiveRead } from "@/lib/realtime/useLiveRead";
import { latestOnly } from "@/lib/usePolling";
import { GEO_API_PATHS, type GeoMayorResponse } from "@/lib/geo/contracts";
import { toCandidate, toMayor, type Candidate, type Mayor } from "./mayors";

/** While the screen is open and the geo socket is down, read again this often. */
const FALLBACK_POLL_MS = 30_000;

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
 * open, whenever the server says it changed (anyone's vote, a new mayor),
 * just after the countdown ends, and after voting.
 */
export function useMayor(): MayorState {
    const [reading, setReading] = useState<Reading | null>(null);
    const [error, setError] = useState<string | null>(null);
    const response = reading?.response ?? null;
    const clockOffsetMs = reading?.clockOffsetMs ?? 0;

    // A poll still out when a vote's answer lands is older; it's dropped.
    const [reads] = useState(latestOnly);
    const adopt = useCallback((result: Reading | { error: string }) => {
        if ("error" in result) setError(result.error);
        else {
            setReading(result);
            setError(null);
        }
    }, []);

    const refresh = useCallback(async () => {
        const ticket = reads.start();
        const result = await fetchMayor();
        if (reads.isCurrent(ticket)) adopt(result);
    }, [adopt, reads]);

    useLiveRead(refresh, "mayor", FALLBACK_POLL_MS);

    // When the election ends, read again a moment after, for the new mayor.
    const endsAt = response ? new Date(response.election.endsAt).getTime() : null;
    useEffect(() => {
        if (endsAt === null) return;
        const wait = Math.max(0, endsAt - (Date.now() + clockOffsetMs)) + 3_000;
        // Past a day the push (or fallback poll) is enough (and setTimeout tops out at ~24 days).
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
                const path = apiPath(GEO_API_PATHS.mayor.vote, { electionId: response.election.id });
                const voted = read(await api.post<GeoMayorResponse>(path, { candidateId }));
                reads.start();
                adopt(voted);
                showToast("Vote cast", "success");
                return true;
            } catch (failure) {
                showToast(toErrorMessage(failure), "error");
                await refresh();
                return false;
            }
        },
        [adopt, reads, refresh, response],
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
