// Dawndoor's lone stone doorway (D108), built from maths shapes and rendered to
// 256 x 256 PNG sprites in the tileset's own projection (128 x 64 tiles, anchor 128,208).
// Ray marching over maths shapes (signed distance functions), on the processor; no package needed.
// About 22 seconds a rotation.
// Usage, from the repo root: node scripts/art/doorway.mjs [outdir, default prototype/art/made] [S,E,N,W] [supersample, default 3]
import { writePng } from './png.mjs';
const OUT = process.argv[2] || 'prototype/art/made', VIEWS = (process.argv[3] || 'S,E,N,W').split(','), SS = +(process.argv[4] || 3);

/* ---------- maths ---------- */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const mix = (a, b, t) => a + (b - a) * t;
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
function sdCap(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
}
// cell noise: distance to the nearest and second nearest stone centre, and the nearest stone's id
let F1 = 0, F2 = 0, SID = 0;
function worley(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let a = 9, b = 9, id = 0;
  for (let k = -1; k <= 1; k++)for (let j = -1; j <= 1; j++)for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, cz = iz + k;
    const px = cx + .15 + .7 * h3(cx, cy, cz), py = cy + .15 + .7 * h3(cx + 31, cy + 17, cz + 5), pz = cz + .15 + .7 * h3(cx + 7, cy + 53, cz + 29);
    const d = Math.sqrt((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2);
    if (d < a) { b = a; a = d; id = h3(cx + 101, cy + 211, cz + 307); } else if (d < b) b = d;
  }
  F1 = a; F2 = b; SID = id;
}

/* ---------- the doorway, in its own space: x across, y up, z through the opening (front is +z) ---------- */
const OW = .45, PW = .28, HW = OW + PW, TH = .19, YS = 1.15, RA = .45;
const FALLEN = [[-.97, .27, .10, .065, .085, 1], [.93, -.29, .12, .08, .095, 2], [.63, .43, .07, .05, .06, 3], [-.60, -.45, .085, .06, .07, 4], [1.02, .12, .06, .045, .055, 5], [-1.04, -.06, .07, .05, .06, 6]];
const TUFTS = []; {
  const at = [[-.86, .27], [-.56, .29], [.56, .28], [.84, .27], [.98, -.06], [-.96, -.2], [-.52, -.29], [.57, -.3], [.86, -.21], [-1.02, .1], [.72, .46], [-.76, -.44]];
  at.forEach((p, i) => { const bl = []; for (let j = 0; j < 5; j++) { const a = h3(i, j, 1) * 6.283, r = .03 + .03 * h3(i, j, 2), hgt = .09 + .12 * h3(i, j, 3), ln = .05 + .07 * h3(i, j, 4); bl.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[0] + Math.cos(a) * (r + ln), hgt, p[1] + Math.sin(a) * (r + ln)]); } TUFTS.push({ x: p[0], z: p[1], bl }); });
}
const IVY = []; {
  let s = 7; const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffff) / 65536; };
  for (let y = .05; y < 1.5; y += .042) {                      // main stem up the front of the left pier
    const x = -.60 + .07 * Math.sin(y * 5.3) - .05 * y;
    for (let k = 0; k < 2; k++)IVY.push([x + (rnd() - .5) * .13, y + (rnd() - .5) * .05, TH + .012, .034 + rnd() * .018]);
  }
  for (let t = 0; t < 1; t += .05) {                          // a branch round the outer corner
    const y = .45 + .75 * t + (rnd() - .5) * .06; IVY.push([-HW - .012, y, TH - .34 * t + (rnd() - .5) * .05, .032 + rnd() * .016]);
  }
  for (let i = 0; i < 9; i++)IVY.push([-.95 + rnd() * .22, 1.0 - 3.2 * Math.max(0, rnd() * .2) + rnd() * .1, TH * .82 + .01, .03 + rnd() * .015]);   // onto the broken wall
}
let MAT = 0, GRV = 1, STONE = 0;                                // set by scene(): material, groove measure, stone id
function scene(x, y, z) {
  const ax = Math.abs(x); let d, m = 0;
  // rubble masonry: the wall that is left, ragged along the top
  const top = Math.round((2.12 - .34 * sstep(-.1, .75, x) + .14 * (vn3(x * 6 + 1.3, 2.2, .5) - .5)) / .09) * .09;
  let b = sdBox(x, y - top / 2, z, HW + .035 * sstep(.6, 0, y), top / 2, TH, .015);
  const tl = Math.max(.14, Math.round((1.4 - 3.6 * Math.max(0, -x - .72) + .1 * (vn3(x * 9, 5.1, .5) - .5)) / .14) * .14);
  const tr = Math.max(.14, Math.round((.9 - 2.6 * Math.max(0, x - .72) + .1 * (vn3(x * 9, 8.4, .5) - .5)) / .14) * .14);
  b = Math.min(b, sdBox(x + .835, y - tl / 2, z, .135, tl / 2, TH * .82, .015), sdBox(x - .815, y - tr / 2, z, .115, tr / 2, TH * .82, .015));
  const open = y < YS ? ax - OW : Math.hypot(x, y - YS) - RA;
  b = Math.max(b, -open);
  GRV = 1; STONE = 0;
  if (b < .08) { worley(x / .24, y / .18, z / .24); const e = F2 - F1; b += .02 * (1 - sstep(0, .11, e)) - .008 * Math.min(1, e / .5); GRV = e; STONE = SID; }
  d = b;
  // dressed stone: arch ring, keystone, imposts, plinths
  if (y > YS - .2 && ax < RA + .3) {
    const r = Math.hypot(x, y - YS);
    let ring = Math.max(Math.abs(r - (RA + .09)) - .09, Math.abs(z) - (TH + .042), YS - y);
    if (ring < .05) { const a = Math.atan2(y - YS, x) / (Math.PI / 9), fj = Math.abs(a - Math.round(a)); ring += .02 * (1 - sstep(0, .09, fj)); if (ring < d) { GRV = fj < .075 ? .02 : 1; STONE = h3(Math.floor(a) + 40, 3, 9) * .5 + .25; } }
    ring = Math.min(ring, sdBox(x, y - (YS + RA + .12), z, .085, .135, TH + .065, .012));
    if (ring < d) { d = ring; m = 1; if (Math.abs(x) < .09 && y > YS + RA - .03) { GRV = 1; STONE = .5; } }
  }
  const imp = sdBox(ax - (OW + .15), y - (YS - .045), z, .18, .045, TH + .04, .012); if (imp < d) { d = imp; m = 1; GRV = 1; STONE = .6; }
  let pl = sdBox(ax - (OW + PW / 2 + .01), y - .08, z, PW / 2 + .05, .08, TH + .05, .02);
  if (pl < .04) { const j = Math.abs(ax - (OW + PW / 2 + .03)); pl += .012 * (1 - sstep(0, .012, j)); }
  if (pl < d) { d = pl; m = 1; GRV = 1; STONE = .45; }
  // threshold slab
  const sl = sdBox(x, y - .025, z, OW + .03, .03, TH + .13, .012); if (sl < d) { d = sl; m = 2; GRV = 1; STONE = .5; }
  if (m && d < .05) d += .005 * fbm3(x * 14, y * 14, z * 14);
  // fallen stones
  if (y < .3) for (const f of FALLEN) {
    const lx = x - f[0], lz = z - f[1]; if (lx * lx + lz * lz > .09) continue;
    const mn = Math.min(f[2], f[3], f[4]), q = (Math.hypot(lx / f[2], (y - f[3] * .35) / f[3], lz / f[4]) - 1) * mn + .45 * mn * fbm3(x * 9 + f[5], y * 9, z * 9);
    if (q * .7 < d) { d = q * .7; m = 3; GRV = 1; STONE = f[5] / 7; }
  }
  // grass
  if (y < .3) for (const t of TUFTS) {
    const lx = x - t.x, lz = z - t.z; if (lx * lx + lz * lz > .04) continue;
    for (const bl of t.bl) { const q = sdCap(x, y, z, bl[0], -.01, bl[1], bl[2], bl[3], bl[4], .016, .003); if (q < d) { d = q; m = 4; } }
  }
  // ivy
  if (x < -.3 && y < 1.7) for (const l of IVY) { const q = Math.hypot(x - l[0], y - l[1], (z - l[2]) * 1.6) - l[3]; if (q < d) { d = q; m = 5; STONE = l[3] * 20 % 1; } }
  MAT = m; return d;
}

/* ---------- camera: the tileset's 2:1 view (128 x 64 tiles) ---------- */
const PPU = 90.5097, AX = 128, AY = 208, SIZE = 256;
const DV = [-.612372, -.5, -.612372], RV = [.707107, 0, -.707107], UV = [-.353553, .866025, -.353553];
let LW = [.55, .80, .25]; { const l = Math.hypot(...LW); LW = LW.map(v => v / l); }
const ROT = { S: [1, 0, 0, 1], E: [0, -1, 1, 0], N: [-1, 0, 0, -1], W: [0, 1, -1, 0] };   // local x = a*X + b*Z, local z = c*X + d*Z
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RAMP = {
  stone: ['#3f3d38', '#4a4741', '#56534c', '#636058', '#726c5f', '#7c7568', '#8b8578'].map(hex),
  moss: ['#22330f', '#2c4416', '#3c5421', '#455f27', '#587430'].map(hex),
  grass: ['#2b4315', '#35501c', '#3f5824', '#4f6c2c', '#668537'].map(hex),
  ivy: ['#14290a', '#1a3508', '#27480f', '#35601a', '#497a25'].map(hex)
};
const PALETTE = Object.values(RAMP).flat();

function renderView(name) {
  const R = ROT[name], [ra, rb, rc, rd] = R;
  const toL = (X, Z) => [ra * X + rb * Z, rc * X + rd * Z];
  const L = [ra * LW[0] + rb * LW[2], LW[1], rc * LW[0] + rd * LW[2]];
  const D = [ra * DV[0] + rb * DV[2], DV[1], rc * DV[0] + rd * DV[2]];
  const sdf = scene;
  const normal = (x, y, z) => { const e = .004; const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l]; };
  const shadow = (x, y, z) => { let res = 1, t = .03; for (let i = 0; i < 48 && t < 3.2; i++) { const d = sdf(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (d < .002) return 0; res = Math.min(res, 14 * d / t); t += clamp(d, .012, .15); } return res; };
  const img = new Float32Array(SIZE * SIZE * 4), shad = new Float32Array(SIZE * SIZE);
  const n2 = SS * SS;
  for (let py = 0; py < SIZE; py++)for (let px = 0; px < SIZE; px++) {
    let r = 0, g = 0, b = 0, a = 0, sh = 0;
    for (let sy = 0; sy < SS; sy++)for (let sx = 0; sx < SS; sx++) {
      const u = (px + (sx + .5) / SS - AX) / PPU, v = (AY - (py + (sy + .5) / SS)) / PPU;
      const WX = u * RV[0] + v * UV[0], WY = v * UV[1], WZ = u * RV[2] + v * UV[2];
      const [lx0, lz0] = toL(WX, WZ);
      // ground shadow: the point of the ground plane seen through this sample
      { const tg = -WY / DV[1], GX = WX + DV[0] * tg, GZ = WZ + DV[2] * tg, [gx, gz] = toL(GX, GZ); if (Math.abs(gx) < 2.4 && Math.abs(gz) < 2.4 && shadow(gx, .012, gz) < .5) sh++; }
      let t = -4.2, hit = false, x = 0, y = 0, z = 0;
      for (let i = 0; i < 110 && t < 4.2; i++) {
        x = lx0 + D[0] * t; y = WY + D[1] * t; z = lz0 + D[2] * t;
        if (y < -.02) break;
        const d = sdf(x, y, z); if (d < .0012) { hit = true; break; }
        t += d > .3 ? d - .22 : d * .8;
      }
      if (!hit) continue;
      const mat = MAT, grv = GRV, stone = STONE, n = normal(x, y, z);
      const ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const s = ndl > .01 ? shadow(x + n[0] * .012, y + n[1] * .012, z + n[2] * .012) : 0;
      let occ = 0; for (const [k, w] of [[.03, .5], [.08, .35], [.18, .25], [.35, .15]]) occ += (k - sdf(x + n[0] * k, y + n[1] * k, z + n[2] * k)) / k * w;
      const ao = clamp(1 - occ, .15, 1);
      let val = .48 * ao * (.74 + .26 * n[1]) + .52 * ndl * Math.min(1, s);
      let ramp = RAMP.stone, idx;
      const nz = fbm3(x * 5 + 3, y * 5, z * 5);
      if (mat === 4) { ramp = RAMP.grass; idx = Math.round(1 + val * 2.6 + y * 6); }
      else if (mat === 5) { ramp = RAMP.ivy; idx = Math.round(.6 + val * 3.4 + (stone > .6 ? .8 : 0)); }
      else {
        // moss: on upward faces, low down, and more on the back
        const up = n[1] > .55 && y > .12, low = y < .30 + .25 * nz && mat !== 2, back = z < 0 && n[2] < -.5 && y < .9 + nz;
        const mossy = (up && nz > (y > 1.5 ? .0 : .14)) || (low && nz > .04) || (back && fbm3(x * 7, y * 7, z * 7) > .16);
        if (mossy && grv > .06) { ramp = RAMP.moss; idx = Math.round(.3 + val * 3.3); }
        else {
          idx = val < .2 ? 1 : val < .34 ? 2 : val < .55 ? 3 : val < .72 ? 4 : val < .88 ? 5 : 6;
          if (mat === 0 || mat === 3) idx += stone > .7 ? 1 : stone < .13 ? -1 : 0;        // the odd lighter or darker stone
          if (mat === 1) idx += 1;                                            // dressed stone is a little paler
          if (mat === 2) idx += 1;
          if (grv < .08) idx -= (mat === 1 || ao < .55) ? 2 : 1;                              // joints between stones
          else if (mat === 2 && Math.abs(x - .08 - .06 * Math.sin(z * 9)) < .009) idx -= 2;  // a crack across the threshold
          else if (mat === 0 && z > 0 && x > OW + .04 && Math.abs(x - (.60 + .035 * Math.sin(y * 7.5) + .02 * Math.sin(y * 19))) < .008 && y > .25 && y < 1.02) idx -= 2;   // a crack up the right pier
        }
      }
      const c = ramp[clamp(idx, 0, ramp.length - 1)];
      r += c[0]; g += c[1]; b += c[2]; a++;
    }
    const o = (py * SIZE + px) * 4;
    if (a) { img[o] = r / a; img[o + 1] = g / a; img[o + 2] = b / a; img[o + 3] = a / n2; }
    shad[py * SIZE + px] = sh / n2;
  }
  // snap every pixel to the palette, hard edge: the tileset's pieces are drawn the same way
  const out = Buffer.alloc(SIZE * SIZE * 4), so = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (img[i * 4 + 3] >= .5) {
      let best = 1e9, bc = PALETTE[0];
      for (const p of PALETTE) { const d = (p[0] - img[i * 4]) ** 2 * .3 + (p[1] - img[i * 4 + 1]) ** 2 * .59 + (p[2] - img[i * 4 + 2]) ** 2 * .11; if (d < best) { best = d; bc = p; } }
      out[i * 4] = bc[0]; out[i * 4 + 1] = bc[1]; out[i * 4 + 2] = bc[2]; out[i * 4 + 3] = 255;
    }
    if (shad[i] >= .5) so[i * 4 + 3] = 255;
  }
  return { out, so };
}
for (const v of VIEWS) {
  const t0 = Date.now(), { out, so } = renderView(v);
  writePng(`${OUT}/Doorway A1_${v}.png`, out, SIZE, SIZE);
  writePng(`${OUT}/Doorway Shadow_${v}.png`, so, SIZE, SIZE);
  console.log(v, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
