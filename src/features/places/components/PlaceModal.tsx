import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { SectionTitle } from "@/components/Text/Text";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { rarityInfo } from "@/features/items/rarity";
import { useActivityAlert } from "@/features/notifications/useActivityAlert";
import {
    ACTIVITY_LEVEL_COUNT,
    fishingActivity,
    formatActivityChange,
    msUntilActivityChange,
} from "../fishingActivity";
import { fishingTier } from "../fishingWaters";
import { placeTitle, placeTypeInfo, type MapPlace } from "../places";

type PlaceModalProps = {
    place: MapPlace;
    /** Metres from the player, shown under the type when in reach. */
    distance: number;
    /** Close enough to start a Run here (always, with the free camera). */
    inReach: boolean;
    /** The Start button's words. Defaults to "Start". */
    startLabel?: string;
    /**
     * False lets Start work from any distance, e.g. a POI's dungeon menu,
     * which can be browsed from afar but only joined in reach.
     */
    startNeedsReach?: boolean;
    onStart: () => void;
    onClose: () => void;
    /** Game admins, hand-made places only: open it in the place editor. */
    onEdit?: () => void;
    /** Game admins, hand-made places only: remove it (asks first). */
    onRemove?: () => void;
};

/**
 * What a tapped landmark or skill hub is: its name, if the map has one, what
 * kind of place it is, and a Start button for its Run.
 *
 * Opens for any marker, near or far — like a PokéStop, you can always look —
 * but Start only works in reach. `inReach` is live, so walking closer with
 * the modal open enables it. Tile and hand-made places open the same way;
 * a hand-made one also shows its description.
 */
export default function PlaceModal({
    place,
    distance,
    inReach,
    startLabel = "Start",
    startNeedsReach = true,
    onStart,
    onClose,
    onEdit,
    onRemove,
}: PlaceModalProps) {
    const styles = useStyles();
    const type = placeTypeInfo(place.skill);
    const canStart = inReach || !startNeedsReach;

    return (
        <Modal title="Location" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <View style={styles.body}>
                <View style={[styles.badge, { borderColor: type.color }]}>
                    <Icon name={type.icon} size={30} color={type.color} />
                </View>
                <Text style={styles.name}>{placeTitle(place.name, place.skill)}</Text>
                <Text style={[styles.type, { color: type.color }]}>{type.label}</Text>
                {inReach ? (
                    <Text style={styles.distance}>{Math.round(distance)} m away</Text>
                ) : (
                    <Text style={styles.tooFar}>Too far away</Text>
                )}

                {place.handMade?.description ? (
                    <Text style={styles.description}>{place.handMade.description}</Text>
                ) : null}

                {place.handMade && (onEdit || onRemove) && (
                    <View style={styles.adminRow}>
                        {onEdit && <AdminButton label="Edit" onPress={onEdit} />}
                        {onRemove && <AdminButton label="Remove" danger onPress={onRemove} />}
                    </View>
                )}

                {place.skill === "fishing" && <FishingWaters place={place} />}

                <Pressable
                    onPress={onStart}
                    disabled={!canStart}
                    style={({ pressed }) => [
                        styles.start,
                        !canStart && styles.startDisabled,
                        pressed && styles.startPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={canStart ? startLabel : `${startLabel}, too far away`}
                    accessibilityState={{ disabled: !canStart }}
                >
                    <Text style={[styles.startText, !canStart && styles.startTextDisabled]}>
                        {startLabel}
                    </Text>
                </Pressable>
            </View>
        </Modal>
    );
}

function AdminButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
    const styles = useStyles();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.adminButton, danger && styles.adminButtonDanger, pressed && styles.startPressed]}
            accessibilityRole="button"
        >
            <Text style={[styles.adminButtonText, danger && styles.adminButtonTextDanger]}>{label}</Text>
        </Pressable>
    );
}

/**
 * The water: what kind it is, how lively the fish are right now (placeholder
 * data, display only), and the rarities boosted here.
 */
function FishingWaters({ place }: { place: MapPlace }) {
    const styles = useStyles();
    const palette = useTheme();
    const tier = fishingTier(place.water ?? null, place.handMade?.settings.fishing);
    // Read once on opening, so the meter can't change while you look.
    const [now] = useState(() => Date.now());
    const activity = fishingActivity(place.id, now);
    const activityAlert = useActivityAlert(place.id, place.name || tier.label, now);

    return (
        <Panel compact style={styles.section}>
            <SectionTitle>Waters</SectionTitle>
            <Text style={styles.sectionHeading}>{tier.label}</Text>
            <Text style={styles.sectionBody}>{tier.blurb}</Text>
            <View
                style={styles.activity}
                accessible
                accessibilityLabel={`Activity: ${activity.label}`}
            >
                <Text style={styles.activityLabel}>Activity</Text>
                <View style={styles.activityMeter}>
                    {Array.from({ length: ACTIVITY_LEVEL_COUNT }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.activitySegment,
                                index < activity.level && { backgroundColor: activity.color },
                            ]}
                        />
                    ))}
                </View>
                <Text style={[styles.activityValue, { color: activity.color }]}>
                    {activity.label}
                </Text>
            </View>
            <View style={styles.activityFooter}>
                <Pressable
                    onPress={activityAlert.toggle}
                    disabled={activityAlert.isBusy || activityAlert.isCategoryOff}
                    style={({ pressed }) => [
                        styles.bell,
                        activityAlert.isOn && styles.bellOn,
                        activityAlert.isCategoryOff && styles.bellDisabled,
                        pressed && styles.startPressed,
                    ]}
                    accessibilityRole="switch"
                    accessibilityState={{
                        checked: activityAlert.isOn,
                        disabled: activityAlert.isBusy || activityAlert.isCategoryOff,
                    }}
                    accessibilityLabel="Notify me when activity changes"
                    hitSlop={6}
                >
                    <Icon
                        name="ringing-bell"
                        size={14}
                        color={activityAlert.isOn ? palette.ember : palette.textMuted}
                    />
                    <Text style={[styles.bellText, activityAlert.isOn && styles.bellTextOn]}>
                        {activityAlert.isOn ? "Notifying" : "Notify me"}
                    </Text>
                </Pressable>
                {/* Placeholder: worked out once on opening and doesn't tick. */}
                <Text style={styles.activityChange}>
                    {formatActivityChange(msUntilActivityChange(now))}
                </Text>
            </View>
            {activityAlert.isCategoryOff ? (
                <Text style={styles.bellNote}>
                    Fishing activity alerts are off in Settings → Notifications.
                </Text>
            ) : activityAlert.isBlocked ? (
                <Text style={styles.bellBlocked}>
                    Notifications are off for geo-game. Turn them on in your phone&apos;s
                    settings.
                </Text>
            ) : null}
            <Text style={styles.catchesLabel}>Boosted catches</Text>
            <View
                style={styles.rarities}
                accessible
                accessibilityLabel={`Boosted catches: up to ${rarityInfo(tier.rarities[tier.rarities.length - 1]!).label}`}
            >
                {tier.rarities.map((rarity) => {
                    const info = rarityInfo(rarity);
                    return (
                        <View key={rarity} style={[styles.rarityChip, { borderColor: info.color }]}>
                            <Text style={[styles.rarityText, { color: info.color }]}>
                                {info.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    // Full height: the space between the type and Start is where a place's
    // details (what can be caught or found here) will go.
    body: {
        flex: 1,
        alignItems: "center",
        gap: 6,
        paddingTop: 12,
    },
    badge: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        borderRadius: 30,
        borderWidth: 2,
        backgroundColor: p.surfaceAlt,
    },
    name: {
        color: p.text,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
        textAlign: "center",
    },
    type: {
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    distance: {
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    description: {
        marginTop: 8,
        color: p.text,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    adminRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 10,
    },
    adminButton: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: p.ember,
    },
    adminButtonDanger: {
        borderColor: p.game.blood,
    },
    adminButtonText: {
        color: p.ember,
        fontSize: 13,
        fontFamily: FONTS.bodyBold,
    },
    adminButtonTextDanger: {
        color: p.game.damage,
    },
    section: {
        alignSelf: "stretch",
        gap: 6,
        marginTop: 18,
        padding: 14,
    },
    sectionHeading: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
    },
    sectionBody: {
        color: p.textMuted,
        fontSize: 13,
        lineHeight: 18,
    },
    activity: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    activityLabel: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    activityMeter: {
        flex: 1,
        flexDirection: "row",
        gap: 4,
    },
    activitySegment: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: p.background,
    },
    // Fixed width so the meter is the same length whatever the word.
    activityValue: {
        width: 64,
        textAlign: "right",
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
    },
    activityFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    bell: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.outline,
    },
    bellOn: {
        borderColor: p.ember,
        backgroundColor: p.track,
    },
    bellText: {
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyBold,
    },
    bellTextOn: {
        color: p.ember,
    },
    bellDisabled: {
        opacity: 0.45,
    },
    bellNote: {
        color: p.textMuted,
        fontSize: 11,
    },
    bellBlocked: {
        color: p.game.damage,
        fontSize: 11,
    },
    activityChange: {
        color: p.textMuted,
        fontSize: 11,
        fontVariant: ["tabular-nums"],
    },
    catchesLabel: {
        marginTop: 6,
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    rarities: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    rarityChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
    },
    rarityText: {
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
    },
    tooFar: {
        color: p.game.damage,
        fontSize: 12,
        fontFamily: FONTS.bodyBold,
    },
    // Pinned to the bottom of the panel, just above the close button.
    start: {
        alignSelf: "stretch",
        alignItems: "center",
        marginTop: "auto",
        paddingVertical: 13,
        borderRadius: 999,
        backgroundColor: p.ember,
        borderWidth: 1.5,
        borderColor: p.ember,
    },
    startDisabled: {
        backgroundColor: "transparent",
        borderColor: p.outline,
    },
    startPressed: {
        transform: [{ scale: 0.97 }],
    },
    startText: {
        color: p.onPrimary,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        letterSpacing: 0.5,
    },
    startTextDisabled: {
        color: p.textMuted,
    },
}));
