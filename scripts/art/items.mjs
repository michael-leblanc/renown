// Items drawn the way the props are (the tileset's camera, light and colours) (D218).
// Two pictures per item: on the ground it lies in the world, clothes laid out flat (the Ultima Online way); in the pack most items
// show the same drawing turned up to face the viewer and fitted to a slot (the RuneScape way). Items that already stand or sit facing
// the viewer (shields, helmets, footwear, backpacks, bandage, coins) show their ground picture in the pack too. The sack is never in
// a pack (it is what lies on a tile holding several things).
// One drawing per item; a metal or a dye is a swap of its colours (as UO's hues and RuneScape's recolours do).
//   node scripts/art/items.mjs [names, comma separated | all] [--out dir]
//       writes the agreed items (the ITEMS list) as sprites into prototype/art/made/items/ (their pack pictures into its pack/
//       folder), and one picture of them to look at, prototype/shots/items.png
//   node scripts/art/items.mjs --draft
//       three designs of each sword, shield and coin pile in one picture, prototype/shots/items-draft.png; nothing else written
import { clamp, h3, sdBox, sdCap, hit, WOOD, IRON, CANVAS, LEATHER, RAMP, render, SIZE } from './kit.mjs';
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


/* ---------- the slice's other items (Michael, 2026-11-17: "Good"), each after the Creator part named in its comment ---------- */
const set = (mat, v = .5, g = 1) => { hit.mat = mat; hit.var = v; hit.grv = g; };

/* ---------- bow (Ranged1, short bow): lying flat, the string toward the viewer ---------- */
// Lh: half the length tip to tip; s: how far the bow bends from its string; r: the limb's radius at the grip
function bow({ Lh, s, r }) {
  const R = (Lh * Lh + s * s) / (2 * s), cx = s - R, maxA = Math.asin(Lh / R);   // the string runs along z at x = 0, the bow bends out to x = s; the tips are at x = 0
  return sized({
    H: .1, bound: [s / 2 + .05, .05, Lh + .05],
    sdf(X, y, z) {
      const x = X + s / 2, px = x - cx, a = Math.atan2(z, px), t = Math.min(1, Math.abs(a) / maxA);
      const dArc = Math.abs(a) <= maxA ? Math.abs(Math.hypot(px, z) - R) : Math.hypot(x, z - Math.sign(z) * Lh);
      const rr = t < .12 ? r * 1.25 : r * (1 - .55 * t);
      let d = Math.hypot(dArc, y - rr) - rr; set(WOOD, .9);
      if (t < .12) set(LEATHER, .5, Math.abs(((z * 60) % 1 + 1) % 1 - .5) < .18 ? 0 : 1);         // the grip, bound in leather
      else if (t > .92) set(WOOD, .1);                                                             // dark tips
      const q = sdCap(x, y, z, .006, .012, -Lh + .012, .006, .012, Lh - .012, .0065, .0065); if (q < d) { d = q; set(CANVAS, .9); }   // the string
      return d;
    },
  });
}

/* ---------- arrows: a few lying across each other (the quiver Bag2 holds them) ---------- */
function arrows(list) {
  return sized({
    H: .05, bound: [.32, .04, .32],
    sdf(x, y, z) {
      let d = 9; set(WOOD, .9);
      for (const [ax, az, ang, k] of list) {
        const c = Math.cos(ang), s = Math.sin(ang), u = (x - ax) * c + (z - az) * s, v = -(x - ax) * s + (z - az) * c, yy = y - .012 - k * .018;   // u along the arrow
        let q = sdCap(u, yy, v, -.27, 0, 0, .22, 0, 0, .0085, .0085); if (q < d) { d = q; set(WOOD, .9); }
        const t = clamp((u - .22) / .07, 0, 1), w = .03 * Math.sin(3.1416 * Math.min(1, t * 1.25)) + .002;   // a leaf-shaped iron head
        q = Math.max((Math.abs(v) / w + Math.abs(yy) / .007 - 1) * Math.min(w, .007) * .7, .21 - u, u - .29); if (q < d) { d = q; set(IRON); }
        { q = Math.max(Math.abs(u + .2) - .06, Math.abs(yy) - .005, Math.abs(v) - .034 * clamp((u + .27) / .06, .25, 1)); if (q < d) { d = q; set(CANVAS, .9, Math.abs(v) < .009 ? 0 : 1); } }   // fletching: pale feathers either side of the shaft
      }
      return d;
    },
  });
}

/* ---------- bandage (D164): a roll of cloth with its loose end trailing ---------- */
const BANDAGE = {
  H: .12, bound: [.12, .06, .2], boundZ: .05,
  sdf(x, y, z) {
    const R = .052, hw = .055, rr = Math.hypot(y - R, z);
    let d = Math.max(rr - R, Math.abs(x) - hw) + .002; set(CANVAS, .9, 1);
    if (Math.abs(x) > hw - .006) set(CANVAS, .5, Math.abs(((rr * 70) % 1) - .5) < .2 ? 0 : 1);   // the rolled end: turns of cloth
    else if (Math.abs(Math.abs(x) - hw + .004) < .003) hit.grv = 0;
    const wave = .004 * Math.sin(z * 40);                                                          // the loose end, lying on the ground toward the viewer
    const q = Math.max(Math.abs(x - .006 * Math.sin(z * 18)) - hw * .9, Math.abs(y - .004 - wave * (z > .06 ? 1 : 0)) - .004, -z, z - .27); if (q < d) { d = q; set(CANVAS, .9, 1); }
    return d;
  },
};

/* ---------- sack: what is left on the ground when several things lie on one tile (D2, D3) ---------- */
const SACK = {
  H: .4, bound: [.2, .2, .2],
  sdf(x, y, z) {
    const r = Math.hypot(x, z), ang = Math.atan2(z, x);
    const R = .15 + .03 * Math.sin(ang * 3 + 1) - .07 * clamp((y - .17) / .1, 0, 1) ** 1.5 + .02 * clamp(1 - y / .08, 0, 1);   // slumped, wider at the foot, narrowing to the neck
    let d = Math.max(r - R, -y, y - .28) * .8; set(CANVAS, .5, 1);
    if (y > .02 && y < .24 && Math.abs(Math.sin(ang * 5 + y * 9)) < .08) hit.grv = 0;                // creases running up to the neck
    const neck = Math.max(r - (.035 + .55 * Math.max(0, y - .3)), Math.abs(y - .3) - .05); if (neck < d) { d = neck; set(CANVAS, .5, Math.abs(y - .29) < .012 ? 0 : 1); }   // gathered, flaring open, a cord round it
    const cord = sdCap(x, y, z, .03, .29, .02, .09, .2, .06, .008, .008); if (cord < d) { d = cord; set(CANVAS, .1, 1); }   // the cord's loose end
    return d;
  },
};

/* ---------- clothes and body armour, after Ultima Online and RuneScape: the whole garment, sleeves spread, so its shape says what it is ---------- */
// Each is a flat outline in (a across, b up the body), drawn one of two ways: 'flat', laid out on the ground with the neck away from the
// viewer (UO's clothes on the ground), or 'up', propped up facing the viewer (RuneScape's pictures in the pack).
// o: w half width of the body, top and bot where it starts and ends (b), flare: how much wider at the hem, sleeve [end a, end b, radius]
// or none, neck radius, mat, detail(a, b, e, lift) to set grooves and colours, extra(a, b, h, lift, d) for raised parts.
const UPF = (() => { const n = [.62, .48, .62], l = Math.hypot(...n); return n.map(v => v / l); })();   // 'up': the face looks back at the camera, leaning back a little
const UPA = [Math.SQRT1_2, 0, -Math.SQRT1_2], UPB = [UPF[1] * UPA[2] - UPF[2] * UPA[1], UPF[2] * UPA[0] - UPF[0] * UPA[2], UPF[0] * UPA[1] - UPF[1] * UPA[0]];
const smin = (p, q, k) => { const h = clamp(.5 + .5 * (q - p) / k, 0, 1); return q + (p - q) * h - k * h * (1 - h); };
function outline(a, b, o) {
  const aa = Math.abs(a), w = o.w + o.flare * clamp((o.mid - b) / (o.mid - o.bot), 0, 1);
  let e = Math.max(aa - w, o.bot - b, b - (o.top - .07 * (aa / o.w) ** 2));                         // the body, its shoulders sloping
  if (o.sleeve) { const [ea, eb, r] = o.sleeve, sa = o.w - .02, sb = o.top - .045; const t = clamp(((aa - sa) * (ea - sa) + (b - sb) * (eb - sb)) / ((ea - sa) ** 2 + (eb - sb) ** 2), 0, 1); e = smin(e, Math.hypot(aa - sa - t * (ea - sa), b - sb - t * (eb - sb)) - r * (1 - .15 * t), .03); }
  e = Math.max(e, o.neck - Math.hypot(a * .9, b - o.top - .01));                                    // the neck
  return e;
}
function garment(o, mode) {
  const T = o.thick || .012;
  return sized({
    H: mode === 'flat' ? .1 : .6, bound: mode === 'flat' ? [.42, .07, .42] : [.4, .36, .3],
    sdf(x, y, z) {
      let a, b, h;
      if (mode === 'flat') { a = (x - z) * Math.SQRT1_2; b = (-x - z) * Math.SQRT1_2 + .02; h = y; }
      else { const py = y - .33; a = x * UPA[0] + z * UPA[2]; b = x * UPB[0] + py * UPB[1] + z * UPB[2]; h = x * UPF[0] + py * UPF[1] + z * UPF[2]; }
      const e = o.outline ? o.outline(a, b) : outline(a, b, o);
      let lift = mode === 'flat' ? T + (o.folds ? .006 * Math.sin(a * 23 + 1.3 * Math.sin(b * 17)) * Math.sin(b * 11) : 0) : o.dome * Math.max(0, 1 - (a / (o.w + .03)) ** 2);
      let d = Math.max(e, Math.abs(h - lift) - T) * .75;
      if (mode === 'flat' && h < .0001 && e < 0) d = Math.max(d, -h);
      set(o.mat, .5, 1); o.detail(a, b, e, lift);
      if (o.extra) d = o.extra(a, b, h, lift, d);
      return d;
    },
  });
}
const groove = () => { hit.grv = 0; };
const TUNIC_O = {                                                                                  // UO's tunic, RuneScape's shirt: long sleeves, to the hips, a belt
  w: .13, top: .17, bot: -.24, mid: -.1, flare: .025, sleeve: [.31, -.06, .045], neck: .045, mat: CANVAS, dome: .03, folds: true,
  detail(a, b, e) {
    const aa = Math.abs(a);
    if (e > -.012) hit.var = .2;                                                                  // a darker hem
    if (aa < .004 && b > .06 && b < .17) groove();                                                // the slit at the neck
    if (aa > .21 && Math.abs(aa * .54 + b + .07 - .17) < .006) groove();                          // cuffs
    if (Math.abs(b + .1) < .016 && aa < .16) { set(LEATHER, .1, Math.abs(b + .1) > .012 ? 0 : 1); if (aa < .02) set(IRON, .5, aa > .015 || Math.abs(b + .1) > .011 ? 0 : 1); }   // the belt and its buckle
  },
};
const JERKIN_O = {                                                                                 // UO's leather tunic, RuneScape's leather body: short sleeves, laced, stitched
  w: .135, top: .17, bot: -.2, mid: -.05, flare: .01, sleeve: [.22, .07, .055], neck: .055, mat: LEATHER, dome: .035, thick: .016,
  detail(a, b, e) {
    const aa = Math.abs(a), k = Math.floor(a / .07 + 9) * 7 + Math.floor(b / .09 + 9), pv = h3(k, 4, 9);
    hit.var = pv < .22 ? .1 : pv > .8 ? .9 : .5;                                                   // patches
    if (e > -.014 && ((a * 50 + b * 50) % 1 + 1) % 1 < .45) groove();                              // stitching round the edge
    if (aa > .15 && aa < .16 && b > .02) groove();                                                // where the sleeve is sewn on
    if (aa < .005 && b < .12) groove();                                                           // the opening down the front
    if (aa < .03 && b < .1 && b > -.15 && Math.abs(((b * 18) % 1 + 1) % 1 - .5) < .14 && Math.abs(aa - Math.abs(((b * 18) % 1 + 1) % 1 - .5) * .06) < .006) set(LEATHER, .9, 1);   // laces criss-crossing
  },
};
const PLATE_O = {                                                                                  // RuneScape's platebody: a breastplate with shoulder plates and a skirt of bands
  w: .14, top: .16, bot: -.17, mid: -.05, flare: .01, sleeve: null, neck: .06, mat: IRON, dome: .055, thick: .014,
  detail(a, b, e) { const aa = Math.abs(a); if (e > -.014) groove(); if (aa < .006 && b > -.15 && b < .1) hit.grv = .5; },   // a dark rim; a ridge (left to the light)
  extra(a, b, h, lift, d) {
    const aa = Math.abs(a);
    const keep = [hit.mat, hit.var, hit.grv]; let q = 9, got = null;
    for (const [cb, ra, rb, k] of [[.1, .095, .07, 0], [.045, .085, .05, 1]]) {                     // shoulder plates: two curved lames each side, overlapping
      const u = (aa - .155 - .01 * k) / ra, v = (b - cb) / rb, w = (h - lift * .4 - .012 + .006 * k) / .04, r = Math.hypot(u, v, w);
      const qq = Math.max((r - 1) * .035, -(h - lift * .2)); if (qq < q) { q = qq; got = Math.hypot(u, v) > .86 ? 0 : 1; }
    }
    if (q < d) { d = q; set(IRON, .5, got); } else set(...keep);
    for (let j = 0; j < 3; j++) {                                                                  // the skirt: three bands, each a little wider and lower
      const bb = -.19 - j * .045, q2 = Math.max(aa - (.14 + .012 * j), Math.abs(b - bb) - .022, Math.abs(h - lift * .4 - .004) - .012) * .75;
      if (q2 < d) { d = q2; set(IRON, .5, Math.abs(b - bb) > .016 ? 0 : 1); }
    }
    for (const [ra, rb] of [[-.11, .02], [.11, .02], [-.1, -.13], [.1, -.13]]) { const r = (Math.hypot(a - ra, b - rb, h - lift - .01) - .011) * .75; if (r < d) { d = r; set(IRON, .5, 1); } }   // rivets
    return d;
  },
};
const TUNIC_FLAT = garment(TUNIC_O, 'flat'), JERKIN_FLAT = garment(JERKIN_O, 'flat'), PLATE_FLAT = garment(PLATE_O, 'flat');

/* ---------- a backpack, set down (Bag1): a canvas body under a leather flap, two straps with buckles ---------- */
const BACKPACK = {
  H: .35, bound: [.18, .19, .13],
  sdf(x, y, z) {
    let d = sdBox(x, y - .16, z, .14, .16, .085, .05); set(CANVAS, .5, 1);
    if (Math.abs(x) > .135 && y > .05) hit.grv = 0;                                                  // side seams
    const flap = Math.max(sdBox(x, y - .25, z, .15, .08, .095, .05), -(y - .17 - .05 * (1 - (x / .15) ** 2)) - 0, y - .34);   // the flap over the top, coming down the front in a curve
    if (flap < d + .006) { d = Math.min(d, flap); set(LEATHER, .5, 1); if (Math.abs(y - .17 - .05 * (1 - (x / .15) ** 2)) < .008) hit.grv = 0; }
    for (const sx of [-.06, .06]) {
      const q = sdBox(x - sx, y - .19, z - .092, .018, .12, .006, .002); if (q < d) { d = q; set(LEATHER, .1, 1); }   // straps down the front
      const b = sdBox(x - sx, y - .1, z - .1, .022, .016, .006, .003); if (b < d) { d = b; set(IRON, .5, Math.abs(x - sx) < .012 && Math.abs(y - .1) < .008 ? 0 : 1); }   // buckles
    }
    return d;
  },
};

/* ---------- the rest of the worn gear (Michael, 2026-11-17: "go with the rest"), drawn from the Creator parts' names (creator_parts.json) ---------- */
// u: toward the viewer, v: across the picture to the right (the camera looks along -x and -z alike).
const fwd = (x, z) => [(x + z) * Math.SQRT1_2, (x - z) * Math.SQRT1_2];
const sd2 = (a, b, ax, ay, bx, by, ra, rb) => sdCap(a, b, 0, ax, ay, 0, bx, by, 0, ra, rb);   // a tapered stroke in a flat outline

/** Laid flat like the clothes (D218): o.outline(a, b) (negative inside), o.mat, o.detail(a, b, e), o.thick, o.folds. */
const flat = o => garment({ ...o, w: .1 }, 'flat');

// trousers (Legs1, cloth, takes any dye) and strapped leather trousers (Legs5): laid flat, the waist away from the viewer
const legs = (a, b) => Math.min(sdBox(a, b - .1, 0, .1, .07, 1, .015), sd2(Math.abs(a), b, .05, .06, .085, -.34, .052, .042));
const TROUSERS = flat({
  mat: CANVAS, folds: true, outline: legs,
  detail(a, b, e) {
    const aa = Math.abs(a);
    if (b > .145) hit.var = .2;                                                                    // the waistband
    if (Math.abs(b - .145) < .005 && aa < .1) groove();
    if (aa < .004 && b > .06 && b < .145) groove();                                                // the fly
    if (b < -.31 && e > -.03) hit.var = .2;                                                       // hems
    if (b < .04 && Math.abs(aa - (.05 + .035 * (.06 - b) / .4)) < .003) groove();                  // a crease down each leg
  },
});
const LEATHER_TROUSERS = flat({
  mat: LEATHER, thick: .016, outline: legs,
  detail(a, b, e) {
    const aa = Math.abs(a);
    if (e > -.012 && ((a * 50 + b * 50) % 1 + 1) % 1 < .45) groove();                              // stitched edges
    if (b > .145) hit.var = .1;
    if (aa < .004 && b > .06) groove();
    for (const sb of [-.09, -.24]) if (b < .04 && Math.abs(b - sb) < .016) { set(LEATHER, .1, Math.abs(b - sb) > .011 ? 0 : 1); if (Math.abs(aa - .1) < .012 && Math.abs(b - sb) < .011) set(IRON, .5, 1); }   // straps round each leg, a buckle on the outside
  },
});

// a pointed hood with a short cowl (Head3, cloth, takes any dye): laid flat, the point away from the viewer
const HOOD = sized(flat({
  mat: CANVAS, folds: true,
  outline: (a, b) => smin(Math.max(Math.hypot(a, b - .06) - .105, -(b - .06) - .2) * 1 + Math.max(0, b - .06) * (Math.abs(a) / .105) * .6, sdBox(a, b + .1, 0, .15 - .25 * (b + .1), .055, 1, .02), .03),
  detail(a, b, e) {
    if (e > -.012) hit.var = .2;                                                                   // a darker hem
    const f = Math.hypot(a / .055, (b - .03) / .065);                                              // the face opening
    if (f < 1) { hit.var = .1; if (f > .82) groove(); }
    if (Math.abs(b + .045) < .004 && Math.abs(a) < .13) groove();                                 // where the cowl is sewn on
  },
}), 1.35);   // bigger than its head: the cowl lies over the shoulders

// a pair of gloves (Hands1, leather) and of gauntlets (Hands4, metal): laid flat side by side, fingers away, thumbs in
function hand(a, b) {
  const x = a;   // x > 0 toward the thumb
  let e = sdBox(x, b, 0, .045, .04, 1, .02);                                                       // the palm
  for (let k = 0; k < 4; k++) e = Math.min(e, sd2(x, b, -.033 + .022 * k, .03, -.036 + .025 * k, .085 + (k === 1 || k === 2 ? .015 : 0), .011, .009));   // fingers
  e = Math.min(e, sd2(x, b, .04, -.005, .075, .045, .013, .01));                                  // the thumb
  return smin(e, sdBox(x, b + .07, 0, .05, .035, 1, .01), .01);                                    // the cuff
}
const pair = (a, b) => Math.min(hand(.085 - a, b), hand(a + .085, b));   // the left glove's thumb points right, the right glove's left
const handPart = (a, b) => { const x = a < 0 ? a + .085 : .085 - a; return { x, b }; };
const GLOVES = flat({
  mat: LEATHER, thick: .014, outline: pair,
  detail(a, b, e) {
    const { x } = handPart(a, b);
    if (b < -.04) { hit.var = .1; if (Math.abs(b + .04) < .004) groove(); }                       // the cuff, darker
    else if (b > .04 && Math.abs(((x + .044) / .022) % 1 - .5) > .44 && Math.abs(x) < .045) groove();   // between the fingers
  },
});
const GAUNTLETS = flat({
  mat: IRON, thick: .016, outline: (a, b) => Math.min(hand(.085 - a, b) - .004, hand(a + .085, b) - .004),
  detail(a, b, e) {
    if (e > -.008) groove();                                                                     // a dark rim
    if (b > -.035 && b < .035 && Math.abs(((b + .035) / .023) % 1) < .18) groove();                 // plates across the back of the hand
    if (b > .04 && Math.abs(((b - .04) / .02) % 1) < .2) groove();                                // and across the fingers
    if (b < -.04) { hit.var = .5; if (Math.abs(b + .04) < .005) groove(); }                       // the flared cuff
  },
});

// a helmet standing on its rim: an iron skullcap (Head22) and a closed helm (Head20, covers the face, D40), each in the metals
const SKULLCAP = sized({
  H: .3, bound: [.18, .17, .18],
  sdf(x, y, z) {
    const R = .15, [, v] = fwd(x, z);
    let d = Math.max(Math.hypot(x, y, z) - R, -y); set(IRON, .5, 1);
    let q = Math.max(Math.hypot(x, z) - R - .009, -y, y - .035); if (q < d) { d = q; set(IRON, .5, y > .029 ? 0 : 1); }   // the band round the rim
    q = Math.max(Math.abs(v) - .009, Math.hypot(x, y, z) - R - .008, .03 - y); if (q < d) { d = q; set(IRON, .5, 1); }      // a ridge over the top, front to back
    for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + .4; q = Math.hypot(x - (R + .01) * Math.cos(t), y - .018, z - (R + .01) * Math.sin(t)) - .009; if (q < d) { d = q; set(IRON, .5, 1); } }   // rivets
    return d;
  },
});
const GREAT_HELM = sized({
  H: .4, bound: [.16, .2, .16],
  sdf(x, y, z) {
    const R = .125, Ht = .32, [u, v] = fwd(x, z), r = Math.hypot(x, z), ang = Math.atan2(v, u);   // ang: 0 straight at the viewer
    const top = Ht - .05 * (r / R) ** 2;                                                        // a slightly domed top
    let d = Math.max(r - R, -y, y - top) * .9; set(IRON, .5, 1);
    if (Math.abs(ang) < .7 && Math.abs(y - .17) < .011) { set(IRON, .5, 0); hit.var = -1; }   // the eye slit
    const gy = (y - .05) / .028, ga = (ang - .15) / .16;                                            // breathing holes on one side
    if (gy > 0 && gy < 3 && ga > 0 && ga < 4 && Math.abs(gy % 1 - .5) < .26 && Math.abs(ga % 1 - .5) < .26) { set(IRON, .5, 0); hit.var = -1; }
    const ridge = Math.max(Math.abs(v) - .008, r - R - .008, -y + .01, y - top + .01, -u); if (ridge < d) { d = ridge; set(IRON, .5, Math.abs(y - .17) < .011 ? 0 : 1); }   // a ridge down the front
    for (const [a, yy] of [[-.9, .25], [.9, .25], [-.9, .05], [.9, .05]]) { const q = Math.hypot(x - (R + .004) * Math.cos(Math.PI / 4 + a), y - yy, z - (R + .004) * Math.sin(Math.PI / 4 + a)) - .009; if (q < d) { d = q; set(IRON, .5, 1); } }   // rivets
    return d;
  },
});

// a pair of shoes (Shoes1, leather) and of armoured boots (Shoes5, metal): standing side by side, toes down and to the right
// p: along the foot, from the heel to the toe (+x); q: across it; the pair is set one behind the other along z
function shoe(p, q, y, tall) {
  const sole = sdBox(p, y - .025, q, .11, .025, .04, .022);                                        // the sole and the foot over it
  const instep = (Math.hypot((p + .01) / .1, (y - .03) / .05, q / .042) - 1) * .04;                // rising from the toe to the ankle
  const shaft = Math.max(Math.hypot(p + .065, q) - .043, -y, y - tall);                           // the ankle, or the boot's shaft
  return smin(Math.min(sole, instep), shaft, .015);
}
function footwear(tall, mat, detail) {
  return sized({
    H: tall + .05, bound: [.18, tall / 2 + .02, .16],
    sdf(x, y, z) {
      const side = z < 0 ? -1 : 1, p = x - side * .025, q = z - side * .055;
      const d = shoe(p, q, y, tall); set(mat, .5, 1);
      if (y > tall - .008 && Math.hypot(p + .065, q) < .031) { hit.var = mat === IRON ? -1 : .1; hit.grv = 0; }   // the dark opening at the top
      else if (y < .01) hit.var = mat === IRON ? -1 : .1;                                         // the sole
      else detail(p, q, y);
      return d;
    },
  });
}
const SHOES = footwear(.09, LEATHER, (p, q, y) => {
  if (Math.abs(q) < .011 && p > -.04 && p < .04 && y > .045 && Math.abs(((p * 70) % 1 + 1) % 1 - .5) < .22) set(LEATHER, .9, 1);   // laces
  if (Math.abs(y - .016) < .004) groove();                                                        // the welt
});
const METAL_BOOTS = footwear(.17, IRON, (p, q, y) => {
  if (p > 0 && y < .07 && Math.abs(((p / .03) % 1)) < .18) groove();                              // plates over the toes
  if (p < -.02 && y > .06 && Math.abs((((y - .06) / .035) % 1)) < .14) groove();                  // bands up the shaft
});

// a quiver (Bag2, leather) lying on its side, open end away and to the right, arrows in it
const QUIVER = sized({
  H: .1, bound: [.08, .07, .3], boundZ: -.03,
  sdf(x, y, z) {
    const u = -z + .2, R = .048;                                                                  // u along it, from the bottom
    let d = Math.max(Math.hypot(x, y - R) - (R - .006 * (1 - u / .4)), -u, u - .4); set(LEATHER, .5, 1);
    if (u > .36) { hit.var = .1; if (Math.abs(u - .36) < .005) groove(); }                        // the darker rim
    if (u < .025) hit.var = .1;
    let q = Math.max(Math.abs(x + .02) - .012, Math.hypot(x, y - R) - R - .006, .05 - u, u - .33); if (q < d) { d = q; set(LEATHER, .1, 1); }   // a strap down its length
    for (const [ox, oy, k] of [[-.02, .055, 0], [.015, .065, 1], [0, .035, 2]]) {                 // three arrows sticking out
      q = sdCap(x, y, u, ox, oy, .38, ox * 1.3, oy + .004, .5, .007, .007); if (q < d) { d = q; set(WOOD, .9); }
      q = Math.max(Math.abs(u - .47) - .045, Math.hypot(x - ox * 1.25, y - oy) - .022 - .003 * k, -(Math.abs(x - ox * 1.25) + Math.abs(y - oy) - .004)); if (q < d) { d = q; set(CANVAS, .9, 1); }   // fletching
    }
    return d;
  },
});

// a backpack with a bedroll strapped on top (Bag6)
const BEDROLL_PACK = {
  H: .45, bound: [.2, .23, .13],
  sdf(x, y, z) {
    let d = BACKPACK.sdf(x, y, z);
    const r = Math.hypot(y - .39, z - .005), roll = Math.max(r - .055, Math.abs(x) - .17) + .002;
    if (roll < d) { d = roll; set(CANVAS, .2, 1); if (Math.abs(x) > .164) set(CANVAS, .5, Math.abs(((r * 60) % 1) - .5) < .2 ? 0 : 1); }   // the roll, its ends showing the turns
    for (const sx of [-.1, .1]) { const q = Math.max(Math.abs(x - sx) - .014, Math.abs(r - .058) - .006); if (q < d) { d = q; set(LEATHER, .1, 1); } }   // two ties
    return d;
  },
};

/* ---------- the pack picture, the RuneScape way: the same drawing turned to face the viewer ----------
   An item lying on the ground is turned up off the ground: what pointed away from the viewer now points up, what lay across
   still lies across, so a sword points to the top right as in RuneScape's pack. Same camera, light and colours as on the ground. */
export function icon(shape, lift = .3) {
  return {
    ...shape, H: .6, bound: [.45, .45, .45], boundZ: 0, cast: (x, y, z) => 9,                    // no ground shadow in the pack
    sdf(x, y, z) {
      const py = y - lift, a = x * UPA[0] + z * UPA[2], b = x * UPB[0] + py * UPB[1] + z * UPB[2], h = x * UPF[0] + py * UPF[1] + z * UPF[2];
      return shape.sdf((a - b) * Math.SQRT1_2, h, (-a - b) * Math.SQRT1_2);
    },
  };
}

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

/* ---------- cloth takes any dye (D133): the canvas ramp swapped for a dyed one, as UO's hues do ---------- */
export const DYE = {
  undyed: null,
  blue: ['#1d2333', '#26304a', '#313f60', '#3d4f78', '#4d6290', '#6178a6', '#7a90b8'].map(hex),
  red: ['#2e1414', '#421b1a', '#5a2420', '#722e27', '#8a3a30', '#a14c3c', '#b5634f'].map(hex),
  green: ['#1c2616', '#25331c', '#2f4223', '#3b522b', '#496536', '#5b7944', '#708d56'].map(hex),
};
export const dye = (buf, to) => {
  if (!to) return buf;
  const o = Buffer.from(buf), from = RAMP.canvas;
  for (let i = 0; i < o.length; i += 4) { if (!o[i + 3]) continue; const k = from.findIndex(c => c[0] === o[i] && c[1] === o[i + 1] && c[2] === o[i + 2]); if (k >= 0) { o[i] = to[k][0]; o[i + 1] = to[k][1]; o[i + 2] = to[k][2]; } }
  return o;
};

/* ---------- which Creator part each item is the picture of (D218, D219) ---------- */
// part: the Creator's folder name; slot: the hand it is held in; item: its picture; metal: the metal it is shown in when one
// picture has to pick (held.mjs, and what the player opens on); kind: how reskin.mjs repaints the part's sheet; thicken: a thin
// blade drawn one pixel thicker in the hand.
export const MATCHED = [
  { part: 'Melee2', slot: 'weapon', name: 'Long sword', item: SWORDS.A, metal: 'steel', kind: 'sword', thicken: true },
  { part: 'Melee5', slot: 'weapon', name: 'Broad sword', item: SWORDS.B, metal: 'bronze', kind: 'sword' },
  { part: 'Melee4', slot: 'weapon', name: 'Cleaver', item: SWORDS.C, metal: 'iron', kind: 'sword' },
  { part: 'Melee10', slot: 'weapon', name: 'Axe', item: HAFTED.axe, metal: 'iron', kind: 'hafted', haft: { thick: 12, frac: .12, socket: 1.5 } },
  { part: 'Melee12', slot: 'weapon', name: 'Mace', item: HAFTED.mace, metal: 'bronze', kind: 'hafted', haft: { thick: 12, socket: 2, darkButt: true } },
  { part: 'Melee24', slot: 'weapon', name: 'Spear', item: HAFTED.spear, metal: 'steel', kind: 'hafted', haft: { frac: .2, socket: 2 } },
  { part: 'Shield1', slot: 'shield', name: 'Round shield', item: SHIELDS.A, metal: 'iron', kind: 'roundWood' },
  { part: 'Shield5', slot: 'shield', name: 'Metal shield', item: SHIELDS.B, metal: 'bronze', kind: 'metalShield' },
  { part: 'Shield7', slot: 'shield', name: 'Plank shield', item: SHIELDS.C, metal: 'iron', kind: 'planks' },
];

/** The kinds of part that come in metals (D133): the metal colours the blade, the head or the whole shield. The others are wood (D220). */
export const IN_METALS = ['sword', 'hafted', 'metalShield'];
/** The metals an item comes in, weakest first (D133). */
export const METALS = ['bronze', 'iron', 'steel'];
/** A repainted sheet of a part that comes in metals is painted in iron's six colours, and whoever draws it swaps them for the
 *  item's metal (D225): the game with a shader, the scripts here. Gives the pixels of `m`'s sheet in `metal`; a wooden part's as they are. */
export const inMetal = (m, rgba, metal = m.metal) => IN_METALS.includes(m.kind) && metal !== 'iron' ? swap(rgba, METAL[metal]) : rgba;

/* ---------- the agreed items, written as sprites ---------- */
// shape: the drawing on the ground (D218). Its colours, one PNG each: metals (D133), each a swap of iron's colours, named
// '<Item> <Metal>'; dyes (cloth takes any dye, D133), each a swap of canvas's colours, named '<Item> <Dye>'; tint, one fixed swap
// (coins), named '<Item>'; none of these: wood, cloth or leather with iron fittings (D220), named '<Item>'.
// pack: 'turn', the pack picture is the same drawing turned up to face the viewer and fitted to a slot, the RuneScape way (icon(),
// packOf()); 'same', the item already stands or sits facing the viewer, so its pack picture is its ground picture; null, never in a
// pack (the sack: what lies on a tile holding several things), so no pack picture.
// A ground sprite is 256 x 256 with the tile's middle at 128,208, like a prop, but seen from one side only; '<Item> Shadow' is its
// ground shadow, shared by its colours. A pack sprite has the same file name in the pack/ folder: 256 x 256, the item's middle at
// 128,128, no shadow. The pack picture is also the one in the loot window and in a shop.
export const ITEMS = {
  'Long Sword': { shape: SWORDS.A, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },
  'Axe': { shape: HAFTED.axe, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },
  'Mace': { shape: HAFTED.mace, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },
  'Spear': { shape: HAFTED.spear, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },
  'Round Shield': { shape: SHIELDS.A, pack: 'same' },
  'Short Bow': { shape: bow({ Lh: .5, s: .14, r: .016 }), pack: 'turn' },                            // Ranged1
  'Arrows': { shape: arrows([[-.03, -.06, -.62, 0], [.04, .02, -.2, 1], [-.05, .08, -.95, 0]]), pack: 'turn' },   // a stack in one slot (D124)
  'Metal Shield': { shape: SHIELDS.B, metals: ['bronze', 'iron', 'steel'], pack: 'same' },          // Shield5
  'Plank Shield': { shape: SHIELDS.C, pack: 'same' },                                               // Shield7
  'Tunic': { shape: TUNIC_FLAT, dyes: ['undyed', 'blue', 'red', 'green'], pack: 'turn' },          // Chest11
  'Leather Tunic': { shape: JERKIN_FLAT, pack: 'turn' },                                            // Chest5
  'Platebody': { shape: PLATE_FLAT, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },            // Chest8
  'Backpack': { shape: BACKPACK, pack: 'same' },                                                    // Bag1 (D122)
  'Bandage': { shape: BANDAGE, pack: 'same' },                                                      // D164
  'Sack': { shape: SACK, pack: null },                                                              // several things on one tile (D2, D3): never in a pack (Michael, 2026-11-17)
  'Coins': { shape: COINS.A, tint: 'coin', pack: 'same' },                                          // D123
  'Longbow': { shape: bow({ Lh: .78, s: .13, r: .019 }), pack: 'turn' },                          // Ranged4
  'Quiver': { shape: QUIVER, pack: 'turn' },                                                        // Bag2
  'Bedroll Pack': { shape: BEDROLL_PACK, pack: 'same' },                                            // Bag6, a backpack with a bedroll (D122)
  'Hood': { shape: HOOD, dyes: ['undyed', 'blue', 'red', 'green'], pack: 'turn' },                  // Head3
  'Helmet': { shape: SKULLCAP, metals: ['bronze', 'iron', 'steel'], pack: 'same' },                 // Head22, the face shows
  'Great Helm': { shape: GREAT_HELM, metals: ['bronze', 'iron', 'steel'], pack: 'same' },           // Head20, covers the face (D40)
  'Trousers': { shape: TROUSERS, dyes: ['undyed', 'blue', 'red', 'green'], pack: 'turn' },          // Legs1
  'Leather Trousers': { shape: LEATHER_TROUSERS, pack: 'turn' },                                    // Legs5
  'Shoes': { shape: SHOES, pack: 'same' },                                                          // Shoes1
  'Metal Boots': { shape: METAL_BOOTS, metals: ['bronze', 'iron', 'steel'], pack: 'same' },         // Shoes5
  'Gloves': { shape: GLOVES, pack: 'turn' },                                                        // Hands1
  'Gauntlets': { shape: GAUNTLETS, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },             // Hands4
};
const cap = w => w[0].toUpperCase() + w.slice(1);
const iron = buf => swap(buf, METAL.iron);   // iron's own colours: also turns the rock greys the kit snaps to into iron (see swap)
/** An item's sprites, one per colour: [{ label (the metal or dye, or null), file (no folder, no '.png'), paint(buffer) }]. */
export const spritesOf = name => {
  const it = ITEMS[name];
  if (it.metals) return it.metals.map(m => ({ label: m, file: `${name} ${cap(m)}`, paint: buf => swap(buf, METAL[m]) }));
  if (it.dyes) return it.dyes.map(d => ({ label: d, file: `${name} ${cap(d)}`, paint: buf => dye(iron(buf), DYE[d]) }));
  return [{ label: null, file: name, paint: it.tint ? buf => swap(buf, METAL[it.tint]) : iron }];
};
/** The box round everything drawn in one or more 256 px pictures: [x, y, width, height]. */
export const box = (...bufs) => { let x0 = SIZE, x1 = -1, y0 = SIZE, y1 = -1; for (const b of bufs) for (let y = 0; y < SIZE; y++)for (let x = 0; x < SIZE; x++) if (b[(y * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
/** The same picture moved so that the middle of what is drawn is at 128,128. */
const centred = buf => {
  const [x, y, w, h] = box(buf), dx = 128 - (x + (w >> 1)), dy = 128 - (y + (h >> 1)), o = Buffer.alloc(buf.length);
  for (let r = 0; r < h; r++) buf.copy(o, ((y + r + dy) * SIZE + x + dx) * 4, ((y + r) * SIZE + x) * 4, ((y + r) * SIZE + x + w) * 4);
  return o;
};
/** The pack picture's longest side at most, in pixels: a long item is drawn smaller to fit a pack slot, as RuneScape does. */
export const PACK_FIT = 46;
/** An item's pack picture (one RGBA 256 px buffer, in the drawing's own colours: paint it like the ground picture), its middle at
 *  128,128. ground: the ground picture when already drawn, for a 'same' item. */
export function packOf(it, ground = null, ss = 3) {
  let buf = ground;
  if (it.pack === 'turn') {
    // a long item turned at full size runs out of the picture, so its first measure is short: shrink until it fits
    let k = 1, r = render(icon(it.shape), 'S', ss);
    for (let i = 0; i < 4; i++) { const [, , w, h] = box(r.out), m = Math.max(w, h); if (m <= PACK_FIT) break; k *= PACK_FIT / m; r = render(icon(sized(it.shape, k)), 'S', ss); }
    buf = r.out;
  } else if (!buf) buf = render(it.shape, 'S', ss).out;
  return centred(buf);
}

const MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;   // held.mjs, reskin.mjs and items_page.mjs import this file: they write no sprite
if (MAIN && !process.argv.includes('--draft')) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
  const first = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all', names = first === 'all' ? Object.keys(ITEMS) : first.split(',');
  for (const n of names) if (!ITEMS[n]) { console.error(`No item named "${n}". There are: ${Object.keys(ITEMS).join(', ')}`); process.exit(1); }
  const out = flag('--out', 'prototype/art/made/items'); let count = 0;
  const inside = (nm, what, b) => { if (b[0] < 1 || b[1] < 1 || b[0] + b[2] > SIZE - 1 || b[1] + b[3] > SIZE - 1) { console.error(`${nm}'s ${what} picture reaches the edge of the ${SIZE} px picture: it is cut off. Nothing written for it.`); process.exit(1); } };
  for (const nm of names) {
    const t0 = Date.now(), it = ITEMS[nm], pic = render(it.shape, 'S', 3), b = box(pic.out), pk = it.pack ? packOf(it, pic.out) : null, pb = pk && box(pk);
    inside(nm, 'ground', box(pic.out, pic.so)); if (pk) inside(nm, 'pack', pb);
    writePng(`${out}/${nm} Shadow.png`, pic.so, SIZE, SIZE); count++;
    for (const s of spritesOf(nm)) { writePng(`${out}/${s.file}.png`, s.paint(pic.out), SIZE, SIZE); count++; if (pk) { writePng(`${out}/pack/${s.file}.png`, s.paint(pk), SIZE, SIZE); count++; } }
    console.log(`${nm}: ${b[2]} x ${b[3]} px, ${pk ? `in the pack ${pb[2]} x ${pb[3]}` : 'never in a pack'}, ${spritesOf(nm).map(s => s.label || 'as drawn').join(', ')}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  console.log(`Wrote ${count} PNGs to ${out} and ${out}/pack`);
  look(out, names, 'prototype/shots/items.png');
}

/* ---------- the picture to look at: the written sprites, read back from their files ---------- */
// Top: at game size on grass, beside the test game's human and the chest, when their art is there. Under it, 3 times the size, a row
// per item: each colour on the ground (in the order of ITEMS: bronze, iron, steel), then each in a pack slot.
function look(out, names, path) {
  const GRASS = [70, 96, 44], SLOT = [62, 53, 41], Z = 3, GAP = 12, PAD = 8, STEP = 130, GY = 126, TOP = 180, X0 = 330;
  const its = names.map(nm => {
    const files = spritesOf(nm).map(s => s.file), so = readPng(`${out}/${nm} Shadow.png`).data;
    const pics = files.map(f => readPng(`${out}/${f}.png`).data), packs = ITEMS[nm].pack ? files.map(f => readPng(`${out}/pack/${f}.png`).data) : [];
    return { nm, so, pics, packs, b: box(so, ...pics), pb: packs.length ? box(...packs) : [0, 0, 0, 0] };
  });
  const rowW = it => it.pics.length * (it.b[2] * Z + 2 * PAD + GAP) + GAP + it.packs.length * (it.pb[2] * Z + 2 * PAD + GAP);
  const W = Math.max(GAP * 2 + X0 + its.length * STEP, GAP + Math.max(...its.map(rowW))), H = GAP + TOP + GAP + its.reduce((s, it) => s + Math.max(it.b[3], it.pb[3]) * Z + 2 * PAD + GAP, 0);
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
  // every sprite, enlarged: on the ground, then in a pack slot
  let y0 = GAP + TOP + GAP;
  for (const it of its) {
    const ch = Math.max(it.b[3], it.pb[3]) * Z + 2 * PAD, cw = it.b[2] * Z + 2 * PAD, pw = it.pb[2] * Z + 2 * PAD; let x0 = GAP;
    it.pics.forEach(pic => { rect(x0, y0, cw, ch, GRASS); const oy = y0 + ((ch - it.b[3] * Z) >> 1); lay(it.so, it.b, x0 + PAD, oy, Z, .3, true); lay(pic, it.b, x0 + PAD, oy, Z, 1, false); x0 += cw + GAP; });
    x0 += GAP;
    it.packs.forEach(pk => { rect(x0, y0, pw, ch, SLOT); lay(pk, it.pb, x0 + PAD, y0 + ((ch - it.pb[3] * Z) >> 1), Z, 1, false); x0 += pw + GAP; });
    y0 += ch + GAP;
  }
  writePng(path, img, W, H); console.log(`Picture: ${path} (top: game size; under it: ${Z} times the size, a row per item, each colour on the ground, then in a pack slot)`);
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
