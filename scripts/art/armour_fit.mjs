// Rigid armour from one model, for every race, in one command: each piece (a chest plate, a pauldron) is cut out of the
// model and hung on one bone of the race's skeleton by fit_rigid.py, as the wardrobe's recipe says (sources.<id>.fits).
//   node scripts/art/armour_fit.mjs <source> [--race orc] [--piece pchest] [--force] [--assets <models folder>]
//     makes <assets>/<folder>/<piece>_<race>.glb when it is missing or older than the model (--force: always), and prints
//     one line a piece. The intake and preview.mjs call ensureFits() before they render, so a changed recipe or a new
//     model is picked up by deleting the piece (or --force here).
// Recipe: fits.model (in the source's folder), fits.common and fits.pieces.<piece> (fit_rigid.py's options), with {name}
// filled from fits.races.<race>. An option whose value names something that race does not give is left out (an orc's
// --shift, which the human does not need).
import { spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { load } from './wardrobe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = process.env.RENOWN_ASSETS || '/mnt/project-files/characters/models';

/** The fit_rigid.py options of one piece for one race, its {names} filled; null when the race has no line. */
export function fitArgs(F, piece, race) {
  const vars = F.races[race]; if (!vars) return null;
  const toks = [...F.common, ...F.pieces[piece]], out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], v = toks[i + 1];
    if (t.startsWith('--') && v !== undefined && !v.startsWith('--')) {
      const names = [...v.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      if (names.every(n => n in vars)) out.push(t, v.replace(/\{(\w+)\}/g, (_, n) => vars[n]));
      i++;
    } else out.push(t);
  }
  return out;
}

/** Makes what is missing or out of date. Returns [{ piece, race, file, made, why, out }]. Throws when fit_rigid.py fails. */
export function ensureFits(W, source, { races, pieces, force = false, assets = ASSETS, say = console.log } = {}) {
  const S = W.sources[source], F = S?.fits; if (!F) return [];
  const model = join(assets, S.folder, F.model);
  if (!existsSync(model)) throw new Error(`${source}: the model ${model} is not there`);
  const done = [];
  for (const race of races || Object.keys(F.races)) for (const piece of pieces || Object.keys(F.pieces)) {
    const args = fitArgs(F, piece, race); if (!args) continue;
    const file = join(assets, S.folder, `${piece}_${race}.glb`);
    const why = force ? 'asked' : !existsSync(file) ? 'missing' : statSync(model).mtimeMs > statSync(file).mtimeMs ? 'model is newer' : null;
    if (!why) { done.push({ piece, race, file, made: false }); continue; }
    const t0 = Date.now(), r = spawnSync('python3.11', [join(HERE, 'fit_rigid.py'), '--model', model, '--race', race, '--assets', assets, '--out', file, ...args], { encoding: 'utf8', cwd: '/tmp' });
    const out = (r.stdout || '') + (r.stderr || '');
    if (!existsSync(file) || statSync(file).mtimeMs < t0 || !/^wrote /m.test(out)) throw new Error(`fit ${piece} for ${race} failed:\n${out.split('\n').filter(l => /Error|error|Trace/.test(l)).slice(-4).join('\n') || out.slice(-600)}`);
    const placed = out.split('\n').find(l => l.startsWith('placed:')) || '';
    say(`fit ${piece} for ${race} (${why}) in ${Math.round((Date.now() - t0) / 1000)} s: ${placed.replace('placed: ', 'from ')}`);
    done.push({ piece, race, file, made: true, why });
  }
  return done;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
  const source = a[0]; if (!source || source.startsWith('--')) { console.error('node scripts/art/armour_fit.mjs <source> [--race orc] [--piece pchest] [--force]'); process.exit(1); }
  const W = load();
  if (!W.sources[source]?.fits) { console.error(`${source}: no fits in the wardrobe's sources`); process.exit(1); }
  const race = opt('--race'), piece = opt('--piece');
  try {
    const r = ensureFits(W, source, { races: race && race.split(','), pieces: piece && piece.split(','), force: a.includes('--force'), assets: opt('--assets', ASSETS) });
    const kept = r.filter(x => !x.made).length; if (kept) console.log(`${kept} piece(s) already up to date`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
