// Draws text from a .woff font file into a picture. For the check pictures of the screen scripts only:
// in the game, text is Godot's job (D241). It reads the letters' outlines itself, so no package is needed.
// Not done: kerning (letter pairs pulled closer), so a word can come out a pixel wider than Godot will draw it.
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { resize } from './kit.mjs';

const FONTS = new Map();
/** Opens a .woff font (TrueType outlines). */
export function font(path) {
  if (FONTS.has(path)) return FONTS.get(path);
  const f = readFileSync(path), t = {};
  for (let i = 0; i < f.readUInt16BE(12); i++) { const p = 44 + i * 20, off = f.readUInt32BE(p + 4), cl = f.readUInt32BE(p + 8), raw = f.subarray(off, off + cl); t[f.toString('ascii', p, p + 4)] = cl < f.readUInt32BE(p + 12) ? inflateSync(raw) : raw; }
  const upm = t.head.readUInt16BE(18), long = t.head.readInt16BE(50), up = t.hhea.readInt16BE(4), wide = t.hhea.readUInt16BE(34), cm = t.cmap, gl = t.glyf;
  let sub = -1; for (let i = 0; i < cm.readUInt16BE(2); i++) { const o = cm.readUInt32BE(8 + i * 8); if (cm.readUInt16BE(o) === 4) sub = o; }
  if (sub < 0) throw new Error(`${path}: no letter table this script can read`);
  const segs = cm.readUInt16BE(sub + 6) / 2;
  const glyph = ch => {                                 // which outline a letter uses
    for (let s = 0; s < segs; s++) {
      if (ch > cm.readUInt16BE(sub + 14 + s * 2)) continue;
      const start = cm.readUInt16BE(sub + 16 + segs * 2 + s * 2); if (ch < start) return 0;
      const delta = cm.readInt16BE(sub + 16 + segs * 4 + s * 2), at = sub + 16 + segs * 6 + s * 2, ro = cm.readUInt16BE(at);
      if (!ro) return (ch + delta) & 0xffff; const g = cm.readUInt16BE(at + ro + (ch - start) * 2); return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
  const place = g => long ? t.loca.readUInt32BE(g * 4) : t.loca.readUInt16BE(g * 2) * 2;
  const outline = g => {                                // a letter's closed curves, each a list of [x, y, on the curve?]
    const o = place(g); if (place(g + 1) === o) return [];
    const n = gl.readInt16BE(o); let p = o + 10; const out = [];
    if (n >= 0) {
      const ends = []; for (let i = 0; i < n; i++, p += 2) ends.push(gl.readUInt16BE(p)); p += 2 + gl.readUInt16BE(p);
      const many = ends[n - 1] + 1, fl = []; while (fl.length < many) { const v = gl[p++]; fl.push(v); if (v & 8) for (let r = gl[p++]; r > 0; r--) fl.push(v); }
      const read = (short, same) => { const a = []; let v = 0; for (const b of fl) { if (b & short) { const d = gl[p++]; v += b & same ? d : -d; } else if (!(b & same)) { v += gl.readInt16BE(p); p += 2; } a.push(v); } return a; };
      const xs = read(2, 16), ys = read(4, 32); let from = 0;
      for (const e of ends) { const c = []; for (let i = from; i <= e; i++) c.push([xs[i], ys[i], fl[i] & 1]); out.push(c); from = e + 1; }
    } else for (let more = true; more;) {               // a letter built from other letters (an accent on a base)
      const flags = gl.readUInt16BE(p), part = gl.readUInt16BE(p + 2); p += 4; let dx, dy, a = 1, b = 0, c = 0, d = 1;
      if (flags & 1) { dx = gl.readInt16BE(p); dy = gl.readInt16BE(p + 2); p += 4; } else { dx = gl.readInt8(p); dy = gl.readInt8(p + 1); p += 2; }
      const fx = () => { const v = gl.readInt16BE(p) / 16384; p += 2; return v; };
      if (flags & 8) a = d = fx(); else if (flags & 0x40) { a = fx(); d = fx(); } else if (flags & 0x80) { a = fx(); b = fx(); c = fx(); d = fx(); }
      for (const k of outline(part)) out.push(k.map(([x, y, on]) => [a * x + c * y + dx, b * x + d * y + dy, on]));
      more = !!(flags & 0x20);
    }
    return out;
  };
  const F = { upm, up, glyph, outline, step: g => t.hmtx.readUInt16BE(Math.min(g, wide - 1) * 4) };
  FONTS.set(path, F); return F;
}
/** How wide a line of text is, in pixels, at `px` pixels a letter square. */
export const textWidth = (F, str, px) => [...str].reduce((s, ch) => s + F.step(F.glyph(ch.codePointAt(0))), 0) * px / F.upm;

// A line of text as a grid of how much of each pixel the letters cover (0 to 1), `big` times bigger than asked.
function cover(F, str, px, big, pad) {
  const k = px * big / F.upm, top = Math.ceil(F.up * k), W = Math.ceil(textWidth(F, str, px * big)) + 2 * pad, H = Math.ceil(px * big * 1.6) + 2 * pad, cov = new Float32Array(W * H), segs = []; let pen = pad;
  for (const ch of str) {
    const g = F.glyph(ch.codePointAt(0));
    for (const c of F.outline(g)) {
      const P = []; c.forEach((q, i) => { const nx = c[(i + 1) % c.length]; P.push(q); if (!q[2] && !nx[2]) P.push([(q[0] + nx[0]) / 2, (q[1] + nx[1]) / 2, 1]); });     // two bends in a row have a point between them
      const s = P.findIndex(q => q[2]), R = [...P.slice(s), ...P.slice(0, s)], xy = q => [pen + q[0] * k, pad + top - q[1] * k]; let last = xy(R[0]);
      for (let i = 1; i <= R.length; i++) {
        const q = R[i % R.length];
        if (q[2]) { const e = xy(q); segs.push([last, e]); last = e; }
        else { const e = xy(R[(i + 1) % R.length]), m = xy(q), a = last; for (let n = 1; n <= 8; n++) { const u = n / 8, b = [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * m[0] + u * u * e[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * m[1] + u * u * e[1]]; segs.push([last, b]); last = b; } i++; }
      }
    }
    pen += F.step(g) * k;
  }
  const SUB = 4;                                       // 4 lines through each pixel row; along a line the cover is exact
  for (let y = 0; y < H; y++) for (let s = 0; s < SUB; s++) {
    const sy = y + (s + .5) / SUB, hits = [];
    for (const [a, b] of segs) if ((a[1] <= sy) !== (b[1] <= sy)) hits.push([a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]);
    hits.sort((p, q) => p[0] - q[0]); let wind = 0;
    for (let i = 0; i < hits.length - 1; i++) {
      wind += hits[i][1]; if (!wind) continue;
      const xa = Math.max(0, hits[i][0]), xb = Math.min(W, hits[i + 1][0]);
      for (let x = Math.floor(xa); x < xb; x++) cov[y * W + x] += (Math.min(xb, x + 1) - Math.max(xa, x)) / SUB;
    }
  }
  return { cov, W, H };
}
/** Draws `str` into an RGBA picture `img` (w pixels wide) with its top left corner at x, y. `stroke` adds an outline that many pixels thick.
 *  Like the draft, the letters are drawn 4 times bigger and shrunk. */
export function drawText(img, w, x, y, str, F, px, fill, stroke = 0, strokeFill = [0, 0, 0]) {
  const BIG = 4, pad = (stroke + 2) * BIG, { cov, W, H } = cover(F, str, px, BIG, pad), W4 = Math.ceil(W / BIG) * BIG, H4 = Math.ceil(H / BIG) * BIG, h = img.length / 4 / w;
  const lay = (c, rgb) => {                             // one colour through a cover grid, shrunk, onto the picture
    const pre = new Float32Array(W4 * H4 * 4); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = Math.min(1, c[j * W + i]), d = (j * W4 + i) * 4; pre[d] = rgb[0] * a; pre[d + 1] = rgb[1] * a; pre[d + 2] = rgb[2] * a; pre[d + 3] = 255 * a; }
    const sm = resize(pre, W4, H4, W4 / BIG, H4 / BIG), sw = W4 / BIG, x0 = Math.round(x) - pad / BIG, y0 = Math.round(y) - pad / BIG;
    for (let j = 0; j < H4 / BIG; j++) for (let i = 0; i < sw; i++) {
      const X = x0 + i, Y = y0 + j; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const s = (j * sw + i) * 4, a = Math.min(1, Math.max(0, sm[s + 3] / 255)); if (a <= 0) continue; const d = (Y * w + X) * 4, da = img[d + 3] / 255 * (1 - a), oa = a + da;
      for (let ch = 0; ch < 3; ch++) img[d + ch] = Math.round(Math.min(255, Math.max(0, (sm[s + ch] + img[d + ch] * da) / oa))); img[d + 3] = Math.round(oa * 255);
    }
  };
  if (stroke) {                                         // the outline: every pixel within `stroke` of a letter
    const r = stroke * BIG, fat = new Float32Array(W * H), reach = []; for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (a * a + b * b <= r * r) reach.push([a, b]);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = cov[j * W + i]; if (v > 0) for (const [a, b] of reach) { const X = i + a, Y = j + b; if (X >= 0 && Y >= 0 && X < W && Y < H && fat[Y * W + X] < v) fat[Y * W + X] = v; } }
    lay(fat, strokeFill);
  }
  lay(cov, fill);
}
