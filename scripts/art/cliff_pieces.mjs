// Oldscar's cliff (D107, claude/oldscar-cliff.md) cut into straight pieces that join with no seam.
// Built from draft 5's layered rock (cliff_draft5.mjs). A piece is P tiles long along x; the cliff's foot is at z = 0 and the town is on +z.
//  - The layers (heights, how far each is set back) are the same in every piece, as real rock strata run on.
//  - Where two pieces meet there is a joint: per layer, one to three blocks covering at least JOINT each side of the line,
//    the same in every piece (seeded by layer only). Everything that decides a pixel (shadow edges, shade, the view ray's last steps)
//    reaches less than JOINT, so a piece's pixels don't change with its neighbours.
//    Each variant fills only the space between its two joints with its own blocks, so any variant can sit beside any other.
//  - Noise (rough surface, moss patches, streaks) is read in the joint's own frame near a joint and in the variant's frame inside,
//    blended between, so the edges of every variant look the same.
// build(arr) gives the shape for a row of pieces: arr[k] is the variant of piece k, which spans x = k*P to (k+1)*P.
import { hit, ROCK, GRASS, h3, fbm3, rng, sstep, sdBox, chBox, sdCap, nx } from './cliffkit.mjs';

export const P = 8, TOP = 7, VARIANTS = ['A', 'B', 'C'];
const back = y => .14 * y;                    // the face leans back a little
const JOINT = 1.3, BLEND = .7;                // noise is the joint's within JOINT of a joint line, the variant's past JOINT + BLEND

// the layers: shared by every piece
const LAYERS = [];
{ const r = rng(907); for (let y0 = 0; y0 < TOP;) { const h = .45 + .7 * r() ** 1.5; LAYERS.push({ y0, h, lb: back(y0) + .25 * (r() - .5) }); y0 += h; } }
// the rock stops just under the top: the last layer is cut to fit (or joins the one below if too thin), so no block pokes up through the turf
{ const CAP = TOP - .08, last = LAYERS.at(-1); if (CAP - last.y0 < .3) { LAYERS.pop(); LAYERS.at(-1).h = CAP - LAYERS.at(-1).y0; } else last.h = CAP - last.y0; }
const block = (r, cx, w, L) => ({ rot: (r() - .5) * .14, cx, y: L.y0 - .18 * r(), h: L.h + .1 * r() - (L.y0 + L.h > TOP - .5 ? .1 : 0), a: w / 2 + .03, front: L.lb - .1 + .14 * (r() - .5) + .1 * (r() - .5), tilt: (r() - .5) * .03, chipA: r() * 6.28, chipB: r(), v: .85 * r() });
// the joint: blocks from jl (left of -JOINT) to jr (right of +JOINT), starting at a random place so the joints don't stack into a column
const JOINTS = LAYERS.map((L, li) => {
  const r = rng(5003 + li * 31), jl = -JOINT - .6 * r(), blocks = []; let x = jl;
  while (x < JOINT) { const w = 1.2 + 1.2 * r(); blocks.push(block(r, x + w / 2, w, L)); x += w; }
  return { jl, jr: x, blocks };
});
// a variant: blocks between its left joint (at 0) and its right joint (at P), per layer
function variantBlocks(vi) {
  const out = [];
  LAYERS.forEach((L, li) => {
    const r = rng(1009 + vi * 7919 + li * 131), J = JOINTS[li], left = J.jr, right = P + J.jl, span = right - left;
    const n = Math.max(1, Math.round(span / (1.6 + 1.2 * r()))), ws = Array.from({ length: n }, () => .55 + .9 * r()), sum = ws.reduce((a, b) => a + b);
    let x = left; for (const w0 of ws) { const w = w0 * span / sum; out.push(block(r, x + w / 2, w, L)); x += w; }
  });
  return out;
}
// stones at the foot and grass tufts along it: a few shared ones at the joint, the rest each variant's own
function footStones(r, x0, x1, n) { const out = []; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * r(), dz = 1.2 * r() ** 2; out.push({ x, z: .05 + dz, s: (.06 + .2 * r() ** 2) * (1.3 - .6 * dz) }); } return out; }
function footTufts(r, x0, x1, n) { return Array.from({ length: n }, () => { const x = x0 + (x1 - x0) * r(), z = .2 + 1.2 * r(), sd = Math.floor(r() * 1e6), bl = []; for (let j = 0; j < 5; j++) { const a = h3(sd, j, 1) * 6.283, rr = .02 + .03 * h3(sd, j, 2), hg = .08 + .11 * h3(sd, j, 3), ln = .04 + .06 * h3(sd, j, 4); bl.push([x + Math.cos(a) * rr, z + Math.sin(a) * rr, x + Math.cos(a) * (rr + ln), hg, z + Math.sin(a) * (rr + ln)]); } return { x, z, bl }; }); }
const J_STONES = footStones(rng(77), -1.1, 1.1, 5), J_TUFTS = footTufts(rng(78), -1.1, 1.1, 7);
const V = VARIANTS.map((_, vi) => ({ blocks: variantBlocks(vi), stones: footStones(rng(300 + vi), 1.5, P - 1.5, 30), tufts: footTufts(rng(400 + vi), 1.5, P - 1.5, 40), off: 101.7 + 97.3 * vi }));

/** The shape for a row of pieces. arr: variant letters, piece k at x = k*P. Returns the prop object for cliffkit's trace() and the noise rule for setNoiseX(). */
export function build(arr) {
  const vi = arr.map(a => VARIANTS.indexOf(a)), n = arr.length, blocks = [], stones = [], tufts = [];
  for (let k = 0; k <= n; k++) { for (const J of JOINTS) for (const b of J.blocks) blocks.push({ ...b, cx: b.cx + k * P }); for (const s of J_STONES) stones.push({ ...s, x: s.x + k * P }); for (const t of J_TUFTS) tufts.push({ x: t.x + k * P, z: t.z, bl: t.bl.map(b => [b[0] + k * P, b[1], b[2] + k * P, b[3], b[4]]) }); }
  vi.forEach((v, k) => { const Vv = V[v]; for (const b of Vv.blocks) blocks.push({ ...b, cx: b.cx + k * P }); for (const s of Vv.stones) stones.push({ ...s, x: s.x + k * P }); for (const t of Vv.tufts) tufts.push({ x: t.x + k * P, z: t.z, bl: t.bl.map(b => [b[0] + k * P, b[1], b[2] + k * P, b[3], b[4]]) }); });
  const B0 = -3, NB = n * P + 6, bin = () => Array.from({ length: NB }, () => []), bb = bin(), bs = bin(), bt = bin();
  const put = (bins, list, lo, hi) => list.forEach((o, i) => { for (let q = Math.floor(lo(o) - B0); q <= Math.floor(hi(o) - B0); q++) if (bins[q]) bins[q].push(i); });
  const M = 1;                                // each bin lists what lies within M of it, so a distance up to M is true; the shape never says more (a ray would step over a stone)
  put(bb, blocks, b => b.cx - b.a - .3 - M, b => b.cx + b.a + .3 + M); put(bs, stones, s => s.x - s.s - M, s => s.x + s.s + M); put(bt, tufts, t => t.x - .2 - M, t => t.x + .2 + M);
  const X0 = 0, X1 = n * P;
  const noiseX = x => {                       // [[x', w]]: the joint's frame near a joint line, the piece's variant frame inside
    const k = Math.min(n - 1, Math.max(0, Math.floor(x / P))), t = x - Math.round(x / P) * P, e = 1 - sstep(JOINT, JOINT + BLEND, Math.abs(t)), xv = x - k * P + V[vi[k]].off;
    return e >= 1 ? [[t, 1]] : e <= 0 ? [[xv, 1]] : [[t, e], [xv, 1 - e]];
  };
  function sdf(x, y, z) {
    const q0 = Math.floor(x - B0);
    let ledge = false, d = Math.max(y - TOP, z - (-back(y) - .9), -5 - z, X0 - 2 - x, x - X1 - 2), kb = -1;   // the mass behind
    for (const i of bb[q0] || []) {
      const b = blocks[i]; if (b.y > TOP + .3) continue;
      const ux = x - b.cx, uy = y - b.y - b.h / 2, cr = Math.cos(b.rot), sr = Math.sin(b.rot), lx = cr * ux + sr * uy, ly = -sr * ux + cr * uy, zc = -b.front - .7, lz = z - zc - b.tilt * lx;
      if (Math.abs(lx) > b.a + .3 || Math.abs(ly) > b.h / 2 + .3) continue;
      let q = sdBox(lx, ly, lz, b.a, b.h / 2, .75, .1);
      const ca = Math.cos(b.chipA);
      q = Math.max(q, (.55 * ly + .83 * lz) - (b.h * .5 * .55 + .75 * .83 - .06 - .08 * b.chipB), (ca * .35 * lx - .5 * ly + .79 * lz) - (b.h * .5 * .5 + .75 * .79 + Math.abs(ca) * .35 * b.a - .05 - .1 * b.chipB));
      q += nx(X => .03 * fbm3(X * 6, y * 6, z * 6) + .05 * fbm3(X * 1.7 + 3, y * 1.7, z * 1.7), x);   // a rough surface, not cut stone
      if (q < d) { d = q; kb = i; ledge = ly > b.h / 2 - .06; }
    }
    hit.mat = ROCK; hit.grv = 1; hit.var = kb < 0 ? .4 : blocks[kb].v;
    if (y > TOP - .45 && d < .03) hit.var = 2;                                                     // turf on top
    else if (ledge && d < .03 && nx(X => fbm3(X * 2.5, y, z * 2.5), x) > -.05) hit.var = 2;         // moss and grass on the ledges, in patches
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
  return { S: { noMoss: true, sdf, H: TOP, box: [X0 - 2, X1 + 2, 0, TOP + .1, -5.2, 2.6], ground: [X0 - 2, X1 + 2, -5.5, 3] }, noiseX };
}
