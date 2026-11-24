// The quick look: what Michael says yes or no to before any full render (Michael, 2026-11-24: speed up the process).
// ONE picture of each animation, each outfit rendered whole in one go (no layer per part), at a few samples, facing SE,
// finished and drawn as the game draws it (ramps, colours, outline), in each metal asked, at 1x and larger, on one sheet.
// Seconds a picture, where the intake's full renders take minutes a part: those come only after his yes.
//   node scripts/art/preview.mjs --outfits "both|over=plate_chest,shoulders=plate_pauldrons;one|over=plate_chest,shoulders=plate_pauldron"
//        [--races human,orc,goblin] [--anims idle,swing] [--metals iron,steel] [--hold plain_sword] [--samples 16]
//        [--out <file.png>] [--work <folder>] [--title "..."] [--clips]
//   --outfits  "label|slot=part,...;..." worn over the race's own outfit (the wardrobe's races.<race>.outfit). "goblin:label|..."
//              is for that race only. An outfit with a part that is not for a race is left out for it.
//   --hold     a weapon in the right hand in the animations that need one (swing), as the intake gives it
//   --clips    rigid armour (sources.<id>.fits) checked against each race's body and each other through the animations
//              (armour_clips.py, every picture of each, not only the one shown): the worst crossings, on the sheet
//   --metals   each picture drawn once a metal (the "metal" colour; one picture, recoloured: no new render)
//   frames, samples and the enlargement are the wardrobe's render.preview. Rigid armour made from one model
//   (sources.<id>.fits) is fitted first when missing or older than the model (armour_fit.mjs).
// Writes <out> (the sheet: 1x then enlarged) and prints one line per picture; the renders stay in <work>.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, real, live, rules as raceRules } from './wardrobe.mjs';
import { finishLayer, outfit, palette, lay, paint, outline } from './paperdoll.mjs';
import { canvas, put, write, save, textWidth } from './sheet.mjs';
import { ensureFits } from './armour_fit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
const W = load(), P = W.render.preview, assets = opt('--assets', process.env.RENOWN_ASSETS || '/mnt/project-files/characters/models');
const races = opt('--races', 'human,orc,goblin').split(','), anims = opt('--anims', 'idle,swing').split(','), metals = opt('--metals', 'iron,steel').split(',');
const samples = opt('--samples', String(P.samples)), holdId = opt('--hold'), side = 'SE', K = P.scale;
const work = opt('--work', '/tmp/renown-preview'), out = opt('--out', join(work, 'preview.png'));
const spec = opt('--outfits'); if (!spec) { console.error('preview.mjs --outfits "label|slot=part,...;..."  (see the top of the file)'); process.exit(1); }
const outfits = spec.split(';').filter(Boolean).map(o => { const [head, wear] = o.split('|'), [r, label] = head.includes(':') ? head.split(':') : [null, head];
  return { race: r, label, wear: Object.fromEntries((wear || '').split(',').filter(Boolean).map(x => x.split('='))) }; });
const nn = k => String(k).padStart(2, '0'), t0 = Date.now();

// 1 fit what rigid armour is missing
for (const [src, S] of real(W.sources)) if (S.fits) ensureFits(W, src, { races: races.filter(r => S.fits.races[r]), assets, say: t => console.log(t) });

// 2 render: per race and animation, one Blender run with every outfit as its own whole view, one picture
const jobs = [];
for (const race of races) {
  const R = W.races[race], rules = raceRules(W, race), mine = Object.fromEntries(Object.entries(W.parts).filter(([k, p]) => typeof p === 'object' && live(p) && (p.races === 'all' || p.races?.includes(race))));
  const base = Object.fromEntries(R.outfit.map(id => [W.parts[id].slot, id]));
  const fits = outfits.filter(o => (!o.race || o.race === race) && Object.values(o.wear).every(id => mine[id]));
  if (!fits.length) continue;
  for (const anim of anims) {
    const A = W.animations[anim], f = P.frames[anim] ?? 0, dir = join(work, race, anim); mkdirSync(dir, { recursive: true });
    const hold = holdId && A.for && mine[holdId] ? holdId : null;
    const views = fits.map((o, i) => ({ o, name: `whole${i}`, parts: outfit(rules, { ...base, ...o.wear, ...(hold ? { [W.parts[hold].slot]: hold } : {}) }) }));
    const args = [join(HERE, 'character.py')]; for (const m of R.render.models) args.push('--model', join(assets, m));
    args.push(...R.render.args.filter((x, i, l) => x !== '--clips' && l[i - 1] !== '--clips').map(s => s.replaceAll('<assets>', assets)), ...(A.args || []), '--turn', String(W.render.turn[side]));
    for (const [k, p] of Object.entries(mine)) if (p.meshes) args.push('--part', `${k}=${p.meshes}`);
    if (hold) { const p = mine[hold]; if (p.gear) args.push('--gear', p.gear); else args.push('--hold', JSON.stringify({ name: hold, file: join(assets, W.sources[p.source].folder, p.file), bone: p.bone || 'hand_r', unit_tiles: W.render.gear_unit_tiles * (R.gear_scale ?? 1), ...(p.hold || {}) })); }
    args.push('--anim', join(assets, W.sources[A.source].folder, W.sources[A.source].file), '--action', A.action, '--frames', String(W.render.pictures), '--take', `${f}-${f}`, '--samples', samples, '--point', '--quick');
    for (const v of views) args.push('--view', `${v.name}=${v.parts.join('+')}`);
    args.push('--out', join(dir, side));
    jobs.push({ race, anim, f, dir, views, rules, args });
  }
}
const run = j => new Promise(done => { const p = spawn('python3.11', j.args, { cwd: '/tmp' }); let log = ''; p.stdout.on('data', d => (log += d)); p.stderr.on('data', d => (log += d)); p.on('close', () => done({ j, log })); });
const ran = []; for (let i = 0; i < jobs.length; i += 4) ran.push(...await Promise.all(jobs.slice(i, i + 4).map(run)));

// clipping of the rigid armour, over every picture of each animation (armour_clips.py: seconds)
const BODY = { human: 'quaternius_base/Superhero_Male_FullBody.gltf', goblin: 'goblin_simple/goblin_ours.glb', orc: 'orc_model_1/orc_ours.glb' };
const clipLines = [];
if (a.includes('--clips')) for (const [src, S] of real(W.sources)) if (S.fits) for (const race of races.filter(r => S.fits.races[r])) {
  const pieces = Object.keys(S.fits.pieces).map(k => `${k}=${join(assets, S.folder, `${k}_${race}.glb`)}`).join(';');
  const an = anims.concat(anims.includes('walk') ? [] : ['walk']).map(k => { const A = W.animations[k], F = W.sources[A.source]; return `${k}=${F.folder}/${F.file}:${A.action}`; }).join(';');
  const r = spawnSync('python3.11', [join(HERE, 'armour_clips.py'), '--body', BODY[race], '--pieces', pieces, '--anims', an, '--assets', assets], { encoding: 'utf8', cwd: '/tmp' });
  for (const l of (r.stdout || '').split('\n').filter(l => /^\w+\s+\w+\s+into the body/.test(l))) {
    const [, anim, piece] = l.match(/^(\w+)\s+(\w+)/), body = +(l.match(/at most (\d+) face/)?.[1] || 0), near = l.match(/near (\w+)/)?.[1], others = [...l.matchAll(/into (\w+): at most (\d+)/g)].filter(m => +m[2] > 0).map(m => `${m[1]} ${m[2]}`);
    clipLines.push(`${race} ${anim} ${piece}: body ${body}${near ? ' (' + near + ')' : ''}${others.length ? ', ' + others.join(', ') : ''}`); }
}
if (clipLines.length) { console.log('clips (face crossings, worst picture):'); for (const l of clipLines) console.log('  ' + l); }

// 3 finish and draw: each whole view as one layer, painted in each metal, outlined
const cells = [];
for (const { j, log } of ran) for (const v of j.views) {
  const b = join(j.dir, `${side}.${v.name}.${nn(j.f)}`);
  if (!existsSync(`${b}.depth.png`)) { console.error(`${j.race} ${j.anim} ${v.o.label}: not rendered\n${log.split('\n').filter(l => /Error|error|no part|no object/.test(l)).slice(-3).join('\n') || log.slice(-500)}`); process.exit(1); }
  const L = finishLayer(b, j.rules), laid = lay([L]);
  for (const m of metals) { const pick = j.rules.colours.metal?.includes(m) ? { metal: m } : {};
    cells.push({ race: j.race, label: v.o.label, anim: j.anim, metal: m, parts: v.parts, pic: outline(paint(laid, palette(j.rules, pick))) }); }
}

// 4 the sheet: one row per race and outfit, one column per animation and metal; 1x, then K times
const rows = [...new Set(cells.map(c => `${c.race} ${c.label}`))], cols = [...new Set(cells.map(c => `${c.anim} ${c.metal}`))];
let box = [1e9, 1e9, -1, -1];
for (const c of cells) { const { width: w, height: h, data } = c.pic; for (let i = 0; i < w * h; i++) if (data[i * 4 + 3]) { const x = i % w, y = (i / w) | 0; box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
const cw = box[2] - box[0] + 5, ch = box[3] - box[1] + 5, crop = [box[0] - 2, box[1] - 2, cw, ch], left = 150, top = 40, grass = [86, 120, 58];
const title = opt('--title', `preview: ${outfits.map(o => o.label).join(', ')}, ${samples} samples, ${side}, one picture a animation`);
const H1 = top + rows.length * (ch + 14), H2 = H1 + 40 + rows.length * (ch * K + 14) + 10, C = canvas(Math.max(left + cols.length * Math.max(cw * K + 8, 110), 640), H2 + (clipLines.length ? 22 + clipLines.length * 11 : 0));
write(C, title, 8, 8); write(C, '1x (the game\'s size)', 8, 24, [150, 150, 140]);
const step = k => Math.max(cw * k + 8, k === 1 ? 74 : 110);
const draw = (y0, k) => rows.forEach((r, ri) => { write(C, r, 8, y0 + ri * (ch * k + 14) + 4);
  cols.forEach((col, ci) => { const c = cells.find(c => `${c.race} ${c.label}` === r && `${c.anim} ${c.metal}` === col); if (!c) return;
    const x = left + ci * step(k), y = y0 + ri * (ch * k + 14);
    for (let yy = 0; yy < ch * k; yy++) for (let xx = 0; xx < cw * k; xx++) C.data.set([...grass, 255], ((y + yy) * C.width + x + xx) * 4);
    put(C, c.pic, x, y, k, crop); if (ri === 0) write(C, k === 1 ? col.split(' ').map(w => w.slice(0, 5)).join(' ') : col, x, y0 - 12, [150, 150, 140]); }); });
draw(top, 1); write(C, `${K}x`, 8, H1 + 6, [150, 150, 140]); draw(H1 + 40, K);
if (clipLines.length) { write(C, 'clipping, face crossings in the worst picture of each animation (armour_clips.py):', 8, H2); clipLines.forEach((l, i) => write(C, l, 8, H2 + 14 + i * 11, [190, 186, 170])); }
mkdirSync(dirname(out), { recursive: true }); save(C, out);
console.log(`${out}: ${rows.length} rows x ${cols.length} columns (${cells.length} pictures from ${jobs.length} renders) in ${Math.round((Date.now() - t0) / 1000)} s`);
