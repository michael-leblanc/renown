// The kit for code-made props: everything a prop script needs except the prop's own shape.
// A prop is a function that gives the distance from a point to its surface (shapes written as maths).
// The kit looks at it through the tileset's camera, lights it, snaps every pixel to the tileset's colours
// (the camera, the sun, the colours and the shadow are in style.mjs, shared with the houses and with Blender)
// and writes 256 x 256 PNGs the test game's `_piece` takes unchanged (tile middle at 128,208), plus a ground shadow.
// How to write a prop with it: .claude/skills/renown-prop/SKILL.md. Example: scripts/art/props.mjs.
// No package needed.
import { writePng, readPng } from './png.mjs';
import { PPU, AX, AY, SIZE, RAMP, ROT, PALETTE, hex, sideView, screenToWorld, groundUnder, highlightDir, brightness, sunShadow, groundInShadow, snapper, paler } from './style.mjs';
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
export const ROCK = 0, WOOD = 1, IRON = 2, CANVAS = 3, GRASS = 4, FIRE = 5, LEATHER = 6, EARTH = 7, STRAW = 8;
/** Set these in the prop's sdf(): mat (ROCK, WOOD, IRON, CANVAS, GRASS, FIRE, LEATHER), grv (0 in a gap or groove, drawn dark; else 1),
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

/* ---------- the camera, the sun and the colours: shared with the houses and with Blender, so they live in style.mjs ---------- */
export { PPU, AX, AY, SIZE, RAMP };

/** Draws prop S from one side ('S', 'E', 'N' or 'W'). ss = samples per pixel side (3 for final, 2 for a draft).
 *  S needs: sdf(x, y, z) (sets `hit`), bound [half x, half height, half z] (a box that holds all of it, standing on the ground),
 *  H (height, for moss). Optional: boundZ (the box's middle along z), crack [x, yFrom, yTo] (a dark crack on a rock's front),
 *  noMoss (true for stone that stays bare, like a fire ring), cast(x, y, z) (the shape that throws the shadow, when part of the prop throws none),
 *  glow [x, y, z, reach] (a fire at that point: bare stone turned to it, within reach, is drawn in warm firelight).
 *  boards (true: WOOD takes the floor boards' colours), dim (tones darker everywhere, for a floor indoors).
 *  canvas [width, height, x, y] (a picture bigger than 256 x 256 for a big prop, with the tile's middle at x, y; anim.mjs's windmill and water wheel).
 *  Returns two RGBA buffers: the sprite, and its ground shadow (black; the game draws it at 0.3 alpha). */
export function render(S, name, ss = 3) {
  const [CW, CH, CAX, CAY] = S.canvas || [SIZE, SIZE, AX, AY];          // a bigger picture for a bigger prop (S.canvas: width, height, the tile middle's x and y)
  const { turn: toL, sun: L, dir: D } = sideView(name), HB = highlightDir(L);          // the camera and the sun, as this side sees them
  const B = S.bound, BZ = S.boundZ || 0;
  const sdf = (x, y, z) => { const db = sdBox(x, y - B[1], z - BZ, B[0], B[1], B[2], 0); return db > .2 ? db : S.sdf(x, y, z); };   // far from the box round the prop, skip the costly shapes
  const normal = (x, y, z) => { const e = .004; const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l]; };
  const cast = S.cast ? (x, y, z) => { const db = sdBox(x, y - B[1], z - BZ, B[0], B[1], B[2], 0); return db > .2 ? db : S.cast(x, y, z); } : sdf;   // what throws a shadow (a flame does not)
  const used = new Set();
  const img = new Float32Array(CW * CH * 4), shad = new Float32Array(CW * CH), GB = new Float32Array(CW * CH * 8).fill(NaN), mid = ss >> 1, n2 = ss * ss;
  for (let py = 0; py < CH; py++)for (let px = 0; px < CW; px++) {
    let r = 0, g = 0, b = 0, a = 0, sh = 0;
    for (let sy = 0; sy < ss; sy++)for (let sx = 0; sx < ss; sx++) {
      const W = screenToWorld(px + (sx + .5) / ss, py + (sy + .5) / ss, CAX, CAY), WY = W[1];
      const [lx0, lz0] = toL(W[0], W[2]);
      { const G = groundUnder(W), [gx, gz] = toL(G[0], G[1]); if (groundInShadow(cast, L, gx, gz)) sh++; }
      let t = -4.2, found = false, x = 0, y = 0, z = 0;
      for (let i = 0; i < 120 && t < 4.2; i++) {
        x = lx0 + D[0] * t; y = WY + D[1] * t; z = lz0 + D[2] * t;
        if (y < -.02) break;
        const d = sdf(x, y, z); if (d < .0012) { found = true; break; }
        t += d > .3 ? d - .22 : d * .8;
      }
      if (!found) continue;
      S.sdf(x, y, z); const mat = hit.mat, grv = hit.grv, vr = hit.var, n = normal(x, y, z);
      if (sx === mid && sy === mid) { const o = (py * CW + px) * 8; GB[o] = t; GB[o + 1] = n[0]; GB[o + 2] = n[1]; GB[o + 3] = n[2]; GB[o + 4] = x; GB[o + 5] = y; GB[o + 6] = z; GB[o + 7] = grv < .5 ? -1 : mat; }
      const ndl = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const s = ndl > .01 ? sunShadow(cast, L, x + n[0] * .012, y + n[1] * .012, z + n[2] * .012) : 0;
      let occ = 0; for (const [k, w] of [[.03, .5], [.08, .35], [.18, .25], [.35, .15]]) occ += (k - sdf(x + n[0] * k, y + n[1] * k, z + n[2] * k)) / k * w;
      const ao = clamp(1 - occ, .15, 1);
      const val = brightness(ao, n[1], ndl, s);                                      // how bright: 0 to 1
      // the material decides the colour ramp and which tone of it
      let ramp, idx;
      if (mat === GRASS) { ramp = RAMP.grass; idx = Math.round(1 + val * 2.6 + y * 6); }
      else if (mat === EARTH) {                                           // flat, soft: tone by light, a mottle, and darker where trodden or sooted (var 0 to 1, 1 the darkest)
        ramp = RAMP.earth; used.add('earth'); idx = Math.round(1 + val * 4.6) + (fbm3(x * 11, 1, z * 11) > .22 ? 1 : fbm3(x * 9 + 4, 2, z * 9) < -.26 ? -1 : 0) - Math.round(clamp(vr, 0, 1) * 3);
        if (grv < .5) idx -= 2;
      }
      else if (mat === STRAW) { ramp = RAMP.straw; used.add('straw'); idx = Math.round(val * 5.2 - .4 + (vr - .5) * 2); if (grv < .5) idx -= 2; }   // var: the odd paler or darker strand
      else if (mat === WOOD) {
        ramp = S.boards ? RAMP.boards : RAMP.wood; if (S.boards) used.add('boards'); idx = val < .16 ? 0 : val < .3 ? 1 : val < .47 ? 2 : val < .66 ? 3 : val < .84 ? 4 : 5;
        if (vr < 0) idx -= 2;                                                // inside a box
        else { idx += vr > .72 ? 1 : vr < .2 ? -1 : 0; if (fbm3(x * 3, y * 60, z * 3) > .3 && grv > .5) idx -= 1; }   // the odd paler or darker board, and a little grain
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
      else if (mat === LEATHER) {
        ramp = RAMP.leather; used.add('leather'); idx = val < .16 ? 0 : val < .3 ? 1 : val < .47 ? 2 : val < .66 ? 3 : val < .84 ? 4 : 5;
        idx += vr > .72 ? 1 : vr < .2 ? -1 : 0;                              // the odd paler or darker patch
        if (fbm3(x * 14 + 2, y * 14, z * 14) > .34) idx -= 1;                // scuffs
        if (grv < .5) idx -= 2;                                              // a seam or stitching
      }
      else if (mat === FIRE) { ramp = RAMP.fire; used.add('fire'); const f = clamp(-(n[0] * D[0] + n[1] * D[1] + n[2] * D[2]), 0, 1); idx = Math.round((.45 * f + .55 * clamp(vr, 0, 1)) * 5.4 - .2); }   // its own light: hot in the heart and low down, red at the rim and the tips
      else {
        const nz = fbm3(x * 5 + 3, y * 5, z * 5), H = S.H;
        const up = n[1] > .5 && nz > .08, low = y < .05 + .34 * (nz + .12 * fbm3(x * 13, y * 13, z * 13)), north = n[2] < -.35 && fbm3(x * 15, y * 6, z * 15) + .2 * fbm3(x * 30, y * 30, z * 30) > .02 + .55 * y / H;   // moss: on top, at the foot, and in streaks on the side away from the sun
        if (!S.noMoss && (up || low || north)) { ramp = RAMP.moss; idx = Math.round(.3 + val * 3.3); }
        else {
          ramp = RAMP.rock; idx = val < .22 ? 0 : val < .31 ? 1 : val < .41 ? 2 : val < .52 ? 3 : val < .62 ? 4 : val < .74 ? 5 : 6;
          idx += vr > .78 ? 1 : vr < .18 ? -1 : 0;                           // the odd paler or darker face
          { const st = fbm3(x * 10 + 9, y * 1.6, z * 10); if (st > .2) idx -= 1; else if (st < -.34) idx += 1; }   // rain streaks down the faces
          if (fbm3(x * 16, y * 16 + 4, z * 16) > .36) idx -= 1;               // pits
          if (S.glow) {                                                      // firelight on the faces turned to the fire
            const [gx, gy, gz, gr] = S.glow, vx = gx - x, vy = gy - y, vz = gz - z, gl = Math.hypot(vx, vy, vz), f = Math.max(0, (n[0] * vx + n[1] * vy + n[2] * vz) / gl) * clamp(1.15 - gl / gr, 0, 1);
            if (f > .2) { ramp = RAMP.lit; used.add('lit'); idx = (f > .62 ? 3 : f > .45 ? 2 : f > .3 ? 1 : 0) - (grv < .5 ? 1 : 0); }
          }
          const c = S.crack; if (c && n[2] > .3 && y > c[1] && y < c[2] && Math.abs(x - .035 * y - (c[0] + .035 * Math.sin(y * 7.5) + .015 * Math.sin(y * 21))) < .008) idx -= 2;
        }
      }
      if (S.dim) idx -= S.dim;                                              // a prop kept out of the sun (a floor indoors): every tone that much darker
      const c = ramp[clamp(idx, 0, ramp.length - 1)];
      r += c[0]; g += c[1]; b += c[2]; a++;
    }
    const o = (py * CW + px) * 4;
    if (a) { img[o] = r / a; img[o + 1] = g / a; img[o + 2] = b / a; img[o + 3] = a / n2; }
    shad[py * CW + px] = sh / n2;
  }
  // snap every pixel to the palette (nearest in OKLab), hard edge: no half-see-through pixels
  const snap = snapper(used);
  const out = Buffer.alloc(CW * CH * 4), so = Buffer.alloc(CW * CH * 4), pick = new Int16Array(CW * CH).fill(-1);
  for (let i = 0; i < CW * CH; i++) {
    if (img[i * 4 + 3] >= .5) pick[i] = snap([img[i * 4], img[i * 4 + 1], img[i * 4 + 2]]);
    if (shad[i] >= .5) so[i * 4 + 3] = 255;
  }
  // edge highlights: on an outward corner, the face turned to the light gets one tone paler; so does a top edge against the air
  const bump = new Int8Array(CW * CH);
  for (let py = 1; py < CH - 1; py++)for (let px = 1; px < CW - 1; px++) {
    const i = py * CW + px, o = i * 8; if (pick[i] < 0 || !(GB[o + 7] >= 0) || (GB[o + 7] > 3 && GB[o + 7] !== 6)) continue;
    const lp = GB[o + 1] * HB[0] + GB[o + 2] * HB[1] + GB[o + 3] * HB[2]; let hi = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = i + dy * CW + dx, q = j * 8;
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
  for (let py = 1; py < CH - 1; py++)for (let px = 1; px < CW - 1; px++) {      // drop stray single pixels left hanging in the air
    const i = py * CW + px; if (pick[i] < 0 || (GB[i * 8 + 7] > 3 && GB[i * 8 + 7] !== 6)) continue;
    let nb = 0; for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++)if ((dx || dy) && pick[i + dy * CW + dx] >= 0) nb++;
    if (nb <= 1) pick[i] = -2;
  }
  for (let i = 0; i < CW * CH; i++) if (pick[i] >= 0) {
    let k = pick[i]; if (bump[i]) k = paler(k);
    const c = PALETTE[k]; out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return { out, so };
}

/* ---------- looking at a draft: one picture of everything asked for, on grass, twice the size ---------- */
const CREATOR = 'game/client/art/creator/';            // the bought character parts, used only for the size figure in a draft
const FIGURE = [['Shadow', null], ['NakedBody', '#e8b48c'], ['Legs1', '#5b4636'], ['Shoes1', '#3a2a20'], ['Chest1', '#3f6fb5'], ['Head1', '#6b4a2b']];
/** Draws a human at the game's size (2.5 times the Creator's sheet, facing the viewer), feet at fx, fy of the cell that starts at x0, y0. */
const UP = 28;
function figure(dst, W, x0, y0, fx, fy) {
  for (const [part, tint] of FIGURE) {
    const p = readPng(`${CREATOR}${part}/Idle.png`), t = tint && hex(tint);
    for (let y = 0; y < 320; y++)for (let x = 0; x < 320; x++) {
      const cx = fx - 165 + x, cy = fy - 215 + y; if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) continue;      // the feet are at 66,86 of a 128 px frame
      const s = ((2 * 128 + Math.floor(y / 2.5)) * p.width + Math.floor(x / 2.5)) * 4, a = p.data[s + 3] / 255 * (t ? 1 : .35); if (!a) continue;
      const o = ((y0 + cy) * W + x0 + cx) * 4;
      for (let k = 0; k < 3; k++) dst[o + k] = Math.round(dst[o + k] * (1 - a) + (t ? Math.min(255, p.data[s + k] * t[k] / 185) : 0) * a);   // the parts are drawn in grey (185) and take a colour each
    }
  }
}
const GRASS_BG = [70, 96, 44];
function over(dst, W, x0, y0, src, alpha = 1) {      // lays a 256 x 256 RGBA picture on the sheet
  for (let y = 0; y < SIZE; y++)for (let x = 0; x < SIZE; x++) {
    const a = src[(y * SIZE + x) * 4 + 3] / 255 * alpha; if (!a || y0 + y < 0) continue;
    const o = ((y0 + y) * W + x0 + x) * 4, s = (y * SIZE + x) * 4;
    for (let k = 0; k < 3; k++) dst[o + k] = Math.round(dst[o + k] * (1 - a) + src[s + k] * a);
  }
}
function tone(buf) {                                 // average brightness and spread of a picture's solid pixels, 0 to 255
  let n = 0, s = 0, s2 = 0;
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 3] > 200) { const l = .3 * buf[i] + .59 * buf[i + 1] + .11 * buf[i + 2]; n++; s += l; s2 += l * l; }
  const m = n ? s / n : 0; return { n, mean: m, spread: n ? Math.sqrt(Math.max(0, s2 / n - m * m)) : 0 };
}

/** The command line every prop script shares. Call it with the script's props: { 'Name A1': { shadow: 'Name Shadow A1', sdf, bound, H, ... }, ... }.
 *    node scripts/art/<script>.mjs [names, comma separated | all] [--views S,E,N,W] [--ss 3] [--out dir]
 *    node scripts/art/<script>.mjs "Name A1" --draft [--beside "Stone A1_S"] [--with-character]
 *  --draft writes no sprite: it draws at 2 samples and saves one picture, scripts/art/out/art-draft.png (git-ignored), to look at.
 *  --beside adds a tileset piece to that picture and prints both pictures' brightness, to catch a prop that is too pale or too flat.
 *  --with-character adds the first side again with a human standing on the next tile, to judge the prop's size. */
export function run(PROPS) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
  const first = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all';
  const names = first === 'all' ? Object.keys(PROPS) : first.split(',');
  for (const n of names) if (!PROPS[n]) { console.error(`No prop named "${n}". There are: ${Object.keys(PROPS).join(', ')}`); process.exit(1); }
  const draft = argv.includes('--draft'), views = flag('--views', 'S,E,N,W').split(','), ss = +flag('--ss', draft ? 2 : 3);
  const out = flag('--out', 'game/client/art/made'), beside = flag('--beside', ''), person = draft && argv.includes('--with-character');
  if (person && !existsSync(`${CREATOR}NakedBody/Idle.png`)) { console.error(`--with-character: no character parts in ${CREATOR}`); process.exit(1); }
  for (const v of views) if (!ROT[v]) { console.error(`--views: no side "${v}". The sides are S, E, N, W.`); process.exit(1); }
  let piece = null;
  if (beside) {
    const p = ['game/client/art/tiles/', 'game/client/art/made/'].map(d => `${d}${beside}.png`).find(existsSync);
    if (!p) { console.error(`--beside: no ${beside}.png in game/client/art/tiles/ or game/client/art/made/`); process.exit(1); }
    piece = readPng(p);
    if (piece.width !== SIZE || piece.height !== SIZE) { console.error(`--beside: ${beside}.png is not ${SIZE} x ${SIZE}`); process.exit(1); }
  }
  const cols = views.length + (person ? 1 : 0) + (piece ? 1 : 0), W = cols * SIZE, Hh = names.length * SIZE, sheet = Buffer.alloc(W * Hh * 4);
  for (let i = 0; i < W * Hh; i++) { sheet[i * 4] = GRASS_BG[0]; sheet[i * 4 + 1] = GRASS_BG[1]; sheet[i * 4 + 2] = GRASS_BG[2]; sheet[i * 4 + 3] = 255; }
  names.forEach((nm, row) => {
    const t0 = Date.now(); let t;
    views.forEach((v, col) => {
      const r = render(PROPS[nm], v, ss);
      if (draft) {
        over(sheet, W, col * SIZE, row * SIZE, r.so, .3); over(sheet, W, col * SIZE, row * SIZE, r.out); if (!col) t = tone(r.out);
        if (!col && person) { const x0 = views.length * SIZE, y0 = row * SIZE - UP; over(sheet, W, x0, y0, r.so, .3); over(sheet, W, x0, y0, r.out); figure(sheet, W, x0, row * SIZE, AX - 64, AY + 32 - UP); }   // the human stands one tile nearer, to the left; both are moved up so the feet fit
      }
      else { writePng(`${out}/${nm}_${v}.png`, r.out, SIZE, SIZE); writePng(`${out}/${PROPS[nm].shadow}_${v}.png`, r.so, SIZE, SIZE); }
    });
    if (draft && piece) over(sheet, W, (cols - 1) * SIZE, row * SIZE, piece.data);
    console.log(`${nm}: ${views.length} side${views.length > 1 ? 's' : ''} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (t ? `; brightness ${t.mean.toFixed(0)}, spread ${t.spread.toFixed(0)}` : ''));
  });
  if (draft) {
    if (piece) { const t = tone(piece.data); console.log(`${beside} (tileset): brightness ${t.mean.toFixed(0)}, spread ${t.spread.toFixed(0)}`); }
    // cut away the empty grass: keep, for each prop, only the rows something is drawn on, and the same span of columns in every cell
    const bg = i => sheet[i * 4] === GRASS_BG[0] && sheet[i * 4 + 1] === GRASS_BG[1] && sheet[i * 4 + 2] === GRASS_BG[2];
    let x0 = SIZE, x1 = 0; const rows = [];
    names.forEach((_, row) => {
      let y0 = SIZE, y1 = 0;
      for (let y = 0; y < SIZE; y++)for (let x = 0; x < W; x++) if (!bg((row * SIZE + y) * W + x)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x % SIZE); x1 = Math.max(x1, x % SIZE); }
      for (let y = Math.max(0, y0 - 6); y <= Math.min(SIZE - 1, y1 + 6); y++) rows.push(row * SIZE + y);
    });
    x0 = Math.max(0, x0 - 6); x1 = Math.min(SIZE - 1, x1 + 6);
    const cw = x1 - x0 + 1, CW2 = cw * cols, z = clamp(Math.floor(1800 / CW2), 2, 4), big = Buffer.alloc(CW2 * z * rows.length * z * 4);   // 2 to 4 times the size, hard pixels
    for (let y = 0; y < rows.length * z; y++)for (let x = 0; x < CW2 * z; x++) {
      const sx = Math.floor(x / z), src = (rows[Math.floor(y / z)] * W + Math.floor(sx / cw) * SIZE + x0 + sx % cw) * 4;
      sheet.copy(big, (y * CW2 * z + x) * 4, src, src + 4);
    }
    writePng('scripts/art/out/art-draft.png', big, CW2 * z, rows.length * z);
    console.log('Draft picture: scripts/art/out/art-draft.png (nothing written to ' + out + ')');
  } else console.log(`Wrote ${names.length * views.length * 2} PNGs to ${out}`);
}
