// Proves Oldscar's cliff pieces join with no seam.
// A piece's sprite is its own pixels (those whose surface lies in it; for the shadow, whose ground point does) drawn with neighbours beside it,
// since the neighbours throw shadows on it and give its edges. The claim: a variant's own pixels are the same whatever the neighbours are.
// Each variant is drawn with three different sets of neighbours, two on each side, in the same frame (so every pixel's ray is the same),
// and its own pixels are compared, exactly. Then the sprites are laid side by side in a row with every pair of neighbours, to look at.
//   node scripts/art/cliff_seams.mjs [out dir] [--ss 2]   → seams.json, cliff_<V>.png and cliff_<V>_shadow.png (the sprites), seams.png (the row), seams_diff.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { writePng } from './png.mjs';
import { draw } from './cliff_draw.mjs';
import { P, VARIANTS } from './cliff_pieces.mjs';

const args = process.argv.slice(2), si = args.indexOf('--ss'), ss = si >= 0 ? +args.splice(si, 2)[1] : 2, dir = args[0] || 'prototype/shots/cliff';
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
const result = { ss, variants: {} }, sprite = {}, diffMask = {};
for (const v of VARIANTS) {
  const [n1, n2] = VARIANTS.filter(o => o !== v), ctxs = [[n1, n2, v, n1, n2], [n2, n1, v, n2, n1], [v, v, v, v, v]];
  const runs = [];
  for (const c of ctxs) { runs.push(own(await draw(c, at, 1, ss), at * P, (at + 1) * P)); log(`${c.join(' ')}`); }
  const ref = runs[0], N = ref.SW * ref.SH; let px = 0, sh = 0, dpx = 0, dsh = 0; diffMask[v] = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (ref.out[i * 4 + 3]) px++; if (ref.so[i * 4 + 3]) sh++;
    for (const r of runs.slice(1)) {
      if (!ref.out.subarray(i * 4, i * 4 + 4).equals(r.out.subarray(i * 4, i * 4 + 4))) { dpx++; diffMask[v][i] = 1; }
      if (ref.so[i * 4 + 3] !== r.so[i * 4 + 3]) { dsh++; diffMask[v][i] = 1; }
    }
  }
  result.variants[v] = { contexts: ctxs.map(c => c.join(' ')), pixels: px, shadowPixels: sh, pixelsThatChange: dpx, shadowPixelsThatChange: dsh };
  sprite[v] = ref; writePng(`${dir}/cliff_${v}.png`, ref.out, ref.SW, ref.SH); writePng(`${dir}/cliff_${v}_shadow.png`, ref.so, ref.SW, ref.SH);
  log(`${v}: ${dpx} pixels and ${dsh} shadow pixels change with the neighbours (of ${px} and ${sh})`);
}
// the sprites side by side: A B C A (every pair of neighbours), one piece along = 64 px right and 32 px down per tile
const row = ['A', 'B', 'C', 'A'], S0 = sprite.A, W = S0.SW + (row.length - 1) * P * 64, H = S0.SH + (row.length - 1) * P * 32;
const pic = Buffer.alloc(W * H * 4), dimg = Buffer.alloc(W * H * 4), BG = [70, 96, 44];
for (let o = 0; o < W * H; o++) { pic.set([...BG, 255], o * 4); dimg[o * 4 + 3] = 0; }
let gaps = 0, claimed = new Uint8Array(W * H), twice = 0, twiceDiffer = 0;
row.forEach((v, k) => {
  const s = sprite[v], dx = k * P * 64, dy = k * P * 32;
  for (let y = 0; y < s.SH; y++)for (let x = 0; x < s.SW; x++) {
    const i = y * s.SW + x, o = (y + dy) * W + x + dx;
    if (s.so[i * 4 + 3]) for (let c = 0; c < 3; c++) pic[o * 4 + c] = Math.round(BG[c] * .7);
  }
});
row.forEach((v, k) => {
  const s = sprite[v], dx = k * P * 64, dy = k * P * 32;
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
result.row = { pieces: row.join(' '), overlapPixels: twice, overlapPixelsOfDifferentColour: twiceDiffer, seamHoles: gaps };
writePng(`${dir}/seams.png`, pic, W, H); writePng(`${dir}/seams_diff.png`, dimg, W, H);
writeFileSync(`${dir}/seams.json`, JSON.stringify(result, null, 1)); log(JSON.stringify(result));
