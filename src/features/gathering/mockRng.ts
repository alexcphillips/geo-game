/**
 * PLACEHOLDER randomness for the device-side gathering mocks (mining,
 * farming, foraging), the same mulberry32 the fishing mock uses. The seed
 * lives in the Run's state, so every step is reproducible from the state
 * alone, the way the server's seeded RNG will be. Goes away with the mocks.
 */

/** The next roll in [0, 1), advancing `state.rng`. */
export function next(state: { rng: number }): number {
    state.rng = (state.rng + 0x6d2b79f5) | 0;
    let t = state.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A key, chosen by weight. Zero weights never come up. */
export function pickWeighted<K extends string>(weights: Partial<Record<K, number>>, roll: number): K {
    const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let x = roll * total;
    for (const [key, weight] of entries) {
        x -= weight;
        if (x < 0) return key;
    }
    return entries[entries.length - 1]![0];
}

/** An integer in [min, max]. */
export const rollInt = (state: { rng: number }, min: number, max: number) =>
    min + Math.floor(next(state) * (max - min + 1));

/** One of the list, evenly. */
export function pickOne<T>(state: { rng: number }, list: readonly T[]): T {
    return list[Math.floor(next(state) * list.length)]!;
}

export const fmt = (n: number) => String(Math.round(n * 10) / 10);
