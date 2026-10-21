import { useState } from "react";
import { Text, View } from "react-native";
import Button from "@/components/Button/Button";
import { Hint } from "@/components/Text/Text";
import { useCampStatus } from "@/features/camp/camp";
import { playerActions } from "@/features/player/playerStore";
import { useHealth, useInventory } from "@/features/player/usePlayer";
import { createStyles } from "@/theme/theme";
import { PACKS, usePack, type PackKind } from "../packs";

type PackFoodActionProps = {
    /** The food's (or bait's) item id. */
    itemId: string;
    /** Which slots it packs into. */
    kind?: PackKind;
};

/**
 * Packing on a food's (or bait's) detail page: one button that fills the
 * slot with as much as it holds (the pack's stack size) or all you have,
 * whichever is less.
 * There's no count to pick: how much to eat is decided in the Run.
 *
 * A food goes in the slot that already holds it (so Pack tops it up), else
 * the first empty slot. With every unlocked slot holding something else, it
 * says so instead. Away from camp, lunchbox and bait packing is off (the
 * server refuses it); Unpack still works. Packed food can be eaten here,
 * between fights, anywhere: only its effect on health counts. Not refused at
 * full health, since some foods hurt.
 */
export default function PackFoodAction({ itemId, kind = "lunchbox" }: PackFoodActionProps) {
    const styles = useStyles();
    const { title, stackSize, pack, unpack, needsCamp } = PACKS[kind];
    const { canRestock } = useCampStatus();
    const isAway = needsCamp && !canRestock;
    const health = useHealth();
    const box = usePack(kind);
    const inventory = useInventory();
    const [isSending, setIsSending] = useState(false);
    const packed = box.contents.find((entry) => entry.itemId === itemId);
    const owned = inventory
        .filter((item) => item.itemId === itemId)
        .reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    const fill = Math.min(stackSize, owned + (packed?.quantity ?? 0));
    const freeSlot = Array.from({ length: box.slots }, (_, slot) => slot).find(
        (slot) => !box.contents.some((entry) => entry.slot === slot),
    );
    const slot = packed?.slot ?? freeSlot;

    const send = async (action: () => Promise<boolean>) => {
        setIsSending(true);
        await action();
        setIsSending(false);
    };

    if (slot === undefined) {
        return <Hint>Every {title.toLowerCase()} slot is full. Unpack one to make room.</Hint>;
    }

    // Nothing more to add: the slot is full, or holds all you have.
    const isFull = packed !== undefined && packed.quantity >= fill;
    const label = !packed ? `Pack ${fill}` : isFull ? "Packed" : `Top up to ${fill}`;
    const isPackDisabled = isSending || isFull || isAway;

    return (
        <View style={styles.box}>
            <Text style={styles.label}>
                {packed
                    ? `Slot ${slot + 1} · ${packed.quantity}/${stackSize}`
                    : `Goes in slot ${slot + 1} · up to ${stackSize}`}
            </Text>
            <Button label={isAway && !isFull ? "Pack at camp" : label} variant="primary" onPress={() => void send(() => pack(slot, itemId, fill))} disabled={isPackDisabled} stretch />
            {packed && kind === "lunchbox" && (
                <>
                    <Text style={styles.label}>
                        Health {health.current}/{health.max} · eating here only touches health
                    </Text>
                    <Button label="Eat one" variant="primary" icon="heart-plus" onPress={() => void send(() => playerActions.eatLunchbox(slot))} busy={isSending} stretch />
                </>
            )}
            {packed && (
                <Button label="Unpack" variant="quiet" onPress={() => void send(() => unpack(slot))} disabled={isSending} stretch />
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    box: {
        gap: 10,
    },
    label: {
        textAlign: "center",
        color: p.textMuted,
        fontSize: 12,
    },
}));
