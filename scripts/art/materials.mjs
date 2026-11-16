// The ways a metal (bronze, iron, steel; D133) can reach a held Creator part, each built for real and shown side by side.
//   node scripts/art/materials.mjs <Creator folder> <work folder> [--shot Idle:W:0] [--keep] [--out prototype/shots/materials.html]
//   then, to see them move: node scripts/art/play.mjs <Creator folder> <work folder>/show
// <Creator folder> holds <Part>/<Animation>.png for the body and the matched weapons (the Creator's own Spritesheets folder).
//   A  a sheet per metal: reskin.mjs --metal, once per metal. The client picks the folder and draws the sheet as it is.
//   B  two layers: the wood as it is, and the metal in six greys that the client tints as it tints every other part
//      (one colour per metal, multiplied in). The greys and the three colours are fitted here to come as near the metals as a tint can.
//   C  one sheet, in iron's colours; the client swaps iron's six colours for the metal's six (what items.mjs does for the ground pictures).
// Writes <work>/A (the sheets of A; its iron folders are C's sheets), <work>/B (the two layers), <work>/show (what the screen shows
// for A and C, and for B, laid out for play.mjs), prints what each way costs and how far B's colours are from the metals',
// and writes one page of stills. --keep reuses <work>/A from an earlier run.
// Everything written is bought art repainted: keep <work> and the page in git-ignored folders, never commit them.
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync, statSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPng, writePng } from './png.mjs';
import { RAMP } from './kit.mjs';
import { MATCHED, METAL, IN_METALS, ITEMS, spritesOf } from './items.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const [CRE, WORK] = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--') && argv[i - 1] !== '--keep')).map(p => p.replace(/\/?$/, '/'));
if (!CRE || !WORK) { console.error('Usage: node scripts/art/materials.mjs <Creator folder> <work folder> [--shot Idle:W:0] [--keep] [--out file.html]'); process.exit(1); }
const out = flag('--out', 'prototype/shots/materials.html'), [ANIM, DIR, FR] = flag('--shot', 'Idle:W:0').split(':'), keep = argv.includes('--keep');
const D = JSON.parse(readFileSync('prototype/character/character_data.json', 'utf8')), F = D.sheet.frame_px, GREY = D.sheet.grey_ref * 255, SC = D.sprite_scale;
const METALS = ['bronze', 'iron', 'steel'], IRON = RAMP.iron, HERE = dirname(fileURLToPath(import.meta.url));
const hexOf = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''), cap = s => s[0].toUpperCase() + s.slice(1);

/* ---------- A: a sheet per metal ---------- */
if (!keep || !existsSync(`${WORK}A`)) for (const m of METALS) {
  const r = spawnSync('node', [join(HERE, 'reskin.mjs'), CRE, `${WORK}A`, '--metal', m], { encoding: 'utf8' });
  if (r.status) { console.error(r.stdout + r.stderr); process.exit(1); }
}
const parts = MATCHED.filter(m => IN_METALS.includes(m.kind) && existsSync(`${WORK}A/${m.part}-iron`));
const fixed = MATCHED.filter(m => !IN_METALS.includes(m.kind) && existsSync(`${WORK}A/${m.part}-${m.metal}`));   // wood with iron fittings: one sheet whatever is chosen
if (!parts.length) { console.error(`No matched weapon found in ${CRE}.`); process.exit(1); }
const animsOf = dir => readdirSync(dir).filter(f => f.endsWith('.png')).sort(), bytesOf = dir => animsOf(dir).reduce((s, f) => s + statSync(dir + '/' + f).size, 0);

/* ---------- B: the tint that comes nearest ---------- */
// The screen shows grey x colour / the Creator's grey (the test game's rule for every part). Six greys shared by the metals and one
// colour per metal, fitted by least squares to the three ramps of six tones; then scaled so the main tone's grey is the Creator's grey.
let G = IRON.map((_, k) => METALS.reduce((s, m) => s + METAL[m][k][1], 0) / 3), T = {};
for (let it = 0; it < 60; it++) {
  for (const m of METALS) T[m] = [0, 1, 2].map(c => G.reduce((s, g, k) => s + g * METAL[m][k][c], 0) / G.reduce((s, g) => s + g * g, 0));
  G = G.map((_, k) => METALS.reduce((s, m) => s + T[m].reduce((t, v, c) => t + v * METAL[m][k][c], 0), 0) / METALS.reduce((s, m) => s + T[m].reduce((t, v) => t + v * v, 0), 0));
}
const TINT = {}; for (const m of METALS) TINT[m] = T[m].map(v => Math.min(255, Math.round(v * G[4])));
const GREYS = G.map(g => Math.min(255, Math.round(g * GREY / G[4])));
const TINTED = {}; for (const m of METALS) TINTED[m] = GREYS.map(g => TINT[m].map(t => Math.min(255, Math.round(g * t / GREY))));

/* ---------- build B's layers, check C against A, and write what the screen shows ---------- */
const ironAt = (d, i) => IRON.findIndex(c => c[0] === d[i] && c[1] === d[i + 1] && c[2] === d[i + 2]);
let cDiff = 0, cSheets = 0;
for (const p of parts) for (const f of animsOf(`${WORK}A/${p.part}-iron`)) {
  const iron = readPng(`${WORK}A/${p.part}-iron/${f}`), n = iron.width * iron.height * 4, wood = Buffer.alloc(n), metal = Buffer.alloc(n);
  const shown = Object.fromEntries(METALS.map(m => [m, Buffer.alloc(n)])), swapped = Object.fromEntries(METALS.map(m => [m, Buffer.from(iron.data)]));
  for (let i = 0; i < n; i += 4) {
    if (!iron.data[i + 3]) continue;
    const k = ironAt(iron.data, i);
    if (k < 0) { iron.data.copy(wood, i, i, i + 4); for (const m of METALS) iron.data.copy(shown[m], i, i, i + 4); continue; }
    metal[i] = metal[i + 1] = metal[i + 2] = GREYS[k]; metal[i + 3] = 255;
    for (const m of METALS) { for (let c = 0; c < 3; c++) { shown[m][i + c] = TINTED[m][k][c]; swapped[m][i + c] = METAL[m][k][c]; } shown[m][i + 3] = 255; }
  }
  writePng(`${WORK}B/${p.part}-wood/${f}`, wood, iron.width, iron.height); writePng(`${WORK}B/${p.part}-metal/${f}`, metal, iron.width, iron.height);
  for (const m of METALS) {
    writePng(`${WORK}show/${p.part}-${m} B (tinted)/${f}`, shown[m], iron.width, iron.height);
    const a = readPng(`${WORK}A/${p.part}-${m}/${f}`); cSheets++;                          // C: iron's sheet with its six colours swapped, against A's own sheet
    for (let i = 0; i < n; i += 4) if (a.data[i] !== swapped[m][i] || a.data[i + 1] !== swapped[m][i + 1] || a.data[i + 2] !== swapped[m][i + 2] || a.data[i + 3] !== swapped[m][i + 3]) cDiff++;
  }
}
for (const p of parts) for (const m of METALS) cpSync(`${WORK}A/${p.part}-${m}`, `${WORK}show/${p.part}-${m}`, { recursive: true });
for (const p of fixed) cpSync(`${WORK}A/${p.part}-${p.metal}`, `${WORK}show/${p.part}-${p.metal}`, { recursive: true });

/* ---------- what each way costs ---------- */
const nAnim = animsOf(`${WORK}A/${parts[0].part}-iron`).length, fixedBytes = fixed.reduce((s, p) => s + bytesOf(`${WORK}A/${p.part}-${p.metal}`), 0), fixedSheets = fixed.length * nAnim;
const sum = dirs => dirs.reduce((s, d) => s + bytesOf(d), 0);
const COST = {
  A: { sheets: parts.length * 3 * nAnim, bytes: sum(parts.flatMap(p => METALS.map(m => `${WORK}A/${p.part}-${m}`))), layers: 1 },
  B: { sheets: parts.length * 2 * nAnim, bytes: sum(parts.flatMap(p => [`${WORK}B/${p.part}-wood`, `${WORK}B/${p.part}-metal`])), layers: 2 },
  C: { sheets: parts.length * nAnim, bytes: sum(parts.map(p => `${WORK}A/${p.part}-iron`)), layers: 1 },
};
const first = readPng(`${WORK}A/${parts[0].part}-iron/${animsOf(`${WORK}A/${parts[0].part}-iron`)[0]}`), loaded = first.width * first.height * 4;
const mb = b => (b / 1048576).toFixed(1) + ' MB';
console.log(`${parts.length} weapons in metals (${parts.map(p => p.name).join(', ')}), ${nAnim} animations each; ${fixed.length} part with no metal (${fixed.map(p => p.name).join(', ')}: ${fixedSheets} sheets, ${mb(fixedBytes)} whatever is chosen)`);
for (const [k, c] of Object.entries(COST)) console.log(`  ${k}: ${c.sheets} sheets, ${mb(c.bytes)} on disk, ${c.layers} picture${c.layers > 1 ? 's' : ''} drawn per held weapon`);
console.log(`  one sheet is ${first.width} x ${first.height}: ${mb(loaded)} once loaded, whatever its file size`);
console.log(`C against A: ${cDiff} pixels differ on ${cSheets} sheets (iron's sheet with its six colours swapped, against the sheet repainted in that metal)`);
console.log(`B: greys ${GREYS.join(' ')}; colours ${METALS.map(m => `${m} ${hexOf(TINT[m])}`).join(', ')}`);
const drift = {}; for (const m of METALS) { drift[m] = Math.max(...METAL[m].flatMap((c, k) => c.map((v, i) => Math.abs(v - TINTED[m][k][i])))); console.log(`  ${m}: ${METAL[m].map(hexOf).join(' ')}\n  tinted: ${TINTED[m].map(hexOf).join(' ')}   furthest channel off by ${drift[m]} of 255`); }

/* ---------- the stills ---------- */
const hexc = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), GRASS = [70, 96, 44], row = D.directions.indexOf(DIR), fr = +FR || 0, cache = {};
if (row < 0) { console.error(`--shot: no side "${DIR}". The sides are ${D.directions.join(', ')}.`); process.exit(1); }
const sheet = f => { if (!existsSync(f)) { console.error(`No sheet ${f}`); process.exit(1); } return cache[f] ??= readPng(f); };
/** One frame, 128 x 128: the test game's human holding `part`, painted the way `folder` has it. */
function frame(part, folder) {
  const img = Buffer.alloc(F * F * 4); for (let i = 0; i < F * F; i++) { img[i * 4] = GRASS[0]; img[i * 4 + 1] = GRASS[1]; img[i * 4 + 2] = GRASS[2]; img[i * 4 + 3] = 255; }
  for (const name of D.layer_order[DIR].map(p => p === 'Melee2' ? part : /^Shield/.test(p) ? null : p).filter(Boolean)) {
    const held = name === part, p = held ? sheet(`${folder}/${ANIM}.png`) : sheet(`${CRE}${name}/${ANIM}.png`), t = held || name === 'Shadow' ? null : hexc(D.races.human.tints[name]), alpha = name === 'Shadow' ? D.shadow_alpha : 1;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const o = ((row * F + y) * p.width + fr * F + x) * 4, a = p.data[o + 3] / 255 * alpha; if (!a) continue;
      for (let k = 0; k < 3; k++) img[(y * F + x) * 4 + k] = Math.round(img[(y * F + x) * 4 + k] * (1 - a) + (t ? Math.min(255, p.data[o + k] * t[k] / GREY) : p.data[o + k]) * a);
    }
  }
  return img;
}
const crop = (img, W, [x0, y0, w, h]) => { const o = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) img.copy(o, y * w * 4, ((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4); return o; };
const uri = (buf, w, h) => { const f = `${WORK}cells/${++cells}.png`; writePng(f, buf, w, h); return 'data:image/png;base64,' + readFileSync(f).toString('base64'); }; let cells = 0;
// where things are in this shot: everything that is not grass, over all the weapons (the box every game-size cell shows), and each weapon's metal
const frames = {}, box = [F, F, 0, 0], near = {};
for (const p of parts) {
  for (const m of METALS) { frames[`${p.part} ${m} exact`] = frame(p.part, `${WORK}show/${p.part}-${m}`); frames[`${p.part} ${m} tinted`] = frame(p.part, `${WORK}show/${p.part}-${m} B (tinted)`); }
  const f = frames[`${p.part} iron exact`]; for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const i = (y * F + x) * 4; if (f[i] !== GRASS[0] || f[i + 1] !== GRASS[1] || f[i + 2] !== GRASS[2]) { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); } }
  const s = sheet(`${WORK}A/${p.part}-iron/${ANIM}.png`); let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const o = ((row * F + y) * s.width + fr * F + x) * 4; if (s.data[o + 3] && ironAt(s.data, o) >= 0) { sx += x; sy += y; n++; } }
  const N = 32; near[p.part] = [Math.max(0, Math.min(F - N, Math.round(sx / (n || 1) - N / 2))), Math.max(0, Math.min(F - N, Math.round(sy / (n || 1) - N / 2))), N, N];
}
const GAME = [Math.max(0, box[0] - 4), Math.max(0, box[1] - 4), 0, 0]; GAME[2] = Math.min(F, box[2] + 5) - GAME[0]; GAME[3] = Math.min(F, box[3] + 5) - GAME[1];
const itemOf = p => Object.keys(ITEMS).find(k => k.toLowerCase() === p.name.toLowerCase());
/** An item's ground picture in one metal, cut to what is drawn (the same cut for its three metals), on grass. */
function ground(p, m) {
  const name = itemOf(p), files = name ? spritesOf(name) : [], file = files.find(([mm]) => mm === m), dir = 'prototype/art/made/items/'; if (!file || !existsSync(`${dir}${file[1]}.png`)) return null;
  const pics = files.map(([, f]) => readPng(`${dir}${f}.png`)), S = pics[0].width; let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (const q of pics) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (q.data[(y * S + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const q = readPng(`${dir}${file[1]}.png`), sh = existsSync(`${dir}${name} Shadow.png`) ? readPng(`${dir}${name} Shadow.png`) : null, w = x1 - x0 + 9, h = y1 - y0 + 9, o = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 - 4 + x, Y = y0 - 4 + y, i = (Y * S + X) * 4, j = (y * w + x) * 4, inside = X >= 0 && Y >= 0 && X < S && Y < S;
    let c = GRASS; if (inside && sh && sh.data[i + 3]) c = c.map(v => Math.round(v * .7)); if (inside && q.data[i + 3]) c = [q.data[i], q.data[i + 1], q.data[i + 2]];
    o[j] = c[0]; o[j + 1] = c[1]; o[j + 2] = c[2]; o[j + 3] = 255;
  }
  return { src: uri(o, w, h), w, h };
}
const im = (src, w, h, z) => `<img src="${src}" width="${Math.round(w * z)}" height="${Math.round(h * z)}" alt="">`;
const still = (key, cut, z) => im(uri(crop(frames[key], F, cut), cut[2], cut[3]), cut[2], cut[3], z);
const groundCell = (p, m, z) => { const g = ground(p, m); return g ? im(g.src, g.w, g.h, z) : ''; };
const grid = (cut, zHeld, zGround) => `<table class="g"><tr><th></th>${METALS.map(m => `<th colspan="3" class="m">${cap(m)}</th>`).join('')}</tr>
<tr><th></th>${METALS.map(() => '<td class="h">on the ground</td><td class="h">A and C</td><td class="h">B</td>').join('')}</tr>
${parts.map(p => `<tr><th>${p.name}</th>${METALS.map(m => `<td class="gr">${groundCell(p, m, zGround)}</td><td>${still(`${p.part} ${m} exact`, cut(p), zHeld)}</td><td>${still(`${p.part} ${m} tinted`, cut(p), zHeld)}</td>`).join('')}</tr>`).join('\n')}</table>`;
const sw = c => `<td class="sw" style="background:${hexOf(c)}"></td>`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renown: how a metal reaches a held part</title>
<style>
body{margin:0;padding:22px 26px;background:#1f1e1b;color:#ece8dc;font:15px/1.45 system-ui,sans-serif;width:max-content}
h1{font-size:21px;margin:0 0 4px}h2{font-size:16px;margin:26px 0 8px}p{margin:0 0 8px;color:#b9b3a4;max-width:1100px}b{color:#ece8dc}
img{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
table{border-collapse:separate;border-spacing:4px}th{font-weight:600;text-align:left;padding-right:10px;white-space:nowrap}
.g td{background:#46602c;padding:0;vertical-align:middle;text-align:center}.g td.gr img{margin:auto}.g td.h{background:none;color:#b9b3a4;font-size:12.5px;padding:0 0 2px}.g th.m{text-align:center;font-size:15px;border-bottom:2px solid #55524a}
.t td.sw{width:46px;height:26px}.t td.x{font:11px ui-monospace,monospace;color:#b9b3a4;text-align:center}.t th{font-size:13px;color:#b9b3a4;font-weight:400}.t th.m{color:#ece8dc;font-weight:600;font-size:15px}
.c{border-spacing:0}.c td,.c th{padding:6px 14px 6px 0;border-bottom:1px solid #3a3832;vertical-align:top;text-align:left}.c th{color:#b9b3a4;font-weight:400;font-size:13px}.c td:first-child{white-space:nowrap}
</style></head><body>
<h1>How a metal reaches a held part: three ways</h1>
<p><b>A</b>: one sheet per metal, drawn as it is. <b>B</b>: the wood as one layer and the metal as a grey layer the client tints, as it tints every other part. <b>C</b>: one sheet in iron's colours, and the client swaps iron's six colours for the metal's six. A and C put the same pixels on the screen (checked on all ${cSheets} sheets: ${cDiff} pixels differ), so they share a column.</p>
<h2>At the game's size (${ANIM}, from ${DIR})</h2>
${grid(() => GAME, SC, 1)}
<h2>The metal, twice the game's size</h2>
${grid(p => near[p.part], SC * 2, 2)}
<h2>The six tones of each metal, dark to pale</h2>
<p>B has one colour per metal, so its dark tones keep the pale tone's hue. The ground pictures and A and C use the six colours chosen for each metal.</p>
<table class="t">${METALS.map(m => `<tr><th class="m" rowspan="3">${cap(m)}</th><th>on the ground, A and C</th>${METAL[m].map(sw).join('')}</tr><tr><th>B, tinted with ${hexOf(TINT[m])}</th>${TINTED[m].map(sw).join('')}</tr><tr><th></th>${METAL[m].map((c, k) => `<td class="x">${Math.max(...c.map((v, i) => Math.abs(v - TINTED[m][k][i])))}</td>`).join('')}</tr>`).join('')}</table>
<p>The numbers: how far B's tone is from the metal's, on its furthest colour channel, out of 255.</p>
<h2>What each way costs (${parts.length} weapons in 3 metals, ${nAnim} animations each)</h2>
<table class="c"><tr><th></th><th>Sheets</th><th>On disk</th><th>Drawn per held weapon</th><th>A fourth metal</th><th>The client</th></tr>
<tr><td><b>A</b> a sheet per metal</td><td>${COST.A.sheets}</td><td>${mb(COST.A.bytes)}</td><td>1 picture</td><td>${parts.length * nAnim} more sheets</td><td>no tint on a held part; picks the folder by metal</td></tr>
<tr><td><b>B</b> grey metal, tinted</td><td>${COST.B.sheets}</td><td>${mb(COST.B.bytes)}</td><td>2 pictures</td><td>one colour in the data</td><td>nothing new: one more tinted layer</td></tr>
<tr><td><b>C</b> six colours swapped</td><td>${COST.C.sheets}</td><td>${mb(COST.C.bytes)}</td><td>1 picture</td><td>six colours in the data</td><td>a small colour-swap step for held parts (new)</td></tr></table>
<p>One sheet is ${first.width} x ${first.height} pixels: ${mb(loaded)} of memory once loaded, whatever its file size. The ${fixed.map(p => p.name.toLowerCase()).join(', ')} has no metal: ${fixedSheets} more sheets (${mb(fixedBytes)}) whatever is chosen.</p>
</body></html>`;
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, page);
console.log(`Page: ${out} (${(page.length / 1024).toFixed(0)} KB). To see them move: node scripts/art/play.mjs ${CRE} ${WORK}show`);
