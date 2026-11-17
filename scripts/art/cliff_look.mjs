// A quick look at a row of Oldscar's cliff pieces, drawn in one go on a plain ground (sand; grass with --look grey) (no seam proof: that is cliff_seams.mjs).
//   node scripts/art/cliff_look.mjs out.png [--row "L A R"] [--ss 1] [--zoom 0.5] [--look grey]      (- in the row = no piece; "S T" = the piece with the scar, two pieces long;
//     "U V" = the rounded bend, two pieces long: the pieces before it turn 90 degrees and run toward the camera, e.g. --row "L A U V B R")
import { writePng } from './png.mjs';
import { draw } from './cliff_draw.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const look = opt('--look', 'desert'); process.env.CLIFF_LOOK = look;
const row = opt('--row', 'L A R').split(/\s+/).map(a => a === '-' ? null : a), ss = +opt('--ss', 1), zoom = +opt('--zoom', .5), out = args[0] || 'prototype/shots/cliff/look.png';
const t0 = Date.now(), r = await draw(row, 0, row.length, ss, zoom), BG = look === 'grey' ? [70, 96, 44] : [192, 174, 138], pic = Buffer.alloc(r.SW * r.SH * 4);
for (let i = 0; i < r.SW * r.SH; i++) {
  const k = r.so[i * 4 + 3] ? (look === 'grey' ? .7 : .78) : 1; pic.set([BG[0] * k, BG[1] * k, BG[2] * k, 255], i * 4);
  if (r.out[i * 4 + 3]) r.out.copy(pic, i * 4, i * 4, i * 4 + 3);
}
let H = r.SH; if (row.includes('U')) { let last = 0; for (let i = 0; i < r.SW * r.SH; i++) if (r.out[i * 4 + 3] || r.so[i * 4 + 3]) last = Math.floor(i / r.SW); H = Math.min(r.SH, last + 12); }   // a bent row's canvas holds the empty ground inside the bend: cut it off below the last drawn pixel
writePng(out, pic.subarray(0, r.SW * H * 4), r.SW, H); console.log(`${out}  ${r.SW} x ${H}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
