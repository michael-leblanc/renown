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
import { AX, AY, HW, HH, stepLight, screenToGround, groundToScreen, inRoundShadow } from './style.mjs';   // the camera, the light's steps and the ground shadow, shared with kit.mjs and buildings.mjs

const TILES = 'game/client/art/tiles/';
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
// for the brutal drafts (Michael, 2026-11-21: "rough logs, stone, hide and bone, lashed together with rope and iron"): bark, rope, iron,
// pelts of several beasts, war red
const LOG = [[104, 82, 58], [124, 100, 70], [80, 62, 44], [54, 41, 30], [158, 134, 96]], ROPE = [[178, 152, 106], [128, 104, 70]], IRON = [[54, 50, 48], [92, 88, 84], [34, 31, 30]];
const PELT = [[99, 75, 56], [115, 89, 67], [135, 107, 83], [96, 88, 78], [74, 58, 46], [120, 78, 56], [86, 68, 52]], RED = [[142, 30, 32], [108, 22, 26], [168, 44, 40], [36, 22, 20]];
const rope = (along, z) => ((along + z * 1.4) % 5 + 5) % 5 < 1.7 ? ROPE[1] : ROPE[0];

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
  // rough logs set upright side by side, of uneven girth and height, the bark on; a foot of dry stones under them (foot), rope lashed
  // round them (ropes: heights) and bands of iron with a rivet a log (iron: heights)
  logs: (o) => { const st = PAINT.stones({ course: 11 }); return (arc, z) => {
    const n = o.per || 4, g = arc * n + 0.16 * Math.sin(arc * 9.1), gi = Math.floor(g), f = g - gi, top = o.H - hash(gi, 7) * (o.jag ?? 10);
    if (z > top || (o.points && z > top - 13 && Math.abs(f - 0.5) * 2 > (top - z) / 13)) return null;
    if (o.foot) { const ft = o.foot + (hash(Math.floor(arc * 5), 31) - 0.5) * 9; if (z < ft) return st(arc, z); if (z < ft + 2) return STONE[3]; }
    for (const q of o.iron || []) { const dz = z - q; if (Math.abs(dz) < 4) return Math.abs(f - 0.5) < 0.1 && Math.abs(dz) < 1.6 ? IRON[1] : dz > 2.4 ? IRON[1] : dz < -2.4 ? IRON[2] : IRON[0]; }
    for (const q of o.ropes || []) { const dz = z - q - 1.6 * Math.cos(f * 2 * Math.PI); if (Math.abs(dz) < 3.2) return Math.abs(dz) > 2.3 ? ROPE[1] : rope(arc * 64, z); if (dz < 0 && dz > -5.5) return LOG[3]; }
    if (f < 0.1) return LOG[3];
    let c = f < 0.26 ? LOG[2] : f < 0.7 ? LOG[0] : f < 0.9 ? LOG[1] : LOG[2];
    if (z > top - (o.points ? 11 : 3)) return mul(LOG[4], f < (o.points ? 0.45 : 0.26) ? 0.8 : 1);                                                   // the cut end
    if (hash(gi * 7 + Math.floor(f * 6), Math.floor(z / 9 + hash(gi, 2) * 9)) > 0.8) c = mul(c, 0.88);         // bark
    const kz = 30 + hash(gi, 5) * (o.H - 50), kd = Math.hypot((f - 0.5) * 16, (z - kz) / 2.2); if (hash(gi, 6) > 0.6 && kd < 2.4) c = kd < 1.2 ? LOG[3] : LOG[2];   // a knot
    return c; }; },
  // pelts of many beasts laid in rows like scales, each row over the one below; a pelt hangs lowest in its middle, with a ragged edge
  pelts: (o) => (arc, z, hit) => {
    const rows = o.rows || 4, wy = hit.way * rows, lo = Math.floor(wy), at = (row, t) => { const n = Math.max(4, Math.round((o.n || 14) * (1 - row / rows * 0.72))), g = t * n + hash(row, 3), gi = Math.floor(g); return [gi, g - gi, n]; };
    let row = lo, edge = 9;
    if (lo + 1 < rows) { const [gi, f] = at(lo + 1, hit.turn), dip = 0.1 + 0.2 * Math.sin(Math.PI * f) ** 0.7 + (hash(Math.floor(hit.turn * 260), lo) - 0.5) * 0.05, d = lo + 1 - wy; if (d < dip) { row = lo + 1; edge = dip - d; } else edge = -(d - dip); }
    const [gi, f] = at(row, hit.turn), k = Math.floor(hash(gi, row * 13 + 1) * PELT.length);
    let c = PELT[k];
    if (f < 0.05 && row === lo) c = PELT[4];                                         // the seam between two pelts
    else if (f < 0.13 && row === lo && Math.floor(wy * 9) % 2) c = mul(c, 1.22);     // its stitches
    else if (k === 3 || k === 6) { if (hash(Math.floor(hit.turn * 420), Math.floor(wy * 26)) > 0.72) c = mul(c, 0.9); }   // fur
    else if (hash(gi, row + 50) > 0.7 && Math.hypot(f - 0.5, (wy - row - 0.45) * 0.8) < 0.16) c = mul(c, 1.12);            // a worn patch
    if (edge >= 0 && edge < 0.035) c = mul(c, 0.72);          // the pelt's own edge
    if (edge < 0 && edge > -0.09) c = mul(c, 0.66);           // its shadow on the row below
    return c; },
  // the thick edge of a heavy roof: thatch cut off square (ends: 'thatch'), or the hides rolled round a hoop and bound with rope
  rim: (o) => (arc, z, hit) => {
    if (o.ends === 'thatch') { const k = Math.floor(arc * 30), c = mul([104, 88, 64], 0.72 + hash(k, 3) * 0.3); return z < hash(k, 9) * 5 ? null : z < 4 + hash(k, 4) * 4 ? mul(c, 0.7) : c; }
    const a = arc * 64, tie = ((a % 34) + 34) % 34 < 7;
    return tie ? rope(a, z * 2.2) : hit.way > 0.8 ? PELT[1] : hit.way < 0.22 ? PELT[4] : PELT[6]; },
};

/**
 * A round building on a square of D by D tiles.
 *  wall: { paint: 'wall' | 'stakes' | 'stones' | 'mud' | 'logs', tex?, H, r?, tint?, holes?, batter?, cloths?, gap? }   the ring wall, H pixels high; holes: [{ at (degrees), z?, w?, h? }] small
 *        round windows; batter: how far it leans in (tiles); cloths: [{ at, top?, len?, w? }] red banners hung on it; gap: a way in with no door
 *  roofs: [{ kind: 'cone' | 'dome', r0, z0, r1, z1, paint, tint?, ... }]   cone: radius r0 (tiles) at height z0 (px) to r1 at z1; dome: r0 wide on z0, z1 - z0 high
 *  door: { tex, tint? }                                  a pack door piece (_E stands on the south-west edge) set into the wall, facing south-west
 *  props: [[name, i, j, lift, key, part, tint]]          pack pieces, as in build()
 *  roofs take poles: { n, w, to?, ends?: { len, drop } } (poles laid up the slope, their ends past the eave as stakes) and ropes: [way up, 0 to 1]
 *  bones: [{ at (degrees: 0 east, 90 south-west door side), r, z, h, out, back, w }]   tusks standing round the building (wood: stakes, blunt: posts)
 *  flags: [{ at, r, h?, w?, len?, left? }]               war banners on poles
 *  floor: (u, v) => colour                               the floor inside, cut round (floorPaint)
 */
export function round({ D, wall, roofs = [], door = null, props = [], floor = null, light, set = 'desert/', bones = [], flags = [], shadow = 1, land = null }) {
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
  const wn = -(wall.batter || 0) / wall.H * 64;   // a battered wall leans in: its radius is rw at the foot and rw - batter at the top
  const doorAt = Math.acos(0.5 / rw);   // the door stands in the middle of a tile's edge (tile C, D - 1), a little off the ring's own south-west point
  // light from the right, as in buildings.mjs: a face turned to the viewer's left is darker; in steps, as the pack shades
  const lit = stepLight;
  const frames = new Map(); let lost = 0;
  const frame = (part, name, i, j, lift, key) => { const id = `${name}|${i},${j}|${lift}`; let f = frames.get(id); if (!f) frames.set(id, f = { n: `#round ${name}`, i, j, lift, key: i + j + key, part, data: Buffer.alloc(256 * 256 * 4) }); return f; };
  const plot = (part, name, u, v, X, Y, lift, key, c, a = 255) => {
    // the room's nearest tile; the ground, and a point too far from that tile to fit its piece (the eaves at the far left and right), go to the tile under them
    let [i, j] = part === 'ground' ? [Math.floor(u), Math.floor(v)] : tileOf(u, v), px = X - (i - j) * HW + AX, py = Y - (i + j) * HH + AY + lift;
    if (px < 0 || px > 255 || py < 0 || py > 255) { i = clamp(Math.floor(u), 0, D - 1); j = clamp(Math.floor(v), 0, D - 1); px = X - (i - j) * HW + AX; py = Y - (i + j) * HH + AY + lift; }
    if (px < 0 || px > 255 || py < 0 || py > 255) { lost++; return; }
    frame(part, name, i, j, lift, key).data.set([clamp(Math.round(c[0]), 0, 255), clamp(Math.round(c[1]), 0, 255), clamp(Math.round(c[2]), 0, 255), a], (py * 256 + px) * 4);
  };
  for (const r of roofs) { r.fn = PAINT[r.paint](r); if (r.tex) uses.add(r.tex); }
  const zTop = Math.max(wall.H, ...roofs.map(r => r.z1)), over = Math.max(R, ...roofs.map(r => r.r0)) + 0.2, zRoof = roofs.length ? Math.min(...roofs.map(r => r.z0)) : 0;
  const sv = light.shadow.map(v => v * shadow), sr = roofs.length ? Math.max(rw, ...roofs.map(r => r.r0)) - 0.15 : rw;
  const x0 = Math.floor(-(over + C) * HW + sv[0] * HW - 96), x1 = Math.ceil((over + C) * HW + 16), y0 = Math.floor((2 * C - 1 - 2 * over) * HH - zTop - 8), y1 = Math.ceil((2 * C - 1 + 2 * over + sv[1] * 2) * HH + 48);
  const roots = (A, B, Cc) => { if (Math.abs(A) < 1e-9) return B ? [-Cc / B] : []; const q = B * B - 4 * A * Cc; if (q < 0) return []; const s = Math.sqrt(q); return [(-B - s) / (2 * A), (-B + s) / (2 * A)].sort((a, b) => a - b); };
  for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
    // the line of sight through this pixel: (ug + t, vg + t) over the ground, at height 64 t
    const [gu, gv] = screenToGround(X + 0.5, Y + 0.5), a = gu - C, b = gv - C;
    // the ground: the floor inside, the shadow outside (the building's outline pushed along the light)
    const rg = Math.hypot(a, b);
    if (rg < rw) { if (floor) plot('ground', 'floor', a + C, b + C, X, Y, 0, 0, floor(a + C, b + C)); }
    else if (inRoundShadow(a, b, sr, sv)) plot('ground', 'shadow', a + C, b + C, X, Y, 0, 0, [0, 0, 0], light.shadowAlpha);
    // the wall: its inner face behind (the smaller t), its outer face in front (the larger)
    const ts = roots(2 - wn * wn, 2 * (a + b) - 2 * rw * wn, a * a + b * b - rw * rw);
    ts.forEach((t, k) => {
      const z = 64 * t; if (z < 0 || z >= wall.H) return;
      const du = a + t, dv = b + t, ang = Math.atan2(dv, du), turn = ((ang + 0.75 * Math.PI) / (2 * Math.PI) % 1 + 1) % 1, ring = 2 * Math.PI * rw, n = Math.round(ring / 2) * 2;
      if (wall.gap && Math.abs((ang - doorAt) * rw) < 0.5) return;   // a way in with no door
      let c = wp(turn * n, z, { turn }), isDoor = false;
      if (door) { const q = (ang - doorAt) * rw;   // along the wall from the door's middle, in tiles
        if (Math.abs(q) < 0.5) { const s = clamp(Math.floor((0.5 - q) * 64), 0, 63), kk = (Math.min(175, Math.floor(z)) * 64 + s) * 4; const on = (ds, dz) => doorT[(clamp(Math.floor(z) + dz, 0, 175) * 64 + clamp(s + ds, 0, 63)) * 4 + 3] > 128;
          if (doorT[kk + 3] > 128) { c = [doorT[kk], doorT[kk + 1], doorT[kk + 2]]; isDoor = true; if (door.tint) c = [c[0] * door.tint[0], c[1] * door.tint[1], c[2] * door.tint[2]]; }
          else if (on(-4, 0) || on(4, 0) || on(0, -5) || on(-3, -4) || on(3, -4)) { c = on(-4, 0) ? WOOD[1] : WOOD[2]; isDoor = true; } } }   // a frame of pale posts and a lintel round the door
      if (!c) return;
      // a small round window: a dark hole with a pale sill under it
      let hole = 0; for (const h of wall.holes || []) { const hx = (ang - h.at * Math.PI / 180) * rw * 64 / (h.w || 7), hz = (z - (h.z ?? wall.H * 0.55)) / (h.h || 9), e = hx * hx + hz * hz; if (e < 1) hole = 1; else if (e < 1.7 && hz < 0) hole = Math.max(hole, 2); }
      if (hole === 1) { c = DARK; isDoor = true; } else if (hole === 2) c = mul(c, 1.18);
      // a war banner hung on the wall under the eave: red cloth in folds, torn into tails, a dark jaw on it
      for (const cl of wall.cloths || []) { const ca = (cl.at === 'door' ? doorAt * 180 / Math.PI + (cl.off || 0) : cl.at) * Math.PI / 180, hx = (ang - ca) * rw * 64, w = cl.w || 26, top = cl.top ?? wall.H - 6, yy = top - z;
        if (k === 1 && Math.abs(hx) < w / 2 && yy > 0 && yy < (cl.len || 60) - 9 * Math.abs(Math.sin(hx / w * Math.PI * 1.5))) { isDoor = true;
          c = hx > w / 2 - 2 ? RED[2] : Math.floor((hx + w) / 6) % 2 ? RED[0] : RED[1];
          if ((yy > 12 && yy < 18 && Math.abs(hx) < 8) || (yy >= 18 && yy < 36 && Math.abs(Math.abs(hx) - 5) < (36 - yy) / 18 * 3.2)) c = RED[3]; } }
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
        // poles laid on the roof from the eave up, to hold it down, and ropes round it
        if (r.poles) { const N = r.poles.n, f = (turn * N) % 1, d = (f - 0.5) / N * 2 * Math.PI * rad * 64, w = r.poles.w || 7;
          if (way < (r.poles.to ?? 0.92)) { if (Math.abs(d) < w / 2) c = d > w / 5 ? LOG[1] : d < -w / 4 ? LOG[2] : LOG[0]; else if (d < 0 && d > -w / 2 - 3) c = mul(c, 0.72); } }
        for (const q of r.ropes || []) { const dz = (way - q) * (r.z1 - r.z0); if (Math.abs(dz) < 2.4) c = Math.abs(dz) > 1.6 ? ROPE[1] : rope(turn * 2 * Math.PI * rad * 64, 0); else if (dz < 0 && dz > -4.5) c = mul(c, 0.74); }
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
    const es = [['N', i, j - 1], ['S', i, j + 1], ['W', i - 1, j], ['E', i + 1, j]].filter(([e, ii, jj]) => !(ii >= 0 && jj >= 0 && ii < D && jj < D && inside(ii, jj)) && !((door || wall.gap) && e === 'S' && i === doorTile[0] && j === doorTile[1])).map(e => e[0]);
    if (es.length) P.push({ n: '#round edge', i, j, lift: 0, key: i + j - 0.5, part: 'wall', edges: es, band: null, data: Buffer.alloc(256 * 256 * 4) });
  }
  for (const [n, i, j, lift = 0, key = i + j, part, tint] of props) P.push({ n: set + n, i, j, lift, key, part: part || 'prop', edges: null, band: null, ...(tint ? { tint } : {}) });
  const deg = b => b.at === 'door' ? doorAt * 180 / Math.PI + (b.off || 0) : b.at;
  // the poles on a roof run on past its eave as sharpened stakes (poles.ends: { len (tiles), drop (px) })
  const ends = roofs.filter(r => r.poles?.ends).flatMap(r => Array.from({ length: r.poles.n }, (_, k) => ({ at: (k + 0.5) / r.poles.n * 360 - 135, r: r.r0 - 0.1, z: r.z0 + (r.poles.ends.up ?? 4), h: -(r.poles.ends.drop ?? 26), out: 0, back: -(r.poles.ends.len ?? 0.62), w: (r.poles.w || 7) + 4, wood: true, straight: true })));
  [...bones, ...ends].forEach((bn, k) => P.push(tusk({ ...bn, at: deg(bn) }, k, C, D, roofKey)));
  flags.forEach((f, k) => P.push(flag({ ...f, at: deg(f) }, k, C, D)));
  P.sort((p, q) => p.key - q.key || p.lift - q.lift);
  return { w: D, d: D, T: wall.H, hip: true, sv, set, pieces: P, uses: [...uses], round: true, land };
}

/** A made floor tile (256 x 256, its top a diamond) as the paint of a round floor. */
export function floorPaint(file, dark = 1) {
  const im = readPng(file);
  return (u, v) => { const fu = u - Math.floor(u), fv = v - Math.floor(v), x = Math.min(255, Math.round(AX + (fu - fv) * HW)), y = Math.min(255, Math.round(AY + (fu + fv - 1) * HH)), k = (y * 256 + x) * 4;
    return im.data[k + 3] ? [im.data[k] * dark, im.data[k + 1] * dark, im.data[k + 2] * dark] : [96, 76, 56]; };
}

/** A tusk of bone (or, wood: true, a stake): it stands at `at` degrees round the building (0 east, 90 the door's side), r tiles from the
 *  middle, z px up; it rises h px, bows `out` tiles outward on the way, ends `back` tiles inward of its foot and `swing` tiles round
 *  the ring from it (two tusks swung toward each other make a gate). One piece, on the tile under its foot. */
function tusk({ at, r, z = 0, h = 110, out = 0.3, back = 0.2, swing = 0, w = 13, part = null, wood = false, after = false, blunt = false, straight = false, ties = [], iron = [] }, k, C, D, roofKey) {
  const th = at * Math.PI / 180, cu = Math.cos(th), cv = Math.sin(th), front = Math.cos(th - Math.PI / 4) > -0.25, near = Math.cos(th - Math.PI / 4) > 0, pal = wood ? [LOG[0], LOG[1], LOG[2]] : BONE;
  const flat = Math.abs(h) < 1, len = Math.hypot(h, (Math.abs(back) + Math.abs(swing)) * 64) || 1, band = 3.2 / len;
  const i = Math.max(0, Math.min(D - 1, Math.floor(C + r * cu))), j = Math.max(0, Math.min(D - 1, Math.floor(C + r * cv))), lift = Math.max(0, z - 40), d = Buffer.alloc(256 * 256 * 4);
  for (let n = 0; n <= 500; n++) {
    const s = n / 500, rr = r + out * Math.sin(Math.PI * s) - back * (straight ? s : s * s), tt = swing * s ** 1.6, u = C + rr * cu - tt * cv, v = C + rr * cv + tt * cu, zz = z + h * s;
    const [X, Y] = groundToScreen(u, v, zz), cx = X - (i - j) * HW + AX, cy = Y - (i + j) * HH + AY + lift, half = blunt ? w / 2 : Math.max(0.9, w / 2 * (1 - s) ** 0.75);
    for (let y = Math.floor(cy - half); y <= Math.ceil(cy + half); y++) for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const qx = (x - cx) / half, qy = (y - cy) / half; if (qx * qx + qy * qy > 1 || x < 0 || x > 255 || y < 0 || y > 255) continue;
      const q = flat ? -qy : qx, c = q > 0.3 ? pal[1] : q < -0.4 ? pal[2] : pal[0];
      const tied = ties.some(t => Math.abs(s - t) < band), ironed = iron.some(t => Math.abs(s - t) < band);
      const wc = ironed ? (q > 0.3 ? IRON[1] : q < -0.4 ? IRON[2] : IRON[0]) : tied ? (q < -0.4 ? ROPE[1] : rope(x + y, 0)) : !blunt && s > 0.78 ? mul(LOG[4], q < -0.3 ? 0.78 : 1) : hash(Math.floor(s * len / 7), Math.floor(q * 2 + 9)) > 0.78 ? mul(c, 0.88) : c;
      d.set([...(wood ? wc : s < 0.07 ? mul(WOOD[3], qx > 0.3 ? 1.15 : 1) : s < 0.1 ? mul(c, 0.78) : s > 0.8 ? mul(c, 1.08) : hash(Math.floor(s * 26), 2) > 0.88 && Math.abs(qx) < 0.5 ? mul(c, 0.92) : c), 255], (y * 256 + x) * 4);
    }
  }
  // a tusk on the roof's far side stands behind it, one on the near side in front of it; one on the ground is sorted like a prop,
  // or (after: it stands outside the eaves and rises past them) drawn after the roof
  const key = after ? roofKey + 0.06 + k * 0.001 : z > 30 ? roofKey + (front ? 0.05 : -0.05) + k * 0.001 : near ? i + j + 0.6 + k * 0.01 : i + j - 0.7;
  return { n: `#round tusk${k}`, i, j, lift, key, part: part || (z > 30 ? 'roof' : 'prop'), edges: null, band: null, data: d };
}

/** A war banner on a pole: it stands at `at` degrees, r tiles from the middle, h px high; a red cloth w wide and len long hangs from a
 *  crossbar on its right (left: true, on its left), torn into tails, a dark jaw on it; a bone point on the pole. One piece. */
function flag({ at, r, h = 176, w = 38, len = 100, left = false }, k, C, D) {
  const th = at * Math.PI / 180, u = C + r * Math.cos(th), v = C + r * Math.sin(th), near = Math.cos(th - Math.PI / 4) > 0;
  const i = Math.max(0, Math.min(D - 1, Math.floor(u))), j = Math.max(0, Math.min(D - 1, Math.floor(v))), d = Buffer.alloc(256 * 256 * 4);
  drawFlag(d, Math.round((u - v) * HW - (i - j) * HW + AX), Math.round((u + v - 1) * HH - (i + j) * HH + AY), { h, w, len, left, k });
  return { n: `#round flag${k}`, i, j, lift: 0, key: near ? i + j + 0.62 + k * 0.01 : i + j - 0.7, part: 'prop', edges: null, band: null, data: d };
}

/** The banner's picture, drawn into a 256 x 256 piece with the pole's foot at cx, cy. */
export function drawFlag(d, cx, cy, { h = 176, w = 38, len = 100, left = false, k = 0 } = {}) {
  const bar = cy - h + 12, sg = left ? -1 : 1;
  const px = (x, y, c) => { if (x >= 0 && x < 256 && y >= 0 && y < 256) d.set([Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], (y * 256 + x) * 4); };
  for (let e = 0; e <= w + 6; e++) for (let y = bar - 1; y <= bar + 1; y++) px(cx + sg * (e - 3), y, y > bar ? LOG[2] : LOG[0]);   // the crossbar
  for (let e = 0; e < w; e++) { const x = cx + sg * (4 + e), L = len - 15 * Math.abs(Math.sin(e / w * Math.PI * 1.5)) - hash(e, k) * 3;
    for (let yy = 0; yy < L; yy++) { const m = e - w / 2 + 0.5, t = w / 38;
      let c = yy < 3 ? RED[1] : e > w - 3 ? RED[2] : Math.floor(e / 6) % 2 ? RED[1] : RED[0];
      if ((yy > 20 * t && yy < 27 * t && Math.abs(m) < 11 * t) || (yy >= 27 * t && yy < 52 * t && Math.abs(Math.abs(m) - 7 * t) < (52 * t - yy) / 25 * 4.4)) c = RED[3];
      px(x, bar + 2 + yy, c); } }
  for (let y = cy - h; y <= cy; y++) for (let x = -3; x <= 3; x++) { const hh = cy - y, tie = [h - 12, h - 20, h * 0.5].some(t => Math.abs(hh - t) < 2.5); px(cx + x, y, tie ? ROPE[x < -1 ? 1 : 0] : x > 1 ? LOG[1] : x < -1 ? LOG[2] : LOG[0]); }   // the pole
  for (let y = 0; y < 18; y++) { const hw = 3.6 * (1 - y / 18); for (let x = -4; x <= 4; x++) if (Math.abs(x) <= hw) px(cx + x, cy - h - y, x > 0 ? BONE[1] : BONE[0]); }   // its bone point
}
export { PAINT, LOG, ROPE, BONE, RED, hash, mul };
