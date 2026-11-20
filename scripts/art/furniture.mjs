// Code-made furniture for the insides of shops and homes, written with the kit (scripts/art/kit.mjs). The tileset has benches, a
// workbench, a cabinet and market stalls, but no bed, stool, table, shop counter or shelf (project doc claude/tileset-props.md), and
// inside a building you see the room you are in (D208); what is inside belongs to whoever lives or works there (D35).
//   Table A1    a plank table, about a tile across
//   Stool A1    a three-legged stool
//   Bed A1      a wooden bed with a straw mattress, a hide for a blanket and a pillow, about a tile and a half long
//   Counter A1  a shop counter: a planked front, a thick top
//   Shelf A1    a tall shelf against a wall, with goods on it (rolls of cloth, small boxes, sacks)
// Same space as props.mjs: x across, y up, z toward the viewer, one tile 1 x 1, a Creator character about 1.4 tall.
//   node scripts/art/furniture.mjs                     all of them, 4 sides each, into prototype/art/made/
//   node scripts/art/furniture.mjs "Bed A1" --draft    one picture to look at, prototype/shots/art-draft.png; no sprite written
import { clamp, h3, sdBox, chBox, sdCap, hit, WOOD, IRON, CANVAS, LEATHER, gaps, run } from './kit.mjs';
import { pathToFileURL } from 'node:url';

const tone = hv => hv < .3 ? .1 : hv > .7 ? .9 : .5;                 // a board a tone darker or paler now and then
/** Boards along `along` with gaps every `pitch`: sets hit for wood and returns how much to push the surface in at a gap. */
function boards(along, pitch, salt) {
  const [fj, k] = gaps(along, pitch); hit.mat = WOOD; hit.var = tone(h3(k, salt, 7)); hit.grv = fj < .07 ? 0 : 1;
  return .005 * clamp(1 - fj / .08, 0, 1);
}

/* ---------- table: a top of boards on four square legs, with a low stretcher ---------- */
const TW = .38, TD = .26, TH = .5;
export const table = {
  H: TH, bound: [TW + .06, TH / 2 + .04, TD + .06],
  sdf(x, y, z) {
    let d = chBox(x, y - (TH - .025), z, TW, .025, TD, .008); d += boards(z, .105, 1);           // the top, boards running across
    const ax = Math.abs(x), az = Math.abs(z);
    const leg = chBox(ax - (TW - .06), y - (TH - .05) / 2, az - (TD - .05), .025, (TH - .05) / 2, .025, .006);
    if (leg < d) { d = leg; hit.mat = WOOD; hit.var = .1; hit.grv = 1; }
    const str = chBox(x, y - .12, az - (TD - .05), TW - .06, .018, .012, .004);                   // a stretcher along each long side
    if (str < d) { d = str; hit.mat = WOOD; hit.var = .5; hit.grv = 1; }
    const apron = chBox(x, y - (TH - .075), z, TW - .05, .025, TD - .05, .004);                   // the rail under the top
    if (apron < d) { d = apron; hit.mat = WOOD; hit.var = .1; hit.grv = 1; }
    return d;
  },
};

/* ---------- stool: a round seat on three splayed legs ---------- */
const SR = .14, SH = .34;
const stool = {
  H: SH, bound: [SR + .06, SH / 2 + .03, SR + .06],
  sdf(x, y, z) {
    const r = Math.hypot(x, z);
    let d = Math.max(r - SR, Math.abs(y - (SH - .022)) - .022) * .9; hit.mat = WOOD; hit.grv = 1; hit.var = .5;
    if (y > SH - .006) { const [fj, k] = gaps(x, .09); hit.var = tone(h3(k, 3, 7)); if (fj < .06 && r < SR - .01) hit.grv = 0; }   // the seat is two or three boards
    else if (Math.abs(r - SR) < .006) hit.var = .1;
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094 + .5, c = Math.cos(a), s = Math.sin(a);
      const q = sdCap(x, y, z, c * SR * .55, SH - .04, s * SR * .55, c * SR * 1.1, 0, s * SR * 1.1, .02, .017);
      if (q < d) { d = q; hit.mat = WOOD; hit.var = .1; hit.grv = 1; }
    }
    return d;
  },
};

/* ---------- bed: a wooden frame, a straw mattress, a blanket over the foot end, a pillow at the head ---------- */
const BL = .76, BW = .34, RAIL = .26;            // half length (along x), half width, the height of the side rails
const bed = {
  H: .6, bound: [BL + .05, .33, BW + .05],
  sdf(x, y, z) {
    const ax = Math.abs(x), az = Math.abs(z);
    // the frame: two side rails, a low footboard, a taller headboard, a post at each corner
    let d = chBox(x, y - RAIL / 2 - .04, az - (BW - .025), BL - .03, RAIL / 2 - .04, .025, .006); d += boards(y, .07, 2); hit.var = .5;
    let q = chBox(x - (BL - .025), y - .2, z, .025, .2, BW - .02, .006); if (q < d) { d = q; boards(z, .1, 3); }                  // footboard
    q = chBox(x + (BL - .025), y - .28, z, .025, .28, BW - .02, .006); if (q < d) { d = q; boards(z, .1, 4); }                    // headboard
    q = chBox(ax - (BL - .02), y - .3, az - (BW - .02), .032, .3 - (x > 0 ? .07 : 0) + (x < 0 ? .04 : 0), .032, .006);              // corner posts
    if (q < d) { d = q; hit.mat = WOOD; hit.var = .1; hit.grv = 1; }
    // the mattress: straw ticking, sitting in the frame and bulging a little
    const mt = chBox(x, y - .27, z, BL - .07, .06, BW - .05, .03) - .01 * (1 - (x / BL) ** 2) * (1 - (z / BW) ** 2);
    if (mt < d) { d = mt; hit.mat = CANVAS; hit.var = .9; hit.grv = 1; if (Math.abs(y - .25) < .006 && (ax > BL - .1 || az > BW - .07)) hit.grv = 0; }
    // a hide thrown over the foot two thirds as a blanket, its edge turned back toward the head, hanging a little over the sides
    // (leather: an undyed wool one would be the mattress's own colour; Claude's call)
    const bk = chBox(x - .15, y - .3, z, BL - .2, .045, BW - .03, .02) - .006 * Math.sin(z * 40 + x * 6);
    if (bk < d && x > -.42) { d = bk; hit.mat = LEATHER; hit.var = x < -.36 ? .9 : .5; hit.grv = Math.abs(x + .36) < .01 ? 0 : 1; }
    // the pillow at the head
    q = (Math.hypot((x + BL - .2) / .11, (y - .36) / .045, z / (BW - .08)) - 1) * .04; if (q < d) { d = q; hit.mat = CANVAS; hit.var = .9; hit.grv = 1; }
    return d;
  },
};

/* ---------- shop counter: a planked front panel, ends, and a thick overhanging top ---------- */
const KW = .48, KD = .2, KH = .6;
const counter = {
  H: KH, bound: [KW + .06, KH / 2 + .04, KD + .06],
  sdf(x, y, z) {
    let d = chBox(x, y - (KH - .04) / 2, z, KW, (KH - .04) / 2, KD, .006); d += boards(x, .095, 5);   // upright boards all round
    const base = chBox(x, y - .025, z, KW + .012, .025, KD + .012, .006); if (base < d) { d = base; hit.mat = WOOD; hit.var = .1; hit.grv = 1; }   // a plinth
    const top = chBox(x, y - (KH - .03), z, KW + .04, .03, KD + .04, .01); if (top < d) { d = top; boards(z, .12, 6); if (Math.abs(y - (KH - .06)) < .006) hit.grv = 0; }
    // two iron straps down the front
    const strap = Math.max(chBox(x, y - (KH - .04) / 2, z, KW + .006, (KH - .06) / 2, KD + .006, .004), Math.abs(Math.abs(x) - .3) - .018);
    if (strap < d) { d = strap; hit.mat = IRON; hit.var = .5; hit.grv = 1; }
    return d;
  },
};

/* ---------- shelf: two posts, four shelves and a back of boards, goods on the shelves ---------- */
const HW = .44, HD = .13, HH = 1.3, LEVELS = [.04, .38, .7, 1.02], HZ = -.08;   // the shelf stands toward the back of its tile, against a wall
function goods(x, y, z, d) {
  // per shelf: [x, kind, size], kind 0 a roll of cloth lying along the shelf, 1 a small box, 2 a sack, 3 an iron pot
  const ON = [[[-.25, 1, .07], [-.05, 2, .08], [.2, 1, .06]], [[-.2, 0, .1], [.15, 3, .06], [.3, 3, .05]], [[-.28, 2, .07], [0, 0, .12], [.27, 1, .05]], [[-.15, 3, .05], [.15, 1, .07]]];
  ON.forEach((row, L) => {
    const y0 = LEVELS[L] + .03;
    for (const [gx, kind, s] of row) {
      let q, m = WOOD, v = .9, g = 1;
      if (kind === 0) { q = Math.max(Math.hypot(y - y0 - .045, z - HZ) - .045, Math.abs(x - gx) - s); m = CANVAS; v = h3(L, gx * 100 | 0, 5) < .5 ? .1 : .9; if (Math.abs(x - gx) > s - .006) { v = .5; g = Math.abs(((Math.hypot(y - y0 - .045, z - HZ) * 80) % 1) - .5) < .2 ? 0 : 1; } }
      else if (kind === 1) { q = chBox(x - gx, y - y0 - s * .7, z - HZ, s, s * .7, .08, .004); m = WOOD; v = .9; g = Math.abs(y - y0 - s * .7) < .004 ? 0 : 1; }
      else if (kind === 2) { const r = Math.hypot(x - gx, z - HZ); q = Math.max((Math.hypot(r / s, (y - y0 - s * .9) / (s * 1.1)) - 1) * s * .8, y0 - y); m = CANVAS; v = .5; }
      else { const r = Math.hypot(x - gx, z - HZ); q = Math.max(r - s * (1 + .3 * Math.sin(clamp((y - y0) / (s * 1.6), 0, 1) * 3.14)), y0 - y, y - y0 - s * 1.6); m = IRON; v = .5; if (y > y0 + s * 1.6 - .006 && r < s * .7) { v = -1; g = 0; } }
      if (q < d) { d = q; hit.mat = m; hit.var = v; hit.grv = g; }
    }
  });
  return d;
}
const shelf = {
  H: HH, bound: [HW + .06, HH / 2 + .04, .25], boundZ: HZ,
  sdf(x, y, z) {
    const lz = z - HZ, ax = Math.abs(x);
    let d = chBox(ax - (HW - .025), y - HH / 2, lz, .025, HH / 2, HD, .006); hit.mat = WOOD; hit.var = .1; hit.grv = 1;   // the two sides
    let q = chBox(x, y - (HH - .1) / 2, lz + HD - .012, HW - .02, (HH - .1) / 2, .012, .004); if (q < d) { d = q; boards(x, .11, 8); }   // the back
    for (const L of [...LEVELS, HH - .02]) { q = chBox(x, y - L, lz, HW - .02, .018, HD - .01, .004); if (q < d) { d = q; hit.mat = WOOD; hit.var = .5; hit.grv = 1; } }
    return goods(x, y, z, d);
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run({
  'Table A1': { shadow: 'Table Shadow A1', ...table },
  'Stool A1': { shadow: 'Stool Shadow A1', ...stool },
  'Bed A1': { shadow: 'Bed Shadow A1', ...bed },
  'Counter A1': { shadow: 'Counter Shadow A1', ...counter },
  'Shelf A1': { shadow: 'Shelf Shadow A1', ...shelf },
});
