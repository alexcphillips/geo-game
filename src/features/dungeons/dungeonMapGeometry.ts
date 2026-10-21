import type { GeoDungeonDoor, GeoDungeonRoom, GeoRoomStyle } from "@/lib/geo/contracts";

/**
 * Drawing a dungeon map from the server's rooms: outlines traced from each
 * room's cells, shaped by its room style, plus corridors and the gaps they
 * cut through walls. Pure numbers, in map units: the screen scales them.
 *
 * A cell is CELL across with GAP between cells, which is where doors go. A
 * room's outline runs round all its cells (and the gaps between them), then
 * sits `inset` inside the cells' edges.
 */
export const CELL = 64;
export const GAP = 18;
export const PAD = 14;
export const CORRIDOR = 16;

export const DEFAULT_ROOM_STYLE: GeoRoomStyle = { corner: "round", radius: 8, rough: 0, wall: 3, inset: 4, tone: "stone" };

/** A grid line, counting both cell bands (even) and gap bands (odd), to map units. */
const lineAt = (index: number) => PAD + Math.floor(index / 2) * (CELL + GAP) + (index % 2 ? CELL : 0);

export const cellLeft = (column: number) => lineAt(2 * column);
export const cellCentre = (column: number) => lineAt(2 * column) + CELL / 2;

export function mapSize(cols: number, rows: number) {
    return { width: PAD * 2 + cols * CELL + Math.max(0, cols - 1) * GAP, height: PAD * 2 + rows * CELL + Math.max(0, rows - 1) * GAP };
}

type Point = [number, number];

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The room's outline loops (more than one only for a room with a hole), in map units. */
function outlines(room: GeoDungeonRoom, style: GeoRoomStyle): Point[][] {
    const cells = new Set(room.cells.map(([x, y]) => `${x},${y}`));
    const has = (x: number, y: number) => cells.has(`${x},${y}`);
    // Fine grid units: a room fills its cells and the gaps between its own cells.
    const units = new Set<string>();
    for (const [x, y] of room.cells) {
        units.add(`${2 * x},${2 * y}`);
        const right = has(x + 1, y);
        const down = has(x, y + 1);
        if (right) units.add(`${2 * x + 1},${2 * y}`);
        if (down) units.add(`${2 * x},${2 * y + 1}`);
        if (right && down && has(x + 1, y + 1)) units.add(`${2 * x + 1},${2 * y + 1}`);
    }
    // Edges shared by two units cancel; what's left is the outline.
    const edges = new Map<string, [string, string]>();
    const add = (a: string, b: string) => {
        const back = `${b}|${a}`;
        if (edges.has(back)) edges.delete(back);
        else edges.set(`${a}|${b}`, [a, b]);
    };
    for (const unit of units) {
        const [i, j] = unit.split(",").map(Number) as [number, number];
        const corners = [`${i},${j}`, `${i + 1},${j}`, `${i + 1},${j + 1}`, `${i},${j + 1}`];
        for (let k = 0; k < 4; k++) add(corners[k]!, corners[(k + 1) % 4]!);
    }
    const next = new Map<string, string[]>();
    for (const [a, b] of edges.values()) next.set(a, [...(next.get(a) ?? []), b]);

    const loops: Point[][] = [];
    while (next.size > 0) {
        const start = next.keys().next().value as string;
        const loop: string[] = [];
        let at = start;
        for (let guard = 0; guard < 4000; guard++) {
            loop.push(at);
            const list = next.get(at);
            if (!list) break;
            const to = list.pop()!;
            if (list.length === 0) next.delete(at);
            at = to;
            if (at === start) break;
        }
        // Even lines are a cell's left/top edge, odd its right/bottom: the inset moves each inward.
        const inset = (index: number) => lineAt(index) + (index % 2 === 0 ? style.inset : -style.inset);
        const points = loop.map((key) => key.split(",").map(Number) as Point);
        const corners = points.filter((b, k) => {
            const a = points[(k - 1 + points.length) % points.length]!;
            const c = points[(k + 1) % points.length]!;
            return !((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]));
        });
        loops.push(corners.map(([i, j]) => [inset(i), inset(j)]));
    }
    return loops;
}

const f = (value: number) => Math.round(value * 10) / 10;

function loopPath(points: Point[], style: GeoRoomStyle, random: () => number): string {
    const n = points.length;
    if (n < 3) return "";
    if (style.rough > 0) {
        // Jagged cave walls: each edge in short steps, nudged in and out.
        const jagged: Point[] = [];
        for (let k = 0; k < n; k++) {
            const [ax, ay] = points[k]!;
            const [bx, by] = points[(k + 1) % n]!;
            const length = Math.hypot(bx - ax, by - ay);
            const steps = Math.max(1, Math.round(length / 9));
            const nx = -(by - ay) / length;
            const ny = (bx - ax) / length;
            for (let t = 0; t < steps; t++) {
                const nudge = t === 0 ? 0 : (random() * 2 - 1) * style.rough;
                jagged.push([ax + ((bx - ax) * t) / steps + nx * nudge, ay + ((by - ay) * t) / steps + ny * nudge]);
            }
        }
        // Soften the corners, keeping the rough edge.
        const soft = jagged.flatMap(([ax, ay], k): Point[] => {
            const [bx, by] = jagged[(k + 1) % jagged.length]!;
            return [
                [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25],
                [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75],
            ];
        });
        return `M${soft.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
    }
    const radius = style.corner === "circle" ? Infinity : style.radius;
    let d = "";
    for (let k = 0; k < n; k++) {
        const p = points[(k - 1 + n) % n]!;
        const v = points[k]!;
        const q = points[(k + 1) % n]!;
        const before = Math.hypot(v[0] - p[0], v[1] - p[1]);
        const after = Math.hypot(q[0] - v[0], q[1] - v[1]);
        const r = Math.min(radius, before / 2, after / 2);
        if (r <= 0.5) {
            d += `${k ? "L" : "M"}${f(v[0])} ${f(v[1])}`;
            continue;
        }
        const a: Point = [v[0] + ((p[0] - v[0]) * r) / before, v[1] + ((p[1] - v[1]) * r) / before];
        const b: Point = [v[0] + ((q[0] - v[0]) * r) / after, v[1] + ((q[1] - v[1]) * r) / after];
        d += `${k ? "L" : "M"}${f(a[0])} ${f(a[1])}`;
        if (style.corner === "chamfer") d += `L${f(b[0])} ${f(b[1])}`;
        else {
            const clockwise = (v[0] - p[0]) * (q[1] - v[1]) - (v[1] - p[1]) * (q[0] - v[0]) > 0;
            d += `A${f(r)} ${f(r)} 0 0 ${clockwise ? 1 : 0} ${f(b[0])} ${f(b[1])}`;
        }
    }
    return `${d}Z`;
}

/** The room's outline as an SVG path (even-odd fill). */
export function roomPath(room: GeoDungeonRoom, style: GeoRoomStyle): string {
    const random = seeded(room.id * 7919 + room.cells.length);
    return outlines(room, style)
        .map((loop) => loopPath(loop, style, random))
        .join("");
}

function bounds(room: GeoDungeonRoom) {
    const xs = room.cells.map(([x]) => x);
    const ys = room.cells.map(([, y]) => y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Where a room's icon goes: its middle, or the cell nearest it for an odd shape. */
export function roomCentre(room: GeoDungeonRoom): Point {
    const { minX, maxX, minY, maxY } = bounds(room);
    if (room.cells.length === (maxX - minX + 1) * (maxY - minY + 1)) {
        return [(lineAt(2 * minX) + lineAt(2 * maxX + 1)) / 2, (lineAt(2 * minY) + lineAt(2 * maxY + 1)) / 2];
    }
    const mx = room.cells.reduce((sum, [x]) => sum + x, 0) / room.cells.length;
    const my = room.cells.reduce((sum, [, y]) => sum + y, 0) / room.cells.length;
    const [x, y] = room.cells.reduce((best, cell) =>
        Math.hypot(cell[0] - mx, cell[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? cell : best,
    );
    return [cellCentre(x), cellCentre(y)];
}

/** A room's top-right corner, inside its walls: for a badge. */
export function roomCorner(room: GeoDungeonRoom, style: GeoRoomStyle): Point {
    const { maxX, minY } = bounds(room);
    return [lineAt(2 * maxX + 1) - style.inset - 10, lineAt(2 * minY) + style.inset + 10];
}

/** A room's bottom-left corner, inside its walls: for the player's token. */
export function roomFoot(room: GeoDungeonRoom, style: GeoRoomStyle): Point {
    const { minX, maxY } = bounds(room);
    return [lineAt(2 * minX) + style.inset + 12, lineAt(2 * maxY + 1) - style.inset - 12];
}

/** The corridor between a door's two cells, from centre to centre (drawn under the rooms). */
export function corridorRect(door: GeoDungeonDoor) {
    const [ax, ay] = [cellCentre(door.a[0]), cellCentre(door.a[1])];
    const [bx, by] = [cellCentre(door.b[0]), cellCentre(door.b[1])];
    const across = ay === by;
    return across
        ? { x: Math.min(ax, bx), y: ay - CORRIDOR / 2, width: Math.abs(bx - ax), height: CORRIDOR }
        : { x: ax - CORRIDOR / 2, y: Math.min(ay, by), width: CORRIDOR, height: Math.abs(by - ay) };
}

/** How far a curved corner pulls a wall in at `at` along a side running `from`–`to`. */
function curveOffset(room: GeoDungeonRoom, style: GeoRoomStyle, from: number, to: number, at: number): number {
    let r = style.corner === "circle" ? Infinity : style.corner === "round" ? style.radius : 0;
    if (!r || style.rough > 0) return 0;
    const { minX, maxX, minY, maxY } = bounds(room);
    if (room.cells.length === (maxX - minX + 1) * (maxY - minY + 1)) {
        const width = lineAt(2 * maxX + 1) - lineAt(2 * minX) - 2 * style.inset;
        const height = lineAt(2 * maxY + 1) - lineAt(2 * minY) - 2 * style.inset;
        r = Math.min(r, width / 2, height / 2);
    } else r = Math.min(r, CELL / 2 - style.inset);
    const lo = from + style.inset;
    const hi = to - style.inset;
    const d = Math.max(0, lo + r - at, at - (hi - r));
    return d > 0 ? r - Math.sqrt(Math.max(0, r * r - d * d)) : 0;
}

/**
 * The gaps a door cuts through its two rooms' walls: one rect per side,
 * filled with the corridor's colour over the wall.
 */
export function thresholdRects(door: GeoDungeonDoor, roomA: GeoDungeonRoom, styleA: GeoRoomStyle, roomB: GeoDungeonRoom, styleB: GeoRoomStyle) {
    const across = door.a[1] === door.b[1];
    const sides: [number[], GeoDungeonRoom, GeoRoomStyle, 1 | -1][] = [
        [door.a, roomA, styleA, 1],
        [door.b, roomB, styleB, -1],
    ];
    return sides.map(([cell, room, style, sign]) => {
        const reach = style.wall / 2 + style.rough + 2;
        const { minX, maxX, minY, maxY } = bounds(room);
        if (across) {
            const edge = sign > 0 ? lineAt(2 * cell[0]! + 1) : lineAt(2 * cell[0]!);
            const middle = cellCentre(cell[1]!);
            const wall = edge - sign * (style.inset + curveOffset(room, style, lineAt(2 * minY), lineAt(2 * maxY + 1), middle));
            const x1 = Math.min(edge, wall - sign * reach);
            const x2 = Math.max(edge, wall - sign * reach);
            return { x: x1, y: middle - CORRIDOR / 2 + 1.2, width: x2 - x1, height: CORRIDOR - 2.4 };
        }
        const edge = sign > 0 ? lineAt(2 * cell[1]! + 1) : lineAt(2 * cell[1]!);
        const middle = cellCentre(cell[0]!);
        const wall = edge - sign * (style.inset + curveOffset(room, style, lineAt(2 * minX), lineAt(2 * maxX + 1), middle));
        const y1 = Math.min(edge, wall - sign * reach);
        const y2 = Math.max(edge, wall - sign * reach);
        return { x: middle - CORRIDOR / 2 + 1.2, y: y1, width: CORRIDOR - 2.4, height: y2 - y1 };
    });
}

/** The middle of the gap a door crosses: where its padlock goes. */
export function doorMiddle(door: GeoDungeonDoor): Point {
    const across = door.a[1] === door.b[1];
    return across
        ? [lineAt(2 * Math.min(door.a[0], door.b[0]) + 1) + GAP / 2, cellCentre(door.a[1])]
        : [cellCentre(door.a[0]), lineAt(2 * Math.min(door.a[1], door.b[1]) + 1) + GAP / 2];
}
