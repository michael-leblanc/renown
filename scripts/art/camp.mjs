// Code-made camp props for Renown, written with the kit (scripts/art/kit.mjs):
//   Campfire A1 - a lit fire in a ring of stones. One tile.
//   Tent A1     - a plain canvas ridge tent for one sleeper, open at one end. About 2 tiles long by 1 deep.
// Plain camp gear that could be anyone's: no emblem, no colour, no writing.
// Usage, from the repo root:
//   node scripts/art/camp.mjs "Tent A1" --draft --beside "Wall A1_S"
import { clamp, h3, fbm3, sdBox, sdCap, hit, ROCK, WOOD, IRON, CANVAS, FIRE, tufts, tuftSdf, cutStone, cutSdf, gaps, run } from './kit.mjs';

/* ---------- campfire ---------- */
const NS = 8, RR = .345;                                 // stones in the ring, the ring's radius
const STONES = Array.from({ length: NS }, (_, k) => {
  const a = (k + .3 * h3(k, 1, 5)) / NS * 6.2832, r = RR + .03 * (h3(k, 2, 5) - .5), turn = a + 1.5708 + .7 * (h3(k, 3, 5) - .5);   // each stone lies along the ring
  const H = .12 + .09 * h3(k, 4, 5), sa = .125 + .03 * h3(k, 5, 5), sb = .085 + .03 * h3(k, 6, 5);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, cs: Math.cos(turn), sn: Math.sin(turn), seed: 50 + k, P: cutStone(50 + k, H, sa, sb, { sides: 7, chips: 2, tops: 2, taper: .28 }) };
});
const LOGS = [.4, 1.9, 3.5, 5.1].map((a, k) => ({ ax: Math.cos(a) * .25, az: Math.sin(a) * .25, bx: -Math.cos(a) * .05, bz: -Math.sin(a) * .05, top: .24 + .03 * (k % 2), k }));   // four logs leaning together
const FLAMES = [[0, 0, .02, -.01, .47, .1], [.09, .05, .04, .02, .35, .07], [-.1, .03, -.04, .01, .32, .065], [.0, -.09, .01, -.04, .38, .07]];   // foot x, z; lean x, z; top; width at the foot
const FIRE_T = tufts([[.5, .12], [-.5, -.05], [.1, .52], [-.2, -.5], [.42, -.34], [-.4, .38]], 61);
function fireAt(x, y, z, flames) {
  // trodden, burnt ground: grey ash with black patches
  let d = Math.max(Math.hypot(x, z) - .3, y - .028 + .08 * (x * x + z * z)); hit.mat = IRON; hit.grv = fbm3(x * 9, 0, z * 9) > -.12 ? 1 : 0; hit.var = .5;   // a low mound
  for (const s of STONES) {
    const lx = x - s.x, lz = z - s.z, r2 = lx * lx + lz * lz;
    if (r2 > .08) { const q = Math.sqrt(r2) - .22; if (q < d) d = q; continue; }       // far from this stone: a safe guess is enough
    const q = cutSdf(s.P, lx * s.cs + lz * s.sn, y, -lx * s.sn + lz * s.cs) + .004 * fbm3(x * 11, y * 11, z * 11);
    if (q < d) { d = q; hit.mat = ROCK; hit.grv = 1; hit.var = h3(hit.face, s.seed, 1); }
  }
  for (const l of LOGS) {
    const q = sdCap(x, y, z, l.ax, .05, l.az, l.bx, l.top, l.bz, .046, .036);
    if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = y > .15 ? -1 : .2 + .5 * h3(l.k, 2, 9); }   // burnt black where the fire is
  }
  { const q = (Math.hypot(x / .12, (y - .04) / .06, z / .12) - 1) * .06; if (q < d) { d = q; hit.mat = FIRE; hit.grv = 1; hit.var = .1 + .5 * clamp(fbm3(x * 14, 2, z * 14) + .5, 0, 1); } }   // embers
  if (flames) FLAMES.forEach(([fx, fz, lx, lz, top, w], k) => {
    const wob = .022 * Math.sin(y * 21 + k * 2.1) * clamp((y - .1) / .2, 0, 1);
    const q = sdCap(x - wob, y, z, fx, .1, fz, fx + lx, top, fz + lz, w, .006) * .8;
    if (q < d) { d = q; hit.mat = FIRE; hit.grv = 1; hit.var = 1 - clamp((y - .12) / (top - .12), 0, 1); }
  });
  return d;
}
const campfire = {
  H: .5, bound: [.64, .27, .64], noMoss: true, glow: [0, .22, 0, .62],
  sdf: (x, y, z) => tuftSdf(FIRE_T, x, y, z, fireAt(x, y, z, true)),
  cast: (x, y, z) => fireAt(x, y, z, false),             // the flames throw no shadow
};

/* ---------- tent: the ridge runs along x, the open end is at +x ---------- */
const TL = .82, TW = .58, TH = 1.1, TT = .03, GUY = .4;             // half its length, half its width on the ground, the ridge's height, the cloth's thickness
const slope = (z, y, w, h) => (Math.abs(z) * h + y * w - w * h) / Math.hypot(w, h);   // the two sloping sides of an A-shape w wide (half) and h tall
const TENT_T = tufts([[-.45, .74], [.42, .76], [-.98, .26], [-.05, -.74], [.5, -.75], [1.0, -.36]], 71);
const tent = {
  H: TH, bound: [TL + GUY + .08, (TH + .12) / 2, TW + .16],
  sdf(x, y, z) {
    const sag = .02 * Math.sin(3.1416 * clamp(y / TH, 0, 1));      // the cloth hangs in a little between ridge and ground
    const outer = Math.max(slope(z, y, TW, TH) + sag, Math.abs(x) - TL, -y);
    const room = Math.max(slope(z, y, TW - TT * 1.3, TH - TT * 2.2) + sag, Math.abs(x) - (TL - TT), -y);   // the space inside, closed at both ends
    const door = Math.max(slope(z, y, .39, .93), Math.abs(x - TL) - .12);                          // the way in, cut through the +x end
    let d = Math.max(outer, -Math.min(room, door)) * .9; hit.mat = CANVAS; hit.grv = 1;
    const [fj, panel] = gaps(x + .2, .43); hit.var = room < .012 ? -1 : .25 + .5 * h3(panel, z > 0 ? 1 : 2, 3);
    if (fj < .035 && Math.abs(x) < TL - .02) hit.grv = 0;                                           // seams between the widths of cloth
    { const q = sdBox(x, y - .008, z, TL - TT, .008, TW - .06, 0); if (q < d) { d = q; hit.grv = 1; hit.var = -2; } }   // a groundsheet, in the dark
    for (const s of [-1, 1]) {                                                                     // the door's two flaps, rolled back to its edges
      const q = sdCap(x, y, z, TL + .012, .03, s * .41, TL + .012, .9, s * .04, .03, .022);
      if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .9; }
    }
    for (const s of [-1, 1]) {                                                                     // an upright pole at each end
      const q = sdCap(x, y, z, s * (TL + .012), 0, 0, s * (TL + .012), TH + .1, 0, .028, .024);
      if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .5; }
    }
    { const q = sdCap(x, y, z, -TL - .09, TH + .005, 0, TL + .09, TH + .005, 0, .024, .024); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .8; } }   // the ridge pole
    for (const s of [-1, 1]) {                                                                     // a guy rope from each pole's top to a peg, and the peg
      let q = sdCap(x, y, z, s * (TL + .012), TH + .06, 0, s * (TL + GUY), .04, 0, .011, .011);
      if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .9; }
      q = sdCap(x, y, z, s * (TL + GUY - .02), 0, 0, s * (TL + GUY + .035), .1, 0, .02, .016);
      if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .8; }
    }
    if (y < .14) for (const px of [-.62, -.2, .22, .64]) {                                         // pegs holding the hem down, four a side
      const sz = z < 0 ? -1 : 1, q = sdCap(x, y, z, px, 0, sz * (TW + .005), px, .085, sz * (TW + .065), .018, .014);
      if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .8; }
    }
    return tuftSdf(TENT_T, x, y, z, d);
  },
};

run({
  'Campfire A1': { shadow: 'Campfire Shadow A1', ...campfire },
  'Tent A1': { shadow: 'Tent Shadow A1', ...tent },
});
