// Code-made item icons for Renown: small square pictures for the pack, the loot window and shops (D142, D143).
// Each icon is drawn once in grey; the game gives it its material's colour (D132, D133), as it does for the Creator's parts.
// Same method as the props (shapes written as maths), with its own small camera: straight on, light from the top left.
// Usage, from the repo root:
//   node scripts/art/icons.mjs --draft        one picture to look at, prototype/shots/icons-draft.png; no icon written
import { clamp, sdBox, sdCap } from './kit.mjs';
import { writePng } from './png.mjs';

const N = 64, SS = 3;                                   // an icon's side in pixels; samples per pixel side
const GREYS = [58, 92, 128, 160, 185, 212, 240];        // dark to pale; 185 is the grey the game swaps for the material's colour
const LINE = [22, 20, 18];                              // the outline
let L = [-.45, .65, .62]; { const l = Math.hypot(...L); L = L.map(v => v / l); }
const hit = { tone: 1 };                                // set in sdf(): how pale this part is, 0 to 1 (a grip is darker than a blade)
const R2 = Math.SQRT1_2;

/* ---------- the icons: x is across, y is up, z comes towards the viewer; the picture is -1 to 1 each way ---------- */
const sword = (x, y, z) => {
  x /= 1.32; y /= 1.32; z /= 1.32;                      // drawn small, shown large: it fills the square corner to corner
  const u = (x + y) * R2 - .1, v = (y - x) * R2;        // u runs along the sword, towards the top right
  const w = .125 * clamp((1.02 - u) / .3, 0, 1);         // the blade narrows to a point
  let d = Math.max((Math.abs(v) / Math.max(w, .001) + Math.abs(z) / .05 - 1) * Math.min(w, .05) * .7, -.3 - u, u - 1.02) * 1.32; hit.tone = 1;
  let q = sdBox(u + .33, v, z, .05, .3, .06, .02) * 1.32; if (q < d) { d = q; hit.tone = .8; }      // guard
  q = sdCap(u, v, z, -.4, 0, 0, -.68, 0, 0, .06, .055) * 1.32; if (q < d) { d = q; hit.tone = .42; }        // grip
  q = (Math.hypot(u + .76, v, z) - .095) * 1.32; if (q < d) { d = q; hit.tone = .8; }                         // pommel
  return d;
};
const shield = (x, y, z) => {
  const top = .84, wide = .74, w = y > .05 ? wide : wide * Math.sqrt(Math.max(0, 1 - ((.05 - y) / .98) ** 2));   // flat top, sides curving in to a point
  const edge = Math.max(Math.abs(x) - w, y - top, -.93 - y);                                        // how far inside the outline (negative inside)
  const bulge = .16 * (1 - (x / wide) ** 2);
  let d = Math.max(edge * .7, Math.abs(z - bulge) - .04); hit.tone = .78;
  if (edge > -.11) { const q = Math.max(edge * .7, Math.abs(z - bulge - .03) - .05); if (q <= d + .001) { d = q; hit.tone = 1; } }   // a raised rim
  let q = Math.hypot(x, y - .1, (z - .16) * 1.3) - .2; if (q < d) { d = q; hit.tone = 1; }            // the boss
  return d;
};
const AX = [0, .8, .6];                                 // a coin lying flat faces up and a little towards the viewer
let face = false;                                        // true when the last disc was nearest on its flat face, inside the rim
const disc = (x, y, z, cx, cy, cz, ax, r, t) => { const px = x - cx, py = y - cy, pz = z - cz, h = px * ax[0] + py * ax[1] + pz * ax[2], rr = Math.hypot(px - h * ax[0], py - h * ax[1], pz - h * ax[2]); face = rr < r - .09 && h > 0; return Math.max(rr - r, Math.abs(h) - t); };
const coins = (x, y, z) => {
  let d = 9; hit.tone = 1;
  for (let k = 0; k < 4; k++) { const q = disc(x, y, z, -.36 + .04 * (k % 2), -.6 + .15 * k, .11 * k, AX, .42, .058); if (q < d) { d = q; hit.tone = face ? .8 : k % 2 ? .9 : 1; } }   // a stack of four
  let q = disc(x, y, z, .5, -.66, .3, AX, .42, .058); if (q < d) { d = q; hit.tone = face ? .8 : 1; }                                   // one lying beside it
  q = disc(x, y, z, .38, .2, -.25, [.35, .2, .915], .42, .058); if (q < d) { d = q; hit.tone = face ? .8 : 1; }                               // one leaning on the stack
  return d;
};
export const ICONS = { Sword: sword, Shield: shield, Coins: coins };

/** Draws one icon: an N x N RGBA buffer in greys, with a dark outline. */
export function render(sdf) {
  const acc = new Float32Array(N * N * 2), part = new Float32Array(N * N).fill(-1), n2 = SS * SS;
  for (let py = 0; py < N; py++)for (let px = 0; px < N; px++) {
    let v = 0, a = 0;
    for (let sy = 0; sy < SS; sy++)for (let sx = 0; sx < SS; sx++) {
      const x = ((px + (sx + .5) / SS) / N * 2 - 1) * 1.06, y = (1 - (py + (sy + .5) / SS) / N * 2) * 1.06;
      let z = 1.6, found = false; for (let i = 0; i < 90 && z > -1.6; i++) { const d = sdf(x, y, z); if (d < .002) { found = true; break; } z -= d * .8; }
      if (!found) continue;
      sdf(x, y, z); const tone = hit.tone, e = .006;
      let nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e); const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      v += tone * (.38 + .62 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])); a++;
      if (sx === 1 && sy === 1) part[py * N + px] = tone;
    }
    if (a) { acc[(py * N + px) * 2] = v / a; acc[(py * N + px) * 2 + 1] = a / n2; }
  }
  const out = Buffer.alloc(N * N * 4), solid = i => acc[i * 2 + 1] >= .5;
  for (let py = 0; py < N; py++)for (let px = 0; px < N; px++) {
    const i = py * N + px, o = i * 4;
    if (solid(i)) {
      let idx = clamp(Math.round(acc[i * 2] * 7.2 - .6), 0, GREYS.length - 1);
      for (const j of [i + 1, i + N]) if (px < N - 1 && py < N - 1 && solid(j) && part[i] >= 0 && part[j] >= 0 && Math.abs(part[i] - part[j]) > .1) idx = Math.max(0, idx - 2);   // a dark line where two parts meet
      out[o] = out[o + 1] = out[o + 2] = GREYS[idx]; out[o + 3] = 255;
    } else if ((px > 0 && solid(i - 1)) || (px < N - 1 && solid(i + 1)) || (py > 0 && solid(i - N)) || (py < N - 1 && solid(i + N))) { out[o] = LINE[0]; out[o + 1] = LINE[1]; out[o + 2] = LINE[2]; out[o + 3] = 255; }
  }
  return out;
}

/* ---------- a draft to look at: each icon in grey, then in each material's colour, 4 times the size; then all of them at their real size ---------- */
const TINTS = { Sword: [null, '#b0843c', '#6c6c72', '#b4c0cc'], Shield: [null, '#b0843c', '#6c6c72', '#b4c0cc'], Coins: [null, '#d8a838'] };   // grey, bronze, iron, steel; coins: grey, their own yellow (no decision names these colours yet)
const tint = (buf, hexc) => { if (!hexc) return buf; const t = [1, 3, 5].map(i => parseInt(hexc.slice(i, i + 2), 16)), o = Buffer.from(buf); for (let i = 0; i < o.length; i += 4) if (o[i] !== LINE[0] || o[i + 1] !== LINE[1]) for (let k = 0; k < 3; k++) o[i + k] = Math.min(255, Math.round(buf[i + k] * t[k] / 185)); return o; };
if (process.argv.includes('--draft')) {
  const Z = 4, names = Object.keys(ICONS), cols = 4, W = cols * (N * Z + 16) + 16, H = names.length * (N * Z + 16) + 16 + N + 24, sheet = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { sheet[i * 4] = 46; sheet[i * 4 + 1] = 43; sheet[i * 4 + 2] = 39; sheet[i * 4 + 3] = 255; }
  const put = (buf, x0, y0, z) => { for (let y = 0; y < N * z; y++)for (let x = 0; x < N * z; x++) { const s = ((y / z | 0) * N + (x / z | 0)) * 4; if (buf[s + 3]) buf.copy(sheet, ((y0 + y) * W + x0 + x) * 4, s, s + 4); } };
  let small = 16;
  names.forEach((nm, r) => { const t0 = Date.now(), g = render(ICONS[nm]); TINTS[nm].forEach((h, c) => { const b = tint(g, h); put(b, 16 + c * (N * Z + 16), 16 + r * (N * Z + 16), Z); put(b, small, H - N - 12, 1); small += N + 8; }); console.log(`${nm}: ${((Date.now() - t0) / 1000).toFixed(1)} s`); });
  writePng('prototype/shots/icons-draft.png', sheet, W, H); console.log('Draft picture: prototype/shots/icons-draft.png (no icon written)');
}
