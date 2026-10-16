import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import DeathCard from "@/features/death/components/DeathCard";
import { usePlayerStore } from "@/features/player/playerStore";
import OutcomeButton from "@/features/run/components/OutcomeButton";
import type { GeoDeathCause } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** Why you died, for each way to die outside a fight. */
const DEATH_TEXT: Record<GeoDeathCause, string> = {
    "admin-kill": "Struck down by an admin.",
};

/**
 * Death outside a fight, e.g. the admin kill. A lost fight shows the same
 * card over the fight instead. The server has already taken the coins;
 * this only says so, and refreshes the purse.
 */
export default function DeathScreen() {
    const params = useLocalSearchParams<{ cause?: string; coinsLost?: string }>();
    const cause = params.cause && params.cause in DEATH_TEXT ? (params.cause as GeoDeathCause) : null;
    const coins = Number(params.coinsLost);
    const coinsLost = params.coinsLost !== undefined && Number.isFinite(coins) ? coins : null;

    useEffect(() => {
        void usePlayerStore.getState().refresh();
    }, []);

    return (
        <View style={styles.screen}>
            <DeathCard
                body={cause ? DEATH_TEXT[cause] : "You died."}
                coinsLost={coinsLost}
                actions={<OutcomeButton label="Leave" onPress={() => router.back()} primary />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.void,
    },
});
