// Code-made shore props for Renown (Dawndoor's shore, D113), written with the kit (scripts/art/kit.mjs):
//   Jetty A1     - one tile of jetty: a plank deck on four posts, open at both ends so tiles join in a row.
//   Jetty End A1 - the jetty's last tile: the deck stops short and a taller mooring post stands at the end.
// The jetty runs along x. Laid in a row over water tiles, the decks meet at the tile edges.
// Usage, from the repo root:
//   node scripts/art/shore.mjs "Jetty A1" --draft --beside "Crate A1_S" --with-character
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

const jetty = { H: .7, bound: [.56, .36, .42], sdf: (x, y, z) => jettyAt(x, y, z, false) };
const jettyEnd = { H: .7, bound: [.56, .36, .42], sdf: (x, y, z) => jettyAt(x, y, z, true) };

run({
  'Jetty A1': { shadow: 'Jetty Shadow A1', ...jetty },
  'Jetty End A1': { shadow: 'Jetty End Shadow A1', ...jettyEnd },
});
