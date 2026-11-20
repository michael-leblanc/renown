// Looks at Creator parts from all 8 sides, enlarged, before an item picture is drawn from them.
// A part's sheet is 8 rows (E, SE, S, SW, W, NW, N, NE) of 128 px frames; this cuts one frame from each row and lays
// the 8 out in two rows of 4, a block per part, in one picture. It also prints each side's size and the part's grey levels
// (the numbers a repaint in reskin.mjs is cut on).
//   node scripts/art/dirs.mjs <part sheet .png>... [--body <NakedBody sheet .png>] [--frame 0] [--out scripts/art/out/dirs.png]
//   e.g. node scripts/art/dirs.mjs game/client/art/creator/Melee2/Idle.png --body game/client/art/creator/NakedBody/Idle.png
// --body draws the body faintly behind the part, to see which end is in the hand. Nothing but the picture is written (scripts/art/out/ is git-ignored).
import { readPng, writePng } from './png.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const files = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
if (!files.length) { console.error('Give at least one part sheet, e.g. game/client/art/creator/Melee2/Idle.png'); process.exit(1); }
const F = 128, DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'], frame = +flag('--frame', 0), out = flag('--out', 'scripts/art/out/dirs.png');
const body = flag('--body', '') ? readPng(flag('--body', '')) : null;
const parts = files.map(f => ({ name: f.replace(/\/Idle\.png$/, '').replace(/\.png$/, '').split('/').pop(), ...readPng(f) }));
const at = (p, row, x, y) => (row * F + y) * p.width * 4 + (frame * F + x) * 4;

// the box that holds every part (and the body) on every side, so all cells are the same and nothing shifts between sides
let x0 = F, x1 = 0, y0 = F, y1 = 0;
for (const p of body ? [...parts, body] : parts) for (let r = 0; r < 8; r++) for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (p.data[at(p, r, x, y) + 3] > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(F - 1, x1 + 2); y1 = Math.min(F - 1, y1 + 2);
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, Z = Math.max(3, Math.min(8, Math.floor(1800 / (4 * cw)))), GAP = 6, LBL = 22;
const W = GAP + 4 * (cw * Z + GAP), BH = 2 * (ch * Z + GAP) + LBL, H = GAP + parts.length * BH, img = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 46; img[i * 4 + 1] = 43; img[i * 4 + 2] = 39; img[i * 4 + 3] = 255; }
const rect = (X, Y, w, h, c) => { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) { const o = (y * W + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; } };
const FONT = { E: '111,100,110,100,111', S: '111,100,111,001,111', W: '101,101,101,111,101', N: '111,101,101,101,101' };
const text = (s, X, Y, c) => [...s].forEach((chr, k) => FONT[chr].split(',').forEach((row, j) => [...row].forEach((bit, i) => { if (bit === '1') rect(X + k * 12 + i * 3, Y + j * 3, 3, 3, c); })));

parts.forEach((p, pi) => {
  const grey = new Map(), sizes = [];
  for (let r = 0; r < 8; r++) {
    const cx = GAP + (r % 4) * (cw * Z + GAP), cy = GAP + pi * BH + (r >> 2) * (ch * Z + GAP);
    rect(cx, cy, cw * Z, ch * Z, [70, 96, 44]);
    let bx0 = F, bx1 = 0, by0 = F, by1 = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      let c = [70, 96, 44];
      if (body) { const o = at(body, r, x0 + x, y0 + y), a = body.data[o + 3] / 255 * .35; c = c.map((v, k) => v * (1 - a) + body.data[o + k] * a); }
      const o = at(p, r, x0 + x, y0 + y), a = p.data[o + 3] / 255;
      if (a > .12) { c = c.map((v, k) => v * (1 - a) + p.data[o + k] * a); bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); if (a > .9) grey.set(p.data[o + 1], (grey.get(p.data[o + 1]) || 0) + 1); }
      rect(cx + x * Z, cy + y * Z, Z, Z, c.map(Math.round));
    }
    text(DIRS[r], cx + 4, cy + 4, [236, 232, 214]);
    sizes.push(`${DIRS[r]} ${bx1 - bx0 + 1}x${by1 - by0 + 1}`);
  }
  const top = [...grey].sort((a, b) => b[1] - a[1]).slice(0, 8).sort((a, b) => a[0] - b[0]).map(([g, n]) => `${g} (${n})`).join(', ');
  console.log(`${p.name}: ${sizes.join(', ')} px\n  greys, dark to pale (pixels over the 8 sides): ${top}`);
});
writePng(out, img, W, H);
console.log(`Picture: ${out}, ${Z} times the size; each block is a part: top row E SE S SW, bottom row W NW N NE`);
