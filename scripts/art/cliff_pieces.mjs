// Oldscar's cliff (D107, claude/oldscar-cliff.md) cut into straight pieces that join with no seam.
// The rock is tall columns standing side by side, each cut by a few big flat planes (a prow of two or three faces, a slanted or pointed top,
// a corner or two knocked off), leaning back a little and narrowing upward, so deep cracks open between them toward the top.
// Shorter pillars stand in front of the face here and there, and two rows of crags stand behind it on top, so the top line is jagged.
// (The first look, layers of stacked blocks, read as a ruined wall: Michael, 2026-11-16.)
// A piece is P tiles long along x; the cliff's foot is at z = 0 and the town is on +z.
//  - Where two pieces meet there is a joint: per row of columns, a few columns covering at least JOINT each side of the line,
//    the same in every piece (seeded by row only), and plain: about the usual height, about the usual line.
//    Everything that decides a pixel (shade, the shadow's soft edge, the view ray's last steps) reaches less than JOINT.
//    Each variant fills only the space between its two joints with its own columns, so any variant can sit beside any other.
//  - A hard shadow reaches further than JOINT: the sun is on +x, so a column throws its shadow toward -x, past its piece's left joint line.
//    So the joint steps forward a little on its +x side (it shades its own -x side, whatever comes after), and a variant's columns start plain
//    at its left joint and may stand out or rise only as fast as the sun's angle allows (LEFT_Z, LEFT_H); the bold shapes are in a variant's middle.
//  - Noise (fluting, turf patches, streaks) is read in the joint's own frame near a joint and in the variant's frame inside,
//    blended between, so the edges of every variant look the same.
//  - The two ends (L, R): the cliff comes down to the ground away from its one joint (L's joint is on its right, R's on its left).
//    Full height up to U0 from the joint, so the joint and what it decides are those of a straight piece; past it every column is shorter
//    than the one before, down to stumps, over a turf slope; scree at the foot.
//  - The scar (D107): a piece two pieces long, written "S T", with one long leaning crack cut through it from the rim to the ground, too narrow to enter,
//    with fallen stones at its foot. Proved in cliff_seams.mjs.
//  - The bend (Michael, 2026-11-17: a rounded bend, "let's try #1"): a piece two pieces long, written "U V", where the cliff turns 90 degrees toward the camera,
//    round the back of Oldscar like a room's back corner. The row is built straight (unrolled) and then bent: from the bend's right joint on, x is the world's x;
//    the bend is straight for BM tiles inside each of its joints (so a joint is the same rigid rock beside a bend as beside a straight piece) and a quarter circle
//    of radius BR at the foot between; the pieces before it run toward the camera with their face to +x. They are drawn mirrored (a, b, c are A, B, C turned over,
//    the joints too, and an L stays an L): there the sun comes from their left, and mirrored, the joint rules written for a sun on the right hold again.
// build(arr) gives the shape for a row of pieces: arr[k] is the kind of piece k (A, B, C, L, R, S, T, or null for none), which spans x = k*P to (k+1)*P.
// An L comes first in a run and an R last; a straight piece always has pieces on both sides.
import { hit, ROCK, GRASS, h3, fbm3, vn3, rng, sstep, clamp, chBox, sdCap, nx } from './cliffkit.mjs';

// CLIFF_TALL=1 (a draft, Michael 2026-11-17: "more deep ... it goes and goes (y axis up)", "as a one piece", "kind of like a mountain", his first reference's cut):
// the face TALL times as tall, its top line less even, and shelves: flat-topped rock standing against the face at many heights, a lower layer in front, sand on their tops. Off by default.
const TALL = process.env.CLIFF_TALL === '1' ? 2.4 : 1;
export const P = 8, TOP = 7 * TALL, PEAK = TOP + (TALL > 1 ? 2.3 : .9), VARIANTS = ['A', 'B', 'C'], ENDS = ['L', 'R'], KINDS = [...VARIANTS, ...ENDS];
export const SCAR = ['S', 'T'], BEND = ['U', 'V'], BM = 3, BR = (2 * 8 - 2 * BM) / (Math.PI / 2);   // BEND: the rounded bend, two pieces long; straight for BM inside each joint, a quarter circle of radius BR (about 6.4 tiles at the foot) between             // the piece with the scar (D107) is two pieces long and is written as its two halves, "S T": joints at its two ends, none between the halves
const JOINT = 1.3, BLEND = .7;                // noise is the joint's within JOINT of a joint line, the variant's past JOINT + BLEND
const MT = TOP - (TALL > 1 ? 3.6 : 1.2);                         // the land behind the columns: turf, seen between the crags
const ZB = -.35, ZM = -1.5, LEAN = .1, RIM = -3.1;        // the face's usual line at the ground; the mass behind it; how far the face leans back per unit up
const RAD = Math.PI / 180;
// the rows of columns: the face, the pillars in front of it, two rows of crags on top
const FACE = 0, PILLAR = 1, CRAG1 = 2, CRAG2 = 3;
const ROWS = [{ zf: ZB, D: TALL > 1 ? 4.5 : 1.6 }, { zf: .3, D: 1.6 }, { zf: -2.45, D: 1.75 }, { zf: -3.95, D: 1.45 }];
// tall: the land behind does not stop flat at the rim. It climbs from the columns' tops into a rough slope and on to a ridge (RISE more, uneven along the cliff), so the top is a mountain's shoulder, not a carved slab
const RISE = 7, landAt = (x, z, n = fbm3(x * .15, 2.3, z * .15) + .5 * fbm3(x * .41 + 7, 1.1, z * .3)) => MT + (TOP + .6 - MT) * sstep(-1.2, -3.6, z) + RISE * sstep(-3.6, -10, z) * (.7 + .8 * n);
export const BACK = TALL > 1 ? 10 : 5.5, HIGH = TALL > 1 ? TOP + 1.6 : PEAK;   // how far back the mass reaches, and how high anything stands (the canvas)
// how far forward and how high a variant's column may be, by how far its left edge is from the variant's left joint line (the sun: 0.45 forward and 1.45 up per unit along x)
const LEFT_Z = s => ZB + .2 + .45 * (s - JOINT), LEFT_H = s => TOP + .1 + .8 * (s - JOINT);

/** One column: planes [nx, ny, nz, c] in its own frame (x from its middle, z from its front line, which leans back with height).
 *  Every random number is drawn whatever H is, so an end can make the same column shorter. */
function column(seed, g) {
  const r = rng(seed), a = g.w / 2 + .07, D = ROWS[g.row].D, H = g.H, pl = [], top = [];
  const add = (az, sl, px, py, pz, isTop = 0) => { const c = Math.sqrt(1 - sl * sl), n0 = Math.sin(az) * c, n2 = Math.cos(az) * c; pl.push(n0, sl, n2, n0 * px + sl * py + n2 * pz); top.push(isTop); };
  const crag = g.row >= CRAG1, lean = () => { const tg = (.012 + .03 * r()) * (crag ? .4 : 1); return tg / Math.sqrt(1 + tg * tg); };
  add((-90 + 24 * (r() - .5)) * RAD, lean(), -a, 0, -.4);                    // the two walls: they lean in, so a crack opens toward the top
  add((90 + 24 * (r() - .5)) * RAD, lean(), a, 0, -.4);
  add(Math.PI, 0, 0, 0, -D);                                                 // the back, inside the rock
  // the front: a prow of two big faces meeting at an edge, the left one turned from the sun and the right one to it; sometimes a third across the nose
  const e = a * (r() - .5) * .9, fl = -Math.min((8 + 30 * r()) * RAD, Math.atan(.5 / (a + e))), fr = Math.min((22 + 40 * r()) * RAD, Math.atan(.6 / (a - e)));
  add(fl, .08 * r(), e, 0, 0); add(fr, .1 * r(), e, 0, 0);
  { const az = (-4 + 18 * r()) * RAD, sl = .06 * r(), cut = .06 + .2 * r(); if (r() < .45) add(az, sl, e, 0, -cut); }
  // the top: two or three slanted planes through one point (a point or a ridge); half the columns are cut flat a little under it
  const pointed = r() < (g.row === PILLAR ? .9 : crag ? .75 : .55) && !g.shelf, nt = 2 + (r() < .6 ? 1 : 0), th = r() * 6.2832, px = a * (r() - .5) * .8, pz = -Math.min(D, 1.75) * (.15 + .45 * r());   // through a point near the front, whatever the depth
  for (let k = 0; k < 3; k++) { const az = th + k * 6.2832 / nt + (r() - .5), ny = g.shelf ? .86 + .12 * r() : crag ? .7 + .24 * r() : (g.w > 1.4 ? .6 : .5) + .34 * r(); if (k < nt) add(az, ny, px, H, pz, ny > .72 ? 1 : 0); }
  { const drop = .12 + .4 * r(); pl.push(0, 1, 0, pointed ? H : H - drop); top.push(1); }
  // corners knocked off the upper front: big slanted faces, turned up to the sun
  for (let k = 0; k < 2; k++) { const az = (-25 + 85 * r()) * RAD, sl = .42 + .33 * r(), hx = e + a * (r() - .5), hc = TALL > 1 ? H - 7 * (.5 - .38 * r()) : H * (.5 + .38 * r()); /* tall: as far under the top as on the 7-unit cliff */ if (r() < (k ? .3 : .6)) add(az, sl, hx, hc, 0); }
  // an undercut foot now and then: the rock above overhangs
  { const az = (-10 + 50 * r()) * RAD, sl = -(.25 + .25 * r()), hu = Math.min(.4 + .9 * r(), .45 * H); if (r() < (g.row === PILLAR ? .3 : .14) && g.w < 1.2 && !g.shelf) add(az, sl, e, hu, 0); }   // narrow columns only: under a wide one it reads as a cave mouth
  const fv = top.map((_, i) => { const o = h3(seed, i, 8); return o < .13 ? .9 : o < .27 ? .1 : .25 + .5 * h3(seed, i, 7); });   // each face its own tone; the odd one paler or darker
  return { row: g.row, cx: g.cx, a, H, zf: g.zf, lean: crag ? 0 : g.shelf ? .02 : LEAN + .06 * (r() - .5), lx: .04 * (r() - .5), pl: Float64Array.from(pl), top, fv, turf: g.shelf ? -.45 : crag ? -.2 : .05 };
}
// cells along x from x0 to at least x1 (or fitted exactly between x0 and x1), widths from w()
function cells(x0, x1, w, fit) {
  const ws = []; let s = 0; while (s < x1 - x0 - (fit ? .5 : 0)) { const v = w(); ws.push(v); s += v; }
  if (!ws.length) ws.push(x1 - x0), s = x1 - x0;
  const k = fit ? (x1 - x0) / s : 1, out = []; let x = x0; for (const v of ws) { out.push([x, v * k]); x += v * k; } return out;
}
// the joint: per row, columns from jl (left of -JOINT) to jr (right of +JOINT), starting at a random place so the rows' edges don't line up
const JROWS = [FACE, CRAG1, CRAG2].map(row => {
  const r = rng(5003 + row * 31), jl = -JOINT - (row ? .8 : .6) * r(), cs = cells(jl, JOINT, () => row ? 1.3 + .9 * r() : 1 + .7 * r()), cols = [];
  cs.forEach(([x, w], i) => {
    const cx = x + w / 2, fwd = sstep(-.4, .9, cx);                          // the +x side of the joint stands a little forward and higher
    const g = row ? { row, cx, w, zf: ROWS[row].zf + .2 * (r() - .5), H: TALL > 1 ? landAt(cx, ROWS[row].zf - .8) + .2 + .5 * r() : MT + .35 + .5 * r() } : { row, cx, w, zf: ZB + .22 * fwd + .12 * (r() - .5), H: TOP - .5 + .5 * (r() - .5) + .15 * fwd };
    if (!(TALL > 1 && row)) cols.push(column(9001 + row * 977 + i * 53, g));
  });
  return { row, jl, jr: cs.at(-1)[0] + cs.at(-1)[1], cols };
});
// the end, by u (how far from its joint): full height to U0 (past what the joint decides: JOINT + the soft shadow's reach); nothing stands past U1
const U0 = 2.7, U1 = 7.1, UM0 = U0 - .9, UM1 = U1 - 1.4;
const fallTo = (a, b, u) => { const t = clamp((u - a) / (b - a), 0, 1); return 1 - .65 * t - .35 * t * t * (3 - 2 * t); };   // a slope, eased a little at both ends
const gC = u => fallTo(U0, U1, u), gM = u => fallTo(UM0, UM1, u);     // how much of its height a column keeps on an end; the same for the land behind, which sinks sooner so it stays under the columns
// a variant: columns between its left joint (at 0) and its right joint (at P), per row; bold in the middle, plain toward the joints
// an end is built as an R (joint at 0, rock out to P) and mirrored for an L
function variantCols(vi) {
  const out = [], end = vi === 3, bend = vi === 5, LEN = vi >= 4 ? 2 * P : P, put = (seed, g) => { if (end) { g.H *= gC(g.cx) ** (g.row === PILLAR ? 1.4 : 1); g.w *= clamp(.45 + .13 * g.H, .45, 1); } if (TALL > 1 && vi === 4 && g.row === PILLAR && nearScar(g)) return; if (g.H > .4) out.push(column(seed, g)); };   // on an end the low columns are also narrower: stumps, not slabs
  for (const J of JROWS) {
    const row = J.row, r = rng(1009 + vi * 7919 + row * 131), left = bend ? -J.jl : J.jr, right = end ? P - .35 : LEN + J.jl;   // the bend's left joint is mirrored
    const squeeze = bend ? BR / (BR - ROWS[row].zf) : 1;   // in the bend, rows further back are stretched round the curve by (R - z) / R: drawn that much narrower, they come out as wide as anywhere
    cells(left, right, () => (row ? 1.2 + 1.5 * r() : .65 + 1.5 * r() ** 1.8) * (end ? .75 : 1) * squeeze, true).forEach(([x, w], i) => {
      const cx = x + w / 2, win = sstep(left - .2, left + 1.5, cx) * (end ? 1 : sstep(right + .2, right - 1.3, cx));
      const spur = r() < .22 ? .35 : 0, zr = r(), hr = r(), hj = r();
      const lz = bend ? Infinity : LEFT_Z(x), lh = bend ? Infinity : LEFT_H(x);   // the bend is lit from the left at one joint and from the right at the other, and neither neighbour's pixels look toward it for their shadows
      const zf = row ? ROWS[row].zf + .8 * (zr - .5) : Math.min(ZB + win * (1.1 * (zr - .5) + spur), lz);
      const H = Math.min(row ? (TALL > 1 ? landAt(cx, ROWS[row].zf - .8) + .1 + .25 * hj + win * 1.6 * hr ** 1.6 : Math.min(MT + .3 + .25 * hj + win * 2.1 * hr ** 1.6, PEAK - .1)) : clamp(TOP - .35 + win * 1.7 * TALL * (hr - .5) + .3 * (hj - .5), TALL > 1 ? TOP - 2.5 : MT + .6, TALL > 1 ? TOP + 2 : PEAK - .15), TALL > 1 && row ? Infinity : lh);
      if (!(TALL > 1 && row)) put(20011 + vi * 6007 + row * 977 + i * 53, { row, cx, w, zf, H });   // tall: no crags on the slope (they read as blocks)
    });
  }
  // pillars standing in front of the face, shorter than it
  { const r = rng(3001 + vi * 613), left = (bend ? -JROWS[0].jl : JROWS[0].jr) + .8, right = end ? U1 - 1.5 : LEN + JROWS[0].jl - .6, n = (2 + (r() < .7 ? 1 : 0) + (r() < .4 ? 1 : 0) + (r() < .2 ? 1 : 0)) * (LEN / P);
    for (let i = 0; i < 10; i++) { const cx = left + (right - left) * r(), w = .7 + 1.9 * r() ** 2, zf = Math.min(ZB + .25 + .6 * r(), bend ? Infinity : LEFT_Z(cx - w / 2) + .1), H = 1.2 + 4.3 * r(); if (i < n + (TALL > 1 ? 3 : 0)) put(40009 + vi * 811 + i * 59, TALL > 1 ? { row: PILLAR, cx, w: w * 1.3 + 1.6, zf: zf + .35, H: 2.5 + (TOP - 5) * ((H - 1.2) / 4.3) ** 1.3, shelf: true } : { row: PILLAR, cx, w, zf, H }); }
    if (TALL > 1) { const r = rng(3301 + vi * 613); for (let i = 0; i < 4 * LEN / P; i++) { const w = 1 + 2 * r(), cx = left + (right - left) * r(), zf = Math.min(ZB + 1 + .5 * r(), bend ? Infinity : LEFT_Z(cx - w / 2) + .1), H = 1.3 + 4.5 * r() ** 1.4; put(41009 + vi * 811 + i * 59, { row: PILLAR, cx, w, zf, H, shelf: true }); } }   // a lower layer of shelves in front
  }
  return out;
}
// stones at the foot and grass tufts along it: a few shared ones at the joint, the rest each variant's own
function footStones(r, x0, x1, n) { const out = []; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * r(), dz = 1.2 * r() ** 2; out.push({ x, z: .25 + dz, s: (.06 + .2 * r() ** 2) * (1.3 - .6 * dz) }); } return out; }
function footTufts(r, x0, x1, n) { return Array.from({ length: n }, () => { const x = x0 + (x1 - x0) * r(), z = .35 + 1.2 * r(), sd = Math.floor(r() * 1e6), bl = []; for (let j = 0; j < 5; j++) { const a = h3(sd, j, 1) * 6.283, rr = .02 + .03 * h3(sd, j, 2), hg = .08 + .11 * h3(sd, j, 3), ln = .04 + .06 * h3(sd, j, 4); bl.push([x + Math.cos(a) * rr, z + Math.sin(a) * rr, x + Math.cos(a) * (rr + ln), hg, z + Math.sin(a) * (rr + ln)]); } return { x, z, bl }; }); }
const J_STONES = footStones(rng(77), -1.1, 1.1, 5), J_TUFTS = footTufts(rng(78), -1.1, 1.1, 7);
// scree: loose stones at the end's foot, and a few more in front
function scree(r, n) { const out = []; for (let i = 0; i < n; i++) { const u = U1 - 2.2 + 2.6 * r() ** .8, z = -5 + 6.4 * r(), s = .08 + .26 * r() ** 2; out.push({ x: Math.min(u, P - .45), z, s }); } return out; }
const V = VARIANTS.map((_, vi) => ({ cols: variantCols(vi), stones: footStones(rng(300 + vi), 1.5, P - 1.5, 30), tufts: footTufts(rng(400 + vi), 1.5, P - 1.5, 40), off: 101.7 + 97.3 * vi }));
// the scar: one long crack cut through a piece two pieces long, from the rim down to the ground. Nobody can go in (Michael, 2026-11-17): it is under a tile wide,
// so it has to read by being dark, jagged and unbroken: its inside is shaded by depth alone, brown at the lip and darker the deeper in, whatever the sun does, short cracks branch off it,
// The orcs' pyre (D104) that once stood at its foot was taken out (Michael, 2026-11-17: "it looks weird you can remove it"), with the soot round the foot.
// It leans 40 degrees with its top toward +x, which on screen is a slash running up to the right at about 45 degrees.
// Everything it cuts lies between the piece's two joints, so the joints are untouched.
const SC = { foot: 6.3, tan: Math.tan(40 * RAD), back: -2.4 };
const tri = t => Math.abs(((t % 1) + 1) % 1 - .5) * 4 - 1;                    // a zigzag, -1 to 1
const scarMid = y => SC.foot + SC.tan * y + .3 * tri(y / 2.3 + .3) + .14 * tri(y / .9 + .1) + .05 * tri(y / .41);
const scarHalf = y => Math.max(.2, Math.min(.24 + .13 * y, .47 - .022 * y) + .06 * tri(y / 1.5 + .6));   // half its width: half a tile across at the ground (nobody fits), 0.85 at two units up, 0.6 at the rim
const BRANCH = [[1.9, 12, 1.5, .1], [3.6, -14, 1.3, .09], [5.2, 8, 1.2, .08], [2.8, 78, 1.0, .07]];   // short cracks off it: from what height, how many degrees off straight up (toward +x), how long, half as wide
/** How far the point is inside the scar's empty space (negative inside), xl along the piece from its left joint line. */
function scarSdf(xl, y, z) {
  const yy = Math.max(y, 0), off = xl - scarMid(yy), hw = scarHalf(yy);
  // its right-hand lip is cut back at 45 degrees toward the front, edge-on to the camera: a column standing forward on that side would hide the crack, which is seen from the right
  const lip = Math.max(0, z - (ZB - LEAN * yy - .55)) * sstep(.4, 2.2, yy);   // not at the ground, where it would open the foot into a doorway
  let d = Math.max(Math.max(-off - hw, off - hw - lip) * .38, (SC.back + .1 * yy - .25 * Math.max(0, yy - 4)) - z);   // deeper toward the rim, so it notches the top
  for (const [y0, deg, len, hw] of BRANCH) {
    const t = yy - y0; if (t < -.3 || t > len + .3) continue;
    const q = Math.max((Math.abs(xl - scarMid(y0) - Math.tan(deg * RAD) * t) - hw * (1 - .7 * t / len)) * (deg > 45 ? .2 : .6), -t, t - len, -1.1 - .1 * yy - z);
    if (q < d) d = q;
  }
  return d;
}
// The scar on the tall cliff (CLIFF_TALL): a cleft with walls, not a dark line (Michael, 2026-11-17, on the 7-unit scar stretched: "not good enough, it's low quality").
// One bold slash, like the 7-unit scar (which Michael accepted) at the cliff's size: it leans about 28 degrees (9 tiles along over the height), is half a tile across at the ground (nobody fits),
// a tile and a half across higher up and wider where it notches the rim; it narrows as it goes into the rock, so its wall turns to the camera, and that wall steps in and out.
// Shaded by depth alone, as accepted (kit var 5 to 6): brown at the lip, darker the deeper, each step of the wall a little paler or darker. Tried and dropped: walls lit by the sun (the slash broke into bits).
const TS = { foot: 2.9, tan: 9 / (7 * TALL), deep: 3.4 }, tsv = { depth: 0, tone: 0 };
const tsMid = y => TS.foot + TS.tan * y + .45 * tri(y / 5.3 + .3) + .2 * tri(y / 2.1 + .1);
const tsHalf = y => Math.max(.22, Math.min(.24 + .14 * y, .8 - .015 * y) + .25 * sstep(TOP - 3.5, TOP, y) + .08 * tri(y / 3.1 + .6));
const TS_BRANCH = [[5, 14, 3.2, .17], [8.6, -16, 3, .15], [11.6, 10, 2.6, .14], [3.2, 70, 1.8, .12], [13.4, -62, 2, .12]];   // side cracks: from what height, degrees off straight up (toward +x), how long, half as wide
function tallScar(xl, y, z) {
  const yy = Math.max(y, 0), sd = (ZB - LEAN * yy + .25) - z;                       // sd: how far behind the face's usual line
  const ph = sd / .85 + yy * .21, jog = .09 * tri(ph) * sstep(.1, .6, sd);          // the walls step in and out as they go in
  const off = xl - tsMid(yy) - jog, hw = tsHalf(yy) * (1 - .8 * clamp(sd / TS.deep, 0, 1));
  const lip = Math.max(0, .8 - sd) * sstep(.8, 4, yy);                             // the right lip cut back toward the front, as on the 7-unit scar
  let d = Math.max(Math.max(-off - hw, off - hw - lip) * .38, sd - TS.deep), dep = sd;
  for (const [y0, deg, len, bw] of TS_BRANCH) {
    const t = yy - y0; if (t < -.3 || t > len + .3) continue;
    const q = Math.max((Math.abs(xl - tsMid(y0) - Math.tan(deg * RAD) * t) - bw * (1 - .7 * t / len)) * (Math.abs(deg) > 45 ? .2 : .6), -t, t - len, sd - 1.3);
    if (q < d) { d = q; dep = sd * 2; }
  }
  tsv.depth = Math.max(0, dep); tsv.tone = .2 * (h3(Math.floor(ph * 2 + .5), Math.floor(yy / 2.3), 7) - .5);   // each step of the wall a little paler or darker
  return d;
}
const nearScar = g => { for (let y = 0; y <= g.H; y += .5) if (Math.abs(g.cx - tsMid(y)) < g.w / 2 + tsHalf(y) + .7) return true; return false; };   // nothing stands in front of the cleft
{ const r = rng(911); V.push({ cols: variantCols(3), stones: [...footStones(rng(310), 1.5, U1 - 1.5, 18), ...scree(r, 26)], tufts: footTufts(rng(410), 1.5, U1 - .8, 30), off: 503.9 }); }   // the end, as an R
{ const clear = o => (TALL > 1 ? tallScar(o.x, 0, o.z) : scarSdf(o.x, 0, o.z)) > .15;         // nothing in the crack's mouth
  V.push({ cols: variantCols(4), stones: footStones(rng(320), 1.5, 2 * P - 1.5, 60).filter(clear), tufts: footTufts(rng(420), 1.5, 2 * P - 1.5, 80).filter(clear), off: 707.3 });   // the scar piece, both halves
  const r = rng(431); for (let i = 0; i < 6; i++) V[4].stones.push({ x: (TALL > 1 ? TS.foot : SC.foot) - .25 + .55 * r(), z: -.75 + 1.1 * r(), s: .16 + .12 * r() });   // fallen stones choke the crack's foot
  if (TALL > 1) { const r = rng(433); for (let i = 0; i < 16; i++) { const z = -.2 + 2 * r() ** 1.4; V[4].stones.push({ x: TS.foot + (r() - .45) * (1 + 1.1 * z), z, s: .07 + .27 * r() ** 2.4 * (1.2 - .3 * z) }); } }   // and a fan of them spilled out in front
}
V.push({ cols: variantCols(5), stones: footStones(rng(330), 2.2, 2 * P - 1.5, 50), tufts: footTufts(rng(430), 2.2, 2 * P - 1.5, 70), off: 911.1 });   // the bend, both halves

/** The shape for a row of pieces. arr: variant letters, piece k at x = k*P. Returns the prop object for cliffkit's trace() and the noise rule for setNoiseX(). */
export function build(arr) {
  const n = arr.length, kind = k => (k >= 0 && k < n ? arr[k] : null), isV = k => VARIANTS.includes(kind(k)) || SCAR.includes(kind(k)) || BEND.includes(kind(k));
  const bendAt = arr.indexOf('U'), mir = k => bendAt >= 0 && k < bendAt, mirJ = m => bendAt >= 0 && m <= bendAt;   // before the bend: pieces and joints mirrored
  if (bendAt >= 0 && (arr[bendAt + 1] !== 'V' || arr.slice(0, bendAt).some(a => a && !VARIANTS.includes(a) && a !== 'L'))) throw new Error('a bend is "U V", with only A, B, C and an L before it');
  // where piece k's own things go: a straight piece as built; an end as built for an R (x' = x - kP) or mirrored for an L (x' = (k+1)P - x); a straight piece before a bend, mirrored too
  const place = (k, x) => kind(k) === 'L' || mir(k) ? (k + 1) * P - x : k * P + x;
  const mirC = (c, cx) => ({ ...c, cx, lx: -c.lx, pl: c.pl.map((v, i) => i % 4 ? v : -v) });
  const cols = [], stones = [], tufts = [], movT = (t, f) => ({ x: f(t.x), z: t.z, bl: t.bl.map(b => [f(b[0]), b[1], f(b[2]), b[3], b[4]]) });
  // joint lines: both sides of a straight piece, the inner side of an end
  const jointAt = m => (isV(m - 1) || isV(m) || (kind(m - 1) === 'L' && kind(m) === 'R')) && !(kind(m - 1) === 'S' && kind(m) === 'T') && !(kind(m - 1) === 'U' && kind(m) === 'V');
  for (let m = 0; m <= n; m++) if (jointAt(m)) {
    const sg = mirJ(m) ? -1 : 1, f = x => m * P + sg * x;
    for (const J of JROWS) for (const c of J.cols) cols.push(sg < 0 ? mirC(c, f(c.cx)) : { ...c, cx: f(c.cx) }); for (const s of J_STONES) stones.push({ ...s, x: f(s.x) }); for (const t of J_TUFTS) tufts.push(movT(t, f));
  }
  arr.forEach((a, k) => {
    if (!a || a === 'T' || a === 'V') return; const Vv = V[a === 'L' || a === 'R' ? 3 : a === 'S' ? 4 : a === 'U' ? 5 : VARIANTS.indexOf(a)], f = x => place(k, x);   // the scar's and the bend's columns all hang on their left half
    for (const c of Vv.cols) cols.push(a === 'L' || mir(k) ? mirC(c, f(c.cx)) : { ...c, cx: f(c.cx) });
    for (const s of Vv.stones) stones.push({ ...s, x: f(s.x) }); for (const t of Vv.tufts) tufts.push(movT(t, f));
  });
  // u: how far into an end from its joint (-1 elsewhere)
  const endU = (k, x) => kind(k) === 'R' ? x - k * P : kind(k) === 'L' ? (k + 1) * P - x : -1;
  const uAt = x => { const k = Math.floor(x / P); return kind(k) ? endU(k, x) : kind(k - 1) === 'R' ? endU(k - 1, x) : kind(k + 1) === 'L' ? endU(k + 1, x) : -1; };   // past an end's outer edge, u runs on
  const B0 = -3, NB = n * P + 6, bin = () => Array.from({ length: NB }, () => []), bc = bin(), bs = bin(), bt = bin();
  const put = (bins, list, lo, hi) => list.forEach((o, i) => { for (let q = Math.floor(lo(o) - B0); q <= Math.floor(hi(o) - B0); q++) if (bins[q]) bins[q].push(i); });
  const M = 1;                                // each bin lists what lies within M of it, so a distance up to M is true; the shape never says more (a ray would step over a stone)
  put(bc, cols, c => c.cx - c.a - .3 - M, c => c.cx + c.a + .3 + M); put(bs, stones, s => s.x - s.s - M, s => s.x + s.s + M); put(bt, tufts, t => t.x - .2 - M, t => t.x + .2 + M);
  const first = arr.findIndex(a => a), last = n - 1 - [...arr].reverse().findIndex(a => a), X0 = first * P - (isV(first) ? 2 : 0), X1 = (last + 1) * P + (isV(last) ? 2 : 0);   // a straight piece at a run's end runs on 2 past it, as before; an end stops at its own edge
  const noiseX = x => {                       // [[x', w]]: the joint's frame near a joint line, the piece's variant frame inside
    const k = Math.min(n - 1, Math.max(0, Math.floor(x / P))), a = kind(k), m = Math.round(x / P), t = (x - m * P) * (mirJ(m) ? -1 : 1), e = jointAt(m) ? 1 - sstep(JOINT, JOINT + BLEND, Math.abs(t)) : 0;
    const xv = !a ? x : a === 'L' || a === 'R' ? (a === 'L' ? (k + 1) * P - x : x - k * P) + V[3].off : a === 'S' ? x - k * P + V[4].off : a === 'T' ? x - (k - 1) * P + V[4].off
      : a === 'U' ? x - k * P + V[5].off : a === 'V' ? x - (k - 1) * P + V[5].off : mir(k) ? (k + 1) * P - x + V[VARIANTS.indexOf(a)].off : x - k * P + V[VARIANTS.indexOf(a)].off;
    return e >= 1 ? [[t, 1]] : e <= 0 ? [[xv, 1]] : [[t, e], [xv, 1 - e]];
  };
  // tall (Michael 2026-11-17, a photo of a desert escarpment: "It looks like two different object (the top and the side)"): one mass of one rock.
  // The face is a single surface leaning back a little, pushed in and out by noise at several sizes (bulges, a vertical grain, knobs, grit, faint benches);
  // the top is a flat, rough plateau; the two meet in a rounded, broken edge (a smooth max), and the row's two ends round over the same way.
  const smax = (a, b, k) => { const h = clamp(.5 - .5 * (b - a) / k, 0, 1); return a * h + b * (1 - h) + k * h * (1 - h); };
  function tallMass(x, y, z) {
    const yy = Math.max(y, 0);
    const bay = 1.8 * fbm3(x * .14, .3, 1.1), rib = .85 * (.35 - Math.abs(fbm3(x * .42 + .3 * fbm3(x * .2, yy * .12, 4), yy * .035, 2.2)) * 2);   // ribs and gullies: sharp creases where the noise crosses zero, their sides turned to and from the sun                                                   // bays and buttresses along the cliff's line, the same all the way up
    const lump = .9 * fbm3(x * .19, yy * .1, z * .19 + 3) + .55 * fbm3(x * .55 + 9, yy * .05, z * .4), knob = .05 * fbm3(x * .8, yy * .8, z * .8);   // bulges, a vertical grain, a little knobbliness
    const face = z - (ZB - 1.1 - .1 * yy + .55 * bay + .4 * rib + .5 * lump + knob);   // behind the columns' fronts: the columns make the face, the mass shows between them and above
    const top = y - (TOP + .45 * fbm3(x * .2, 5.1, z * .2) + .12 * fbm3(x * 1.3, 2.2, z * 1.3) + .04 * fbm3(x * 5, 3, z * 5));
    const ends = Math.max(X0 + 1.2 - x, x - (X1 - 1.2)) - (.9 * fbm3(z * .17 + 5, yy * .1, x * .17) + .55 * fbm3(z * .55 + 2, yy * .05, x * .4) + knob);
    return { d: smax(smax(smax(face, top, 1.6), ends, 1.6), -(BACK - .2) - z, .3) * .55, top: top > face - .2 && top > -.6 };
  }
  const scarX = k => kind(k) === 'S' ? k * P : kind(k) === 'T' ? (k - 1) * P : null;   // where the scar piece starts, for a point in either half
  function sdfRow(x, y, z) {
    const q0 = Math.floor(x - B0), u = uAt(x);
    if (TALL > 1) {
      const m = tallMass(x, y, z); hit.mat = ROCK; hit.grv = 1;
      // the columns of the accepted look, in front of the mass and fused into it (a smooth min): faceted faces below, a jagged rim melting into the plateau above
      const ro = nx(X => .016 * fbm3(X * 7, y * .4, z * 7) + .03 * fbm3(X * 1.2 + 3, y * .6, z * 1.2), x); let qc = 9, kc = -1, kf = 0;
      for (const i of bc[q0] || []) {
        const c = cols[i]; if (y > c.H + 1) continue; const lx = x - c.cx - c.lx * y; if (lx > c.a + 1 || lx < -c.a - 1) continue;
        const lz = z - c.zf + c.lean * y, pl = c.pl; let q = -9, f = 0;
        for (let j = 0; j < pl.length; j += 4) { const v = pl[j] * lx + pl[j + 1] * y + pl[j + 2] * lz - pl[j + 3]; if (v > q) { q = v; f = j >> 2; } }
        q = q * .985 + ro; if (q < qc) { qc = q; kc = i; kf = f; }
      }
      const K = .45, h = clamp(.5 + .5 * (qc - m.d) / K, 0, 1); let d = qc * (1 - h) + m.d * h - K * h * (1 - h);
      if (kc >= 0 && qc < m.d + .15) { const c = cols[kc]; hit.var = c.fv[kf]; if (c.top[kf] && fbm3(x * 2.5, y, z * 2.5) > c.turf + .15) hit.var = 2; }
      else hit.var = m.top ? 2 : .5;   // the plateau: rock with sand lying on it; the mass's face: rock, the odd paler or darker patch
      const sx = scarX(Math.floor(x / P));                                  // the scar: a cleft cut out of the columns and the mass (tallScar)
      if (sx !== null) { const dv = -(tallScar(x - sx, y, z) + ro); if (dv > d) { const inside = -d; d = dv; hit.var = 5 + clamp(Math.min(tsv.depth, inside * 8) / 2.2 + tsv.tone, 0, .999); } }
      for (const i of bs[q0] || []) { const st = stones[i], lx = x - st.x, lz = z - st.z; if (lx * lx + lz * lz > (st.s + .2) ** 2) continue; const q = chBox(lx, y - st.s * .6, lz, st.s, st.s * .7, st.s * .8, st.s * .35); if (q < d) { d = q; hit.var = st.s * 37 % 1; } }
      return Math.min(d, M * .9);
    }
    // the land behind the columns; on an end it sinks into the ground as a turf slope
    let mt = MT, ks = 1; if (u > UM0) { const g = gM(u); mt = MT * g - 1.2 * (1 - g) + (1 - g) * .3 * fbm3(u * .7, 1.3, z * .7); ks = .33; }
    mt += .14 * nx(X => fbm3(X * .9, 4.4, z * .9), x);
    if (TALL > 1) { const la = landAt(x, z, nx(X => fbm3(X * .15, 2.3, z * .15) + .5 * fbm3(X * .41 + 7, 1.1, z * .3), x)); mt = u > UM0 ? la * gM(u) - 1.2 * (1 - gM(u)) : la; }
    const dTop = TALL > 1 ? (y - mt) * .45 * ks : Math.max(y - mt, .643 * (y - mt) + .766 * (z - RIM)) * ks, dFront = TALL > 1 ? (z - (ZM - LEAN * y - Math.max(0, y - (TOP - 4)) + sstep(TOP - 5, TOP - 2, y) * nx(X => 1.1 * (Math.abs(fbm3(X * .55, y * .07, 3.3)) * 2 - .45) + .4 * fbm3(X * 1.7, y * .2, 1.9), x))) * .5 : (z - (ZM - LEAN * y)) * .99;   // tall: above the columns the mass lays back at about 45 degrees, a shoulder climbing to the ridge   // flat, then a bank down toward the rim: the land's front edge stays under the column tops
    let d = Math.max(dTop, dFront, TALL > 1 ? -(BACK - .2) - z : -5.3 - z, X0 - x, x - X1), kc = -1, kf = 0; const onTop = dTop >= dFront;
    const ro = nx(X => .016 * fbm3(X * 7, y * .4, z * 7) + .03 * fbm3(X * 1.2 + 3, y * .6, z * 1.2), x);   // flutes running up the faces, and planes that aren't quite flat
    for (const i of bc[q0] || []) {
      const c = cols[i]; if (y > c.H + 1) continue;
      const lx = x - c.cx - c.lx * y; if (lx > c.a + 1 || lx < -c.a - 1) continue;
      const lz = z - c.zf + c.lean * y, pl = c.pl; let q = -9, f = 0;
      for (let j = 0; j < pl.length; j += 4) { const v = pl[j] * lx + pl[j + 1] * y + pl[j + 2] * lz - pl[j + 3]; if (v > q) { q = v; f = j >> 2; } }
      q = q * .985 + ro; if (q < d) { d = q; kc = i; kf = f; }
    }
    const sx = scarX(Math.floor(x / P)), xl = sx === null ? 0 : x - sx; let inside = 0;
    if (sx !== null) { const dv = -(scarSdf(xl, y, z) + ro); if (dv > d) { inside = -d; d = dv; kc = -2; } }   // the scar: cut out of everything above; inside = how far in from the rock's own face
    hit.mat = ROCK; hit.grv = 1;
    if (kc === -2) {                                                                            // the scar's inside: a gradient, darker the deeper into the rock, whatever the sun does (Michael: "the shadow is darker the more deep")
      const deepIn = (ZB - LEAN * Math.max(y, 0) + .25) - z;                                         // how far behind the face's usual line
      hit.var = 5 + clamp(Math.min(deepIn, inside * 8) / .85, 0, .999);   // darkest by 0.85 in: from the camera's side only about that much of the wall shows
    }
    else if (kc >= 0) {
      const c = cols[kc]; hit.var = c.fv[kf];
      if (d < .03) {
        if (c.top[kf] && nx(X => fbm3(X * 2.5, y, z * 2.5), x) > c.turf) hit.var = 2;                 // turf on the flatter tops, in patches
        else if (y < .5 && y < .08 + .5 * nx(X => fbm3(X * 1.4, 2.2, z * 1.4), x)) hit.var = 2;       // grass creeping up the foot
      }
    } else hit.var = TALL > 1 ? (onTop && nx(X => fbm3(X * .7 + 3, y * .3, z * .7), x) > -.05 ? 2 : .45) : onTop ? 2 : -1.15;   // tall: the slope is rock with sand lying on it                                                 // a ledge's front, seen between columns, is rock                                                              // the land on top is turf; its front, seen down a crack, is in the dark
    for (const i of bs[q0] || []) {
      const st = stones[i], lx = x - st.x, lz = z - st.z; if (lx * lx + lz * lz > (st.s + .2) ** 2) continue;
      const q = chBox(lx, y - st.s * .6, lz, st.s, st.s * .7, st.s * .8, st.s * .35) + nx(X => .02 * fbm3(X * 9, y * 9, z * 9), x);
      if (q < d) { d = q; hit.mat = ROCK; hit.var = st.v ?? st.s * 37 % 1; }
    }
    if (y < .3) for (const i of bt[q0] || []) {
      const t = tufts[i], lx = x - t.x, lz = z - t.z; if (lx * lx + lz * lz > .04) continue;
      for (const bl of t.bl) { const q = sdCap(x, y, z, bl[0], -.01, bl[1], bl[2], bl[3], bl[4], .015, .003); if (q < d) { d = q; hit.mat = GRASS; hit.grv = 1; } }
    }
    return Math.min(d, M * .9);
  }
  const desert = process.env.CLIFF_LOOK === 'grey' ? {} : { rock: 'sandstone', turf: 'sand', dry: true };   // Oldscar's land is desert (Michael, 2026-11-17): sandstone, sand on top and at the foot, dry grass. CLIFF_LOOK=grey draws the first look, grey rock on grass
  if (bendAt < 0) return { S: { noMoss: true, contrast: 1.8, streak: .36, ...desert, sdf: sdfRow, H: TOP, box: [X0 - 2, X1 + 2, 0, HIGH, TALL > 1 ? -BACK : -5.5, 2.6], ground: [X0 - 2, X1 + 2, TALL > 1 ? -BACK : -5.5, 3] }, noiseX };
  // the bend: world (x, z) to the unrolled row's (along, out), and how much shorter a world distance can be than the row's (the inner side of the curve is squeezed)
  const s1 = (bendAt + 2) * P - BM, sA = bendAt * P + BM, R = BR;    // the circle's centre is at (s1, R); the turned run's face is at x = s1 - R
  const local = (x, z) => { const dx = x - s1, dz = z - R; if (dx >= 0) return [x, z, 1]; if (dz >= 0) return [sA - dz, dx + R, 1]; const r = Math.hypot(dx, dz); return [s1 - R * Math.atan2(-dx, -dz), R - r, Math.min(1, r / R)]; };
  const NMAX = 2.6;                         // nothing stands further out than this from the foot, so near the circle's centre (where the squeeze goes to nothing) the distance is at least the way out to it
  const sdf = (x, y, z) => { const [s, nn, k] = local(x, z), d = sdfRow(s, y, nn) * k; return k < 1 ? Math.max(d, Math.min(.9, nn - NMAX)) : d; };
  const box = [s1 - R - (TALL > 1 ? BACK + .3 : 5.8), X1 + 2, 0, HIGH, TALL > 1 ? -BACK : -5.5, R + sA - X0 + 2.6];
  return { S: { noMoss: true, contrast: 1.8, streak: .36, ...desert, sdf, local, H: TOP, box, ground: [box[0], box[1], box[4], box[5]] }, noiseX };
}
