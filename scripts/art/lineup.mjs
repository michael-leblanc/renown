// The lineup: every held thing of a batch side by side, worn by every race, in the guard and at the height of the swing,
// numbered, so Michael can approve or drop each one in one look. Drawn from the intake's layer pictures (nothing is rendered).
//   node scripts/art/lineup.mjs <store> <out.png> [--parts a,b,c] [--guard 7] [--swing 2] [--k 3] [--start 1]
//       <store>: the intake's store (<store>/<race>/layers). --parts: which (left out: every weapon and shield in the wardrobe
//       that is not retired and has layers there, weapons first). --guard, --swing: which picture of each (0 to 14).
//       --k: how many times the game's size. --start: the first number (a second sheet goes on counting). A shield is shown from every side it was rendered on (SE: the shield arm is
//       the far one, so its back shows; SW: its face).
// Prints the numbered list it drew; the numbers are the ones on the sheet.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readPng } from './png.mjs';
import { RAMP } from './style.mjs';
import { load, real, held, live, wears, rules as raceRules } from './wardrobe.mjs';
import { outfit, palette, lay, paint, outline, shade, frameLayers } from './paperdoll.mjs';
import { canvas, put, write, lines, box, save } from './sheet.mjs';

const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; };
const K = +opt('--k', 3), first = +opt('--start', 1), G = +opt('--guard', 7), S = +opt('--swing', 2), only = opt('--parts'), [store, out] = a, W = load(), nn = k => String(k).padStart(2, '0');
if (!store || !out) { console.error('node scripts/art/lineup.mjs <store> <out.png> [--parts a,b] [--guard 7] [--swing 2] [--k 3]'); process.exit(1); }
const races = real(W.races).map(([r]) => r), sides = W.render.sides;
const has = (race, p, anim, side) => existsSync(join(store, race, 'layers', p, `${anim}.${side}.${nn(0)}.png`));
const parts = (only ? only.split(',') : real(W.parts).filter(([, p]) => held(p) && live(p) && p.file).sort(([, x], [, y]) => (x.kind === 'shield') - (y.kind === 'shield')).map(([k]) => k))
  .filter(p => races.some(r => has(r, p, 'guard', 'SE')));
if (!parts.length) { console.error(`no weapon or shield has guard layers in ${store}`); process.exit(1); }

/** One picture: the race's outfit with the part, painted, outlined, with its shadow; and its crop box. */
function picture(race, p, anim, side, k) {
  const R = W.races[race], rules = raceRules(W, race), wear = Object.fromEntries(R.outfit.map(o => [W.parts[o].slot, o]));
  wear[W.parts[p].slot] = p;
  const worn = outfit(rules, wear), dir = join(store, race, 'layers');
  return { body: outline(paint(lay(frameLayers(dir, worn, anim, side, k)), palette(rules))), shadow: shade(worn.map(q => readPng(join(dir, q, `${anim}.${side}.${nn(k)}.shadow.png`)))) };
}
const bound = (bb, q) => { for (let i = 0; i < q.width * q.height; i++) if (q.data[i * 4 + 3]) { const x = i % q.width, y = (i / q.width) | 0; bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); } };

// every cell: a part, a race, a side, guard or swing
const rows = parts.map((p, n) => { const cells = [];
  for (const race of races) { if (!wears(W.parts[p], race)) continue;
    for (const side of sides.filter(s => has(race, p, 'guard', s) && has(race, p, 'swing', s)).sort((x, y) => (y === 'SE') - (x === 'SE')))
      for (const [anim, k] of [['guard', G], ['swing', S]]) cells.push({ race, side, anim, k, ...picture(race, p, anim, side, k) }); }
  return { n: n + first, p, part: W.parts[p], cells }; });
const crop = {};                                             // one crop per race and side, the same in every row
for (const r of rows) for (const c of r.cells) { const key = `${c.race}.${c.side}`, bb = crop[key] || (crop[key] = [1e9, 1e9, -1, -1]); bound(bb, c.body); bound(bb, c.shadow); }
for (const [key, bb] of Object.entries(crop)) crop[key] = [bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 5, bb[3] - bb[1] + 5];

const T = 2, pale = [226, 222, 208], dim = [150, 147, 135], grass = RAMP.grass[3], gap = 6;
const label = c => `${c.race} ${c.side} ${c.anim}`, cellW = c => Math.max(crop[`${c.race}.${c.side}`][2] * K, label(c).length * 6 * T), rowH = r => Math.max(...r.cells.map(c => crop[`${c.race}.${c.side}`][3] * K));
const wide = Math.max(1200, ...rows.map(r => 16 + r.cells.reduce((w, c) => w + cellW(c) + gap, 0) + 16));
const text = r => lines(`${r.n}. ${r.p}: ${r.part.what || ''} Status: ${r.part.status}.`, wide - 32, T);
const head = [`One-handed weapons and shields, human and goblin, ${K} times the game's size. Each: the guard (picture ${G}) and the swing at the strike (picture ${S}); a shield also from SW, where its face shows.`,
  'To drop one: node scripts/art/intake.mjs <name> --status rejected. To approve: --status approved. Or reply with the numbers.'].flatMap(t => lines(t, wide - 32, T));
const H = 16 + head.length * 10 * T + 12 + rows.reduce((h, r) => h + text(r).length * 10 * T + 4 + 10 * T + rowH(r) + 18, 0) + 8;
const c = canvas(wide, H);
let y = 16; for (const l of head) { write(c, l, 16, y, dim, T); y += 10 * T; } y += 12;
for (const r of rows) { for (const l of text(r)) { write(c, l, 16, y, pale, T); y += 10 * T; } y += 4;
  let x = 16; const top = y + 10 * T;
  for (const cell of r.cells) { const cr = crop[`${cell.race}.${cell.side}`], w = cellW(cell), px = x + ((w - cr[2] * K) >> 1);
    write(c, label(cell), x, y, dim, T);
    box(c, x, top, w, cr[3] * K, grass); put(c, cell.shadow, px, top, K, cr); put(c, cell.body, px, top, K, cr); x += w + gap; }
  y = top + rowH(r) + 18; }
save(c, out);
console.log(`${out}: ${rows.length} held things`); for (const r of rows) console.log(`  ${r.n}. ${r.p} (${r.part.kind}, ${r.part.status}): ${r.cells.length} pictures`);
