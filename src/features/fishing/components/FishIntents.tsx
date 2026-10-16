import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { intentColor } from "@/features/fishing/components/FishingScene";
import { INTENTS } from "@/features/fishing/fishingText";
import type { GeoFishIntent } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

const TILE_SIZE = 40;
/** Moves in the strip: this one, then three more. */
const SHOWN = 4;

/**
 * The fish's next moves, where combat shows its turn order: the move it makes
 * this turn on the left, lit, and what it does under the row. Later moves stay
 * "?" unless you're reading the water.
 */
export default function FishIntents({ intents, reading }: { intents: GeoFishIntent[]; reading: boolean }) {
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
                    const color = shown ? intentColor(intent) : colors.textSecondary;
                    return (
                        <Fragment key={index}>
                            {index > 0 && <Text style={styles.arrow}>›</Text>}
                            <View style={[styles.tile, { borderColor: index === 0 ? color : colors.border }, index === 0 && styles.tileNow]}>
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

const styles = StyleSheet.create({
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
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    arrow: {
        color: colors.textSecondary,
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
        backgroundColor: colors.surfaceRaised,
    },
    tileNow: {
        flexDirection: "row",
        gap: 5,
        paddingHorizontal: 10,
        backgroundColor: "#2A221F",
    },
    glyph: {
        fontSize: 16,
        fontWeight: "700",
    },
    tileLabel: {
        fontSize: 13,
        fontWeight: "700",
    },
    text: {
        color: colors.textSecondary,
        fontSize: 12,
    },
});
