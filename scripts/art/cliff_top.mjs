// The tall cliff's top tile (CLIFF_TALL=1): the rock top with no cliff, P by P tiles, laid behind the pieces and behind itself to carry the top on back
// (Michael, 2026-11-17: "add more tiles on top of the cliff"; the rock "should continue up"). Its shape and its shading repeat every P tiles along and back
// (topField, buildTop and texTop in cliff_pieces.mjs), and a tall piece's top turns into the same pattern from 7.5 to 9.5 tiles back, so one tile does for every place.
// A tile's sprite is the pixels whose surface lies in its square, plus EPS each side (as a piece's does along x); a piece keeps what lies no further back than DEPTH.
//   CLIFF_TALL=1 node scripts/art/cliff_top.mjs [out dir] [--ss 1] [--zoom 0.5]            → cliff_top.png (the tile; it throws no ground shadow)
//   CLIFF_TALL=1 node scripts/art/cliff_top.mjs [out dir] --prove                         → also the proof, which needs cliff_A.png, cliff_B.png, cliff_C.png and cliff_ST.png
//     from cliff_seams.mjs in the same dir, drawn at the same --ss and --zoom (read from its seams.json):
//     the row C A S T B C A with the top carried on two tiles behind is drawn as one world (buildBehind), and the sprites are laid as the game draws them
//     (the far row of tiles first, then the near row, each left to right; then the pieces left to right). Every pixel of the one drawing whose surface lies on
//     pieces A S T B C (x from P to 6P) and no further back than the two rows of tiles must come out the same colour in the laid sprites, with no hole.
//     That covers a tile beside itself along the cliff and behind itself, and a tile behind each piece (A, B, C and the scar piece S T).
//     → top_world.png (the one drawing), top_laid.png (the sprites laid out, on sand), top_diff.png (grey; red: a pixel that differs; magenta: a hole), top.json
// The game places a tile behind piece slot a, row j (j = 0 against the pieces) at the tile's sprite moved 64 * zoom * P * (a + j) px right and 32 * zoom * P * (a - j) px down
// from where it lies as drawn here (the square x 0 to P, z -DEPTH - P to -DEPTH); top.json gives the sprite's own anchor (AX, AY: where the world point x 0, y 0, z 0 falls).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { writePng, readPng } from './png.mjs';
import { drawScene, frameOf, frame } from './cliff_draw.mjs';
import { P, DEPTH, TOP, HIGH, EPS } from './cliff_pieces.mjs';

if (process.env.CLIFF_TALL !== '1') { console.error('the top tile is for the tall cliff: run with CLIFF_TALL=1'); process.exit(1); }
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; }, flag = n => { const i = args.indexOf(n); return i >= 0 ? (args.splice(i, 1), true) : false; };
const prove = flag('--prove'); let ss = +opt('--ss', 1), zoom = +opt('--zoom', .5); const dir = args[0] || 'prototype/shots/cliff-tall';
mkdirSync(dir, { recursive: true });
const t0 = Date.now(), log = m => console.log(`${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s  ${m}`);
let seams = null;
if (prove) { seams = JSON.parse(readFileSync(`${dir}/seams.json`, 'utf8')); if (!seams.tall) throw new Error(`${dir}/seams.json is not the tall cliff's`); ss = seams.ss; zoom = seams.zoom; }

// the tile, drawn on the square x 0 to P, z -DEPTH - P to -DEPTH, with the top all round it (it has no edge of its own: the pattern runs on past the square)
const Z0 = -DEPTH - P, Z1 = -DEPTH, k = zoom;
const tf = frameOf([-.5, P + .5, TOP - 1, TOP + 1, Z0 - .5, Z1 + .5], zoom);
const tr = await drawScene({ top: [-1.5, P + 1.5, TOP - 1.5, HIGH, Z0 - 1.5, Z1 + 1.5] }, tf, ss);
const tile = Buffer.alloc(tr.out.length); let tilePx = 0;
for (let i = 0; i < tf.SW * tf.SH; i++) if (tr.out[i * 4 + 3] && tr.HX[i] >= -EPS && tr.HX[i] < P + EPS && tr.HZ[i] >= Z0 - EPS && tr.HZ[i] < Z1 + EPS) { tr.out.copy(tile, i * 4, i * 4, i * 4 + 4); tilePx++; }
writePng(`${dir}/cliff_top.png`, tile, tf.SW, tf.SH);
const result = { ss, zoom, tile: { file: 'cliff_top.png', width: tf.SW, height: tf.SH, AX: tf.AX, AY: tf.AY, pixels: tilePx, square: { x: [0, P], z: [Z0, Z1] } } };
log(`cliff_top.png  ${tf.SW} x ${tf.SH}, ${tilePx} pixels`);

if (prove) {
  const row = ['C', 'A', 'S', 'T', 'B', 'C', 'A'], ROWS = 2, XA = P, XB = 6 * P, ZF = Z1 - ROWS * P, ZN = Z1 + 5;   // compared: x from XA to XB, z from ZF (the far edge of the far row) to ZN (5 tiles in front of the joint with the pieces)
  const wf = frameOf([XA - 1, XB + 1, TOP - 1, HIGH, ZF - .5, ZN + 1], zoom);
  const wr = await drawScene({ arr: row, behind: ZF - 2 }, wf, ss); log('the one drawing');
  writePng(`${dir}/top_world.png`, wr.out, wf.SW, wf.SH);
  const W = wf.SW, H = wf.SH, laid = Buffer.alloc(W * H * 4), who = new Int16Array(W * H).fill(-1);
  const paste = (img, w, h, ox, oy, id) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, X = x + ox, Y = y + oy; if (!img[i * 4 + 3] || X < 0 || Y < 0 || X >= W || Y >= H) continue; img.copy(laid, (Y * W + X) * 4, i * 4, i * 4 + 4); who[Y * W + X] = id; } };
  const placed = [];
  for (let j = ROWS - 1; j >= 0; j--) for (let a = 1; a <= 5; a++) {        // tiles: the far row first, each left to right
    const ox = wf.AX - tf.AX + 64 * k * P * (a + j), oy = wf.AY - tf.AY + 32 * k * P * (a - j); paste(tile, tf.SW, tf.SH, ox, oy, placed.length); placed.push(`top ${a},${j}`);
  }
  for (const [v, at] of [['A', 1], ['ST', 2], ['B', 4], ['C', 5]]) {          // then the pieces, left to right (each sprite was drawn as the piece at slot 2)
    const s = readPng(`${dir}/cliff_${v}.png`), pf = frame(2, v === 'ST' ? 2 : 1, zoom);
    if (s.width !== pf.SW || s.height !== pf.SH) throw new Error(`cliff_${v}.png is not the size cliff_seams.mjs draws at zoom ${zoom}`);
    paste(s.data, s.width, s.height, wf.AX - pf.AX + 64 * k * P * (at - 2), wf.AY - pf.AY + 32 * k * P * (at - 2), placed.length); placed.push(v);
  }
  let compared = 0, differ = 0, holes = 0; const byWho = {}, diff = Buffer.alloc(W * H * 4), look = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    look.set([192, 174, 138, 255], i * 4); if (laid[i * 4 + 3]) laid.copy(look, i * 4, i * 4, i * 4 + 3);
    if (!wr.out[i * 4 + 3]) continue; const g = Math.round((wr.out[i * 4] + wr.out[i * 4 + 1] + wr.out[i * 4 + 2]) / 6 + 60); diff.set([g, g, g, 255], i * 4);
    if (!(wr.HX[i] >= XA && wr.HX[i] < XB && wr.HZ[i] >= ZF && wr.HZ[i] < ZN)) continue;
    compared++;
    if (!laid[i * 4 + 3]) { holes++; diff.set([255, 0, 255, 255], i * 4); continue; }
    if (!wr.out.subarray(i * 4, i * 4 + 3).equals(laid.subarray(i * 4, i * 4 + 3))) { differ++; diff.set([255, 0, 0, 255], i * 4); const n = placed[who[i]]; byWho[n] = (byWho[n] || 0) + 1; }
  }
  writePng(`${dir}/top_laid.png`, look, W, H); writePng(`${dir}/top_diff.png`, diff, W, H);
  result.proof = { row: row.join(' '), tileRows: ROWS, compared: { x: [XA, XB], z: [ZF, ZN] }, pixelsCompared: compared, pixelsThatDiffer: differ, holes, differBySprite: byWho };
  log(`${differ} pixels differ and ${holes} are holes, of ${compared} compared`);
}
writeFileSync(`${dir}/top.json`, JSON.stringify(result, null, 1)); log(JSON.stringify(result));
