// A quick look at a row of Oldscar's cliff pieces, drawn in one go on a grass-coloured ground (no seam proof: that is cliff_seams.mjs).
//   node scripts/art/cliff_look.mjs out.png [--row "L A R"] [--ss 1] [--zoom 0.5] [--look desert]      (- in the row = no piece)
import { writePng } from './png.mjs';
import { draw } from './cliff_draw.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const look = opt('--look', ''); if (look) process.env.CLIFF_LOOK = look;
const row = opt('--row', 'L A R').split(/\s+/).map(a => a === '-' ? null : a), ss = +opt('--ss', 1), zoom = +opt('--zoom', .5), out = args[0] || 'prototype/shots/cliff/look.png';
const t0 = Date.now(), r = await draw(row, 0, row.length, ss, zoom), BG = look === 'desert' ? [192, 174, 138] : [70, 96, 44], pic = Buffer.alloc(r.SW * r.SH * 4);
for (let i = 0; i < r.SW * r.SH; i++) {
  const k = r.so[i * 4 + 3] ? (look === 'desert' ? .78 : .7) : 1; pic.set([BG[0] * k, BG[1] * k, BG[2] * k, 255], i * 4);
  if (r.out[i * 4 + 3]) r.out.copy(pic, i * 4, i * 4, i * 4 + 3);
}
writePng(out, pic, r.SW, r.SH); console.log(`${out}  ${r.SW} x ${r.SH}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
