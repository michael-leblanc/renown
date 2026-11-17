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
// build(arr) gives the shape for a row of pieces: arr[k] is the kind of piece k (A, B, C, L, R, or null for none), which spans x = k*P to (k+1)*P.
// An L comes first in a run and an R last; a straight piece always has pieces on both sides.
import { hit, ROCK, GRASS, h3, fbm3, rng, sstep, clamp, chBox, sdCap, nx } from './cliffkit.mjs';

export const P = 8, TOP = 7, PEAK = TOP + .9, VARIANTS = ['A', 'B', 'C'], ENDS = ['L', 'R'], KINDS = [...VARIANTS, ...ENDS];
const JOINT = 1.3, BLEND = .7;                // noise is the joint's within JOINT of a joint line, the variant's past JOINT + BLEND
const MT = TOP - 1.2;                         // the land behind the columns: turf, seen between the crags
const ZB = -.35, ZM = -1.5, LEAN = .1, RIM = -3.1;        // the face's usual line at the ground; the mass behind it; how far the face leans back per unit up
const RAD = Math.PI / 180;
// the rows of columns: the face, the pillars in front of it, two rows of crags on top
const FACE = 0, PILLAR = 1, CRAG1 = 2, CRAG2 = 3;
const ROWS = [{ zf: ZB, D: 1.6 }, { zf: .3, D: 1.6 }, { zf: -2.45, D: 1.75 }, { zf: -3.95, D: 1.45 }];
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
  const pointed = r() < (g.row === PILLAR ? .9 : crag ? .75 : .55), nt = 2 + (r() < .6 ? 1 : 0), th = r() * 6.2832, px = a * (r() - .5) * .8, pz = -D * (.15 + .45 * r());
  for (let k = 0; k < 3; k++) { const az = th + k * 6.2832 / nt + (r() - .5), ny = crag ? .7 + .24 * r() : (g.w > 1.4 ? .6 : .5) + .34 * r(); if (k < nt) add(az, ny, px, H, pz, ny > .72 ? 1 : 0); }
  { const drop = .12 + .4 * r(); pl.push(0, 1, 0, pointed ? H : H - drop); top.push(1); }
  // corners knocked off the upper front: big slanted faces, turned up to the sun
  for (let k = 0; k < 2; k++) { const az = (-25 + 85 * r()) * RAD, sl = .42 + .33 * r(), hx = e + a * (r() - .5), hc = H * (.5 + .38 * r()); if (r() < (k ? .3 : .6)) add(az, sl, hx, hc, 0); }
  // an undercut foot now and then: the rock above overhangs
  { const az = (-10 + 50 * r()) * RAD, sl = -(.25 + .25 * r()), hu = Math.min(.4 + .9 * r(), .45 * H); if (r() < (g.row === PILLAR ? .3 : .14) && g.w < 1.2) add(az, sl, e, hu, 0); }   // narrow columns only: under a wide one it reads as a cave mouth
  const fv = top.map((_, i) => { const o = h3(seed, i, 8); return o < .13 ? .9 : o < .27 ? .1 : .25 + .5 * h3(seed, i, 7); });   // each face its own tone; the odd one paler or darker
  return { row: g.row, cx: g.cx, a, H, zf: g.zf, lean: crag ? 0 : LEAN + .06 * (r() - .5), lx: .04 * (r() - .5), pl: Float64Array.from(pl), top, fv, turf: crag ? -.2 : .05 };
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
    const g = row ? { row, cx, w, zf: ROWS[row].zf + .2 * (r() - .5), H: MT + .35 + .5 * r() } : { row, cx, w, zf: ZB + .22 * fwd + .12 * (r() - .5), H: TOP - .5 + .5 * (r() - .5) + .15 * fwd };
    cols.push(column(9001 + row * 977 + i * 53, g));
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
  const out = [], end = vi === 3, put = (seed, g) => { if (end) { g.H *= gC(g.cx) ** (g.row === PILLAR ? 1.4 : 1); g.w *= clamp(.45 + .13 * g.H, .45, 1); } if (g.H > .4) out.push(column(seed, g)); };   // on an end the low columns are also narrower: stumps, not slabs
  for (const J of JROWS) {
    const row = J.row, r = rng(1009 + vi * 7919 + row * 131), left = J.jr, right = end ? P - .35 : P + J.jl;
    cells(left, right, () => (row ? 1.2 + 1.5 * r() : .65 + 1.5 * r() ** 1.8) * (end ? .75 : 1), true).forEach(([x, w], i) => {
      const cx = x + w / 2, win = sstep(left - .2, left + 1.5, cx) * (end ? 1 : sstep(right + .2, right - 1.3, cx));
      const spur = r() < .22 ? .35 : 0, zr = r(), hr = r(), hj = r();
      const zf = row ? ROWS[row].zf + .8 * (zr - .5) : Math.min(ZB + win * (1.1 * (zr - .5) + spur), LEFT_Z(x));
      const H = Math.min(row ? Math.min(MT + .3 + .25 * hj + win * 2.1 * hr ** 1.6, PEAK - .1) : clamp(TOP - .35 + win * 1.7 * (hr - .5) + .3 * (hj - .5), MT + .6, PEAK - .15), LEFT_H(x));
      put(20011 + vi * 6007 + row * 977 + i * 53, { row, cx, w, zf, H });
    });
  }
  // pillars standing in front of the face, shorter than it
  { const r = rng(3001 + vi * 613), left = JROWS[0].jr + .8, right = end ? U1 - 1.5 : P + JROWS[0].jl - .6, n = 2 + (r() < .7 ? 1 : 0) + (r() < .4 ? 1 : 0) + (r() < .2 ? 1 : 0);
    for (let i = 0; i < 5; i++) { const cx = left + (right - left) * r(), w = .7 + 1.9 * r() ** 2, zf = Math.min(ZB + .25 + .6 * r(), LEFT_Z(cx - w / 2) + .1), H = 1.2 + 4.3 * r(); if (i < n) put(40009 + vi * 811 + i * 59, { row: PILLAR, cx, w, zf, H }); } }
  return out;
}
// stones at the foot and grass tufts along it: a few shared ones at the joint, the rest each variant's own
function footStones(r, x0, x1, n) { const out = []; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * r(), dz = 1.2 * r() ** 2; out.push({ x, z: .25 + dz, s: (.06 + .2 * r() ** 2) * (1.3 - .6 * dz) }); } return out; }
function footTufts(r, x0, x1, n) { return Array.from({ length: n }, () => { const x = x0 + (x1 - x0) * r(), z = .35 + 1.2 * r(), sd = Math.floor(r() * 1e6), bl = []; for (let j = 0; j < 5; j++) { const a = h3(sd, j, 1) * 6.283, rr = .02 + .03 * h3(sd, j, 2), hg = .08 + .11 * h3(sd, j, 3), ln = .04 + .06 * h3(sd, j, 4); bl.push([x + Math.cos(a) * rr, z + Math.sin(a) * rr, x + Math.cos(a) * (rr + ln), hg, z + Math.sin(a) * (rr + ln)]); } return { x, z, bl }; }); }
const J_STONES = footStones(rng(77), -1.1, 1.1, 5), J_TUFTS = footTufts(rng(78), -1.1, 1.1, 7);
// scree: loose stones at the end's foot, and a few more in front
function scree(r, n) { const out = []; for (let i = 0; i < n; i++) { const u = U1 - 2.2 + 2.6 * r() ** .8, z = -5 + 6.4 * r(), s = .08 + .26 * r() ** 2; out.push({ x: Math.min(u, P - .45), z, s }); } return out; }
const V = VARIANTS.map((_, vi) => ({ cols: variantCols(vi), stones: footStones(rng(300 + vi), 1.5, P - 1.5, 30), tufts: footTufts(rng(400 + vi), 1.5, P - 1.5, 40), off: 101.7 + 97.3 * vi }));
{ const r = rng(911); V.push({ cols: variantCols(3), stones: [...footStones(rng(310), 1.5, U1 - 1.5, 18), ...scree(r, 26)], tufts: footTufts(rng(410), 1.5, U1 - .8, 30), off: 503.9 }); }   // the end, as an R

/** The shape for a row of pieces. arr: variant letters, piece k at x = k*P. Returns the prop object for cliffkit's trace() and the noise rule for setNoiseX(). */
export function build(arr) {
  const n = arr.length, kind = k => (k >= 0 && k < n ? arr[k] : null), isV = k => VARIANTS.includes(kind(k));
  // where piece k's own things go: a straight piece as built; an end as built for an R (x' = x - kP) or mirrored for an L (x' = (k+1)P - x)
  const place = (k, x) => kind(k) === 'L' ? (k + 1) * P - x : k * P + x;
  const cols = [], stones = [], tufts = [], movT = (t, f) => ({ x: f(t.x), z: t.z, bl: t.bl.map(b => [f(b[0]), b[1], f(b[2]), b[3], b[4]]) });
  // joint lines: both sides of a straight piece, the inner side of an end
  const jointAt = m => isV(m - 1) || isV(m) || (kind(m - 1) === 'L' && kind(m) === 'R');
  for (let m = 0; m <= n; m++) if (jointAt(m)) { for (const J of JROWS) for (const c of J.cols) cols.push({ ...c, cx: c.cx + m * P }); for (const s of J_STONES) stones.push({ ...s, x: s.x + m * P }); for (const t of J_TUFTS) tufts.push(movT(t, x => x + m * P)); }
  arr.forEach((a, k) => {
    if (!a) return; const Vv = V[a === 'L' || a === 'R' ? 3 : VARIANTS.indexOf(a)], f = x => place(k, x);
    for (const c of Vv.cols) cols.push(a === 'L' ? { ...c, cx: f(c.cx), lx: -c.lx, pl: c.pl.map((v, i) => i % 4 ? v : -v) } : { ...c, cx: f(c.cx) });
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
    const k = Math.min(n - 1, Math.max(0, Math.floor(x / P))), a = kind(k), t = x - Math.round(x / P) * P, e = jointAt(Math.round(x / P)) ? 1 - sstep(JOINT, JOINT + BLEND, Math.abs(t)) : 0;
    const xv = !a ? x : a === 'L' || a === 'R' ? (a === 'L' ? (k + 1) * P - x : x - k * P) + V[3].off : x - k * P + V[VARIANTS.indexOf(a)].off;
    return e >= 1 ? [[t, 1]] : e <= 0 ? [[xv, 1]] : [[t, e], [xv, 1 - e]];
  };
  function sdf(x, y, z) {
    const q0 = Math.floor(x - B0), u = uAt(x);
    // the land behind the columns; on an end it sinks into the ground as a turf slope
    let mt = MT, ks = 1; if (u > UM0) { const g = gM(u); mt = MT * g - 1.2 * (1 - g) + (1 - g) * .3 * fbm3(u * .7, 1.3, z * .7); ks = .33; }
    mt += .14 * nx(X => fbm3(X * .9, 4.4, z * .9), x);
    const dTop = Math.max(y - mt, .643 * (y - mt) + .766 * (z - RIM)) * ks, dFront = (z - (ZM - LEAN * y)) * .99;   // flat, then a bank down toward the rim: the land's front edge stays under the column tops
    let d = Math.max(dTop, dFront, -5.3 - z, X0 - x, x - X1), kc = -1, kf = 0; const onTop = dTop >= dFront;
    const ro = nx(X => .016 * fbm3(X * 7, y * .4, z * 7) + .03 * fbm3(X * 1.2 + 3, y * .6, z * 1.2), x);   // flutes running up the faces, and planes that aren't quite flat
    for (const i of bc[q0] || []) {
      const c = cols[i]; if (y > c.H + 1) continue;
      const lx = x - c.cx - c.lx * y; if (lx > c.a + 1 || lx < -c.a - 1) continue;
      const lz = z - c.zf + c.lean * y, pl = c.pl; let q = -9, f = 0;
      for (let j = 0; j < pl.length; j += 4) { const v = pl[j] * lx + pl[j + 1] * y + pl[j + 2] * lz - pl[j + 3]; if (v > q) { q = v; f = j >> 2; } }
      q = q * .985 + ro; if (q < d) { d = q; kc = i; kf = f; }
    }
    hit.mat = ROCK; hit.grv = 1;
    if (kc >= 0) {
      const c = cols[kc]; hit.var = c.fv[kf];
      if (d < .03) {
        if (c.top[kf] && nx(X => fbm3(X * 2.5, y, z * 2.5), x) > c.turf) hit.var = 2;                 // turf on the flatter tops, in patches
        else if (y < .5 && y < .08 + .5 * nx(X => fbm3(X * 1.4, 2.2, z * 1.4), x)) hit.var = 2;       // grass creeping up the foot
      }
    } else hit.var = onTop ? 2 : -1.15;                                                              // the land on top is turf; its front, seen down a crack, is in the dark
    for (const i of bs[q0] || []) {
      const st = stones[i], lx = x - st.x, lz = z - st.z; if (lx * lx + lz * lz > (st.s + .2) ** 2) continue;
      const q = chBox(lx, y - st.s * .6, lz, st.s, st.s * .7, st.s * .8, st.s * .35) + nx(X => .02 * fbm3(X * 9, y * 9, z * 9), x);
      if (q < d) { d = q; hit.mat = ROCK; hit.var = st.s * 37 % 1; }
    }
    if (y < .3) for (const i of bt[q0] || []) {
      const t = tufts[i], lx = x - t.x, lz = z - t.z; if (lx * lx + lz * lz > .04) continue;
      for (const bl of t.bl) { const q = sdCap(x, y, z, bl[0], -.01, bl[1], bl[2], bl[3], bl[4], .015, .003); if (q < d) { d = q; hit.mat = GRASS; hit.grv = 1; } }
    }
    return Math.min(d, M * .9);
  }
  const desert = process.env.CLIFF_LOOK === 'grey' ? {} : { rock: 'sandstone', turf: 'sand', dry: true };   // Oldscar's land is desert (Michael, 2026-11-17): sandstone, sand on top and at the foot, dry grass. CLIFF_LOOK=grey draws the first look, grey rock on grass
  return { S: { noMoss: true, contrast: 1.8, streak: .36, ...desert, sdf, H: TOP, box: [X0 - 2, X1 + 2, 0, PEAK, -5.5, 2.6], ground: [X0 - 2, X1 + 2, -5.5, 3] }, noiseX };
}
