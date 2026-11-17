// Proves Oldscar's cliff pieces join with no seam.
// A piece's sprite is its own pixels (those whose surface lies in it; for the shadow, whose ground point does) drawn with neighbours beside it,
// since the neighbours throw shadows on it and give its edges. The claim: a variant's own pixels are the same whatever the neighbours are.
// Each variant is drawn with three different sets of neighbours, two on each side, in the same frame (so every pixel's ray is the same),
// and its own pixels are compared, exactly. Then the sprites are laid side by side in a row with every pair of neighbours, to look at.
// The ends (L, R) are proved the same way: each drawn beside three different neighbours (an end beside the other end is a cliff two pieces long),
// and each straight variant is also drawn between the two ends, so a straight piece is the same beside an end as beside another straight piece.
// An end owns everything past its outer edge (nothing else is there).
// The scar piece (D107) is two pieces long, written "S T": it is proved as one sprite, ST, drawn between each pair of straight variants and between the two ends.
//   node scripts/art/cliff_seams.mjs [out dir] [--ss 2] [--only ST,A] [--zoom 0.5]   (--only: prove just those; a row is laid out only when all its sprites are there;
//     --zoom: a quicker run at a smaller size, which is evidence, not the proof of the full-size sprites; CLIFF_TALL=1 proves the tall cliff's pieces)
//     → seams.json, cliff_<V>.png and cliff_<V>_shadow.png (the sprites, V = A B C L R ST),
//     seams.png (the row L A B C A R), seams_scar.png (the row L A S T B C R), seams_diff.png, seams_scar_diff.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { writePng } from './png.mjs';
import { draw } from './cliff_draw.mjs';
import { P, VARIANTS, KINDS, SCAR } from './cliff_pieces.mjs';

const args = process.argv.slice(2), oi = args.indexOf('--only'), only = oi >= 0 ? args.splice(oi, 2)[1].split(',') : null, si = args.indexOf('--ss'), ss = si >= 0 ? +args.splice(si, 2)[1] : 2, zi = args.indexOf('--zoom'), zoom = zi >= 0 ? +args.splice(zi, 2)[1] : 1, dir = args[0] || 'prototype/shots/cliff';
mkdirSync(dir, { recursive: true });
const t0 = Date.now(), log = m => console.log(`${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s  ${m}`);
// A piece keeps the pixels whose surface (for the shadow, whose ground point) lies in it, plus EPS past each end (well inside the shared joint rock):
// a piece drawn alone and its neighbour drawn alone don't agree to the last digit where a ray hits, so without the overlap
// a ray that grazes an edge right on the line can land on different surfaces in the two drawings and belong to neither. The game draws the pieces left to right, so the overlap shows the right one's pixel.
export const EPS = .25;
const own = (r, x0, x1) => {
  const out = Buffer.alloc(r.out.length), so = Buffer.alloc(r.so.length);
  for (let i = 0; i < r.SW * r.SH; i++) {
    if (r.out[i * 4 + 3] && r.HX[i] >= x0 - EPS && r.HX[i] < x1 + EPS) r.out.copy(out, i * 4, i * 4, i * 4 + 4);
    if (r.so[i * 4 + 3] && r.GX[i] >= x0 - EPS && r.GX[i] < x1 + EPS) so[i * 4 + 3] = 255;
  }
  return { ...r, out, so };
};
const at = 2;                                        // the piece under test is the third of five
const result = { ss, zoom, tall: process.env.CLIFF_TALL === '1', variants: {} }, sprite = {}, diffMask = {};
const _ = null, name = c => c.map(a => a || '-').join(' ');
for (const v of [...KINDS, SCAR.join('')].filter(v => !only || only.includes(v))) {
  const [n1, n2] = VARIANTS.filter(o => o !== v), len = v === 'ST' ? 2 : 1;
  const ctxs = v === 'ST' ? [['A', 'B', ...SCAR, 'A', 'B'], ['C', 'A', ...SCAR, 'C', 'A'], ['B', 'C', ...SCAR, 'B', 'C'], [_, 'L', ...SCAR, 'R', _]]   // each straight variant on each side, and both ends
    : v === 'L' ? [[_, _, 'L', 'A', 'B'], [_, _, 'L', 'B', 'C'], [_, _, 'L', 'R', _]]
    : v === 'R' ? [['B', 'A', 'R', _, _], ['C', 'B', 'R', _, _], [_, 'L', 'R', _, _]]
    : [[n1, n2, v, n1, n2], [n2, n1, v, n2, n1], [v, v, v, v, v], [_, 'L', v, 'R', _]];
  const x0 = v === 'L' ? -1e9 : at * P, x1 = v === 'R' ? 1e9 : (at + len) * P, runs = [];
  for (const c of ctxs) { runs.push(own(await draw(c, at, len, ss, zoom), x0, x1)); log(name(c)); }
  const ref = runs[0], N = ref.SW * ref.SH; let px = 0, sh = 0, dpx = 0, dsh = 0; diffMask[v] = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (ref.out[i * 4 + 3]) px++; if (ref.so[i * 4 + 3]) sh++;
    for (const r of runs.slice(1)) {
      if (!ref.out.subarray(i * 4, i * 4 + 4).equals(r.out.subarray(i * 4, i * 4 + 4))) { dpx++; diffMask[v][i] = 1; }
      if (ref.so[i * 4 + 3] !== r.so[i * 4 + 3]) { dsh++; diffMask[v][i] = 1; }
    }
  }
  result.variants[v] = { contexts: ctxs.map(name), pixels: px, shadowPixels: sh, pixelsThatChange: dpx, shadowPixelsThatChange: dsh };
  sprite[v] = ref; writePng(`${dir}/cliff_${v}.png`, ref.out, ref.SW, ref.SH); writePng(`${dir}/cliff_${v}_shadow.png`, ref.so, ref.SW, ref.SH);
  log(`${v}: ${dpx} pixels and ${dsh} shadow pixels change with the neighbours (of ${px} and ${sh})`);
}
// the sprites side by side, one piece along = 64 px right and 32 px down per tile; ST takes two places
function lay(row, file) {
  if (!row.every(v => sprite[v])) return 'not drawn (--only)';
  const at0 = []; let n = 0; for (const v of row) { at0.push(n); n += v === 'ST' ? 2 : 1; }
  const W = Math.max(...row.map((v, k) => sprite[v].SW + at0[k] * P * 64 * zoom)), H = Math.max(...row.map((v, k) => sprite[v].SH + at0[k] * P * 32 * zoom));
  const pic = Buffer.alloc(W * H * 4), dimg = Buffer.alloc(W * H * 4), BG = process.env.CLIFF_LOOK === 'grey' ? [70, 96, 44] : [192, 174, 138], SHADE = process.env.CLIFF_LOOK === 'grey' ? .7 : .78;   // the ground under the row: the desert tileset's sand, or grass for the grey look
  for (let o = 0; o < W * H; o++) { pic.set([...BG, 255], o * 4); dimg[o * 4 + 3] = 0; }
  let gaps = 0, claimed = new Uint8Array(W * H), twice = 0, twiceDiffer = 0;
  row.forEach((v, k) => {
    const s = sprite[v], dx = at0[k] * P * 64 * zoom, dy = at0[k] * P * 32 * zoom;
    for (let y = 0; y < s.SH; y++)for (let x = 0; x < s.SW; x++) {
      const i = y * s.SW + x, o = (y + dy) * W + x + dx;
      if (s.so[i * 4 + 3]) for (let c = 0; c < 3; c++) pic[o * 4 + c] = Math.round(BG[c] * SHADE);
    }
  });
  row.forEach((v, k) => {
    const s = sprite[v], dx = at0[k] * P * 64 * zoom, dy = at0[k] * P * 32 * zoom;
    for (let y = 0; y < s.SH; y++)for (let x = 0; x < s.SW; x++) {
      const i = y * s.SW + x, o = (y + dy) * W + x + dx; if (!s.out[i * 4 + 3]) continue;
      if (claimed[o]) { twice++; if (pic[o * 4] !== s.out[i * 4] || pic[o * 4 + 1] !== s.out[i * 4 + 1] || pic[o * 4 + 2] !== s.out[i * 4 + 2]) twiceDiffer++; } claimed[o] = k + 1; s.out.copy(pic, o * 4, i * 4, i * 4 + 3);
      const g = Math.round((s.out[i * 4] + s.out[i * 4 + 1] + s.out[i * 4 + 2]) / 6 + 60); dimg.set(diffMask[v][i] ? [255, 0, 0, 255] : [g, g, g, 255], o * 4);
    }
  });
  // a seam hole: an empty pixel with pixels of two different pieces round it
  for (let y = 1; y < H - 1; y++)for (let x = 1; x < W - 1; x++) {
    const o = y * W + x; if (claimed[o]) continue; let a = 0, two = false;
    for (const q of [o - 1, o + 1, o - W, o + W, o - W - 1, o - W + 1, o + W - 1, o + W + 1]) if (claimed[q]) { if (a && claimed[q] !== a) two = true; a = claimed[q]; }
    if (two) { gaps++; dimg.set([255, 0, 255, 255], o * 4); }
  }
  writePng(`${dir}/${file}.png`, pic, W, H); writePng(`${dir}/${file}_diff.png`, dimg, W, H);
  return { pieces: row.join(' ').replace('ST', 'S T'), overlapPixels: twice, overlapPixelsOfDifferentColour: twiceDiffer, seamHoles: gaps };
}
result.row = lay(['L', 'A', 'B', 'C', 'A', 'R'], 'seams');
result.scarRow = lay(['L', 'A', 'ST', 'B', 'C', 'R'], 'seams_scar');
writeFileSync(`${dir}/seams.json`, JSON.stringify(result, null, 1)); log(JSON.stringify(result));
