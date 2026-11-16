// Items drawn the way the props are (the tileset's camera, light and colours), lying in the world (D218).
// The same picture is the item on the ground and the item in a pack, as in Ultima Online and Tibia.
// One drawing per item; a material is a swap of the metal's colours (as UO's hues and RuneScape's recolours do).
//   node scripts/art/items.mjs [names, comma separated | all] [--out dir]
//       writes the agreed items (the ITEMS list) as sprites into prototype/art/made/items/, and one picture of them to look at,
//       prototype/shots/items.png
//   node scripts/art/items.mjs --draft
//       three designs of each sword, shield and coin pile in one picture, prototype/shots/items-draft.png; nothing else written
import { clamp, h3, sdBox, sdCap, hit, WOOD, IRON, RAMP, render, SIZE } from './kit.mjs';
import { writePng, readPng } from './png.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ---------- how big a weapon or shield lies on the ground ---------- */
// GROUND times the length of the Creator's part in a hand, taken from the side the part is longest from. At 1 an item looked too big
// beside the character, who mostly holds it pointing at or away from the viewer, where it shows shorter (Michael, 2026-11-16: 0.8).
// Hafts keep their thickness whatever the size: thinner than this they read as a dark line, not as wood. Coins have their own size.
const GROUND = .8, HR = .018 / GROUND, HS = .017 / GROUND;   // HR, HS: the radius of a haft and of the spear's shaft, before sizing
const sized = (s, k = GROUND) => ({ ...s, bound: s.bound.map(v => v * k), boundZ: (s.boundZ || 0) * k, sdf: (x, y, z) => s.sdf(x / k, y / k, z / k) * k });

/* ---------- swords: lying flat, point away from the viewer and to the right ---------- */
// o: L blade length; w(t) half width along the blade, t from 0 at the guard to 1 at the point; off(t) how far the blade's middle
// is pushed to one side (a curved or one-edged blade); guard [half length, half thickness]; grip length; pommel radius; groove;
// S how many times bigger the whole sword is drawn, so that at GROUND = 1 it is as long on the ground as the Creator's part is in a hand.
function sword(o) {
  const S = o.S * GROUND;
  return {
    H: .1, bound: [.24 * S, .07 * S, .52 * S], boundZ: -.1 * S,
    sdf(x, y, z) { return this.one(x / S, y / S, z / S) * S; },
    one(x, y, z) {
      const u = -z + .14, h = y - .03, t = clamp(u / o.L, 0, 1), v = x - (o.off ? o.off(t) : 0), w = Math.max(o.w(t), .005);
      let d = Math.max((Math.abs(v) / w + Math.abs(h) / .017 - 1) * Math.min(w, .017) * .7, -u, u - o.L); hit.mat = IRON; hit.var = .5;
      hit.grv = o.groove && Math.abs(v) < .0045 && t > .04 && t < o.groove ? 0 : 1;
      let q = sdBox(u + .014, h, x, o.guard[1], .021, o.guard[0], .006); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; }
      q = sdCap(u, h, x, -.03, 0, 0, -.03 - o.grip, 0, 0, .02, .018); if (q < d) { d = q; hit.mat = WOOD; hit.grv = Math.abs(((u * 55) % 1 + 1) % 1 - .5) < .15 ? 0 : 1; hit.var = .2; }   // bound with cord
      q = o.disc ? Math.max(Math.hypot(u + .045 + o.grip, x) - o.pommel, Math.abs(h) - .014) : Math.hypot(u + .05 + o.grip, h, x) - o.pommel;
      if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; }
      return d;
    },
  };
}
export const SWORDS = {
  A: sword({ S: 1.75, L: .5, w: t => .02 * clamp((1 - t) / .2, .2, 1), guard: [.07, .014], grip: .09, pommel: .02 }),   // long, thin and straight, with a small cross guard (Melee2)
  B: sword({ S: 1.6, L: .43, w: t => (.034 + .04 * Math.sin(3.1416 * t ** 1.25)) * clamp((1 - t) / .2, .1, 1), guard: [.062, .02], grip: .1, pommel: .04, disc: true, groove: .55 }),   // leaf-shaped, a wide disc for a pommel
  C: sword({ S: 1.4, L: .4, w: t => .052 * (t > .9 ? 1 - 4 * (t - .9) : 1), off: t => t > .9 ? -.21 * (t - .9) : 0, guard: [.045, .02], grip: .12, pommel: .022 }),   // a cleaver: a broad blade of even width, its square end clipped on one side (Melee4)
};

/* ---------- hafted weapons: lying flat, the head away from the viewer and to the right ---------- */
// Sizes are in tile sides (1 = a tile's side, about 71 px along the haft) before sizing: at GROUND = 1 each is as long on the ground
// as the Creator's part is in a hand, like the swords. o: L whole length; r the haft's radius; to and rise: where the haft ends and how high its far
// end is; wraps [[from, to], ...]: stretches bound with dark cord; head(u, x, y, d): adds the head (u along the haft from the butt,
// x across, y up; d the distance so far) and returns the nearer distance.
function hafted(o) {
  return sized({
    H: .1, bound: [o.wide, o.high, o.L / 2 + .04],
    sdf(x, y, z) {
      const u = o.L / 2 - z;
      const d = sdCap(u, y, x, 0, o.r, 0, o.to, o.rise || o.r, 0, o.r, o.r); hit.mat = WOOD; hit.var = .9; hit.grv = 1;
      for (const [a, b] of o.wraps || []) if (u > a && u < b) { hit.var = .2; hit.grv = Math.abs(((u * 70) % 1 + 1) % 1 - .5) < .2 ? 0 : 1; }
      return o.head(u, x, y, d);
    },
  });
}
const AXE_L = .755, MACE_L = .94, MACE_R = .106, SPEAR_L = 1.76;
export const HAFTED = {
  // an axe with one blade (Melee10): a short haft, a squarish blade a quarter of its length hanging to one side, a dark eye and a small poll
  axe: hafted({ L: AXE_L, r: HR, to: AXE_L, wide: .26, high: .06, wraps: [[.0, .05], [.2, .24], [.4, .43]], head(u, x, y, d) {
    const du = u - (AXE_L - .075), bl = .19, w = .05 + .04 * clamp(x / bl, 0, 1);
    let q = Math.max(Math.abs(du) - w, x - bl + .035 * (du / .09) ** 2, -x, Math.abs(y - HR) - .01) * .7; if (q < d) { d = q; hit.mat = IRON; hit.var = .5; hit.grv = 1; }   // the blade, its edge a shallow curve
    q = sdCap(u, y, x, AXE_L - .11, HR, 0, AXE_L - .04, HR, 0, HR + .007, HR + .007); if (q < d) { d = q; hit.mat = IRON; hit.grv = 0; }                                      // the eye round the haft
    q = sdBox(du, y - HR, x + .03, .032, .014, .016, .004); if (q < d) { d = q; hit.mat = IRON; hit.grv = 0; }                                                              // the poll
    return d;
  } }),
  // a mace (Melee12): a plain round ball a quarter of the length, a dark collar under it, the grip end bound
  mace: hafted({ L: MACE_L, r: HR, to: MACE_L - MACE_R, rise: MACE_R, wide: .16, high: .13, wraps: [[.0, .06], [.2, .25]], head(u, x, y, d) {
    const cu = MACE_L - MACE_R, k = (MACE_R - HR) / cu;                                // the ball rests on the ground, so the haft climbs to its middle
    let q = sdCap(u, y, x, cu - MACE_R - .06, HR + k * (cu - MACE_R - .06), 0, cu - MACE_R + .02, HR + k * (cu - MACE_R + .02), 0, HR + .009, HR + .009); if (q < d) { d = q; hit.mat = IRON; hit.grv = 0; }   // the collar
    q = Math.hypot(u - cu, y - MACE_R, x) - MACE_R; if (q < d) { d = q; hit.mat = IRON; hit.var = .5; hit.grv = 1; }
    return d;
  } }),
  // a spear (Melee24): a long plain shaft, a slim leaf-shaped point a fifth of the length, a dark socket
  spear: hafted({ L: SPEAR_L, r: HS, to: SPEAR_L * .81, wide: .08, high: .05, head(u, x, y, d) {
    const h0 = SPEAR_L * .8, t = clamp((u - h0) / (SPEAR_L - h0), 0, 1), w = Math.max(.036 * Math.sin(3.1416 * t ** .6), .004);
    let q = Math.max((Math.abs(x) / w + Math.abs(y - HS) / .013 - 1) * Math.min(w, .013) * .7, h0 - u, u - SPEAR_L); if (q < d) { d = q; hit.mat = IRON; hit.var = .5; hit.grv = 1; }
    q = sdCap(u, y, x, h0 - .05, HS, 0, h0 + .03, HS, 0, HS + .007, HS + .007); if (q < d) { d = q; hit.mat = IRON; hit.grv = 0; }   // the socket
    return d;
  } }),
};

/* ---------- shields: propped up, leaning back ---------- */
const SA = (() => { const a = [.3, .64, .7], l = Math.hypot(...a); return a.map(v => v / l); })();   // the way the face looks
const E1 = (() => { const a = [SA[2], 0, -SA[0]], l = Math.hypot(...a); return a.map(v => v / l); })();   // across the face
const E2 = [SA[1] * E1[2] - SA[2] * E1[1], SA[2] * E1[0] - SA[0] * E1[2], SA[0] * E1[1] - SA[1] * E1[0]];   // up the face
// outline(a, b): how far inside the shield's edge (negative inside); low: how far its lowest point is below the middle
function shield(o) {
  const cy = o.low * Math.abs(E2[1]) + .012;
  return sized({
    H: .6, bound: [.36, .3, .36],
    sdf(x, y, z) {
      const py = y - cy, h = x * SA[0] + py * SA[1] + z * SA[2], a = x * E1[0] + py * E1[1] + z * E1[2], b = x * E2[0] + py * E2[1] + z * E2[2];
      const edge = o.outline(a, b), lift = o.dome(a, b);
      let d = Math.max(edge, Math.abs(h - lift) - .014) * .75; hit.mat = o.metal ? IRON : WOOD; hit.grv = 1; hit.var = .5;
      if (!o.metal) { const k = (o.across ? b : a) / (o.pitch || .08) + 50, hv = h3(Math.floor(k), 3, 17); hit.var = hv < .35 ? .1 : hv > .7 ? .9 : .5; if (Math.abs(k % 1 - .5) > .44) hit.grv = 0; }   // boards
      else if (o.crease && Math.abs(a) < .005) hit.grv = 0;
      if (o.darkRim && edge > -o.rim) { hit.var = -1; if (o.metal) hit.grv = 0; }           // a darker rim, flat with the face
      else if (edge > -o.rim) { const q = Math.max(edge - .006, Math.abs(h - lift - .006) - .02) * .75; if (q <= d + .002) { d = q; hit.mat = IRON; hit.grv = edge < -o.rim + .008 ? 0 : 1; } }   // a metal rim
      for (const bb of o.bands || []) { const q = Math.max(edge, Math.abs(b - bb) - .024, Math.abs(h - lift - .01) - .016) * .75; if (q < d) { d = q; hit.mat = IRON; hit.grv = Math.abs(Math.abs(b - bb) - .024) < .006 ? 0 : 1; } }   // bands across
      for (const [sa, sb] of o.studs || []) { const q = (Math.hypot(a - sa, b - sb, h - lift - .012) - .017) * .75; if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; } }   // studs
      if (o.boss) { const r = Math.hypot(a, b - (o.bossAt || 0)), q = (Math.hypot(r, (h - lift + .015) * 1.2) - o.boss) * .75; if (q < d) { d = q; hit.mat = IRON; hit.grv = r > o.boss - .01 ? 0 : 1; } }
      return d;
    },
  });
}
export const SHIELDS = {
  A: shield({ low: .25, pitch: .1, outline: (a, b) => Math.hypot(a, b) - .25, dome: (a, b) => .04 * (1 - (a * a + b * b) / .0625), rim: .032, darkRim: true, boss: .07 }),   // round and plain: a wooden face, a darker rim, a dark boss in the middle (Shield1)
  B: shield({ low: .34, metal: true, outline: (a, b) => Math.max(Math.abs(a) - (b > .04 ? .2 : .2 * Math.sqrt(Math.max(0, 1 - ((.04 - b) / .38) ** 2))), b - .24, -.34 - b), dome: a => .035 * (1 - (a / .2) ** 2), rim: .03, darkRim: true }),   // all metal and plain: flat top, pointed foot, a darker rim, nothing on the face (Shield5)
  C: shield({ low: .2, across: true, pitch: .1, rim: 0, outline: (a, b) => { const k = Math.floor(b / .1 + 50); return Math.max(Math.abs(a - .02 * (h3(k, 5, 2) - .5)) - (.2 + .025 * h3(k, 7, 3)), Math.abs(b) - .2); }, dome: () => 0, studs: [-.15, -.05, .05, .15].flatMap(b => [[.12, b], [-.12, b]]) }),   // a square slab of four rough planks with uneven ends, studded (Shield7)
};

/* ---------- coins ---------- */
const CR = .085, CT = .026;                              // a coin's radius and half its thickness: bigger than life, so each one reads
function coinSet(list, extra) {                          // list: [x, y, z, axis x, y, z, hole, size] per coin; a size marks a coin in a row on a cord
  const C = list.map(c => { const l = Math.hypot(c[3], c[4], c[5]); return [c[0], c[1], c[2], c[3] / l, c[4] / l, c[5] / l, c[6] || 0, c[7] || 0]; });
  return {
    H: .3, bound: [.36, .16, .36],
    sdf(x, y, z) {
      let d = 9; hit.mat = IRON; hit.grv = 1; hit.var = .5;
      for (const [cx, cy, cz, ax, ay, az, hole, size] of C) {
        const R = CR * (size || 1);
        const px = x - cx, py = y - cy, pz = z - cz; if (px * px + py * py + pz * pz > .02) { const q = Math.hypot(px, py, pz) - .1; if (q < d) d = q; continue; }
        const h = px * ax + py * ay + pz * az, rr = Math.hypot(px - h * ax, py - h * ay, pz - h * az);
        let q = Math.max(rr - R, Math.abs(h) - CT, (rr - R + Math.abs(h) - CT + .006) * .707); if (hole) q = Math.max(q, hole - rr);   // a cut edge, and a hole for coins on a string
        if (q < d) { d = q; hit.mat = IRON; hit.grv = (!size && rr > R - .006 && h < 0) || (hole && rr < hole + .01 && h > 0) ? 0 : 1; }   // dark under each coin's edge: a stack reads as coins
      }
      return extra ? extra(x, y, z, d) : d;
    },
  };
}
const stack = (x, z, n, s) => Array.from({ length: n }, (_, k) => [x + .02 * (h3(k, s, 1) - .5), CT + k * 2 * CT, z + .02 * (h3(k, s, 2) - .5), 0, 1, 0]);
export const COINS = {
  // A: three stacks and a few loose coins
  A: coinSet([...stack(-.08, -.08, 4, 1), ...stack(.1, -.06, 2, 2), [-.02, CT, .13, 0, 1, 0], [.19, CT, .1, 0, 1, 0], [-.21, CT, .06, 0, 1, 0], [.06, CT + .04, .1, .55, .7, .45]]),
  // B: a tied purse with coins beside it
  B: coinSet([[.14, CT, .1, 0, 1, 0], [.21, CT, -.05, 0, 1, 0], [.13, 3 * CT, .09, 0, 1, 0], [-.02, CT, .2, 0, 1, 0]], (x, y, z, d) => {
    const bx = x + .08, bz = z + .04, r = Math.hypot(bx, bz);
    let q = (Math.hypot(r / .13, (y - .09) / .1) - 1) * .1; q = Math.max(q, -y);                                         // the bag
    const neck = Math.max(r - (.034 + .5 * Math.max(0, y - .2)), Math.abs(y - .215) - .05); if (neck < q) q = neck;       // gathered neck, flaring open
    if (q < d) { d = q; hit.mat = WOOD; hit.var = .5; hit.var = y > .2 ? .9 : .5; hit.grv = Math.abs(y - .19) < .012 ? 0 : 1; }   // a cord round the neck
    return d;
  }),
  // C: holed coins on a cord, fallen in a row, and two loose
  C: coinSet([...Array.from({ length: 7 }, (_, k) => [-.2 + k * .052, CR * .8 + .004, -.02, .8, .6, 0, .026, k % 2 ? .86 : 1]), [.2, CT, .16, 0, 1, 0, .026], [-.08, CT, .18, 0, 1, 0, .026]], (x, y, z, d) => {
    for (const [ax, ay, az, bx, by, bz] of [[-.2, CR * .8, -.02, -.31, .012, .03], [.13, CR * .8, -.02, .27, .012, -.07]]) { const q = sdCap(x, y, z, ax, ay, az, bx, by, bz, .013, .013); if (q < d) { d = q; hit.mat = WOOD; hit.var = .9; hit.grv = 1; } }   // the cord's two ends
    for (const [kx, kz] of [[-.31, .03], [.27, -.07]]) { const q = Math.hypot(x - kx, y - .02, z - kz) - .024; if (q < d) { d = q; hit.mat = WOOD; hit.var = .9; hit.grv = 1; } }   // a knot on each
    return d;
  }),
};

/* ---------- materials: the kit's iron greys, swapped for another metal's colours ---------- */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const METAL = {
  iron: RAMP.iron,
  bronze: ['#3b2410', '#5c3a17', '#7d5420', '#9d702c', '#bb8d3d', '#d8ae5c'].map(hex),
  steel: ['#353e49', '#4c5865', '#667381', '#8592a0', '#a7b3bf', '#cdd7e0'].map(hex),
  coin: ['#59400f', '#7c5b14', '#a27a1c', '#c4992a', '#dfb743', '#f1d46e'].map(hex),
};
// The kit snaps a pixel between two iron tones to the nearest colour it has, which is sometimes one of the rock's greys: those count as metal too.
const lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
const ROCK_AS_IRON = RAMP.rock.map(c => RAMP.iron.reduce((best, t, k) => Math.abs(lum(t) - lum(c)) < Math.abs(lum(RAMP.iron[best]) - lum(c)) ? k : best, 0));
export const swap = (buf, to) => {
  const o = Buffer.from(buf), same = (c, i) => c[0] === o[i] && c[1] === o[i + 1] && c[2] === o[i + 2];
  for (let i = 0; i < o.length; i += 4) {
    if (!o[i + 3]) continue;
    let k = RAMP.iron.findIndex(c => same(c, i)); if (k < 0) { const r = RAMP.rock.findIndex(c => same(c, i)); if (r >= 0) k = ROCK_AS_IRON[r]; }
    if (k >= 0) { o[i] = to[k][0]; o[i + 1] = to[k][1]; o[i + 2] = to[k][2]; }
  }
  return o;
};

/* ---------- which Creator part each item is the picture of (D218, D219) ---------- */
// part: the Creator's folder name; slot: the hand it is held in; item: its picture; metal: the metal shown in drafts;
// kind: how reskin.mjs repaints the part's sheet; thicken: a thin blade drawn one pixel thicker in the hand.
export const MATCHED = [
  { part: 'Melee2', slot: 'weapon', name: 'Long sword', item: SWORDS.A, metal: 'steel', kind: 'sword', thicken: true },
  { part: 'Melee5', slot: 'weapon', name: 'Broad sword', item: SWORDS.B, metal: 'bronze', kind: 'sword' },
  { part: 'Melee4', slot: 'weapon', name: 'Cleaver', item: SWORDS.C, metal: 'iron', kind: 'sword' },
  { part: 'Melee10', slot: 'weapon', name: 'Axe', item: HAFTED.axe, metal: 'iron', kind: 'hafted', haft: { thick: 12, frac: .12, socket: 1.5 } },
  { part: 'Melee12', slot: 'weapon', name: 'Mace', item: HAFTED.mace, metal: 'bronze', kind: 'hafted', haft: { thick: 12, socket: 2 } },
  { part: 'Melee24', slot: 'weapon', name: 'Spear', item: HAFTED.spear, metal: 'steel', kind: 'hafted', haft: { frac: .2, socket: 2 } },
  { part: 'Shield1', slot: 'shield', name: 'Round shield', item: SHIELDS.A, metal: 'iron', kind: 'roundWood' },
  { part: 'Shield5', slot: 'shield', name: 'Metal shield', item: SHIELDS.B, metal: 'bronze', kind: 'metalShield' },
  { part: 'Shield7', slot: 'shield', name: 'Plank shield', item: SHIELDS.C, metal: 'iron', kind: 'planks' },
];

/* ---------- the agreed items, written as sprites ---------- */
// One item per melee skill of the slice (D151). shape: the drawing; metals: the metals it comes in (D133), each a colour swap of the
// same drawing and each its own PNG, named '<Item> <Metal>'. An item with no metals is wood with iron fittings (D220): one PNG.
// A sprite is 256 x 256 with the tile's middle at 128,208, like a prop, but seen from one side only: an item's picture is the same
// on the ground, in a pack, in the loot window and in a shop (D218). '<Item> Shadow' is its ground shadow, shared by its metals.
export const ITEMS = {
  'Long Sword': { shape: SWORDS.A, metals: ['bronze', 'iron', 'steel'] },
  'Axe': { shape: HAFTED.axe, metals: ['bronze', 'iron', 'steel'] },
  'Mace': { shape: HAFTED.mace, metals: ['bronze', 'iron', 'steel'] },
  'Spear': { shape: HAFTED.spear, metals: ['bronze', 'iron', 'steel'] },
  'Round Shield': { shape: SHIELDS.A },
};
/** The file names of an item's sprites, without folder or '.png': [[metal or null, name], ...]. */
export const spritesOf = name => (ITEMS[name].metals || [null]).map(m => [m, m ? `${name} ${m[0].toUpperCase()}${m.slice(1)}` : name]);
/** The box round everything drawn in one or more 256 px pictures: [x, y, width, height]. */
const box = (...bufs) => { let x0 = SIZE, x1 = -1, y0 = SIZE, y1 = -1; for (const b of bufs) for (let y = 0; y < SIZE; y++)for (let x = 0; x < SIZE; x++) if (b[(y * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };

const MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;   // held.mjs and reskin.mjs import this file: they write no sprite
if (MAIN && !process.argv.includes('--draft')) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
  const first = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all', names = first === 'all' ? Object.keys(ITEMS) : first.split(',');
  for (const n of names) if (!ITEMS[n]) { console.error(`No item named "${n}". There are: ${Object.keys(ITEMS).join(', ')}`); process.exit(1); }
  const out = flag('--out', 'prototype/art/made/items'); let count = 0;
  for (const nm of names) {
    const t0 = Date.now(), pic = render(ITEMS[nm].shape, 'S', 3), b = box(pic.out), all = box(pic.out, pic.so);
    if (all[0] < 1 || all[1] < 1 || all[0] + all[2] > SIZE - 1 || all[1] + all[3] > SIZE - 1) { console.error(`${nm} reaches the edge of the ${SIZE} px picture: it is cut off. Nothing written for it.`); process.exit(1); }
    writePng(`${out}/${nm} Shadow.png`, pic.so, SIZE, SIZE); count++;
    for (const [m, file] of spritesOf(nm)) { writePng(`${out}/${file}.png`, swap(pic.out, METAL[m || 'iron']), SIZE, SIZE); count++; }
    console.log(`${nm}: ${b[2]} x ${b[3]} px, ${spritesOf(nm).map(([m]) => m || 'wood').join(', ')}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  console.log(`Wrote ${count} PNGs to ${out}`);
  look(out, names, 'prototype/shots/items.png');
}

/* ---------- the picture to look at: the written sprites, read back from their files ---------- */
// Top: at game size on grass, beside the test game's human and the chest, when their art is there. Under it: every sprite 3 times the
// size, a row per item, a column per metal in the order of ITEMS (bronze, iron, steel).
function look(out, names, path) {
  const GRASS = [70, 96, 44], Z = 3, GAP = 12, PAD = 8, STEP = 150, GY = 126, TOP = 180;
  const its = names.map(nm => ({ nm, so: readPng(`${out}/${nm} Shadow.png`).data, pics: spritesOf(nm).map(([, f]) => readPng(`${out}/${f}.png`).data) }));
  for (const it of its) it.b = box(it.so, ...it.pics);
  const cw = Math.max(...its.map(it => it.b[2])) * Z + 2 * PAD, cols = Math.max(...its.map(it => it.pics.length));
  const X0 = 330, W = Math.max(GAP * 2 + X0 + its.length * STEP, GAP + cols * (cw + GAP)), H = GAP + TOP + GAP + its.reduce((s, it) => s + it.b[3] * Z + 2 * PAD + GAP, 0);
  const img = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { img[i * 4] = 46; img[i * 4 + 1] = 43; img[i * 4 + 2] = 39; img[i * 4 + 3] = 255; }
  let clip = [0, 0, W, H];
  const put = (x, y, c, a) => { if (x < clip[0] || y < clip[1] || x >= clip[0] + clip[2] || y >= clip[1] + clip[3] || a <= 0) return; const o = (y * W + x) * 4; for (let k = 0; k < 3; k++) img[o + k] = Math.round(img[o + k] * (1 - a) + c[k] * a); };
  const rect = (X, Y, w, h, c) => { clip = [X, Y, w, h]; for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) put(x, y, c, 1); };
  // lays the part [bx, by, bw, bh] of a 256 px picture with its corner at x0, y0, z times the size
  const lay = (buf, [bx, by, bw, bh], x0, y0, z, alpha, black) => { for (let y = 0; y < bh * z; y++) for (let x = 0; x < bw * z; x++) { const s = ((by + (y / z | 0)) * SIZE + bx + (x / z | 0)) * 4; if (buf[s + 3]) put(x0 + x, y0 + y, black ? [0, 0, 0] : [buf[s], buf[s + 1], buf[s + 2]], alpha); } };
  const whole = [0, 0, SIZE, SIZE], piece = (so, pic, x) => { lay(so, whole, x - 128, GAP + GY - 208, 1, .3, true); lay(pic, whole, x - 128, GAP + GY - 208, 1, 1, false); };
  // game size
  rect(GAP, GAP, W - 2 * GAP, TOP, GRASS);
  const DATA = 'prototype/character/character_data.json', CRE = 'prototype/art/creator/', CHEST = 'prototype/art/made/Chest';
  if (existsSync(DATA) && existsSync(`${CRE}NakedBody/Idle.png`)) {                       // the human, standing, facing the viewer, hands empty
    const D = JSON.parse(readFileSync(DATA, 'utf8')), F = D.sheet.frame_px, SC = D.sprite_scale, GREY = D.sheet.grey_ref * 255, row = D.directions.indexOf('S'), [fx, fy] = D.sheet.foot_origin;
    for (const part of D.layer_order.S) {
      if (/^(Melee|Shield)/.test(part) || !existsSync(`${CRE}${part}/Idle.png`)) continue;
      const p = readPng(`${CRE}${part}/Idle.png`), sh = part === 'Shadow', t = sh ? null : [1, 3, 5].map(i => parseInt(D.races.human.tints[part].slice(i, i + 2), 16));
      for (let y = 0; y < F * SC; y++) for (let x = 0; x < F * SC; x++) {
        const o = ((row * F + Math.floor(y / SC)) * p.width + Math.floor(x / SC)) * 4, a = p.data[o + 3] / 255 * (sh ? D.shadow_alpha : 1); if (!a) continue;
        put(GAP + 90 + x - Math.round(fx * SC), GAP + GY + y - Math.round(fy * SC), t ? t.map((v, k) => Math.min(255, p.data[o + k] * v / GREY)) : [p.data[o], p.data[o + 1], p.data[o + 2]], a);
      }
    }
  }
  if (existsSync(`${CHEST} A1_S.png`)) piece(readPng(`${CHEST} Shadow A1_S.png`).data, readPng(`${CHEST} A1_S.png`).data, GAP + 220);
  its.forEach((it, k) => piece(it.so, it.pics[it.pics.length - 1], GAP + X0 + k * STEP + STEP / 2));
  // every sprite, enlarged
  let y0 = GAP + TOP + GAP;
  for (const it of its) {
    const ch = it.b[3] * Z + 2 * PAD;
    it.pics.forEach((pic, c) => { const x0 = GAP + c * (cw + GAP); rect(x0, y0, cw, ch, GRASS); const ox = x0 + ((cw - it.b[2] * Z) >> 1), oy = y0 + PAD; lay(it.so, it.b, ox, oy, Z, .3, true); lay(pic, it.b, ox, oy, Z, 1, false); });
    y0 += ch + GAP;
  }
  writePng(path, img, W, H); console.log(`Picture: ${path} (top: game size; under it: ${Z} times the size, a row per item, a column per metal)`);
}

/* ---------- the draft: a row per item, a column per design. On the ground 4 times the size; under it, in pack slots twice the size ---------- */
const GLYPH = { A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,11110,10001,10001,10001,11110', C: '01111,10000,10000,10000,10000,10000,01111' };
if (MAIN && process.argv.includes('--draft')) {
  const ROWS = [['Sword', SWORDS, 'steel', ['bronze', 'iron', 'steel']], ['Shield', SHIELDS, 'steel', ['bronze', 'iron', 'steel']], ['Coins', COINS, 'coin', ['coin']]];
  const Z = 4, CELL = 360, GH = 60 * Z, SL = 116, RH = GH + 8 + SL + 20, W = 12 + 3 * (CELL + 12), H = 12 + ROWS.length * RH, sheet = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { sheet[i * 4] = 46; sheet[i * 4 + 1] = 43; sheet[i * 4 + 2] = 39; sheet[i * 4 + 3] = 255; }
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++)for (let x = x0; x < x0 + w; x++) { const o = (y * W + x) * 4; sheet[o] = c[0]; sheet[o + 1] = c[1]; sheet[o + 2] = c[2]; } };
  // draws part of a 256 px picture, z times the size, clipped to the box cx, cy, cw, ch
  const blit = (buf, [bx, by, bw, bh], x0, y0, z, alpha, black, [cx, cy, cw, ch]) => { for (let y = 0; y < bh * z; y++)for (let x = 0; x < bw * z; x++) { const s = ((by + (y / z | 0)) * SIZE + bx + (x / z | 0)) * 4; if (!buf[s + 3]) continue; const X = x0 + x, Y = y0 + y; if (X < cx || Y < cy || X >= cx + cw || Y >= cy + ch) continue; const o = (Y * W + X) * 4; for (let k = 0; k < 3; k++) sheet[o + k] = Math.round(sheet[o + k] * (1 - alpha) + (black ? 0 : buf[s + k]) * alpha); } };
  ROWS.forEach(([name, set, hero, metals], r) => Object.keys(set).forEach((key, c) => {
    const t0 = Date.now(), pic = render(set[key], 'S', 3), b = box(pic.out), x0 = 12 + c * (CELL + 12), y0 = 12 + r * RH, clip = [x0, y0, CELL, GH];
    rect(x0, y0, CELL, GH, [70, 96, 44]);
    const ox = x0 + ((CELL - b[2] * Z) >> 1) - b[0] * Z, oy = y0 + ((GH - b[3] * Z) >> 1) - b[1] * Z;
    blit(pic.so, [0, 0, SIZE, SIZE], ox, oy, Z, .3, true, clip); blit(swap(pic.out, METAL[hero]), [0, 0, SIZE, SIZE], ox, oy, Z, 1, false, clip);
    GLYPH[key].split(',').forEach((row, j) => [...row].forEach((bit, i) => { if (bit === '1') rect(x0 + 8 + i * 3, y0 + 8 + j * 3, 3, 3, [236, 232, 214]); }));
    metals.forEach((m, k) => { const sx = x0 + k * (SL + 6), sy = y0 + GH + 8; rect(sx, sy, SL, SL, [92, 86, 76]); rect(sx + 1, sy + 1, SL - 2, SL - 2, [30, 28, 25]); blit(swap(pic.out, METAL[m]), b, sx + ((SL - b[2] * 2) >> 1), sy + ((SL - b[3] * 2) >> 1), 2, 1, false, [sx + 1, sy + 1, SL - 2, SL - 2]); });
    if (metals.length === 1) { const sx = x0 + SL + 6, sy = y0 + GH + 8; rect(sx, sy, 64, 64, [92, 86, 76]); rect(sx + 1, sy + 1, 62, 62, [30, 28, 25]); blit(swap(pic.out, METAL[hero]), b, sx + ((64 - b[2]) >> 1), sy + ((64 - b[3]) >> 1), 1, 1, false, [sx + 1, sy + 1, 62, 62]); }   // and once at its real size
    console.log(`${name} ${key}: ${b[2]} x ${b[3]} px, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }));
  writePng('prototype/shots/items-draft.png', sheet, W, H); console.log('Draft picture: prototype/shots/items-draft.png');
}
