// Where two ground kinds meet (sand and grass first, Oldscar's dry west against the green east).
// The "over" ground (grass) spills a ragged fringe onto the "base" ground (sand) beside it, so a
// border never shows the tiles' straight edges. Each fringe is cut out of the over piece itself by a
// mask made here (maths, no image model), so its pixels are the tileset's own grass.
//
// Pieces, in the ground pieces' format (256 x 256, tile middle at 128,208), each drawn on top of a base tile:
//   Edge N, E, S, W    the over ground is the neighbour on that side (N = -y, E = +x, S = +y, W = -x,
//                      the sides of game/client/land/land_tiles.gd), 3 variants each
//   Corner N, E, S, W  the over ground is only the diagonal neighbour at that corner (N = top corner,
//                      between the N and W sides; as CORNERS in land_tiles.gd), 2 variants each
//   Inner N, E, S, W   both sides at that corner are over ground: rounds off the base's point there, 2 variants each
// A tile takes every edge whose neighbour is over ground, every corner whose diagonal is over ground
// while both sides beside it are not, and every inner corner whose two sides are over ground.
// Every fringe is exactly D0 deep where it reaches a tile's corner, so pieces meet across tiles.
//
//   node scripts/art/ground_edge.mjs --base "<sand piece.png>" --over "<grass piece.png>" [--out dir] [--look file.png]
//
// Writes the pieces into --out (default prototype/shots/ground-edge/) and one picture to look at
// (default prototype/shots/ground-edge.png): the same patch without and with the fringe, then a close-up.
// The pieces are cut from bought art: never commit them; the client can cut them the same way at load.
import { readPng, writePng } from './png.mjs';
import { h3, vn3, clamp } from './kit.mjs';
import { join } from 'node:path';

const AX = 128, AY = 208, HW = 64, HH = 32, SIZE = 256;
export const D0 = 0.24;              // depth of every fringe at a tile's corner, in tiles
const SIDES = ['N', 'E', 'S', 'W'];
const EDGE_VARIANTS = 3, CORNER_VARIANTS = 2, INNER_R = 0.5;

/** Tile-local (lx, ly), each -0.5 to 0.5 on the top face, for a pixel; blades above the face are read at
 *  the face's back edge below them. kind: 0 top face, 1 above it (blades), 2 the slab's side (never cut). */
function local(px, py) {
  const dx = (px + .5 - AX) / HW; let dy = (py + .5 - AY) / HH; let kind = 0;
  const top = -(1 - Math.abs(dx));
  if (Math.abs(dx) > 1) return null;
  if (dy < top) { dy = top; kind = 1; } else if (dy > -top) kind = 2;
  return { lx: (dx + dy) / 2, ly: (dy - dx) / 2, kind };
}
/** Distance in from a side's edge (s) and place along it (t, 0 to 1). */
function edgeFrame(side, lx, ly) {
  if (side === 'N') return [ly + .5, lx + .5];
  if (side === 'E') return [.5 - lx, ly + .5];
  if (side === 'S') return [.5 - ly, .5 - lx];
  return [lx + .5, .5 - ly];
}
/** Distances from a corner along its two sides. */
function cornerFrame(c, lx, ly) {
  if (c === 'N') return [lx + .5, ly + .5];
  if (c === 'E') return [.5 - lx, ly + .5];
  if (c === 'S') return [.5 - lx, .5 - ly];
  return [lx + .5, .5 - ly];
}
/** A wavy line from 0 to 1 that is exactly 0 at both ends. */
function wave(t, seed) {
  const env = Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), .7);
  let n = 0;
  [[1.3, .55], [2.7, .3], [5.9, .15]].forEach(([f, a], i) => { n += a * Math.sin(6.2832 * (f * t + h3(seed, i, 1))); });
  return env * n;
}

/** The mask of one piece: true where the over ground shows. kind: 'edge' or 'corner'. */
function maskFn(kind, side, v) {
  const seed = ({ edge: 100, corner: 200, inner: 300 })[kind] + SIDES.indexOf(side) * 10 + v;
  return (px, py, L) => {
    const blade = (h3(px, 7, seed) - .5) * .05 + (h3(px, py >> 2, seed + 1) - .5) * .02;   // ragged in columns, like blades
    let s, depth, along;
    if (kind === 'inner') {           // both sides are over ground: round off the base's point at this corner
      const [a, b] = cornerFrame(side, L.lx, L.ly), R = INNER_R + .06 * wave(Math.atan2(b, a) / (Math.PI / 2), seed);
      return a < R && b < R && Math.hypot(R - a, R - b) > R - blade;
    }
    if (kind === 'edge') {
      [s, along] = edgeFrame(side, L.lx, L.ly);
      if (along < -.02 || along > 1.02) return false;
      depth = D0 + .14 * wave(along, seed);
    } else {
      const [a, b] = cornerFrame(side, L.lx, L.ly);
      s = Math.hypot(a, b); along = Math.atan2(b, a) / (Math.PI / 2);
      depth = D0 + .07 * wave(along, seed);
    }
    if (s < depth + blade) return true;
    // a few loose clumps just past the line, none near the ends
    const env = Math.sin(Math.PI * clamp(along, 0, 1));
    const past = s - depth;
    if (past > 0 && past < .2 && env > .3) {
      const c = vn3(L.lx * 9, L.ly * 9, seed);
      return c > .62 + past * 1.6 + (1 - env) * .3;
    }
    return false;
  };
}

/** Cuts one piece out of the over ground: its face pixels where the mask is on. Also gives the piece's shade:
 *  a soft dark line on the base just below the fringe (the grass stands a little above the sand). A tile draws
 *  every shade of its pieces first, then the pieces, so one piece's shade never darkens another's grass. */
function cut(over, mask) {
  const out = Buffer.alloc(SIZE * SIZE * 4), shade = Buffer.alloc(SIZE * SIZE * 4), on = new Uint8Array(SIZE * SIZE);
  for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
    const L = local(px, py); if (!L || L.kind !== 0) continue;   // the face only: the over tiles behind draw their own blades
    const i = py * SIZE + px; if (over.data[i * 4 + 3] === 0) continue;
    if (!mask(px, py, L)) continue;
    on[i] = 1; over.data.copy(out, i * 4, i * 4, i * 4 + 4);
  }
  for (let py = 2; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
    const i = py * SIZE + px; if (on[i]) continue;
    const L = local(px, py); if (!L || L.kind !== 0) continue;
    if (on[i - SIZE] || on[i - 2 * SIZE]) shade[i * 4 + 3] = 70;   // black at 70/255
  }
  return [out, shade];
}

export function makePieces(over) {
  const pieces = {};
  for (const side of SIDES) {
    for (let v = 0; v < EDGE_VARIANTS; v++) pieces[`Edge ${side}${v + 1}`] = cut(over, maskFn('edge', side, v));
    for (let v = 0; v < CORNER_VARIANTS; v++) pieces[`Corner ${side}${v + 1}`] = cut(over, maskFn('corner', side, v));
    for (let v = 0; v < CORNER_VARIANTS; v++) pieces[`Inner ${side}${v + 1}`] = cut(over, maskFn('inner', side, v));
  }
  return pieces;
}

/** The pieces a base tile at (x, y) takes, given isOver(x, y). Same tile, same variants. */
export function piecesFor(x, y, isOver) {
  const nb = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const corners = { N: ['N', 'W', [-1, -1]], E: ['N', 'E', [1, -1]], S: ['E', 'S', [1, 1]], W: ['S', 'W', [-1, 1]] };
  const out = [];
  for (const s of SIDES) if (isOver(x + nb[s][0], y + nb[s][1])) out.push(`Edge ${s}${1 + Math.floor(h3(x, y, 31 + SIDES.indexOf(s)) * EDGE_VARIANTS)}`);
  for (const c of SIDES) {
    const [a, b, d] = corners[c];
    if (isOver(x + d[0], y + d[1]) && !isOver(x + nb[a][0], y + nb[a][1]) && !isOver(x + nb[b][0], y + nb[b][1]))
      out.push(`Corner ${c}${1 + Math.floor(h3(x, y, 41 + SIDES.indexOf(c)) * CORNER_VARIANTS)}`);
    if (isOver(x + nb[a][0], y + nb[a][1]) && isOver(x + nb[b][0], y + nb[b][1]))
      out.push(`Inner ${c}${1 + Math.floor(h3(x, y, 51 + SIDES.indexOf(c)) * CORNER_VARIANTS)}`);
  }
  return out;
}

/* ---------- the picture to look at ---------- */
function blit(dst, dw, dh, src, ox, oy) {
  for (let y = 0; y < SIZE; y++) { const Y = oy + y; if (Y < 0 || Y >= dh) continue;
    for (let x = 0; x < SIZE; x++) { const X = ox + x; if (X < 0 || X >= dw) continue;
      const s = (y * SIZE + x) * 4, a = src[s + 3]; if (!a) continue; const d = (Y * dw + X) * 4;
      for (let k = 0; k < 3; k++) dst[d + k] = Math.round((src[s + k] * a + dst[d + k] * (255 - a)) / 255);
      dst[d + 3] = 255; } }
}
function patch(N, isOver, base, over, pieces, fringe) {
  const W = N * 128 + 256, H = N * 64 + 256, img = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { img[i * 4] = 28; img[i * 4 + 1] = 30; img[i * 4 + 2] = 34; img[i * 4 + 3] = 255; }
  const ox = N * 64, oy = 0;
  for (let r = 0; r <= 2 * (N - 1); r++) for (let x = 0; x < N; x++) {   // row by row, back to front
    const y = r - x; if (y < 0 || y >= N) continue;
    const wx = ox + (x - y) * 64, wy = oy + (x + y) * 32;
    if (isOver(x, y)) blit(img, W, H, over.data, wx, wy);
    else { blit(img, W, H, base.data, wx, wy); if (fringe) { const ps = piecesFor(x, y, isOver); for (const p of ps) blit(img, W, H, pieces[p][1], wx, wy); for (const p of ps) blit(img, W, H, pieces[p][0], wx, wy); } }
  }
  return { img, W, H };
}
function scaleCrop(src, W, x0, y0, w, h, k) {
  const out = Buffer.alloc(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) src.copy(out, (y * w * k + x) * 4, ((y0 + (y / k | 0)) * W + x0 + (x / k | 0)) * 4, ((y0 + (y / k | 0)) * W + x0 + (x / k | 0)) * 4 + 4);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const base = readPng(arg('--base')), over = readPng(arg('--over'));
  const outDir = arg('--out', 'prototype/shots/ground-edge'), look = arg('--look', 'prototype/shots/ground-edge.png');
  const pieces = makePieces(over);
  for (const [n, [buf, sh]] of Object.entries(pieces)) { writePng(join(outDir, `${n}.png`), buf, SIZE, SIZE); writePng(join(outDir, `${n} Shade.png`), sh, SIZE, SIZE); }
  // a test patch: a sand blob with a bay, a grass island and a lone sand tile, so every case shows
  const N = 14;
  const sand = (x, y) => {
    if (x === 11 && y === 2) return true;                          // a lone sand tile in the grass
    if (x === 6 && y === 7) return false;                          // a grass tile alone in the sand
    const d = Math.hypot((x - 6.5) / 4.6, (y - 7) / 4.1) + (vn3(x * .6, y * .6, 3) - .5) * .7;
    return d < 1 && !(x >= 9 && y >= 5 && y <= 6);                 // with a grass bay cut in from the east
  };
  const isOver = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? true : !sand(x, y);
  const a = patch(N, isOver, base, over, pieces, false), b = patch(N, isOver, base, over, pieces, true);
  const cw = 640, ch = 300, cx = Math.round(N * 64 + 96 - cw / 2), cy = Math.round(13.5 * 32 + 208 - ch / 2), k = 2;
  const close = scaleCrop(b.img, b.W, cx, cy, cw, ch, k);
  const W = a.W * 2 + 16, H = a.H + 16 + ch * k, img = Buffer.alloc(W * H * 4, 0);
  for (let i = 0; i < W * H; i++) img[i * 4 + 3] = 255;
  const put = (src, sw, sh, x0, y0) => { for (let y = 0; y < sh; y++) src.copy(img, ((y0 + y) * W + x0) * 4, y * sw * 4, (y + 1) * sw * 4); };
  put(a.img, a.W, a.H, 0, 0); put(b.img, b.W, b.H, a.W + 16, 0); put(close, cw * k, ch * k, Math.round(W / 2 - cw * k / 2), a.H + 16);
  writePng(look, img, W, H);
  console.log(`${Object.keys(pieces).length} pieces (each with a shade) in ${outDir}, picture ${look} (${W} x ${H})`);
}
