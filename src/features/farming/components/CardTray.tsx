import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { InventoryItem } from "@/features/items/inventoryItems";
import RunHand from "@/features/run/components/RunHand";
import { HOME_INDICATOR_CLEARANCE } from "@/theme/layout";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";

type CardTrayProps = {
    cards: InventoryItem[];
    /** Card ids played this cycle: ticked, and ready again next cycle. */
    played: Set<string>;
    playsLeft: number;
    /** "in 5h 12m", for when the plays are spent. */
    nextCycle: string;
    canPlay: boolean;
    onPlay: (card: InventoryItem) => void;
    onInspect: (card: InventoryItem) => void;
};

/**
 * The farming hand along the bottom. Every card plays once a cycle, up to
 * the cycle's plays; when they're spent the tray dims and says when the
 * hand is back.
 */
export default function CardTray({ cards, played, playsLeft, nextCycle, canPlay, onPlay, onInspect }: CardTrayProps) {
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const spent = playsLeft === 0;
    return (
        <View style={[styles.tray, { paddingBottom: insets.bottom + HOME_INDICATOR_CLEARANCE }]}>
            <Text style={styles.label}>{spent ? `Cards ready again ${nextCycle}` : `Cards · ${playsLeft} play${playsLeft === 1 ? "" : "s"} left this cycle`}</Text>
            <View style={spent && styles.spent}>
                <RunHand
                    cards={cards}
                    disabled={!canPlay || spent}
                    onPlay={canPlay && !spent ? onPlay : undefined}
                    onInspect={onInspect}
                    cornerMark={(card) => (played.has(card.id) ? <Text style={styles.played}>✓</Text> : null)}
                />
            </View>
        </View>
    );
}

const useStyles = createStyles((p) => ({
    // A tray the cards sit in: rounded and inked along its top, like a Run's.
    tray: {
        gap: 8,
        paddingTop: 10,
        paddingHorizontal: 12,
        borderTopWidth: 3,
        borderTopColor: p.outline,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: p.surface,
    },
    label: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 11,
        letterSpacing: 0.5,
        textAlign: "center",
    },
    spent: {
        opacity: 0.5,
    },
    played: {
        color: p.ember,
        fontSize: 10,
        fontFamily: FONTS.bodyHeavy,
    },
}));
