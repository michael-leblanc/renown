// Writes and reads PNG files with Node's own zlib (no package needed).
import { deflateSync, inflateSync } from 'node:zlib';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** Writes an RGBA buffer as a PNG file, making the folder if needed. */
export function writePng(path, rgba, width, height) {
  const head = Buffer.alloc(13); head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 6;   // 8 bits, RGBA
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/** Reads an 8-bit PNG (RGBA, RGB or palette) into { width, height, data } with data as RGBA. */
export function readPng(path) {
  const f = readFileSync(path); let p = 8, width = 0, height = 0, type = 0, pal = null, trns = null; const idat = [];
  while (p < f.length) {
    const len = f.readUInt32BE(p), name = f.toString('ascii', p + 4, p + 8), data = f.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (name === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0 || ![2, 3, 6].includes(type)) throw new Error(`readPng: ${path} is not an 8-bit RGB, RGBA or palette PNG`); }
    else if (name === 'PLTE') pal = data; else if (name === 'tRNS') trns = data; else if (name === 'IDAT') idat.push(data);
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 1, stride = width * bpp, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {                   // undo each row's filter
    const ft = raw[y * (stride + 1)], row = y * stride, src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0, b = y ? px[row - stride + x] : 0, c = x >= bpp && y ? px[row - stride + x - bpp] : 0;
      let add = 0;
      if (ft === 1) add = a; else if (ft === 2) add = b; else if (ft === 3) add = (a + b) >> 1;
      else if (ft === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + x] = (raw[src + x] + add) & 255;
    }
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (type === 6) px.copy(data, i * 4, i * 4, i * 4 + 4);
    else if (type === 2) { px.copy(data, i * 4, i * 3, i * 3 + 3); data[i * 4 + 3] = 255; }
    else { const k = px[i]; data[i * 4] = pal[k * 3]; data[i * 4 + 1] = pal[k * 3 + 1]; data[i * 4 + 2] = pal[k * 3 + 2]; data[i * 4 + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { width, height, data };
}
