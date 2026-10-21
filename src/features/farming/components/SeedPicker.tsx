import { Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Panel from "@/components/Panel/Panel";
import { Hint } from "@/components/Text/Text";
import type { GeoCropView } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
import { cropIcon } from "../farmText";

/** The crops whose seeds the player holds, for planting. */
export function heldSeeds(crops: Record<string, GeoCropView>, held: Record<string, number>): GeoCropView[] {
    return Object.values(crops).filter((crop) => crop.seedItemId && (held[crop.seedItemId] ?? 0) > 0);
}

/** Seeds held, as big tiles with their counts; one is picked. */
export default function SeedPicker({
    seeds,
    held,
    selected,
    onSelect,
}: {
    seeds: GeoCropView[];
    held: Record<string, number>;
    selected: string | null;
    onSelect: (cropId: string) => void;
}) {
    const styles = useStyles();
    if (seeds.length === 0) return <Hint>No seeds. The Farmer sells them.</Hint>;
    return (
        <View style={styles.seeds}>
            <View style={styles.grid}>
                {seeds.map((crop) => (
                    <Panel
                        key={crop.id}
                        compact
                        selected={crop.id === selected}
                        onPress={() => onSelect(crop.id)}
                        style={styles.seed}
                        accessibilityLabel={`${crop.name}, ${held[crop.seedItemId!]} seeds`}
                    >
                        <Icon name={cropIcon(crop.icon)} size={30} color={colors.cropLeaf} />
                        <Text style={styles.name} numberOfLines={1}>
                            {crop.name}
                        </Text>
                        <Text style={styles.count}>×{held[crop.seedItemId!]}</Text>
                    </Panel>
                ))}
            </View>
            <Hint>More seeds at the Farmer.</Hint>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    seeds: {
        gap: 8,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    seed: {
        width: 92,
        alignItems: "center",
        gap: 2,
    },
    name: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 12,
    },
    count: {
        color: p.textMuted,
        fontFamily: FONTS.bodyBold,
        fontSize: 11,
    },
}));
