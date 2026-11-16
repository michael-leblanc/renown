// The picture an item is judged from: the real character at game size holding the repainted part,
// with the item's picture lying on the ground beside it. A row per matched part (the MATCHED list in items.mjs).
//   node scripts/art/held.mjs <Creator folder> <repainted folder> [--only Melee2,Shield1] [--dirs SE,S,SW,NE] [--z 1] [--out prototype/shots/held.png]
//   e.g. node scripts/art/reskin.mjs prototype/art/creator /tmp/reskin && node scripts/art/held.mjs prototype/art/creator /tmp/reskin
// <Creator folder> holds <Part>/Idle.png for the body parts (prototype/art/creator/); <repainted folder> is what reskin.mjs wrote.
// The character is the test game's human: its tints, layer order and size come from prototype/character/character_data.json.
// A part with no repainted sheet is skipped and named. Nothing but the picture is written (prototype/shots/ is git-ignored).
import { readFileSync, existsSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';
import { render, SIZE } from './kit.mjs';
import { MATCHED, METAL, swap } from './items.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const [CRE, SKIN] = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--'))).map(p => p.replace(/\/?$/, '/'));
if (!CRE || !SKIN) { console.error('Usage: node scripts/art/held.mjs <Creator folder> <repainted folder>'); process.exit(1); }
const D = JSON.parse(readFileSync('prototype/character/character_data.json', 'utf8'));
const F = D.sheet.frame_px, SC = D.sprite_scale, GREY = D.sheet.grey_ref * 255, TINT = D.races.human.tints;
const only = flag('--only', ''), dirs = flag('--dirs', 'SE,S,SW,NE').split(','), Z = +flag('--z', 1), out = flag('--out', 'prototype/shots/held.png');
const pairs = MATCHED.filter(m => !only || only.split(',').includes(m.part)).filter(m => { const ok = existsSync(`${SKIN}${m.part}-${m.metal}.png`); if (!ok) console.log(m.part, 'skipped: no repainted sheet in', SKIN); return ok; });
if (!pairs.length) { console.error('Nothing to draw.'); process.exit(1); }
const hexc = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const sheets = {}; const sheet = name => sheets[name] ??= readPng(`${CRE}${name}/Idle.png`);

// one cell holds the part of the frame a standing character and a long weapon use, at game size
const CX0 = 2, CY0 = 14, CW = Math.round((F - 4) * SC), CH = Math.round(96 * SC), ITEM_W = 250, GAP = 8;
const W = GAP + dirs.length * (CW + GAP) + ITEM_W + GAP, H = GAP + pairs.length * (CH + GAP), img = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 46; img[i * 4 + 1] = 43; img[i * 4 + 2] = 39; img[i * 4 + 3] = 255; }
const put = (x, y, c, a) => { if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const o = (y * W + x) * 4; for (let k = 0; k < 3; k++) img[o + k] = Math.round(img[o + k] * (1 - a) + c[k] * a); };
const rect = (X, Y, w, h, c) => { for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) put(x, y, c, 1); };

pairs.forEach((m, r) => {
  const y0 = GAP + r * (CH + GAP), skin = readPng(`${SKIN}${m.part}-${m.metal}.png`);
  dirs.forEach((dir, c) => {
    const row = D.directions.indexOf(dir), x0 = GAP + c * (CW + GAP);
    if (row < 0) { console.error(`--dirs: no side "${dir}". The sides are ${D.directions.join(', ')}.`); process.exit(1); }
    rect(x0, y0, CW, CH, [70, 96, 44]);
    // the test game's layer order, with its sword or shield replaced by this part and the other hand left empty
    const order = D.layer_order[dir].map(p => p === 'Melee2' ? (m.slot === 'weapon' ? m.part : null) : p === 'Shield1' ? (m.slot === 'shield' ? m.part : null) : p).filter(Boolean);
    for (const part of order) {
      const held = part === m.part, p = held ? skin : sheet(part), t = held || part === 'Shadow' ? null : hexc(TINT[part]), alpha = part === 'Shadow' ? D.shadow_alpha : 1;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const o = ((row * F + CY0 + Math.floor(y / SC)) * p.width + CX0 + Math.floor(x / SC)) * 4, a = p.data[o + 3] / 255 * alpha; if (!a) continue;
        put(x0 + x, y0 + y, t ? t.map((v, k) => Math.min(255, p.data[o + k] * v / GREY)) : [p.data[o], p.data[o + 1], p.data[o + 2]], a);   // a grey part takes its tint; a repainted one is drawn as it is
      }
    }
  });
  // the item on the ground, at the size the game draws it, its tile's middle on the same ground line as the feet
  const x0 = GAP + dirs.length * (CW + GAP), pic = render(m.item, 'S', 3), col = swap(pic.out, METAL[m.metal]);
  rect(x0, y0, ITEM_W, CH, [70, 96, 44]);
  const ox = x0 + (ITEM_W >> 1) - 128, oy = y0 + Math.round((D.sheet.foot_origin[1] - CY0) * SC) - 208;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const X = ox + x, Y = oy + y; if (X < x0 || X >= x0 + ITEM_W || Y < y0 || Y >= y0 + CH) continue;
    const s = (y * SIZE + x) * 4; if (pic.so[s + 3]) put(X, Y, [0, 0, 0], .3); if (col[s + 3]) put(X, Y, [col[s], col[s + 1], col[s + 2]], 1);
  }
  console.log(`${m.name} (${m.part}, ${m.metal})`);
});
let big = img, BW = W, BH = H;
if (Z > 1) { BW = W * Z; BH = H * Z; big = Buffer.alloc(BW * BH * 4); for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) img.copy(big, (y * BW + x) * 4, (Math.floor(y / Z) * W + Math.floor(x / Z)) * 4, (Math.floor(y / Z) * W + Math.floor(x / Z)) * 4 + 4); }
writePng(out, big, BW, BH);
console.log(`Picture: ${out}${Z > 1 ? `, ${Z} times game size` : ', at game size'}; a row per item: held, seen from ${dirs.join(', ')}, then on the ground`);
