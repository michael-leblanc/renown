// Code-made floors for the insides of buildings, written with the kit (scripts/art/kit.mjs). The green tileset already has plank
// floors (Ground F1 to F4), square stone tiles (H1, H4, H9 to H11), big flagstones (D1), cobbles (E1) and bare earth (A1, C3).
// Michael chose a full code-made set (2026-11-20), so no floor needs the bought pack:
//   Floor Planks A1 to A3  boards for a whole room: three tiles that join on every side, so a big floor doesn't repeat one tile
//   Floor Tiles A1, A2     square stone tiles, 4 a side (like H1); A2 with a few cracked or chipped
//   Floor Flags A1, A2     big flagstones of every shape, earth in the joints (like D1)
//   Floor Cobbles A1       small rounded stones, earth between (like E1)
//   Floor Earth A1, A2     packed earth, thin (unlike A1, a block); A2 with pebbles pressed in
//   Floor Straw A1, A2     trodden earth strewn with straw (a hovel, a barn, a stable): thick, and a light scatter
//   Floor Hearth A1        stone flags in front of a fireplace (anim.mjs's Hearth A1 stands on the tile behind), sooted, ash spilled
//   Doorstep A1            a worn stone sill under a door: it lies across the tile's front edge, where Door A1 stands in the same side
// A floor is ground: it is drawn under everything on its tile, so its shadow is never used. Its top is a little above the
// tileset's ground (y = 0), like the tileset's own plank floor. Same space as props.mjs: x across, y up, z toward the viewer.
// Floors repeat every tile (straw and joints are worked out per tile), so any two lie side by side without a seam.
//   node scripts/art/floors.mjs                                     all of them, 4 sides each, into prototype/art/made/
//   node scripts/art/floors.mjs "Floor Straw A1" --draft --beside "Ground A1_S"   one picture to look at; no sprite written
import { clamp, h3, fbm3, sdBox, chBox, sdCap, hit, ROCK, WOOD, IRON, EARTH, STRAW, gaps, run } from './kit.mjs';

const TOP = .025;                                        // the floor's top; the tileset's ground is y = 0
const slab = (x, y, z, top = TOP) => sdBox(x, y - top / 2, z, .5, top / 2, .5, 0);
const wrap = (i, n) => ((i % n) + n) % n;                // cell numbers that repeat every tile

/* ---------- planks: 8 boards across z, each with one butt joint somewhere along x; tile edges are joints too ---------- */
const PITCH = .125;
function planks(x, y, z, seed, worn) {
  const [fj, k] = gaps(z + .5, PITCH);                   // fj: how far from the seam between two boards, in boards
  // one butt joint per board, somewhere in the tile; a board runs on over the tile's edge into the next tile, so the tile edge
  // shows no joint, and a board keeps one tone all along (in the next tile it is the same board)
  const kk = clamp(k, 0, 7), jx = -.38 + .76 * h3(kk, seed, 3);
  const lift = .003 * (h3(kk, seed, 5) - .5);
  let d = sdBox(x, y - TOP / 2 - lift, z, .5, TOP / 2, .5, 0);
  hit.mat = WOOD; hit.grv = 1;
  hit.var = h3(kk, seed, 7); hit.var = hit.var < .22 ? .1 : hit.var > .78 ? .9 : .5;
  if (fj * PITCH < .007) { hit.grv = 0; d += .004; }                                          // the seam between two boards
  const ex = Math.abs(x - jx);                                                                  // how far from the joint
  if (ex < .006) { hit.grv = 0; d += .004; }
  else if (ex < .045 && Math.abs(fj * PITCH - .035) < .009 && Math.abs(ex - .025) < .009) hit.grv = 0;   // two nails at each board end
  if (worn) {                                                                                   // a trodden path: boards scuffed darker down the middle of the room
    const w = Math.abs(x + .12 * Math.sin(z * 6.283)) < .2 + .08 * fbm3(x * 4, 1, z * 4);
    if (w && hit.grv && fbm3(x * 14, 3, z * 3) > -.15) hit.var = .1;
  }
  return d + .0015 * fbm3(x * 40, 1, z * 6);
}

/* ---------- straw on earth: strands lying every which way, thick in drifts, the earth showing between ---------- */
const CELL = .1, CN = 10;                                // ten cells a tile, so the straw repeats exactly every tile
function straw(x, y, z, seed, many) {
  const ET = .016;
  let d = sdBox(x, y - ET / 2, z, .5, ET / 2, .5, 0) + .002 * fbm3(x * 20, 1, z * 20);
  hit.mat = EARTH; hit.grv = 1; hit.var = clamp(.35 + .6 * fbm3(x * 3 + seed, 2, z * 3), 0, 1) * .6;   // darker where trodden
  if (y > .06) return Math.min(d, y - .045);             // far above the strands: nothing more to test
  const ci = Math.floor((x + .5) / CELL), cj = Math.floor((z + .5) / CELL);
  let best = 9, bv = 0;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const i = ci + di, j = cj + dj, wi = wrap(i, CN), wj = wrap(j, CN);
    const dens = .5 + .3 * Math.sin((wi / CN + h3(seed, 1, 1)) * 6.283) * Math.cos((wj / CN * 2 + h3(seed, 2, 1)) * 6.283) + .3 * (h3(wi, wj, seed) - .5);
    const n = Math.round(clamp(dens * many, 0, 4));
    for (let s = 0; s < n; s++) {
      const r1 = h3(wi * 7 + s, wj, seed + 11), r2 = h3(wi, wj * 7 + s, seed + 13), r3 = h3(wi + s * 3, wj + s, seed + 17), r4 = h3(s, wi + wj * 13, seed + 19);
      const cx = -.5 + (i + r1) * CELL, cz = -.5 + (j + r2) * CELL, a = r3 * Math.PI, L = .04 + .045 * r4, R = .0065;
      const cy = ET + R + .009 * h3(wi, wj, s + 23), dx = Math.cos(a) * L, dz = Math.sin(a) * L, tilt = .006 * (r4 - .5);
      const q = sdCap(x, y, z, cx - dx, cy - tilt, cz - dz, cx + dx, cy + tilt, cz + dz, R, R * .8);
      if (q < best) { best = q; bv = h3(wi * 5 + s, wj * 3, seed + 29); }
    }
  }
  best = Math.max(best, sdBox(x, y, z, .5, 1, .5, 0));   // cut at the tile's edge; the next tile goes on with the same strands
  if (best < d) { d = best; hit.mat = STRAW; hit.grv = 1; hit.var = bv; }
  return d;
}

/* ---------- hearth floor: stone flags in front of a fireplace (anim.mjs's Hearth A1, on the far edge of the tile behind), sooted
   toward the fire, with ash and a coal or two spilled at the back edge ---------- */
function hearthFloor(x, y, z) {
  const T = .022, row = Math.floor((z + .5) / (1 / 3)), [fz] = gaps(z + .5, 1 / 3), sh = row % 2 ? .25 : 0, [fx, col] = gaps(x + .5 + sh, .5);   // three rows of flags, every other row shifted half a flag
  const id = row * 7 + col, lift = .004 * (h3(id, 1, 61) - .5);
  let d = sdBox(x, y - T / 2 - lift, z, .5, T / 2, .5, 0) + .002 * fbm3(x * 20, 1, z * 20);
  hit.mat = ROCK; hit.grv = 1; hit.var = h3(id, 2, 61);
  if (fz / 3 < .012 || fx * .5 < .012) { d += .006; hit.var = .1; }                     // the joints, sunk and dark
  const soot = (.5 - z) / 1 + .25 * fbm3(x * 5, 2, z * 5);                               // 1 at the back edge, toward the fire
  if (soot > .45) hit.var = Math.min(hit.var, .1);
  // ash spilled over the back edge, thin, with a few coals in it
  const ash = (.15 - (z + .5)) + .12 * fbm3(x * 7, 3, z * 7) - .16 * Math.abs(x);
  if (ash > 0) {
    const a = Math.max(y - (T + .002 + .005 * Math.min(ash, .06) / .06), sdBox(x, y, z, .5, 1, .5, 0));
    if (a < d) { d = a; hit.mat = IRON; hit.var = .5; hit.grv = fbm3(x * 26 + 3, 5, z * 26) > .34 ? 0 : 1; }
  }
  return d;
}

/* ---------- doorstep: one long worn stone across the tile's front edge (z = 0.5), half in, half out ---------- */
function doorstep(x, y, z) {
  const H = .045, zz = z - .5, dip = .008 * clamp(1 - Math.abs(x) / .2, 0, 1) * clamp(1 - Math.abs(zz) / .12, 0, 1);   // worn hollow where feet go
  let d = chBox(x, y - H / 2, zz, .3, H / 2, .12, .012) + .0025 * fbm3(x * 22, y * 22, z * 22);
  d = Math.max(d, -(y - (H - dip)));
  hit.mat = ROCK; hit.grv = 1; hit.var = .5;
  return d;
}

/* ---------- stone: square tiles, big flagstones, cobbles. A flat stone floor is a height over the tile: the top of whichever
   stone is under the point, sunk at the joints. Stones come from a pattern that repeats every tile (cells numbered round). ---------- */
/** The nearest of a grid of jittered points, N a tile, repeating every tile: [distance to the nearest, gap to the second, the cell's id]. */
function cells(x, z, N, seed, jit) {
  const i = Math.floor((x + .5) * N), j = Math.floor((z + .5) * N); let f1 = 9, f2 = 9, id = 0;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const a = i + di, b = j + dj, wa = wrap(a, N), wb = wrap(b, N);
    const px = -.5 + (a + .5 + jit * (h3(wa, wb, seed) - .5)) / N, pz = -.5 + (b + .5 + jit * (h3(wb, wa, seed + 1) - .5)) / N;
    const q = Math.hypot(x - px, z - pz);
    if (q < f1) { f2 = f1; f1 = q; id = wa * 31 + wb; } else if (q < f2) f2 = q;
  }
  return [f1, f2 - f1, id];
}
const height = (x, y, z, h) => Math.max((y - h) * .7, sdBox(x, y, z, .5, 1, .5, 0));   // a height field cut at the tile's edge

/** Square tiles, n a side, laid in a grid with thin joints (the tileset's H1). chip: some tiles cracked or a corner broken. */
function tiles(x, y, z, n, seed, chip) {
  const s = 1 / n, [fx, a] = gaps(x + .5, s), [fz, b] = gaps(z + .5, s), aa = wrap(a, n), bb = wrap(b, n), id = aa * 13 + bb;
  const edge = Math.min(fx, fz) * s;                                         // how far from the nearest joint
  let top = .022 + .004 * (h3(id, seed, 71) - .5) - .007 * clamp(1 - edge / .012, 0, 1) + .0015 * fbm3(x * 30, 1, z * 30);
  hit.mat = ROCK; hit.grv = 1; hit.var = h3(id, seed, 73);
  if (edge < .008) hit.var = .1;
  if (chip && h3(id, seed, 79) < .22) {                                      // a crack across this tile, or its corner broken off
    const u = (x + .5) / s - a - .5, v = (z + .5) / s - b - .5, r = h3(id, seed, 83);
    if (r < .11 ? Math.abs(u * .6 + v + .1 * Math.sin(u * 9)) < .05 : u + v > .62) { top -= .006; hit.var = .1; }
  }
  return height(x, y, z, top);
}

/** Big flagstones of every shape (the tileset's D1): a few to a tile, wide joints filled with earth. */
function flags(x, y, z, N, seed) {
  const [, e, id] = cells(x, z, N, seed, .85);
  let top = .022 + .005 * (h3(id, seed, 87) - .5) - .008 * clamp(1 - e / .02, 0, 1) + .002 * fbm3(x * 24, 2, z * 24);
  hit.mat = ROCK; hit.grv = 1; hit.var = h3(id, seed, 89);
  if (e < .012) { hit.mat = EARTH; hit.var = .6; }                           // earth in the joints
  return height(x, y, z, top);
}

/** Cobbles: small rounded stones close together, earth between (the tileset's E1). */
function cobbles(x, y, z, N, seed) {
  const [f1, e, id] = cells(x, z, N, seed, .7), r = .5 / N;
  const dome = clamp(1 - (f1 / (r * 1.15)) ** 2, 0, 1), rim = clamp(e / .03, 0, 1);
  const top = .012 + .016 * Math.sqrt(dome) * rim + .003 * (h3(id, seed, 91) - .5) + .0015 * fbm3(x * 40, 3, z * 40);
  hit.mat = ROCK; hit.grv = 1; hit.var = h3(id, seed, 93);
  if (e < .01) { hit.mat = EARTH; hit.var = .7; }
  return height(x, y, z, top);
}

/** Packed earth, flat and trodden; pebbles: a few small stones pressed into it. */
function earth(x, y, z, seed, pebbles) {
  let top = .016 + .002 * fbm3(x * 16 + seed, 1, z * 16);
  hit.mat = EARTH; hit.grv = 1; hit.var = clamp(.3 + .5 * fbm3(x * 2.5 + seed, 4, z * 2.5), 0, 1) * .45;
  if (pebbles) {
    const [f1, , id] = cells(x, z, 9, seed, .9), on = h3(id, seed, 97) < .35, pr = .018 + .012 * h3(id, seed, 99);
    if (on && f1 < pr) { top += .008 * Math.sqrt(1 - (f1 / pr) ** 2); hit.mat = ROCK; hit.var = .1 + .5 * h3(id, seed, 101); }
  }
  return height(x, y, z, top);
}

export const FLOORS = {
  'Floor Planks A1': { shadow: 'Floor Planks Shadow A1', H: .03, boards: true, noMoss: true, bound: [.5, .02, .5], sdf: (x, y, z) => planks(x, y, z, 1, false) },
  'Floor Planks A2': { shadow: 'Floor Planks Shadow A2', H: .03, boards: true, noMoss: true, bound: [.5, .02, .5], sdf: (x, y, z) => planks(x, y, z, 2, false) },
  'Floor Planks A3': { shadow: 'Floor Planks Shadow A3', H: .03, boards: true, noMoss: true, bound: [.5, .02, .5], sdf: (x, y, z) => planks(x, y, z, 3, true) },
  'Floor Tiles A1': { shadow: 'Floor Tiles Shadow A1', H: .03, noMoss: true, dim: 1, bound: [.5, .02, .5], sdf: (x, y, z) => tiles(x, y, z, 4, 1, false) },
  'Floor Tiles A2': { shadow: 'Floor Tiles Shadow A2', H: .03, noMoss: true, dim: 1, bound: [.5, .02, .5], sdf: (x, y, z) => tiles(x, y, z, 4, 2, true) },
  'Floor Flags A1': { shadow: 'Floor Flags Shadow A1', H: .03, noMoss: true, dim: 1, bound: [.5, .02, .5], sdf: (x, y, z) => flags(x, y, z, 2, 3) },
  'Floor Flags A2': { shadow: 'Floor Flags Shadow A2', H: .03, noMoss: true, dim: 1, bound: [.5, .02, .5], sdf: (x, y, z) => flags(x, y, z, 2, 4) },
  'Floor Cobbles A1': { shadow: 'Floor Cobbles Shadow A1', H: .03, noMoss: true, dim: 1, bound: [.5, .02, .5], sdf: (x, y, z) => cobbles(x, y, z, 6, 5) },
  'Floor Earth A1': { shadow: 'Floor Earth Shadow A1', H: .03, noMoss: true, bound: [.5, .02, .5], sdf: (x, y, z) => earth(x, y, z, 6, false) },
  'Floor Earth A2': { shadow: 'Floor Earth Shadow A2', H: .03, noMoss: true, bound: [.5, .02, .5], sdf: (x, y, z) => earth(x, y, z, 7, true) },
  'Floor Straw A1': { shadow: 'Floor Straw Shadow A1', H: .04, noMoss: true, bound: [.5, .03, .5], sdf: (x, y, z) => straw(x, y, z, 5, 3.2) },
  'Floor Straw A2': { shadow: 'Floor Straw Shadow A2', H: .04, noMoss: true, bound: [.5, .03, .5], sdf: (x, y, z) => straw(x, y, z, 9, 1.3) },
  'Floor Hearth A1': { shadow: 'Floor Hearth Shadow A1', H: .04, noMoss: true, dim: 1, bound: [.5, .03, .5], sdf: hearthFloor },
  'Doorstep A1': { shadow: 'Doorstep Shadow A1', H: .05, noMoss: true, dim: 2, bound: [.34, .03, .14], boundZ: .5, sdf: doorstep },
};

run(FLOORS);
