// Round buildings for the drafts (Michael, 2026-11-21: "more round ... now it feels like everything is square").
// The bought packs have no curved wall or roof pieces, so a round building is drawn here by code: a wall bent into a
// ring, cones and domes for the roof, each point of them found by following the line of sight through the picture's
// pixel (the same 2:1 view as the tiles). The look comes from the pack: a wall or roof piece is flattened into a
// texture and wrapped round, and the hide, wood and bone colours are the pack's own.
//
// What comes out has the shape buildings.mjs makes for a square building: { w, d, T, sv, set, pieces }, with the
// picture cut into one 256 x 256 piece per tile and part ('wall' behind, 'near' in front, 'roof', 'ground'), so the
// scene page sorts it with the characters, hides the roof and fades the near wall like any other building (D208).
// Not run on its own: buildings.mjs lists the drafts.
import { readPng } from './png.mjs';

const TILES = 'game/client/art/tiles/', AX = 128, AY = 208;
const cache = {}, load = n => cache[n] ||= readPng(`${TILES}${n}.png`);

/** A wall piece standing on its tile's south-west edge (_S), flattened: 64 wide (along the wall), 176 high (h 0 at the ground). */
function wallTex(n) {
  const im = load(n), d = new Uint8Array(64 * 176 * 4);
  for (let s = 0; s < 64; s++) for (let h = 0; h < 176; h++) {
    const x = 64 + s, y = Math.floor(208 + s / 2 - h); if (y < 0 || y > 255) continue;
    d.set(im.data.subarray((y * 256 + x) * 4, (y * 256 + x) * 4 + 4), (h * 64 + s) * 4);
  }
  return d;
}
/** A roof slope piece facing south-west (_S), flattened: 64 along the eave, 64 up the slope (b 0 at the eave). */
function roofTex(n) {
  const im = load(n), d = new Uint8Array(64 * 64 * 4);
  for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) {
    const x = Math.round(64 + a + b), y = Math.round(208 + a / 2 - b * 1.5); if (y < 0 || y > 255) continue;
    d.set(im.data.subarray((y * 256 + x) * 4, (y * 256 + x) * 4 + 4), (b * 64 + a) * 4);
  }
  return d;
}
const tex = {}, wallT = n => tex[n] ||= wallTex(n), roofT = n => tex[n] ||= roofTex(n);
const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mul = (c, m) => [c[0] * m, c[1] * m, c[2] * m];

// the pack's own colours: the yurt's hide and its red band, bone (the rib cages), the palisade's wood, the dark of a room
const HIDE = [[99, 75, 56], [115, 89, 67], [135, 107, 83], [84, 64, 48]], BAND = [124, 38, 44], BONE = [[150, 146, 133], [176, 172, 158], [118, 114, 102]];
const STONE = [[138, 113, 80], [150, 125, 90], [128, 108, 80], [86, 70, 52]];
const WOOD = [[130, 110, 78], [116, 97, 68], [142, 121, 87], [84, 68, 48]], DARK = [44, 33, 24];

/* ---------- what a surface is painted with: (arc along it in tiles from the back, height in px, the hit) -> [r, g, b] or null ---------- */
const PAINT = {
  // a pack wall bent round. The piece's middle is laid one way, then the other, so no seam shows where it repeats
  wall: (o) => { const t = wallT(o.tex), th = o.texH || 132; return (arc, z) => {
    const f = arc - Math.floor(arc), m = Math.floor(arc) % 2 ? 1 - f : f, s = 6 + Math.floor(m * 51), h = Math.min(175, Math.floor(z * th / o.H)), k = (h * 64 + s) * 4;
    return t[k + 3] > 128 ? [t[k], t[k + 1], t[k + 2]] : null; }; },
  // a palisade bent round: stakes side by side in the pack's palisade colours, a dark gap between, each cut to a point
  stakes: (o) => (arc, z) => {
    const n = o.per || 7, g = arc * n, gi = Math.floor(g), f = g - gi, top = o.H - 4 - hash(gi, 7) * 8, tip = 14;
    if (z > top - tip && Math.abs(f - 0.5) * 2 > (top - z) / tip) return null;
    if (o.foot && z < o.foot + hash(gi, 3) * 4) return mul(WOOD[1], 0.82 + hash(Math.floor(arc * 9), 5) * 0.1);   // earth banked against the foot
    const c = f < 0.1 ? WOOD[3] : f > 0.78 ? WOOD[1] : hash(gi, 1) > 0.6 ? WOOD[2] : WOOD[0];
    return hash(Math.floor(g * 8), Math.floor(z / 3)) > 0.97 ? mul(c, 0.85) : c; },
  // dry stone laid in courses: rounded stones of uneven width in the pack's stone colours, dark joints
  stones: (o) => (arc, z) => {
    const rh = o.course || 13, row = Math.floor(z / rh), fz = z / rh - row, wd = 0.2 + hash(row, 21) * 0.08, g = arc / wd + hash(row, 22), gi = Math.floor(g), f = g - gi;
    const px = Math.min(f, 1 - f) * wd * 64, pz = Math.min(fz, 1 - fz) * rh;
    if (px < 1.2 || pz < 1.2 || (px < 3 && pz < 3)) return STONE[3];
    const c = STONE[Math.floor(hash(gi, row + 40) * 3)];
    return pz > rh / 2 - 2.5 && fz > 0.5 ? mul(c, 1.07) : c; },
  // thatch in skirts, one a tile of slope: each skirt is the pack's thatch wrapped round, and throws a ragged shadow on the one below
  thatch: (o) => { const t = roofT(o.tex); return (arc, z, hit) => {
    const up = hit.up, row = Math.floor(up), b = up - row, ringR = Math.max(0.5, hit.r0 - row), n = Math.max(3, Math.round(2 * Math.PI * ringR));
    const a = ((hit.turn * n + row * 0.37) % 1 + 1) % 1, k = (Math.min(63, Math.floor(b * 64)) * 64 + Math.floor(a * 64)) * 4;
    const c = t[k + 3] > 128 ? [t[k], t[k + 1], t[k + 2]] : [108, 95, 74];
    const under = b * 64 > 60 - hash(Math.floor(hit.turn * n * 20), row) * 4 && hit.way < 0.92;
    return mul(c, under ? 0.7 : b * 64 < 3 && row > 0 ? 1.08 : 1); }; },
  // stitched hides, as on the pack's yurt: gores from the top down, every other one paler, a dark seam between, a patch here and there
  hide: (o) => (arc, z, hit) => {
    const n = o.gores || 16, g = hit.turn * n + (hash(Math.floor(hit.turn * n), Math.floor(hit.way * 14)) - 0.5) * 0.05, gi = Math.floor(g), f = g - gi;
    let c = HIDE[gi % 2 ? 1 : 0];
    if (f < 0.06) c = HIDE[3];
    else if (hash(gi, 11 + Math.floor(hit.way * 2.2 + hash(gi, 4))) > 0.84) c = HIDE[2];
    if (o.band && z < o.band) c = z < 2 || z > o.band - 2 ? mul(BAND, 0.8) : BAND;
    return c; },
  // daubed mud or clay: one colour, darker blotches, a few pale flecks
  mud: (o) => (arc, z) => {
    const c = o.color || [131, 108, 68], cu = arc * 2.2, cz = z / 30, gi = Math.floor(cu), gz = Math.floor(cz), ex = (cu - gi - 0.3 - hash(gi, gz) * 0.4) / 0.28, ez = (cz - gz - 0.3 - hash(gz, gi + 9) * 0.4) / 0.22;
    const patch = hash(gi + 3, gz + 5) > 0.72 && ex * ex + ez * ez < 1, fl = hash(Math.floor(arc * 64), Math.floor(z));
    return mul(c, patch ? 0.93 : fl > 0.99 ? 1.1 : fl < 0.006 ? 0.88 : 1); },
  flat: (o) => () => o.color,
};

/**
 * A round building on a square of D by D tiles.
 *  wall: { paint: 'wall' | 'stakes' | 'stones' | 'mud', tex?, H, r?, tint?, holes? }   the ring wall, H pixels high; holes: [{ at (degrees), z?, w?, h? }] small round windows
 *  roofs: [{ kind: 'cone' | 'dome', r0, z0, r1, z1, paint, tint?, ... }]   cone: radius r0 (tiles) at height z0 (px) to r1 at z1; dome: r0 wide on z0, z1 - z0 high
 *  door: { tex, tint? }                                  a pack door piece (_E stands on the south-west edge) set into the wall, facing south-west
 *  props: [[name, i, j, lift, key, part, tint]]          pack pieces, as in build()
 *  bones: [{ at (degrees: 0 east, 90 south-west door side), r, z, h, out, back, w }]   tusks standing round the building
 *  floor: (u, v) => colour                               the floor inside, cut round (floorPaint)
 */
export function round({ D, wall, roofs = [], door = null, props = [], floor = null, light, set = 'desert/', bones = [], shadow = 1, land = null }) {
  const R = D / 2, C = R, rw = wall.r ?? R - 0.12, P = [], uses = new Set();
  const inside = (i, j) => Math.hypot(i + 0.5 - C, j + 0.5 - C) < R;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // a point of the building belongs to the tile of the room nearest to it, so that a character in the room is drawn before the
  // wall in front of him and after the wall behind him
  const tileOf = (u, v) => {
    let du = u - C, dv = v - C; const r = Math.hypot(du, dv), m = Math.max(0, R - 0.75);
    if (r > m) { du *= m / r; dv *= m / r; }
    return [clamp(Math.floor(C + du), 0, D - 1), clamp(Math.floor(C + dv), 0, D - 1)];
  };
  wall = { paint: 'wall', ...wall };
  const wp = PAINT[wall.paint](wall); if (wall.tex) uses.add(wall.tex);
  const doorT = door ? wallT(set + door.tex) : null; if (door) uses.add(set + door.tex);
  const doorAt = Math.acos(0.5 / rw);   // the door stands in the middle of a tile's edge (tile C, D - 1), a little off the ring's own south-west point
  // light from the right, as in buildings.mjs: a face turned to the viewer's left is darker; in steps, as the pack shades
  const lit = (ang, base, amp) => Math.round((base + amp * Math.cos(ang + Math.PI / 4)) / 0.03) * 0.03;
  const frames = new Map(); let lost = 0;
  const frame = (part, name, i, j, lift, key) => { const id = `${name}|${i},${j}|${lift}`; let f = frames.get(id); if (!f) frames.set(id, f = { n: `#round ${name}`, i, j, lift, key: i + j + key, part, data: Buffer.alloc(256 * 256 * 4) }); return f; };
  const plot = (part, name, u, v, X, Y, lift, key, c, a = 255) => {
    // the room's nearest tile; the ground, and a point too far from that tile to fit its piece (the eaves at the far left and right), go to the tile under them
    let [i, j] = part === 'ground' ? [Math.floor(u), Math.floor(v)] : tileOf(u, v), px = X - (i - j) * 64 + AX, py = Y - (i + j) * 32 + AY + lift;
    if (px < 0 || px > 255 || py < 0 || py > 255) { i = clamp(Math.floor(u), 0, D - 1); j = clamp(Math.floor(v), 0, D - 1); px = X - (i - j) * 64 + AX; py = Y - (i + j) * 32 + AY + lift; }
    if (px < 0 || px > 255 || py < 0 || py > 255) { lost++; return; }
    frame(part, name, i, j, lift, key).data.set([clamp(Math.round(c[0]), 0, 255), clamp(Math.round(c[1]), 0, 255), clamp(Math.round(c[2]), 0, 255), a], (py * 256 + px) * 4);
  };
  for (const r of roofs) { r.fn = PAINT[r.paint](r); if (r.tex) uses.add(r.tex); }
  const zTop = Math.max(wall.H, ...roofs.map(r => r.z1)), over = Math.max(R, ...roofs.map(r => r.r0)) + 0.2, zRoof = roofs.length ? Math.min(...roofs.map(r => r.z0)) : 0;
  const sv = light.shadow.map(v => v * shadow), sr = roofs.length ? Math.max(rw, ...roofs.map(r => r.r0)) - 0.15 : rw;
  const x0 = Math.floor(-(over + C) * 64 + sv[0] * 64 - 96), x1 = Math.ceil((over + C) * 64 + 16), y0 = Math.floor((2 * C - 1 - 2 * over) * 32 - zTop - 8), y1 = Math.ceil((2 * C - 1 + 2 * over + sv[1] * 2) * 32 + 48);
  const roots = (A, B, Cc) => { if (Math.abs(A) < 1e-9) return B ? [-Cc / B] : []; const q = B * B - 4 * A * Cc; if (q < 0) return []; const s = Math.sqrt(q); return [(-B - s) / (2 * A), (-B + s) / (2 * A)].sort((a, b) => a - b); };
  for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
    // the line of sight through this pixel: (ug + t, vg + t) over the ground, at height 64 t
    const sum = (Y + 0.5) / 32 + 1, dif = (X + 0.5) / 64, a = (sum + dif) / 2 - C, b = (sum - dif) / 2 - C;
    // the ground: the floor inside, the shadow outside (the building's outline pushed along the light)
    const rg = Math.hypot(a, b);
    if (rg < rw) { if (floor) plot('ground', 'floor', a + C, b + C, X, Y, 0, 0, floor(a + C, b + C)); }
    else { const t = clamp((a * sv[0] + b * sv[1]) / (sv[0] * sv[0] + sv[1] * sv[1]), 0, 1); if (Math.hypot(a - t * sv[0], b - t * sv[1]) < sr) plot('ground', 'shadow', a + C, b + C, X, Y, 0, 0, [0, 0, 0], light.shadowAlpha); }
    // the wall: its inner face behind (the smaller t), its outer face in front (the larger)
    const ts = roots(2, 2 * (a + b), a * a + b * b - rw * rw);
    ts.forEach((t, k) => {
      const z = 64 * t; if (z < 0 || z >= wall.H) return;
      const du = a + t, dv = b + t, ang = Math.atan2(dv, du), turn = ((ang + 0.75 * Math.PI) / (2 * Math.PI) % 1 + 1) % 1, ring = 2 * Math.PI * rw, n = Math.round(ring / 2) * 2;
      let c = wp(turn * n, z, { turn }), isDoor = false;
      if (door) { const q = (ang - doorAt) * rw;   // along the wall from the door's middle, in tiles
        if (Math.abs(q) < 0.5) { const s = clamp(Math.floor((0.5 - q) * 64), 0, 63), kk = (Math.min(175, Math.floor(z)) * 64 + s) * 4; const on = (ds, dz) => doorT[(clamp(Math.floor(z) + dz, 0, 175) * 64 + clamp(s + ds, 0, 63)) * 4 + 3] > 128;
          if (doorT[kk + 3] > 128) { c = [doorT[kk], doorT[kk + 1], doorT[kk + 2]]; isDoor = true; if (door.tint) c = [c[0] * door.tint[0], c[1] * door.tint[1], c[2] * door.tint[2]]; }
          else if (on(-4, 0) || on(4, 0) || on(0, -5) || on(-3, -4) || on(3, -4)) { c = on(-4, 0) ? WOOD[1] : WOOD[2]; isDoor = true; } } }   // a frame of pale posts and a lintel round the door
      if (!c) return;
      // a small round window: a dark hole with a pale sill under it
      let hole = 0; for (const h of wall.holes || []) { const hx = (ang - h.at * Math.PI / 180) * rw * 64 / (h.w || 7), hz = (z - (h.z ?? wall.H * 0.55)) / (h.h || 9), e = hx * hx + hz * hz; if (e < 1) hole = 1; else if (e < 1.7 && hz < 0) hole = Math.max(hole, 2); }
      if (hole === 1) { c = DARK; isDoor = true; } else if (hole === 2) c = mul(c, 1.18);
      if (wall.tint && !isDoor) c = [c[0] * wall.tint[0], c[1] * wall.tint[1], c[2] * wall.tint[2]];
      if (k === 0) plot('wall', 'back', du + C, dv + C, X, Y, 0, -0.5, mul(c, 0.62));
      else { const eave = roofs.length && zRoof - z < light.eave && zRoof - z > -40; plot('near', 'front', du + C, dv + C, X, Y, 0, 0.5, mul(c, lit(ang, 0.9, 0.16) * (eave ? light.eaveDark + 0.08 : 1))); }
    });
    // the roof: of every cone and dome the line meets, the point nearest the viewer
    let best = null;
    for (const r of roofs) {
      let hit = [];
      if (r.kind === 'cone') { const k = (r.r1 - r.r0) / (r.z1 - r.z0), m = r.r0 - k * r.z0, n = 64 * k; hit = roots(2 - n * n, 2 * (a + b) - 2 * m * n, a * a + b * b - m * m); }
      else { const h = r.z1 - r.z0, e = 1 / (r.r0 * r.r0), g = 64 * 64 / (h * h); hit = roots(2 * e + g, 2 * (a + b) * e - 2 * r.z0 * 64 / (h * h), (a * a + b * b) * e + r.z0 * r.z0 / (h * h) - 1); }
      for (const t of hit) { const z = 64 * t; if (z < r.z0 || z > r.z1 + 0.01) continue; if (!best || t > best.t) best = { t, r, z }; }
    }
    if (best) {
      const { t, r, z } = best, du = a + t, dv = b + t, rad = Math.hypot(du, dv), ang = Math.atan2(dv, du), turn = ((ang + 0.75 * Math.PI) / (2 * Math.PI) % 1 + 1) % 1;
      const way = (z - r.z0) / (r.z1 - r.z0), up = r.kind === 'cone' ? Math.abs(r.r0 - rad) * (r.rows || 1) : way * (r.rows || 3);
      let c = r.fn(turn * 2 * Math.PI * rad, z - r.z0, { turn, up, r0: r.r0, way });
      if (c) {
        if (r.tint) c = [c[0] * r.tint[0], c[1] * r.tint[1], c[2] * r.tint[2]];
        const m = lit(ang, 0.98, r.amp ?? 0.14) + (r.kind === 'dome' ? (Math.round(way * (r.bands ?? 4)) - (r.bands ?? 4) / 2) * 0.03 : 0);
        const lift = Math.floor((z - zRoof) / 112) * 112 + Math.max(0, zRoof - 48);
        plot('roof', `roof${lift}`, du + C, dv + C, X, Y, lift, 1.1, mul(c, m));
      }
    }
  }
  if (lost) console.error(`round: ${lost} pixels fell outside their piece`);
  // the ground comes first: the floor near the door lies on a tile in front of the wall that hides it
  for (const f of frames.values()) if (f.part === 'ground') f.key = -50 + (f.n.endsWith('shadow') ? 1 : 0) + (f.i + f.j) * 0.001;
  // the whole roof is drawn after the last wall piece: a wall's top and the eave over it can lie on different tiles
  const roofKey = Math.max(0, ...[...frames.values()].filter(f => f.part === 'near').map(f => f.key)) + 0.3;
  for (const f of frames.values()) if (f.part === 'roof') f.key = roofKey;
  for (const f of frames.values()) P.push({ n: f.n, i: f.i, j: f.j, lift: f.lift, key: f.key, part: f.part, edges: null, band: null, data: f.data });
  // what a walk can't cross: the edge between a tile of the room and a tile outside it, but for the doorway
  const doorTile = [Math.floor(C), D - 1];
  for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) if (inside(i, j)) {
    const es = [['N', i, j - 1], ['S', i, j + 1], ['W', i - 1, j], ['E', i + 1, j]].filter(([e, ii, jj]) => !(ii >= 0 && jj >= 0 && ii < D && jj < D && inside(ii, jj)) && !(door && e === 'S' && i === doorTile[0] && j === doorTile[1])).map(e => e[0]);
    if (es.length) P.push({ n: '#round edge', i, j, lift: 0, key: i + j - 0.5, part: 'wall', edges: es, band: null, data: Buffer.alloc(256 * 256 * 4) });
  }
  for (const [n, i, j, lift = 0, key = i + j, part, tint] of props) P.push({ n: set + n, i, j, lift, key, part: part || 'prop', edges: null, band: null, ...(tint ? { tint } : {}) });
  bones.forEach((bn, k) => P.push(tusk({ ...bn, at: bn.at === 'door' ? doorAt * 180 / Math.PI + (bn.off || 0) : bn.at }, k, C, D, roofKey)));
  P.sort((p, q) => p.key - q.key || p.lift - q.lift);
  return { w: D, d: D, T: wall.H, hip: true, sv, set, pieces: P, uses: [...uses], round: true, land };
}

/** A made floor tile (256 x 256, its top a diamond) as the paint of a round floor. */
export function floorPaint(file, dark = 1) {
  const im = readPng(file);
  return (u, v) => { const fu = u - Math.floor(u), fv = v - Math.floor(v), x = Math.min(255, Math.round(AX + (fu - fv) * 64)), y = Math.min(255, Math.round(AY + (fu + fv - 1) * 32)), k = (y * 256 + x) * 4;
    return im.data[k + 3] ? [im.data[k] * dark, im.data[k + 1] * dark, im.data[k + 2] * dark] : [96, 76, 56]; };
}

/** A tusk of bone (or, wood: true, a stake): it stands at `at` degrees round the building (0 east, 90 the door's side), r tiles from the
 *  middle, z px up; it rises h px, bows `out` tiles outward on the way, ends `back` tiles inward of its foot and `swing` tiles round
 *  the ring from it (two tusks swung toward each other make a gate). One piece, on the tile under its foot. */
function tusk({ at, r, z = 0, h = 110, out = 0.3, back = 0.2, swing = 0, w = 13, part = null, wood = false, after = false }, k, C, D, roofKey) {
  const th = at * Math.PI / 180, cu = Math.cos(th), cv = Math.sin(th), front = Math.cos(th - Math.PI / 4) > -0.25, pal = wood ? [WOOD[0], WOOD[2], WOOD[3]] : BONE;
  const i = Math.max(0, Math.min(D - 1, Math.floor(C + r * cu))), j = Math.max(0, Math.min(D - 1, Math.floor(C + r * cv))), lift = Math.max(0, z - 40), d = Buffer.alloc(256 * 256 * 4);
  for (let n = 0; n <= 500; n++) {
    const s = n / 500, rr = r + out * Math.sin(Math.PI * s) - back * s * s, tt = swing * s ** 1.6, u = C + rr * cu - tt * cv, v = C + rr * cv + tt * cu, zz = z + h * s;
    const X = (u - v) * 64, Y = (u + v - 1) * 32 - zz, cx = X - (i - j) * 64 + AX, cy = Y - (i + j) * 32 + AY + lift, half = Math.max(0.9, w / 2 * (1 - s) ** 0.75);
    for (let y = Math.floor(cy - half); y <= Math.ceil(cy + half); y++) for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const qx = (x - cx) / half, qy = (y - cy) / half; if (qx * qx + qy * qy > 1 || x < 0 || x > 255 || y < 0 || y > 255) continue;
      const c = qx > 0.3 ? pal[1] : qx < -0.4 ? pal[2] : pal[0];
      d.set([...(wood ? c : s < 0.07 ? mul(WOOD[3], qx > 0.3 ? 1.15 : 1) : s < 0.1 ? mul(c, 0.78) : s > 0.8 ? mul(c, 1.08) : hash(Math.floor(s * 26), 2) > 0.88 && Math.abs(qx) < 0.5 ? mul(c, 0.92) : c), 255], (y * 256 + x) * 4);
    }
  }
  // a tusk on the roof's far side stands behind it, one on the near side in front of it; one on the ground is sorted like a prop,
  // or (after: it stands outside the eaves and rises past them) drawn after the roof
  const key = z > 30 ? roofKey + (front ? 0.05 : -0.05) + k * 0.001 : after ? roofKey + 0.06 + k * 0.001 : i + j + 0.6 + k * 0.01;
  return { n: `#round tusk${k}`, i, j, lift, key, part: part || (z > 30 ? 'roof' : 'prop'), edges: null, band: null, data: d };
}
