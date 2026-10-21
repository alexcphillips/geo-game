import { INK } from "@/theme/palette";

/** Width over height: a little taller than wide, like a playing card. */
export const TILE_ASPECT = 0.78;

/** A tile without its name (one shown beside it instead) is square. */
export const BARE_TILE_ASPECT = 1;

/** How much of a bare tile's width its icon takes. */
const BARE_ICON_SHARE = 0.72;

/** Room inside the border, around the icon and name. */
export const TILE_PADDING = { x: 4, top: 4, bottom: 6 } as const;

/** Between the icon's zone and the name's. */
export const TILE_GAP = 2;

/** A name gets up to three lines; any shown name fits in that at some size. */
export const NAME_LINES = 3;

const MAX_NAME_SIZE = 12;
const MIN_NAME_SIZE = 8;
const LINE_HEIGHT = 1.15;

/**
 * Nunito Bold's advance widths for printable ASCII (space to `~`), in ems,
 * read from the font file. Lets a tile pick a name size that never breaks a
 * word in the middle, before anything is drawn.
 */
const NUNITO_BOLD_EM = [
    0.271, 0.248, 0.448, 0.6, 0.6, 0.945, 0.726, 0.243, 0.358, 0.358, 0.453, 0.6, 0.248, 0.434, 0.248, 0.313, 0.6, 0.6,
    0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.248, 0.248, 0.6, 0.6, 0.6, 0.459, 0.95, 0.744, 0.688, 0.68, 0.762, 0.597,
    0.562, 0.736, 0.773, 0.282, 0.354, 0.665, 0.562, 0.868, 0.748, 0.785, 0.652, 0.785, 0.686, 0.631, 0.621, 0.738,
    0.713, 1.113, 0.672, 0.618, 0.605, 0.354, 0.313, 0.354, 0.6, 0.5, 0.377, 0.547, 0.6, 0.472, 0.6, 0.542, 0.364,
    0.604, 0.585, 0.255, 0.259, 0.536, 0.319, 0.877, 0.585, 0.576, 0.6, 0.6, 0.392, 0.488, 0.384, 0.579, 0.527, 0.853,
    0.546, 0.526, 0.474, 0.391, 0.288, 0.391, 0.6,
];

/** Anything outside ASCII: about a digit's width. */
const FALLBACK_EM = 0.6;

/** Headroom for rounding, so a name measured to just fit really does. */
const WIDTH_SAFETY = 0.95;

function textWidth(text: string, fontSize: number): number {
    let ems = 0;
    for (const char of text) ems += NUNITO_BOLD_EM[char.charCodeAt(0) - 32] ?? FALLBACK_EM;
    return ems * fontSize;
}

/** Whether `name` wraps at word breaks into `NAME_LINES` lines of `width`. */
function fits(words: string[], fontSize: number, width: number): boolean {
    const space = textWidth(" ", fontSize);
    let lines = 1;
    let line = 0;
    for (const word of words) {
        const wordWidth = textWidth(word, fontSize);
        if (wordWidth > width) return false;
        if (line === 0) line = wordWidth;
        else if (line + space + wordWidth <= width) line += space + wordWidth;
        else {
            lines += 1;
            line = wordWidth;
        }
    }
    return lines <= NAME_LINES;
}

export type TileLayout = {
    iconSize: number;
    /** Height of the name's zone: always room for `NAME_LINES`, so icons line up along a row. Zero, with the font sizes, for a bare tile. */
    nameHeight: number;
    fontSize: number;
    lineHeight: number;
};

/**
 * Sizes a tile's icon and name from its measured width.
 *
 * The name's zone is `NAME_LINES` lines at the tile's largest name size; the
 * icon takes what's left of the height. The name then gets the largest size,
 * in half points, at which it wraps whole words into that zone. A name that
 * fits at no size (one word too long for a tiny tile) gets the smallest, and
 * the tile ellipsises it.
 *
 * With no `name` the tile is bare: square, and the icon fills most of it.
 */
export function tileLayout(width: number, name: string | null): TileLayout {
    if (name === null) {
        return {
            iconSize: Math.floor(width * BARE_ICON_SHARE),
            nameHeight: 0,
            fontSize: 0,
            lineHeight: 0,
        };
    }
    const textRoom = (width - 2 * INK.border - 2 * TILE_PADDING.x) * WIDTH_SAFETY;
    const largest = Math.min(MAX_NAME_SIZE, Math.max(MIN_NAME_SIZE, Math.floor(width * 0.14 * 2) / 2));
    const nameHeight = NAME_LINES * Math.round(largest * LINE_HEIGHT);

    const height = width / TILE_ASPECT;
    const iconRoom = height - 2 * INK.border - TILE_PADDING.top - TILE_PADDING.bottom - TILE_GAP - nameHeight;
    const iconSize = Math.max(16, Math.floor(Math.min(iconRoom, width * 0.6)));

    const words = name.split(/\s+/).filter(Boolean);
    let fontSize = largest;
    while (fontSize > MIN_NAME_SIZE && !fits(words, fontSize, textRoom)) fontSize -= 0.5;

    return {
        iconSize,
        nameHeight,
        fontSize,
        lineHeight: Math.round(fontSize * LINE_HEIGHT),
    };
}
