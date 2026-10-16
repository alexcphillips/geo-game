import { Fragment } from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { colors } from "@/theme/colors";

export type TurnOrderEntry = {
    id: string;
    name: string;
    image: ImageSourcePropType;
    isPlayer?: boolean;
};

type TurnOrderProps = {
    /** In acting order: the first entry acts next. */
    entries: TurnOrderEntry[];
};

const TILE_SIZE = 44;

/**
 * Who acts when: a row of square portraits, first to act on the left.
 *
 * The order is decided by speed when the Run starts. The tile that acts next
 * is lit, and players get an ember edge so "which one is me" never needs
 * reading. Built to take any number of entries, so multiplayer Runs work
 * the same way.
 */
export default function TurnOrder({ entries }: TurnOrderProps) {
    return (
        <View
            style={styles.row}
            accessible
            accessibilityLabel={`Turn order: ${entries.map((entry) => entry.name).join(", then ")}`}
        >
            <Text style={styles.label}>Order</Text>
            {entries.map((entry, index) => (
                <Fragment key={entry.id}>
                    {index > 0 && <Text style={styles.arrow}>›</Text>}
                    <View
                        style={[
                            styles.tile,
                            entry.isPlayer && styles.tilePlayer,
                            index === 0 && styles.tileNext,
                        ]}
                    >
                        <Image
                            source={entry.image}
                            style={styles.image}
                            resizeMode="contain"
                            accessibilityIgnoresInvertColors
                        />
                    </View>
                </Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
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
        width: TILE_SIZE,
        height: TILE_SIZE,
        padding: 3,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
        overflow: "hidden",
    },
    tilePlayer: {
        borderColor: colors.ember,
    },
    // Next to act: brighter, and lifted slightly, so it reads as "now".
    tileNext: {
        backgroundColor: "#2A221F",
        transform: [{ scale: 1.08 }],
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
