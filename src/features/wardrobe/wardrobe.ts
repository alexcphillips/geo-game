import type { GameIconName } from "@/components/Icon/Icon";
import type { GeoLoadoutActivity } from "@/lib/geo/contracts";

/** What a new loadout is called until it's renamed. */
export function defaultLoadoutName(slot: number): string {
    return `Loadout ${slot + 1}`;
}

/** The activities auto-swap can wear a loadout for, as the app shows them. */
export const AUTO_ACTIVITIES: { id: GeoLoadoutActivity; label: string; icon: GameIconName }[] = [
    { id: "combat", label: "Combat", icon: "crossed-swords" },
    { id: "fishing", label: "Fishing", icon: "fishing-pole" },
];

export const AUTO_ICONS: Record<GeoLoadoutActivity, GameIconName> = {
    combat: "crossed-swords",
    fishing: "fishing-pole",
};
