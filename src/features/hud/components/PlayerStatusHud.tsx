import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HealthHud from "./HealthHud";
import QuestTracker from "@/features/quests/components/QuestTracker";
// Shared with the top-right settings button, so both corners line up.
import { STATUS_BAR_CLEARANCE } from "@/theme/layout";

type PlayerStatusHudProps = {
    /** The health bar was tapped: open the lunchbox. */
    onPressHealth: () => void;
    onOpenQuestLog: () => void;
};

/**
 * Top-left player status: health, then the quest tracker under it. Coins sit
 * bottom-left, above the bar (see the world screen).
 *
 * One component owns the whole corner so the safe-area maths and the stacking
 * order live in a single place rather than each readout positioning itself.
 *
 * `pointerEvents="box-none"`: the entire screen is a rotation surface, and a
 * HUD that swallowed touches would create a dead zone exactly where the
 * player's thumb starts a drag. Only the health bar (it opens the lunchbox)
 * and the quest tracker take taps.
 */
export default function PlayerStatusHud({ onPressHealth, onOpenQuestLog }: PlayerStatusHudProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                { top: insets.top + STATUS_BAR_CLEARANCE },
            ]}
            pointerEvents="box-none"
        >
            <HealthHud onPress={onPressHealth} />
            <QuestTracker onOpenLog={onOpenQuestLog} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 16,
        alignItems: "flex-start",
        gap: 6,
    },
});
