import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

/**
 * Turns the map sprites in `src/features/spawns/assets/*.png` into data URIs
 * the map page can use.
 *
 * Why: the map runs in a WebView whose page is an HTML string, so it can't
 * load the app's bundled image assets by URL. Each PNG is embedded instead.
 * Each one is first cropped to its non-transparent pixels (plus a small
 * margin) so artwork with generous padding doesn't bloat the page or throw
 * off marker sizing.
 *
 * Each is then shrunk so its longest side is at most MAX_SIDE_PX: source art
 * can be any size, and the sprites ship inside the map page.
 *
 * Also writes the sprite names into cozy-app's server (expects cozy-app next
 * to this repo; set COZY_APP_DIR to point elsewhere): enemies spawn on the map
 * only once their sprite is here.
 *
 * Supports 8-bit RGBA, non-interlaced PNGs — what image editors export by
 * default. Anything else fails loudly rather than producing a broken sprite.
 *
 * Run with `npm run sprites` after adding or changing a sprite.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "src/features/spawns/assets");
const outFile = join(root, "src/features/spawns/sprites.generated.ts");
const serverFile = join(resolve(root, process.env.COZY_APP_DIR ?? "../cozy-app"), "server/src/geo/world/app-sprites.generated.ts");

/** Alpha at or below this counts as empty when cropping. */
const ALPHA_THRESHOLD = 16;
const MARGIN_PX = 4;
/** Longest side after shrinking: enough for the combat screen (96pt tall) on most phones. */
const MAX_SIDE_PX = 320;

function decodePng(buffer, name) {
    let offset = 8;
    let header = null;
    const idat = [];

    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString("ascii", offset + 4, offset + 8);
        const body = buffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;

        if (type === "IHDR") {
            header = {
                width: body.readUInt32BE(0),
                height: body.readUInt32BE(4),
                bitDepth: body[8],
                colorType: body[9],
                interlace: body[12],
            };
        } else if (type === "IDAT") {
            idat.push(body);
        }
    }

    if (!header || header.bitDepth !== 8 || header.colorType !== 6 || header.interlace !== 0) {
        throw new Error(`${name}: must be an 8-bit RGBA, non-interlaced PNG.`);
    }

    const { width, height } = header;
    const stride = width * 4;
    const raw = inflateSync(Buffer.concat(idat));
    const pixels = Buffer.alloc(stride * height);
    let previous = Buffer.alloc(stride);

    for (let y = 0, i = 0; y < height; y++) {
        const filter = raw[i++];
        const line = Buffer.from(raw.subarray(i, i + stride));
        i += stride;

        for (let x = 0; x < stride; x++) {
            const left = x >= 4 ? line[x - 4] : 0;
            const up = previous[x];
            const upLeft = x >= 4 ? previous[x - 4] : 0;

            if (filter === 1) line[x] = (line[x] + left) & 255;
            else if (filter === 2) line[x] = (line[x] + up) & 255;
            else if (filter === 3) line[x] = (line[x] + ((left + up) >> 1)) & 255;
            else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upLeft);
                const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
                line[x] = (line[x] + predictor) & 255;
            }
        }

        line.copy(pixels, y * stride);
        previous = line;
    }

    return { width, height, pixels };
}

function cropToContent({ width, height, pixels }) {
    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < 0) throw new Error("sprite is fully transparent");

    minX = Math.max(0, minX - MARGIN_PX);
    minY = Math.max(0, minY - MARGIN_PX);
    maxX = Math.min(width - 1, maxX + MARGIN_PX);
    maxY = Math.min(height - 1, maxY + MARGIN_PX);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropped = Buffer.alloc(cropWidth * cropHeight * 4);

    for (let y = 0; y < cropHeight; y++) {
        pixels.copy(
            cropped,
            y * cropWidth * 4,
            ((minY + y) * width + minX) * 4,
            ((minY + y) * width + maxX + 1) * 4,
        );
    }

    return { width: cropWidth, height: cropHeight, pixels: cropped };
}

/**
 * Shrinks to fit MAX_SIDE_PX by averaging each output pixel's source area.
 * Colours are weighted by alpha, so transparent pixels don't darken edges.
 */
function shrinkToFit(sprite) {
    const scale = MAX_SIDE_PX / Math.max(sprite.width, sprite.height);
    if (scale >= 1) return sprite;

    const width = Math.max(1, Math.round(sprite.width * scale));
    const height = Math.max(1, Math.round(sprite.height * scale));
    const pixels = Buffer.alloc(width * height * 4);
    const stepX = sprite.width / width;
    const stepY = sprite.height / height;

    for (let y = 0; y < height; y++) {
        const y0 = y * stepY, y1 = y0 + stepY;
        for (let x = 0; x < width; x++) {
            const x0 = x * stepX, x1 = x0 + stepX;
            let r = 0, g = 0, b = 0, a = 0, area = 0;
            for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
                const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
                for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
                    const w = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx));
                    const at = (sy * sprite.width + sx) * 4;
                    const alpha = sprite.pixels[at + 3] * w;
                    r += sprite.pixels[at] * alpha;
                    g += sprite.pixels[at + 1] * alpha;
                    b += sprite.pixels[at + 2] * alpha;
                    a += alpha;
                    area += w;
                }
            }
            const out = (y * width + x) * 4;
            if (a > 0) {
                pixels[out] = Math.round(r / a);
                pixels[out + 1] = Math.round(g / a);
                pixels[out + 2] = Math.round(b / a);
            }
            pixels[out + 3] = Math.round(a / area);
        }
    }

    return { width, height, pixels };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
}

function encodePng({ width, height, pixels }) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bit depth
    header[9] = 6; // RGBA

    // Paeth (filter 4) on every row: predicting each byte from its
    // neighbours compresses illustrated art far better than raw rows.
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        const out = y * (stride + 1);
        raw[out] = 4;
        for (let x = 0; x < stride; x++) {
            const at = y * stride + x;
            const left = x >= 4 ? pixels[at - 4] : 0;
            const up = y > 0 ? pixels[at - stride] : 0;
            const upLeft = x >= 4 && y > 0 ? pixels[at - stride - 4] : 0;
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            raw[out + 1 + x] = (pixels[at] - predictor) & 255;
        }
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

const names = [];
const entries = readdirSync(assetsDir)
    .filter((file) => file.endsWith(".png"))
    .sort()
    .map((file) => {
        const name = basename(file, ".png");
        const sprite = shrinkToFit(cropToContent(decodePng(readFileSync(join(assetsDir, file)), file)));
        const uri = `data:image/png;base64,${encodePng(sprite).toString("base64")}`;
        console.log(`${name}: ${sprite.width}×${sprite.height}, ${Math.round(uri.length / 1024)} KB`);
        names.push(name);
        return `    ${JSON.stringify(name)}: { uri: ${JSON.stringify(uri)}, width: ${sprite.width}, height: ${sprite.height} },`;
    });

writeFileSync(
    outFile,
    `// Generated by scripts/generate-sprites.mjs — do not edit. Run \`npm run sprites\`.

/** Map sprites, cropped to their content, as data URIs with pixel sizes. */
export const MAP_SPRITES = {
${entries.join("\n")}
} as const;

export type MapSpriteName = keyof typeof MAP_SPRITES;
`,
);

writeFileSync(
    serverFile,
    `// Generated by geo-game's scripts/generate-sprites.mjs — do not edit. Run \`npm run sprites\` in geo-game.

/** Sprites the app has art for. Enemies whose sprite isn't here don't spawn on the map. */
export const APP_SPRITES = [
${names.map((name) => `    ${JSON.stringify(name)},`).join("\n")}
] as const;
`,
);
