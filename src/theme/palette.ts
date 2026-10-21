/**
 * The dark storybook palette, in two moods.
 *
 * - **day** — parchment and ink: the map by day, the farm, fishing, camp, the
 *   Bazaar and every menu. Muted and earthy rather than candy-bright, so the
 *   game's monsters still look at home in it.
 * - **dusk** — ink and lantern: combat, dungeons, and the map at night. Close
 *   to ink rather than purple, with lantern gold carrying the warmth.
 *
 * Both moods share one set of role names, so a component asks for `surface`
 * or `danger` and gets the right colour for wherever it's drawn (see
 * `theme.tsx`). Card faces follow the mood too: parchment by day, lifted ink
 * at dusk.
 *
 * Panels, buttons and cards are "inked": a thick `outline` border and a hard,
 * unblurred drop shadow in the same colour, echoing the line work of the
 * sprites (the bandit and crab are the reference).
 *
 * This replaces the ash-and-ember palette in `colors.ts`, which screens are
 * moving off one at a time.
 */

import { colors } from "./colors";

export type Mood = "day" | "dusk";

/**
 * The game's own colours — rarity, statuses, item effects, chest and fish
 * tiers, skills — from `colors.ts`, made legible in each mood. They were tuned
 * on a dark background, so at dusk they're used as they are; by day each is
 * deepened toward ink until it reads on parchment (see `legibleOnParchment`).
 */
export type GameColors = typeof colors;

export type Palette = {
    /** Behind everything: the screen itself. */
    background: string;
    /** Panels, sheets, HUD chips. */
    surface: string;
    /** A panel set into a panel: rows in a sheet, wells, inactive tabs. */
    surfaceAlt: string;
    /** Inked edges and their hard shadows. */
    outline: string;

    text: string;
    textMuted: string;

    /** The one thing to do next: the main button on a screen. */
    primary: string;
    /** Text and icons on `primary`. */
    onPrimary: string;
    /** Rewards, coins, ripe crops, quests. */
    reward: string;
    /** Information, water, fishing. */
    info: string;
    /** Fire, the player's own marker, highlights. */
    ember: string;
    /** Danger, damage, health. */
    danger: string;
    /** Healing, growth. */
    heal: string;
    /** The empty part of a bar or meter. */
    track: string;
    /**
     * A vital bar's fill, as three vertical stops (lit top, base, shadowed
     * bottom), so the bar reads as rounded rather than printed.
     */
    healthFill: readonly [string, string, string];
    /** A barrier over the health bar: gold, kept apart from Guard's icy blue. */
    barrierFill: readonly [string, string, string];

    /** Card faces: parchment by day, a lifted ink at dusk. */
    cardFace: string;
    cardText: string;
    /** A card's inked edge. */
    cardOutline: string;

    /** The game's own colours, legible in this mood. */
    game: GameColors;
};

/** WCAG relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
    const channel = (offset: number) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
    const [first, second] = [luminance(a), luminance(b)];
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Mixes `hex` toward `toward` by `amount` (0–1). */
function mix(hex: string, toward: string, amount: number): string {
    const channel = (value: string, offset: number) => parseInt(value.slice(offset, offset + 2), 16);
    return (
        "#" +
        [1, 3, 5]
            .map((offset) => Math.round(channel(hex, offset) + (channel(toward, offset) - channel(hex, offset)) * amount))
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase()
    );
}

const PARCHMENT = "#FBF3E2";
const INK_TEXT = "#2A241C";

/**
 * A colour deepened toward ink, a step at a time, until it passes WCAG AA for
 * text (4.5:1) on parchment. Hues survive: legendary is still orange, just a
 * deeper orange. Anything that isn't a plain `#RRGGBB` (gradients, rgba) is
 * left alone.
 */
function legibleOnParchment<T>(value: T): T {
    if (Array.isArray(value)) return value.map(legibleOnParchment) as T;
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
    let out: string = value;
    for (let step = 1; contrast(out, PARCHMENT) < 4.5 && step <= 12; step++) out = mix(value, INK_TEXT, step * 0.08);
    return out as T;
}

const DAY_GAME_COLORS = Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [name, legibleOnParchment(value)]),
) as GameColors;

export const PALETTES: Record<Mood, Palette> = {
    day: {
        background: "#EFE6D2",
        surface: "#FBF3E2",
        surfaceAlt: "#F3E9D4",
        outline: "#3A3024",
        text: "#2A241C",
        textMuted: "#675C4C",
        primary: "#4A7A3D",
        onPrimary: "#FFFFFF",
        reward: "#D9A43A",
        info: "#3E6A8F",
        ember: "#C9612A",
        danger: "#B23A32",
        heal: "#4A7A3D",
        track: "#E4D7BC",
        healthFill: ["#CC5A50", "#B23A32", "#8C2A23"],
        barrierFill: ["#F0CC6A", "#D9A43A", "#A87A1E"],
        cardFace: "#FBF3E2",
        cardText: "#2A241C",
        cardOutline: "#3A3024",
        game: DAY_GAME_COLORS,
    },
    dusk: {
        background: "#17151F",
        surface: "#24212F",
        surfaceAlt: "#302C3E",
        outline: "#0B0A10",
        text: "#EFE6D2",
        textMuted: "#ABA3B8",
        primary: "#E8A93A",
        onPrimary: "#241B10",
        reward: "#E8B54E",
        info: "#7FB0DA",
        ember: "#E7803F",
        danger: "#F0645A",
        heal: "#86B96E",
        track: "#302C3E",
        healthFill: ["#FF877C", "#F0645A", "#C64A41"],
        barrierFill: ["#F6D27A", "#E8B54E", "#B5862A"],
        cardFace: "#302C3E",
        cardText: "#EFE6D2",
        cardOutline: "#0B0A10",
        game: colors,
    },
};

/** The inked look: border width, and how far the hard shadow drops. */
export const INK = {
    border: 2.5,
    lift: 3,
    /** For big buttons, which sit a little prouder. */
    liftLarge: 4,
} as const;

/**
 * Font families, as loaded in the root layout. React Native picks a weight by
 * family name rather than `fontWeight`, so each weight is its own family:
 * Fredoka for display (titles, big buttons), Nunito for everything else.
 */
export const FONTS = {
    display: "Fredoka_600SemiBold",
    body: "Nunito_600SemiBold",
    bodyBold: "Nunito_700Bold",
    bodyHeavy: "Nunito_800ExtraBold",
} as const;
