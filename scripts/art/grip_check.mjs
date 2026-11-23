// The grip check: where a held thing points in each picture of an animation, drawn over the character, enlarged.
// character.py records, for every held thing, its grip, its tip and its pommel in each picture (<anim>.json "held");
// this draws them: a yellow arrow from the grip to the tip (the blade), a white line from the grip to the pommel, a red
// dot on the grip. Under each picture: its number, and the blade's direction on the screen (0 = right, 90 = up).
//   node scripts/art/grip_check.mjs <store> <part> <out.png> "human:swing" "goblin:swing" [--frames 0,3,5,7] [--k 4]
//       <store>: the intake's store (<store>/<race>/layers, <store>/<race>/renders/<anim>/SE.anim.json). One row per
//       "race:anim", worn with the race's outfit. --frames: which pictures (all 15 if left out). --k: how much bigger (4)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPng } from './png.mjs';
import { RAMP } from './style.mjs';
import { load, rules as raceRules } from './wardrobe.mjs';
import { outfit, palette, lay, paint, outline, shade, frameLayers } from './paperdoll.mjs';
import { canvas, put, write, box, save } from './sheet.mjs';

const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; };
const K = +opt('--k', 4), frames = opt('--frames'), side = opt('--side', 'SE'), [store, part, out, ...rows] = a, W = load(), nn = k => String(k).padStart(2, '0');
if (!rows.length) { console.error('node scripts/art/grip_check.mjs <store> <part> <out.png> "human:swing" ... (see the top of the file)'); process.exit(1); }

/** A line of one colour, `w` pixels thick. */
function line(c, x0, y0, x1, y1, colour, w = 2) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; box(c, Math.round(x - w / 2), Math.round(y - w / 2), w, w, colour); }
}
const shown = rows.map(spec => { const [race, anim] = spec.split(':'), R = W.races[race], rules = raceRules(W, race), mine = W.parts[part];
  const wear = Object.fromEntries(R.outfit.map(o => [W.parts[o].slot, o])); wear[mine.slot] = part;
  const parts = outfit(rules, wear), pal = palette(rules), dir = join(store, race, 'layers');
  const info = JSON.parse(readFileSync(join(store, race, 'renders', anim, `${side}.anim.json`), 'utf8')), spots = info.held?.[part];
  if (!spots) { console.error(`${race} ${anim}: no "held" for ${part} in its anim.json (rendered before character.py recorded it?)`); process.exit(1); }
  const list = frames ? frames.split(',').map(Number) : [...Array(spots.length).keys()];
  const pics = list.map(k => { const L = frameLayers(dir, parts, anim, side, k);
    return { k, body: outline(paint(lay(L), pal)), shadow: shade(parts.map(q => readPng(join(dir, q, `${anim}.${side}.${nn(k)}.shadow.png`)))), spot: spots[k] }; });
  const bb = [1e9, 1e9, -1, -1]; for (const p of pics) { for (const q of [p.body, p.shadow]) for (let i = 0; i < q.width * q.height; i++) if (q.data[i * 4 + 3]) { const x = i % q.width, y = (i / q.width) | 0; bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }
    for (let j = 0; j < 6; j += 2) { bb[0] = Math.min(bb[0], p.spot[j]); bb[2] = Math.max(bb[2], p.spot[j]); bb[1] = Math.min(bb[1], p.spot[j + 1]); bb[3] = Math.max(bb[3], p.spot[j + 1]); } }
  const crop = [Math.floor(bb[0]) - 4, Math.floor(bb[1]) - 4, 0, 0]; crop[2] = Math.ceil(bb[2]) + 5 - crop[0]; crop[3] = Math.ceil(bb[3]) + 5 - crop[1];
  return { race, anim, action: info.action.replace(/_Armature/g, ''), pics, crop }; });
const T = 2, cellW = s => s.crop[2] * K + 6, perRow = s => Math.max(1, Math.floor(1580 / cellW(s)));
const H = 16 + shown.reduce((h, s) => h + 30 + Math.ceil(s.pics.length / perRow(s)) * (s.crop[3] * K + 26), 0) + 40;
const c = canvas(1600, H), pale = [226, 222, 208], dim = [150, 147, 135], grass = RAMP.grass[3];
let y = 16;
for (const s of shown) { write(c, `${s.race}, ${s.anim} (${s.action}), ${part}, ${K} times the game's size`, 16, y, pale, T); y += 30;
  s.pics.forEach((p, n) => { const per = perRow(s), x = 16 + (n % per) * cellW(s), yy = y + ((n / per) | 0) * (s.crop[3] * K + 26);
    box(c, x, yy, s.crop[2] * K, s.crop[3] * K, grass); put(c, p.shadow, x, yy, K, s.crop); put(c, p.body, x, yy, K, s.crop);
    const at = (j) => [x + (p.spot[j] - s.crop[0]) * K, yy + (p.spot[j + 1] - s.crop[1]) * K], [gx, gy] = at(0), [tx, ty] = at(2), [px, py] = at(4);
    line(c, gx, gy, px, py, [250, 250, 250]); line(c, gx, gy, tx, ty, [255, 214, 40], 3);
    const ang = Math.atan2(gy - ty, tx - gx), hx = Math.cos(ang), hy = -Math.sin(ang);          // the arrow's head
    for (const turn of [2.6, -2.6]) { const ex = tx + 12 * (hx * Math.cos(turn) - hy * Math.sin(turn)), ey = ty + 12 * (hx * Math.sin(turn) + hy * Math.cos(turn)); line(c, tx, ty, ex, ey, [255, 214, 40], 3); }
    box(c, Math.round(gx) - 3, Math.round(gy) - 3, 7, 7, [230, 40, 40]);
    write(c, `${p.k}: blade ${Math.round(((ang * 180 / Math.PI) + 360) % 360)}`, x, yy + s.crop[3] * K + 4, dim, T); });
  y += Math.ceil(s.pics.length / perRow(s)) * (s.crop[3] * K + 26); }
write(c, 'yellow arrow: grip to tip (the blade). white: grip to pommel. red: the grip. blade: its direction on the screen, 0 = right, 90 = up', 16, y + 8, dim, T);
save(c, out); console.log(`${out}: ${shown.map(s => `${s.race} ${s.anim} ${s.pics.length} pictures`).join(', ')}`);
