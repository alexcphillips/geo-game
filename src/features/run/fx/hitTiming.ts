/**
 * Every hit-effect number, tuned in the Combat Hit Lab preview
 * (https://claude.ai/artifact/2JJfwmMwYd1wB6i1dv3dyB) and copied here as-is.
 * Durations in ms; distances in points.
 *
 * Change a number here and every hit changes with it.
 */
export const HIT_TIMING = {
    lungeOut: 130,
    lungeBack: 200,
    lungeDistance: 34,

    slashDraw: 170,
    slashFade: 160,

    burst: 320,
    burstRingFrom: 6,
    burstRingTo: 34,
    burstRays: 8,

    projectile: 420,
    projectileArc: 46,
    /** Fading copies trailing the orb. */
    trail: 4,

    shake: 320,
    shakeDistance: 7,
    flash: 160,

    damageRise: 760,
    damageLift: 34,

    /** Health bar: the fill drops, a pale chunk lingers, then catches up. */
    drain: 260,
    chipHold: 380,
    chipCatchUp: 360,

    critScreenShake: 300,
} as const;
