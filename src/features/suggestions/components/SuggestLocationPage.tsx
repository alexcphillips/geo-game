import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
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
import { colors } from "@/theme/colors";

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
                <Icon name="check-mark" size={40} color={colors.emberBright} />
                <Text style={styles.sentTitle}>Suggestion sent</Text>
                <Text style={styles.hint}>
                    Thanks — it will be checked against the map before it goes
                    into the world.
                </Text>
                <Pressable
                    onPress={() => setIsSent(false)}
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                >
                    <Text style={styles.secondaryButtonText}>Suggest another</Text>
                </Pressable>
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
            <Text style={styles.sectionTitle}>What should be here?</Text>
            <View style={styles.kinds}>
                {SUGGESTION_KINDS.map((info) => {
                    const isSelected = info.id === kind;
                    return (
                        <Pressable
                            key={info.id}
                            onPress={() => setKind(info.id)}
                            style={({ pressed }) => [
                                styles.kind,
                                isSelected && { borderColor: info.color },
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={info.label}
                        >
                            <Icon
                                name={info.icon}
                                size={22}
                                color={isSelected ? info.color : colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.kindLabel,
                                    isSelected && { color: colors.textPrimary },
                                ]}
                                numberOfLines={1}
                            >
                                {info.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={styles.sectionTitle}>Where?</Text>
            <View style={styles.card}>
                <Icon name="pin" size={22} color={colors.emberBright} />
                <View style={styles.cardText}>
                    <Text style={styles.cardLabel}>
                        {pin ? `Pin · ${distance} m from you` : "Your current location"}
                    </Text>
                    <Text style={styles.coords} selectable>
                        {target.latitude.toFixed(6)}, {target.longitude.toFixed(6)}
                    </Text>
                </View>
            </View>
            <View style={styles.row}>
                <Pressable
                    onPress={onDropPin}
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        styles.rowButton,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                >
                    <Text style={styles.secondaryButtonText}>
                        {pin ? "Move pin" : "Drop a pin"}
                    </Text>
                </Pressable>
                {pin && (
                    <Pressable
                        onPress={() => setPin(null)}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            styles.rowButton,
                            pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                    >
                        <Text style={styles.secondaryButtonText}>Use my location</Text>
                    </Pressable>
                )}
            </View>

            <Text style={styles.sectionTitle}>Anything to add?</Text>
            <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. old quarry behind the rec centre, public path along the fence"
                placeholderTextColor={colors.textSecondary}
                style={styles.note}
                multiline
                maxLength={GEO_SUGGESTION_NOTE_MAX}
                textAlignVertical="top"
            />

            <Pressable
                onPress={() => void send()}
                disabled={isSending}
                style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ busy: isSending }}
            >
                {isSending ? (
                    <ActivityIndicator color={colors.textOnEmber} />
                ) : (
                    <Icon name="share" size={18} color={colors.textOnEmber} />
                )}
                <Text style={styles.sendButtonText}>Send suggestion</Text>
            </Pressable>
            <Text style={styles.hint}>
                Only suggest places anyone can walk to — no private land.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 10,
        paddingBottom: 8,
    },
    sectionTitle: {
        marginTop: 6,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
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
        borderRadius: 10,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    kindLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardText: {
        flex: 1,
        gap: 2,
    },
    cardLabel: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    coords: {
        color: colors.textSecondary,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
    },
    row: {
        flexDirection: "row",
        gap: 8,
    },
    rowButton: {
        flex: 1,
    },
    secondaryButton: {
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    secondaryButtonText: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "600",
    },
    note: {
        minHeight: 84,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.textPrimary,
        fontSize: 14,
    },
    sendButton: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    sendButtonText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
    },
    sent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 12,
    },
    sentTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
    },
});
