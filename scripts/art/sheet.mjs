// A contact sheet: pictures in rows with words under them, as one PNG, for approving an asset at a glance
// (scripts/art/intake.mjs makes one per part or animation). Only what a sheet needs: a canvas, pictures laid on it
// enlarged with hard pixels, and small letters. The letters are the plain 5 x 7 dot letters of old displays.
//   import { canvas, put, write, textWidth, save } from './sheet.mjs'
import { writePng } from './png.mjs';

// one letter: five columns, each a number whose bits are the dots from the top down; from the space (32) to ~ (126)
const DOTS = [
  0, 0, 0, 0, 0, 0, 0, 95, 0, 0, 0, 7, 0, 7, 0, 20, 127, 20, 127, 20, 36, 42, 127, 42, 18, 35, 19, 8, 100, 98, 54, 73, 85, 34, 80, 0, 5, 3, 0, 0,
  0, 28, 34, 65, 0, 0, 65, 34, 28, 0, 20, 8, 62, 8, 20, 8, 8, 62, 8, 8, 0, 80, 48, 0, 0, 8, 8, 8, 8, 8, 0, 96, 96, 0, 0, 32, 16, 8, 4, 2,
  62, 81, 73, 69, 62, 0, 66, 127, 64, 0, 66, 97, 81, 73, 70, 33, 65, 69, 75, 49, 24, 20, 18, 127, 16, 39, 69, 69, 69, 57, 60, 74, 73, 73, 48, 1, 113, 9, 5, 3,
  54, 73, 73, 73, 54, 6, 73, 73, 41, 30, 0, 54, 54, 0, 0, 0, 86, 54, 0, 0, 8, 20, 34, 65, 0, 20, 20, 20, 20, 20, 0, 65, 34, 20, 8, 2, 1, 81, 9, 6,
  50, 73, 121, 65, 62, 126, 17, 17, 17, 126, 127, 73, 73, 73, 54, 62, 65, 65, 65, 34, 127, 65, 65, 34, 28, 127, 73, 73, 73, 65, 127, 9, 9, 9, 1, 62, 65, 73, 73, 122,
  127, 8, 8, 8, 127, 0, 65, 127, 65, 0, 32, 64, 65, 63, 1, 127, 8, 20, 34, 65, 127, 64, 64, 64, 64, 127, 2, 12, 2, 127, 127, 4, 8, 16, 127, 62, 65, 65, 65, 62,
  127, 9, 9, 9, 6, 62, 65, 81, 33, 94, 127, 9, 25, 41, 70, 70, 73, 73, 73, 49, 1, 1, 127, 1, 1, 63, 64, 64, 64, 63, 31, 32, 64, 32, 31, 63, 64, 56, 64, 63,
  99, 20, 8, 20, 99, 7, 8, 112, 8, 7, 97, 81, 73, 69, 67, 0, 127, 65, 65, 0, 2, 4, 8, 16, 32, 0, 65, 65, 127, 0, 4, 2, 1, 2, 4, 64, 64, 64, 64, 64,
  0, 1, 2, 4, 0, 32, 84, 84, 84, 120, 127, 72, 68, 68, 56, 56, 68, 68, 68, 32, 56, 68, 68, 72, 127, 56, 84, 84, 84, 24, 8, 126, 9, 1, 2, 12, 82, 82, 82, 62,
  127, 8, 4, 4, 120, 0, 68, 125, 64, 0, 32, 64, 68, 61, 0, 127, 16, 40, 68, 0, 0, 65, 127, 64, 0, 124, 4, 24, 4, 120, 124, 8, 4, 4, 120, 56, 68, 68, 68, 56,
  124, 20, 20, 20, 8, 8, 20, 20, 24, 124, 124, 8, 4, 4, 8, 72, 84, 84, 84, 32, 4, 63, 68, 64, 32, 60, 64, 64, 32, 124, 28, 32, 64, 32, 28, 60, 64, 48, 64, 60,
  68, 40, 16, 40, 68, 12, 80, 80, 80, 60, 68, 100, 84, 76, 68, 0, 8, 54, 65, 0, 0, 0, 127, 0, 0, 0, 65, 54, 8, 0, 8, 4, 8, 16, 8];

/** A picture to draw on: w x h, filled with one colour ([r, g, b]). */
export function canvas(w, h, fill = [28, 28, 26]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([fill[0], fill[1], fill[2], 255], i * 4);
  return { data, width: w, height: h };
}
/** A box of one colour. */
export function box(c, x, y, w, h, fill) {
  for (let Y = Math.max(0, y); Y < Math.min(c.height, y + h); Y++) for (let X = Math.max(0, x); X < Math.min(c.width, x + w); X++) c.data.set([fill[0], fill[1], fill[2], 255], (Y * c.width + X) * 4);
}
/** Lays a picture on the canvas at x, y, `k` times as big with hard pixels, through its own alpha.
 *  crop [x0, y0, w, h] takes only that piece of it. */
export function put(c, p, x, y, k = 1, crop = [0, 0, p.width, p.height]) {
  const [cx, cy, cw, ch] = crop;
  for (let v = 0; v < ch * k; v++) for (let u = 0; u < cw * k; u++) { const sx = cx + ((u / k) | 0), sy = cy + ((v / k) | 0), X = x + u, Y = y + v;
    if (sx < 0 || sy < 0 || sx >= p.width || sy >= p.height || X < 0 || Y < 0 || X >= c.width || Y >= c.height) continue;
    const s = (sy * p.width + sx) * 4, d = (Y * c.width + X) * 4, a = p.data[s + 3] / 255; if (!a) continue;
    for (let j = 0; j < 3; j++) c.data[d + j] = Math.round(p.data[s + j] * a + c.data[d + j] * (1 - a)); }
}
export const textWidth = (t, k = 1) => t.length * 6 * k;
/** Words, their top left at x, y, each dot `k` pixels. A sign the letters do not have is drawn as "?". Returns the width. */
export function write(c, t, x, y, colour = [226, 222, 208], k = 1) {
  [...String(t)].forEach((ch, n) => { let code = ch.charCodeAt(0); if (code < 32 || code > 126) code = 63;
    for (let col = 0; col < 5; col++) { const bits = DOTS[(code - 32) * 5 + col] << ('gpqy'.includes(ch) ? 1 : 0);      // these four hang a dot under the line
      for (let row = 0; row < 8; row++) if (bits >> row & 1) box(c, x + (n * 6 + col) * k, y + row * k, k, k, colour); } });
  return textWidth(String(t), k);
}
/** Words too long for `wide` pixels, broken at spaces into lines. */
export function lines(t, wide, k = 1) {
  const out = []; let line = '';
  for (const w of String(t).split(' ')) { if (line && textWidth(line + ' ' + w, k) > wide) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  if (line) out.push(line); return out;
}
export const save = (c, path) => writePng(path, c.data, c.width, c.height);
