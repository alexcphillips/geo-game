import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CoinCounter from "./CoinCounter";
// Shared with the top-right settings button, so both corners line up.
import { STATUS_BAR_CLEARANCE } from "@/theme/layout";

type PlayerStatusHudProps = {
    coins: number;
};

/**
 * Top-left player status: currently just coins.
 *
 * One component owns the whole corner so the safe-area maths and the stacking
 * order live in a single place rather than each readout positioning itself.
 *
 * `pointerEvents="none"` throughout: the entire screen is a rotation surface,
 * and a HUD that swallowed touches would create a dead zone exactly where the
 * player's thumb starts a drag.
 */
export default function PlayerStatusHud({ coins }: PlayerStatusHudProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                { top: insets.top + STATUS_BAR_CLEARANCE },
            ]}
            pointerEvents="none"
        >
            <CoinCounter coins={coins} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 16,
        alignItems: "flex-start",
    },
});
