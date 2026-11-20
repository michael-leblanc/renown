// The loot window (D142, D248) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// Every item, count and number shown is made up. The window is 1152 x 648.
//   Top:    what you opened, as its own boards: a chest's planks, iron bands and lock, like the chest in the world. 12 slots (made up: no decision says how much a chest holds).
//   Middle: "Take all" moves everything that fits (D142, D124); the round button closes.
//   Bottom: your pack, the character screen's satchel and its 12 + 8 slots (D124, D239), so an item is seen going where it will be found.
//   Left:   the item under the pointer, by name (D132), with its material and reference value (D37).
// A click moves an item to the pack at once in the slice (D142). Under the chest's name: who owns what is inside, since that is what makes taking it a theft (D35).
// New, not decided: the item note, the owner line's words, the keys, a chest's 12 slots. A body would open the same window under its description (D128): not drawn.
//
// The pieces, like the HUD's (#50) and the death screen's (#52), into game/client/art/made/ui/loot/ (--pieces):
//   Boards                         the chest's boards, bands and lock
//   Satchel                        the pack's open leather and buckle
//   Slot <material>                a slot's background (50 x 70), tinted by its item's material, the character screen's way; Empty when nothing is in it
//   Slot Lit                       the pale gold line and glow round the slot under the pointer
//   Plate Note                     the note on the item under the pointer: it moves down with the pointed slot's row
//   Button Take All, Button Close
//   loot.json                      where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/loot_window.mjs                        the draft, prototype/shots/ui-loot.png (a few seconds)
//   node scripts/art/ui/loot_window.mjs --pieces [--out dir]   the pieces and loot.json, into game/client/art/made/ui/loot/ (a few seconds)
//   node scripts/art/ui/loot_window.mjs --check [--out dir]
//       puts the window together from the pieces the way the json says, into prototype/shots/ui-loot-pieces.png, and counts the pixels
//       that differ from the draft. Write the pieces first.
// Every picture in prototype/shots/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, MATERIAL, plate, boards, leather, slot, slotGlow, item, packSlot, wordButton, button, world, draw, wide, save, open, bake } from './pieces.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

const CHEST = { name: 'Chest', owner: 'It belongs to no one', holds: { 0: ['Coins', 'Gold', '23'], 1: ['Long Sword Bronze', 'Bronze'], 2: ['Leather Trousers', 'Leather'], 3: ['Arrows', 'Wood', '12'], 4: ['Bandage', 'Cloth', '2'], 6: ['Helmet Iron', 'Iron'] }, slots: 12, columns: 6 };
const PACK = { holds: { 0: ['Coins', 'Gold', '37'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Steel', 'Steel'], 6: ['Axe Bronze', 'Bronze'], 12: ['Trousers Red', 'Cloth'] }, slots: 20, columns: 10, full: '8 / 20', coins: '37' };
const POINTED = 1, NOTE = { name: 'Long Sword', lines: [['Material', 'Bronze'], ['Held', 'One hand'], ['Value', '40']], hint: 'Click to take' };

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const SX = 548, SW = 578, CX = SX + SW / 2;                      // the window's column: the pack's satchel spans it, the rest is centred on it
const BW = 444, BH = 214, BX = CX - BW / 2, BY = 60;            // the chest's boards
const SLOT = [50, 70], STEP = [54, 80];                          // a slot, and from one to the next
const chestAt = i => [BX + 62 + (i % CHEST.columns) * STEP[0], BY + 46 + Math.floor(i / CHEST.columns) * STEP[1]];
const NOTE_BOX = [168, 126, 10, -6];                             // the note: width, height, gap left of the boards, y from the pointed slot's top
const TY = BY + BH + 16, TAKE = [CX - 92, TY, 184, 44], CLOSE = [CX + 92 + 40, TY + 22, 17];
const LY = 372, LH = 226, packAt = i => [SX + 18 + (i % PACK.columns) * STEP[0] + 2, LY + 52 + Math.floor(i / PACK.columns) * STEP[1]];
const noteAt = py => [BX - NOTE_BOX[0] - NOTE_BOX[2], py + NOTE_BOX[3]];

function screen() {
  const S = world({ you: 'plain', at: [150, 250], chest: 'open', yours: [2, 2], facing: 'E' }), parts = [], texts = [];
  const cx = CX, bx = BX, by = BY, bw = BW;
  // what you opened
  parts.push(boards(bx, by, bw, BH));
  texts.push([CHEST.name, 'mid', bx + 64, by + 10, 'value', 'left', 2], [CHEST.owner, 'small', bx + bw - 64, by + 16, 'hint', 'right', 2]);
  for (let i = 0; i < CHEST.slots; i++) packSlot(parts, texts, ...chestAt(i), CHEST.holds[i], i === POINTED);
  // the item under the pointer
  const [nw, nh] = NOTE_BOX, [nx, ny] = noteAt(chestAt(POINTED)[1]); parts.push(plate(nx, ny, nw, nh, { full: [W, H] }));
  texts.push([NOTE.name, 'title', nx + 16, ny + 12, 'value']); NOTE.lines.forEach(([l, v], i) => texts.push([l, 'line', nx + 16, ny + 40 + i * 19, 'label'], [v, 'line', nx + nw - 16, ny + 40 + i * 19, 'value', 'right']));
  texts.push([NOTE.hint, 'small', nx + 16, ny + nh - 22, 'hint']);
  // take all, close
  const ty = TY; parts.push(wordButton(...TAKE, true), button('Close', ...CLOSE)); texts.push(['Take all', 'mid', cx, ty + 9, 'glow', 'center', 2], ['Space', 'small', cx - 92 - 14, ty + 15, 'hint', 'right', 2], ['Esc', 'small', cx + 92 + 64, ty + 15, 'hint', 'left', 2]);
  // your pack
  const sx = SX, sw = SW, ly = LY; parts.push(leather(sx, ly, sw, LH));
  texts.push(['Pack', 'title', sx + 22, ly + 22, 'label', 'left', 1], [PACK.full, 'title', sx + 22 + wide('Pack', 'title') + 8, ly + 22, 'value', 'left', 1], [PACK.coins, 'title', sx + sw - 22, ly + 22, 'value', 'right', 1], ['Coins', 'title', sx + sw - 22 - wide(PACK.coins, 'title') - 8, ly + 22, 'label', 'right', 1]);
  for (let i = 0; i < PACK.slots; i++) packSlot(parts, texts, ...packAt(i), PACK.holds[i]);
  return draw(S, parts, texts);
}

/* ---------- the pieces ---------- */
const MATERIALS = Object.keys(MATERIAL);
const PIECES = {
  Boards: () => [boards(BX, BY, BW, BH)],
  Satchel: () => [leather(SX, LY, SW, LH)],
  ...Object.fromEntries(MATERIALS.map(m => [`Slot ${m}`, () => [slot(0, 0, ...SLOT, m)]])),
  'Slot Lit': () => [slotGlow(...chestAt(POINTED), ...SLOT)],
  'Plate Note': () => [plate(...noteAt(chestAt(0)[1]), NOTE_BOX[0], NOTE_BOX[1], { full: [W, H] })],
  'Button Take All': () => [wordButton(...TAKE, true)],
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), lit = chestAt(POINTED), [nx, ny] = noteAt(chestAt(0)[1]), [nw, nh] = NOTE_BOX;
  return {
    _note: 'Written by scripts/art/ui/loot_window.mjs --pieces: do not edit by hand. The loot window (D142, D248) in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. The window is one block on the right of the screen: in another window size it would keep to the right (not done).',
    size: [W, H],
    order: ['Boards', 'chest slots', 'Slot Lit', 'chest pictures', 'Plate Note', 'Button Take All', 'Button Close', 'Satchel', 'pack slots', 'pack pictures', 'text'],
    pieces: Object.fromEntries(['Boards', 'Button Take All', 'Button Close', 'Satchel'].map(n => [n, P(n)])),
    slots: {
      _note: 'Each slot: "Slot <material>" at its place, the material of what it holds (Empty when nothing). The slot under the pointer, when it holds something: Slot Lit, its corner "lit" from the slot\'s. An item\'s pack picture (D237): the part "from" of the 256 x 256 picture, drawn "px" wide, its corner "picture" from the slot\'s. A count (coins, arrows, bandages: D124) right-aligned, its top right "count" from the slot\'s corner.',
      file: 'Slot <material>.png', size: SLOT, materials: MATERIALS, lit: { file: 'Slot Lit.png', dx: at['Slot Lit'][0] - lit[0], dy: at['Slot Lit'][1] - lit[1] },
      picture: { from: [103, 103, 50, 50], px: 46, dx: 2, dy: 12 }, count: { face: 'line', right: [SLOT[0] - 5, SLOT[1] - 18], colour: 'value', outline: 2 },
    },
    chest: { _note: 'What you opened: a slot\'s corner is first + step times its column and row. How many slots a chest has is not decided (12 here).', first: chestAt(0), step: STEP, columns: CHEST.columns, rect: [BX, BY, BW, BH] },
    pack: { _note: 'Your pack: 12 slots, 20 with a backpack (D124).', first: packAt(0), step: STEP, columns: PACK.columns, most: PACK.slots },
    note: {
      _note: 'The note on the item under the pointer, shown only while a chest slot that holds something is pointed at: Plate Note goes "dy" lower for each row below the first (it is drawn for the first row); its texts are placed from the plate\'s corner, which is at "corner" for the first row.',
      file: 'Plate Note.png', at: at['Plate Note'], dy: STEP[1], corner: [nx, ny], size: [nw, nh],
      name: { face: 'title', at: [16, 12], colour: 'value' }, lines: { face: 'line', label_at: [16, 40], value_right: [nw - 16, 40], step: 19, label: 'label', value: 'value' },
      hint: { face: 'small', at: [16, nh - 22], colour: 'hint', text: NOTE.hint },
    },
    take_all: { _note: 'Takes everything that fits (D142, D124): a click, or Space.', rect: TAKE, key: 'Space' },
    close: { _note: 'A click, or Esc.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'title', 'line', 'small'].map(k => [k, face(k)])),
      chest_name: { face: 'mid', at: [BX + 64, BY + 10], colour: 'value', outline: 2 }, owner: { face: 'small', right: [BX + BW - 64, BY + 16], colour: 'hint', outline: 2, _note: 'who owns what is inside (D35); the words are not decided' },
      take_all: { text: 'Take all', face: 'mid', centre: [CX, TY + 9], colour: 'glow', outline: 2 },
      take_key: { text: 'Space', face: 'small', right: [CX - 92 - 14, TY + 15], colour: 'hint', outline: 2 }, close_key: { text: 'Esc', face: 'small', at: [CX + 92 + 64, TY + 15], colour: 'hint', outline: 2 },
      pack: { _note: '"Pack", then "filled / slots" "gap" after it; at the right, "Coins" then the coins, the coins right-aligned and "Coins" "gap" before them.', face: 'title', label_at: [SX + 22, LY + 22], right: [SX + SW - 22, LY + 22], gap: 8, label: 'label', value: 'value', outline: 1, words: ['Pack', 'Coins'] },
    },
  };
}

/* ---------- the check: the window from the pieces ---------- */
function check(dir) {
  const J = JSON.parse(readFileSync(`${dir}/loot.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), S = J.slots, X = J.text;
  const slotAt = (G, i) => [G.first[0] + (i % G.columns) * G.step[0], G.first[1] + Math.floor(i / G.columns) * G.step[1]];
  const fill = (G, holds, n, lit = -1) => {
    for (let i = 0; i < n; i++) put(S.file.replace('<material>', holds[i] ? holds[i][1] : 'Empty'), slotAt(G, i));
    if (lit >= 0 && holds[lit]) { const [x, y] = slotAt(G, lit); put(S.lit.file, [x + S.lit.dx, y + S.lit.dy]); }
    for (let i = 0; i < n; i++) if (holds[i]) { const [x, y] = slotAt(G, i); parts.push([item(holds[i][0], S.picture.px), x + S.picture.dx, y + S.picture.dy]); if (holds[i][2]) texts.push([holds[i][2], S.count.face, x + S.count.right[0], y + S.count.right[1], S.count.colour, 'right', S.count.outline]); }
  };
  put(J.pieces.Boards.file, J.pieces.Boards.at); fill(J.chest, CHEST.holds, CHEST.slots, POINTED);
  const row = Math.floor(POINTED / J.chest.columns), N = J.note, [nx, ny] = [N.corner[0], N.corner[1] + row * N.dy]; put(N.file, [N.at[0], N.at[1] + row * N.dy]);
  texts.push([NOTE.name, N.name.face, nx + N.name.at[0], ny + N.name.at[1], N.name.colour]);
  NOTE.lines.forEach(([l, v], i) => texts.push([l, N.lines.face, nx + N.lines.label_at[0], ny + N.lines.label_at[1] + i * N.lines.step, N.lines.label], [v, N.lines.face, nx + N.lines.value_right[0], ny + N.lines.value_right[1] + i * N.lines.step, N.lines.value, 'right']));
  texts.push([N.hint.text, N.hint.face, nx + N.hint.at[0], ny + N.hint.at[1], N.hint.colour]);
  for (const n of ['Button Take All', 'Button Close', 'Satchel']) put(J.pieces[n].file, J.pieces[n].at);
  fill(J.pack, PACK.holds, PACK.slots);
  texts.push([CHEST.name, X.chest_name.face, ...X.chest_name.at, X.chest_name.colour, 'left', 2], [CHEST.owner, X.owner.face, ...X.owner.right, X.owner.colour, 'right', 2]);
  for (const [k, align] of [['take_all', 'center'], ['take_key', 'right'], ['close_key', 'left']]) { const T = X[k]; texts.push([T.text, T.face, ...(T.centre ?? T.right ?? T.at), T.colour, align, T.outline]); }
  const Pk = X.pack, [lx, ly] = Pk.label_at, [rx] = Pk.right;
  texts.push([Pk.words[0], Pk.face, lx, ly, Pk.label, 'left', Pk.outline], [PACK.full, Pk.face, lx + wide(Pk.words[0], Pk.face) + Pk.gap, ly, Pk.value, 'left', Pk.outline]);
  texts.push([PACK.coins, Pk.face, rx, ly, Pk.value, 'right', Pk.outline], [Pk.words[1], Pk.face, rx - wide(PACK.coins, Pk.face) - Pk.gap, ly, Pk.label, 'right', Pk.outline]);
  return draw(world({ you: 'plain', at: [150, 250], chest: 'open', yours: [2, 2], facing: 'E' }), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/loot'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/loot.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and loot.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/loot.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/loot_window.mjs --pieces`); process.exit(1); }
  const A = check(out), B = screen(); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'prototype/shots/ui-loot-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(), 'prototype/shots/ui-loot.png', t0);
