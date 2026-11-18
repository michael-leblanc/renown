// The slice's other items, drawn like the weapons in items.mjs (D218): lying in the world, one side only, the same picture on the
// ground and in a pack. A first draft for Michael to judge; the ones he keeps move into ITEMS in items.mjs.
//   node scripts/art/gear.mjs [--ss 2] [--out file.png]
//       one picture, prototype/shots/gear-draft.png: every item 3 times the size on grass, and a row at game size beside a human
// Each item follows the Creator part it is the picture of (named in its comment), as items.mjs does.
import { clamp, h3, sdBox, sdCap, hit, WOOD, IRON, CANVAS, LEATHER, RAMP, render, SIZE } from './kit.mjs';
import { SHIELDS, COINS, METAL, swap, ITEMS } from './items.mjs';
import { writePng, readPng } from './png.mjs';
import { existsSync } from 'node:fs';

const GROUND = .8;                                        // as in items.mjs: an item lies at 0.8 of the part's length in a hand
const sized = (s, k = GROUND) => ({ ...s, bound: s.bound.map(v => v * k), boundZ: (s.boundZ || 0) * k, sdf: (x, y, z) => s.sdf(x / k, y / k, z / k) * k });
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

/* ---------- torso pieces, propped up like the shields: a breastplate (Chest8, heavy plate, its chest part; a metal item, bronze to steel, D133)
   and a leather vest (Chest5, patched leather armour) ---------- */
const SA = (() => { const a = [.3, .64, .7], l = Math.hypot(...a); return a.map(v => v / l); })();   // the way the face looks (as the shields in items.mjs)
const E1 = (() => { const a = [SA[2], 0, -SA[0]], l = Math.hypot(...a); return a.map(v => v / l); })();
const E2 = [SA[1] * E1[2] - SA[2] * E1[1], SA[2] * E1[0] - SA[0] * E1[2], SA[0] * E1[1] - SA[1] * E1[0]];
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
      const e = outline(a, b, o);
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

/* ---------- cloth takes any dye (D133): the canvas ramp swapped for a dyed one, as UO's hues do ---------- */
const hexc = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const DYE = {
  undyed: null,
  blue: ['#1d2333', '#26304a', '#313f60', '#3d4f78', '#4d6290', '#6178a6', '#7a90b8'].map(hexc),
  red: ['#2e1414', '#421b1a', '#5a2420', '#722e27', '#8a3a30', '#a14c3c', '#b5634f'].map(hexc),
  green: ['#1c2616', '#25331c', '#2f4223', '#3b522b', '#496536', '#5b7944', '#708d56'].map(hexc),
};
export const dye = (buf, to) => {
  if (!to) return buf;
  const o = Buffer.from(buf), from = RAMP.canvas;
  for (let i = 0; i < o.length; i += 4) { if (!o[i + 3]) continue; const k = from.findIndex(c => c[0] === o[i] && c[1] === o[i + 1] && c[2] === o[i + 2]); if (k >= 0) { o[i] = to[k][0]; o[i + 1] = to[k][1]; o[i + 2] = to[k][2]; } }
  return o;
};

/* ---------- a backpack, set down (Bag1): a canvas body under a leather flap, two straps with buckles ---------- */
const PACK = {
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

// shape: the picture on the ground (D218). pack: 'turn', the pack picture is the same drawing turned to face the viewer, the
// RuneScape way (Michael, 2026-11-17); 'same', the item already stands or sits facing the viewer, so the ground picture is used.
export const GEAR = {
  'Long Sword': { shape: ITEMS['Long Sword'].shape, metals: ITEMS['Long Sword'].metals, pack: 'turn' },
  'Axe': { shape: ITEMS['Axe'].shape, metals: ITEMS['Axe'].metals, pack: 'turn' },
  'Mace': { shape: ITEMS['Mace'].shape, metals: ITEMS['Mace'].metals, pack: 'turn' },
  'Spear': { shape: ITEMS['Spear'].shape, metals: ITEMS['Spear'].metals, pack: 'turn' },
  'Short Bow': { shape: bow({ Lh: .5, s: .14, r: .016 }), pack: 'turn' },
  'Arrows': { shape: arrows([[-.03, -.06, -.62, 0], [.04, .02, -.2, 1], [-.05, .08, -.95, 0]]), pack: 'turn' },
  'Round Shield': { shape: SHIELDS.A, pack: 'same' },
  'Metal Shield': { shape: SHIELDS.B, metals: ['bronze', 'iron', 'steel'], pack: 'same' },
  'Plank Shield': { shape: SHIELDS.C, pack: 'same' },
  'Tunic': { shape: TUNIC_FLAT, dyes: ['undyed', 'blue', 'red', 'green'], pack: 'turn' },
  'Leather Tunic': { shape: JERKIN_FLAT, pack: 'turn' },
  'Platebody': { shape: PLATE_FLAT, metals: ['bronze', 'iron', 'steel'], pack: 'turn' },
  'Backpack': { shape: PACK, pack: 'same' },
  'Bandage': { shape: BANDAGE, pack: 'same' },
  'Sack': { shape: SACK, pack: 'same' },
  'Coins': { shape: COINS.A, metals: ['coin'], pack: 'same' },
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

/** An item's pictures: one per metal (D133) or per dye, else one. label: what the page's button says (none for coins). */
const variants = (g, out) => g.dyes ? g.dyes.map(k => ({ label: k, buf: dye(out, DYE[k]) })) : (g.metals || [null]).map(m => ({ label: m && m !== 'coin' ? m : null, buf: m ? swap(out, METAL[m]) : out }));

const box = (...bufs) => { let x0 = SIZE, x1 = -1, y0 = SIZE, y1 = -1; for (const b of bufs) for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (b[(y * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
/** The pack picture's longest side at most, in pixels: a long item is drawn smaller to fit a pack slot, as RuneScape does. */
export const PACK_FIT = 46;
/** An item's pack picture (one RGBA 256 px buffer, before any metal or dye). */
export function packOf(g, ss = 3) {
  if (g.pack !== 'turn') return render(g.shape, 'S', ss).out;
  let r = render(icon(g.shape), 'S', ss); const b = box(r.out), m = Math.max(b[2], b[3]);
  if (m > PACK_FIT) r = render(icon(sized(g.shape, PACK_FIT / m)), 'S', ss);
  return r.out;
}

/* ---------- the draft picture ---------- */
if (process.argv[1] && process.argv[1].endsWith('gear.mjs') && !process.argv.includes('--html')) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
  const ss = +flag('--ss', 2), path = flag('--out', 'prototype/shots/gear-draft.png'), only = flag('--only', '');
  const names = only ? only.split(',') : Object.keys(GEAR);
  const its = names.map(nm => { const t0 = Date.now(), r = render(GEAR[nm].shape, 'S', ss); const pics = variants(GEAR[nm], r.out).map(v => v.buf); console.log(`${nm}: ${((Date.now() - t0) / 1000).toFixed(1)} s`); return { nm, so: r.so, pics, b: box(r.out, r.so) }; });
  const Z = 3, PAD = 8, GAP = 10, GRASS = [70, 96, 44], STEP = 120, TOP = 190;
  const cell = it => [it.b[2] * Z + 2 * PAD, it.b[3] * Z + 2 * PAD];
  // rows of enlarged items, wrapped at about 1900 px
  const rows = []; let row = [], rw = GAP;
  for (const it of its) { const w = it.pics.length * (cell(it)[0] + 4); if (rw + w > 1900 && row.length) { rows.push(row); row = []; rw = GAP; } row.push(it); rw += w + GAP; }
  rows.push(row);
  const W = Math.max(1900, GAP * 2 + 160 + its.length * STEP), H = GAP + TOP + GAP + rows.reduce((s, r) => s + Math.max(...r.map(it => cell(it)[1])) + GAP + 14, 0);
  const img = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { img[i * 4] = 46; img[i * 4 + 1] = 43; img[i * 4 + 2] = 39; img[i * 4 + 3] = 255; }
  const put = (x, y, c, a) => { if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const o = (y * W + x) * 4; for (let k = 0; k < 3; k++) img[o + k] = Math.round(img[o + k] * (1 - a) + c[k] * a); };
  const rect = (X, Y, w, h, c) => { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) put(x, y, c, 1); };
  const lay = (buf, [bx, by, bw, bh], x0, y0, z, alpha, black) => { for (let y = 0; y < bh * z; y++) for (let x = 0; x < bw * z; x++) { const s = ((by + (y / z | 0)) * SIZE + bx + (x / z | 0)) * 4; if (buf[s + 3]) put(x0 + x, y0 + y, black ? [0, 0, 0] : [buf[s], buf[s + 1], buf[s + 2]], alpha); } };
  // game size, with a human (the Creator's body and test-game clothes, 2.5 times the sheet, facing the viewer) for scale
  rect(GAP, GAP, W - 2 * GAP, TOP, GRASS);
  const GY = GAP + 130, CRE = 'game/client/art/creator/';
  if (existsSync(`${CRE}NakedBody/Idle.png`)) {
    for (const [part, tint] of [['Shadow', null], ['NakedBody', [232, 180, 140]], ['Legs1', [91, 70, 54]], ['Shoes1', [58, 42, 32]], ['Chest1', [63, 111, 181]], ['Head1', [107, 74, 43]]]) {
      if (!existsSync(`${CRE}${part}/Idle.png`)) continue;
      const p = readPng(`${CRE}${part}/Idle.png`);
      for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) { const s = ((2 * 128 + Math.floor(y / 2.5)) * p.width + Math.floor(x / 2.5)) * 4, a = p.data[s + 3] / 255 * (tint ? 1 : .35); if (a) put(GAP + 90 + x - 165, GY + y - 215, tint ? tint.map((t, k) => Math.min(255, p.data[s + k] * t / 185)) : [0, 0, 0], a); }
    }
  }
  its.forEach((it, k) => { const x = GAP + 220 + k * STEP; lay(it.so, [0, 0, SIZE, SIZE], x - 128, GY - 208, 1, .3, true); lay(it.pics[it.pics.length - 1], [0, 0, SIZE, SIZE], x - 128, GY - 208, 1, 1, false); });
  // enlarged
  let y0 = GAP + TOP + GAP;
  for (const r of rows) {
    let x0 = GAP; const rh = Math.max(...r.map(it => cell(it)[1]));
    for (const it of r) { const [cw, ch] = cell(it); it.pics.forEach(pic => { rect(x0, y0 + 14, cw, ch, GRASS); lay(it.so, it.b, x0 + PAD, y0 + 14 + PAD, Z, .3, true); lay(pic, it.b, x0 + PAD, y0 + 14 + PAD, Z, 1, false); x0 += cw + 4; }); x0 += GAP; }
    y0 += rh + GAP + 14;
  }
  writePng(path, img, W, H); console.log(`Picture: ${path} (${W} x ${H})`);
}

/* ---------- a page to look at the items on a phone: one file, the pictures inside it ----------
   node scripts/art/gear.mjs --html [--out prototype/shots/items.html]
   A patch of grass with a human and every item lying on it (tap one to see its name), zoom buttons, then every item big with its
   metals to pick. Holds the green tileset's grass and the Creator's body for the human: bought art, never commit the page. */
if (process.argv[1] && process.argv[1].endsWith('gear.mjs') && process.argv.includes('--html')) {
  const { deflateSync } = await import('node:zlib'), { writeFileSync, mkdirSync } = await import('node:fs'), { dirname } = await import('node:path');
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, path = flag('--out', 'prototype/shots/items.html');
  const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const body = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(body)); return Buffer.concat([l, body, c]); };
  const uri = (rgba, w, h) => { const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6; const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64'); };
  const crop = (buf, [bx, by, bw, bh]) => { const o = Buffer.alloc(bw * bh * 4); for (let y = 0; y < bh; y++) buf.copy(o, y * bw * 4, ((by + y) * SIZE + bx) * 4, ((by + y) * SIZE + bx + bw) * 4); return o; };
  // the items, drawn at full quality; each picture keeps the tile's middle at 128,208 so the page can stand it on a tile
  const items = Object.entries(GEAR).map(([nm, g]) => {
    const r = render(g.shape, 'S', 3), b = box(r.out, r.so), pk = packOf(g), pb = box(pk);
    const metals = variants(g, r.out).map(v => ({ m: v.label, src: uri(crop(v.buf, b), b[2], b[3]) }));
    variants(g, pk).forEach((v, i) => { metals[i].pack = uri(crop(v.buf, pb), pb[2], pb[3]); });
    console.log(`${nm}: ${b[2]} x ${b[3]} px`);
    return { nm, b, shadow: uri(crop(r.so, b), b[2], b[3]), metals };
  });
  // the human, standing, facing the viewer, at the game's size, in a 256 px picture with the feet on the tile's middle
  const CRE = 'game/client/art/creator/', man = Buffer.alloc(SIZE * SIZE * 4);
  const lay = (x, y, c, a) => { if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return; const o = (y * SIZE + x) * 4, A = man[o + 3] / 255, na = a + A * (1 - a); for (let k = 0; k < 3; k++) man[o + k] = Math.round((c[k] * a + man[o + k] * A * (1 - a)) / na); man[o + 3] = Math.round(na * 255); };
  for (const [part, tint] of [['Shadow', null], ['NakedBody', [232, 180, 140]], ['Legs1', [91, 70, 54]], ['Shoes1', [58, 42, 32]], ['Chest1', [63, 111, 181]], ['Head1', [107, 74, 43]]]) {
    if (!existsSync(`${CRE}${part}/Idle.png`)) continue;
    const p = readPng(`${CRE}${part}/Idle.png`);
    for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) { const s = ((2 * 128 + Math.floor(y / 2.5)) * p.width + Math.floor(x / 2.5)) * 4, a = p.data[s + 3] / 255 * (tint ? 1 : .35); if (a) lay(128 + x - 165, 208 + y - 215, tint ? tint.map((t, k) => Math.min(255, p.data[s + k] * t / 185)) : [0, 0, 0], a); }
  }
  const grass = readPng('game/client/art/tiles/Ground A2_S.png');
  const data = { items: items.map(({ nm, b, shadow, metals }) => ({ nm, x: b[0], y: b[1], shadow, metals })), man: uri(man, SIZE, SIZE), grass: uri(grass.data, SIZE, SIZE) };
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renown: items on the ground and in the pack</title>
<style>
body{margin:0;background:#2e2b27;color:#ece8d6;font:15px/1.35 system-ui,sans-serif}
header{padding:10px 12px 4px}h1{font-size:17px;margin:0 0 2px}p{margin:2px 0;color:#b9b3a0;font-size:13px}
.bar{display:flex;gap:6px;align-items:center;padding:6px 12px;position:sticky;top:0;background:#2e2b27;z-index:2}
button{background:#4a453d;color:#ece8d6;border:1px solid #6a6458;border-radius:7px;padding:7px 11px;font-size:14px}
button.on{background:#7c6a3a;border-color:#c4a85a}
#wrap{overflow:auto;-webkit-overflow-scrolling:touch;border-top:1px solid #444;border-bottom:1px solid #444;background:#1c1b19}
canvas{image-rendering:pixelated;display:block}
#tap{min-height:20px;padding:4px 12px;color:#f1d46e}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:12px}
.card{background:#3a362f;border-radius:10px;padding:8px}.card.hl{outline:2px solid #f1d46e}
.card .pics{display:flex;gap:4px}.card .pic{background:#46602c;border-radius:6px;display:flex;align-items:center;justify-content:center;height:130px;flex:1.4;overflow:hidden;position:relative}.card .pk{background:#3e3529;flex:1}
h2{font-size:16px;margin:14px 12px 2px}.sub{padding:0 12px}
#inv{display:grid;grid-template-columns:repeat(4,58px);gap:3px;background:#3e3529;border:2px solid #5c4f3c;border-radius:6px;padding:6px;margin:8px 12px;width:max-content}
#inv div{width:58px;height:52px;display:flex;align-items:center;justify-content:center;background:#463b2e;border-radius:3px}#inv img{image-rendering:pixelated}
.card img{image-rendering:pixelated;position:absolute;max-width:96%;max-height:96%;object-fit:contain}
.card b{display:block;margin:6px 0 4px}.ms{display:flex;gap:4px;flex-wrap:wrap}.ms button{padding:4px 8px;font-size:12px}
</style></head><body>
<header><h1>Items: ground and pack</h1><p>On the ground (laid flat, the UO way) around a human. 2× is the game's own size on a phone; Fit fills the screen. Tap an item to see its name, drag to look around. Then the pack (the RuneScape way), then each item big: on the ground, and in the pack, with its metals or dyes to pick.</p></header>
<div class="bar"><span>Zoom</span><button data-z="0" class="on">Fit</button><button data-z="1">1×</button><button data-z="2">2×</button><button data-z="3">3×</button><button data-z="4">4×</button></div>
<div id="wrap"><canvas id="c"></canvas></div><div id="tap"></div>
<h2>In the pack</h2><p class="sub">The RuneScape way: the same drawing turned to face you, long things drawn smaller to fit a slot.</p><div id="inv"></div>
<h2>Each item</h2>
<div class="grid" id="grid"></div>
<script>
const D=${JSON.stringify(data)};
const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
const N=5,T=[64,32],W=N*128,H=N*64+30,OX=(N-1)*64-64,OY=-150;
const at=(x,y)=>[OX+(x-y)*T[0],OY+(x+y)*T[1]];
// where things stand: the human, then the items in rows
const spots=[[0,0],[1,0],[2,0],[3,0],[4,0],[0,2],[1,2],[3,2],[4,2],[0,4],[1,4],[2,4],[3,4],[4,4],[0,1],[4,1]];
const man=[2,2];let pick=[],zoom=0;
(async()=>{
 const g=await load(D.grass),m=await load(D.man);
 const its=await Promise.all(D.items.map(async it=>({...it,sh:await load(it.shadow),pics:await Promise.all(it.metals.map(x=>load(x.src)))})));
 pick=its.map(it=>it.metals[0].m==='undyed'?0:it.pics.length-1);
 const c=document.getElementById('c'),ctx=c.getContext('2d');c.width=W;c.height=H;
 function draw(){ctx.clearRect(0,0,W,H);
  for(let r=0;r<2*N-1;r++)for(let x=0;x<N;x++){const y=r-x;if(y<0||y>=N)continue;const[px,py]=at(x,y);ctx.drawImage(g,px,py);}
  const things=[{k:'man',t:man}].concat(its.map((it,i)=>({k:i,t:spots[i]}))).sort((a,b)=>(a.t[0]+a.t[1])-(b.t[0]+b.t[1]));
  for(const th of things){const[px,py]=at(...th.t);
   if(th.k==='man'){ctx.drawImage(m,px,py);continue;}
   const it=its[th.k];ctx.globalAlpha=.3;ctx.drawImage(it.sh,px+it.x,py+it.y);ctx.globalAlpha=1;ctx.drawImage(it.pics[pick[th.k]],px+it.x,py+it.y);}
  const z=zoom||Math.min(4,2*document.getElementById('wrap').clientWidth/W);c.style.width=(W*z/2)+'px';c.style.height=(H*z/2)+'px';}
 // shown at zoom/2 CSS px a picture px (phones have about 2 screen px a CSS px), so 2x is the game's own size on a phone
 document.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{zoom=+b.dataset.z;document.querySelectorAll('[data-z]').forEach(o=>o.classList.toggle('on',o===b));draw();});
 c.onclick=e=>{const r=c.getBoundingClientRect(),px=(e.clientX-r.left)*W/r.width,py=(e.clientY-r.top)*H/r.height;
  let best=-1,bd=1e9;its.forEach((it,i)=>{const[sx,sy]=at(...spots[i]);const d=Math.hypot(px-sx-128,(py-sy-200)*1.6);if(d<bd){bd=d;best=i;}});
  if(bd<90){document.getElementById('tap').textContent=its[best].nm+(its[best].metals[pick[best]].m?' ('+its[best].metals[pick[best]].m+')':'');
   document.querySelectorAll('.card').forEach((cd,i)=>cd.classList.toggle('hl',i===best));}else document.getElementById('tap').textContent='';};
 const grid=document.getElementById('grid'),inv=document.getElementById('inv');
 its.forEach((it,i)=>{const cd=document.createElement('div');cd.className='card';
  const w=it.pics[0].width,h=it.pics[0].height,k=Math.max(1,Math.floor(Math.min(100/w,110/h)));
  cd.innerHTML='<div class="pics"><div class="pic"></div><div class="pic pk"></div></div><b>'+(i+1)+'. '+it.nm+'</b><div class="ms"></div>';
  const pic=cd.querySelector('.pic'),pk=new Image(),pkb=cd.querySelector('.pk');pk.style.position='absolute';pkb.append(pk);const slot=document.createElement('div'),sl=new Image();slot.append(sl);inv.append(slot);slot.onclick=()=>{document.getElementById('tap').textContent=it.nm;cd.scrollIntoView({behavior:'smooth',block:'center'});};const sh=it.sh.cloneNode();sh.style.cssText='opacity:.3;filter:brightness(0);width:'+w*k+'px';const im=new Image();im.style.width=w*k+'px';pic.append(sh,im);
  const set=j=>{pick[i]=j;im.src=it.metals[j].src;pk.src=sl.src=it.metals[j].pack;pk.onload=()=>{const k=Math.max(1,Math.floor(Math.min(70/pk.naturalWidth,110/pk.naturalHeight)));pk.style.width=pk.naturalWidth*k+'px';};cd.querySelectorAll('.ms button').forEach((b,q)=>b.classList.toggle('on',q===j));draw();};
  if(it.metals.length>1)it.metals.forEach((mm,j)=>{const b=document.createElement('button');b.textContent=mm.m;b.onclick=()=>set(j);cd.querySelector('.ms').append(b);});
  grid.append(cd);set(pick[i]);});
 draw();const wrap=document.getElementById('wrap');wrap.scrollLeft=(wrap.scrollWidth-wrap.clientWidth)/2;
})();
</script></body></html>`;
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, page); console.log(`Page: ${path} (${(page.length / 1024).toFixed(0)} KB)`);
}
