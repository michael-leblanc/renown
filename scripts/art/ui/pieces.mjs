// Shared pieces for the screen drafts that sit over the game (the HUD's family): plates, slots, buttons, bars, small painted scenes,
// the made-up camp behind, and text. In the look of the character screen (D240, D241), drawn with the screen kit.
// Most of it started in scripts/art/ui/hud.mjs; the drafts of the death screen, the loot window, the Reputation screen and the menu use it.
// Nothing here is a piece for the game yet. The window is 1152 x 648.
import { K, area, mask, layer, each, vnoise, box, ellipse, roundBox, poly, line, blur, texture, metal, shadow, over, shrink, resize, METALS } from './kit.mjs';
import { font, textWidth, drawText } from './text.mjs';
import { FONTS, paste, blank } from './character_screen.mjs';
import { scarPaint, SCAR } from './scar_scene.mjs';
import { writePng, readPng } from '../png.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const W = 1152, H = 648;
export const COL = { label: [196, 160, 98], value: [242, 234, 214], hint: [150, 142, 126], dim: [104, 98, 88], glow: [255, 232, 160], dark: [6, 6, 6] };   // D241; the glow is the waking glow's pale gold
export const BLOOD = [[255, 168, 132], [226, 66, 46], [158, 28, 26], [88, 12, 14], [34, 6, 8]];
export const AMBER = [[255, 240, 182], [240, 186, 84], [182, 116, 36], [100, 58, 16], [40, 22, 6]];
METALS.blood = BLOOD; METALS.amber = AMBER;
export const MATERIAL = { Iron: [52, 58, 66], Steel: [42, 58, 82], Bronze: [70, 52, 30], Cloth: [56, 56, 34], Leather: [64, 44, 30], Wood: [58, 46, 30], Gold: [72, 60, 24], Empty: [16, 16, 16] };   // the character screen's slot colours
export const FACE = {
  huge: ['AlegreyaSC-Bold', 44], big: ['AlegreyaSC-Bold', 28], mid: ['AlegreyaSC-Bold', 20], title: ['AlegreyaSC-Bold', 17], number: ['AlegreyaSC-Bold', 14],
  text: ['Alegreya-Bold', 15], line: ['Alegreya-Bold', 13], small: ['Alegreya-Bold', 11],
};

/* ---------- helpers ---------- */
export const R = Math.round, clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const ramp = (cols, t) => { t = clamp(t) * (cols.length - 1); const k = Math.min(cols.length - 2, Math.floor(t)); return mix(cols[k], cols[k + 1], t - k); };
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// Metal is shaded by its height on the screen (the kit's way). LIT lights a piece as if it were near the top; FULL shades it where it really is.
export const LIT = y => [W, Math.max(60, R(y / .3))], FULL = [W, H];
/** An area with `m` pixels of room all round for shadows and glows; `at` is where its picture goes. */
export const room = (x, y, w, h, m = 10) => { [x, y, w, h] = [x, y, w, h].map(R); return { ...area(x - m, y - m, w + 2 * m, h + 2 * m, 4), at: [x - m, y - m] }; };
export const done = L => [shrink(L), ...L.at];
export const plain = (M, rgb, alpha = 1) => { const L = layer(M); each(M, (x, y, i) => { if (M.m[i]) { L.c[i * 3] = rgb[0]; L.c[i * 3 + 1] = rgb[1]; L.c[i * 3 + 2] = rgb[2]; L.a[i] = alpha; } }); return L; };
/** A mask's shape as a soft light of one colour. */
export const halo = (M, rgb, strength, radius) => { const L = layer(M), s = blur(M.m, M.w, M.h, radius * K); for (let i = 0; i < s.length; i++) { L.c[i * 3] = rgb[0]; L.c[i * 3 + 1] = rgb[1]; L.c[i * 3 + 2] = rgb[2]; L.a[i] = Math.min(1, s[i] / 255 * strength); } return L; };
export const disc = (M, cx, cy, r, wd = 0, v = 255, keep = null) => ellipse(M, R((cx - r) * K), R((cy - r) * K), R((cx + r) * K), R((cy + r) * K), wd ? Math.max(1, Math.trunc(wd * K)) : 0, v, keep);
export const tri = (M, pts) => poly(M, pts.map(([x, y]) => [x * K, y * K]));
export const open = path => { const p = readPng(path); return { w: p.width, h: p.height, data: p.data }; };
const inside = (M, X, Y) => M.m[(Y - M.y) * M.w + X - M.x];

/* ---------- panels ---------- */
/** A slate plate with worn steel trim: a thick line, a thin one inside it, a stud in every corner. `alpha` lets the world show through. */
export function plate(x, y, w, h, { r = 7, alpha = 1, studs = true, thin = false, full = null } = {}) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y, w, h), ins = mask(A), trim = mask(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1;
  roundBox(ins, x * K, y * K, X1, Y1, r * K); roundBox(trim, x * K, y * K, X1, Y1, r * K, thin ? K : 2 * K);
  if (!thin) roundBox(trim, (x + 5) * K, (y + 5) * K, X1 - 5 * K, Y1 - 5 * K, Math.max(1, r - 4) * K, K);
  if (studs) for (const [sx, sy] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]) disc(trim, sx, sy, 2.6);
  const L = layer(A); texture(L, [24, 31, 33], (X, Y) => inside(ins, X, Y));
  each(A, (X, Y, i) => { if (L.a[i]) { const t = (Y / K - y) / h, k = 1.12 - .34 * t; for (let c = 0; c < 3; c++) L.c[i * 3 + c] *= k; L.a[i] = alpha; } });      // paler at the top
  const S = shadow(ins, .75 * alpha); over(S, L); over(S, shadow(trim, .5)); over(S, metal(trim, 'steel', full ?? LIT(y), .35)); return done(S);
}
/** The character screen's frame at any size: slate, two thin steel lines, a spike each way and a stud at every corner. */
export function frame(x, y, w, h) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y, w, h, 18), ins = mask(A), M = mask(A), L = layer(A);
  box(ins, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1); texture(L, [24, 31, 33], (X, Y) => inside(ins, X, Y));
  const trim = (d, wd) => { const m2 = mask(A); box(m2, (x + d) * K, (y + d) * K, (x + w - d) * K, (y + h - d) * K); box(m2, (x + d) * K + wd, (y + d) * K + wd, (x + w - d) * K - wd, (y + h - d) * K - wd, 0); for (let i = 0; i < m2.m.length; i++) if (m2.m[i]) M.m[i] = 255; };
  const spike = (cx, cy, ang, len = 16, wd = 3) => { const a = ang * Math.PI / 180, px = -Math.sin(a), py = Math.cos(a); poly(M, [[cx * K + px * wd * K, cy * K + py * wd * K], [cx * K + Math.cos(a) * len * K, cy * K + Math.sin(a) * len * K], [cx * K - px * wd * K, cy * K - py * wd * K]]); };
  trim(4, 3 * K); trim(10, K);
  for (const [cx, cy, a1, a2] of [[x + 4, y + 4, -90, 180], [x + w - 4, y + 4, -90, 0], [x + 4, y + h - 4, 90, 180], [x + w - 4, y + h - 4, 90, 0]]) { spike(cx, cy, a1); spike(cx, cy, a2); disc(M, cx, cy, 5); }
  const S = shadow(ins, .85); over(S, L); over(S, shadow(M)); over(S, metal(M, 'steel', [W, Math.max(H, y + h)], .35)); return done(S);
}
/** A dark stage with a pool of warm, smoky light, the character screen's way. The light's middle is cx, cy; it reaches rx, ry. */
export function stage(x, y, w, h, cx = x + w / 2, cy = y + h / 2, rx = w * .6, ry = h * .8, strength = 1) {
  const A = room(x, y, w, h, 4), L = layer(A), M = mask(A), dark = [22, 17, 14], warm = [96, 62, 40]; box(M, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1);
  each(A, (X, Y, i) => {
    if (!M.m[i]) return; const g = Math.max(0, 1 - Math.hypot((X - cx * K) / (rx * K), (Y - cy * K) / (ry * K))) ** 1.6, smoke = vnoise(X / (30 * K) + Math.sin(Y / (40 * K)), Y / (30 * K));
    const e = Math.min(X / K - x, x + w - X / K, Y / K - y, y + h - Y / K), rim = e < 1.2 ? .35 : 1;
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = (dark[c] + g * (.75 + .5 * smoke) * warm[c] * strength) * rim; L.a[i] = 1;
  });
  return done(L);
}
/** Open stitched leather with a steel buckle at its top middle, like the pack's satchel. */
export function leather(x, y, w, h, buckle = true) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y - 14, w, h + 14), hide = mask(A), seam = mask(A), bk = mask(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1;
  roundBox(hide, x * K, y * K, X1, Y1, 24 * K); roundBox(seam, (x + 8) * K, (y + 8) * K, X1 - 8 * K, Y1 - 8 * K, 18 * K, K);
  const L = layer(A); texture(L, [66, 42, 27], (X, Y) => inside(hide, X, Y), [9, 18], [1.2, 20]);
  const st = plain(seam, [196, 196, 196]); each(A, (X, Y, i) => { if ((X + Y) % (8 * K) >= 4 * K) st.a[i] = 0; }); over(L, st);
  const S = shadow(hide, .8); over(S, L);
  if (buckle) { roundBox(bk, (x + w / 2 - 30) * K, (y - 12) * K, (x + w / 2 + 30) * K, (y + 16) * K, 4 * K, 3 * K); over(S, shadow(bk)); over(S, metal(bk, 'steel', FULL, .35)); }
  return done(S);
}
/** A chest's boards seen from above: planks with two iron bands, a lock plate at the top middle. Like the chest in the world. */
export function boards(x, y, w, h) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y, w, h), wood = mask(A), iron = mask(A), hole = mask(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1, L = layer(A);
  roundBox(wood, x * K, y * K, X1, Y1, 5 * K);
  const plank = 31;
  each(A, (X, Y, i) => {
    if (!wood.m[i]) return; const py = Y / K - y, n = Math.floor(py / plank), in1 = py - n * plank, grain = vnoise(X / (46 * K) + n * 7.3, Y / (1.6 * K)), knot = vnoise(X / (13 * K) + n * 3.1, Y / (9 * K));
    let k = .78 + .34 * grain + (knot > .76 ? -.16 : 0) + ((n * 37) % 5 - 2) * .025; if (in1 < 1.3) k *= .42; else if (in1 < 2.6) k *= 1.16;            // the gap between two boards, and its lit edge
    k *= 1.08 - .3 * py / h; const e = Math.min(X / K - x, x + w - X / K, py, h - py); if (e < 2) k *= .5;
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = clamp([92, 64, 38][c] * k, 0, 255); L.a[i] = 1;
  });
  for (const bx of [x + 34, x + w - 34 - 16]) { box(iron, bx * K, (y - 2) * K, (bx + 16) * K, (y + h + 2) * K); }
  roundBox(iron, (x + w / 2 - 15) * K, (y - 6) * K, (x + w / 2 + 15) * K, (y + 24) * K, 4 * K);
  disc(hole, x + w / 2, y + 7, 3.2); box(hole, (x + w / 2 - 1.4) * K, (y + 7) * K, (x + w / 2 + 1.4) * K, (y + 16) * K);
  const S = shadow(wood, .85); over(S, L); over(S, shadow(iron, .7)); over(S, metal(iron, 'steel', FULL, .5));
  const studs = mask(A); for (const bx of [x + 34, x + w - 34 - 16]) for (let sy = y + 15; sy < y + h - 6; sy += plank) disc(studs, bx + 8, sy, 2.4); over(S, metal(studs, 'steel', LIT(y), .2)); over(S, plain(hole, [8, 7, 6]));
  return done(S);
}

/* ---------- slots, items, buttons, bars ---------- */
const SLOTS = new Map();
/** A slot's background, the character screen's way: its material's colour, paler in the middle, a thin gold edge, a dark line inside it. */
export function slot(x, y, w, h, material, round = false) {
  const key = [w, h, material, round].join(); if (!SLOTS.has(key)) {
    const A = area(0, 0, w, h), L = layer(A), M = mask(A), cw = A.w, ch = A.h, rgb = MATERIAL[material];
    if (round) ellipse(M, 0, 0, cw - 1, ch - 1); else box(M, 0, 0, cw - 1, ch - 1);
    each(A, (X, Y, i) => { if (!M.m[i]) return; const d = Math.hypot((X - cw / 2) / (cw / 2), (Y - ch / 2) / (ch / 2)), n = (vnoise(X / (4 * K), Y / (4 * K)) - .5) * 10; for (let c = 0; c < 3; c++) L.c[i * 3 + c] = clamp(rgb[c] * (1.35 - .6 * d) + n, 0, 255); L.a[i] = 1; });
    const edge = mask(A), inner = mask(A), wd = Math.trunc(1.5 * K);
    if (round) { ellipse(edge, 0, 0, cw - 1, ch - 1, wd); ellipse(inner, 2 * K, 2 * K, cw - 1 - 2 * K, ch - 1 - 2 * K, K); }
    else { box(edge, 0, 0, cw - 1, ch - 1); box(edge, wd, wd, cw - 1 - wd, ch - 1 - wd, 0); box(inner, 2 * K, 2 * K, cw - 1 - 2 * K, ch - 1 - 2 * K); box(inner, 3 * K, 3 * K, cw - 1 - 3 * K, ch - 1 - 3 * K, 0); }
    over(L, plain(edge, (material === 'Empty' ? [70, 66, 60] : [150, 130, 96]).map(c => c * 200 / 255))); over(L, plain(inner, [0, 0, 0])); SLOTS.set(key, shrink(L));
  }
  return [SLOTS.get(key), R(x), R(y)];
}
/** An item's pack picture (D237), the middle of it, `px` wide. */
export function item(name, px) {
  const s = open(`game/client/art/made/items/pack/${name}.png`), n = 50, o0 = 103, pre = new Float32Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const q = ((o0 + j) * s.w + o0 + i) * 4, a = s.data[q + 3] / 255, d = (j * n + i) * 4; pre[d] = s.data[q] * a; pre[d + 1] = s.data[q + 1] * a; pre[d + 2] = s.data[q + 2] * a; pre[d + 3] = s.data[q + 3]; }
  const out = resize(pre, n, n, px, px), o = blank(px, px);
  for (let i = 0; i < px * px; i++) { const a = clamp(R(out[i * 4 + 3]), 0, 255); if (a) { const k = 255 / Math.min(255, out[i * 4 + 3]); for (let c = 0; c < 3; c++) o.data[i * 4 + c] = clamp(R(out[i * 4 + c] * k), 0, 255); o.data[i * 4 + 3] = a; } }
  return o;
}
/** A slot of the pack's kind (50 x 70) with what it holds: [item, material, count]. Pushes to parts and texts. */
export function packSlot(parts, texts, x, y, holds, lit = false) {
  const w = 50, h = 70; parts.push(slot(x, y, w, h, holds ? holds[1] : 'Empty'));
  if (lit) parts.push(slotGlow(x, y, w, h));
  if (holds) { parts.push([item(holds[0], 46), x + 2, y + 12]); if (holds[2]) texts.push([holds[2], 'line', x + w - 5, y + h - 18, 'value', 'right', 2]); }
}
/** The pale gold line and glow round a slot that is pointed at. */
export function slotGlow(x, y, w, h) { const A = room(x - 2, y - 2, w + 4, h + 4, 8), M = mask(A); box(M, (x - 2) * K, (y - 2) * K, (x + w + 2) * K - 1, (y + h + 2) * K - 1); box(M, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, 0); return done(over(halo(M, COL.glow, 1.6, 3), plain(M, COL.glow))); }
/** The signs on the round buttons, drawn into mask M around cx, cy; s is their size (1 = about 20 across). */
export function sign(M, name, cx, cy, s = 1) {
  const P = (x, y) => [(cx + x * s) * K, (cy + y * s) * K], Ln = (a, b, c, d, w) => line(M, ...P(a, b), ...P(c, d), Math.max(1, Math.trunc(w * s * K)));
  if (name === 'Run') for (const o of [-6, 1]) poly(M, [P(o, -7), P(o + 3.5, -7), P(o + 8.5, 0), P(o + 3.5, 7), P(o, 7), P(o + 5, 0)]);
  if (name === 'Character') { disc(M, cx, cy - 4.5 * s, 4 * s); poly(M, [P(-8, 9), P(-6, 2.5), P(-2.5, 1), P(2.5, 1), P(6, 2.5), P(8, 9)]); }
  if (name === 'Skills') { Ln(0, 8, 0, 0, 1.6); Ln(0, 1, -7, -5, 1.6); Ln(0, 1, 7, -5, 1.6); Ln(0, 0, 0, -8, 1.6); for (const [x, y] of [[0, 8], [-7, -5], [7, -5], [0, -8]]) disc(M, cx + x * s, cy + y * s, 2.7 * s); }
  if (name === 'Map') { poly(M, [P(-9, -6), P(-3.6, -8), P(-3.6, 6), P(-9, 8)]); poly(M, [P(-2.6, -8), P(2.6, -6), P(2.6, 8), P(-2.6, 6)]); poly(M, [P(3.6, -6), P(9, -8), P(9, 6), P(3.6, 8)]); }
  if (name === 'Protected') { disc(M, cx, cy, 6.5 * s, 1.6 * s); poly(M, [P(0, -5), P(2, 0), P(0, 5), P(-2, 0)]); }
  if (name === 'Close') { Ln(-6, -6, 6, 6, 2.2); Ln(-6, 6, 6, -6, 2.2); }
  if (name === 'Morality') { Ln(0, -8, 0, 7, 1.5); Ln(-8, -5, 8, -5, 1.5); for (const o of [-8, 8]) { poly(M, [P(o - 4, 2), P(o + 4, 2), P(o, -5)]); box(M, ...P(o - 4.5, 2), ...P(o + 4.5, 3.6)); } box(M, ...P(-4, 7), ...P(4, 8.6)); }   // a pair of scales
  if (name === 'Fame') { poly(M, [P(-9, 2), P(-9, -6), P(-4.5, -1), P(0, -8), P(4.5, -1), P(9, -6), P(9, 2)]); box(M, ...P(-9, 4), ...P(9, 6.5)); }                                                             // a crown of renown
  if (name === 'Standing') { poly(M, [P(-7, -8), P(7, -8), P(7, 1), P(0, 9), P(-7, 1)]); poly(M, [P(-4, -5), P(4, -5), P(4, 0), P(0, 5), P(-4, 0)], 0); }                                                       // a shield
  if (name === 'Tale') { for (let k = 0; k < 3; k++) Ln(-7, -5 + k * 5, 7 - (k === 2 ? 5 : 0), -5 + k * 5, 1.6); }
}
/** A round button like the character screen's stat medallions: a bronze ring and sign on a dark face. `on` lights it. */
export function button(name, cx, cy, r, on = false) {
  const A = room(cx - r, cy - r, 2 * r, 2 * r, 10), face = mask(A), M = mask(A); disc(face, cx, cy, r); disc(M, cx, cy, r, 2.4 * r / 17); sign(M, name, cx, cy, r / 17);
  const S = on ? over(halo(face, COL.glow, .55, 5), shadow(face, .5)) : shadow(face, .8), F = layer(A);
  each(A, (X, Y, i) => { if (!face.m[i]) return; const d = Math.hypot(X - cx * K, Y - (cy - r * .25) * K) / (r * K), g = on ? clamp(1 - d) ** 1.3 : 0; const base = [26, 24, 22], warm = [150, 96, 40]; for (let c = 0; c < 3; c++) F.c[i * 3 + c] = base[c] * (1.15 - .4 * d) + g * warm[c]; F.a[i] = 1; });
  over(S, F); over(S, metal(M, 'bronze', on ? [W, 3000] : LIT(cy - r))); return done(S);
}
/** A wide button for a word: a dark face in a bronze edge with a diamond at each end. `on` lights it from inside. */
export function wordButton(x, y, w, h, on = false) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x - 8, y, w + 16, h, 14), face = mask(A), edge = mask(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1, cy = y + h / 2;
  roundBox(face, x * K, y * K, X1, Y1, 6 * K); roundBox(edge, x * K, y * K, X1, Y1, 6 * K, Math.trunc(2.2 * K)); roundBox(edge, (x + 4) * K, (y + 4) * K, X1 - 4 * K, Y1 - 4 * K, 3 * K, K);
  for (const ex of [x, x + w]) tri(edge, [[ex, cy - 7], [ex + 7, cy], [ex, cy + 7], [ex - 7, cy]]);
  const S = on ? over(halo(face, COL.glow, .7, 7), shadow(face, .6)) : shadow(face, .8), F = layer(A);
  each(A, (X, Y, i) => { if (!face.m[i]) return; const dx = (X / K - x - w / 2) / (w / 2), dy = (Y / K - cy) / (h / 2), g = on ? clamp(1 - Math.hypot(dx * .8, dy * 1.1)) ** 1.2 : 0, n = (vnoise(X / (5 * K), Y / (5 * K)) - .5) * 6; for (let c = 0; c < 3; c++) F.c[i * 3 + c] = [26, 24, 22][c] * (1.2 - .35 * (dy + 1) / 2) + n + g * [168, 104, 40][c]; F.a[i] = 1; });
  over(S, F); over(S, metal(edge, 'bronze', on ? [W, 3000] : LIT(y))); return done(S);
}
/** A bar: a dark trough with a steel edge, filled with liquid colour up to v (0 to 1).
 *  `part` 'under': the empty bar (v is 0). 'fill': only the liquid of a full bar (v is 1), nothing else, for the game to cut at v (the HUD's pieces). */
export function bar(x, y, w, h, v, cols, part = 'all') {
  if (part !== 'all') v = part === 'fill' ? 1 : 0;
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y, w, h, 6), trough = mask(A), edge = mask(A), L = layer(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1, end = (x + 2 + (w - 4) * v) * K;
  roundBox(trough, x * K, y * K, X1, Y1, h * K / 2); roundBox(edge, x * K, y * K, X1, Y1, h * K / 2, Math.trunc(1.4 * K));
  const inner = mask(A); roundBox(inner, (x + 2) * K, (y + 2) * K, X1 - 2 * K, Y1 - 2 * K, (h - 4) * K / 2);
  each(A, (X, Y, i) => {
    if (!trough.m[i]) return; let c = [9, 10, 11]; const wet = inner.m[i] && X < end; if (part === 'fill' && !wet) return;
    if (wet) { const t = (Y / K - y - 2) / (h - 4), n = vnoise(X / (9 * K), Y / (2.5 * K)); c = ramp(cols, .16 + .5 * t + (.5 - n) * .22); if (t < .3) c = mix(c, cols[0], .3 * (1 - t / .3)); if (end - X < 1.5 * K) c = mix(c, cols[0], .6); }
    for (let k = 0; k < 3; k++) L.c[i * 3 + k] = c[k]; L.a[i] = 1;
  });
  if (part === 'fill') return done(L);
  const S = shadow(trough, .7); over(S, L); over(S, metal(edge, 'steel', LIT(y), .35)); return done(S);
}
/** A cut bronze diamond, `a` wide and `b` tall from its middle cx, cy: four flat faces lit from the top left, a dark edge, an even light behind it.
 *  Drawn face by face, not with metal(): on a shape this small the kit's metal comes out soft and lopsided (Michael, 2026-11-18: "looks weird"). */
function gem(A, cx, cy, a, b, glow = .45) {
  const L = layer(A), small = Math.min(a, b);
  each(A, (X, Y, i) => {
    const x = (X + .5) / K - cx, y = (Y + .5) / K - cy, d = Math.abs(x) / a + Math.abs(y) / b;                                   // 1 on the diamond's edge
    if (d <= 1) { const face = x < 0 ? (y < 0 ? [255, 240, 184] : [208, 152, 76]) : (y < 0 ? [240, 198, 118] : [152, 102, 46]), k = d > 1 - 1.2 / small ? .22 : Math.abs(x) < .34 || Math.abs(y) < .34 ? 1.12 : 1; for (let c = 0; c < 3; c++) L.c[i * 3 + c] = clamp(face[c] * k, 0, 255); L.a[i] = 1; }
    else if (glow) { const g = Math.exp(-((((d - 1) * small) / 3.2) ** 2)) * glow; if (g > .004) { L.c[i * 3] = COL.glow[0]; L.c[i * 3 + 1] = COL.glow[1]; L.c[i * 3 + 2] = COL.glow[2]; L.a[i] = g; } }
  });
  return L;
}
/** A scale between two ends: a thin dark trough with steel notches, and a cut bronze diamond where v (0 to 1) falls. No v: no diamond. */
export function scale(x, y, w, v = null, notches = 5) {
  [x, y, w] = [x, y, w].map(R); const A = room(x - 8, y - 9, w + 16, 18, 8), trough = mask(A), nt = mask(A);
  roundBox(trough, x * K, (y - 2) * K, (x + w) * K, (y + 2) * K, 2 * K);
  for (let n = 0; n < notches; n++) { const nx = x + n * w / (notches - 1); box(nt, (nx - .8) * K, (y - 5) * K, (nx + .8) * K, (y + 5) * K); }
  const S = shadow(trough, .7); over(S, plain(trough, [9, 10, 11])); over(S, metal(nt, 'steel', LIT(y), .2));
  if (v !== null) over(S, gem(A, x + w * v, y, 6, 8.5));
  return done(S);
}
/** A scale's bronze diamond alone, its middle at cx, cy, cut to the height the scale gives it: the Reputation screen's pieces put it where v falls. */
export function scaleMark(cx, cy) { return done(gem(room(cx - 6, cy - 9, 12, 18, 8), cx, cy, 6, 8.5)); }
/** A small steel crest for the middle of an edge: a diamond between two spikes, a bronze stud in it. */
export function crest(cx, y, s = 1) {
  const A = room(cx - 30 * s, y - 9 * s, 60 * s, 18 * s, 6), M = mask(A), stud = mask(A);
  tri(M, [[cx, y - 8 * s], [cx + 9 * s, y], [cx, y + 8 * s], [cx - 9 * s, y]]); tri(M, [[cx + 7 * s, y - 3 * s], [cx + 28 * s, y], [cx + 7 * s, y + 3 * s]]); tri(M, [[cx - 7 * s, y - 3 * s], [cx - 28 * s, y], [cx - 7 * s, y + 3 * s]]);
  disc(stud, cx, y, 2.6 * s); const S = shadow(M, .8); over(S, metal(M, 'steel', LIT(y), .35)); over(S, metal(stud, 'bronze', LIT(y))); return done(S);
}
/** A thin steel rule with a small diamond at its inner end (x0), for either side of a line of text. */
export function rule(x0, x1, y) { const a = Math.min(x0, x1), A = room(a - 4, y - 3, Math.abs(x1 - x0) + 8, 6, 6), M = mask(A); box(M, a * K, y * K - 1, (a + Math.abs(x1 - x0)) * K, y * K + 1); tri(M, [[x0, y - 3], [x0 + 4, y], [x0, y + 3], [x0 - 4, y]]); return done(over(shadow(M, .8), metal(M, 'steel', LIT(y), .2))); }
/** A dark inset for a line of typed text: a trough with a steel edge. */
export function field(x, y, w, h = 26) {
  [x, y, w, h] = [x, y, w, h].map(R); const A = room(x, y, w, h, 6), trough = mask(A), edge = mask(A), X1 = (x + w) * K - 1, Y1 = (y + h) * K - 1; roundBox(trough, x * K, y * K, X1, Y1, 4 * K); roundBox(edge, x * K, y * K, X1, Y1, 4 * K, Math.trunc(1.4 * K));
  const S = shadow(trough, .6); over(S, plain(trough, [10, 11, 12])); over(S, metal(edge, 'steel', LIT(y), .35)); return done(S);
}

/* ---------- small painted scenes ---------- */
/** A round bronze frame for a small picture of radius r: push it after the picture. */
export function roundFrame(parts, cx, cy, r, kind = 'bronze') {
  const B = room(cx - r - 6, cy - r - 6, 2 * r + 12, 2 * r + 12, 10), ringM = mask(B), inner = mask(B), wd = Math.max(4, r * .135); disc(ringM, cx, cy, r + wd - .4, wd); disc(inner, cx, cy, r + .6, 1.4);
  const T = plain(inner, [8, 6, 5]); over(T, metal(ringM, kind, LIT(cy - r), kind === 'steel' ? .35 : 0)); parts.push(done(T));
}
/** A small round painted picture: paint(x, y) gives the colour of each point, x and y in pixels from the middle. With its shadow, no frame. `dimmed` greys it. */
export function picture(parts, cx, cy, r, paint, dimmed = 0) {
  const A = room(cx - r - 6, cy - r - 6, 2 * r + 12, 2 * r + 12, 10), back = mask(A), L = layer(A); disc(back, cx, cy, r + 5);
  each(A, (X, Y, i) => { const x = X / K - cx, y = Y / K - cy, d = Math.hypot(x, y) / r; if (d > 1.03) return; let c = paint(x, y); if (dimmed) { const g = (c[0] + c[1] + c[2]) / 3; c = c.map(v => (v + (g - v) * dimmed) * (1 - .45 * dimmed)); } const dim = 1 - .45 * d ** 4; for (let k = 0; k < 3; k++) L.c[i * 3 + k] = clamp(c[k] * dim, 0, 255); L.a[i] = 1; });
  parts.push(done(over(shadow(back, .85), L)));
}
/** Dawndoor's lone doorway (D108) with the sun coming up over the Long Water behind it (D99). Plain old stone, no carvings (D68).
 *  Painted for a picture of radius 40; `r` scales it. */
export function dawnDoor(r = 40) {
  const s = 40 / r, hy = 10, by = 25, gap = (x, y) => y >= -7 ? Math.abs(x) - 9 : Math.hypot(x, y + 7) - 9;
  return (X, Y) => {
    const x = X * s, y = Y * s, ground = by + 1 + x * x * .004 + (vnoise(x / 4 + 30, 2.2) - .5) * 2.5, t = clamp((y + 40) / (hy + 40));
    let c = t < .5 ? mix([22, 26, 46], [78, 56, 84], t / .5) : t < .82 ? mix([78, 56, 84], [214, 118, 70], (t - .5) / .32) : mix([214, 118, 70], [252, 206, 128], (t - .82) / .18);
    c = mix(c, [236, 150, 112], smooth(.56, .74, vnoise(x / 13 + 5, y / 3.2 + 9)) * smooth(.25, .5, t) * (1 - smooth(.8, .95, t)) * .55);
    c = mix(c, [255, 226, 160], Math.exp(-(x * x + (y - hy) ** 2) / 420) * .7); if (Math.hypot(x, y - hy) < 8.5) c = [255, 246, 208];
    if (y > hy) {
      const far = (y - hy) / (40 - hy); c = mix([96, 80, 84], [16, 30, 44], smooth(0, .5, far));
      c = mix(c, [255, 206, 130], clamp(1 - Math.abs(x) / (3.5 + (y - hy) * .55)) * (vnoise(x / 2.4 + 3, y / .9) > .42 ? 1 : .25) * (1 - far * .6) * .9);
      if (vnoise(x / 3 + 60, y / .8) > .78) c = mix(c, [230, 170, 120], .25 * (1 - far));
    }
    if (y > ground) { c = mix([20, 22, 16], [10, 11, 9], smooth(0, 8, y - ground)); if (y - ground < 1.2) c = mix(c, [120, 84, 46], .6); c = mix(c, [150, 92, 44], clamp(1 - Math.abs(x) / (8 + (y - by) * 1.1)) * .6 * (1 - smooth(0, 14, y - by))); }
    const top = -25 + (vnoise(x / 3 + 5, 5.5) - .5) * 2.2, e = gap(x, y);
    if (Math.abs(x) <= 17 && y >= top && y <= ground + 1 && e > 0 && !(Math.abs(x) > 15.5 && y < top + 2)) {
      const n = vnoise(x / 3.5 + 7, y / 2.5), course = Math.floor((y + 40) / 5) % 2 ? x + 4 : x, joint = (y + 40) % 5 < .7 || (course + 40) % 8 < .7 ? .74 : 1;
      c = [36, 33, 36].map(b => (b + (n - .5) * 12) * joint); if (e < 2.4) c = mix(c, [246, 172, 98], (1 - e / 2.4) * .9);
    }
    return c;
  };
}
/** Oldscar's cliff and its scar (scar_scene.mjs) as a small picture: a cut of the full painting, `reach` of its pixels from the scar's middle to the picture's edge. */
export function scarCliff(r = 40, reach = 215) { return (X, Y) => scarPaint(SCAR.MX + X * reach / r, SCAR.MY + 14 + Y * reach / r); }
/** A town's ring of standing stones (D71) before dawn, a pale gold light rising in its middle, the waking glow's colour (D89).
 *  Old stone, no carvings (D68). Painted for radius 40; `r` scales it. */
export function wakingRing(r = 40) {
  const s = 40 / r, stones = [];
  for (let k = 0; k < 8; k++) { const ang = (k + .5) / 8 * Math.PI * 2, sx = Math.cos(ang) * 25, sy = 12 + Math.sin(ang) * 8, near = (Math.sin(ang) + 1) / 2, kind = (k * 5) % 3; stones.push({ x: sx, by: sy, h: (kind === 2 ? 9 : kind ? 17 : 21) * (.72 + .5 * near), w: (kind === 2 ? 4.4 : 3.4) * (.72 + .5 * near), lean: kind === 1 ? .16 : kind === 2 ? -.05 : .03, near }); }
  stones.sort((p, q) => p.by - q.by);
  return (X, Y) => {
    const x = X * s, y = Y * s, hz = 4, t = clamp((y + 40) / (hz + 40));
    let c = mix(mix([10, 12, 26], [30, 34, 62], smooth(0, .7, t)), [92, 84, 104], smooth(.7, 1, t));                                                // night, the first grey at the land's edge
    const star = vnoise(x * 2.1 + 40, y * 2.1 + 9); if (y < hz - 6 && star > .86) c = mix(c, [236, 232, 220], (star - .86) / .14 * (1 - t * .8));
    if (y > hz + (vnoise(x / 7 + 2, 8.8) - .5) * 3 - Math.exp(-(((x + 30) / 14) ** 2)) * 5) c = mix([22, 30, 30], [8, 12, 12], smooth(hz, 40, y));                                             // the land
    const pool = Math.exp(-((x / 20) ** 2 + ((y - 13) / 6.5) ** 2));                                                                                 // the light lying on the ground in the ring
    if (y > hz) c = mix(c, [214, 190, 120], pool * .55);
    const paint = st => {
      const up = (st.by - y) / st.h; if (up < 0 || up > 1) return; const mid = st.x + st.lean * (st.by - y) + (vnoise(y / 4 + st.x, 3.3) - .5) * 1.2, wd = st.w * (up > .78 ? 1 - (up - .78) / .22 * .55 : 1) * (.92 + .16 * vnoise(st.x + 9, y / 5)), d = (x - mid) / wd;
      if (Math.abs(d) > 1) return; const toward = st.x > 0 ? -d : d, n = vnoise(x / 1.6 + st.x * 3, y / 2.2);                                          // the side that faces the light
      c = [30, 31, 36].map(b => b * (.75 + .5 * n) * (.7 + .5 * st.near)); c = mix(c, [232, 204, 132], clamp(toward * .9 + .15) * (.35 + .5 * (1 - up)) * (st.near < .5 ? .5 : 1));
    };
    for (const st of stones) if (st.near < .5) paint(st);
    const col = Math.exp(-((x / 5.5) ** 2)) * smooth(15, 5, y) * smooth(-40, -8, y), core = Math.exp(-((x / 1.8) ** 2)) * smooth(15, 8, y) * smooth(-34, -2, y);   // the light rising
    c = mix(c, [255, 232, 160], clamp(col * .5 + core * .5)); const mote = vnoise(x * 1.3 + 5, y * .9 + 60); if (Math.abs(x) < 9 && y < 12 && y > -30 && mote > .83) c = mix(c, [255, 246, 208], (mote - .83) / .17 * (1 - Math.abs(x) / 9));
    for (const st of stones) if (st.near >= .5) paint(st);
    return c;
  };
}

/* ---------- the characters and the world behind ---------- */
const CD = JSON.parse(readFileSync('prototype/character/character_data.json', 'utf8')), FP = CD.sheet.frame_px;
/** A Creator character (D121), one frame as drawn (128 x 128): each part's grey swapped for its tint. */
export function figure(race, dir, tints = {}, anim = 'Idle', frame = 0) {
  const T = { ...CD.races[race].tints, ...tints }, row = CD.directions.indexOf(dir), out = blank(FP, FP);
  for (const part of CD.layer_order[dir]) {
    if (part === 'Shadow') continue; const s = open(`game/client/art/creator/${part}/${anim}.png`), t = [1, 3, 5].map(i => parseInt(T[part].slice(i, i + 2), 16)), cell = blank(FP, FP), fx = Math.min(frame, s.w / FP - 1) * FP;
    for (let j = 0; j < FP; j++) for (let i = 0; i < FP; i++) { const p = ((row * FP + j) * s.w + fx + i) * 4, q = (j * FP + i) * 4; for (let c = 0; c < 3; c++) cell.data[q + c] = Math.min(255, Math.floor(s.data[p + c] * t[c] / (CD.sheet.grey_ref * 255))); cell.data[q + 3] = s.data[p + 3]; }
    paste(out, cell, 0, 0);
  }
  return out;
}
export const YOU = { Shield1: '#7a5230' };                 // a wooden round shield (D220), as on the character screen
const faded = (p, k) => { const o = { w: p.w, h: p.h, data: Buffer.from(p.data) }; for (let i = 3; i < o.data.length; i++) o.data[i] = R(o.data[i] * k); return o; };
const frame0 = p => { const s = p.h, o = blank(s, s); for (let j = 0; j < s; j++) p.data.copy(o.data, j * s * 4, j * p.w * 4, j * p.w * 4 + s * 4); return o; };
/** A made-up camp in the game's art. `you`: 'glow' (newly woken, D89), 'plain', 'dead' (lying where it fell) or 'none'. `at`: the screen place of tile 0,0.
 *  `chest`: 'open' or 'closed'. `yours`: your tile. `race`: yours, drawn the test game's way (D121): the same parts, tinted and scaled.
 *  `body`: someone else lying where they fell, { at: tile, race, tints, facing }, or null (the default: nobody). */
export function world({ you = 'glow', at = [576, 350], chest = 'closed', yours = [0, 0], facing = 'S', race = 'human', body = null } = {}) {
  const iso = (i, j) => [at[0] + (i - j) * 64, at[1] + (i + j) * 32];
  const B = blank(W, H, [30, 32, 36, 255]), g = open('game/client/art/tiles/Ground A2_S.png'), made = 'prototype/art/made/', tiles = 'game/client/art/tiles/', things = [];
  for (let j = -14; j < 16; j++) for (let i = -14; i < 16; i++) { const [x, y] = iso(i, j); if (x > -200 && x < W + 200 && y > -100 && y < H + 260) paste(B, g, x - 128, y - 208); }
  const prop = (dir, n, i, j, sh = null) => things.push({ d: i + j, i, draw: () => { const [x, y] = iso(i, j); if (sh) paste(B, faded(open(`${dir}${sh}.png`), .35), x - 128, y - 208); paste(B, open(`${dir}${n}.png`), x - 128, y - 208); } });
  const who = (dir, i, j, tints, glow = false, anim = 'Idle', fr = 0, kind = 'human') => things.push({ d: i + j, i, draw: () => {
    const [x, y] = iso(i, j), f = figure(kind, dir, tints, anim, fr), [kx, ky] = CD.races[kind].scale.map(v => v * CD.sprite_scale), w = R(FP * kx), hh = R(FP * ky), pic = blank(w, hh);
    for (let b = 0; b < hh; b++) for (let a = 0; a < w; a++) { const p = (Math.min(FP - 1, Math.floor(b / ky)) * FP + Math.min(FP - 1, Math.floor(a / kx))) * 4; f.data.copy(pic.data, (b * w + a) * 4, p, p + 4); }
    if (glow) paste(B, frame0(open(`${made}effects/Waking Glow.png`)), x - 128, y - 208);
    paste(B, pic, x - R(CD.sheet.foot_origin[0] * kx), y - R(CD.sheet.foot_origin[1] * ky));
    if (glow) paste(B, frame0(open(`${made}effects/Waking Glow Front.png`)), x - 128, y - 208);
  } });
  const ch = chest === 'open' ? ['Chest A1 Open_S', 'Chest Shadow A1 Open_S'] : ['Chest A1_S', 'Chest Shadow A1_S'];
  prop(made, 'Tent A1_S', 1, -3, 'Tent Shadow A1_S'); prop(made, 'Campfire A1_S', 1, -1, 'Campfire Shadow A1_S'); prop(made, 'Log Seat A1_S', 2, -1, 'Log Seat Shadow A1_S');
  prop(made, 'Crate A1_S', -3, 1, 'Crate Shadow A1_S'); prop(made, 'Barrel A1_S', -3, 2, 'Barrel Shadow A1_S'); prop(made, ch[0], 3, 1, ch[1]);
  prop(made, 'Fence A1_S', -3, -3, 'Fence Shadow A1_S'); prop(made, 'Fence A1_S', -2, -4, 'Fence Shadow A1_S');
  prop(tiles, 'Tree A1_S', -5, -2); prop(tiles, 'Tree A2_S', 5, -2); prop(tiles, 'Tree A1_S', 4, -5); prop(tiles, 'Stone A1_S', 7, 0); prop(tiles, 'Stone A2_S', -5, 3);
  if (you !== 'none') who(facing, ...yours, YOU, you === 'glow', you === 'dead' ? 'Die' : 'Idle', you === 'dead' ? 14 : 0, race);
  if (body) who(body.facing ?? 'S', ...body.at, body.tints ?? {}, false, 'Die', 14, body.race ?? 'human');
  who('SW', 3, -1, { Chest1: '#8a4a3a', Head1: '#3a2a1a', Legs1: '#6a5a3a' }); who('SE', -2, -2, { Chest1: '#4a5560', Head1: '#2a2420', Legs1: '#3a3a40', Shield1: '#55606a' });
  things.sort((a, b) => a.d - b.d || a.i - b.i).forEach(t => t.draw());
  return B;
}
/** Dims a whole picture: `k` how dark (0 to 1), `grey` how much colour it loses, and darker still towards the corners. */
export function dim(S, k = .5, grey = .5, tint = [18, 20, 26]) {
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
    const q = (y * S.w + x) * 4, g = (S.data[q] + S.data[q + 1] + S.data[q + 2]) / 3, v = 1 - .35 * Math.hypot((x - S.w / 2) / (S.w / 2), (y - S.h / 2) / (S.h / 2)) ** 2;
    for (let c = 0; c < 3; c++) S.data[q + c] = clamp(R(((S.data[q + c] + (g - S.data[q + c]) * grey) * (1 - k) + tint[c] * k) * v), 0, 255);
  }
  return S;
}

/* ---------- text, and putting a picture together ---------- */
export const F = k => font(join(FONTS, `${FACE[k][0]}.woff`)), wide = (str, k) => textWidth(F(k), str, FACE[k][1]);
/** Breaks a sentence into lines no wider than `max`. */
export function wrap(str, k, max) { const out = []; let cur = ''; for (const word of str.split(' ')) { const next = cur ? `${cur} ${word}` : word; if (cur && wide(next, k) > max) { out.push(cur); cur = word; } else cur = next; } if (cur) out.push(cur); return out; }
/** Pushes a wrapped paragraph to texts; returns the y under it. */
export function para(texts, str, k, x, y, max, colour, step = FACE[k][1] + 5, outline = 0) { for (const l of wrap(str, k, max)) { texts.push([l, k, x, y, colour, 'left', outline]); y += step; } return y; }
/** Puts parts ([picture, x, y]) then texts ([string, face, x, y, colour, align, outline]) on S, then `tops` (more parts) over the text. */
export function draw(S, parts, texts, tops = []) {
  for (const [p, x, y] of parts) paste(S, p, x, y);
  for (const [str, k, x, y, colour, align = 'left', outline = 0] of texts) { const w = wide(str, k), at = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; drawText(S.data, S.w, at, y, str, F(k), FACE[k][1], Array.isArray(colour) ? colour : COL[colour], outline, COL.dark); }
  for (const [p, x, y] of tops) paste(S, p, x, y);
  return S;
}
/** A word as a mask, for metal letters: drawn `px` tall with its top left at x, y, into mask M. */
export function wordMask(M, str, face, px, x, y) {
  const w = M.w, h = M.h, buf = Buffer.alloc(w * h * 4); drawText(buf, w, x * K - M.x, y * K - M.y, str, font(join(FONTS, `${face}.woff`)), px * K, [255, 255, 255]);
  for (let i = 0; i < w * h; i++) if (buf[i * 4 + 3] > 127) M.m[i] = 255;
}
export const wordWidth = (str, face, px) => textWidth(font(join(FONTS, `${face}.woff`)), str, px);
export const save = (S, out, t0, note = 'It holds bought art: never commit it.') => { mkdirSync(dirname(out), { recursive: true }); writePng(out, S.data, S.w, S.h); console.log(`${out} (${S.w} x ${S.h}) in ${((Date.now() - t0) / 1000).toFixed(1)} s. ${note}`); };
export { paste, blank };
/** A small metal diamond: a bullet for a list, or an ornament. */
export function diamond(cx, cy, s = 4) { return done(gem(room(cx - s, cy - s, 2 * s, 2 * s, 5), cx, cy, s, s, 0)); }
/** A scroll bar for a list that goes on: a thin dark trough with a bronze thumb. `from` and `size` (0 to 1 of the trough) say where the thumb starts and how long it is.
 *  `part` 'trough': the trough alone. 'thumb': the thumb and its shadow alone (the death screen's pieces). */
export function scrollbar(x, y, h, from, size, part = 'all') {
  [x, y, h] = [x, y, h].map(R); const A = room(x - 4, y, 8, h, 6), trough = mask(A), thumb = mask(A), ty = R(y + 1 + (h - 2) * from), th = Math.max(16, R((h - 2) * size));
  roundBox(trough, (x - 2) * K, y * K, (x + 2) * K - 1, (y + h) * K - 1, 2 * K); roundBox(thumb, (x - 3) * K, ty * K, (x + 3) * K - 1, (ty + th) * K - 1, 3 * K);
  const S = shadow(trough, .6), T = layer(A); over(S, plain(trough, [9, 10, 11]));
  each(A, (X, Y, i) => { if (!thumb.m[i]) return; const d = (X / K - x) / 3, k = 1.15 - .5 * Math.abs(d + .25); for (let c = 0; c < 3; c++) T.c[i * 3 + c] = clamp([214, 166, 92][c] * k, 0, 255); T.a[i] = 1; });
  if (part === 'trough') return done(S);
  if (part === 'thumb') return done(over(shadow(thumb, .5), T));
  over(S, shadow(thumb, .5)); over(S, T); return done(S);
}
/** Fades what is under it into a plate's slate, from nothing at its top to nearly solid at its bottom: laid over the last line of a list that goes on.
 *  Give it to draw() as one of `tops`, so it lies over the text. `tone` is how pale the plate is there (1.12 at a plate's top, .78 at its bottom). */
export function fade(x, y, w, h, tone = .95) {
  const A = room(x, y, w, h, 0), L = layer(A);
  each(A, (X, Y, i) => { const t = clamp((Y / K - y) / h), in1 = X / K >= x && X / K < x + w && Y / K >= y && Y / K < y + h; if (!in1) return; for (let c = 0; c < 3; c++) L.c[i * 3 + c] = [24, 31, 33][c] * tone; L.a[i] = t ** 1.4 * .96; });
  return done(L);
}
/** A heading on a plate's top edge: the word, with a steel rule each side of it. */
export function heading(parts, texts, str, cx, y, half, k = 'mid', colour = 'value') { const w = wide(str, k); texts.push([str, k, cx, y, colour, 'center', 1]); const ry = y + FACE[k][1] * .62; parts.push(rule(cx - w / 2 - 10, cx - half, ry), rule(cx + w / 2 + 10, cx + half, ry)); }

/* ---------- cutting a screen into pieces (the HUD's and the death screen's) ---------- */
/** Parts ([picture, x, y], in the window's pixels) put together as one picture, cut to what is not clear: { img, at }. */
export function bake(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [p, x, y] of parts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + p.w); y1 = Math.max(y1, y + p.h); }
  const B = blank(x1 - x0, y1 - y0); for (const [p, x, y] of parts) paste(B, p, x - x0, y - y0);
  let a0 = B.w, b0 = B.h, a1 = -1, b1 = -1; for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) if (B.data[(j * B.w + i) * 4 + 3]) { a0 = Math.min(a0, i); a1 = Math.max(a1, i); b0 = Math.min(b0, j); b1 = Math.max(b1, j); }
  const w = a1 - a0 + 1, h = b1 - b0 + 1, img = blank(w, h); for (let j = 0; j < h; j++) B.data.copy(img.data, j * w * 4, ((b0 + j) * B.w + a0) * 4, ((b0 + j) * B.w + a0 + w) * 4);
  return { img, at: [x0 + a0, y0 + b0] };
}
/** Cuts a picture: only the pixels for which keep(x, y) (in the picture's own pixels) is true. */
export function cut(p, keep) { const o = blank(p.w, p.h); for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) if (keep(i, j)) p.data.copy(o.data, (j * p.w + i) * 4, (j * p.w + i) * 4, (j * p.w + i) * 4 + 4); return o; }
