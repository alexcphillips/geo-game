import { Fragment } from "react";
import { Text, View } from "react-native";
import { intentColor } from "@/features/fishing/components/FishingScene";
import { INTENTS } from "@/features/fishing/fishingText";
import type { GeoFishIntent } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

const TILE_SIZE = 40;
/** Moves in the strip: this one, then three more. */
const SHOWN = 4;

/**
 * The fish's next moves, where combat shows its turn order: the move it makes
 * this turn on the left, lit, and what it does under the row. Later moves stay
 * "?" unless you're reading the water.
 */
export default function FishIntents({ intents, reading }: { intents: GeoFishIntent[]; reading: boolean }) {
    const styles = useStyles();
    const palette = useTheme();
    const now = intents[0];
    if (!now) return null;
    return (
        <View
            style={styles.container}
            accessible
            accessibilityLabel={`The fish will ${INTENTS[now].label}: ${INTENTS[now].text}`}
        >
            <View style={styles.row}>
                <Text style={styles.label}>Next</Text>
                {/* The server sends only this turn's move unless you're reading. */}
                {Array.from({ length: SHOWN }, (_, index) => {
                    const intent = intents[index];
                    const shown = intent !== undefined && (index === 0 || reading);
                    const color = shown ? intentColor(intent) : palette.textMuted;
                    return (
                        <Fragment key={index}>
                            {index > 0 && <Text style={styles.arrow}>›</Text>}
                            <View style={[styles.tile, { borderColor: index === 0 ? color : palette.outline }, index === 0 && styles.tileNow]}>
                                <Text style={[styles.glyph, { color }]}>{shown ? INTENTS[intent].glyph : "?"}</Text>
                                {index === 0 && shown && <Text style={[styles.tileLabel, { color }]}>{INTENTS[intent].label}</Text>}
                            </View>
                        </Fragment>
                    );
                })}
            </View>
            <Text style={styles.text}>{INTENTS[now].text}</Text>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    container: {
        gap: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    label: {
        marginRight: 4,
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    arrow: {
        color: p.textMuted,
        fontSize: 20,
        lineHeight: 22,
    },
    tile: {
        minWidth: TILE_SIZE,
        height: TILE_SIZE,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
        borderRadius: 8,
        borderWidth: 1.5,
        backgroundColor: p.surfaceAlt,
    },
    tileNow: {
        flexDirection: "row",
        gap: 5,
        paddingHorizontal: 10,
        backgroundColor: p.surfaceAlt,
    },
    glyph: {
        fontSize: 16,
        fontFamily: FONTS.bodyHeavy,
    },
    tileLabel: {
        fontSize: 13,
        fontFamily: FONTS.bodyHeavy,
    },
    text: {
        color: p.textMuted,
        fontSize: 12,
    },
}));
