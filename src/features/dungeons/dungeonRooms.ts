import type { GameIconName } from "@/components/Icon/Icon";
import type { GeoDungeonRoom, GeoDungeonRoomKind, GeoRoomStyle } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** Each room kind's icon, colour and name. The icon always shows, so colour is never the only cue. */
export const ROOM_KINDS: Record<GeoDungeonRoomKind, { icon: GameIconName | null; color: string; label: string }> = {
    entrance: { icon: "cave-entrance", color: colors.textSecondary, label: "Entrance" },
    encounter: { icon: "crossed-swords", color: colors.damage, label: "Fight" },
    star: { icon: "falling-star", color: colors.emberBright, label: "Star room" },
    miniboss: { icon: "crown", color: colors.coins, label: "Gold room" },
    puzzle: { icon: "uncertainty", color: colors.rarityEpic, label: "Puzzle" },
    loot: { icon: "open-treasure-chest", color: colors.rarityUncommon, label: "Loot" },
    event: { icon: "magic-swirl", color: colors.rarityRare, label: "Event" },
    boss: { icon: "death-skull", color: colors.damage, label: "Boss" },
    empty: { icon: null, color: colors.textSecondary, label: "Empty room" },
};

export const TONES: Record<GeoRoomStyle["tone"], { floor: string; wall: string }> = {
    stone: { floor: colors.dungeonStoneFloor, wall: colors.dungeonStoneWall },
    moss: { floor: colors.dungeonMossFloor, wall: colors.dungeonMossWall },
    ember: { floor: colors.dungeonEmberFloor, wall: colors.dungeonEmberWall },
    bone: { floor: colors.dungeonBoneFloor, wall: colors.dungeonBoneWall },
    void: { floor: colors.dungeonVoidFloor, wall: colors.dungeonVoidWall },
};

/** "Star room, done", "Loot, locked": for screen readers. */
export function describeRoom(room: GeoDungeonRoom, isHere: boolean): string {
    const parts = [room.name ?? ROOM_KINDS[room.kind].label];
    if (room.name) parts.push(ROOM_KINDS[room.kind].label);
    if (isHere) parts.push("you're here");
    if (room.locked) parts.push("locked");
    if (room.done) parts.push("done");
    if (room.busyWith) parts.push(`${room.busyWith} is in there`);
    if (room.seen === "seen") parts.push("not visited yet");
    return parts.join(", ");
}
