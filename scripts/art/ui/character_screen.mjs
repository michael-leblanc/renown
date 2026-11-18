// The character screen's pieces (D239 to D241), written with the screen kit (scripts/art/ui/kit.mjs):
//   Frame                    - the dark slate panel with its worn steel trim, 620 x 760. Nothing else is baked into it.
//   Stage                    - the dark stage with a pool of warm, smoky light, behind the character.
//   Satchel                  - the pack: open stitched leather with its steel buckle.
//   Strap                    - the thin steel strap the worn gear hangs on. Drawn over the gear slots.
//   Medallion <stat>         - a bronze ring and a sign for each stat's one job (D159): crossed swords, a feather, a heart, an open book.
//   Slot <kind> <material>   - a slot's background, tinted by its item's material (Empty when nothing is in it).
//                              Kinds: Gear 52 x 66, Hand 60 x 86, Pack 50 x 70, Round 52 x 52 (the bandage, D169).
//   character_screen.json    - where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is not a piece: Godot draws it in Alegreya (scripts/art/ui/fonts/, OFL 1.1), a label gold and its value pale (D241).
// Usage, from the repo root (about 15 seconds):
//   node scripts/art/ui/character_screen.mjs [--out prototype/art/made/ui]      all the pieces and the json
//   node scripts/art/ui/character_screen.mjs --draft [--shot file.png] [--scale 2]
//       one picture to look at, prototype/shots/ui-character-screen.png (git-ignored); no piece written. It is put together from the
//       pieces the way the json says, over the game's grass, with the test game's human, item pictures and made-up numbers.
//       It holds bought art (the Creator character, the tileset's grass): never commit it.
// This replaces the Python draft (character_screen.py). What differs from it, on purpose: slots sit on whole pixels (the draft's gear row
// was off by up to half a pixel), a slot's edge is solid (the draft's let 22% of what was behind show through, by accident), and the
// stitches pass under the buckle, not over it.
import { K, area, mask, layer, each, vnoise, box, boxLine, ellipse, arc, roundBox, poly, line, blur, texture, metal, shadow, over, shrink, resize } from './kit.mjs';
import { font, textWidth, drawText } from './text.mjs';
import { writePng, readPng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const W = 620, H = 760, FULL = [W, H];                 // the screen, in its own pixels
const LABEL = [196, 160, 98], VALUE = [242, 234, 214]; // a label, and its value (D241)
const EDGE = [150, 130, 96], EDGE_EMPTY = [70, 66, 60], SEE = 200 / 255;   // a slot's thin edge: gold when filled; drawn at 78% strength over black
// A slot's background takes its item's material. Claude's idea, in every draft Michael liked, never asked: Renown has no rarity to colour a slot by (D132).
// No Steel yet (D133 has it): the draft had no steel item, so no colour was ever shown for it.
const MATERIAL = { Iron: [52, 58, 66], Bronze: [70, 52, 30], Cloth: [56, 56, 34], Leather: [64, 44, 30], Wood: [58, 46, 30], Gold: [72, 60, 24], Empty: [16, 16, 16] };
const KIND = { Gear: [52, 66], Hand: [60, 86], Pack: [50, 70], Round: [52, 52] };
const STAGE = [22, 22, 576, 408], LIGHT = [310, 230, 260, 260];              // the stage's box; its light's middle and reach
const STATS = ['Strength', 'Agility', 'Endurance', 'Intellect'], MEDAL = i => [552, 90 + i * 70], MEDAL_R = 19;
const GEAR = ['Main hand', 'Head', 'Chest', 'Hands', 'Back', 'Belt', 'Legs', 'Feet', 'Off hand'];
const gearAt = i => {                                  // the gear row sags in the middle, like pouches on a strap
  const t = i / (GEAR.length - 1), kind = i === 0 || i === GEAR.length - 1 ? 'Hand' : 'Gear', [w, h] = KIND[kind];
  return { name: GEAR[i], kind, at: [Math.round(40 + t * 500 + 30 - w / 2), Math.round(400 + Math.sin(t * Math.PI) * 44 - h / 2 + 30)] };
};
const PACK = { kind: 'Pack', first: [40, 578], step: [54, 76], columns: 10, rows: 2 };   // 12 + 8 slots (D124)
const packAt = i => [PACK.first[0] + (i % PACK.columns) * PACK.step[0], PACK.first[1] + Math.floor(i / PACK.columns) * PACK.step[1]];
const BANDAGE = { kind: 'Round', at: [40, 40] };
const TEXT = {                                         // Alegreya SC bold for headings and numbers, Alegreya bold for the rest; sizes in pixels
  heading: ['AlegreyaSC-Bold', 20], number: ['AlegreyaSC-Bold', 17], title: ['AlegreyaSC-Bold', 16], line: ['Alegreya-Bold', 12], count: ['Alegreya-Bold', 12], slot_name: ['Alegreya-Bold', 10],
};

/* ---------- the pieces ---------- */
const lit = (M, x, y) => M.m[(y - M.y) * M.w + x - M.x];
const plain = (M, rgb, on = () => true) => { const L = layer(M); each(M, (x, y, i) => { if (M.m[i] && on(x, y)) { L.c[i * 3] = rgb[0]; L.c[i * 3 + 1] = rgb[1]; L.c[i * 3 + 2] = rgb[2]; L.a[i] = 1; } }); return L; };

function frame() {
  const A = area(0, 0, W, H), L = layer(A), M = mask(A); texture(L, [24, 31, 33]);
  const trim = (x0, y0, x1, y1, wd) => boxLine(M, x0 * K, y0 * K, x1 * K, y1 * K, Math.trunc(wd * K));
  const spike = (cx, cy, ang, len = 16, wd = 3) => { const a = ang * Math.PI / 180, px = -Math.sin(a), py = Math.cos(a); poly(M, [[cx * K + px * wd * K, cy * K + py * wd * K], [cx * K + Math.cos(a) * len * K, cy * K + Math.sin(a) * len * K], [cx * K - px * wd * K, cy * K - py * wd * K]]); };
  trim(4, 4, W - 4, H - 4, 3); trim(10, 10, W - 10, H - 10, 1);                 // two thin lines
  for (const [cx, cy, a1, a2] of [[4, 4, -90, 180], [W - 4, 4, -90, 0], [4, H - 4, 90, 180], [W - 4, H - 4, 90, 0]]) {   // a spike each way and a stud at every corner
    spike(cx, cy, a1); spike(cx, cy, a2); ellipse(M, (cx - 5) * K, (cy - 5) * K, (cx + 5) * K, (cy + 5) * K);
  }
  over(L, shadow(M)); over(L, metal(M, 'steel', FULL, .35)); return shrink(L);
}
function stage() {
  const [x, y, w, h] = STAGE, [cx, cy, rx, ry] = LIGHT, L = layer(area(x, y, w, h, 4)), dark = [22, 17, 14], warm = [96, 62, 40];
  each(L, (X, Y, i) => {
    const glow = Math.max(0, 1 - Math.hypot((X - cx * K) / (rx * K), (Y - cy * K) / (ry * K))) ** 1.6, smoke = vnoise(X / (30 * K) + Math.sin(Y / (40 * K)), Y / (30 * K));
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = Math.floor(dark[c] + glow * (.75 + .5 * smoke) * warm[c]); L.a[i] = 1;
  });
  return shrink(L);
}
const SATCHEL = [22, 522, 578, 222];
function satchel() {
  const A = area(...SATCHEL, 8), L = layer(A), hide = mask(A), buckle = mask(A), seam = mask(A);
  roundBox(hide, 22 * K, 540 * K, 598 * K, 742 * K, 24 * K); texture(L, [66, 42, 27], (x, y) => lit(hide, x, y), [9, 18], [1.2, 20]);   // the leather
  roundBox(seam, 30 * K, 548 * K, 590 * K, 734 * K, 18 * K, K); over(L, plain(seam, [196, 196, 196], (x, y) => (x + y) % (8 * K) < 4 * K));   // the stitches
  roundBox(buckle, 280 * K, 528 * K, 340 * K, 556 * K, 4 * K, 3 * K); over(L, shadow(buckle)); over(L, metal(buckle, 'steel', FULL, .35));
  return shrink(L);
}
const STRAP = [40, 420, 542, 98];
function strap() {
  const M = mask(area(...STRAP, 8)); arc(M, 40 * K, 260 * K, 580 * K, 510 * K, 20, 160, 2 * K);
  return shrink(over(shadow(M), metal(M, 'steel', FULL, .35)));
}
function medallion(i) {
  const [cx, cy] = MEDAL(i), A = area(cx - MEDAL_R - 1, cy - MEDAL_R - 1, 2 * MEDAL_R + 2, 2 * MEDAL_R + 2, 8), disc = mask(A), M = mask(A), X = cx * K, Y = cy * K, R = MEDAL_R * K, k = K;
  ellipse(disc, X - R, Y - R, X + R, Y + R); ellipse(M, X - R, Y - R, X + R, Y + R, Math.trunc(2.5 * K));
  if (i === 0) for (const s of [1, -1]) {                // crossed swords: damage
    line(M, X - 9 * k * s, Y + 9 * k, X + 9 * k * s, Y - 9 * k, Math.trunc(2.5 * k)); line(M, X - 5 * k * s - 3 * k, Y + 5 * k - 3 * k * s, X - 5 * k * s + 3 * k, Y + 5 * k + 3 * k * s, 2 * k);
  }
  if (i === 1) { ellipse(M, X - 4 * k, Y - 11 * k, X + 4 * k, Y + 8 * k); line(M, X + 6 * k, Y - 12 * k, X - 5 * k, Y + 12 * k, k, 0); }   // a feather: hit and dodge
  if (i === 2) { ellipse(M, X - 9 * k, Y - 7 * k, X, Y + 2 * k); ellipse(M, X, Y - 7 * k, X + 9 * k, Y + 2 * k); poly(M, [[X - 9 * k, Y - k], [X + 9 * k, Y - k], [X, Y + 10 * k]]); }   // a heart: health
  if (i === 3) { poly(M, [[X - 11 * k, Y - 6 * k], [X, Y - 3 * k], [X, Y + 8 * k], [X - 11 * k, Y + 5 * k]]); poly(M, [[X + 11 * k, Y - 6 * k], [X + k, Y - 3 * k], [X + k, Y + 8 * k], [X + 11 * k, Y + 5 * k]]); }   // an open book: learning
  return shrink(over(plain(disc, [26, 24, 22]), metal(M, 'bronze', FULL)));
}
function slot(kind, material) {                         // its material's colour, paler in the middle, with a thin edge and a dark line inside it
  const [w, h] = KIND[kind], A = area(0, 0, w, h), L = layer(A), M = mask(A), cw = A.w, ch = A.h, rgb = MATERIAL[material], round = kind === 'Round';
  if (round) ellipse(M, 0, 0, cw - 1, ch - 1); else box(M, 0, 0, cw - 1, ch - 1);
  each(A, (x, y, i) => {
    if (!M.m[i]) return; const r = Math.hypot((x - cw / 2) / (cw / 2), (y - ch / 2) / (ch / 2)), n = (vnoise(x / (4 * K), y / (4 * K)) - .5) * 10;
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = Math.floor(Math.min(255, Math.max(0, rgb[c] * (1.35 - .6 * r) + n))); L.a[i] = 1;
  });
  const edge = mask(A), inner = mask(A), wd = Math.trunc(1.5 * K);
  if (round) { ellipse(edge, 0, 0, cw - 1, ch - 1, wd); ellipse(inner, 2 * K, 2 * K, cw - 1 - 2 * K, ch - 1 - 2 * K, K); }
  else { boxLine(edge, 0, 0, cw - 1, ch - 1, wd); boxLine(inner, 2 * K, 2 * K, cw - 1 - 2 * K, ch - 1 - 2 * K, K); }
  over(L, plain(edge, (material === 'Empty' ? EDGE_EMPTY : EDGE).map(v => v * SEE))); over(L, plain(inner, [0, 0, 0]));
  return shrink(L);
}

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
function layout() {
  const face = (k, more) => ({ font: TEXT[k][0], px: TEXT[k][1], ...more });
  return {
    _note: 'Written by scripts/art/ui/character_screen.mjs: do not edit by hand. The character screen (D239 to D241) in its own pixels, 620 x 760; "at" is a top left corner. Draw in the order of "order". Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right. Every place and size here is a setting.',
    size: FULL,
    order: ['Frame', 'Stage', 'Satchel', 'medallions', 'slots', 'Strap', 'pictures', 'character', 'text'],
    pieces: { Frame: { file: 'Frame.png', at: [0, 0] }, Stage: { file: 'Stage.png', at: STAGE.slice(0, 2) }, Satchel: { file: 'Satchel.png', at: SATCHEL.slice(0, 2) }, Strap: { file: 'Strap.png', at: STRAP.slice(0, 2) } },
    medallions: STATS.map((s, i) => ({ stat: s, file: `Medallion ${s}.png`, at: [MEDAL(i)[0] - MEDAL_R - 1, MEDAL(i)[1] - MEDAL_R - 1] })),
    slots: {
      file: 'Slot <kind> <material>.png', kinds: KIND, materials: Object.keys(MATERIAL),
      gear: GEAR.map((_, i) => gearAt(i)), pack: PACK, bandage: BANDAGE,
      picture: { _note: 'An item\'s pack picture (D237) is drawn in the middle of its slot: "from" is the part of the 256 x 256 picture to take, "px" how wide to draw it in each kind of slot.', from: [105.71, 105.71, 44.57, 44.57], px: { Gear: 48, Hand: 48, Pack: 46, Round: 48 } },
    },
    character: { _note: 'The Creator character (D121), facing S, 4 times its size, hard pixels: the bottom middle of what is drawn goes at "feet".', feet: [310, 360], scale: 4 },
    text: {
      colours: { label: hex(LABEL), value: hex(VALUE), count: '#f0e8d7', count_outline: '#050505', slot_name: '#6e685e' },
      race: face('heading', { at: [104, 44], colour: 'value' }),
      list: face('line', { labels: ['Background', 'Name', 'Health', 'Run'], label_at: [40, 108], value_at: [118, 108], step: 19 }),
      stats: STATS.map((s, i) => ({ stat: s, label: face('line', { right: [526, MEDAL(i)[1] - 15] }), value: face('number', { right: [526, MEDAL(i)[1]] }) })),
      pack: face('title', { label_at: [40, 549], gap: 8, _note: '"Pack" then how full it is, from the left; "Coins" then the count, ending at coins_right.', coins_right: [566, 549] }),
      count: face('count', { _note: 'A stack\'s count, over the slot\'s picture: its top left is this far from the slot\'s bottom right. Outline 2 pixels.', from_bottom_right: [-16, -15], outline: 2 }),
      slot_name: face('slot_name', { _note: 'An empty gear slot shows its name, centred, with its top this far above the slot\'s middle.', above_middle: 6 }),
    },
  };
}

/* ---------- the check picture ---------- */
// What the draft's character wears and carries. Worn items are not also in the pack (D239). Every number is made up.
const WORN = { Chest: ['Tunic Blue', 'Cloth'], Legs: ['Trousers Undyed', 'Cloth'], Feet: ['Shoes', 'Leather'], Belt: ['Belt', 'Leather'], 'Main hand': ['Long Sword Iron', 'Iron'], 'Off hand': ['Round Shield', 'Wood'] };
const CARRIED = { 0: ['Coins', 'Gold', '37'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Iron', 'Iron'], 6: ['Axe Bronze', 'Bronze'], 12: ['Trousers Red', 'Cloth'] };
const SHEET = { race: 'Human', list: ['Well-woken', 'Unknown', '32 / 44', '55%'], stats: ['14', '11', '12', '9'], pack: '13 / 20', coins: '37', bandages: '3' };
const ITEMS = 'prototype/art/made/items/pack/', CREATOR = 'game/client/art/creator/', TILES = 'game/client/art/tiles/', PERSON = 'prototype/character/character_data.json';
const HERE = dirname(fileURLToPath(import.meta.url));

/** Puts picture `s` ({ w, h, data }) on picture `d` at x, y. */
function paste(d, s, x, y) {
  for (let j = Math.max(0, -y); j < Math.min(s.h, d.h - y); j++) for (let i = Math.max(0, -x); i < Math.min(s.w, d.w - x); i++) {
    const p = (j * s.w + i) * 4, a = s.data[p + 3] / 255; if (!a) continue; const q = ((y + j) * d.w + x + i) * 4, da = d.data[q + 3] / 255 * (1 - a), oa = a + da;
    for (let c = 0; c < 3; c++) d.data[q + c] = Math.round((s.data[p + c] * a + d.data[q + c] * da) / oa); d.data[q + 3] = Math.round(oa * 255);
  }
}
const blank = (w, h, rgba = [0, 0, 0, 0]) => { const data = Buffer.alloc(w * h * 4); if (rgba[3]) for (let i = 0; i < w * h; i++) data.set(rgba, i * 4); return { w, h, data }; };
const open = path => { const p = readPng(path); return { w: p.width, h: p.height, data: p.data }; };
function scaled(s, x, y, w, h, W2, H2, how) {            // a part of a picture at a new size
  const pre = new Float32Array(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = ((y + j) * s.w + x + i) * 4, a = s.data[p + 3] / 255, q = (j * w + i) * 4; pre[q] = Math.round(s.data[p] * a); pre[q + 1] = Math.round(s.data[p + 1] * a); pre[q + 2] = Math.round(s.data[p + 2] * a); pre[q + 3] = s.data[p + 3]; }
  const out = resize(pre, w, h, W2, H2, how), o = blank(W2, H2), c8 = v => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  for (let i = 0; i < W2 * H2; i++) { const a = c8(out[i * 4 + 3]); if (a) { const k = 255 / Math.min(255, out[i * 4 + 3]); o.data[i * 4] = c8(out[i * 4] * k); o.data[i * 4 + 1] = c8(out[i * 4 + 1] * k); o.data[i * 4 + 2] = c8(out[i * 4 + 2] * k); o.data[i * 4 + 3] = a; } }
  return o;
}
function itemPicture(name, px) { const a = scaled(open(`${ITEMS}${name}.png`), 102, 102, 52, 52, 56, 56, 'bicubic'); return scaled(a, 4, 4, 48, 48, px, px, 'lanczos'); }
function character(scale) {                             // the test game's human from the Creator's parts, each part's grey swapped for its tint (D121)
  const cd = JSON.parse(readFileSync(PERSON, 'utf8')), tints = { ...cd.races.human.tints, Shield1: '#7a5230' }, row = cd.directions.indexOf('S'), F = cd.sheet.frame_px, out = blank(F, F);   // a wooden round shield (D220)
  for (const part of cd.layer_order.S) {
    if (part === 'Shadow') continue; const s = open(`${CREATOR}${part}/Idle.png`), t = [1, 3, 5].map(i => parseInt(tints[part].slice(i, i + 2), 16)), cell = blank(F, F);
    for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) { const p = ((row * F + j) * s.w + i) * 4, q = (j * F + i) * 4; for (let c = 0; c < 3; c++) cell.data[q + c] = Math.min(255, Math.floor(s.data[p + c] * t[c] / (cd.sheet.grey_ref * 255))); cell.data[q + 3] = s.data[p + 3]; }
    paste(out, cell, 0, 0);
  }
  let x0 = F, y0 = F, x1 = 0, y1 = 0; for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) if (out.data[(j * F + i) * 4 + 3]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
  const w = (x1 - x0 + 1) * scale, h = (y1 - y0 + 1) * scale, big = blank(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.data.copy(big.data, (j * w + i) * 4, ((y0 + Math.floor(j / scale)) * F + x0 + Math.floor(i / scale)) * 4, ((y0 + Math.floor(j / scale)) * F + x0 + Math.floor(i / scale)) * 4 + 4);
  return big;
}
/** The whole screen put together from the pieces, the way character_screen.json says. */
function screen(piece) {
  const J = layout(), S = blank(W, H), T = J.text, F = k => font(join(HERE, 'fonts', `${k.font}.woff`)), col = n => [1, 3, 5].map(i => parseInt(T.colours[n].slice(i, i + 2), 16));
  const say = (str, k, at, colour, right = false, outline = 0) => drawText(S.data, W, right ? at[0] - textWidth(F(k), str, k.px) : at[0], at[1], str, F(k), k.px, col(colour), outline, col('count_outline'));
  for (const n of ['Frame', 'Stage', 'Satchel']) paste(S, piece(n), ...J.pieces[n].at);
  for (const m of J.medallions) paste(S, piece(`Medallion ${m.stat}`), ...m.at);
  const slots = [...J.slots.gear.map(g => ({ ...g, holds: WORN[g.name] })), ...Array.from({ length: PACK.columns * PACK.rows }, (_, i) => ({ kind: 'Pack', at: packAt(i), holds: CARRIED[i] })), { ...J.slots.bandage, holds: ['Bandage', 'Cloth', SHEET.bandages] }];
  for (const s of slots) paste(S, piece(`Slot ${s.kind} ${s.holds ? s.holds[1] : 'Empty'}`), ...s.at);
  paste(S, piece('Strap'), ...J.pieces.Strap.at);
  for (const s of slots) {
    const [w, h] = KIND[s.kind], px = J.slots.picture.px[s.kind];
    if (s.holds) { paste(S, itemPicture(s.holds[0], px), Math.trunc(s.at[0] + w / 2 - px / 2), Math.trunc(s.at[1] + h / 2 - px / 2)); if (s.holds[2]) say(s.holds[2], T.count, [s.at[0] + w + T.count.from_bottom_right[0], s.at[1] + h + T.count.from_bottom_right[1]], 'count', false, T.count.outline); }
    else if (s.name) say(s.name, T.slot_name, [s.at[0] + (w - textWidth(F(T.slot_name), s.name, T.slot_name.px)) / 2, s.at[1] + h / 2 - T.slot_name.above_middle], 'slot_name');
  }
  const body = character(J.character.scale); paste(S, body, Math.trunc(J.character.feet[0] - body.w / 2), J.character.feet[1] - body.h);
  say(SHEET.race, T.race, T.race.at, 'value');
  T.list.labels.forEach((l, i) => { say(l, T.list, [T.list.label_at[0], T.list.label_at[1] + i * T.list.step], 'label'); say(SHEET.list[i], T.list, [T.list.value_at[0], T.list.value_at[1] + i * T.list.step], 'value'); });
  T.stats.forEach((s, i) => { say(s.stat, s.label, s.label.right, 'label', true); say(SHEET.stats[i], s.value, s.value.right, 'value', true); });
  const P = T.pack, wide = str => textWidth(F(P), str, P.px);
  say('Pack', P, P.label_at, 'label'); say(SHEET.pack, P, [P.label_at[0] + wide('Pack') + P.gap, P.label_at[1]], 'value');
  say(SHEET.coins, P, P.coins_right, 'value', true); say('Coins', P, [P.coins_right[0] - wide(SHEET.coins) - P.gap, P.coins_right[1]], 'label', true);
  return S;
}
/** The screen over what it opens on: the game's grass with a tree and a rock, dimmed. */
function shot(S, scale) {
  const w = S.w + 60, h = S.h + 40, B = blank(w, h, [30, 32, 36, 255]), g = open(`${TILES}Ground A2_S.png`);
  for (let j = -2; j < Math.floor(h / 32) + 4; j++) for (let i = -2; i < Math.floor(w / 128) + 3; i++) { const x = i * 128 + (j % 2 ? 64 : 0) - 128, y = j * 32 - 208; if (x > -256 && x < w && y > -256 && y < h) paste(B, g, x, y); }
  paste(B, open(`${TILES}Tree A1_S.png`), 250, -40); paste(B, open(`${TILES}Stone A1_S.png`), -60, 250); paste(B, blank(w, h, [0, 0, 0, 120]), 0, 0);
  const sw = S.w + 40, sh = S.h + 40, m = new Uint8Array(sw * sh); for (let y = 24; y <= S.h + 24; y++) for (let x = 20; x <= S.w + 20; x++) m[y * sw + x] = 200;
  const soft = blur(m, sw, sh, 9), dark = blank(sw, sh); for (let i = 0; i < sw * sh; i++) dark.data[i * 4 + 3] = soft[i];   // the screen's own shadow
  paste(B, dark, 10, 0); paste(B, S, 30, 20);
  return scale === 1 ? B : scaled(B, 0, 0, w, h, w * scale, h * scale, 'lanczos');
}

/* ---------- the command line ---------- */
export const PIECES = {
  Frame: frame, Stage: stage, Satchel: satchel, Strap: strap,
  ...Object.fromEntries(STATS.map((s, i) => [`Medallion ${s}`, () => medallion(i)])),
  ...Object.fromEntries(Object.keys(KIND).flatMap(k => Object.keys(MATERIAL).filter(m => k !== 'Round' || m === 'Cloth' || m === 'Empty').map(m => [`Slot ${k} ${m}`, () => slot(k, m)]))),
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(1);
  if (argv.includes('--draft')) {
    const made = new Map(), piece = n => { if (!made.has(n)) made.set(n, PIECES[n]()); return made.get(n); };
    const out = flag('--shot', 'prototype/shots/ui-character-screen.png'), p = shot(screen(piece), +flag('--scale', 2));
    writePng(out, p.data, p.w, p.h); console.log(`${out} (${p.w} x ${p.h}) in ${secs()} s. It holds bought art: never commit it.`);
  } else {
    const out = flag('--out', 'prototype/art/made/ui');
    for (const [n, make] of Object.entries(PIECES)) { const p = make(); writePng(`${out}/${n}.png`, p.data, p.w, p.h); }
    mkdirSync(out, { recursive: true }); writeFileSync(`${out}/character_screen.json`, JSON.stringify(layout(), null, '\t') + '\n');
    console.log(`${Object.keys(PIECES).length} pieces and character_screen.json in ${out}/ in ${secs()} s`);
  }
}
