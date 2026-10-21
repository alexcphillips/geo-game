import { useState } from "react";
import {
    ScrollView,
    Text,
    View,
} from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { Hint, SectionTitle } from "@/components/Text/Text";
import type { PlayerPosition } from "@/features/location/hooks/usePlayerLocation";
import { distanceMetres } from "@/features/location/distance";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    GEO_SUGGESTION_NOTE_MAX,
    type GeoSuggestionRequest,
} from "@/lib/geo/contracts";
import { useSuggestionDraft } from "../suggestionDraft";
import { SUGGESTION_KINDS } from "../suggestionKinds";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

type SuggestLocationPageProps = {
    position: PlayerPosition;
    /** Leaves the modal so the player can tap the map to place the pin. */
    onDropPin: () => void;
};

/**
 * Suggest that a real place should be a skill hub or point of interest.
 *
 * Sent to the server with where the player stands and their GPS accuracy, so
 * a game admin reviewing it (Admin → Suggestions) can tell whether they were
 * really there. A failed send keeps the draft.
 */
export default function SuggestLocationPage({
    position,
    onDropPin,
}: SuggestLocationPageProps) {
    const styles = useStyles();
    const palette = useTheme();
    const { kind, note, pin, setKind, setNote, setPin, reset } =
        useSuggestionDraft();
    const [isSent, setIsSent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const target = pin ?? position;
    const distance = pin ? Math.round(distanceMetres(position, pin)) : 0;

    const send = async () => {
        if (isSending) return;
        setIsSending(true);
        try {
            const request: GeoSuggestionRequest = {
                kind,
                latitude: target.latitude,
                longitude: target.longitude,
                note: note.trim(),
                player: {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                },
            };
            await api.post(GEO_API_PATHS.suggestions, request);
            reset();
            setIsSent(true);
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsSending(false);
        }
    };

    if (isSent) {
        return (
            <View style={styles.sent}>
                <Icon name="check-mark" size={40} color={palette.ember} />
                <Text style={styles.sentTitle}>Suggestion sent</Text>
                <Hint>
                    Thanks — it will be checked against the map before it goes
                    into the world.
                </Hint>
                <Button label="Suggest another" onPress={() => setIsSent(false)} stretch />
            </View>
        );
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            // iOS: keeps the note field above the keyboard.
            automaticallyAdjustKeyboardInsets
        >
            <SectionTitle>What should be here?</SectionTitle>
            <View style={styles.kinds}>
                {SUGGESTION_KINDS.map((info) => {
                    const isSelected = info.id === kind;
                    return (
                        <Panel compact
                            key={info.id}
                            onPress={() => setKind(info.id)}
                            style={[styles.kind, isSelected && { borderColor: info.color }]}
                            accessibilityRole="radio"
                            accessibilityLabel={info.label}
                        >
                            <Icon
                                name={info.icon}
                                size={22}
                                color={isSelected ? info.color : palette.textMuted}
                            />
                            <Text
                                style={[
                                    styles.kindLabel,
                                    isSelected && { color: palette.text },
                                ]}
                                numberOfLines={1}
                            >
                                {info.label}
                            </Text>
                        </Panel>
                    );
                })}
            </View>

            <SectionTitle>Where?</SectionTitle>
            <Panel compact style={styles.card}>
                <Icon name="pin" size={22} color={palette.ember} />
                <View style={styles.cardText}>
                    <Text style={styles.cardLabel}>
                        {pin ? `Pin · ${distance} m from you` : "Your current location"}
                    </Text>
                    <Text style={styles.coords} selectable>
                        {target.latitude.toFixed(6)}, {target.longitude.toFixed(6)}
                    </Text>
                </View>
            </Panel>
            <View style={styles.row}>
                <Button label={pin ? "Move pin" : "Drop a pin"} icon="pin" onPress={onDropPin} stretch />
                {pin && (
                    <Button label="Use my location" onPress={() => setPin(null)} stretch />
                )}
            </View>

            <SectionTitle>Anything to add?</SectionTitle>
            <TextField
                value={note}
                onChangeText={setNote}
                placeholder="e.g. old quarry behind the rec centre, public path along the fence"
                multiline
                maxLength={GEO_SUGGESTION_NOTE_MAX}
            />

            <Button label="Send suggestion" variant="primary" size="large" icon="share" onPress={() => void send()} busy={isSending} stretch />
            <Hint>
                Only suggest places anyone can walk to — no private land.
            </Hint>
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    page: {
        gap: 10,
        paddingBottom: 8,
    },
    kinds: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    kind: {
        // Three per row on a phone; wraps to two on very narrow screens.
        flexBasis: "30%",
        flexGrow: 1,
        alignItems: "center",
        gap: 6,
        paddingVertical: 12,
    },
    kindLabel: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    cardText: {
        flex: 1,
        gap: 2,
    },
    cardLabel: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    coords: {
        color: p.textMuted,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
    },
    row: {
        flexDirection: "row",
        gap: 8,
    },
    sent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 12,
    },
    sentTitle: {
        color: p.text,
        fontSize: 18,
        fontFamily: FONTS.bodyHeavy,
    },
}));
