// The slice's other items, drawn like the weapons in items.mjs (D218): lying in the world, one side only, the same picture on the
// ground and in a pack. A first draft for Michael to judge; the ones he keeps move into ITEMS in items.mjs.
//   node scripts/art/gear.mjs [--ss 2] [--out file.png]
//       one picture, prototype/shots/gear-draft.png: every item 3 times the size on grass, and a row at game size beside a human
// Each item follows the Creator part it is the picture of (named in its comment), as items.mjs does.
import { clamp, h3, sdBox, sdCap, hit, WOOD, IRON, CANVAS, LEATHER, render, SIZE } from './kit.mjs';
import { SHIELDS, COINS, METAL, swap } from './items.mjs';
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

/* ---------- a tunic, folded (Chest11, long-sleeve tunic; cloth, any dye, D133) ---------- */
const TUNIC = {
  H: .1, bound: [.22, .06, .2],
  sdf(x, y, z) {
    let d = sdBox(x, y - .02, z, .2, .02, .17, .012); set(CANVAS, .5, 1);                           // the folded body
    const up = sdBox(x, y - .045, z + .01, .13, .012, .15, .01); if (up < d) { d = up; set(CANVAS, .75, 1); }   // the sleeves folded in over it
    if (Math.abs(Math.abs(x) - .13) < .005 && y > .03) hit.grv = 0;                                 // the folds
    if (y > .05 && Math.hypot(x, z + .17) < .06 && Math.hypot(x, z + .17) > .045) hit.grv = 0;      // the collar
    if (y > .05 && Math.abs(x) < .004 && z < -.06 && z > -.13) hit.grv = 0;                         // the opening at the neck
    return d;
  },
};

/* ---------- torso pieces, propped up like the shields: a breastplate (Chest8, heavy plate, its chest part; a metal item, bronze to steel, D133)
   and a leather vest (Chest5, patched leather armour) ---------- */
const SA = (() => { const a = [.3, .64, .7], l = Math.hypot(...a); return a.map(v => v / l); })();   // the way the face looks (as the shields in items.mjs)
const E1 = (() => { const a = [SA[2], 0, -SA[0]], l = Math.hypot(...a); return a.map(v => v / l); })();
const E2 = [SA[1] * E1[2] - SA[2] * E1[1], SA[2] * E1[0] - SA[0] * E1[2], SA[0] * E1[1] - SA[1] * E1[0]];
/** A torso piece propped up: metal (a breastplate) or leather (a vest, open down the front and laced). */
function upright(leather) {
  return sized({
    H: .6, bound: [.34, .3, .34],
    sdf(x, y, z) {
      const py = y - .2 * Math.abs(E2[1]) - .02, h = x * SA[0] + py * SA[1] + z * SA[2], a = x * E1[0] + py * E1[1] + z * E1[2], b = x * E2[0] + py * E2[1] + z * E2[2];
      const aa = Math.abs(a);
      let e = Math.max(aa - .16 - .025 * clamp((-b) / .2, 0, 1), Math.abs(b) - .2);                  // wider at the waist
      e = Math.max(e, .08 - Math.hypot(aa - .19, b - .2));                                           // armholes
      e = Math.max(e, (leather ? .1 : .085) - Math.hypot(a, (b - .23) * 1.1));                       // the neck
      const lift = (leather ? .03 : .055) * Math.max(0, 1 - (a / .2) ** 2) + (leather ? 0 : .014 * Math.max(0, 1 - aa / .03));   // rounded over the chest; a ridge down a breastplate
      let d = Math.max(e, Math.abs(h - lift) - (leather ? .011 : .013)) * .75;
      if (leather) {
        const k = Math.floor(a / .07 + 9) * 7 + Math.floor(b / .09 + 9), pv = h3(k, 4, 9);
        set(LEATHER, pv < .25 ? .1 : pv > .78 ? .9 : .5, 1);                                         // patches
        if (e > -.016 && ((a * 45 + b * 45) % 1 + 1) % 1 < .5) hit.grv = 0;                           // stitching round the edge
        if (aa < .007 && b < .13) hit.grv = 0;                                                        // the opening down the front
        for (let j = 0; j < 4; j++) { const lb = .08 - j * .07, q = (Math.hypot(Math.max(aa - .028, 0), b - lb - .01 * Math.sign(a), h - lift - .012) - .006) * .75; if (q < d) { d = q; set(LEATHER, .1, 1); } }   // laces
      } else {
        set(IRON, .5, 1);
        if (e > -.016) hit.grv = 0;                                                                   // a dark rolled rim
        for (const [ra, rb] of [[-.12, .08], [.12, .08], [-.13, -.15], [.13, -.15]]) { const q = (Math.hypot(a - ra, b - rb, h - lift - .012) - .013) * .75; if (q < d) { d = q; set(IRON, .5, 1); } }   // rivets
      }
      return d;
    },
  });
}
const PLATE = upright(false), VEST_UP = upright(true);

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

export const GEAR = {
  'Short Bow': { shape: bow({ Lh: .5, s: .14, r: .016 }) },
  'Arrows': { shape: arrows([[-.03, -.06, -.62, 0], [.04, .02, -.2, 1], [-.05, .08, -.95, 0]]) },
  'Bandage': { shape: BANDAGE },
  'Sack': { shape: SACK },
  'Cloth Tunic': { shape: TUNIC },
  'Leather Vest': { shape: VEST_UP },
  'Breastplate': { shape: PLATE, metals: ['bronze', 'iron', 'steel'] },
  'Backpack': { shape: PACK },
  'Metal Shield': { shape: SHIELDS.B, metals: ['bronze', 'iron', 'steel'] },
  'Plank Shield': { shape: SHIELDS.C },
  'Coins': { shape: COINS.A, metals: ['coin'] },
};

/* ---------- the draft picture ---------- */
const box = (...bufs) => { let x0 = SIZE, x1 = -1, y0 = SIZE, y1 = -1; for (const b of bufs) for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (b[(y * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
if (process.argv[1] && process.argv[1].endsWith('gear.mjs')) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
  const ss = +flag('--ss', 2), path = flag('--out', 'prototype/shots/gear-draft.png'), only = flag('--only', '');
  const names = only ? only.split(',') : Object.keys(GEAR);
  const its = names.map(nm => { const t0 = Date.now(), r = render(GEAR[nm].shape, 'S', ss); const pics = (GEAR[nm].metals || [null]).map(m => m ? swap(r.out, METAL[m]) : r.out); console.log(`${nm}: ${((Date.now() - t0) / 1000).toFixed(1)} s`); return { nm, so: r.so, pics, b: box(r.out, r.so) }; });
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
