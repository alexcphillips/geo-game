import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import Panel from "@/components/Panel/Panel";
import { Body, Hint } from "@/components/Text/Text";
import type { GeoFarmView, GeoItemView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { cropIcon } from "../farmText";

/**
 * The Research Lab: mutations found so far with their recipes, the ones the
 * player could turn in now, and how many are still out there.
 */
export default function ResearchLabModal({
    farm,
    items,
    busy,
    onResearch,
    onClose,
}: {
    farm: GeoFarmView;
    items: Record<string, GeoItemView>;
    busy: boolean;
    onResearch: (mutationId: string) => void;
    onClose: () => void;
}) {
    const palette = useTheme();
    const styles = useStyles();
    const { found, total, ready } = farm.lab;
    return (
        <Modal title="Research Lab" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.lab}>
                <Hint>
                    Mutations sprout on empty tiles when the crops, weather or pests around them are just right. Bring the first of each here to record its
                    recipe. {found.length} of {total} found.
                </Hint>
                {ready.map((entry) => (
                    <Panel key={entry.mutationId} selected>
                        <Text style={styles.name}>{items[entry.itemId]?.name ?? "A mutation"}</Text>
                        <Hint>New to the Lab. Turn it in for {entry.coins} coins and {entry.xp} Farming XP, and its recipe goes in the journal.</Hint>
                        <Button label="Turn in" icon="microscope" variant="primary" busy={busy} onPress={() => onResearch(entry.mutationId)} />
                    </Panel>
                ))}
                {found.map((entry) => (
                    <Panel key={entry.mutationId} compact flat style={styles.entry}>
                        <Icon name={cropIcon(entry.icon)} size={30} color={palette.game.cropMutant} />
                        <View style={styles.text}>
                            <Text style={styles.name}>{entry.name}</Text>
                            <Body>{entry.recipe}.</Body>
                            <Hint>{entry.description}</Hint>
                        </View>
                    </Panel>
                ))}
                {Array.from({ length: total - found.length }, (_, i) => (
                    <Panel key={`unknown-${i}`} compact flat style={styles.entry}>
                        <Text style={styles.unknown}>?</Text>
                        <Hint>Not yet found.</Hint>
                    </Panel>
                ))}
            </ScrollView>
        </Modal>
    );
}

const useStyles = createStyles((p) => ({
    lab: {
        gap: 10,
        paddingBottom: 16,
    },
    entry: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    text: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    unknown: {
        width: 30,
        textAlign: "center",
        color: p.textMuted,
        fontSize: 22,
        fontFamily: FONTS.display,
    },
}));
