import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { showToast } from "@/components/Toast/toastStore";
import { distanceMetres, type Coordinates } from "@/features/location/distance";
import SettingsToggle from "@/features/settings/components/SettingsToggle";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    GEO_FISHING_TIERS,
    GEO_FISHING_WATERS,
    GEO_PLACE_DESCRIPTION_MAX,
    GEO_PLACE_KINDS,
    GEO_PLACE_NAME_MAX,
    type GeoAdminCreatePlaceRequest,
    type GeoAdminUpdatePlaceRequest,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { TIER_LABELS, WATER_LABELS } from "../fishingWaters";
import { confirmRemovePlace, placePath } from "../placeAdmin";
import { usePlaceDraft } from "../placeDraft";
import { PLACE_TYPES } from "../places";
import { usePlacesStore } from "../placesStore";

type PlaceEditorPageProps = {
    position: Coordinates;
    /** Leaves the modal so the admin can tap the map to place the pin. */
    onDropPin: () => void;
    /** Saved or removed: back to where the editor was opened from. */
    onDone: () => void;
};

/**
 * Game admins: make a hand-made place, or edit, move, hide or remove one.
 * The draft lives in a store, so dropping a pin doesn't lose it.
 */
export default function PlaceEditorPage({ position, onDropPin, onDone }: PlaceEditorPageProps) {
    const draft = usePlaceDraft();
    const refetchPlaces = usePlacesStore((state) => state.refetch);
    const [isSaving, setIsSaving] = useState(false);
    const isNew = draft.placeId === null;
    const name = draft.name.trim();
    const canSave = name.length > 0 && draft.pin !== null && !isSaving;

    const save = async () => {
        if (!canSave || !draft.pin) return;
        setIsSaving(true);
        try {
            const fields = {
                kind: draft.kind,
                name,
                description: draft.description.trim(),
                latitude: draft.pin.latitude,
                longitude: draft.pin.longitude,
                // Only the kind's own section counts; the server drops the rest too.
                settings: draft.kind === "fishing" ? { fishing: draft.settings.fishing ?? {} } : {},
            };
            if (draft.placeId) {
                const request: GeoAdminUpdatePlaceRequest = { ...fields, active: draft.active };
                await api.patch(placePath(draft.placeId), request);
            } else {
                const request: GeoAdminCreatePlaceRequest = { ...fields, suggestionId: draft.suggestionId ?? undefined };
                await api.post(GEO_API_PATHS.admin.places, request);
            }
            refetchPlaces();
            showToast(isNew ? `${name} is on the map` : `${name} saved`, "success");
            onDone();
        } catch (error) {
            showToast(toErrorMessage(error), "error");
        } finally {
            setIsSaving(false);
        }
    };

    const pinDistance = draft.pin ? Math.round(distanceMetres(position, draft.pin)) : null;

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
        >
            {draft.suggestionId && (
                <Text style={styles.hint}>From a player&apos;s suggestion. Saving accepts it.</Text>
            )}

            <Text style={styles.sectionTitle}>Kind</Text>
            <View style={styles.kinds}>
                {GEO_PLACE_KINDS.map((kind) => {
                    const info = PLACE_TYPES[kind];
                    const isSelected = kind === draft.kind;
                    return (
                        <Pressable
                            key={kind}
                            onPress={() => draft.update({ kind })}
                            style={({ pressed }) => [
                                styles.kind,
                                isSelected && { borderColor: info.color },
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={info.label}
                        >
                            <Icon name={info.icon} size={22} color={isSelected ? info.color : colors.textSecondary} />
                            <Text style={[styles.kindLabel, isSelected && { color: colors.textPrimary }]} numberOfLines={1}>
                                {info.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {draft.kind === "fishing" && (
                <>
                    <Text style={styles.sectionTitle}>Fishing tier</Text>
                    <ChoiceRow
                        options={GEO_FISHING_TIERS.map((tier) => ({ id: tier, label: TIER_LABELS[tier] }))}
                        value={draft.settings.fishing?.tier}
                        onChange={(tier) => draft.update({ settings: { fishing: { ...draft.settings.fishing, tier } } })}
                    />
                    <Text style={styles.sectionTitle}>Water</Text>
                    <ChoiceRow
                        options={GEO_FISHING_WATERS.map((water) => ({ id: water, label: WATER_LABELS[water] }))}
                        value={draft.settings.fishing?.water}
                        onChange={(water) => draft.update({ settings: { fishing: { ...draft.settings.fishing, water } } })}
                    />
                    <Text style={styles.hint}>From the map: worked out from the water the place sits on, like any map spot.</Text>
                </>
            )}

            <Text style={styles.sectionTitle}>Name</Text>
            <TextInput
                value={draft.name}
                onChangeText={(text) => draft.update({ name: text })}
                placeholder="e.g. Millbrook Quarry"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                maxLength={GEO_PLACE_NAME_MAX}
            />

            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
                value={draft.description}
                onChangeText={(text) => draft.update({ description: text })}
                placeholder="Optional. Shown when a player opens the place."
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.multiline]}
                multiline
                maxLength={GEO_PLACE_DESCRIPTION_MAX}
                textAlignVertical="top"
            />

            <Text style={styles.sectionTitle}>Where</Text>
            <View style={styles.card}>
                <Icon name="pin" size={22} color={PLACE_TYPES[draft.kind].color} />
                <View style={styles.cardText}>
                    <Text style={styles.cardLabel}>
                        {pinDistance === null ? "Not placed yet" : `${pinDistance} m from you`}
                    </Text>
                    {draft.pin && (
                        <Text style={styles.coords} selectable>
                            {draft.pin.latitude.toFixed(6)}, {draft.pin.longitude.toFixed(6)}
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.row}>
                <SecondaryButton label={draft.pin ? "Move pin" : "Drop a pin"} onPress={onDropPin} />
                <SecondaryButton
                    label="My position"
                    onPress={() => draft.update({ pin: { latitude: position.latitude, longitude: position.longitude } })}
                />
            </View>

            {!isNew && (
                <SettingsToggle
                    label="Active"
                    hint="Inactive places are hidden from players but kept here."
                    value={draft.active}
                    onToggle={() => draft.update({ active: !draft.active })}
                />
            )}

            <Pressable
                onPress={() => void save()}
                disabled={!canSave}
                style={({ pressed }) => [styles.saveButton, !canSave && styles.saveDisabled, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave, busy: isSaving }}
            >
                {isSaving && <ActivityIndicator color={colors.textOnEmber} />}
                <Text style={styles.saveText}>{isNew ? "Create place" : "Save"}</Text>
            </Pressable>

            {draft.placeId && (
                <Pressable
                    onPress={() => confirmRemovePlace({ id: draft.placeId!, name: draft.name || "this place" }, onDone)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Text style={styles.removeText}>Remove for good</Text>
                </Pressable>
            )}
        </ScrollView>
    );
}

/** One pick from a few, with "From the map" (undefined) first. */
function ChoiceRow<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { id: T; label: string }[];
    value: T | undefined;
    onChange: (value: T | undefined) => void;
}) {
    const all: { id: T | undefined; label: string }[] = [{ id: undefined, label: "From the map" }, ...options];
    return (
        <View style={styles.choices}>
            {all.map((option) => {
                const isSelected = option.id === value;
                return (
                    <Pressable
                        key={option.id ?? "map"}
                        onPress={() => onChange(option.id)}
                        style={({ pressed }) => [styles.choice, isSelected && styles.choiceSelected, pressed && styles.pressed]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                    >
                        <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            <Text style={styles.secondaryButtonText}>{label}</Text>
        </Pressable>
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
    choices: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    choice: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    choiceSelected: {
        borderColor: colors.ember,
    },
    choiceText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
    choiceTextSelected: {
        color: colors.textPrimary,
    },
    input: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.textPrimary,
        fontSize: 14,
    },
    multiline: {
        minHeight: 84,
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
    secondaryButton: {
        flex: 1,
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
    saveButton: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: colors.ember,
    },
    saveDisabled: {
        opacity: 0.45,
    },
    saveText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    removeButton: {
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.blood,
    },
    removeText: {
        color: colors.damage,
        fontSize: 14,
        fontWeight: "600",
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
});
