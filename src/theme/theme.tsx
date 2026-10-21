import { createContext, useContext, useEffect, useId, type ReactNode } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { create } from "zustand";
import { INK, PALETTES, type Mood, type Palette } from "./palette";

/**
 * Which mood a part of the app is drawn in, and the palette that goes with it.
 *
 * A screen declares its mood once with `<MoodProvider>`; everything inside
 * reads it with `useTheme()` or a `createStyles` hook, so shared pieces (a
 * button, a modal, the HUD) look right on a day screen and a dusk one without
 * being told. Outside any provider the mood is day.
 */
const MoodContext = createContext<Mood>("day");

type MoodProviderProps = {
    mood: Mood;
    children: ReactNode;
};

/**
 * The moods of the screens' providers, in the order they mounted. Lets
 * things drawn above every screen (the root toast host) match the screen on
 * top, which they can't read from context.
 */
const useScreenMoods = create<{ entries: { id: string; mood: Mood }[] }>(() => ({ entries: [] }));

/**
 * Sets the mood for everything inside, and the status bar to match: dark
 * icons on parchment, light ones on dusk. The status bar is a stack, so the
 * innermost mounted provider wins and leaving a screen restores the one
 * under it. Screen moods work the same way (see `FollowScreenMood`).
 */
export function MoodProvider({ mood, children }: MoodProviderProps) {
    const id = useId();
    useEffect(() => {
        useScreenMoods.setState(({ entries }) => ({ entries: [...entries, { id, mood: "day" }] }));
        return () => useScreenMoods.setState(({ entries }) => ({ entries: entries.filter((e) => e.id !== id) }));
    }, [id]);
    // In place, so a screen that follows the phone keeps its spot in the stack.
    useEffect(() => {
        useScreenMoods.setState(({ entries }) => ({ entries: entries.map((e) => (e.id === id ? { id, mood } : e)) }));
    }, [id, mood]);

    return (
        <MoodContext.Provider value={mood}>
            <StatusBar style={mood === "dusk" ? "light" : "dark"} />
            {children}
        </MoodContext.Provider>
    );
}

/**
 * Draws its children in the mood of the screen on top (the innermost mounted
 * `MoodProvider`), or day when none is. For things outside every screen,
 * like the root toast host. It doesn't add to the stack itself.
 */
export function FollowScreenMood({ children }: { children: ReactNode }) {
    const mood = useScreenMoods((state) => state.entries.at(-1)?.mood ?? "day");
    return <MoodContext.Provider value={mood}>{children}</MoodContext.Provider>;
}

export function useMood(): Mood {
    return useContext(MoodContext);
}

export function useTheme(): Palette {
    return PALETTES[useMood()];
}

/**
 * The mood for screens that follow the world outside rather than a fixed one
 * (the map, the character screen): dusk when the phone is in dark mode, day otherwise.
 */
export function useAmbientMood(): Mood {
    return useColorScheme() === "dark" ? "dusk" : "day";
}

/**
 * Themed styles: like `StyleSheet.create`, but from a function of the
 * palette. Returns a hook that hands back the styles for the current mood.
 * Each mood's sheet is built once, the first time it's asked for, so a
 * component pays nothing per render.
 *
 *     const useStyles = createStyles((p) => ({ panel: { backgroundColor: p.surface } }));
 *     // in the component:
 *     const styles = useStyles();
 */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(factory: (palette: Palette, mood: Mood) => T): () => T {
    const sheets: Partial<Record<Mood, T>> = {};
    return function useStyles() {
        const mood = useMood();
        return (sheets[mood] ??= StyleSheet.create(factory(PALETTES[mood], mood)));
    };
}

/**
 * The inked edge: a thick outline and a hard drop shadow in the same colour.
 * `boxShadow` (not `shadow*`/`elevation`) because it draws the same unblurred
 * shadow on iOS and Android.
 */
export function inked(palette: Palette, lift: number = INK.lift) {
    return {
        borderWidth: INK.border,
        borderColor: palette.outline,
        boxShadow: `0px ${lift}px 0px ${palette.outline}`,
    } as const;
}
