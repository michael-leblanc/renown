// Props for Renown's test game, built from maths shapes and rendered to 256 x 256 PNG sprites
// in the tileset's own projection (128 x 64 tiles, tile middle at 128,208), with a separate ground shadow.
//   Standing Stone A1, A2, A3  - the ring of standing stones where people wake (D71). Plain stone, no carvings (D68).
//   Chest A1, Chest A1 Open    - the chests that appear in the world (D54, D142).
// Ray marching over maths shapes (signed distance functions), on the processor; no package needed.
// Under 2 seconds a sprite.
// Usage, from the repo root: node scripts/art/props.mjs [outdir, default prototype/art/made] [names, comma separated, or all] [S,E,N,W] [supersample, default 3]
import { writePng } from './png.mjs';
const OUT = process.argv[2] || 'prototype/art/made', WHICH = process.argv[3] || 'all', VIEWS = (process.argv[4] || 'S,E,N,W').split(','), SS = +(process.argv[5] || 3);

/* ---------- maths ---------- */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function h3(ix, iy, iz) { let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = h3(ix, iy, iz), b = h3(ix + 1, iy, iz), c = h3(ix, iy + 1, iz), d = h3(ix + 1, iy + 1, iz), e = h3(ix, iy, iz + 1), f = h3(ix + 1, iy, iz + 1), g = h3(ix, iy + 1, iz + 1), h = h3(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy; return y1 + (y2 - y1) * fz;
}
const fbm3 = (x, y, z) => (vn3(x, y, z) - .5) + (vn3(x * 2.03 + 7.1, y * 2.03 + 3.3, z * 2.03 + 1.7) - .5) * .5;
function sdBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0), az = Math.max(qz, 0);
  return Math.sqrt(ax * ax + ay * ay + az * az) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function chBox(x, y, z, bx, by, bz, c) {              // box with cut (chamfered) edges
  const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz;
  return Math.max(qx, qy, qz, (qx + qy + c) * .70711, (qy + qz + c) * .70711, (qx + qz + c) * .70711);
}
function sdCap(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
}
const rng = seed => { let s = seed | 0; return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; }; };

/* ---------- what every scene reports for the point it was last asked about ---------- */
let MAT = 0, GRV = 1, VAR = .5;            // material (0 rock, 1 wood, 2 iron, 4 grass), 0 in a groove, a number per face or plank
const ROCK = 0, WOOD = 1, IRON = 2, GRASS = 4;

function tufts(points, seed) {
  return points.map((p, i) => { const bl = []; for (let j = 0; j < 5; j++) { const a = h3(i, j, seed) * 6.283, r = .02 + .03 * h3(i, j, seed + 1), hgt = .08 + .11 * h3(i, j, seed + 2), ln = .04 + .06 * h3(i, j, seed + 3); bl.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[0] + Math.cos(a) * (r + ln), hgt, p[1] + Math.sin(a) * (r + ln)]); } return { x: p[0], z: p[1], bl }; });
}
function tuftSdf(T, x, y, z, d) {
  if (y < .3) for (const t of T) {
    const lx = x - t.x, lz = z - t.z; if (lx * lx + lz * lz > .04) continue;
    for (const bl of t.bl) { const q = sdCap(x, y, z, bl[0], -.01, bl[1], bl[2], bl[3], bl[4], .015, .003); if (q < d) { d = q; MAT = GRASS; GRV = 1; } }
  }
  return d;
}

/* ---------- standing stones: each one is a block cut by flat planes, like the tileset's boulders ---------- */
function cutStone(seed, H, a, b, o = {}) {
  const r = rng(seed * 7919 + 13), P = [], N = o.sides || 9;
  for (let k = 0; k < N; k++) {                                   // the sides, leaning in a little so the stone tapers
    const ph = (k + .7 * r()) / N * 6.2832, sup = Math.hypot(a * Math.cos(ph), b * Math.sin(ph)) * (.86 + .2 * r()), tg = ((o.taper ?? .2) + .3 * r()) * sup / H, sl = tg / Math.sqrt(1 + tg * tg), c = Math.sqrt(1 - sl * sl);   // each side loses 20 to 50% of its width by the top
    P.push([Math.cos(ph) * c, sl, Math.sin(ph) * c, sup * c]);
  }
  for (let k = 0; k < (o.chips ?? 4); k++) {                      // corners knocked off higher up
    const ph = r() * 6.2832, sl = .42 + .3 * r(), c = Math.sqrt(1 - sl * sl), sup = Math.hypot(a * Math.cos(ph), b * Math.sin(ph)) * .92;
    P.push([Math.cos(ph) * c, sl, Math.sin(ph) * c, sup * c + sl * H * (.55 + .35 * r())]);
  }
  for (let k = 0; k < (o.tops ?? 3); k++) {                       // the top, never level
    const ph = r() * 6.2832, ny = (o.topMin ?? .72) + (o.topVar ?? .22) * r(), c = Math.sqrt(1 - ny * ny);
    P.push([Math.cos(ph) * c, ny, Math.sin(ph) * c, ny * H * (.9 + .1 * r())]);
  }
  P.push([0, 1, 0, H]);
  return P;
}
let FK = 0;
function cutSdf(P, x, y, z) { let d = -9; for (let i = 0; i < P.length; i++) { const p = P[i], v = p[0] * x + p[1] * y + p[2] * z - p[3]; if (v > d) { d = v; FK = i; } } return d; }

function standingStone({ seed, H, a, b, lean = 0, leanZ = 0, opts, extra, tuftAt, crack }) {
  const P = cutStone(seed, H, a, b, opts), T = tufts(tuftAt, seed);
  const E = (extra || []).map(e => ({ ...e, P: cutStone(e.seed, e.H, e.a, e.b, e.opts), cs: Math.cos(e.turn || 0), sn: Math.sin(e.turn || 0) }));
  return {
    H, crack,
    bound: [Math.max(a, ...E.map(e => Math.abs(e.x) + e.a + e.b)) + .28, H / 2 + .08, Math.max(b, ...E.map(e => Math.abs(e.z) + e.a + e.b)) + .3 + Math.abs(leanZ) * H],
    sdf(x, y, z) {
      const sx = x - lean * y, sz = z - leanZ * y;
      let d = cutSdf(P, sx, y, sz) + .006 * fbm3(x * 9 + seed, y * 9, z * 9); MAT = ROCK; GRV = 1; VAR = h3(FK, seed, 1);
      for (const e of E) {
        const lx = x - e.x, lz = z - e.z, rx = lx * e.cs + lz * e.sn, rz = -lx * e.sn + lz * e.cs;
        const q = cutSdf(e.P, rx, y, rz) + .006 * fbm3(x * 9, y * 9 + e.seed, z * 9); if (q < d) { d = q; VAR = h3(FK, e.seed, 1); }
      }
      return tuftSdf(T, x, y, z, d);
    }
  };
}

/* ---------- the chest ---------- */
const CW = .28, CD = .18, CH = .26, LH = .125;          // half width, half depth, height of the box, height of the lid's curve
function lidAt(x, ly, z, hollow) {                     // the lid in its own space: ly is height above the box's rim
  const ax = Math.abs(x), q = (Math.hypot(z / (CD + .01), ly / LH) - 1) * LH;
  const raw = Math.max(q, -ly, ax - (CW + .01)); let d = raw, m = WOOD, g = 1;
  const a = Math.atan2(ly / LH, z / (CD + .01)) / (Math.PI / 5), fj = Math.abs(a - Math.round(a));
  VAR = h3(Math.floor(a) + 20, 5, 3);
  if (q > -.03 && ax < CW) { d += .007 * clamp(1 - fj / .08, 0, 1); if (fj < .07) g = 0; }       // gaps between the lid's boards
  let band = Math.max(raw - .012, Math.abs(ax - .17) - .024);
  if (hollow) { const inner = Math.max((Math.hypot(z / (CD - .015), ly / (LH - .02)) - 1) * (LH - .02), ax - (CW - .015)); d = Math.max(d, -inner); band = Math.max(band, -inner); if (inner < .012) VAR = -1; }
  if (band < d) { d = band; m = IRON; g = 1; }
  MAT = m; GRV = g; return d;
}
function chest(open) {
  const PH = 1.83, cs = Math.cos(PH), sn = Math.sin(PH);   // how far the lid swings back when open (about 105 degrees)
  return {
    H: CH + LH, bound: [CW + .12, open ? .36 : .22, open ? CD + .32 : CD + .1], boundZ: open ? -.2 : 0,
    sdf(x, y, z) {
      const ax = Math.abs(x);
      const rawB = chBox(x, y - CH / 2, z, CW, CH / 2, CD, .01); let d = rawB, m = WOOD, g = 1, v;
      const pk = y / .087, fj = Math.abs(pk - Math.round(pk)); v = h3(Math.floor(pk), 9, 4);
      if (y > .03 && y < CH - .03) { d += .007 * clamp(1 - fj / .09, 0, 1); if (fj < .08) g = 0; }       // gaps between the boards
      if (open) { const inner = sdBox(x, y - .29, z, CW - .024, .26, CD - .024, 0); d = Math.max(d, -inner); if (inner < .012) v = -1; }
      const skirt = chBox(x, y - .022, z, CW + .014, .022, CD + .014, .01); if (skirt < d) { d = skirt; g = 1; v = .1; }
      let band = Math.max(rawB - .012, Math.abs(ax - .17) - .024);
      if (open) band = Math.max(band, -sdBox(x, y - .29, z, CW - .024, .26, CD - .024, 0));
      if (band < d) { d = band; m = IRON; g = 1; }
      const lock = chBox(x, y - (CH - .035), z - (CD + .008), .038, .05, .012, .008); if (lock < d) { d = lock; m = IRON; g = (Math.abs(x) < .009 && Math.abs(y - (CH - .045)) < .016) ? 0 : 1; }
      const ring = Math.hypot(Math.hypot(y - .15, z) - .04, ax - (CW + .012)) - .01; if (ring < d) { d = ring; m = IRON; g = 1; }
      MAT = m; GRV = g; VAR = v;
      let l;
      if (open) { const vz = z + CD, vy = y - CH; l = lidAt(x, -vz * sn + vy * cs, vz * cs + vy * sn - CD, true); }
      else l = lidAt(x, y - CH, z, false);
      if (l < d) return l;
      MAT = m; GRV = g; VAR = v; return d;
    }
  };
}

const SCENES = {
  'Standing Stone A1': { shadow: 'Standing Stone Shadow A1', ...standingStone({ seed: 3, H: 1.95, a: .27, b: .17, lean: .035, opts: { taper: .12, chips: 6, sides: 10 }, crack: [.06, .7, 1.35], tuftAt: [[-.3, .14], [.31, .1], [.1, .24], [-.16, -.2], [.24, -.16]] }) },
  'Standing Stone A2': { shadow: 'Standing Stone Shadow A2', ...standingStone({ seed: 11, H: 1.5, a: .25, b: .2, lean: -.13, leanZ: .04, opts: { taper: .2, sides: 8, chips: 6 }, tuftAt: [[.3, .16], [-.36, .08], [-.06, .27], [.2, -.2]] }) },
  'Standing Stone A3': { shadow: 'Standing Stone Shadow A3', ...standingStone({ seed: 23, H: .78, a: .28, b: .21, lean: .05, opts: { taper: .12, tops: 3, topMin: .45, topVar: .3, chips: 2 }, extra: [{ seed: 31, H: .17, a: .2, b: .12, x: .46, z: .1, turn: .5, opts: { taper: .3, tops: 2, chips: 2, sides: 7 } }, { seed: 37, H: .1, a: .09, b: .07, x: -.4, z: .22, turn: 1.2, opts: { taper: .3, tops: 2, chips: 1, sides: 6 } }], tuftAt: [[-.32, .08], [.3, -.16], [.16, .28], [.6, -.06], [-.2, -.24]] }) },
  'Chest A1': { shadow: 'Chest Shadow A1', ...chest(false) },
  'Chest A1 Open': { shadow: 'Chest Shadow A1 Open', ...chest(true) },
};

/* ---------- camera: the tileset's 2:1 view ---------- */
const PPU = 90.5097, AX = 128, AY = 208, SIZE = 256;
const DV = [-.612372, -.5, -.612372], RV = [.707107, 0, -.707107], UV = [-.353553, .866025, -.353553];
let LW = [.55, .80, .25]; { const l = Math.hypot(...LW); LW = LW.map(v => v / l); }
const ROT = { S: [1, 0, 0, 1], E: [0, -1, 1, 0], N: [-1, 0, 0, -1], W: [0, 1, -1, 0] };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RAMP = {
  rock: ['#3a3a35', '#45453f', '#57574f', '#6d6d65', '#7c7c73', '#84847c', '#93938c'].map(hex),     // the tileset's boulders
  moss: ['#22330f', '#2c4416', '#3c5421', '#455f27', '#587430'].map(hex),
  grass: ['#2b4315', '#35501c', '#3f5824', '#4f6c2c', '#668537'].map(hex),
  wood: ['#2b190a', '#39220f', '#422912', '#4c3015', '#5c3d1c', '#6e4c26'].map(hex),                // from the tileset's door, two paler tones added
  iron: ['#262521', '#35332f', '#3d3d38', '#4d4d46', '#62625b', '#7c7c73'].map(hex),
};
const PALETTE = Object.values(RAMP).flat();
const PAL_AT = Object.entries(RAMP).flatMap(([n, r]) => r.map((_, i) => [n, i]));
function oklab([R, G, B]) {
  const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }, r = f(R), g = f(G), b = f(B);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const PAL_LAB = PALETTE.map(oklab);

function renderView(S, name) {
  const [ra, rb, rc, rd] = ROT[name];
  const toL = (X, Z) => [ra * X + rb * Z, rc * X + rd * Z];
  const L = [ra * LW[0] + rb * LW[2], LW[1], rc * LW[0] + rd * LW[2]];
  const D = [ra * DV[0] + rb * DV[2], DV[1], rc * DV[0] + rd * DV[2]];
  const HB = (() => { const v = [L[0] * .6, L[1] * .6 + .8, L[2] * .6], l = Math.hypot(...v); return v.map(c => c / l); })();
  const B = S.bound, BZ = S.boundZ || 0;
  const sdf = (x, y, z) => { const db = sdBox(x, y - B[1], z - BZ, B[0], B[1], B[2], 0); return db > .2 ? db : S.sdf(x, y, z); };   // a box round the prop: far from it, skip the costly shapes
  const normal = (x, y, z) => { const e = .004; const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l]; };
  const shadow = (x, y, z) => { let res = 1, t = .03; for (let i = 0; i < 48 && t < 3.6; i++) { const d = sdf(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (d < .002) return 0; res = Math.min(res, 14 * d / t); t += clamp(d, .012, .15); } return res; };
  const img = new Float32Array(SIZE * SIZE * 4), shad = new Float32Array(SIZE * SIZE), GB = new Float32Array(SIZE * SIZE * 8).fill(NaN), mid = SS >> 1, n2 = SS * SS;
  for (let py = 0; py < SIZE; py++)for (let px = 0; px < SIZE; px++) {
    let r = 0, g = 0, b = 0, a = 0, sh = 0;
    for (let sy = 0; sy < SS; sy++)for (let sx = 0; sx < SS; sx++) {
      const u = (px + (sx + .5) / SS - AX) / PPU, v = (AY - (py + (sy + .5) / SS)) / PPU;
      const WX = u * RV[0] + v * UV[0], WY = v * UV[1], WZ = u * RV[2] + v * UV[2];
      const [lx0, lz0] = toL(WX, WZ);
      { const tg = -WY / DV[1], [gx, gz] = toL(WX + DV[0] * tg, WZ + DV[2] * tg); if (Math.abs(gx) < 2.6 && Math.abs(gz) < 2.6 && shadow(gx, .012, gz) < .5) sh++; }
      let t = -4.2, hit = false, x = 0, y = 0, z = 0;
      for (let i = 0; i < 120 && t < 4.2; i++) {
        x = lx0 + D[0] * t; y = WY + D[1] * t; z = lz0 + D[2] * t;
        if (y < -.02) break;
        const d = sdf(x, y, z); if (d < .0012) { hit = true; break; }
        t += d > .3 ? d - .22 : d * .8;
      }
      if (!hit) continue;
      S.sdf(x, y, z); const mat = MAT, grv = GRV, vr = VAR, n = normal(x, y, z);
      if (sx === mid && sy === mid) { const o = (py * SIZE + px) * 8; GB[o] = t; GB[o + 1] = n[0]; GB[o + 2] = n[1]; GB[o + 3] = n[2]; GB[o + 4] = x; GB[o + 5] = y; GB[o + 6] = z; GB[o + 7] = grv < .5 ? -1 : mat; }
      const ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const s = ndl > .01 ? shadow(x + n[0] * .012, y + n[1] * .012, z + n[2] * .012) : 0;
      let occ = 0; for (const [k, w] of [[.03, .5], [.08, .35], [.18, .25], [.35, .15]]) occ += (k - sdf(x + n[0] * k, y + n[1] * k, z + n[2] * k)) / k * w;
      const ao = clamp(1 - occ, .15, 1);
      const val = .48 * ao * (.74 + .26 * n[1]) + .52 * ndl * Math.min(1, s);
      let ramp, idx;
      if (mat === GRASS) { ramp = RAMP.grass; idx = Math.round(1 + val * 2.6 + y * 6); }
      else if (mat === WOOD) {
        ramp = RAMP.wood; idx = val < .16 ? 0 : val < .3 ? 1 : val < .47 ? 2 : val < .66 ? 3 : val < .84 ? 4 : 5;
        if (vr < 0) idx -= 2;                                                // inside the chest
        else { idx += vr > .72 ? 1 : vr < .2 ? -1 : 0; if (fbm3(x * 3, y * 60, z * 3) > .3 && grv > .5) idx -= 1; }   // the odd paler or darker board, and a little grain
        if (grv < .5) idx -= 2;
      }
      else if (mat === IRON) { ramp = RAMP.iron; idx = Math.round(.4 + val * 4.3); if (grv < .5) idx = 0; }
      else {
        const nz = fbm3(x * 5 + 3, y * 5, z * 5), H = S.H;
        const up = n[1] > .5 && nz > .08, low = y < .05 + .34 * (nz + .12 * fbm3(x * 13, y * 13, z * 13)), north = n[2] < -.35 && fbm3(x * 15, y * 6, z * 15) + .2 * fbm3(x * 30, y * 30, z * 30) > .02 + .55 * y / H;   // the side away from the sun: moss in streaks, thinning out higher up
        if (up || low || north) { ramp = RAMP.moss; idx = Math.round(.3 + val * 3.3); }
        else {
          ramp = RAMP.rock; idx = val < .22 ? 0 : val < .31 ? 1 : val < .41 ? 2 : val < .52 ? 3 : val < .62 ? 4 : val < .74 ? 5 : 6;
          idx += vr > .78 ? 1 : vr < .18 ? -1 : 0;                           // the odd paler or darker face
          { const st = fbm3(x * 10 + 9, y * 1.6, z * 10); if (st > .2) idx -= 1; else if (st < -.34) idx += 1; }   // rain streaks down the faces, darker and paler
          if (fbm3(x * 16, y * 16 + 4, z * 16) > .36) idx -= 1;               // pits
          const c = S.crack; if (c && n[2] > .3 && y > c[1] && y < c[2] && Math.abs(x - .035 * y - (c[0] + .035 * Math.sin(y * 7.5) + .015 * Math.sin(y * 21))) < .008) idx -= 2;
        }
      }
      const c = ramp[clamp(idx, 0, ramp.length - 1)];
      r += c[0]; g += c[1]; b += c[2]; a++;
    }
    const o = (py * SIZE + px) * 4;
    if (a) { img[o] = r / a; img[o + 1] = g / a; img[o + 2] = b / a; img[o + 3] = a / n2; }
    shad[py * SIZE + px] = sh / n2;
  }
  // snap every pixel to the palette (in OKLab), hard edge
  const out = Buffer.alloc(SIZE * SIZE * 4), so = Buffer.alloc(SIZE * SIZE * 4), pick = new Int16Array(SIZE * SIZE).fill(-1);
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (img[i * 4 + 3] >= .5) { let best = 1e9, bi = 0; const q = oklab([img[i * 4], img[i * 4 + 1], img[i * 4 + 2]]); PAL_LAB.forEach((p, k) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < best) { best = d; bi = k; } }); pick[i] = bi; }
    if (shad[i] >= .5) so[i * 4 + 3] = 255;
  }
  // edge highlights: on an outward corner, the face turned to the light gets one tone paler; so does a top edge against the air
  const bump = new Int8Array(SIZE * SIZE);
  for (let py = 1; py < SIZE - 1; py++)for (let px = 1; px < SIZE - 1; px++) {
    const i = py * SIZE + px, o = i * 8; if (pick[i] < 0 || !(GB[o + 7] >= 0) || GB[o + 7] > 3) continue;
    const lp = GB[o + 1] * HB[0] + GB[o + 2] * HB[1] + GB[o + 3] * HB[2]; let hi = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = i + dy * SIZE + dx, q = j * 8;
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
  for (let py = 1; py < SIZE - 1; py++)for (let px = 1; px < SIZE - 1; px++) {      // drop stray single pixels left hanging in the air
    const i = py * SIZE + px; if (pick[i] < 0 || GB[i * 8 + 7] > 3) continue;
    let nb = 0; for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++)if ((dx || dy) && pick[i + dy * SIZE + dx] >= 0) nb++;
    if (nb <= 1) pick[i] = -2;
  }
  for (let i = 0; i < SIZE * SIZE; i++) if (pick[i] >= 0) {
    let k = pick[i]; if (bump[i]) { const [rn, ri] = PAL_AT[k]; if (rn !== 'moss' && rn !== 'grass' && ri + 1 < RAMP[rn].length) k += 1; }
    const c = PALETTE[k]; out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return { out, so };
}
for (const [nm, S] of Object.entries(SCENES)) {
  if (WHICH !== 'all' && !WHICH.split(',').includes(nm)) continue;
  for (const v of VIEWS) {
    const t0 = Date.now(), { out, so } = renderView(S, v);
    writePng(`${OUT}/${nm}_${v}.png`, out, SIZE, SIZE);
    writePng(`${OUT}/${S.shadow}_${v}.png`, so, SIZE, SIZE);
    console.log(nm, v, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
