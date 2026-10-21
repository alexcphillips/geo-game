import { useRef } from "react";
import { View } from "react-native";
import type { GameIconName } from "@/components/Icon/Icon";
import MenuTile from "@/components/MenuTile/MenuTile";
import { useCloseModal } from "@/components/Modal/Modal";
import Sheet from "@/components/Sheet/Sheet";
import type { GeoFarmView } from "@/lib/geo/contracts";
import { createStyles } from "@/theme/theme";

export type FarmMenuEntry = "build" | "orders" | "lab" | "contests" | "pesthunter" | "admin-next";

type FarmMenuItem = { id: FarmMenuEntry; label: string; icon: GameIconName; badge: number };

/**
 * What the Farm menu holds, each with a count of what's waiting behind it.
 * `features` hides what isn't worth showing yet (see `farmFeatures`).
 */
export function farmMenuItems(
    farm: GeoFarmView,
    held: Record<string, number>,
    features: { lab: boolean; pesthunter: boolean; contests: boolean },
    isAdmin: boolean,
): FarmMenuItem[] {
    const deliverable = farm.orders.orders.filter(
        (order) => order.status === "accepted" && (held[order.itemId] ?? 0) >= order.quantity - order.delivered,
    ).length;
    const caged = farm.tiles.filter((tile) => tile.structure?.caged).length;
    const items: (FarmMenuItem | false)[] = [
        { id: "build", label: "Build", icon: "spanner", badge: 0 },
        { id: "orders", label: "Orders", icon: "scroll-quill", badge: deliverable },
        features.lab && { id: "lab", label: "Research Lab", icon: "microscope", badge: farm.lab.ready.length },
        features.contests && { id: "contests", label: "Contests", icon: "trophy", badge: 0 },
        features.pesthunter && { id: "pesthunter", label: "Pesthunter", icon: "cage", badge: caged },
        isAdmin && { id: "admin-next", label: "admin: Next", icon: "hourglass", badge: 0 },
    ];
    return items.filter((item): item is FarmMenuItem => Boolean(item));
}

/**
 * All the farm's features, in big tiles. A pick slides the sheet away first,
 * then `onPick` opens the feature.
 */
export default function FarmMenuSheet({ items, onPick, onClose }: { items: FarmMenuItem[]; onPick: (entry: FarmMenuEntry) => void; onClose: () => void }) {
    // A ref, not state: the close that follows a pick was made before the pick re-rendered.
    const picked = useRef<FarmMenuEntry | null>(null);
    return (
        <Sheet title="Farm" size="medium" onClose={() => (picked.current ? onPick(picked.current) : onClose())}>
            <MenuGrid items={items} onPick={(entry) => (picked.current = entry)} />
        </Sheet>
    );
}

function MenuGrid({ items, onPick }: { items: FarmMenuItem[]; onPick: (entry: FarmMenuEntry) => void }) {
    const styles = useStyles();
    const close = useCloseModal();
    return (
        <View style={styles.grid}>
            {items.map((item) => (
                <View key={item.id} style={styles.cell}>
                    <MenuTile
                        label={item.label}
                        icon={item.icon}
                        badge={item.badge}
                        onPress={() => {
                            onPick(item.id);
                            close();
                        }}
                    />
                </View>
            ))}
        </View>
    );
}

const useStyles = createStyles(() => ({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        paddingBottom: 8,
    },
    cell: {
        width: "30.5%",
    },
}));
