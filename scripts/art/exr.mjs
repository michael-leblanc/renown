// Reads an OpenEXR file with no compression (what scripts/art/bake3d/blender.py writes) into float channels, with Node alone.
// Blender 5 writes a multilayer file as several parts, one per pass; both one-part and multipart scanline files are read.
import { readFileSync } from 'node:fs';

function half(h) {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
  return e === 0 ? s * f * 2 ** -24 : e === 31 ? (f ? NaN : s * Infinity) : s * (1 + f / 1024) * 2 ** (e - 15);
}

/** Returns { width, height, channels: { name: Float32Array } }, rows top to bottom. Scanline, no compression; all parts the same size. */
export function readExr(path) {
  const f = readFileSync(path);
  if (f.readUInt32LE(0) !== 20000630) throw new Error(`readExr: ${path} is not an OpenEXR file`);
  const flags = f.readUInt32LE(4), multi = !!(flags & 0x1000);
  if (flags & 0xa00) throw new Error(`readExr: ${path} is tiled or deep; only scanline files are read`);
  let p = 8; const cstr = () => { const e = f.indexOf(0, p), s = f.toString('latin1', p, e); p = e + 1; return s; };
  const parts = [];
  for (;;) {                                            // one header, or one per part ending with an empty one
    const h = { chans: [], win: null, comp: -1, chunks: 0 };
    for (;;) {
      const name = cstr(); if (!name) break;
      cstr(); const size = f.readInt32LE(p); p += 4; const v = p; p += size;
      if (name === 'channels') { let q = v; while (f[q]) { const e = f.indexOf(0, q), n = f.toString('latin1', q, e); q = e + 1; h.chans.push({ n, t: f.readInt32LE(q) }); q += 16; } }
      else if (name === 'dataWindow') h.win = [0, 4, 8, 12].map(o => f.readInt32LE(v + o));
      else if (name === 'compression') h.comp = f[v];
      else if (name === 'chunkCount') h.chunks = f.readInt32LE(v);
    }
    if (!h.win) break;                                  // the empty header that ends a multipart file's list
    if (h.comp !== 0) throw new Error(`readExr: ${path} is compressed (${h.comp}); bake3d writes it with no compression`);
    h.chunks ||= h.win[3] - h.win[1] + 1;
    parts.push(h);
    if (!multi) break;
  }
  const win = parts[0].win, W = win[2] - win[0] + 1, H = win[3] - win[1] + 1, out = {};
  for (const h of parts) for (const c of h.chans) out[c.n] = new Float32Array(W * H);
  for (const h of parts) p += h.chunks * 8;             // the offset tables: the blocks are read in the order they are stored
  const total = parts.reduce((s, h) => s + h.chunks, 0);
  for (let k = 0; k < total; k++) {
    const h = parts[multi ? f.readUInt32LE(p) : 0]; if (multi) p += 4;
    const y = f.readInt32LE(p) - h.win[1]; p += 8;      // the row, then the block's size
    for (const c of h.chans) {
      const a = out[c.n], o = y * W;
      if (c.t === 2) for (let x = 0; x < W; x++, p += 4) a[o + x] = f.readFloatLE(p);
      else if (c.t === 1) for (let x = 0; x < W; x++, p += 2) a[o + x] = half(f.readUInt16LE(p));
      else for (let x = 0; x < W; x++, p += 4) a[o + x] = f.readUInt32LE(p);
    }
  }
  return { width: W, height: H, channels: out };
}
