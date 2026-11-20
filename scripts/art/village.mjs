// Code-made props for towns and camps that the tileset does not have (project doc claude/tileset-props.md lists what it has),
// written with the kit (scripts/art/kit.mjs). Plain things anyone could own: no emblem, no colour, no writing.
//   Fence A1         a split-rail fence along the tile's far edge (like a wall, D203), joining the next tile's
//   Bedroll A1       a rolled-out hide and blanket on the ground, for a camp
//   Log Seat A1      a log lying on its side to sit on, about a tile long
//   Chopping Block A1  a stump with a hatchet in it and split wood round it
//   Fish Rack A1     a drying rack of poles with fish hanging on it, for Dawndoor's shore (D113)
//   Net Poles A1     a fishing net hung between two poles to dry
//   Campfire A1 Out  the campfire gone out: black logs and ash, no flame
// Same space as props.mjs: x across, y up, z toward the viewer, one tile 1 x 1, a Creator character about 1.4 tall.
//   node scripts/art/village.mjs                          all, 4 sides each, into prototype/art/made/
//   node scripts/art/village.mjs "Fence A1" --draft       one picture to look at, prototype/shots/art-draft.png
import { clamp, h3, fbm3, sdBox, chBox, sdCap, hit, WOOD, IRON, CANVAS, LEATHER, tufts, tuftSdf, gaps, run } from './kit.mjs';
import { fireAt } from './camp.mjs';

const TAU = 6.2832;
/** A rough round log from a to b, its bark in rings, the odd one darker. */
function log(x, y, z, ax, ay, az, bx, by, bz, r, d, v = .5) {
  const q = sdCap(x, y, z, ax, ay, az, bx, by, bz, r, r * .92) + .004 * fbm3(x * 25, y * 25, z * 25);
  if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = v; }
  return d;
}

/* ---------- fence: posts at the two ends of the far edge, two split rails between them ---------- */
const FZ = -.47;
const fence = {
  H: .8, bound: [.56, .42, .08], boundZ: FZ,
  sdf(x, y, z) {
    let d = 9;
    for (const px of [-.47, .47]) { const q = chBox(x - px, y - .4, z - FZ, .035, .4, .035, .01); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = px > 0 ? .5 : .3; } }
    for (const [ry, sag, v] of [[.3, .012, .6], [.62, .008, .8]]) {
      const yy = y - ry + sag * (1 - (x / .5) ** 2);                    // each rail sags a little between the posts
      const q = chBox(x, yy, z - FZ - .03, .5, .028, .018, .008) + .003 * fbm3(x * 30, y * 30, 2);
      if (q < d) { d = q; hit.mat = WOOD; hit.var = v; hit.grv = fbm3(x * 8, ry * 9, 1) > .35 ? 0 : 1; }   // splits along the rail
    }
    return d;
  },
};

/* ---------- bedroll: a hide laid flat, a blanket rolled down on it, a rolled-up pillow ---------- */
const bedroll = {
  H: .2, bound: [.5, .1, .3],
  sdf(x, y, z) {
    let d = chBox(x, y - .012, z, .46, .012, .24, .01) + .003 * fbm3(x * 12, 1, z * 12); hit.mat = LEATHER; hit.grv = 1; hit.var = .5;   // the hide
    const b = chBox(x + .08, y - .045, z, .36, .035 + .01 * Math.sin(z * 9), .2, .03); if (b < d) { d = b; hit.mat = CANVAS; hit.grv = gaps(x, .12)[0] < .08 ? 0 : 1; hit.var = .55; }   // the blanket
    { const q = sdCap(x, y, z, -.3, .07, -.18, -.3, .07, .18, .065, .065); if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .3; } }   // the blanket rolled back at the head
    { const q = sdCap(x, y, z, .38, .055, -.14, .38, .055, .14, .05, .05); if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .85; } }  // a pillow
    return d;
  },
};

/* ---------- log seat ---------- */
const LOG_T = tufts([[.5, .2], [-.5, -.18], [.1, .3]], 91);
const logSeat = {
  H: .35, bound: [.55, .2, .3],
  sdf(x, y, z) {
    const rr = Math.hypot(y - .15, z);
    let d = Math.max(rr - .15, Math.abs(x) - .48) + .004 * fbm3(x * 25, y * 25, z * 25); hit.mat = WOOD; hit.grv = 1; hit.var = .5;   // the log, cut square at both ends
    if (Math.abs(x) > .475) { hit.var = -1; hit.grv = (rr * 30 | 0) % 2 ? 1 : 0; }                                             // the cut ends, with rings
    { const q = Math.max(Math.abs(y - .3) - .01, Math.abs(z) - .09, Math.abs(x) - .32); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .85; } }   // a flat cut along the top to sit on
    return tuftSdf(LOG_T, x, y, z, d);
  },
};

/* ---------- chopping block: a stump, a hatchet in it, split wood round it ---------- */
const SPLIT = [[.3, .08, .5], [.34, -.14, 1.2], [-.3, .18, 2.4], [-.06, -.33, .2]];
const block = {
  H: .6, bound: [.5, .3, .5],
  sdf(x, y, z) {
    const rr = Math.hypot(x, z);
    let d = Math.max(rr - .17 - .015 * clamp(.12 - y, 0, .12) / .12, y - .32) + .004 * fbm3(x * 25, y * 25, z * 25); hit.mat = WOOD; hit.grv = 1; hit.var = .4;   // the stump, a little wider at the foot
    if (y > .31) { hit.var = -1; hit.grv = (rr * 34 | 0) % 2 ? 1 : 0; }                    // its top, rings showing
    { const q = sdCap(x, y, z, .02, .33, .02, .2, .6, .14, .02, .018); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .9; } }   // the hatchet's handle
    { const q = sdBox(x - .01, y - .33, z - .01, .06, .035, .012, .004); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .7; } }   // its head, buried in the block
    for (const [sx, sz, a] of SPLIT) {                                                     // split pieces lying about
      const c = Math.cos(a), s = Math.sin(a), lx = (x - sx) * c + (z - sz) * s, lz = -(x - sx) * s + (z - sz) * c;
      const q = Math.max(chBox(lx, y - .03, lz, .09, .03, .03, .008), -(lz + lx * .1) - .015);   // a half-round: flat on one side
      if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = lz < -.015 ? -1 : .6; }
    }
    return d;
  },
};

/* ---------- fish rack: two A-frames and a pole across, fish hanging from it ---------- */
const FISH = [-.36, -.22, -.08, .06, .2, .34];
const fishRack = {
  H: 1.2, bound: [.56, .62, .32],
  sdf(x, y, z) {
    let d = 9;
    for (const ex of [-.48, .48]) for (const s of [-1, 1]) d = log(x, y, z, ex, 0, s * .26, ex, 1.08, 0, .025, d, .45);   // the A-frames
    d = log(x, y, z, -.52, 1.04, 0, .52, 1.04, 0, .024, d, .7);                                                          // the pole across
    FISH.forEach((fx, k) => {
      const sw = .02 * Math.sin(k * 2.3), q0 = sdCap(x, y, z, fx, 1.02, 0, fx + sw, .98, 0, .004, .004);
      if (q0 < d) { d = q0; hit.mat = CANVAS; hit.grv = 1; hit.var = .2; }                                             // a cord
      const fy = .97 - y, len = .3, w = .04 * Math.sin(Math.PI * clamp(fy / len, 0, 1)) + .008;                         // a fish: thin at head and tail
      const q = Math.max(Math.hypot((x - fx - sw) * 1, z * 2.2) - w, -fy, fy - len) + (fy > len - .05 ? (fy - len + .05) * .4 : 0);
      if (q < d) { d = q; hit.mat = IRON; hit.grv = fbm3(x * 60, y * 60, k) > .3 ? 0 : 1; hit.var = .9 - .3 * (k % 2); }   // silver-grey, scaly
    });
    return d;
  },
};

/* ---------- net poles: two poles, a net hung between them, sagging ---------- */
const netPoles = {
  H: 1.3, bound: [.56, .66, .12],
  sdf(x, y, z) {
    let d = log(x, y, z, -.46, 0, 0, -.46, 1.25, 0, .03, 9, .4);
    d = log(x, y, z, .46, 0, 0, .46, 1.22, 0, .03, d, .5);
    if (Math.abs(x) < .45 && y > .2 && y < 1.2) {
      const top = 1.15 - .1 * (1 - (x / .45) ** 2), bot = .35 + .15 * (1 - (x / .45) ** 2);
      if (y < top && y > bot) {
        const zz = z - .03 * Math.sin((y - bot) / (top - bot) * 3.14), [gx] = gaps(x + y * .5, .06), [gy] = gaps(x - y * .5, .06);   // a diamond mesh
        const strand = Math.min(gx, gy) * .06 - .005, q = Math.max(Math.abs(zz) - .006, strand);
        if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .3; }
      }
      const rope = sdCap(x, y, z, -.46, 1.17, 0, .46, 1.14, 0, .007, .007); if (rope < d) { d = rope; hit.mat = CANVAS; hit.grv = 1; hit.var = .6; }
    }
    return d;
  },
};

/* ---------- the campfire gone out: same stones and logs, the embers turned to ash ---------- */
const campOut = {
  H: .3, bound: [.64, .2, .64], noMoss: true,
  sdf(x, y, z) { const d = fireAt(x, y, z, false); if (hit.mat === 5) { hit.mat = IRON; hit.var = .1; hit.grv = 1; } return d; },   // FIRE (embers) becomes cold ash
};

run({
  'Fence A1': { shadow: 'Fence Shadow A1', ...fence },
  'Bedroll A1': { shadow: 'Bedroll Shadow A1', ...bedroll },
  'Log Seat A1': { shadow: 'Log Seat Shadow A1', ...logSeat },
  'Chopping Block A1': { shadow: 'Chopping Block Shadow A1', ...block },
  'Fish Rack A1': { shadow: 'Fish Rack Shadow A1', ...fishRack },
  'Net Poles A1': { shadow: 'Net Poles Shadow A1', ...netPoles },
  'Campfire A1 Out': { shadow: 'Campfire Shadow A1 Out', ...campOut },
});
