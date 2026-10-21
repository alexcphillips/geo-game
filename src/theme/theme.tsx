import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
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
 * Sets the mood for everything inside, and the status bar to match: dark
 * icons on parchment, light ones on dusk. The status bar is a stack, so the
 * innermost mounted provider wins and leaving a screen restores the one
 * under it.
 */
export function MoodProvider({ mood, children }: MoodProviderProps) {
    return (
        <MoodContext.Provider value={mood}>
            <StatusBar style={mood === "dusk" ? "light" : "dark"} />
            {children}
        </MoodContext.Provider>
    );
}

export function useMood(): Mood {
    return useContext(MoodContext);
}

export function useTheme(): Palette {
    return PALETTES[useMood()];
}

/**
 * The mood for screens that follow the world outside rather than a fixed one
 * (the map): dusk when the phone is in dark mode, day otherwise.
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
