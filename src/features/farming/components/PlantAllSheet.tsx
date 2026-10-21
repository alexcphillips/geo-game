import { useState } from "react";
import { View } from "react-native";
import Button from "@/components/Button/Button";
import { useCloseModal } from "@/components/Modal/Modal";
import Sheet from "@/components/Sheet/Sheet";
import { Body, Hint } from "@/components/Text/Text";
import type { GeoCropView, GeoFarmAction, GeoFarmView } from "@/lib/geo/contracts";
import { createStyles } from "@/theme/theme";
import { isPlantable } from "../farmView";
import SeedPicker, { heldSeeds } from "./SeedPicker";

type PlantAllSheetProps = {
    farm: GeoFarmView;
    crops: Record<string, GeoCropView>;
    held: Record<string, number>;
    act: (action: GeoFarmAction) => Promise<void>;
    onClose: () => void;
};

/**
 * Plant every empty tile in one go: pick the seed for the open tiles;
 * planned tiles take their own crop while those seeds last.
 */
export default function PlantAllSheet(props: PlantAllSheetProps) {
    return (
        <Sheet title="Plant empty tiles" size="medium" onClose={props.onClose}>
            <PlantAll {...props} />
        </Sheet>
    );
}

function PlantAll({ farm, crops, held, act }: PlantAllSheetProps) {
    const styles = useStyles();
    const close = useCloseModal();
    const seeds = heldSeeds(crops, held);
    const [seedId, setSeedId] = useState<string | null>(seeds[0]?.id ?? null);
    const seed = seeds.find((crop) => crop.id === seedId);
    const empty = farm.tiles.filter(isPlantable);
    // As the server does it: planned tiles take their own seed while it lasts, then the picked seed fills the rest.
    const left: Record<string, number> = { ...held };
    let planned = 0;
    for (const tile of empty) {
        const seedItemId = tile.blueprint ? crops[tile.blueprint]?.seedItemId : null;
        if (!seedItemId || (left[seedItemId] ?? 0) < 1) continue;
        left[seedItemId] = left[seedItemId]! - 1;
        planned++;
    }
    const open = empty.length - planned;
    const filled = planned + Math.min(open, seed ? (left[seed.seedItemId!] ?? 0) : 0);

    return (
        <View style={styles.body}>
            <Body>
                {empty.length} empty tile{empty.length === 1 ? "" : "s"}
                {planned > 0 ? `, ${planned} planned: those get their own seed.` : "."}
            </Body>
            {open > 0 && <SeedPicker seeds={seeds} held={held} selected={seedId} onSelect={setSeedId} />}
            <Button
                label={`Plant ${filled} tile${filled === 1 ? "" : "s"}`}
                icon="seedling"
                variant="primary"
                size="large"
                stretch
                disabled={filled === 0}
                onPress={() => {
                    close();
                    void act({ type: "plant-all", itemId: open > 0 ? (seed?.seedItemId ?? null) : null });
                }}
            />
            {filled < empty.length && filled > 0 && <Hint center>Not enough seeds for every tile.</Hint>}
        </View>
    );
}

const useStyles = createStyles(() => ({
    body: {
        gap: 14,
        paddingBottom: 8,
    },
}));
