import { Chip, ChipRow } from "@/components/Chips/Chips";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import type { GeoCropView } from "@/lib/geo/contracts";
import { createStyles } from "@/theme/theme";

/** Choose the ghost crop for a tile, or clear it. */
export default function PlanModal({
    crops,
    current,
    onPick,
    onClose,
}: {
    crops: GeoCropView[];
    current: string | null;
    onPick: (cropId: string | null) => void;
    onClose: () => void;
}) {
    const styles = useStyles();
    return (
        <Modal title="Plan this tile" size="medium" onClose={onClose}>
            <Hint style={styles.hint}>A faded ghost of the crop, so you remember the layout when you&apos;re back.</Hint>
            <ChipRow radio>
                {crops.map((crop) => (
                    <Chip key={crop.id} label={crop.name} selected={current === crop.id} onPress={() => onPick(crop.id)} />
                ))}
                <Chip label="No plan" selected={current === null} onPress={() => onPick(null)} />
            </ChipRow>
        </Modal>
    );
}

const useStyles = createStyles(() => ({
    hint: {
        marginBottom: 12,
    },
}));
