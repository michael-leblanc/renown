// Checks the colour swap of D225 in Godot itself: a held part's sheet in iron's colours, drawn through swap.gdshader with a metal's
// six colours, against the same sheet with that metal painted in (reskin.mjs --metal). They must be the same pixels.
//   node scripts/art/swap_check.mjs <Creator folder> <work folder> [--only Melee2,Melee10] [--anims Attack1,Walk]
// <Creator folder> is the Creator's own Spritesheets folder (see reskin.mjs). Runs reskin.mjs three times into <work folder>
// (iron's colours, then bronze and steel painted in), then the small Godot project in scripts/art/swap_check/ draws every sheet
// through the shader and compares. Prints one line per part and metal, then PASS or FAIL. Every animation unless --anims names some.
// It draws, so it needs a screen: on Linux with none it runs under xvfb-run. <work folder> holds bought art repainted: git-ignored
// folders only. swap.gdshader is the shader the game's client uses for held parts.
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { MATCHED, METAL, METALS, IN_METALS } from './items.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const [CRE, WORK] = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
if (!CRE || !WORK) { console.error('Usage: node scripts/art/swap_check.mjs <Creator folder> <work folder> [--only parts] [--anims Attack1,Walk]'); process.exit(1); }
const HERE = dirname(fileURLToPath(import.meta.url)), only = flag('--only', ''), anims = flag('--anims', ''), others = METALS.filter(m => m !== 'iron');
for (const metal of ['', ...others]) {
  const r = spawnSync('node', [join(HERE, 'reskin.mjs'), CRE, WORK, ...(metal ? ['--metal', metal] : []), ...(only ? ['--only', only] : [])], { encoding: 'utf8' });
  if (r.status) { console.error(r.stdout + r.stderr); process.exit(1); }
}
const jobs = [];
for (const m of MATCHED.filter(m => IN_METALS.includes(m.kind) && existsSync(join(WORK, m.part)) && (!only || only.split(',').includes(m.part))))
  for (const f of readdirSync(join(WORK, m.part)).filter(f => f.endsWith('.png') && (!anims || anims.split(',').includes(f.slice(0, -4)))).sort())
    for (const metal of others) jobs.push({ name: `${m.name}, ${metal}`, sheet: resolve(WORK, m.part, f), want: resolve(WORK, `${m.part}-${metal}`, f), to: METAL[metal] });
if (!jobs.length) { console.error(`No part that comes in metals found in ${CRE}.`); process.exit(1); }
const file = resolve(WORK, 'swap_check.json'); writeFileSync(file, JSON.stringify({ from: METAL.iron, jobs }));
const godot = [join(HERE, '..', 'godot.sh'), '--path', join(HERE, 'swap_check'), '--', file];
const noScreen = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
const r = noScreen ? spawnSync('xvfb-run', ['-a', ...godot], { encoding: 'utf8' }) : spawnSync(godot[0], godot.slice(1), { encoding: 'utf8' });
if (r.error) { console.error(noScreen ? 'No screen and no xvfb-run: Godot cannot draw here.' : String(r.error)); process.exit(1); }
const sums = {}; let seen = 0;
for (const line of r.stdout.split('\n')) { const m = line.match(/^(.+): (\d+) of (\d+) drawn pixels differ$/); if (!m) continue; seen++; const s = sums[m[1]] ??= { sheets: 0, differ: 0, drawn: 0, bad: 0 }; s.sheets++; s.differ += +m[2]; s.drawn += +m[3]; if (+m[2] || !+m[3]) s.bad++; }
for (const [name, s] of Object.entries(sums)) console.log(`${name}: ${s.differ} of ${s.drawn} drawn pixels differ on ${s.sheets} sheets`);
const pass = seen === jobs.length && Object.values(sums).every(s => !s.bad) && r.status === 0;
if (!pass && seen !== jobs.length) console.error(`Godot compared ${seen} of ${jobs.length} sheets:\n${(r.stdout + r.stderr).split('\n').filter(l => /error|SHADER/i.test(l)).slice(0, 12).join('\n')}`);
console.log(pass ? 'PASS' : 'FAIL'); process.exit(pass ? 0 : 1);
