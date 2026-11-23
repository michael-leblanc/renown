// Turns a 3D model (.glb, .gltf, .fbx, .obj) into Renown sprites in the tileset's format, through Blender.
// Blender only renders the model's passes (bake3d/blender.py); the shading, the flat tones, the palette, the shadow and the
// sprite format are done here, the kit's way, so a baked model sits beside the tileset and the code-made props.
//
//   node scripts/art/bake3d.mjs "Street Lantern A1" --draft --beside "Chest A1_S" [--with-character]
//   node scripts/art/bake3d.mjs "Street Lantern A1"                 writes the sprites and shadows into game/client/art/made/
//   node scripts/art/bake3d.mjs all                               every model in scripts/art/models.json
//   node scripts/art/bake3d.mjs "Name A1" --model path.glb [--height 1.2 | --scale 0.78] [--yaw 90] [--origin model]   a model not (yet) in models.json
//
// Models are listed in scripts/art/models.json (where the file is, where it came from, its licence, its size and turn).
// Model files are not committed: they live in art-source/models/ (git-ignored), and a listed model with a url is
// downloaded there the first time. Blender: the `blender` program (or $BLENDER), else Python's `bpy` module
// (pip install bpy). The other flags are the kit's: --views, --ss, --out, --draft, --beside, --with-character.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, RAMP, oklab, clamp, PPU, AX, AY, SIZE, SUN, VIEW } from './kit.mjs';
import { readExr } from './exr.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIST = join(HERE, 'models.json');
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };

/* ---------- the colours: the kit's ramps, so a baked model uses the tileset's colours ---------- */
// The kit picks a ramp by material and a tone by light. A model has no materials the kit knows, so each pixel's ramp is the one
// nearest its own colour in hue and saturation (lightness counts less: it tells pale stone from dark iron); a pixel then takes the ramp most of its neighbours have, so grain
// in a texture does not speckle a board with stone, and its tone
// comes from the light, the kit's way, nudged by how pale or dark the model's colour is there (so its texture still shows).
const RAMPS = Object.entries(RAMP).map(([name, cs]) => { const lab = cs.map(oklab); return { name, cs, lab, L: lab.reduce((s, x) => s + x[0], 0) / lab.length, a: lab.reduce((s, x) => s + x[1], 0) / lab.length, b: lab.reduce((s, x) => s + x[2], 0) / lab.length }; });
const KIT_EXTRA = ['canvas', 'fire', 'lit', 'leather', 'boards', 'earth', 'straw'];       // as in kit.mjs: used only when a model asks for them
function ramps(names) {
  const want = names === 'all' || !names ? RAMPS.filter(r => !KIT_EXTRA.includes(r.name) || names === 'all') : RAMPS.filter(r => names.includes(r.name));
  if (!want.length) { console.error(`bake3d: palette names no ramp. The kit's ramps: ${RAMPS.map(r => r.name).join(', ')}`); process.exit(1); }
  return want;
}
const pickRamp = (rs, lab) => { let best = 1e9, bi = 0; rs.forEach((r, k) => { const d = (r.a - lab[1]) ** 2 + (r.b - lab[2]) ** 2 + .005 * (r.L - lab[0]) ** 2; if (d < best) { best = d; bi = k; } }); return rs[bi]; };
const srgb = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - .055);

/* ---------- Blender ---------- */
function blender(opt) {
  const script = join(HERE, 'bake3d', 'blender.py'), arg = JSON.stringify(opt);
  const tries = [[process.env.BLENDER || 'blender', ['-b', '--factory-startup', '-P', script, '--', arg]], ['python3', [script, arg]]];
  let last;
  for (const [cmd, args] of tries) {
    try { execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); return; }
    catch (e) {
      if (e.code === 'ENOENT') continue;               // no such program: try the next way
      last = e; const err = String(e.stderr || '') + String(e.stdout || '');
      if (cmd === 'python3' && /No module named 'bpy'/.test(err)) continue;
      console.error(err.split('\n').filter(l => /Error|bake3d|Traceback|line \d/.test(l)).slice(-12).join('\n')); process.exit(1);
    }
  }
  console.error('bake3d: no Blender found. Install Blender (the `blender` program, or set $BLENDER to it), or `pip install bpy`.' + (last ? `\n${last.message}` : ''));
  process.exit(1);
}

/* ---------- from Blender's passes to a sprite and its shadow ---------- */
function bake(spec, view, ss, dir) {
  const e = readExr(join(dir, `${view}.exr`)), g = readExr(join(dir, `${view}-ground.exr`)), N = SIZE * ss;
  const ch = (img, pass, c) => { const k = Object.keys(img.channels).find(n => n.endsWith(`.${pass}.${c}`)); if (!k) throw new Error(`bake3d: no ${pass}.${c} in Blender's output`); return img.channels[k]; };
  const A = ch(e, 'Combined', 'A'), [CR, CG, CB] = 'RGB'.split('').map(c => ch(e, 'Diffuse Color', c)), [DR, DG, DB] = 'RGB'.split('').map(c => ch(e, 'Diffuse Direct', c));
  const AO = ch(e, 'Ambient Occlusion', 'R'), NZ = ch(e, 'Normal', 'Z'), Z = ch(e, 'Depth', 'Z');
  const GA = ch(g, 'Combined', 'A'), GD = ch(g, 'Diffuse Direct', 'R');
  // the sun's full strength on flat ground, from the ground pass's brightest pixel: lit = 1, in shade = 0
  let k = 0; for (let i = 0; i < GD.length; i++) if (GA[i] > .5 && GD[i] > k) k = GD[i];
  const up = Math.max(.05, SUN[1]), full = k / up;
  const rs = ramps(spec.palette), tone = spec.tone || 0, detail = spec.detail ?? .5;
  const lab = new Float32Array(SIZE * SIZE * 3), val = new Float32Array(SIZE * SIZE), cover = new Float32Array(SIZE * SIZE), shad = new Float32Array(SIZE * SIZE);
  const nUp = new Float32Array(SIZE * SIZE), dep = new Float32Array(SIZE * SIZE).fill(Infinity), mid = ss >> 1, n2 = ss * ss;
  for (let py = 0; py < SIZE; py++)for (let px = 0; px < SIZE; px++) {
    let r = 0, gg = 0, b = 0, vv = 0, a = 0, sh = 0;
    for (let sy = 0; sy < ss; sy++)for (let sx = 0; sx < ss; sx++) {
      const i = (py * ss + sy) * N + px * ss + sx;
      if (GA[i] > .5 && GD[i] < .5 * k) sh++;
      if (A[i] < .5) continue;
      const direct = clamp((DR[i] + DG[i] + DB[i]) / 3 / full, 0, 1);       // Cycles' Diffuse Direct is the light alone, without the colour
      vv += .48 * AO[i] * (.74 + .26 * NZ[i]) + .52 * direct;       // the kit's light: ambient (darker in nooks, paler facing up) plus the sun
      r += CR[i]; gg += CG[i]; b += CB[i]; a++;
      if (sx === mid && sy === mid) { nUp[py * SIZE + px] = NZ[i]; dep[py * SIZE + px] = Z[i]; }
    }
    const o = py * SIZE + px;
    if (a) { const l = oklab([srgb(r / a), srgb(gg / a), srgb(b / a)]); lab[o * 3] = l[0]; lab[o * 3 + 1] = l[1]; lab[o * 3 + 2] = l[2]; val[o] = vv / a; }
    cover[o] = a / n2; shad[o] = sh / n2;
  }
  // each pixel's ramp (then the one most of its neighbours within 2 pixels have), and how pale the whole model is on average,
  // so a part darker than the rest (iron on wood) comes out darker, and a texture's own light and dark still show
  const first = new Array(SIZE * SIZE).fill(null), ramp = new Array(SIZE * SIZE).fill(null), mean = [0, 0];
  for (let i = 0; i < SIZE * SIZE; i++) if (cover[i] >= .5) first[i] = pickRamp(rs, [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]);
  for (let py = 0; py < SIZE; py++)for (let px = 0; px < SIZE; px++) {
    const i = py * SIZE + px; if (!first[i]) continue;
    const votes = new Map(); let best = first[i], bn = 0;
    for (let dy = -2; dy <= 2; dy++)for (let dx = -2; dx <= 2; dx++) {
      const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
      const r = first[y * SIZE + x]; if (!r) continue; const n = (votes.get(r) || 0) + 1; votes.set(r, n); if (n > bn || (n === bn && r === first[i])) { bn = n; best = r; }
    }
    ramp[i] = best; mean[0] += lab[i * 3]; mean[1]++;
  }
  const pick = new Int8Array(SIZE * SIZE).fill(-1), out = Buffer.alloc(SIZE * SIZE * 4), so = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (shad[i] >= .5) so[i * 4 + 3] = 255;
    const r = ramp[i]; if (!r) continue;
    const n = r.cs.length;
    pick[i] = clamp(Math.round((val[i] - .17) / .57 * (n - 1) + detail * (lab[i * 3] - mean[0] / mean[1]) / .07 + tone), 0, n - 1);
  }
  // hard edges are done; a top edge facing the sky against the air gets one tone paler (the kit's edge light); stray single pixels go
  for (let py = 1; py < SIZE - 1; py++)for (let px = 1; px < SIZE - 1; px++) {
    const i = py * SIZE + px; if (pick[i] < 0) continue;
    let nb = 0; for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && pick[i + dy * SIZE + dx] >= 0) nb++;
    if (nb <= 1) pick[i] = -2;
  }
  for (let i = SIZE; i < SIZE * SIZE; i++) if (pick[i] >= 0) {
    const r = ramp[i], above = i - SIZE; let t = pick[i];
    if (nUp[i] > .5 && (pick[above] < 0 || dep[above] - dep[i] > .3) && r.name !== 'moss' && r.name !== 'grass') t = Math.min(t + 1, r.cs.length - 1);
    const c = r.cs[t]; out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return { out, so };
}

/* ---------- which models, and the command line ---------- */
const LISTED = existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf8')) : {};
delete LISTED._;
const first = argv[0] && !argv[0].startsWith('--') ? argv[0] : '';
if (!first) { console.error(`Name a model: node scripts/art/bake3d.mjs "<Name A1>" [--draft]. Listed: ${Object.keys(LISTED).join(', ') || 'none'}`); process.exit(1); }
const names = first === 'all' ? Object.keys(LISTED) : first.split(',');
const specs = {};
for (const n of names) {
  const s = { ...(LISTED[n] || {}) };
  if (flag('--model')) s.model = flag('--model');
  if (flag('--height')) s.height = +flag('--height');
  if (flag('--yaw')) s.yaw = +flag('--yaw');
  if (flag('--scale')) s.scale = +flag('--scale');
  if (flag('--origin')) s.origin = flag('--origin');
  if (!s.model) { console.error(`No model for "${n}": add it to scripts/art/models.json or give --model. Listed: ${Object.keys(LISTED).join(', ') || 'none'}`); process.exit(1); }
  specs[n] = s;
}

async function fetchModels() {                          // a listed model with a url is downloaded into art-source/models/ the first time
  for (const s of Object.values(specs)) {
    if (existsSync(s.model) || !s.url) continue;
    console.log(`Downloading ${s.url}`);
    const res = await fetch(s.url); if (!res.ok) { console.error(`bake3d: ${s.url}: ${res.status}`); process.exit(1); }
    mkdirSync(dirname(s.model), { recursive: true }); writeFileSync(s.model, Buffer.from(await res.arrayBuffer()));
  }
  for (const [n, s] of Object.entries(specs)) if (!existsSync(s.model)) { console.error(`bake3d: ${n}: no file ${s.model}`); process.exit(1); }
}
await fetchModels();

const draft = argv.includes('--draft'), ss = +flag('--ss', draft ? 2 : 3), views = flag('--views', 'S,E,N,W').split(',');
const shadowName = n => { const w = n.split(' '); return w.length > 1 ? [...w.slice(0, -1), 'Shadow', w.at(-1)].join(' ') : `${n} Shadow`; };
const work = mkdtempSync(join(tmpdir(), 'bake3d-')), done = {};
process.on('exit', () => rmSync(work, { recursive: true, force: true }));
const PROPS = {};
for (const [n, s] of Object.entries(specs)) {
  PROPS[n] = {
    shadow: s.shadow || shadowName(n),
    render(view, q) {                                   // the kit's run() asks for one side at a time: Blender draws all the sides once
      const dir = join(work, `${names.indexOf(n)}-${q}`);
      if (!done[dir]) {
        const t0 = Date.now();
        blender({ model: s.model, out: dir, ss: q, size: SIZE, ppu: PPU, ax: AX, ay: AY, view: VIEW, sun: SUN, views, height: s.height, scale: s.scale ?? 1.4 / 1.8, yaw: s.yaw || 0, origin: s.origin, samples: s.samples || 16 });
        const i = JSON.parse(readFileSync(join(dir, 'info.json'), 'utf8')), warn = [];
        if (i.height > 2.6) warn.push(`taller than 2.6 (${i.height.toFixed(2)}): its top is cut off`);
        if ((i.width + i.depth) / 2 > 1.45) warn.push(`half its length plus half its width is ${((i.width + i.depth) / 2).toFixed(2)}, over 1.45: a corner is cut off at the bottom`);
        console.log(`${n}: ${i.width.toFixed(2)} x ${i.depth.toFixed(2)} x ${i.height.toFixed(2)} units, Blender ${i.blender} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (warn.length ? `\n  warning: ${warn.join('; ')}` : ''));
        done[dir] = true;
      }
      return bake(s, view, q, dir);
    },
  };
}
run(PROPS);
