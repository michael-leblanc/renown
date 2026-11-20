// A body's loot window (D248, D128): the loot window (loot_window.mjs) opened on someone lying where they fell.
// Every item, count, number and word shown is made up. The window is 1152 x 648.
//   Top:    the body, on a slate plate in the character screen's look (D240), under the word "Loot" (Michael, 2026-11-20: the body's
//           description from D128 was too much as a title). A corpse holds everything it wore and
//           carried, coins included (D3, D123): what it wore in a row, in the character screen's gear order (an empty one shows its name),
//           then what it carried, 12 slots or 20 with a backpack (D124).
//   Middle: "Take all" moves everything that fits (D142, D124); the round button closes.
//   Bottom: your pack, the loot window's satchel, the same place and size.
//   Left:   the item under the pointer, as in the loot window.
// A corpse's gear is free world loot (D3), so the line beside the title says so; its words are not decided.
//
// The pieces, like the loot window's (#54), into game/client/art/made/ui/body/ (--pieces):
//   Panel                          the body's slate plate
//   Rule Carried                   the two short rules either side of the word "Carried"
//   Satchel                        the pack's open leather and buckle
//   Slot <material>                a slot's background (50 x 70), tinted by its item's material; Empty when nothing is in it
//   Slot Lit                       the pale gold line and glow round the slot under the pointer
//   Plate Note                     the note on the item under the pointer: it moves with the pointed slot
//   Button Take All, Button Close
//   body.json                      where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/body_loot.mjs                        the draft, prototype/shots/ui-body-loot.png (a few seconds)
//   node scripts/art/ui/body_loot.mjs --pieces [--out dir]   the pieces and body.json, into game/client/art/made/ui/body/ (a few seconds)
//   node scripts/art/ui/body_loot.mjs --check [--out dir]
//       puts the window together from the pieces the way the json says, into prototype/shots/ui-body-loot-pieces.png, and counts the
//       pixels that differ from the draft. Write the pieces first.
// Every picture in prototype/shots/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, MATERIAL, plate, leather, slot, slotGlow, item, packSlot, wordButton, button, world, draw, wide, save, open, bake, heading } from './pieces.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

const GEAR = ['Main hand', 'Head', 'Chest', 'Hands', 'Back', 'Belt', 'Legs', 'Feet', 'Off hand'];   // the character screen's order
const BODY = {
  name: 'Loot', free: 'Free to take',
  worn: { 'Main hand': ['Axe Iron', 'Iron'], Head: ['Helmet Iron', 'Iron'], Chest: ['Platebody Iron', 'Iron'], Hands: ['Gauntlets Iron', 'Iron'], Back: ['Backpack', 'Leather'], Belt: ['Belt', 'Leather'], Legs: ['Leather Trousers', 'Leather'], Feet: ['Metal Boots Iron', 'Iron'] },
  carried: { 0: ['Coins', 'Gold', '61'], 1: ['Bandage', 'Cloth', '3'], 2: ['Mace Bronze', 'Bronze'], 3: ['Hood Red', 'Cloth'], 4: ['Spear Steel', 'Steel'], 10: ['Arrows', 'Wood', '9'] }, slots: 20,
};
const PACK = { holds: { 0: ['Coins', 'Gold', '37'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Steel', 'Steel'], 6: ['Axe Bronze', 'Bronze'], 12: ['Trousers Red', 'Cloth'] }, slots: 20, columns: 10, full: '8 / 20', coins: '37' };
const POINTED = 2, NOTE = { name: 'Platebody', lines: [['Material', 'Iron'], ['Worn on', 'Chest'], ['Value', '120']], hint: 'Click to take' };
const SCENE = { you: 'plain', at: [150, 250], chest: 'closed', yours: [2, 2], facing: 'S', body: { at: [3, 3], race: 'orc', facing: 'NE', tints: { Chest1: '#8c949c', Legs1: '#5a4430', Head1: '#2a2018' } } };

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const SX = 548, SW = 578, CX = SX + SW / 2;                       // the window's column: the body's plate and your pack's satchel both span it
const PY = 14, PH = 310;                                          // the body's plate
const SLOT = [50, 70], STEP = [54, 80], COLUMNS = 10;              // a slot, and from one to the next
const wornAt = i => [Math.round(CX - (GEAR.length * STEP[0] - (STEP[0] - SLOT[0])) / 2) + i * STEP[0], PY + 40];
const RULE_Y = PY + 122, carriedAt = i => [SX + 20 + (i % COLUMNS) * STEP[0], PY + 146 + Math.floor(i / COLUMNS) * STEP[1]];
const NOTE_BOX = [168, 126, 10, -6];                              // the note: width, height, gap left of the plate, y from the pointed slot's top
const TY = PY + PH + 12, TAKE = [CX - 92, TY, 184, 44], CLOSE = [CX + 92 + 40, TY + 22, 17];
const LY = 402, LH = 226, packAt = i => [SX + 20 + (i % PACK.columns) * STEP[0], LY + 52 + Math.floor(i / PACK.columns) * STEP[1]];
const noteAt = py => [SX - NOTE_BOX[0] - NOTE_BOX[2], py + NOTE_BOX[3]];
const NAME_FACE = wide(BODY.name, 'mid') + wide(BODY.free, 'small') + 24 <= SW - 44 ? 'mid' : 'title';   // a long title drops a size

const ruleParts = () => { const p = [], t = []; heading(p, t, 'Carried', CX, RULE_Y, SW / 2 - 24, 'title', 'label'); return p; };
const nameSlot = (texts, name, [x, y]) => texts.push([name, 'small', x + SLOT[0] / 2, y + SLOT[1] / 2 - 7, 'dim', 'center']);

function screen() {
  const S = world(SCENE), parts = [], texts = [];
  // the body
  parts.push(plate(SX, PY, SW, PH));
  texts.push([BODY.name, NAME_FACE, SX + 22, PY + 12, 'value', 'left', 1], [BODY.free, 'small', SX + SW - 22, PY + 18, 'hint', 'right', 1]);
  GEAR.forEach((g, i) => { packSlot(parts, texts, ...wornAt(i), BODY.worn[g], i === POINTED); if (!BODY.worn[g]) nameSlot(texts, g, wornAt(i)); });
  parts.push(...ruleParts()); texts.push(['Carried', 'title', CX, RULE_Y, 'label', 'center', 1]);
  for (let i = 0; i < BODY.slots; i++) packSlot(parts, texts, ...carriedAt(i), BODY.carried[i]);
  // the item under the pointer
  const [nw, nh] = NOTE_BOX, [nx, ny] = noteAt(wornAt(POINTED)[1]); parts.push(plate(nx, ny, nw, nh, { full: [W, H] }));
  texts.push([NOTE.name, 'title', nx + 16, ny + 12, 'value']); NOTE.lines.forEach(([l, v], i) => texts.push([l, 'line', nx + 16, ny + 40 + i * 19, 'label'], [v, 'line', nx + nw - 16, ny + 40 + i * 19, 'value', 'right']));
  texts.push([NOTE.hint, 'small', nx + 16, ny + nh - 22, 'hint']);
  // take all, close
  parts.push(wordButton(...TAKE, true), button('Close', ...CLOSE)); texts.push(['Take all', 'mid', CX, TY + 9, 'glow', 'center', 2], ['Space', 'small', CX - 92 - 14, TY + 15, 'hint', 'right', 2], ['Esc', 'small', CX + 92 + 64, TY + 15, 'hint', 'left', 2]);
  // your pack
  parts.push(leather(SX, LY, SW, LH));
  texts.push(['Pack', 'title', SX + 22, LY + 22, 'label', 'left', 1], [PACK.full, 'title', SX + 22 + wide('Pack', 'title') + 8, LY + 22, 'value', 'left', 1], [PACK.coins, 'title', SX + SW - 22, LY + 22, 'value', 'right', 1], ['Coins', 'title', SX + SW - 22 - wide(PACK.coins, 'title') - 8, LY + 22, 'label', 'right', 1]);
  for (let i = 0; i < PACK.slots; i++) packSlot(parts, texts, ...packAt(i), PACK.holds[i]);
  return draw(S, parts, texts);
}

/* ---------- the pieces ---------- */
const MATERIALS = Object.keys(MATERIAL);
const PIECES = {
  Panel: () => [plate(SX, PY, SW, PH)],
  'Rule Carried': ruleParts,
  Satchel: () => [leather(SX, LY, SW, LH)],
  ...Object.fromEntries(MATERIALS.map(m => [`Slot ${m}`, () => [slot(0, 0, ...SLOT, m)]])),
  'Slot Lit': () => [slotGlow(...wornAt(POINTED), ...SLOT)],
  'Plate Note': () => [plate(...noteAt(wornAt(0)[1]), NOTE_BOX[0], NOTE_BOX[1], { full: [W, H] })],
  'Button Take All': () => [wordButton(...TAKE, true)],
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), lit = wornAt(POINTED), [nx, ny] = noteAt(wornAt(0)[1]), [nw, nh] = NOTE_BOX;
  return {
    _note: 'Written by scripts/art/ui/body_loot.mjs --pieces: do not edit by hand. A body\'s loot window (D248, D128): the loot window opened on someone lying where they fell, in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. The window is one block on the right of the screen: in another window size it would keep to the right (not done).',
    size: [W, H],
    order: ['Panel', 'worn slots', 'Slot Lit', 'worn pictures', 'Rule Carried', 'carried slots', 'carried pictures', 'Plate Note', 'Button Take All', 'Button Close', 'Satchel', 'pack slots', 'pack pictures', 'text'],
    pieces: Object.fromEntries(['Panel', 'Rule Carried', 'Button Take All', 'Button Close', 'Satchel'].map(n => [n, P(n)])),
    slots: {
      _note: 'Each slot: "Slot <material>" at its place, the material of what it holds (Empty when nothing). The slot under the pointer, when it holds something: Slot Lit, its corner "lit" from the slot\'s. An item\'s pack picture (D237): the part "from" of the 256 x 256 picture, drawn "px" wide, its corner "picture" from the slot\'s. A count (coins, arrows, bandages: D124) right-aligned, its top right "count" from the slot\'s corner.',
      file: 'Slot <material>.png', size: SLOT, materials: MATERIALS, lit: { file: 'Slot Lit.png', dx: at['Slot Lit'][0] - lit[0], dy: at['Slot Lit'][1] - lit[1] },
      picture: { from: [103, 103, 50, 50], px: 46, dx: 2, dy: 12 }, count: { face: 'line', right: [SLOT[0] - 5, SLOT[1] - 18], colour: 'value', outline: 2 },
    },
    worn: { _note: 'What the body wore, in the character screen\'s gear order. An empty slot shows its gear name, centred, its top "name_dy" from the slot\'s top.', names: GEAR, at: GEAR.map((_, i) => wornAt(i)), name: { face: 'small', dy: SLOT[1] / 2 - 7, colour: 'dim' } },
    carried: { _note: 'What the body carried: a slot\'s corner is first + step times its column and row. 12 slots, 20 if it wore a backpack (D124).', first: carriedAt(0), step: STEP, columns: COLUMNS, most: BODY.slots },
    pack: { _note: 'Your pack: 12 slots, 20 with a backpack (D124).', first: packAt(0), step: STEP, columns: PACK.columns, most: PACK.slots },
    note: {
      _note: 'The note on the item under the pointer, shown only while a slot of the body that holds something is pointed at. Plate Note is drawn for the worn row: for a carried slot it goes down by that slot\'s top minus the worn row\'s top; its texts are placed from the plate\'s corner, which is at "corner" for the worn row.',
      file: 'Plate Note.png', at: at['Plate Note'], corner: [nx, ny], size: [nw, nh], row_top: wornAt(0)[1],
      name: { face: 'title', at: [16, 12], colour: 'value' }, lines: { face: 'line', label_at: [16, 40], value_right: [nw - 16, 40], step: 19, label: 'label', value: 'value' },
      hint: { face: 'small', at: [16, nh - 22], colour: 'hint', text: NOTE.hint },
    },
    take_all: { _note: 'Takes everything that fits (D142, D124), worn gear included: a click, or Space.', rect: TAKE, key: 'Space' },
    close: { _note: 'A click, or Esc.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow', 'dim'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'title', 'line', 'small'].map(k => [k, face(k)])),
      name: { _note: 'The title: "Loot" (Michael, 2026-11-20; not the body\'s description). "title" when it does not fit in "mid" beside the free line.', text: BODY.name, face: 'mid', smaller: 'title', at: [SX + 22, PY + 12], colour: 'value', outline: 1, fits: SW - 44 - 24 },
      free: { _note: 'A corpse\'s gear is free world loot (D3); the words are not decided.', face: 'small', right: [SX + SW - 22, PY + 18], colour: 'hint', outline: 1, text: BODY.free },
      carried: { text: 'Carried', face: 'title', centre: [CX, RULE_Y], colour: 'label', outline: 1 },
      take_all: { text: 'Take all', face: 'mid', centre: [CX, TY + 9], colour: 'glow', outline: 2 },
      take_key: { text: 'Space', face: 'small', right: [CX - 92 - 14, TY + 15], colour: 'hint', outline: 2 }, close_key: { text: 'Esc', face: 'small', at: [CX + 92 + 64, TY + 15], colour: 'hint', outline: 2 },
      pack: { _note: '"Pack", then "filled / slots" "gap" after it; at the right, "Coins" then the coins, the coins right-aligned and "Coins" "gap" before them.', face: 'title', label_at: [SX + 22, LY + 22], right: [SX + SW - 22, LY + 22], gap: 8, label: 'label', value: 'value', outline: 1, words: ['Pack', 'Coins'] },
    },
  };
}

/* ---------- the check: the window from the pieces ---------- */
function check(dir) {
  const J = JSON.parse(readFileSync(`${dir}/body.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), S = J.slots, X = J.text;
  const gridAt = (G, i) => [G.first[0] + (i % G.columns) * G.step[0], G.first[1] + Math.floor(i / G.columns) * G.step[1]];
  const fill = (places, holds, lit = -1) => {
    places.forEach((p, i) => put(S.file.replace('<material>', holds[i] ? holds[i][1] : 'Empty'), p));
    if (lit >= 0 && holds[lit]) { const [x, y] = places[lit]; put(S.lit.file, [x + S.lit.dx, y + S.lit.dy]); }
    places.forEach(([x, y], i) => { if (holds[i]) { parts.push([item(holds[i][0], S.picture.px), x + S.picture.dx, y + S.picture.dy]); if (holds[i][2]) texts.push([holds[i][2], S.count.face, x + S.count.right[0], y + S.count.right[1], S.count.colour, 'right', S.count.outline]); } });
  };
  put(J.pieces.Panel.file, J.pieces.Panel.at);
  const worn = J.worn.names.map(g => BODY.worn[g]); fill(J.worn.at, worn, POINTED);
  J.worn.names.forEach((g, i) => { if (!worn[i]) { const [x, y] = J.worn.at[i]; texts.push([g, J.worn.name.face, x + S.size[0] / 2, y + J.worn.name.dy, J.worn.name.colour, 'center']); } });
  put(J.pieces['Rule Carried'].file, J.pieces['Rule Carried'].at);
  fill(Array.from({ length: J.carried.most }, (_, i) => gridAt(J.carried, i)), BODY.carried);
  const N = J.note, down = J.worn.at[POINTED][1] - N.row_top, [nx, ny] = [N.corner[0], N.corner[1] + down]; put(N.file, [N.at[0], N.at[1] + down]);
  texts.push([NOTE.name, N.name.face, nx + N.name.at[0], ny + N.name.at[1], N.name.colour]);
  NOTE.lines.forEach(([l, v], i) => texts.push([l, N.lines.face, nx + N.lines.label_at[0], ny + N.lines.label_at[1] + i * N.lines.step, N.lines.label], [v, N.lines.face, nx + N.lines.value_right[0], ny + N.lines.value_right[1] + i * N.lines.step, N.lines.value, 'right']));
  texts.push([N.hint.text, N.hint.face, nx + N.hint.at[0], ny + N.hint.at[1], N.hint.colour]);
  for (const n of ['Button Take All', 'Button Close', 'Satchel']) put(J.pieces[n].file, J.pieces[n].at);
  fill(Array.from({ length: J.pack.most }, (_, i) => gridAt(J.pack, i)), PACK.holds);
  const nf = wide(BODY.name, X.name.face) + wide(X.free.text, X.free.face) <= X.name.fits ? X.name.face : X.name.smaller;
  texts.push([BODY.name, nf, ...X.name.at, X.name.colour, 'left', X.name.outline], [X.free.text, X.free.face, ...X.free.right, X.free.colour, 'right', X.free.outline]);
  for (const [k, align] of [['carried', 'center'], ['take_all', 'center'], ['take_key', 'right'], ['close_key', 'left']]) { const T = X[k]; texts.push([T.text, T.face, ...(T.centre ?? T.right ?? T.at), T.colour, align, T.outline]); }
  const Pk = X.pack, [lx, ly] = Pk.label_at, [rx] = Pk.right;
  texts.push([Pk.words[0], Pk.face, lx, ly, Pk.label, 'left', Pk.outline], [PACK.full, Pk.face, lx + wide(Pk.words[0], Pk.face) + Pk.gap, ly, Pk.value, 'left', Pk.outline]);
  texts.push([PACK.coins, Pk.face, rx, ly, Pk.value, 'right', Pk.outline], [Pk.words[1], Pk.face, rx - wide(PACK.coins, Pk.face) - Pk.gap, ly, Pk.label, 'right', Pk.outline]);
  return draw(world(SCENE), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/body'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/body.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and body.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/body.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/body_loot.mjs --pieces`); process.exit(1); }
  const A = check(out), B = screen(); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'prototype/shots/ui-body-loot-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(), 'prototype/shots/ui-body-loot.png', t0);
