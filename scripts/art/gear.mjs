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
if (process.argv[1] && process.argv[1].endsWith('gear.mjs') && !process.argv.includes('--html')) {
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
    const r = render(g.shape, 'S', 3), b = box(r.out, r.so);
    const metals = (g.metals || [null]).map(m => ({ m: m && m !== 'coin' ? m : null, src: uri(crop(m ? swap(r.out, METAL[m]) : r.out, b), b[2], b[3]) }));
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
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renown: slice items</title>
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
.card .pic{background:#46602c;border-radius:6px;display:flex;align-items:center;justify-content:center;height:150px;overflow:hidden;position:relative}
.card img{image-rendering:pixelated;position:absolute}
.card b{display:block;margin:6px 0 4px}.ms{display:flex;gap:4px;flex-wrap:wrap}.ms button{padding:4px 8px;font-size:12px}
</style></head><body>
<header><h1>Slice items, first draft</h1><p>On the ground around a human. 2× is the game's own size on a phone; Fit fills the screen. Tap an item to see its name, drag to look around. Under it: each item big, with its metals to pick.</p></header>
<div class="bar"><span>Zoom</span><button data-z="0" class="on">Fit</button><button data-z="1">1×</button><button data-z="2">2×</button><button data-z="3">3×</button><button data-z="4">4×</button></div>
<div id="wrap"><canvas id="c"></canvas></div><div id="tap"></div>
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
 pick=its.map(it=>it.pics.length-1);
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
 const grid=document.getElementById('grid');
 its.forEach((it,i)=>{const cd=document.createElement('div');cd.className='card';
  const w=it.pics[0].width,h=it.pics[0].height,k=Math.max(1,Math.floor(Math.min(140/w,140/h)));
  cd.innerHTML='<div class="pic"></div><b>'+(i+1)+'. '+it.nm+'</b><div class="ms"></div>';
  const pic=cd.querySelector('.pic'),sh=it.sh.cloneNode();sh.style.cssText='opacity:.3;filter:brightness(0);width:'+w*k+'px';const im=new Image();im.style.width=w*k+'px';pic.append(sh,im);
  const set=j=>{pick[i]=j;im.src=it.metals[j].src;cd.querySelectorAll('.ms button').forEach((b,q)=>b.classList.toggle('on',q===j));draw();};
  if(it.metals.length>1)it.metals.forEach((mm,j)=>{const b=document.createElement('button');b.textContent=mm.m;b.onclick=()=>set(j);cd.querySelector('.ms').append(b);});
  grid.append(cd);set(pick[i]);});
 draw();const wrap=document.getElementById('wrap');wrap.scrollLeft=(wrap.scrollWidth-wrap.clientWidth)/2;
})();
</script></body></html>`;
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, page); console.log(`Page: ${path} (${(page.length / 1024).toFixed(0)} KB)`);
}
