import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import Panel from "@/components/Panel/Panel";
import Sheet from "@/components/Sheet/Sheet";
import { Body, Hint } from "@/components/Text/Text";
import type { GeoFarmAction, GeoFarmView, GeoItemView } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/** An event's icon if this build has it; a scroll otherwise. */
function eventIcon(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "scroll-unfurled";
}

/** One small pill per thing going on: blessings and curses, this week's event, this cycle's and the next's. */
export function eventPills(farm: GeoFarmView): { key: string; label: string; icon: GameIconName }[] {
    return [
        ...farm.blessings.map((blessing) => ({ key: `b-${blessing.id}`, label: `${blessing.name} · ${blessing.turnsLeft}`, icon: "stone-tablet" as GameIconName })),
        ...(farm.global ? [{ key: "global", label: farm.global.event.name, icon: eventIcon(farm.global.event.icon) }] : []),
        ...(farm.events.active ? [{ key: "active", label: farm.events.active.name, icon: eventIcon(farm.events.active.icon) }] : []),
        ...(farm.events.next ? [{ key: "next", label: `Next: ${farm.events.next.name}`, icon: eventIcon(farm.events.next.icon) }] : []),
    ];
}

/** The pills, in a row that scrolls sideways when there are many. Any opens the events sheet. */
export default function EventPills({ farm, onOpen }: { farm: GeoFarmView; onOpen: () => void }) {
    const styles = useStyles();
    const pills = eventPills(farm);
    if (pills.length === 0) return null;
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {pills.map((pill) => (
                <Button key={pill.key} label={pill.label} icon={pill.icon} size="small" onPress={onOpen} />
            ))}
        </ScrollView>
    );
}

/**
 * Every event in full: what it does and how long it lasts. A Travelling
 * Merchant's offers are bought here, at a farming place.
 */
export function EventSheet({
    farm,
    items,
    canBuy,
    act,
    onClose,
}: {
    farm: GeoFarmView;
    items: Record<string, GeoItemView>;
    canBuy: boolean;
    act: (action: GeoFarmAction) => Promise<void>;
    onClose: () => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    const { active, next } = farm.events;
    const global = farm.global;
    const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
    return (
        <Sheet title="On the farm" size="large" onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                {farm.blessings.map((blessing) => (
                    <Entry
                        key={blessing.id}
                        icon="stone-tablet"
                        color={blessing.curse ? palette.danger : palette.game.cropMutant}
                        name={blessing.name}
                        when={`${blessing.curse ? "Curse" : "Blessing"} · ${blessing.turnsLeft} cycle${blessing.turnsLeft === 1 ? "" : "s"} left`}
                        description={blessing.description}
                    />
                ))}
                {global && (
                    <Entry
                        icon={eventIcon(global.event.icon)}
                        color={global.active ? palette.primary : palette.textMuted}
                        name={global.event.name}
                        when={global.active ? `Everywhere, until ${when(global.endsAt)}` : `Everywhere, from ${when(global.startsAt)}`}
                        description={global.event.description}
                    />
                )}
                {active && (
                    <Entry icon={eventIcon(active.icon)} color={palette.reward} name={active.name} when="This cycle" description={active.description}>
                        {active.offers.map((offer, i) => (
                            <Button
                                key={i}
                                label={offer.bought ? `Sold: ${items[offer.itemId]?.name ?? offer.itemId}` : `Buy ${items[offer.itemId]?.name ?? offer.itemId}`}
                                trailing={offer.bought ? undefined : <Text style={styles.price}>{offer.price}</Text>}
                                variant={offer.bought ? "secondary" : "primary"}
                                size="small"
                                disabled={offer.bought || !canBuy}
                                onPress={() => void act({ type: "buy", offer: i })}
                            />
                        ))}
                        {active.offers.length > 0 && !canBuy && <Hint>Buy at a farming place.</Hint>}
                    </Entry>
                )}
                {next && <Entry icon={eventIcon(next.icon)} color={palette.textMuted} name={next.name} when="Next cycle" description={next.description} />}
            </ScrollView>
        </Sheet>
    );
}

function Entry({
    icon,
    color,
    name,
    when,
    description,
    children,
}: {
    icon: GameIconName;
    color: string;
    name: string;
    when: string;
    description: string;
    children?: ReactNode;
}) {
    const styles = useStyles();
    return (
        <Panel compact flat>
            <View style={styles.entryHead}>
                <Icon name={icon} size={24} color={color} />
                <View style={styles.entryText}>
                    <Text style={styles.name}>{name}</Text>
                    <Hint>{when}</Hint>
                </View>
            </View>
            <Body>{description}</Body>
            {children}
        </Panel>
    );
}

const useStyles = createStyles((p) => ({
    row: {
        gap: 6,
        paddingHorizontal: 16,
    },
    list: {
        gap: 10,
        paddingBottom: 12,
    },
    entryHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    entryText: {
        flex: 1,
    },
    name: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 15,
    },
    price: {
        color: p.onPrimary,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 12,
    },
}));
