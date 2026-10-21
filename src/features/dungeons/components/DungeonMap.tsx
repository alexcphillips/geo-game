import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import Icon from "@/components/Icon/Icon";
import type { GeoDungeonRoom, GeoDungeonRunView, GeoRoomStyle } from "@/lib/geo/contracts";
import { createStyles, useTheme } from "@/theme/theme";
import {
    CELL,
    DEFAULT_ROOM_STYLE,
    cellLeft,
    corridorRect,
    doorMiddle,
    mapSize,
    roomCentre,
    roomCorner,
    roomFoot,
    roomPath,
    thresholdRects,
} from "../dungeonMapGeometry";
import { describeRoom, ROOM_KINDS, TONES } from "../dungeonRooms";

type DungeonMapProps = {
    view: GeoDungeonRunView;
    onPressRoom: (room: GeoDungeonRoom) => void;
    disabled?: boolean;
};

/** Never drawn bigger than this, so a small map doesn't turn into blobs. */
const MAX_SCALE = 1.6;

/**
 * A dungeon map, top-down: the rooms the server lets you see, their walls
 * drawn from their room styles, corridors between them, and an icon per room.
 * Rooms you haven't been in have faint dashed walls and a dimmed icon; done rooms get a
 * green wall and a check. Every room is a button laid over the drawing, so
 * taps and screen readers work on rooms, not pixels.
 */
export default function DungeonMap({ view, onPressRoom, disabled }: DungeonMapProps) {
    const styles = useStyles();
    const palette = useTheme();
    const [width, setWidth] = useState(0);
    const size = mapSize(view.cols, view.rows);
    const scale = width > 0 ? Math.min(MAX_SCALE, width / size.width) : 0;
    const styleOf = (room: GeoDungeonRoom): GeoRoomStyle => (room.style && view.styles[room.style]) || DEFAULT_ROOM_STYLE;
    const byId = new Map(view.rooms.map((room) => [room.id, room]));
    const here = byId.get(view.currentRoom);

    const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
    const at = (value: number) => value * scale;

    return (
        <View style={styles.frame} onLayout={onLayout}>
            {scale > 0 && (
                <View style={{ width: at(size.width), height: at(size.height) }}>
                    <Svg width={at(size.width)} height={at(size.height)} viewBox={`0 0 ${size.width} ${size.height}`}>
                        <Rect width={size.width} height={size.height} fill={palette.game.dungeonGround} />
                        {view.doors.map((door, index) => {
                            const rect = corridorRect(door);
                            return (
                                <Rect
                                    key={`c${index}`}
                                    {...rect}
                                    fill={palette.game.dungeonCorridor}
                                    stroke={door.locked ? palette.game.dungeonLock : palette.game.dungeonCorridorWall}
                                    strokeWidth={1.5}
                                />
                            );
                        })}
                        {view.rooms.map((room) => {
                            const style = styleOf(room);
                            const d = roomPath(room, style);
                            const tone = TONES[style.tone];
                            const wall = room.done ? palette.game.dungeonDone : room.kind === "miniboss" ? palette.reward : tone.wall;
                            const isSeen = room.seen === "seen";
                            return (
                                <Path
                                    key={`r${room.id}`}
                                    d={d}
                                    fill={tone.floor}
                                    fillRule="evenodd"
                                    stroke={wall}
                                    strokeWidth={room.done || room.kind === "miniboss" ? style.wall + 1 : style.wall}
                                    strokeLinejoin="round"
                                    strokeDasharray={isSeen ? "5 4" : undefined}
                                    strokeOpacity={isSeen ? 0.6 : 1}
                                />
                            );
                        })}
                        {view.doors.flatMap((door, index) => {
                            const roomA = byId.get(door.rooms[0]);
                            const roomB = byId.get(door.rooms[1]);
                            if (!roomA || !roomB) return [];
                            // Each side's gap in the room's own floor colour, so the floor runs out to the corridor.
                            return thresholdRects(door, roomA, styleOf(roomA), roomB, styleOf(roomB)).map((rect, side) => (
                                <Rect key={`t${index}-${side}`} {...rect} fill={TONES[styleOf(side === 0 ? roomA : roomB).tone].floor} />
                            ));
                        })}
                    </Svg>

                    {view.doors.map((door, index) => {
                        if (!door.locked) return null;
                        const [x, y] = doorMiddle(door);
                        return (
                            <View key={`l${index}`} pointerEvents="none" style={[styles.badge, { left: at(x) - 8, top: at(y) - 8 }]}>
                                <Icon name="padlock" size={16} color={palette.game.dungeonLock} />
                            </View>
                        );
                    })}

                    {view.rooms.map((room) => {
                        const style = styleOf(room);
                        const kind = ROOM_KINDS[room.kind];
                        const [cx, cy] = roomCentre(room);
                        const [bx, by] = roomCorner(room, style);
                        const isHere = room.id === view.currentRoom;
                        const iconSize = Math.max(16, Math.min(30, at(room.kind === "boss" ? 30 : 24)));
                        return (
                            <View key={`o${room.id}`} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                                {/* One button per cell, so odd shapes are tappable exactly where they are. */}
                                {room.cells.map(([x, y]) => (
                                    <Pressable
                                        key={`${x},${y}`}
                                        onPress={() => onPressRoom(room)}
                                        disabled={disabled || isHere}
                                        accessibilityRole="button"
                                        accessibilityLabel={describeRoom(room, isHere)}
                                        style={{
                                            position: "absolute",
                                            left: at(cellLeft(x)),
                                            top: at(cellLeft(y)),
                                            width: at(CELL),
                                            height: at(CELL),
                                        }}
                                    />
                                ))}
                                <View
                                    pointerEvents="none"
                                    style={[styles.centre, { left: at(cx) - 40, top: at(cy) - iconSize / 2 - (room.name ? 6 : 0) }]}
                                >
                                    {kind.icon && (
                                        <View style={{ opacity: room.done ? 0.45 : room.seen === "seen" ? 0.8 : 1 }}>
                                            <Icon name={kind.icon} size={iconSize} color={kind.color} />
                                        </View>
                                    )}
                                    {room.name && scale >= 0.8 && (
                                        <Text style={styles.name} numberOfLines={1}>
                                            {room.name}
                                        </Text>
                                    )}
                                </View>
                                {(room.done || room.locked) && (
                                    <View pointerEvents="none" style={[styles.badge, { left: at(bx) - 8, top: at(by) - 8 }]}>
                                        {room.done ? (
                                            <Icon name="check-mark" size={16} color={palette.game.dungeonDone} />
                                        ) : (
                                            <Icon name="padlock" size={14} color={palette.game.dungeonLock} />
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    {here && (() => {
                        const [tx, ty] = roomFoot(here, styleOf(here));
                        return (
                            <View pointerEvents="none" style={[styles.token, { left: at(tx) - 9, top: at(ty) - 9 }]} />
                        );
                    })()}
                </View>
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    frame: {
        width: "100%",
        alignItems: "center",
    },
    centre: {
        position: "absolute",
        width: 80,
        alignItems: "center",
    },
    name: {
        marginTop: 1,
        fontSize: 10,
        color: p.textMuted,
    },
    badge: {
        position: "absolute",
        width: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    token: {
        position: "absolute",
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: p.ember,
        borderWidth: 2,
        borderColor: p.text,
    },
}));
