import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type Credit = {
    title: string;
    body: string;
    /** Shown as the link text and opened on tap. */
    url: string;
};

/**
 * Everything the app is required (or glad) to credit.
 *
 * The map's own attribution still sits on the map as a collapsible (i) — OSM's
 * guidelines require that — and this page is the "easily locatable" home for
 * the full credits and licence links. It is also where Game Icons' CC BY
 * attribution lives in-app.
 */
const CREDITS: Credit[] = [
    {
        title: "Map data",
        body: "© OpenStreetMap contributors. Available under the Open Database Licence.",
        url: "https://www.openstreetmap.org/copyright",
    },
    {
        title: "Map tiles",
        body: "Served by OpenFreeMap.",
        url: "https://openfreemap.org",
    },
    {
        title: "Tile schema",
        body: "© OpenMapTiles.",
        url: "https://www.openmaptiles.org",
    },
    {
        title: "Map rendering",
        body: "MapLibre GL JS.",
        url: "https://maplibre.org",
    },
    {
        title: "Icons",
        body: "By Lorc, Delapouite and contributors at game-icons.net. Licensed under CC BY 3.0.",
        url: "https://game-icons.net",
    },
];

export default function CreditsPage() {
    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {CREDITS.map((credit) => (
                <View key={credit.title} style={styles.credit}>
                    <Text style={styles.title}>{credit.title}</Text>
                    <Text style={styles.body}>{credit.body}</Text>
                    <Pressable
                        onPress={() => Linking.openURL(credit.url)}
                        accessibilityRole="link"
                        hitSlop={8}
                    >
                        {({ pressed }) => (
                            <Text style={[styles.link, pressed && styles.linkPressed]}>
                                {credit.url.replace(/^https:\/\/(www\.)?/, "")}
                            </Text>
                        )}
                    </Pressable>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 18,
    },
    credit: {
        gap: 4,
    },
    title: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    body: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
    },
    link: {
        color: colors.ember,
        fontSize: 13,
    },
    linkPressed: {
        color: colors.emberBright,
    },
});
