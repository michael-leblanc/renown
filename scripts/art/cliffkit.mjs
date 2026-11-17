// Scratch copy of kit.mjs for Oldscar's cliff (claude/oldscar-cliff.md): a rectangular canvas, long shadows, crack and turf shading,
// noise that can repeat along x (so pieces join with no seam), rays clipped to a box, and rows drawn in parts (for workers).
// Folded into kit.mjs once the cliff is settled. The kit for code-made props: everything a prop script needs except the prop's own shape.
// A prop is a function that gives the distance from a point to its surface (shapes written as maths).
// The kit looks at it through the tileset's camera, lights it, snaps every pixel to the tileset's colours
// and writes PNGs the test game's `_piece` takes unchanged (tile middle at 128,208), plus a ground shadow.
// How to write a prop with it: .claude/skills/renown-prop/SKILL.md. Example: scripts/art/props.mjs.
// No package needed.
import { writePng, readPng } from './png.mjs';
import { existsSync } from 'node:fs';

/* ---------- maths ---------- */
export const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** A fixed random number from 0 to 1 for three whole numbers. */
export function h3(ix, iy, iz) { let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vn3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = h3(ix, iy, iz), b = h3(ix + 1, iy, iz), c = h3(ix, iy + 1, iz), d = h3(ix + 1, iy + 1, iz), e = h3(ix, iy, iz + 1), f = h3(ix + 1, iy, iz + 1), g = h3(ix, iy + 1, iz + 1), h = h3(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy; return y1 + (y2 - y1) * fz;
}
/** Smooth noise, about -0.75 to 0.75. */
export const fbm3 = (x, y, z) => (vn3(x, y, z) - .5) + (vn3(x * 2.03 + 7.1, y * 2.03 + 3.3, z * 2.03 + 1.7) - .5) * .5;
/** A repeatable random number maker for a seed. */
export const rng = seed => { let s = seed | 0; return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; }; };

/* ---------- shapes: each gives the distance from the point (x, y, z) to the shape; y is up, the ground is y = 0 ---------- */
/** Box with half sizes bx, by, bz and rounded edges of radius r, centred on the origin. */
export function sdBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0), az = Math.max(qz, 0);
  return Math.sqrt(ax * ax + ay * ay + az * az) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
/** Box with cut (chamfered) edges of size c. */
export function chBox(x, y, z, bx, by, bz, c) {
  const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz;
  return Math.max(qx, qy, qz, (qx + qy + c) * .70711, (qy + qz + c) * .70711, (qx + qz + c) * .70711);
}
/** Rod from a to b, radius ra at a and rb at b. */
export function sdCap(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
}

/* ---------- what a prop reports about the point it was last asked about ---------- */
export const ROCK = 0, WOOD = 1, IRON = 2, CANVAS = 3, GRASS = 4, FIRE = 5;
/** Set these in the prop's sdf(): mat (ROCK, WOOD, IRON, CANVAS, GRASS, FIRE), grv (0 in a gap or groove, drawn dark; else 1),
 *  var (0 to 1, one number per board or face: the odd one comes out a tone paler or darker; -1 = inside a box, dark).
 *  FIRE gives its own light: var is its heat, 0 (red tip) to 1 (yellow heart), and the sun and shade don't change it. */
export const hit = { mat: ROCK, grv: 1, var: .5, face: 0 };

/* ---------- ready parts ---------- */
/** Grass tufts at ground points [[x, z], ...]. */
export function tufts(points, seed) {
  return points.map((p, i) => { const bl = []; for (let j = 0; j < 5; j++) { const a = h3(i, j, seed) * 6.283, r = .02 + .03 * h3(i, j, seed + 1), hgt = .08 + .11 * h3(i, j, seed + 2), ln = .04 + .06 * h3(i, j, seed + 3); bl.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[0] + Math.cos(a) * (r + ln), hgt, p[1] + Math.sin(a) * (r + ln)]); } return { x: p[0], z: p[1], bl }; });
}
/** Adds the tufts T to a prop: pass the distance so far, get back the nearer of the two. Call it last in sdf(). */
export function tuftSdf(T, x, y, z, d) {
  if (y < .3) for (const t of T) {
    const lx = x - t.x, lz = z - t.z; if (lx * lx + lz * lz > .04) continue;
    for (const bl of t.bl) { const q = sdCap(x, y, z, bl[0], -.01, bl[1], bl[2], bl[3], bl[4], .015, .003); if (q < d) { d = q; hit.mat = GRASS; hit.grv = 1; } }
  }
  return d;
}
/** A stone cut by flat planes, like the tileset's boulders: height H, half widths a (x) and b (z).
 *  Options: sides (9), taper (0.2: each side loses 20 to 50% of its width by the top), chips (4 corners knocked off),
 *  tops (3 slanted top planes), topMin and topVar (how steep the top is: lower = more broken). */
export function cutStone(seed, H, a, b, o = {}) {
  const r = rng(seed * 7919 + 13), P = [], N = o.sides || 9;
  for (let k = 0; k < N; k++) {
    const ph = (k + .7 * r()) / N * 6.2832, sup = Math.hypot(a * Math.cos(ph), b * Math.sin(ph)) * (.86 + .2 * r()), tg = ((o.taper ?? .2) + .3 * r()) * sup / H, sl = tg / Math.sqrt(1 + tg * tg), c = Math.sqrt(1 - sl * sl);
    P.push([Math.cos(ph) * c, sl, Math.sin(ph) * c, sup * c]);
  }
  for (let k = 0; k < (o.chips ?? 4); k++) {
    const ph = r() * 6.2832, sl = .42 + .3 * r(), c = Math.sqrt(1 - sl * sl), sup = Math.hypot(a * Math.cos(ph), b * Math.sin(ph)) * .92;
    P.push([Math.cos(ph) * c, sl, Math.sin(ph) * c, sup * c + sl * H * (.55 + .35 * r())]);
  }
  for (let k = 0; k < (o.tops ?? 3); k++) {
    const ph = r() * 6.2832, ny = (o.topMin ?? .72) + (o.topVar ?? .22) * r(), c = Math.sqrt(1 - ny * ny);
    P.push([Math.cos(ph) * c, ny, Math.sin(ph) * c, ny * H * (.9 + .1 * r())]);
  }
  P.push([0, 1, 0, H]);
  return P;
}
/** Distance to a cut stone; hit.face is then the number of the nearest face. */
export function cutSdf(P, x, y, z) { let d = -9; for (let i = 0; i < P.length; i++) { const p = P[i], v = p[0] * x + p[1] * y + p[2] * z - p[3]; if (v > d) { d = v; hit.face = i; } } return d; }
/** Boards or courses along t, each `pitch` wide: returns [how far from the nearest gap, 0 (in it) to 0.5; the board's number]. */
export function gaps(t, pitch) { const k = t / pitch; return [Math.abs(k - Math.round(k)), Math.floor(k)]; }

/* ---------- camera: the tileset's 2:1 view ---------- */
export let PPU = 90.5097; export let AX = 128, AY = 208, SW = 256, SH = 256;      // one unit along x or z is 64 px across and 32 px down; up is 78.4 px
export let SHADOW = 5, CRACK_STEP = .025, SOFT = 1e9;
/** sh: how far a shadow ray looks; cs: crack shading step; soft: how far along it the shadow's soft edge is counted (past it, only a hit counts),
 *  so a far neighbour that only comes near the ray doesn't change a pixel. */
export function setLong(sh, cs, soft = 1e9) { SHADOW = sh; CRACK_STEP = cs; SOFT = soft; }
/** How hard a view ray settles onto the surface it hit: steps and how close. A surface met at a low angle whose distance is held back (the tall cliff's top) needs more than the 12 steps to 1e-7,
 *  or where the ray stops still depends a little on what it passed on the way, and a pixel on a hard line (a crack, a tone's edge) can change with the neighbours. */
export let SETTLE = 12, SETTLE_EPS = 1e-7; export function setSettle(n, e) { SETTLE = n; SETTLE_EPS = e; }
export function setCanvas(sw, sh, ax, ay) { SW = sw; SH = sh; AX = ax; AY = ay; }
/** Draws at k times the tileset's size (0.5 for a quick look). Sprites for the game are drawn at 1. */
export function setZoom(k) { PPU = 90.5097 * k; }
/** Noise along x. NX(x) gives [[x', weight], ...]: the noise is read at each x' and mixed. Used so a piece's edges read the same noise as its neighbour's. */
export let NX = null; export function setNoiseX(f) { NX = f; }
export function nx(g, x) { if (!NX) return g(x); let s = 0; for (const [xn, w] of NX(x)) s += w * g(xn); return s; }       // pixels per unit across; one tile is 1 x 1 units; height is 78.4 px a unit
const DV = [-.612372, -.5, -.612372], RV = [.707107, 0, -.707107], UV = [-.353553, .866025, -.353553];
let LW = [.55, .80, .25]; { const l = Math.hypot(...LW); LW = LW.map(v => v / l); }                       // where the sun is
const ROT = { S: [1, 0, 0, 1], E: [0, -1, 1, 0], N: [-1, 0, 0, -1], W: [0, 1, -1, 0] };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** The colours, dark to pale. Taken from the tileset so a prop sits beside it. */
export const RAMP = {
  rock: ['#3a3a35', '#45453f', '#57574f', '#6d6d65', '#7c7c73', '#84847c', '#93938c'].map(hex),     // the tileset's boulders
  moss: ['#22330f', '#2c4416', '#3c5421', '#455f27', '#587430'].map(hex),
  grass: ['#2b4315', '#35501c', '#3f5824', '#4f6c2c', '#668537'].map(hex),
  wood: ['#2b190a', '#39220f', '#422912', '#4c3015', '#5c3d1c', '#6e4c26'].map(hex),                // from the tileset's door, two paler tones added
  iron: ['#262521', '#35332f', '#3d3d38', '#4d4d46', '#62625b', '#7c7c73'].map(hex),
  canvas: ['#35301f', '#474029', '#5b5237', '#6f6546', '#837856', '#958a67', '#a59a77'].map(hex),   // undyed, weathered cloth; no tileset piece has it, so it is chosen to sit between the wall stone and the ground
  fire: ['#7c2a12', '#a63c16', '#c9591b', '#e07d24', '#eca436', '#f2c95a'].map(hex),                // the one bright thing; still a small ramp with hard edges
  lit: ['#6e5745', '#8b6c4f', '#a9835a', '#c39a66'].map(hex),                                       // stone in firelight
  // a desert look for the cliff (scratch, 2026-11-17). Taken from `2D Desert Fantasy tileset v1.0`: the rock from its cliff walls (Ground G11 to G22) and rock pillars (Stone B),
  // the sand from its plain ground (Ground A1); the two darkest rock tones, the darkest and palest sand and `deep` are added, since a tall cliff has more shade than the tileset's low walls
  sandstone: ['#57452d', '#6c5737', '#836942', '#91764c', '#a4895c', '#ad9264', '#bfa676'].map(hex),
  sand: ['#8a7653', '#9b8864', '#ac9975', '#c0ae8a', '#cdbc99'].map(hex),
  dry: ['#6f5c33', '#857040', '#9c864f', '#b39c60', '#c7b174'].map(hex),                             // dry grass (not from the tileset yet)
  soot: ['#1c1917', '#272320', '#332e29', '#423c35', '#544d44'].map(hex),                            // stone blackened by fire (the pyre in Oldscar's scar, D104); chosen, not from a tileset
  ash: ['#5f5a52', '#77726a', '#8f8a81', '#a5a097'].map(hex),
  deep: ['#3a2d1e', '#2b2117'].map(hex),                                                                       // the bottom of a crack in sandstone
};
const EXTRA = new Set(['canvas', 'fire', 'lit', 'sandstone', 'sand', 'dry', 'deep', 'soot', 'ash']);       // ramps added after the first props: a prop's pixels snap to them only if the prop uses them, so the older sprites never change
const PALETTE = Object.values(RAMP).flat();
const PAL_AT = Object.entries(RAMP).flatMap(([n, r]) => r.map((_, i) => [n, i]));
function oklab([R, G, B]) {
  const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }, r = f(R), g = f(G), b = f(B);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const PAL_LAB = PALETTE.map(oklab);

/** Draws prop S from one side ('S', 'E', 'N' or 'W'). ss = samples per pixel side (3 for final, 2 for a draft).
 *  S needs: sdf(x, y, z) (sets `hit`), bound [half x, half height, half z] (a box that holds all of it, standing on the ground),
 *  H (height, for moss). Optional: boundZ (the box's middle along z), crack [x, yFrom, yTo] (a dark crack on a rock's front),
 *  noMoss (true for stone that stays bare, like a fire ring), cast(x, y, z) (the shape that throws the shadow, when part of the prop throws none),
 *  glow [x, y, z, reach] (a fire at that point: bare stone turned to it, within reach, is drawn in warm firelight).
 *  Returns two RGBA buffers: the sprite, and its ground shadow (black; the game draws it at 0.3 alpha). */
export function trace(S, name, ss, y0, y1) {
  const [ra, rb, rc, rd] = ROT[name];
  const toL = (X, Z) => [ra * X + rb * Z, rc * X + rd * Z];
  const L = [ra * LW[0] + rb * LW[2], LW[1], rc * LW[0] + rd * LW[2]];
  const D = [ra * DV[0] + rb * DV[2], DV[1], rc * DV[0] + rd * DV[2]];
  const HB = (() => { const v = [L[0] * .6, L[1] * .6 + .8, L[2] * .6], l = Math.hypot(...v); return v.map(c => c / l); })();
  const [bx0, bx1, by0, by1, bz0, bz1] = S.box, bcx = (bx0 + bx1) / 2, bcy = (by0 + by1) / 2, bcz = (bz0 + bz1) / 2, bhx = (bx1 - bx0) / 2, bhy = (by1 - by0) / 2, bhz = (bz1 - bz0) / 2;
  const sdf = (x, y, z) => { const db = sdBox(x - bcx, y - bcy, z - bcz, bhx, bhy, bhz, 0); return db > .2 ? db : S.sdf(x, y, z); };   // far from the box round the prop, skip the costly shapes
  const normal = (x, y, z) => { const e = .004; const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l]; };
  const cast = sdf;   // what throws a shadow (a flame does not)
  const shadow = (x, y, z) => { let res = 1, t = .03; for (let i = 0; i < 140 && t < SHADOW; i++) { const d = cast(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (d < .002) return 0; if (t < SOFT) res = Math.min(res, 14 * d / t); t += clamp(d, .012, .15); } return res; };
  const used = new Set();
  const N = (y1 - y0) * SW, img = new Float32Array(N * 4), shad = new Float32Array(N), GB = new Float32Array(N * 8).fill(NaN), HX = new Float32Array(N).fill(NaN), GX = new Float32Array(N), mid = ss >> 1, n2 = ss * ss;
  const pad = .3, ex0 = bx0 - pad, ex1 = bx1 + pad, ey1 = by1 + pad, ez0 = bz0 - pad, ez1 = bz1 + pad;
  for (let py = y0; py < y1; py++)for (let px = 0; px < SW; px++) {
    const I = (py - y0) * SW + px;
    let r = 0, g = 0, b = 0, a = 0, sh = 0;
    for (let sy = 0; sy < ss; sy++)for (let sx = 0; sx < ss; sx++) {
      const u = (px + (sx + .5) / ss - AX) / PPU, v = (AY - (py + (sy + .5) / ss)) / PPU;
      const WX = u * RV[0] + v * UV[0], WY = v * UV[1], WZ = u * RV[2] + v * UV[2];
      const [lx0, lz0] = toL(WX, WZ);
      { const tg = -WY / DV[1], [gx, gz] = toL(WX + DV[0] * tg, WZ + DV[2] * tg); if (sx === mid && sy === mid) GX[I] = S.local ? S.local(gx, gz)[0] : gx; if (gx > S.ground[0] && gx < S.ground[1] && gz > S.ground[2] && gz < S.ground[3] && shadow(gx, .012, gz) < .5) sh++; }
      // clip the ray to the box round the prop, by height and depth only: so a pixel's ray starts at the same place whatever the prop's length (S is drawn from the south only)
      let ta = -1e9, tb = 1e9;
      for (const [p, d, lo, hi] of [[WY, D[1], -.05, ey1], [WZ, D[2], ez0, ez1]]) { const u1 = (lo - p) / d, u2 = (hi - p) / d; ta = Math.max(ta, Math.min(u1, u2)); tb = Math.min(tb, Math.max(u1, u2)); }
      if (ta > tb) continue;
      let t = ta, found = false, x = 0, y = 0, z = 0;
      for (let i = 0; i < 400 && t < tb; i++) {
        x = lx0 + D[0] * t; y = WY + D[1] * t; z = lz0 + D[2] * t;
        if (y < -.02) break;
        const d = sdf(x, y, z);
        if (d < .0012) {
          // settle onto the surface, so where the march stops doesn't depend on what the ray passed on its way (a neighbouring piece)
          let ts = t, dd = d;
          for (let k = 0; k < SETTLE; k++) { dd = sdf(x, y, z); if (Math.abs(dd) < SETTLE_EPS || dd > .01) break; ts += dd; x = lx0 + D[0] * ts; y = WY + D[1] * ts; z = lz0 + D[2] * ts; }
          if (dd <= .01 && Math.abs(sdf(x, y, z)) < .0012 && y >= -.02) { t = ts; found = true; break; }
          t += .004; continue;   // the ray only grazed something (a stone's edge, a blade of grass) and settling ran off it, once as far as under the ground: not a hit, march on
        }
        t += d > .3 ? d - .22 : d * .8;
      }
      if (!found) continue;
      S.sdf(x, y, z); const mat = hit.mat, grv = hit.grv, vr = hit.var, n = normal(x, y, z);
      const [ux, uz] = S.local ? S.local(x, z) : [x, z];   // S.local (scratch addition): the prop's own frame, [along, out]; the rock's noise and HX are read in it, so a cliff that bends keeps its texture and its pieces
      if (Number.isNaN(HX[I]) || (sx === mid && sy === mid)) HX[I] = ux;
      if (sx === mid && sy === mid) { const o = I * 8; GB[o] = t; GB[o + 1] = n[0]; GB[o + 2] = n[1]; GB[o + 3] = n[2]; GB[o + 4] = x; GB[o + 5] = y; GB[o + 6] = z; GB[o + 7] = grv < .5 ? -1 : mat; }
      const ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const s = ndl > .01 ? shadow(x + n[0] * .04, y + n[1] * .04, z + n[2] * .04) : 0;   // started a little off the surface: on a rough face the ray otherwise catches its own bumps, in stripes
      let occ = 0; for (const [k, w] of [[.03, .5], [.08, .35], [.18, .25], [.35, .15]]) occ += (k - sdf(x + n[0] * k, y + n[1] * k, z + n[2] * k)) / k * w;
      const ao = clamp(1 - occ, .15, 1);
      const val = .48 * ao * (.74 + .26 * n[1]) + .52 * ndl * Math.min(1, s);       // how bright: 0 to 1
      // the material decides the colour ramp and which tone of it
      let ramp, idx;
      if (mat === GRASS) { ramp = S.dry ? RAMP.dry : RAMP.grass; if (S.dry) used.add('dry'); idx = Math.round(1 + val * 2.6 + y * 6); }
      else if (mat === WOOD) {
        ramp = RAMP.wood; idx = val < .16 ? 0 : val < .3 ? 1 : val < .47 ? 2 : val < .66 ? 3 : val < .84 ? 4 : 5;
        if (vr < 0) idx -= 2;                                                // inside a box
        else { idx += vr > .72 ? 1 : vr < .2 ? -1 : 0; if (nx(X => fbm3(X * 3, y * 60, z * 3), x) > .3 && grv > .5) idx -= 1; }   // the odd paler or darker board, and a little grain
        if (grv < .5) idx -= 2;
      }
      else if (mat === IRON) { ramp = RAMP.iron; idx = Math.round(.4 + val * 4.3); if (grv < .5) idx = 0; }
      else if (mat === CANVAS) {
        ramp = RAMP.canvas; used.add('canvas'); idx = val < .17 ? 0 : val < .29 ? 1 : val < .42 ? 2 : val < .55 ? 3 : val < .7 ? 4 : val < .86 ? 5 : 6;
        if (vr < -1.5) idx = 0;                                              // a tent's floor, in the dark
        else if (vr < 0) { ramp = RAMP.iron; idx = 0; }                      // the inside of a tent: near black, so the way in reads at game size
        else {
          idx += vr > .75 ? 1 : vr < .22 ? -1 : 0;                           // the odd paler or darker panel
          if (y < .1 + .16 * (fbm3(x * 6, 3, z * 6) + .4)) idx -= 1;          // a dirty hem
          if (fbm3(x * 9 + 5, y * 1.1, z * 9) > .36) idx -= 1;                // weather stains running down
        }
        if (grv < .5) idx -= 1;                                              // a seam
      }
      else if (mat === FIRE) { ramp = RAMP.fire; used.add('fire'); const f = clamp(-(n[0] * D[0] + n[1] * D[1] + n[2] * D[2]), 0, 1); idx = Math.round((.45 * f + .55 * clamp(vr, 0, 1)) * 5.4 - .2); }   // its own light: hot in the heart and low down, red at the rim and the tips
      else {
        const nz = nx(X => fbm3(X * 5 + 3, y * 5, uz * 5), ux), H = S.H, RK = RAMP[S.rock || 'rock'], MS = RAMP[S.turf || 'moss']; if (S.rock) used.add(S.rock); if (S.turf) used.add(S.turf);   // S.rock, S.turf (scratch additions): other ramps for the stone and for what lies on it
        const up = n[1] > .5 && nz > .08, low = y < .05 + .34 * (nz + .12 * nx(X => fbm3(X * 13, y * 13, uz * 13), ux)), north = n[2] < -.35 && nx(X => fbm3(X * 15, y * 6, uz * 15) + .2 * fbm3(X * 30, y * 30, uz * 30), ux) > .02 + .55 * y / H;   // moss: on top, at the foot, and in streaks on the side away from the sun
        if (vr <= -1) {                                                      // inside a crack (var -1, scratch addition): stone in shade, the rock's darkest three tones; the wall turned to the sun is the palest of them
          const depth = -1 - vr, k = (val < .2 ? 1 : val < .32 ? 2 : val < .46 ? 3 : 4) - Math.floor(depth / CRACK_STEP) - (nx(X => fbm3(X * 16, y * 16 + 4, uz * 16), ux) > .3 ? 1 : 0);   // the deeper into the stone, the darker; past the rock's darkest, the iron ramp's near-blacks
          if (k <= 0) { if (S.rock) { ramp = RAMP.deep; idx = 0; used.add('deep'); } else { ramp = RAMP.iron; idx = 1; } } else { ramp = RK; idx = Math.min(k - 1, 3); }
        }
        else if (vr >= 5) {                                                  // var 5 to 6 (scratch addition): shade by depth alone, 5 = at the rock's face, 6 = as deep as it goes: the rock's three darkest tones, then the two of `deep`
          const t = Math.max(0, Math.min(5, Math.floor((vr - 5) * 6 + .45 * nz)));
          if (t < 3) { ramp = RK; idx = 2 - t; } else { ramp = RAMP.deep; idx = Math.min(1, t - 3); used.add('deep'); }
        }
        else if (vr >= 3) { const nm = vr >= 4 ? 'ash' : 'soot'; ramp = RAMP[nm]; used.add(nm); idx = Math.round(val * ramp.length * .95 - .2) - (nz > .25 ? 1 : 0); }   // var 3: stone blackened by fire; var 4: ash (scratch additions)
        else if (vr >= 2) { ramp = MS; idx = Math.round(.3 + val * 3.3) - (vr < 2.4 && nz > .2 ? 1 : 0); }   // var 2 (scratch addition): ground covered in moss and turf, like the land on top of a cliff; var 2.5: the same with no darker speckle (plain sand)
        else if (!S.noMoss && (up || low || north)) { ramp = RAMP.moss; idx = Math.round(.3 + val * 3.3); }
        else {
          const v = S.contrast ? clamp(.47 + (val - .55) * S.contrast, 0, 1) : val;   // contrast (scratch addition): a cliff's faces in the sun and in shade stand further apart than a boulder's
          ramp = RK; idx = v < .22 ? 0 : v < .31 ? 1 : v < .41 ? 2 : v < .52 ? 3 : v < .62 ? 4 : v < .74 ? 5 : 6;
          idx += vr > .78 ? 1 : vr < .18 ? -1 : 0;                           // the odd paler or darker face
          { const st = nx(X => fbm3(X * 10 + 9, y * 1.6, uz * 10), ux); if (st > (S.streak ?? .2)) idx -= 1; else if (st < -.34 && !S.streak) idx += 1; }   // rain streaks down the faces
          if (nx(X => fbm3(X * 16, y * 16 + 4, uz * 16), ux) > .36) idx -= 1;               // pits
          if (S.glow) {                                                      // firelight on the faces turned to the fire
            const [gx, gy, gz, gr] = S.glow, vx = gx - x, vy = gy - y, vz = gz - z, gl = Math.hypot(vx, vy, vz), f = Math.max(0, (n[0] * vx + n[1] * vy + n[2] * vz) / gl) * clamp(1.15 - gl / gr, 0, 1);
            if (f > .2) { ramp = RAMP.lit; used.add('lit'); idx = (f > .62 ? 3 : f > .45 ? 2 : f > .3 ? 1 : 0) - (grv < .5 ? 1 : 0); }
          }
          const c = S.crack; if (c && n[2] > .3 && y > c[1] && y < c[2] && Math.abs(x - .035 * y - (c[0] + .035 * Math.sin(y * 7.5) + .015 * Math.sin(y * 21))) < .008) idx -= 2;
        }
      }
      const c = ramp[clamp(idx, 0, ramp.length - 1)];
      r += c[0]; g += c[1]; b += c[2]; a++;
    }
    const o = I * 4;
    if (a) { img[o] = r / a; img[o + 1] = g / a; img[o + 2] = b / a; img[o + 3] = a / n2; }
    shad[I] = sh / n2;
  }
  return { img, shad, GB, HX, GX, used: [...used] };
}
/** Joins the parts trace() drew (rows in order) and finishes the picture: palette, edge highlights, stray pixels.
 *  Returns the sprite, its ground shadow, and per pixel the x where it hit the prop (HX) and where its ground point is (GX). */
export function finish(parts) {
  const L = [LW[0], LW[1], LW[2]];
  const HB = (() => { const v = [L[0] * .6, L[1] * .6 + .8, L[2] * .6], l = Math.hypot(...v); return v.map(c => c / l); })();
  const cat = (k, n) => { const a = new Float32Array(SW * SH * n); let o = 0; for (const p of parts) { a.set(p[k], o); o += p[k].length; } return a; };
  const img = cat('img', 4), shad = cat('shad', 1), GB = cat('GB', 8), HX = cat('HX', 1), GX = cat('GX', 1), used = new Set(parts.flatMap(p => p.used));
  // snap every pixel to the palette (nearest in OKLab), hard edge: no half-see-through pixels
  const okPal = PAL_AT.map(([rn]) => !EXTRA.has(rn) || used.has(rn));
  const out = Buffer.alloc(SW * SH * 4), so = Buffer.alloc(SW * SH * 4), pick = new Int16Array(SW * SH).fill(-1);
  for (let i = 0; i < SW * SH; i++) {
    if (img[i * 4 + 3] >= .5) { let best = 1e9, bi = 0; const q = oklab([img[i * 4], img[i * 4 + 1], img[i * 4 + 2]]); PAL_LAB.forEach((p, k) => { if (!okPal[k]) return; const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < best) { best = d; bi = k; } }); pick[i] = bi; }
    if (shad[i] >= .5) so[i * 4 + 3] = 255;
  }
  // edge highlights: on an outward corner, the face turned to the light gets one tone paler; so does a top edge against the air
  const bump = new Int8Array(SW * SH);
  for (let py = 1; py < SH - 1; py++)for (let px = 1; px < SW - 1; px++) {
    const i = py * SW + px, o = i * 8; if (pick[i] < 0 || !(GB[o + 7] >= 0) || GB[o + 7] > 3) continue;
    const lp = GB[o + 1] * HB[0] + GB[o + 2] * HB[1] + GB[o + 3] * HB[2]; let hi = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = i + dy * SW + dx, q = j * 8;
      if (pick[j] < 0 || Number.isNaN(GB[q])) { if (dy === -1 && GB[o + 2] > .5) hi = true; continue; }
      const dt = GB[q] - GB[o];
      if (dt > .09) { if (GB[o + 2] > .5 && dy === -1) hi = true; continue; }
      if (Math.abs(dt) > .05) continue;
      const nd = GB[o + 1] * GB[q + 1] + GB[o + 2] * GB[q + 2] + GB[o + 3] * GB[q + 3]; if (nd > .8) continue;
      const cv = (GB[q + 1] - GB[o + 1]) * (GB[q + 4] - GB[o + 4]) + (GB[q + 2] - GB[o + 2]) * (GB[q + 5] - GB[o + 5]) + (GB[q + 3] - GB[o + 3]) * (GB[q + 6] - GB[o + 6]);
      const lq = GB[q + 1] * HB[0] + GB[q + 2] * HB[1] + GB[q + 3] * HB[2];
      if (cv > 0 && lp > lq && lp > .3) hi = true;
    }
    if (hi) bump[i] = 1;
  }
  for (let py = 1; py < SH - 1; py++)for (let px = 1; px < SW - 1; px++) {      // drop stray single pixels left hanging in the air
    const i = py * SW + px; if (pick[i] < 0 || GB[i * 8 + 7] > 3) continue;
    let nb = 0; for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++)if ((dx || dy) && pick[i + dy * SW + dx] >= 0) nb++;
    if (nb <= 1) pick[i] = -2;
  }
  for (let i = 0; i < SW * SH; i++) if (pick[i] >= 0) {
    let k = pick[i]; if (bump[i]) { const [rn, ri] = PAL_AT[k]; if (rn !== 'moss' && rn !== 'grass' && rn !== 'sand' && rn !== 'dry' && ri + 1 < RAMP[rn].length) k += 1; }
    const c = PALETTE[k]; out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return { out, so, HX, GX, GB };
}
