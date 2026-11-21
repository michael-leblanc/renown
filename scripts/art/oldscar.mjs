// Oldscar's fences and banners, code-made (Michael, 2026-11-21: "bristling with sharpened stakes ... with red war banners and palisade
// fences"). The desert pack's palisade is neat and pale; these are rough: stakes of uneven height with the bark on, lashed with rope,
// in the colours round.mjs draws the orc homes with. Each is a 256 x 256 piece in the tileset's format, four sides, with a black
// ground shadow, written to game/client/art/made/ where the scene page finds it (its Made tab).
//   Stake Fence A1, A2   a fence along one edge of its tile (_S the south-west edge, as the pack's walls); A2 has a skull on a tall stake
//   Stake Fence A3       a corner: the edge it is named for and the next one round (_N the north-east and north-west edges, the back corner)
//   Stake Barrier A1     a log on trestles of crossed stakes, their points up and out
//   War Banner A1        a red banner on a pole with a bone point
// Run: node scripts/art/oldscar.mjs
import { writePng } from './png.mjs';
import { AX, AY, LIGHT } from './style.mjs';
import { PAINT, LOG, ROPE, BONE, hash, mul, drawFlag } from './round.mjs';

const OUT = 'game/client/art/made/', SHADOW = LIGHT.shadow;   // the light buildings.mjs draws its shadows with (style.mjs)
const blank = () => Buffer.alloc(256 * 256 * 4);
const put = (d, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 256 && y >= 0 && y < 256) d.set([Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], (y * 256 + x) * 4); };
// the four edges of a tile, each from its left end to its right end on the screen: [x, y of the left end, the slope], and how lit its face is
const EDGE = { S: [64, 208, 0.5, 0.82], E: [128, 240, -0.5, 1], N: [128, 176, 0.5, 0.82], W: [64, 208, -0.5, 1] };
// a ground point of the piece as tile coordinates (0 to 1 across the tile), from its pixel
const ground = (x, y) => { const a = (x + 0.5 - AX) / 64, b = (y + 0.5 - AY) / 32 + 1; return [(a + b) / 2, (b - a) / 2]; };
// the ends of each edge in tile coordinates
const ENDS = { S: [[0, 1], [1, 1]], E: [[1, 1], [1, 0]], N: [[0, 0], [1, 0]], W: [[0, 1], [0, 0]] };

const NEXT = { S: 'E', E: 'N', N: 'W', W: 'S' };
function fence(seed, skull, corner = false) {
  const H = 104, paint = PAINT.logs({ per: 5, H, jag: 30, points: true, ropes: [36, 72] }), out = {};
  for (const at of 'SENW') { const d = blank();
   // a corner piece (A3) holds the edge it is named for and the next one round; the edges at the back are drawn first
   for (const side of ['N', 'W', 'E', 'S'].filter(e => e === at || (corner && e === NEXT[at]))) { const [x0, y0, k, lit] = EDGE[side];
    for (let s = 0; s < 64; s++) for (let h = 0; h < H + 26; h++) {
      const arc = seed + ((side === 'E' || side === 'W') ? 7 : 0) + s / 64, g = arc * 5 + 0.16 * Math.sin(arc * 9.1), tall = skull && Math.floor(g) % 5 === 2;
      let c = paint(arc, tall ? Math.max(0, h - 22) + (h < 22 ? 0 : 0) : h);
      if (tall && h < 40) c = paint(arc, h);
      if (c) put(d, x0 + s, Math.floor(y0 + s * k - h), mul(c, lit));
    }
    if (skull) {   // a skull on the tall stake: the stake's middle is found again from the paint's own spacing
      for (let s = 0; s < 64; s++) { const arc = seed + ((side === 'E' || side === 'W') ? 7 : 0) + s / 64, g = arc * 5 + 0.16 * Math.sin(arc * 9.1);
        if (Math.floor(g) % 5 === 2 && Math.abs(g - Math.floor(g) - 0.5) < 0.05) { const cx = x0 + s, cy = y0 + s * k - H - 16;
          for (let y = -8; y <= 8; y++) for (let x = -7; x <= 7; x++) { const jaw = y > 3, r = jaw ? Math.abs(x) / 4.2 : Math.hypot(x / 6.6, (y + 1) / 6.4); if (r > 1 || y > 7) continue;
            const eye = y >= -1 && y <= 2 && Math.abs(Math.abs(x) - 3) <= 1, nose = y >= 3 && y <= 4 && x === 0, teeth = y === 7 && x % 2 === 0;
            put(d, cx + x, cy + y, eye || nose || teeth ? [44, 33, 24] : x > 2 ? BONE[1] : x < -3 ? BONE[2] : BONE[0]); }
          break; } }
    }
   }
   out[at] = d;
  }
  return out;
}
function fenceShadow(corner = false) {
  const out = {}, sv = [SHADOW[0] * 0.7, SHADOW[1] * 0.7];
  for (const at of 'SENW') { const d = blank();
   for (const side of corner ? [at, NEXT[at]] : [at]) { const [[ax, ay], [bx, by]] = ENDS[side];
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const [u, v] = ground(x, y);
      // the point lies in the shadow if stepping back along the light reaches the fence's line
      const ex = bx - ax, ey = by - ay, det = ex * -sv[1] - ey * -sv[0]; if (Math.abs(det) < 1e-9) continue;
      const s = ((u - ax) * -sv[1] - (v - ay) * -sv[0]) / det, t = (ex * (v - ay) - ey * (u - ax)) / det;
      if (s >= 0 && s <= 1 && t >= 0 && t <= 1) put(d, x, y, [0, 0, 0]); } }
   out[at] = d; }
  return out;
}

// a stick from one point to another (tile coordinates and a height in px), w wide, sharpened at its far end
function stick(d, [u0, v0, z0], [u1, v1, z1], w, point = true) {
  const P = (u, v, z) => [AX + (u - v) * 64, AY + (u + v - 1) * 32 - z], [xa, ya] = P(u0, v0, z0), [xb, yb] = P(u1, v1, z1), n = Math.ceil(Math.hypot(xb - xa, yb - ya) * 2);
  for (let q = 0; q <= n; q++) { const s = q / n, cx = xa + (xb - xa) * s, cy = ya + (yb - ya) * s, half = point ? Math.max(0.8, w / 2 * Math.min(1, (1 - s) * 5)) : w / 2;
    for (let y = Math.floor(cy - half); y <= Math.ceil(cy + half); y++) for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const qx = (x - cx) / half, qy = (y - cy) / half; if (qx * qx + qy * qy > 1) continue;
      const c = qx - qy > 0.5 ? LOG[1] : qx - qy < -0.6 ? LOG[2] : LOG[0];
      put(d, x, y, point && s > 0.8 ? mul(LOG[4], qx < -0.3 ? 0.8 : 1) : hash(Math.floor(s * n / 12), 3) > 0.75 ? mul(c, 0.88) : c); } }
}
function barrier() {
  const out = {};
  for (const side of 'SENW') { const d = blank(), along = side === 'S' || side === 'N', at = (a, b, z) => along ? [0.5 + a, 0.5 + b, z] : [0.5 + b, 0.5 + a, z];
    const xs = [-0.4, -0.2, 0, 0.2, 0.4];
    for (const [k, a] of xs.entries()) if (k % 2) stick(d, at(a, 0.34, 0), at(a + 0.03, -0.36, 62), 11);        // the stakes that lean away, behind the log
    stick(d, at(-0.5, 0, 26), at(0.5, 0, 26), 13, false);                                                         // the log
    for (const a of [-0.3, 0.3]) for (let y = -3; y <= 3; y++) for (let x = -7; x <= 7; x++) { const [u, v, z] = at(a, 0, 26), cx = AX + (u - v) * 64, cy = AY + (u + v - 1) * 32 - z; if (Math.abs(x) + Math.abs(y) * 1.6 < 8) put(d, cx + x, cy + y, ROPE[(x + y) & 1 ? 0 : 1]); }
    for (const [k, a] of xs.entries()) if (!(k % 2)) stick(d, at(a, -0.3, 0), at(a - 0.03, 0.42, 58), 11);       // the stakes that lean to the viewer, before it
    out[side] = d; }
  return out;
}
function disc(r) { const out = {}; for (const side of 'SENW') { const d = blank(); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const [u, v] = ground(x, y); if (Math.hypot(u - 0.5 - (r.at?.[0] || 0), v - 0.5 - (r.at?.[1] || 0)) < r.r) put(d, x, y, [0, 0, 0]); } out[side] = d; } return out; }
function banner() { const out = {}; for (const [k, side] of [...'SENW'].entries()) { const d = blank(); drawFlag(d, AX, AY, { h: 176, left: k % 2 === 1, k }); out[side] = d; } return out; }

const PIECES = { 'Stake Fence A1': fence(3, false), 'Stake Fence A2': fence(11, true), 'Stake Fence A3': fence(17, false, true), 'Stake Fence Shadow A1': fenceShadow(), 'Stake Fence Shadow A2': fenceShadow(), 'Stake Fence Shadow A3': fenceShadow(true),
  'Stake Barrier A1': barrier(), 'Stake Barrier Shadow A1': disc({ r: 0.42, at: [-0.08, 0.12] }), 'War Banner A1': banner(), 'War Banner Shadow A1': disc({ r: 0.12, at: [-0.04, 0.08] }) };
for (const [name, sides] of Object.entries(PIECES)) for (const [side, d] of Object.entries(sides)) writePng(`${OUT}${name}_${side}.png`, d, 256, 256);
console.log(`${Object.keys(PIECES).length} pieces written to ${OUT}`);
