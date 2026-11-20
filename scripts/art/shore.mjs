// Code-made shore props for Renown (Dawndoor's shore, D113), written with the kit (scripts/art/kit.mjs):
//   Jetty A1     - one tile of jetty: a plank deck on four posts, open at both ends so tiles join in a row.
//   Jetty End A1 - the jetty's last tile: the deck stops short and a taller mooring post stands at the end.
//   Rowboat A1   - a small clinker rowboat pulled up on the shore (D113; nothing sails, D102): pointed bow
//                  towards +x, a flat transom at -x, two seats, a pair of oars lying inside. About 1.5 long.
// The jetty runs along x. Laid in a row over water tiles, the decks meet at the tile edges.
// Usage, from the repo root:
//   node scripts/art/shore.mjs "Jetty A1" --draft --beside "Crate A1_S" --with-character
//   node scripts/art/shore.mjs "Rowboat A1" --draft --beside "Jetty End A1_S" --with-character
import { clamp, h3, fbm3, sdBox, chBox, sdCap, hit, WOOD, gaps, run } from './kit.mjs';

const DECK = .3, T = .045, HW = .36;                     // deck top, plank thickness, half the deck's width
const PITCH = .125;                                      // one plank, across the jetty

function jettyAt(x, y, z, end) {
  const x1 = end ? .32 : .5;                             // where the deck stops on the +x side
  const cx = (x1 - .5) / 2, hx = (x1 + .5) / 2;          // the deck's middle and half length along x
  // planks across the jetty, each a little higher or lower, the odd one a tone off
  const [fj, k] = gaps(x + .5, PITCH);
  const lift = .006 * (h3(k, 3, 11) - .5);
  let d = chBox(x - cx, y - (DECK - T / 2) - lift, z, hx, T / 2, HW + .02 * (h3(k, 4, 11) - .5), .006);
  d += .003 * fbm3(x * 30, y * 30, z * 8);
  hit.mat = WOOD; hit.grv = fj * PITCH > .008 ? 1 : 0; hit.var = h3(k, 5, 11);
  // two beams under the planks, along the jetty
  for (const sz of [-.27, .27]) {
    const q = sdBox(x - cx, y - (DECK - T - .04), z - sz, hx, .04, .035, .004);
    if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .2; }
  }
  // four posts down into the water, a little out of true
  for (const px of end ? [-.44, .26] : [-.44, .44]) for (const pz of [-HW + .02, HW - .02]) {
    const n = h3(px * 100 | 0, pz * 100 | 0, 13) - .5;
    const q = sdCap(x, y, z, px, 0, pz, px + .015 * n, DECK + .03, pz, .05, .045);
    if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .35 + .3 * n; }
  }
  // the end: a taller mooring post with a rope coiled round it
  if (end) {
    const q = sdCap(x, y, z, .38, 0, 0, .385, .62, 0, .065, .055);
    if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .8; }
    const r = Math.hypot(Math.hypot(x - .382, z) - .07, (y - .5) / 1.2) - .018;   // a ring of rope
    if (r < d) { d = r; hit.mat = WOOD; hit.grv = 1; hit.var = -1; }
  }
  return d;
}

// The rowboat: hull length 2L along x, half beam W, gunwale at G, keel at KEEL.
const L = .74, W = .3, G = .36, KEEL = .03, SHELL = .025, STERN = -.62;

// The hull's half width at x (0 past the bow) and its outer surface as a rough distance.
function hullAt(x, y, z) {
  const u = clamp(x / L, -1, 1);
  const w = W * Math.pow(Math.max(1 - Math.pow(Math.max(u, 0), 2) * 1 - Math.pow(Math.min(u, 0), 2) * .35, 0), .55) + .001;
  const depth = (G - KEEL) * (1 - .25 * Math.max(u, 0) * Math.max(u, 0));     // the bow rises
  const below = Math.max(G - y, 0) / depth;
  const e = Math.hypot(z / w, below) - 1;
  return e * Math.min(w, depth) * .8;
}

function rowboat(x, y, z) {
  const sheer = .05 * Math.pow(Math.max(x / L, 0), 2);              // the gunwale sweeps up to the bow
  const g = G + sheer;
  const hull = hullAt(x, y - sheer, z), outer = Math.max(hull, y - g, STERN - x);
  const inner = Math.max(hullAt(x, y - sheer + SHELL, z) + SHELL, STERN + SHELL - x);
  let d = Math.max(outer, -inner);
  // clinker strakes: each plank overlaps the one below, a dark seam between
  const [fj, k] = gaps(y - KEEL, .075);
  d += .003 * fbm3(x * 25, y * 25, z * 25);
  hit.mat = WOOD; hit.grv = fj * .075 > .006 || y > g - .02 ? 1 : 0; hit.var = h3(k, 2, 17);
  // the gunwale: a rail along the top edge
  const rail = Math.max(Math.abs(hull + .006) - .02, Math.abs(y - g + .01) - .022, STERN - .01 - x);
  if (rail < d) { d = rail; hit.grv = 1; hit.var = .85; }
  // the keel, a strip under the middle
  const keel = Math.max(sdBox(x - .02, y - KEEL, z, L * .9, .03, .025, .006), STERN + .01 - x);
  if (keel < d) { d = keel; hit.grv = 1; hit.var = .15; }
  // two seats across, and the stern seat
  for (const [sx, half] of [[.15, .07], [-.25, .07], [-.52, .07]]) {
    const q = Math.max(chBox(x - sx, y - (G - .1), z, half, .015, W, .004), inner - .002);
    if (q < d) { d = q; hit.grv = 1; hit.var = .6 + .1 * sx; }
  }
  // a pair of oars lying inside, blades towards the bow
  for (const oz of [-.08, .1]) {
    const q = sdCap(x, y, z, -.55, G - .07, oz * .6, .5, G - .1, oz, .016, .016);
    const blade = sdBox(x - .48, y - (G - .1), z - oz, .14, .006, .045, .004);
    const o = Math.min(q, blade);
    if (o < d) { d = o; hit.grv = 1; hit.var = .3; }
  }
  return d;
}

const jetty = { H: .7, bound: [.56, .36, .42], sdf: (x, y, z) => jettyAt(x, y, z, false) };
const jettyEnd = { H: .7, bound: [.56, .36, .42], sdf: (x, y, z) => jettyAt(x, y, z, true) };

run({
  'Jetty A1': { shadow: 'Jetty Shadow A1', ...jetty },
  'Jetty End A1': { shadow: 'Jetty End Shadow A1', ...jettyEnd },
  'Rowboat A1': { shadow: 'Rowboat Shadow A1', H: .5, bound: [L + .04, .23, W + .06], sdf: rowboat },
});
