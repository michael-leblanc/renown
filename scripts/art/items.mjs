// Draft: items drawn the way the props are (the tileset's camera, light and colours), lying in the world.
// The same picture is the item on the ground and the item in a pack, as in Ultima Online and Tibia.
// One drawing per item; a material is a swap of the metal's colours (as UO's hues and RuneScape's recolours do).
// Three designs of each item, to compare:
//   node scripts/art/items.mjs --draft      one picture, prototype/shots/items-draft.png; nothing else written
import { clamp, h3, sdBox, sdCap, hit, WOOD, IRON, RAMP, render, SIZE } from './kit.mjs';
import { writePng } from './png.mjs';

/* ---------- swords: lying flat, point away from the viewer and to the right ---------- */
// o: L blade length; w(t) half width along the blade, t from 0 at the guard to 1 at the point; off(t) how far the blade's middle
// is pushed to one side (a curved or one-edged blade); guard [half length, half thickness]; grip length; pommel radius; groove;
// S how many times bigger the whole sword is drawn, so it is as long on the ground as the Creator's part is in a hand.
function sword(o) {
  return {
    H: .1, bound: [.24 * o.S, .07 * o.S, .52 * o.S], boundZ: -.1 * o.S,
    sdf(x, y, z) { return this.one(x / o.S, y / o.S, z / o.S) * o.S; },
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

/* ---------- shields: propped up, leaning back ---------- */
const SA = (() => { const a = [.3, .64, .7], l = Math.hypot(...a); return a.map(v => v / l); })();   // the way the face looks
const E1 = (() => { const a = [SA[2], 0, -SA[0]], l = Math.hypot(...a); return a.map(v => v / l); })();   // across the face
const E2 = [SA[1] * E1[2] - SA[2] * E1[1], SA[2] * E1[0] - SA[0] * E1[2], SA[0] * E1[1] - SA[1] * E1[0]];   // up the face
// outline(a, b): how far inside the shield's edge (negative inside); low: how far its lowest point is below the middle
function shield(o) {
  const cy = o.low * Math.abs(E2[1]) + .012;
  return {
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
  };
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
  { part: 'Shield1', slot: 'shield', name: 'Round shield', item: SHIELDS.A, metal: 'iron', kind: 'roundWood' },
  { part: 'Shield5', slot: 'shield', name: 'Metal shield', item: SHIELDS.B, metal: 'bronze', kind: 'metalShield' },
  { part: 'Shield7', slot: 'shield', name: 'Plank shield', item: SHIELDS.C, metal: 'iron', kind: 'planks' },
];

/* ---------- the draft: a row per item, a column per design. On the ground 4 times the size; under it, in pack slots twice the size ---------- */
const GLYPH = { A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,11110,10001,10001,10001,11110', C: '01111,10000,10000,10000,10000,10000,01111' };
if (process.argv.includes('--draft')) {
  const ROWS = [['Sword', SWORDS, 'steel', ['bronze', 'iron', 'steel']], ['Shield', SHIELDS, 'steel', ['bronze', 'iron', 'steel']], ['Coins', COINS, 'coin', ['coin']]];
  const Z = 4, CELL = 360, GH = 60 * Z, SL = 116, RH = GH + 8 + SL + 20, W = 12 + 3 * (CELL + 12), H = 12 + ROWS.length * RH, sheet = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { sheet[i * 4] = 46; sheet[i * 4 + 1] = 43; sheet[i * 4 + 2] = 39; sheet[i * 4 + 3] = 255; }
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++)for (let x = x0; x < x0 + w; x++) { const o = (y * W + x) * 4; sheet[o] = c[0]; sheet[o + 1] = c[1]; sheet[o + 2] = c[2]; } };
  const box = b => { let x0 = SIZE, x1 = 0, y0 = SIZE, y1 = 0; for (let y = 0; y < SIZE; y++)for (let x = 0; x < SIZE; x++) if (b[(y * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
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
