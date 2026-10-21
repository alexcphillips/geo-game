import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import TextField from "@/components/TextField/TextField";
import { showToast } from "@/components/Toast/toastStore";
import { Hint, SectionTitle } from "@/components/Text/Text";
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
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { TIER_LABELS, WATER_LABELS } from "../fishingWaters";
import { confirmRemovePlace, placePath } from "../placeAdmin";
import { usePlaceDraft } from "../placeDraft";
import { PLACE_TYPES, kindToSkill, placeTitle } from "../places";
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
    const styles = useStyles();
    const palette = useTheme();
    const draft = usePlaceDraft();
    const refetchPlaces = usePlacesStore((state) => state.refetch);
    const [isSaving, setIsSaving] = useState(false);
    const isNew = draft.placeId === null;
    const name = draft.name.trim();
    const canSave = draft.pin !== null && !isSaving;

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
            const title = placeTitle(name, kindToSkill(draft.kind));
            showToast(isNew ? `${title} is on the map` : `${title} saved`, "success");
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
                <Hint>From a player&apos;s suggestion. Saving accepts it.</Hint>
            )}

            <SectionTitle>Kind</SectionTitle>
            <View style={styles.kinds}>
                {GEO_PLACE_KINDS.map((kind) => {
                    const info = PLACE_TYPES[kind];
                    const isSelected = kind === draft.kind;
                    return (
                        <Panel compact
                            key={kind}
                            onPress={() => draft.update({ kind })}
                            style={[styles.kind, isSelected && { borderColor: info.color }]}
                            accessibilityRole="radio"
                            accessibilityLabel={info.label}
                        >
                            <Icon name={info.icon} size={22} color={isSelected ? info.color : palette.textMuted} />
                            <Text style={[styles.kindLabel, isSelected && { color: palette.text }]} numberOfLines={1}>
                                {info.label}
                            </Text>
                        </Panel>
                    );
                })}
            </View>

            {draft.kind === "fishing" && (
                <>
                    <SectionTitle>Fishing tier</SectionTitle>
                    <ChoiceRow
                        options={GEO_FISHING_TIERS.map((tier) => ({ id: tier, label: TIER_LABELS[tier] }))}
                        value={draft.settings.fishing?.tier}
                        onChange={(tier) => draft.update({ settings: { fishing: { ...draft.settings.fishing, tier } } })}
                    />
                    <SectionTitle>Water</SectionTitle>
                    <ChoiceRow
                        options={GEO_FISHING_WATERS.map((water) => ({ id: water, label: WATER_LABELS[water] }))}
                        value={draft.settings.fishing?.water}
                        onChange={(water) => draft.update({ settings: { fishing: { ...draft.settings.fishing, water } } })}
                    />
                    <Hint>From the map: worked out from the water the place sits on, like any map spot.</Hint>
                </>
            )}

            <SectionTitle>Name (optional)</SectionTitle>
            <TextField
                value={draft.name}
                onChangeText={(text) => draft.update({ name: text })}
                placeholder="e.g. Millbrook Quarry"
                maxLength={GEO_PLACE_NAME_MAX}
            />

            <SectionTitle>Description</SectionTitle>
            <TextField
                value={draft.description}
                onChangeText={(text) => draft.update({ description: text })}
                placeholder="Optional. Shown when a player opens the place."
                multiline
                maxLength={GEO_PLACE_DESCRIPTION_MAX}
            />

            <SectionTitle>Where</SectionTitle>
            <Panel compact style={styles.card}>
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
            </Panel>
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
                {isSaving && <ActivityIndicator color={palette.onPrimary} />}
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
    const styles = useStyles();
    const all: { id: T | undefined; label: string }[] = [{ id: undefined, label: "From the map" }, ...options];
    return (
        <View style={styles.choices}>
            {all.map((option) => {
                const isSelected = option.id === value;
                return (
                    <Panel
                        key={option.id ?? "map"}
                        onPress={() => onChange(option.id)}
                        style={[styles.choice, isSelected && styles.choiceSelected]}
                        accessibilityRole="radio"
                    >
                        <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>{option.label}</Text>
                    </Panel>
                );
            })}
        </View>
    );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return <Button label={label} onPress={onPress} stretch />;
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
    choices: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    choice: {
        gap: 0,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    choiceSelected: {
        borderColor: p.ember,
    },
    choiceText: {
        color: p.textMuted,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    choiceTextSelected: {
        color: p.text,
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
    saveButton: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: p.ember,
    },
    saveDisabled: {
        opacity: 0.45,
    },
    saveText: {
        color: p.onPrimary,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
    },
    removeButton: {
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: p.game.blood,
    },
    removeText: {
        color: p.game.damage,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
}));
