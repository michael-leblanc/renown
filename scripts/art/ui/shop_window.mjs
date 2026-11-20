// The shop window: opened on a shopkeeper (D64, D48), in the loot window's family (D248): the shop's stock over your pack.
// Prices are not decided, so every item, price, count, coin and word shown is made up (placeholders, not settings yet).
// The window is 1152 x 648.
//   Top:    the shop's stock on a slate plate in the character screen's look (D240), under the word "Shop". At the right, the shop's coins:
//           a shop pays for what it buys from its own coins (D143). Each stock slot shows its price (bottom, gold) and how many are left
//           (top right): NPC shops sell every item at about full value (D145) and their stock refills slowly (D141).
//           Under the stock, "Trade": what you pay, what you get, your coins after.
//   Middle: "Trade" makes the deal; the round button closes. Click a slot to pick it (shop slots to buy, pack slots to sell), then Trade:
//           a slip of the mouse never sells your sword. The server decides (it may say no: short of coins, a buy order filled, D143, D144).
//   Bottom: your pack, the loot window's satchel, the same place and size.
//   Left:   the item under the pointer: what it is, its price, how many are left. On a pack item: what the shop pays (D144, about half).
//
// The pieces, like the loot windows' (#54, #62), into game/client/art/made/ui/shop/ (--pieces):
//   Panel                          the shop's slate plate
//   Rule Trade                     the two short rules either side of the word "Trade"
//   Satchel                        the pack's open leather and buckle
//   Slot <material>                a slot's background (50 x 70), tinted by its item's material; Empty when nothing is in it
//   Slot Lit                       the pale gold line and glow round the slot under the pointer
//   Slot Picked                    the bronze line and corner mark on a slot picked for the trade
//   Plate Note                     the note on the item under the pointer: it moves with the pointed slot
//   Button Trade, Button Close
//   shop.json                      where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/shop_window.mjs                        the draft, prototype/shots/ui-shop.png (a few seconds)
//   node scripts/art/ui/shop_window.mjs --pieces [--out dir]   the pieces and shop.json, into game/client/art/made/ui/shop/ (a few seconds)
//   node scripts/art/ui/shop_window.mjs --check [--out dir]
//       puts the window together from the pieces the way the json says, into prototype/shots/ui-shop-pieces.png, and counts the
//       pixels that differ from the draft. Write the pieces first.
// Every picture in prototype/shots/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, MATERIAL, plate, leather, slot, slotGlow, item, wordButton, button, world, draw, wide, save, open, bake, heading, room, done, plain, tri } from './pieces.mjs';
import { K, mask, box, shadow, over, metal } from './kit.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

// Made up: item, material, price, how many the shop has left.
const SHOP = {
  name: 'Shop', coins: '412',
  stock: {
    0: ['Long Sword Steel', 'Steel', '140', '2'], 1: ['Axe Iron', 'Iron', '60', '3'], 2: ['Mace Iron', 'Iron', '55', '2'], 3: ['Spear Iron', 'Iron', '50', '2'], 4: ['Short Bow', 'Wood', '40', '1'],
    5: ['Arrows', 'Wood', '1', '50'], 6: ['Round Shield', 'Wood', '30', '2'], 7: ['Helmet Steel', 'Steel', '90', '1'], 8: ['Platebody Iron', 'Iron', '120', '1'], 9: ['Leather Tunic', 'Leather', '35', '2'],
    10: ['Bandage', 'Cloth', '4', '10'], 11: ['Hood Blue', 'Cloth', '12', '3'], 12: ['Trousers Undyed', 'Cloth', '10', '4'], 13: ['Metal Boots Iron', 'Iron', '45', '1'], 14: ['Backpack', 'Leather', '25', '1'],
  }, slots: 20,
};
const PACK = { holds: { 0: ['Coins', 'Gold', '162'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Iron', 'Iron'], 6: ['Axe Bronze', 'Bronze'], 12: ['Trousers Red', 'Cloth'] }, slots: 20, columns: 10, full: '8 / 20', coins: '162' };
const PICKED = { shop: [0], pack: [6] }, TRADE = { pay: '140', get: '25', after: '47' };          // the sword to buy, the bronze axe to sell
const POINTED = 7, NOTE = { name: 'Helmet', lines: [['Material', 'Steel'], ['Worn on', 'Head'], ['Price', '90'], ['Left', '1']], hint: 'Click to pick' };
const SCENE = { you: 'plain', at: [150, 250], chest: 'closed', yours: [4, 1], facing: 'N' };      // you face the camp's man in red (3, -1): the shopkeeper here

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const SX = 548, SW = 578, CX = SX + SW / 2;                       // the window's column: the shop's plate and your pack's satchel both span it
const PY = 14, PH = 280;                                          // the shop's plate
const SLOT = [50, 70], STEP = [54, 80], COLUMNS = 10;              // a slot, and from one to the next
const stockAt = i => [SX + 20 + (i % COLUMNS) * STEP[0], PY + 46 + Math.floor(i / COLUMNS) * STEP[1]];
const RULE_Y = PY + 212, SUM_Y = PY + 246;                        // "Trade", then what you pay, what you get, your coins after
const NOTE_BOX = [168, 146, 10, -6];                              // the note: width, height, gap left of the plate, y from the pointed slot's top
const TY = PY + PH + 12, TRADE_BTN = [CX - 92, TY, 184, 44], CLOSE = [CX + 92 + 40, TY + 22, 17];
const LY = 402, LH = 226, packAt = i => [SX + 20 + (i % PACK.columns) * STEP[0], LY + 52 + Math.floor(i / PACK.columns) * STEP[1]];
const noteAt = py => [SX - NOTE_BOX[0] - NOTE_BOX[2], py + NOTE_BOX[3]];
const PRICE = { face: 'line', dx: SLOT[0] / 2, dy: SLOT[1] - 18, colour: 'glow', outline: 2 }, LEFT = { face: 'small', dx: SLOT[0] - 5, dy: 3, colour: 'value', outline: 2 };

/** The bronze line round a slot picked for the trade, with a small diamond on its top left corner. Drawn once at the shop's first
 *  slot and moved, so every picked slot looks the same as the piece (the metal's light depends on where it is drawn). */
const picked = (x, y) => { const [x0, y0] = stockAt(0), [img, ax, ay] = pickedAt(x0, y0, ...SLOT); return [img, ax + x - x0, ay + y - y0]; };
function pickedAt(x, y, w, h) {
  const A = room(x - 6, y - 6, w + 12, h + 12, 6), M = mask(A);
  box(M, (x - 1) * K, (y - 1) * K, (x + w + 1) * K - 1, (y + h + 1) * K - 1); box(M, (x + 1) * K, (y + 1) * K, (x + w - 1) * K - 1, (y + h - 1) * K - 1, 0);
  tri(M, [[x + 1, y - 5], [x + 7, y + 1], [x + 1, y + 7], [x - 5, y + 1]]);
  return done(over(shadow(M, .8), metal(M, 'bronze', [W, 3000])));
}
const ruleParts = () => { const p = [], t = []; heading(p, t, 'Trade', CX, RULE_Y, SW / 2 - 24, 'title', 'label'); return p; };
const sumParts = () => {                                          // [label, value] three times: left, middle, right
  const pairs = [['You pay', TRADE.pay], ['After', TRADE.after], ['You get', TRADE.get]], g = 8, wd = ([l, v]) => wide(l, 'title') + g + wide(v, 'title'), t = [];
  const xs = [SX + 22, CX - wd(pairs[1]) / 2, SX + SW - 22 - wd(pairs[2])];
  pairs.forEach(([l, v], i) => t.push([l, 'title', xs[i], SUM_Y, 'label', 'left', 1], [v, 'title', xs[i] + wide(l, 'title') + g, SUM_Y, 'value', 'left', 1]));
  return t;
};
/** A shop or pack slot with what it holds: [item, material, price or count, left]. */
function shopSlot(parts, tops, texts, x, y, holds, { lit = false, pick = false, priced = false } = {}) {
  parts.push(slot(x, y, ...SLOT, holds ? holds[1] : 'Empty'));
  if (pick) tops.push(picked(x, y));
  if (lit) tops.push(slotGlow(x, y, ...SLOT));
  if (!holds) return;
  parts.push([item(holds[0], 46), x + 2, y + 12]);
  if (priced) { texts.push([holds[2], PRICE.face, x + PRICE.dx, y + PRICE.dy, PRICE.colour, 'center', PRICE.outline], [`x${holds[3]}`, LEFT.face, x + LEFT.dx, y + LEFT.dy, LEFT.colour, 'right', LEFT.outline]); }
  else if (holds[2]) texts.push([holds[2], 'line', x + SLOT[0] - 5, y + SLOT[1] - 18, 'value', 'right', 2]);
}

function screen() {
  const S = world(SCENE), parts = [], slots = [], tops = [], texts = [];
  // the shop
  parts.push(plate(SX, PY, SW, PH));
  texts.push([SHOP.name, 'mid', SX + 22, PY + 12, 'value', 'left', 1], [SHOP.coins, 'title', SX + SW - 22, PY + 16, 'value', 'right', 1], ['Coins', 'title', SX + SW - 22 - wide(SHOP.coins, 'title') - 8, PY + 16, 'label', 'right', 1]);
  for (let i = 0; i < SHOP.slots; i++) shopSlot(slots, tops, texts, ...stockAt(i), SHOP.stock[i], { lit: i === POINTED, pick: PICKED.shop.includes(i), priced: true });
  parts.push(...slots.splice(0), ...tops.splice(0), ...ruleParts()); texts.push(['Trade', 'title', CX, RULE_Y, 'label', 'center', 1], ...sumParts());
  // the item under the pointer
  const [nw, nh] = NOTE_BOX, [nx, ny] = noteAt(stockAt(POINTED)[1]); parts.push(plate(nx, ny, nw, nh, { full: [W, H] }));
  texts.push([NOTE.name, 'title', nx + 16, ny + 12, 'value']); NOTE.lines.forEach(([l, v], i) => texts.push([l, 'line', nx + 16, ny + 40 + i * 19, 'label'], [v, 'line', nx + nw - 16, ny + 40 + i * 19, 'value', 'right']));
  texts.push([NOTE.hint, 'small', nx + 16, ny + nh - 22, 'hint']);
  // trade, close
  parts.push(wordButton(...TRADE_BTN, true), button('Close', ...CLOSE)); texts.push(['Trade', 'mid', CX, TY + 9, 'glow', 'center', 2], ['Enter', 'small', CX - 92 - 14, TY + 15, 'hint', 'right', 2], ['Esc', 'small', CX + 92 + 64, TY + 15, 'hint', 'left', 2]);
  // your pack
  parts.push(leather(SX, LY, SW, LH));
  texts.push(['Pack', 'title', SX + 22, LY + 22, 'label', 'left', 1], [PACK.full, 'title', SX + 22 + wide('Pack', 'title') + 8, LY + 22, 'value', 'left', 1], [PACK.coins, 'title', SX + SW - 22, LY + 22, 'value', 'right', 1], ['Coins', 'title', SX + SW - 22 - wide(PACK.coins, 'title') - 8, LY + 22, 'label', 'right', 1]);
  for (let i = 0; i < PACK.slots; i++) shopSlot(slots, tops, texts, ...packAt(i), PACK.holds[i], { pick: PICKED.pack.includes(i) });
  parts.push(...slots, ...tops);
  return draw(S, parts, texts);
}

/* ---------- the pieces ---------- */
const MATERIALS = Object.keys(MATERIAL);
const PIECES = {
  Panel: () => [plate(SX, PY, SW, PH)],
  'Rule Trade': ruleParts,
  Satchel: () => [leather(SX, LY, SW, LH)],
  ...Object.fromEntries(MATERIALS.map(m => [`Slot ${m}`, () => [slot(0, 0, ...SLOT, m)]])),
  'Slot Lit': () => [slotGlow(...stockAt(POINTED), ...SLOT)],
  'Slot Picked': () => [picked(...stockAt(0))],
  'Plate Note': () => [plate(...noteAt(stockAt(0)[1]), NOTE_BOX[0], NOTE_BOX[1], { full: [W, H] })],
  'Button Trade': () => [wordButton(...TRADE_BTN, true)],
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), lit = stockAt(POINTED), pk = stockAt(0), [nx, ny] = noteAt(stockAt(0)[1]), [nw, nh] = NOTE_BOX;
  return {
    _note: 'Written by scripts/art/ui/shop_window.mjs --pieces: do not edit by hand. The shop window (D64, D143 to D145), opened on a shopkeeper, in the loot window\'s family (D248), in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. Prices are not decided: every price and count in the draft is made up. The window is one block on the right of the screen: in another window size it would keep to the right (not done).',
    size: [W, H],
    order: ['Panel', 'shop slots', 'shop pictures', 'Slot Picked', 'Slot Lit', 'Rule Trade', 'Plate Note', 'Button Trade', 'Button Close', 'Satchel', 'pack slots', 'pack pictures', 'Slot Picked', 'text'],
    pieces: Object.fromEntries(['Panel', 'Rule Trade', 'Button Trade', 'Button Close', 'Satchel'].map(n => [n, P(n)])),
    slots: {
      _note: 'Each slot: "Slot <material>" at its place, the material of what it holds (Empty when nothing). A slot picked for the trade: Slot Picked, its corner "picked" from the slot\'s, over the slot and its picture. The slot under the pointer, when it holds something: Slot Lit, its corner "lit" from the slot\'s, over that. An item\'s pack picture (D237): the part "from" of the 256 x 256 picture, drawn "px" wide, its corner "picture" from the slot\'s. A count in the pack (coins, arrows, bandages: D124) right-aligned, its top right "count" from the slot\'s corner.',
      file: 'Slot <material>.png', size: SLOT, materials: MATERIALS,
      lit: { file: 'Slot Lit.png', dx: at['Slot Lit'][0] - lit[0], dy: at['Slot Lit'][1] - lit[1] }, picked: { file: 'Slot Picked.png', dx: at['Slot Picked'][0] - pk[0], dy: at['Slot Picked'][1] - pk[1] },
      picture: { from: [103, 103, 50, 50], px: 46, dx: 2, dy: 12 }, count: { face: 'line', right: [SLOT[0] - 5, SLOT[1] - 18], colour: 'value', outline: 2 },
    },
    shop: {
      _note: 'The shop\'s stock: a slot\'s corner is first + step times its column and row. Each slot holding something shows its price, centred at "price" from the slot\'s corner, and how many are left, "x" then the number, right-aligned at "left". Prices and counts come from the server (D143 to D145).',
      first: stockAt(0), step: STEP, columns: COLUMNS, most: SHOP.slots,
      price: { face: PRICE.face, centre: [PRICE.dx, PRICE.dy], colour: PRICE.colour, outline: PRICE.outline }, left: { face: LEFT.face, right: [LEFT.dx, LEFT.dy], colour: LEFT.colour, outline: LEFT.outline, prefix: 'x' },
    },
    pack: { _note: 'Your pack: 12 slots, 20 with a backpack (D124). A pack slot can be picked to sell; coins never are.', first: packAt(0), step: STEP, columns: PACK.columns, most: PACK.slots },
    note: {
      _note: 'The note on the item under the pointer, shown while a slot that holds something is pointed at. Plate Note is drawn for the shop\'s first row: for another slot it goes down by that slot\'s top minus the first row\'s top; its texts are placed from the plate\'s corner, which is at "corner" for that row. Lines for a shop item: "shop_lines"; for a pack item: "pack_lines" (what the shop pays, or that it is not buying that now, D143). The words are not decided.',
      file: 'Plate Note.png', at: at['Plate Note'], corner: [nx, ny], size: [nw, nh], row_top: stockAt(0)[1],
      name: { face: 'title', at: [16, 12], colour: 'value' }, lines: { face: 'line', label_at: [16, 40], value_right: [nw - 16, 40], step: 19, label: 'label', value: 'value' },
      shop_lines: ['Material', 'Worn on', 'Price', 'Left'], pack_lines: ['Material', 'Worn on', 'Shop pays'], not_buying: 'Not buying',
      hint: { face: 'small', at: [16, nh - 22], colour: 'hint', text: NOTE.hint, picked: 'Click to put back' },
    },
    trade: { _note: 'Makes the deal for every picked slot: a click, or Enter. The server decides; lit while something is picked.', rect: TRADE_BTN, key: 'Enter' },
    close: { _note: 'A click, or Esc. Picked slots are let go.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow', 'dim'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'title', 'line', 'small'].map(k => [k, face(k)])),
      name: { text: SHOP.name, face: 'mid', at: [SX + 22, PY + 12], colour: 'value', outline: 1 },
      coins: { _note: 'The shop\'s own coins (D143), at the right: the coins right-aligned, "Coins" "gap" before them.', face: 'title', right: [SX + SW - 22, PY + 16], gap: 8, label: 'label', value: 'value', outline: 1, word: 'Coins' },
      trade_rule: { text: 'Trade', face: 'title', centre: [CX, RULE_Y], colour: 'label', outline: 1 },
      sums: {
        _note: 'Three pairs on one line: what you pay (left), your coins after (centred on the window), what you get (right-aligned). Each is the label, "gap", then the value.',
        face: 'title', y: SUM_Y, left: SX + 22, centre: CX, right: SX + SW - 22, gap: 8, label: 'label', value: 'value', outline: 1, words: ['You pay', 'After', 'You get'],
      },
      trade: { text: 'Trade', face: 'mid', centre: [CX, TY + 9], colour: 'glow', outline: 2 },
      trade_key: { text: 'Enter', face: 'small', right: [CX - 92 - 14, TY + 15], colour: 'hint', outline: 2 }, close_key: { text: 'Esc', face: 'small', at: [CX + 92 + 64, TY + 15], colour: 'hint', outline: 2 },
      pack: { _note: '"Pack", then "filled / slots" "gap" after it; at the right, "Coins" then the coins, the coins right-aligned and "Coins" "gap" before them.', face: 'title', label_at: [SX + 22, LY + 22], right: [SX + SW - 22, LY + 22], gap: 8, label: 'label', value: 'value', outline: 1, words: ['Pack', 'Coins'] },
    },
  };
}

/* ---------- the check: the window from the pieces ---------- */
function check(dir) {
  const J = JSON.parse(readFileSync(`${dir}/shop.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), S = J.slots, X = J.text;
  const gridAt = (G, i) => [G.first[0] + (i % G.columns) * G.step[0], G.first[1] + Math.floor(i / G.columns) * G.step[1]];
  const fill = (places, holds, picks, lit = -1, priced = null) => {
    places.forEach((p, i) => put(S.file.replace('<material>', holds[i] ? holds[i][1] : 'Empty'), p));
    places.forEach(([x, y], i) => { if (!holds[i]) return; parts.push([item(holds[i][0], S.picture.px), x + S.picture.dx, y + S.picture.dy]);
      if (priced) texts.push([holds[i][2], priced.price.face, x + priced.price.centre[0], y + priced.price.centre[1], priced.price.colour, 'center', priced.price.outline], [priced.left.prefix + holds[i][3], priced.left.face, x + priced.left.right[0], y + priced.left.right[1], priced.left.colour, 'right', priced.left.outline]);
      else if (holds[i][2]) texts.push([holds[i][2], S.count.face, x + S.count.right[0], y + S.count.right[1], S.count.colour, 'right', S.count.outline]); });
    for (const i of picks) { const [x, y] = places[i]; put(S.picked.file, [x + S.picked.dx, y + S.picked.dy]); }
    if (lit >= 0 && holds[lit]) { const [x, y] = places[lit]; put(S.lit.file, [x + S.lit.dx, y + S.lit.dy]); }
  };
  put(J.pieces.Panel.file, J.pieces.Panel.at);
  const shop = Array.from({ length: J.shop.most }, (_, i) => gridAt(J.shop, i)); fill(shop, SHOP.stock, PICKED.shop, POINTED, J.shop);
  put(J.pieces['Rule Trade'].file, J.pieces['Rule Trade'].at);
  const N = J.note, down = shop[POINTED][1] - N.row_top, [nx, ny] = [N.corner[0], N.corner[1] + down]; put(N.file, [N.at[0], N.at[1] + down]);
  texts.push([NOTE.name, N.name.face, nx + N.name.at[0], ny + N.name.at[1], N.name.colour]);
  NOTE.lines.forEach(([l, v], i) => texts.push([N.shop_lines[i], N.lines.face, nx + N.lines.label_at[0], ny + N.lines.label_at[1] + i * N.lines.step, N.lines.label], [v, N.lines.face, nx + N.lines.value_right[0], ny + N.lines.value_right[1] + i * N.lines.step, N.lines.value, 'right']));
  texts.push([N.hint.text, N.hint.face, nx + N.hint.at[0], ny + N.hint.at[1], N.hint.colour]);
  for (const n of ['Button Trade', 'Button Close', 'Satchel']) put(J.pieces[n].file, J.pieces[n].at);
  fill(Array.from({ length: J.pack.most }, (_, i) => gridAt(J.pack, i)), PACK.holds, PICKED.pack);
  const C = X.coins; texts.push([X.name.text, X.name.face, ...X.name.at, X.name.colour, 'left', X.name.outline], [SHOP.coins, C.face, ...C.right, C.value, 'right', C.outline], [C.word, C.face, C.right[0] - wide(SHOP.coins, C.face) - C.gap, C.right[1], C.label, 'right', C.outline]);
  for (const [k, align] of [['trade_rule', 'center'], ['trade', 'center'], ['trade_key', 'right'], ['close_key', 'left']]) { const T = X[k]; texts.push([T.text, T.face, ...(T.centre ?? T.right ?? T.at), T.colour, align, T.outline]); }
  const U = X.sums, vals = [TRADE.pay, TRADE.after, TRADE.get], wd = i => wide(U.words[i], U.face) + U.gap + wide(vals[i], U.face), xs = [U.left, U.centre - wd(1) / 2, U.right - wd(2)];
  U.words.forEach((l, i) => texts.push([l, U.face, xs[i], U.y, U.label, 'left', U.outline], [vals[i], U.face, xs[i] + wide(l, U.face) + U.gap, U.y, U.value, 'left', U.outline]));
  const Pk = X.pack, [lx, ly] = Pk.label_at, [rx] = Pk.right;
  texts.push([Pk.words[0], Pk.face, lx, ly, Pk.label, 'left', Pk.outline], [PACK.full, Pk.face, lx + wide(Pk.words[0], Pk.face) + Pk.gap, ly, Pk.value, 'left', Pk.outline]);
  texts.push([PACK.coins, Pk.face, rx, ly, Pk.value, 'right', Pk.outline], [Pk.words[1], Pk.face, rx - wide(PACK.coins, Pk.face) - Pk.gap, ly, Pk.label, 'right', Pk.outline]);
  return draw(world(SCENE), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/shop'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/shop.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and shop.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/shop.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/shop_window.mjs --pieces`); process.exit(1); }
  const A = check(out), B = screen(); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'prototype/shots/ui-shop-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(), 'prototype/shots/ui-shop.png', t0);
