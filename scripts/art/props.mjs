// Code-made props for Renown's test game, written with the kit (scripts/art/kit.mjs):
//   Standing Stone A1, A2, A3  - the ring of standing stones where people wake (D71). Plain stone, no carvings (D68).
//   Chest A1, Chest A1 Open    - the chests that appear in the world (D54, D142).
//   Crate A1, Barrel A1        - plain scenery for towns and shops; nothing opens them.
// Each prop is one function, sdf(x, y, z): the distance from a point to its surface. x is across, y is up, z comes towards the viewer;
// one tile is 1 x 1, the ground is y = 0, the tile's middle is x = z = 0. A Creator character is about 1.4 tall.
// Usage, from the repo root (under 2 seconds a sprite):
//   node scripts/art/props.mjs                       all props, 4 sides each, into prototype/art/made/
//   node scripts/art/props.mjs "Chest A1" --draft    one picture to look at, prototype/shots/art-draft.png; no sprite written
// All flags: see run() in kit.mjs.
import { clamp, h3, fbm3, sdBox, chBox, hit, ROCK, WOOD, IRON, tufts, tuftSdf, cutStone, cutSdf, gaps, run } from './kit.mjs';
import { pathToFileURL } from 'node:url';

/* ---------- standing stones: each one is a block cut by flat planes, like the tileset's boulders ---------- */
function standingStone({ seed, H, a, b, lean = 0, leanZ = 0, opts, extra, tuftAt, crack }) {
  const P = cutStone(seed, H, a, b, opts), T = tufts(tuftAt, seed);
  const E = (extra || []).map(e => ({ ...e, P: cutStone(e.seed, e.H, e.a, e.b, e.opts), cs: Math.cos(e.turn || 0), sn: Math.sin(e.turn || 0) }));   // fallen pieces beside it
  return {
    H, crack,
    bound: [Math.max(a, ...E.map(e => Math.abs(e.x) + e.a + e.b)) + .28, H / 2 + .08, Math.max(b, ...E.map(e => Math.abs(e.z) + e.a + e.b)) + .3 + Math.abs(leanZ) * H],
    sdf(x, y, z) {
      const sx = x - lean * y, sz = z - leanZ * y;
      let d = cutSdf(P, sx, y, sz) + .006 * fbm3(x * 9 + seed, y * 9, z * 9); hit.mat = ROCK; hit.grv = 1; hit.var = h3(hit.face, seed, 1);
      for (const e of E) {
        const lx = x - e.x, lz = z - e.z, rx = lx * e.cs + lz * e.sn, rz = -lx * e.sn + lz * e.cs;
        const q = cutSdf(e.P, rx, y, rz) + .006 * fbm3(x * 9, y * 9 + e.seed, z * 9); if (q < d) { d = q; hit.var = h3(hit.face, e.seed, 1); }
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
  hit.var = h3(Math.floor(a) + 20, 5, 3);
  if (q > -.03 && ax < CW) { d += .007 * clamp(1 - fj / .08, 0, 1); if (fj < .07) g = 0; }       // gaps between the lid's boards
  let band = Math.max(raw - .012, Math.abs(ax - .17) - .024);
  if (hollow) { const inner = Math.max((Math.hypot(z / (CD - .015), ly / (LH - .02)) - 1) * (LH - .02), ax - (CW - .015)); d = Math.max(d, -inner); band = Math.max(band, -inner); if (inner < .012) hit.var = -1; }
  if (band < d) { d = band; m = IRON; g = 1; }
  hit.mat = m; hit.grv = g; return d;
}
// open: false (shut), true (open), or a number from 0 to 1 for the lid part way (anim.mjs draws the lid opening)
export function chest(o) {
  const a = o === true ? 1 : o === false ? 0 : o, open = a > 0;
  const PH = 1.83 * a, cs = Math.cos(PH), sn = Math.sin(PH);   // how far the lid swings back when open (about 105 degrees)
  return {
    H: CH + LH, bound: [CW + .12, open ? .36 : .22, open ? CD + .32 : CD + .1], boundZ: open ? -.2 : 0,
    sdf(x, y, z) {
      const ax = Math.abs(x);
      const rawB = chBox(x, y - CH / 2, z, CW, CH / 2, CD, .01); let d = rawB, m = WOOD, g = 1, v;
      const [fj, board] = gaps(y, .087); v = h3(board, 9, 4);
      if (y > .03 && y < CH - .03) { d += .007 * clamp(1 - fj / .09, 0, 1); if (fj < .08) g = 0; }       // gaps between the boards
      if (open) { const inner = sdBox(x, y - .29, z, CW - .024, .26, CD - .024, 0); d = Math.max(d, -inner); if (inner < .012) v = -1; }
      const skirt = chBox(x, y - .022, z, CW + .014, .022, CD + .014, .01); if (skirt < d) { d = skirt; g = 1; v = .1; }
      let band = Math.max(rawB - .012, Math.abs(ax - .17) - .024);                                       // two iron bands
      if (open) band = Math.max(band, -sdBox(x, y - .29, z, CW - .024, .26, CD - .024, 0));
      if (band < d) { d = band; m = IRON; g = 1; }
      const lock = chBox(x, y - (CH - .035), z - (CD + .008), .038, .05, .012, .008); if (lock < d) { d = lock; m = IRON; g = (Math.abs(x) < .009 && Math.abs(y - (CH - .045)) < .016) ? 0 : 1; }
      const ring = Math.hypot(Math.hypot(y - .15, z) - .04, ax - (CW + .012)) - .01; if (ring < d) { d = ring; m = IRON; g = 1; }   // a ring handle on each end
      hit.mat = m; hit.grv = g; hit.var = v;
      let l;
      if (open) { const vz = z + CD, vy = y - CH; l = lidAt(x, -vz * sn + vy * cs, vz * cs + vy * sn - CD, true); }
      else l = lidAt(x, y - CH, z, false);
      if (l < d) return l;
      hit.mat = m; hit.grv = g; hit.var = v; return d;
    }
  };
}

/* ---------- crate and barrel ---------- */
const KS = .22, KH = .4;                                 // crate: half its side, its height
const crate = {
  H: KH, bound: [KS + .1, KH / 2 + .05, KS + .1],
  sdf(x, y, z) {
    const ax = Math.abs(x), az = Math.abs(z), cy = y - KH / 2;
    let d = chBox(x, cy, z, KS, KH / 2, KS, .008); hit.mat = WOOD; hit.grv = 1;
    // boards: upright on the four sides, lying on the top
    const top = y > KH - .01, [fj, board] = gaps(top || ax > az ? z : x, .11);
    const hv = h3(board, top ? 0 : ax > az ? 1 : 2, 7); hit.var = hv < .3 ? .1 : hv > .7 ? .9 : .5;
    d += .006 * clamp(1 - fj / .08, 0, 1); if (fj < .07) hit.grv = 0;
    // a diagonal brace across the two faces on z
    const brace = Math.max(Math.abs(.74 * cy - .67 * x * Math.sign(z || 1)) - .034, az - (KS + .012), ax - KS, Math.abs(cy) - KH / 2);
    if (brace < d) { d = brace; hit.grv = 1; hit.var = .9; }
    // a frame of thicker boards round every face: a slightly bigger box with the middle of each face cut out
    const F = .062, cut = Math.min(sdBox(x, cy, z, KS + .1, KH / 2 - F, KS - F, 0), sdBox(x, cy, z, KS - F, KH / 2 - F, KS + .1, 0), sdBox(x, cy, z, KS - F, KH / 2 + .1, KS - F, 0));
    const frame = Math.max(chBox(x, cy, z, KS + .024, KH / 2 + .012, KS + .024, .01), -cut);
    if (frame < d) { d = frame; hit.grv = 1; hit.var = .5; }
    return d;
  },
};
const BR = .19, BB = .045, BH = .6, NST = 12;            // barrel: radius at the ends, how far the middle bulges, height, number of staves
const barrel = {
  H: BH, bound: [BR + BB + .1, BH / 2 + .05, BR + BB + .1],
  sdf(x, y, z) {
    const r = Math.hypot(x, z), k = (y - BH / 2) / (BH / 2), rad = BR + BB * (1 - k * k);
    const raw = Math.max(r - rad, Math.abs(y - BH / 2) - BH / 2) * .9; let d = raw, m = WOOD, g = 1, v;
    // staves round the side, some a tone paler or darker
    const a = Math.atan2(z, x) / (6.2832 / NST), fj = Math.abs(a - Math.round(a)), hv = h3(Math.floor(a) + 40, 3, 11); v = hv < .3 ? .1 : hv > .66 ? .9 : .5;
    if (y < BH - .01) { d += .005 * clamp(1 - fj / .09, 0, 1); if (fj < .08) g = 0; }
    // the lid sits a little below the rim, with a bung in it
    const well = Math.max(r - (BR - .022), BH - .022 - y); d = Math.max(d, -well);
    if (y > BH - .04 && r < BR - .01) { const [tj, tb] = gaps(x, .1); v = h3(tb, 6, 13) < .5 ? .1 : .5; g = tj < .07 ? 0 : 1; }
    const bung = Math.max(Math.hypot(x - .07, z - .05) - .028, y - (BH - .012)); if (bung < d) { d = bung; g = 1; v = .1; }
    // three iron hoops: one near each end, one round the middle
    const dy = Math.abs(y - BH / 2), hoop = Math.max(raw - .012, Math.min(Math.abs(dy - .215), dy) - .02);
    if (hoop < d) { d = hoop; m = IRON; g = 1; }
    hit.mat = m; hit.grv = g; hit.var = v; return d;
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run({
  'Standing Stone A1': { shadow: 'Standing Stone Shadow A1', ...standingStone({ seed: 3, H: 1.95, a: .27, b: .17, lean: .035, opts: { taper: .12, chips: 6, sides: 10 }, crack: [.06, .7, 1.35], tuftAt: [[-.3, .14], [.31, .1], [.1, .24], [-.16, -.2], [.24, -.16]] }) },
  'Standing Stone A2': { shadow: 'Standing Stone Shadow A2', ...standingStone({ seed: 11, H: 1.5, a: .25, b: .2, lean: -.13, leanZ: .04, opts: { taper: .2, sides: 8, chips: 6 }, tuftAt: [[.3, .16], [-.36, .08], [-.06, .27], [.2, -.2]] }) },
  'Standing Stone A3': { shadow: 'Standing Stone Shadow A3', ...standingStone({ seed: 23, H: .78, a: .28, b: .21, lean: .05, opts: { taper: .12, tops: 3, topMin: .45, topVar: .3, chips: 2 }, extra: [{ seed: 31, H: .17, a: .2, b: .12, x: .46, z: .1, turn: .5, opts: { taper: .3, tops: 2, chips: 2, sides: 7 } }, { seed: 37, H: .1, a: .09, b: .07, x: -.4, z: .22, turn: 1.2, opts: { taper: .3, tops: 2, chips: 1, sides: 6 } }], tuftAt: [[-.32, .08], [.3, -.16], [.16, .28], [.6, -.06], [-.2, -.24]] }) },
  'Chest A1': { shadow: 'Chest Shadow A1', ...chest(false) },
  'Chest A1 Open': { shadow: 'Chest Shadow A1 Open', ...chest(true) },
  'Crate A1': { shadow: 'Crate Shadow A1', ...crate },
  'Barrel A1': { shadow: 'Barrel Shadow A1', ...barrel },
});
