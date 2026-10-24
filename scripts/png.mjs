import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

/**
 * Just enough PNG reading and writing for the sprite scripts, so they need no
 * image library.
 *
 * Reads 8-bit RGB and RGBA, non-interlaced: what Gemini and image editors
 * export by default. Anything else fails loudly rather than producing a broken
 * sprite. Always hands back RGBA pixels; `hasAlpha` says whether the file had
 * real transparency.
 */
export function decodePng(buffer, name) {
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

    const hasAlpha = header?.colorType === 6;
    if (!header || header.bitDepth !== 8 || (header.colorType !== 2 && !hasAlpha) || header.interlace !== 0) {
        throw new Error(`${name}: must be an 8-bit RGB or RGBA, non-interlaced PNG.`);
    }

    const { width, height } = header;
    const channels = hasAlpha ? 4 : 3;
    const stride = width * channels;
    const raw = inflateSync(Buffer.concat(idat));
    const pixels = Buffer.alloc(width * height * 4);
    let previous = Buffer.alloc(stride);

    for (let y = 0, i = 0; y < height; y++) {
        const filter = raw[i++];
        const line = Buffer.from(raw.subarray(i, i + stride));
        i += stride;

        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? line[x - channels] : 0;
            const up = previous[x];
            const upLeft = x >= channels ? previous[x - channels] : 0;

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

        for (let x = 0; x < width; x++) {
            const out = (y * width + x) * 4;
            pixels[out] = line[x * channels];
            pixels[out + 1] = line[x * channels + 1];
            pixels[out + 2] = line[x * channels + 2];
            pixels[out + 3] = hasAlpha ? line[x * channels + 3] : 255;
        }
        previous = line;
    }

    return { width, height, pixels, hasAlpha };
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

/** Encodes RGBA pixels as an 8-bit RGBA PNG. */
export function encodePng({ width, height, pixels }) {
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

/** The file as an 8-bit PNG, converting with `sips` if it is anything else. */
export function readPng(path) {
    const buffer = readFileSync(path);
    const isPng = buffer.subarray(1, 4).toString("ascii") === "PNG";
    if (isPng && (buffer[24] === 8 && (buffer[25] === 2 || buffer[25] === 6))) return buffer;

    const dir = mkdtempSync(join(tmpdir(), "sprite-"));
    try {
        const converted = join(dir, "converted.png");
        execFileSync("sips", ["-s", "format", "png", "-s", "formatOptions", "default", path, "--out", converted], { stdio: "ignore" });
        return readFileSync(converted);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
