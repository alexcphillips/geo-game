import { Image, StyleSheet, View } from "react-native";
import { FIGURE_BODY, FIGURE_BODY_BOX, FIGURE_CANVAS, FIGURE_LAYERS } from "../figureLayers.generated";
import { FIGURE_SLOTS, type FigureGear } from "../playerFigure";

/** Width ÷ height of the body, for laying the figure out like a single image. */
export const PLAYER_FIGURE_ASPECT_RATIO = FIGURE_BODY_BOX.width / FIGURE_BODY_BOX.height;

type PlayerFigureProps = {
    gear: FigureGear;
    /** On-screen height of the body. Weapons and shields may reach past its box. */
    height: number;
};

/**
 * The player's character wearing their gear: the base body with one image
 * per visible slot stacked on it. Every layer shares the body's canvas
 * (see scripts/add-layer.mjs), so each just fills it; no per-item offsets.
 *
 * Laid out by the body's bounding box, so it sizes like the old single
 * portrait; the canvas around it (room for long weapons) overflows visibly.
 */
export default function PlayerFigure({ gear, height }: PlayerFigureProps) {
    const scale = height / FIGURE_BODY_BOX.height;
    const canvas = {
        left: -FIGURE_BODY_BOX.x * scale,
        top: -FIGURE_BODY_BOX.y * scale,
        width: FIGURE_CANVAS.width * scale,
        height: FIGURE_CANVAS.height * scale,
    };
    const layers = FIGURE_SLOTS.flatMap(({ layer }) => {
        const appearance = gear[layer];
        const source = appearance ? FIGURE_LAYERS[layer][appearance] : undefined;
        return source ? [{ key: layer, source }] : [];
    });

    return (
        <View
            style={{ width: FIGURE_BODY_BOX.width * scale, height }}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Your character"
        >
            <View style={[styles.canvas, canvas]} pointerEvents="none">
                {FIGURE_BODY && <Image source={FIGURE_BODY} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />}
                {layers.map(({ key, source }) => (
                    <Image key={key} source={source} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    canvas: {
        position: "absolute",
    },
});
