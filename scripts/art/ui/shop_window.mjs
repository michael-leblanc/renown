// The shop window: opened on a shopkeeper (D64, D48), in the loot window's family (D248): the shop's stock over your pack.
// Fast and a bit playful, in the spirit of RuneScape's shops (Michael, 2026-11-20: "a bit more like runescape, and more fun"), drawn in
// Renown's own look (D240, D241): nothing of RuneScape's art. Prices are not decided, so every item, price, count, coin and word shown
// is made up (placeholders, not settings yet). The window is 1152 x 648.
//   Top:    the shop on a slate plate: the shopkeeper's face in a bronze ring (the game draws whoever keeps the shop), "Shop", a line
//           they say (words not decided), and at the right the shop's own coins, which pay for what it buys (D143).
//           Its stock, 30 slots: how many are left at the top left, the price at the bottom. Sold out: greyed, 0 (stock refills, D141).
//   Middle: how to trade, and the round button that closes.
//   Bottom: your pack, the loot window's satchel, the same place and size.
//   Left:   the item under the pointer: what it is, its price, how many are left; on a pack item, what the shop pays (D144, about half).
// Trading, the RuneScape way: a click on a shop item buys 1 at once; a right click opens a small menu: Value, Buy 1, Buy 5, Buy 10, Buy X.
// On your pack the menu says Sell (a plain click only shows its value, so a slip never sells). The server decides each one (D143 to D145).
// A trade is felt: the bought item flashes in your pack, coins pop at your purse with the amount ("-90"), and the shop's count ticks down.
//
// The pieces, like the loot windows' (#54, #62), into game/client/art/made/ui/shop/ (--pieces):
//   Panel                          the shop's slate plate
//   Portrait Back, Portrait Ring   behind and round the shopkeeper's face (the face itself is the character, drawn by the game)
//   Satchel                        the pack's open leather and buckle
//   Slot <material>                a slot's background (50 x 70), tinted by its item's material; Empty when nothing is in it
//   Slot Lit                       the pale gold line and glow round the slot under the pointer
//   Slot Out                       the grey over a sold-out slot and its picture
//   Slot New                       the amber flash round a slot that just got something (fades out in the game)
//   Plate Note                     the note on the item under the pointer: it moves with the pointed slot
//   Plate Menu, Menu Lit           the right-click menu's plate, and the light on its pointed line
//   Coin Pop                       gold sparks at your purse when coins change hands (the game moves and fades them)
//   Button Close
//   shop.json                      where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/shop_window.mjs                        the draft, scripts/art/out/ui-shop.png (a few seconds)
//   node scripts/art/ui/shop_window.mjs --pieces [--out dir]   the pieces and shop.json, into game/client/art/made/ui/shop/ (a few seconds)
//   node scripts/art/ui/shop_window.mjs --check [--out dir]
//       puts the window together from the pieces the way the json says, into scripts/art/out/ui-shop-pieces.png, and counts the
//       pixels that differ from the draft. Write the pieces first.
// Every picture in scripts/art/out/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, AMBER, FACE, MATERIAL, plate, leather, slot, slotGlow, item, button, world, draw, wide, save, open, bake, room, done, plain, halo, diamond, picture, roundFrame, figure, blank } from './pieces.mjs';
import { K, mask, layer, box } from './kit.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

// Made up: item, material, price, how many the shop has left.
const SHOP = {
  name: 'Shop', says: '"Good iron, fair prices. Mostly fair."', coins: '502',
  keeper: { race: 'human', tints: { Chest1: '#8a4a3a', Head1: '#3a2a1a', Legs1: '#6a5a3a' } },   // the camp's man in red, who keeps the shop here
  stock: {
    0: ['Long Sword Iron', 'Iron', '110', '3'], 1: ['Long Sword Steel', 'Steel', '140', '1'], 2: ['Axe Iron', 'Iron', '60', '3'], 3: ['Mace Iron', 'Iron', '55', '2'], 4: ['Spear Iron', 'Iron', '50', '0'],
    5: ['Short Bow', 'Wood', '40', '2'], 6: ['Helmet Steel', 'Steel', '90', '0'], 7: ['Platebody Iron', 'Iron', '120', '1'], 8: ['Gauntlets Iron', 'Iron', '40', '2'], 9: ['Metal Boots Iron', 'Iron', '45', '1'],
    10: ['Round Shield', 'Wood', '30', '4'], 11: ['Plank Shield', 'Wood', '25', '0'], 12: ['Leather Tunic', 'Leather', '35', '2'], 13: ['Leather Trousers', 'Leather', '30', '2'], 14: ['Shoes', 'Leather', '12', '5'],
    15: ['Hood Blue', 'Cloth', '12', '3'], 16: ['Tunic Green', 'Cloth', '14', '3'], 17: ['Trousers Undyed', 'Cloth', '10', '4'], 18: ['Backpack', 'Leather', '25', '1'], 19: ['Belt', 'Leather', '8', '6'],
    20: ['Arrows', 'Wood', '1', '250'], 21: ['Quiver', 'Leather', '15', '2'], 22: ['Bandage', 'Cloth', '4', '40'],
  }, slots: 30,
};
// You just bought the shop's last steel helmet: it flashes in your pack, coins pop at your purse (162 to 72), its count ticked to 0.
const PACK = { holds: { 0: ['Coins', 'Gold', '72'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Iron', 'Iron'], 6: ['Axe Bronze', 'Bronze'], 7: ['Helmet Steel', 'Steel'], 12: ['Trousers Red', 'Cloth'] }, slots: 20, columns: 10, full: '9 / 20', coins: '72', fresh: 7, pop: '-90' };
const POINTED = 7, NOTE = { name: 'Platebody', lines: [['Material', 'Iron'], ['Worn on', 'Chest'], ['Price', '120'], ['Left', '1']], hint: 'Click: buy 1' };
const MENU = { title: 'Platebody', lines: ['Value', 'Buy 1', 'Buy 5', 'Buy 10', 'Buy X'], lit: 2 };
const SCENE = { you: 'plain', at: [150, 250], chest: 'closed', yours: [4, 1], facing: 'N' };      // you face the camp's man in red (3, -1)

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const SX = 548, SW = 578, CX = SX + SW / 2;                       // the window's column: the shop's plate and your pack's satchel both span it
const PY = 14, PH = 318;                                          // the shop's plate
const FACE_AT = [SX + 44, PY + 38, 24];                           // the shopkeeper's face: middle and radius
const SLOT = [50, 70], STEP = [54, 80], COLUMNS = 10;              // a slot, and from one to the next
const stockAt = i => [SX + 20 + (i % COLUMNS) * STEP[0], PY + 76 + Math.floor(i / COLUMNS) * STEP[1]];
const NOTE_BOX = [168, 146, 10, -6];                              // the note: width, height, gap left of the plate, y from the pointed slot's top
const MENU_BOX = [118, 140, 6, 22, 34, 20];                       // the menu: width, height, gap right of the slot, y from its top, first line's y, a line's step
const TY = PY + PH + 10, CLOSE = [SX + 26, TY + 24, 17];
const LY = 402, LH = 226, packAt = i => [SX + 20 + (i % PACK.columns) * STEP[0], LY + 52 + Math.floor(i / PACK.columns) * STEP[1]];
const noteAt = py => [SX - NOTE_BOX[0] - NOTE_BOX[2], py + NOTE_BOX[3]];
const menuAt = ([x, y]) => [x + SLOT[0] + MENU_BOX[2], y + MENU_BOX[3]];
const PRICE = { face: 'line', dx: SLOT[0] / 2, dy: SLOT[1] - 18, colour: 'glow', outline: 2 }, LEFT = { face: 'line', dx: 5, dy: 3, colour: 'value', out: 'dim', outline: 2 };
const POP = [SX + SW - 34, LY - 2], POP_TEXT = [-16, -22];       // where the coin sparks burst, over your coins; the amount's top right from there

/** The grey over a sold-out slot and its picture. */
function slotOut(x, y, w, h) { const A = room(x, y, w, h, 0), M = mask(A); box(M, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1); return done(plain(M, [12, 12, 14], .62)); }
/** The amber flash round a slot that just got something: like the pointed slot's glow, warmer and wider. */
function slotNew(x, y, w, h) { const A = room(x - 3, y - 3, w + 6, h + 6, 10), M = mask(A); box(M, (x - 3) * K, (y - 3) * K, (x + w + 3) * K - 1, (y + h + 3) * K - 1); box(M, (x - 1) * K, (y - 1) * K, (x + w + 1) * K - 1, (y + h + 1) * K - 1, 0); return done(halo(M, AMBER[1], 2.2, 4)); }
/** The light on the menu's pointed line: warm in the middle, gone at the ends. */
function menuLit(x, y, w, h) { const A = room(x, y, w, h, 0), L = layer(A); for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) { const t = Math.abs(i / A.w - .5) * 2, q = j * A.w + i; L.c[q * 3] = 168; L.c[q * 3 + 1] = 104; L.c[q * 3 + 2] = 40; L.a[q] = .5 * (1 - t * t); } return done(L); }
/** The menu's plate, drawn once at the shop's first slot and moved: the plate's grain and light depend on where it is drawn. */
const menuPlate = at => { const [x0, y0] = menuAt(stockAt(0)), [img, ax, ay] = plate(x0, y0, MENU_BOX[0], MENU_BOX[1], { full: [W, H], studs: false }); return [img, ax + at[0] - x0, ay + at[1] - y0]; };
/** Gold sparks bursting round a point: coins changing hands. */
const coinPop = ([cx, cy]) => [[-14, -6, 3], [-6, -14, 4], [6, -12, 2.5], [14, -4, 3.5], [0, -22, 2.5], [-18, 4, 2]].map(([dx, dy, s]) => diamond(cx + dx, cy + dy, s));
/** The shopkeeper's face, from their character: the head and shoulders, twice the size, cut round. The game draws it from the character. */
function keeperFace(r) {
  const f = figure(SHOP.keeper.race, 'S', SHOP.keeper.tints); let x0 = f.w, x1 = 0, y0 = f.h;
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (f.data[(j * f.w + i) * 4 + 3] > 40) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); }
  const s = 2, cx = (x0 + x1 + 1) / 2, top = y0 - 3, o = blank(2 * r, 2 * r);
  for (let j = 0; j < 2 * r; j++) for (let i = 0; i < 2 * r; i++) {
    if (Math.hypot(i + .5 - r, j + .5 - r) > r - .5) continue; const sx = Math.floor(cx - r / s + i / s), sy = Math.floor(top + j / s);
    if (sx < 0 || sy < 0 || sx >= f.w || sy >= f.h) continue; f.data.copy(o.data, (j * 2 * r + i) * 4, (sy * f.w + sx) * 4, (sy * f.w + sx) * 4 + 4);
  }
  return o;
}

/** A shop or pack slot with what it holds: [item, material, price or count, left]. */
function shopSlot(parts, tops, texts, x, y, holds, { lit = false, fresh = false, priced = false } = {}) {
  parts.push(slot(x, y, ...SLOT, holds ? holds[1] : 'Empty'));
  if (!holds) return;
  parts.push([item(holds[0], 46), x + 2, y + 12]);
  const out = priced && holds[3] === '0';
  if (out) parts.push(slotOut(x, y, ...SLOT));
  if (fresh) tops.push(slotNew(x, y, ...SLOT));
  if (lit) tops.push(slotGlow(x, y, ...SLOT));
  if (priced) texts.push([holds[2], PRICE.face, x + PRICE.dx, y + PRICE.dy, out ? 'dim' : PRICE.colour, 'center', PRICE.outline], [holds[3], LEFT.face, x + LEFT.dx, y + LEFT.dy, out ? LEFT.out : LEFT.colour, 'left', LEFT.outline]);
  else if (holds[2]) texts.push([holds[2], 'line', x + SLOT[0] - 5, y + SLOT[1] - 18, 'value', 'right', 2]);
}
const faceParts = (withFace = true) => { const p = [], [cx, cy, r] = FACE_AT; picture(p, cx, cy, r, () => [14, 12, 11]); if (withFace) p.push([keeperFace(r), cx - r, cy - r]); return p; };
const ringParts = () => { const p = [], [cx, cy, r] = FACE_AT; roundFrame(p, cx, cy, r); return p; };

function screen() {
  const S = world(SCENE), parts = [], slots = [], tops = [], texts = [];
  // the shop
  parts.push(plate(SX, PY, SW, PH), ...faceParts(), ...ringParts());
  const tx = FACE_AT[0] + FACE_AT[2] + 16;
  texts.push([SHOP.name, 'mid', tx, PY + 14, 'value', 'left', 1], [SHOP.says, 'line', tx, PY + 42, 'hint', 'left', 1]);
  texts.push([SHOP.coins, 'title', SX + SW - 22, PY + 18, 'value', 'right', 1], ['Coins', 'title', SX + SW - 22 - wide(SHOP.coins, 'title') - 8, PY + 18, 'label', 'right', 1]);
  for (let i = 0; i < SHOP.slots; i++) shopSlot(slots, tops, texts, ...stockAt(i), SHOP.stock[i], { lit: i === POINTED, priced: true });
  parts.push(...slots.splice(0), ...tops.splice(0));
  // the item under the pointer
  const [nw, nh] = NOTE_BOX, [nx, ny] = noteAt(stockAt(POINTED)[1]); parts.push(plate(nx, ny, nw, nh, { full: [W, H] }));
  texts.push([NOTE.name, 'title', nx + 16, ny + 12, 'value']); NOTE.lines.forEach(([l, v], i) => texts.push([l, 'line', nx + 16, ny + 40 + i * 19, 'label'], [v, 'line', nx + nw - 16, ny + 40 + i * 19, 'value', 'right']));
  texts.push([NOTE.hint, 'small', nx + 16, ny + nh - 22, 'hint']);
  // how to trade, close
  parts.push(button('Close', ...CLOSE));
  texts.push(['Click: buy 1', 'line', CX - 20, TY + 16, 'label', 'right', 2], ['Right click: buy or sell more', 'line', CX, TY + 16, 'hint', 'left', 2], ['Esc', 'small', CLOSE[0] + CLOSE[2] + 8, TY + 18, 'hint', 'left', 2]);
  // your pack
  parts.push(leather(SX, LY, SW, LH));
  texts.push(['Pack', 'title', SX + 22, LY + 22, 'label', 'left', 1], [PACK.full, 'title', SX + 22 + wide('Pack', 'title') + 8, LY + 22, 'value', 'left', 1], [PACK.coins, 'title', SX + SW - 22, LY + 22, 'value', 'right', 1], ['Coins', 'title', SX + SW - 22 - wide(PACK.coins, 'title') - 8, LY + 22, 'label', 'right', 1]);
  for (let i = 0; i < PACK.slots; i++) shopSlot(slots, tops, texts, ...packAt(i), PACK.holds[i], { fresh: i === PACK.fresh });
  parts.push(...slots, ...tops);
  // the coins popping at your purse
  parts.push(...coinPop(POP)); texts.push([PACK.pop, 'mid', POP[0] + POP_TEXT[0], POP[1] + POP_TEXT[1], 'glow', 'right', 2]);
  const base = draw(S, parts, texts);
  // the right-click menu, over everything, its text too
  const [mw, mh, , , my0, mstep] = MENU_BOX, [mx, my] = menuAt(stockAt(POINTED)), mt = [];
  mt.push([MENU.title, 'title', mx + 12, my + 8, 'value']); MENU.lines.forEach((l, i) => mt.push([l, 'line', mx + 14, my + my0 + i * mstep, i === MENU.lit ? 'glow' : i ? 'value' : 'label']));
  return draw(base, [menuPlate([mx, my]), menuLit(mx + 6, my + my0 + MENU.lit * mstep - 3, mw - 12, mstep)], mt);
}

/* ---------- the pieces ---------- */
const MATERIALS = Object.keys(MATERIAL);
const PIECES = {
  Panel: () => [plate(SX, PY, SW, PH)],
  'Portrait Back': () => faceParts(false),
  'Portrait Ring': ringParts,
  Satchel: () => [leather(SX, LY, SW, LH)],
  ...Object.fromEntries(MATERIALS.map(m => [`Slot ${m}`, () => [slot(0, 0, ...SLOT, m)]])),
  'Slot Lit': () => [slotGlow(...stockAt(POINTED), ...SLOT)],
  'Slot Out': () => [slotOut(...stockAt(0), ...SLOT)],
  'Slot New': () => [slotNew(...stockAt(0), ...SLOT)],
  'Plate Note': () => [plate(...noteAt(stockAt(0)[1]), NOTE_BOX[0], NOTE_BOX[1], { full: [W, H] })],
  'Plate Menu': () => [menuPlate(menuAt(stockAt(0)))],
  'Menu Lit': () => { const [mx, my] = menuAt(stockAt(0)); return [menuLit(mx + 6, my + MENU_BOX[4] - 3, MENU_BOX[0] - 12, MENU_BOX[5])]; },
  'Coin Pop': () => coinPop(POP),
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), s0 = stockAt(0), lit = stockAt(POINTED), [nx, ny] = noteAt(s0[1]), [nw, nh] = NOTE_BOX, [mx, my] = menuAt(s0), [mw, mh, , , my0, mstep] = MENU_BOX;
  const rel = n => ({ file: `${n}.png`, dx: at[n][0] - s0[0], dy: at[n][1] - s0[1] }), tx = FACE_AT[0] + FACE_AT[2] + 16;
  return {
    _note: 'Written by scripts/art/ui/shop_window.mjs --pieces: do not edit by hand. The shop window (D64, D143 to D145), opened on a shopkeeper, in the loot window\'s family (D248) and the spirit of RuneScape\'s shops (Michael, 2026-11-20), in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text after the window, the menu and its text over everything. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place, size and timing here is a setting. Prices are not decided: every price and count in the draft is made up. The window is one block on the right of the screen: in another window size it would keep to the right (not done).',
    size: [W, H],
    order: ['Panel', 'Portrait Back', 'the face', 'Portrait Ring', 'shop slots', 'shop pictures', 'Slot Out', 'Slot Lit', 'Plate Note', 'Button Close', 'Satchel', 'pack slots', 'pack pictures', 'Slot New', 'Coin Pop', 'text', 'Plate Menu', 'Menu Lit', 'menu text'],
    pieces: Object.fromEntries(['Panel', 'Portrait Back', 'Portrait Ring', 'Button Close', 'Satchel', 'Coin Pop'].map(n => [n, P(n)])),
    face: { _note: 'The shopkeeper\'s face, drawn by the game from their character (D121): the Creator character facing S, standing, drawn "scale" times, its top "above" px over the highest pixel, centred on the figure, cut to a circle of "radius" round "centre". Between Portrait Back and Portrait Ring.', centre: FACE_AT.slice(0, 2), radius: FACE_AT[2], scale: 2, above: 3, facing: 'S' },
    slots: {
      _note: 'Each slot: "Slot <material>" at its place, the material of what it holds (Empty when nothing). An item\'s pack picture (D237): the part "from" of the 256 x 256 picture, drawn "px" wide, its corner "picture" from the slot\'s. Over a sold-out shop slot: Slot Out. The slot under the pointer, when it holds something: Slot Lit. A pack slot that just got something: Slot New, fading over "new_fade" s. Each overlay\'s corner is dx, dy from the slot\'s. A count in the pack (coins, arrows, bandages: D124) right-aligned, its top right "count" from the slot\'s corner.',
      file: 'Slot <material>.png', size: SLOT, materials: MATERIALS,
      lit: { file: 'Slot Lit.png', dx: at['Slot Lit'][0] - lit[0], dy: at['Slot Lit'][1] - lit[1] }, out: rel('Slot Out'), new: rel('Slot New'), new_fade: 0.8,
      picture: { from: [103, 103, 50, 50], px: 46, dx: 2, dy: 12 }, count: { face: 'line', right: [SLOT[0] - 5, SLOT[1] - 18], colour: 'value', outline: 2 },
    },
    shop: {
      _note: 'The shop\'s stock, 30 slots: a slot\'s corner is first + step times its column and row. Each slot holding something shows its price centred at "price" and how many are left at "left", both from the slot\'s corner; sold out, both in their "out" colour and Slot Out over it. Prices and counts come from the server (D143 to D145); a count ticks down after a buy.',
      first: s0, step: STEP, columns: COLUMNS, most: SHOP.slots,
      price: { face: PRICE.face, centre: [PRICE.dx, PRICE.dy], colour: PRICE.colour, outline: PRICE.outline, out: 'dim' }, left: { face: LEFT.face, at: [LEFT.dx, LEFT.dy], colour: LEFT.colour, outline: LEFT.outline, out: LEFT.out },
    },
    pack: { _note: 'Your pack: 12 slots, 20 with a backpack (D124). A pack item is sold from its right-click menu; coins never.', first: packAt(0), step: STEP, columns: PACK.columns, most: PACK.slots },
    note: {
      _note: 'The note on the item under the pointer. Plate Note is drawn for the shop\'s first row: for another slot it goes down by that slot\'s top minus the first row\'s top; its texts are placed from the plate\'s corner, which is at "corner" for that row. Lines for a shop item: "shop_lines", hint "shop_hint"; for a pack item: "pack_lines" (what the shop pays, or "not_buying", D143), hint "pack_hint". The words are not decided.',
      file: 'Plate Note.png', at: at['Plate Note'], corner: [nx, ny], size: [nw, nh], row_top: s0[1],
      name: { face: 'title', at: [16, 12], colour: 'value' }, lines: { face: 'line', label_at: [16, 40], value_right: [nw - 16, 40], step: 19, label: 'label', value: 'value' },
      shop_lines: ['Material', 'Worn on', 'Price', 'Left'], pack_lines: ['Material', 'Worn on', 'Shop pays'], not_buying: 'Not buying',
      hint: { face: 'small', at: [16, nh - 22], colour: 'hint' }, shop_hint: NOTE.hint, pack_hint: 'Right click: sell',
    },
    menu: {
      _note: 'The right-click menu (RuneScape\'s way): the item\'s name, then its lines; a click on a line does it and closes the menu, Esc or a click elsewhere closes it. Plate Menu is drawn for the shop\'s first slot: for another slot it moves by that slot\'s corner minus the first slot\'s ("slot0"); near the right edge it would open to the left (not drawn). Menu Lit lies under the pointed line: drawn for the first line, down "step" a line. "X" asks how many (typing, not drawn). Value shows the price in the note. The words are not decided.',
      file: 'Plate Menu.png', at: at['Plate Menu'], corner: [mx, my], size: [mw, mh], slot0: s0, lit: { file: 'Menu Lit.png', at: at['Menu Lit'] },
      name: { face: 'title', at: [12, 8], colour: 'value' }, lines: { face: 'line', at: [14, my0], step: mstep, colour: 'value', first: 'label', lit: 'glow' },
      shop_lines: MENU.lines, pack_lines: ['Value', 'Sell 1', 'Sell 5', 'Sell 10', 'Sell X'],
    },
    pop: { _note: 'When coins change hands: Coin Pop at its place over your coins, rising "rise" px and fading over "time" s, with the amount (minus for a buy, plus for a sale), its top right at "text" from the burst point.', burst: POP, rise: 14, time: 0.7, text: { face: 'mid', right: POP_TEXT, colour: 'glow', outline: 2 } },
    close: { _note: 'A click, or Esc, or walking away from the shopkeeper.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow', 'dim'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'title', 'line', 'small'].map(k => [k, face(k)])),
      name: { text: SHOP.name, face: 'mid', at: [tx, PY + 14], colour: 'value', outline: 1 },
      says: { _note: 'A line the shopkeeper says, picked from their lines (D91); the words are not decided.', face: 'line', at: [tx, PY + 42], colour: 'hint', outline: 1 },
      coins: { _note: 'The shop\'s own coins (D143), at the right: the coins right-aligned, "Coins" "gap" before them.', face: 'title', right: [SX + SW - 22, PY + 18], gap: 8, label: 'label', value: 'value', outline: 1, word: 'Coins' },
      how: { _note: 'How to trade: the first part right-aligned at "right", the second from "at".', face: 'line', right: [CX - 20, TY + 16], at: [CX, TY + 16], words: ['Click: buy 1', 'Right click: buy or sell more'], colours: ['label', 'hint'], outline: 2 },
      close_key: { text: 'Esc', face: 'small', at: [CLOSE[0] + CLOSE[2] + 8, TY + 18], colour: 'hint', outline: 2 },
      pack: { _note: '"Pack", then "filled / slots" "gap" after it; at the right, "Coins" then the coins, the coins right-aligned and "Coins" "gap" before them.', face: 'title', label_at: [SX + 22, LY + 22], right: [SX + SW - 22, LY + 22], gap: 8, label: 'label', value: 'value', outline: 1, words: ['Pack', 'Coins'] },
    },
  };
}

/* ---------- the check: the window from the pieces ---------- */
function check(dir) {
  const J = JSON.parse(readFileSync(`${dir}/shop.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a, to = parts) => to.push([pic(f), ...a]), S = J.slots, X = J.text;
  const gridAt = (G, i) => [G.first[0] + (i % G.columns) * G.step[0], G.first[1] + Math.floor(i / G.columns) * G.step[1]];
  const fill = (places, holds, { lit = -1, fresh = -1, priced = null } = {}) => {
    places.forEach((p, i) => put(S.file.replace('<material>', holds[i] ? holds[i][1] : 'Empty'), p));
    places.forEach(([x, y], i) => { const h = holds[i]; if (!h) return; parts.push([item(h[0], S.picture.px), x + S.picture.dx, y + S.picture.dy]);
      const out = priced && h[3] === '0'; if (out) put(S.out.file, [x + S.out.dx, y + S.out.dy]);
      if (priced) texts.push([h[2], priced.price.face, x + priced.price.centre[0], y + priced.price.centre[1], out ? priced.price.out : priced.price.colour, 'center', priced.price.outline], [h[3], priced.left.face, x + priced.left.at[0], y + priced.left.at[1], out ? priced.left.out : priced.left.colour, 'left', priced.left.outline]);
      else if (h[2]) texts.push([h[2], S.count.face, x + S.count.right[0], y + S.count.right[1], S.count.colour, 'right', S.count.outline]); });
    if (fresh >= 0) { const [x, y] = places[fresh]; put(S.new.file, [x + S.new.dx, y + S.new.dy]); }
    if (lit >= 0 && holds[lit]) { const [x, y] = places[lit]; put(S.lit.file, [x + S.lit.dx, y + S.lit.dy]); }
  };
  put(J.pieces.Panel.file, J.pieces.Panel.at); put(J.pieces['Portrait Back'].file, J.pieces['Portrait Back'].at);
  const Fc = J.face; parts.push([keeperFace(Fc.radius), Fc.centre[0] - Fc.radius, Fc.centre[1] - Fc.radius]); put(J.pieces['Portrait Ring'].file, J.pieces['Portrait Ring'].at);
  const shop = Array.from({ length: J.shop.most }, (_, i) => gridAt(J.shop, i)); fill(shop, SHOP.stock, { lit: POINTED, priced: J.shop });
  const N = J.note, down = shop[POINTED][1] - N.row_top, [nx, ny] = [N.corner[0], N.corner[1] + down]; put(N.file, [N.at[0], N.at[1] + down]);
  texts.push([NOTE.name, N.name.face, nx + N.name.at[0], ny + N.name.at[1], N.name.colour]);
  NOTE.lines.forEach(([, v], i) => texts.push([N.shop_lines[i], N.lines.face, nx + N.lines.label_at[0], ny + N.lines.label_at[1] + i * N.lines.step, N.lines.label], [v, N.lines.face, nx + N.lines.value_right[0], ny + N.lines.value_right[1] + i * N.lines.step, N.lines.value, 'right']));
  texts.push([N.shop_hint, N.hint.face, nx + N.hint.at[0], ny + N.hint.at[1], N.hint.colour]);
  for (const n of ['Button Close', 'Satchel']) put(J.pieces[n].file, J.pieces[n].at);
  fill(Array.from({ length: J.pack.most }, (_, i) => gridAt(J.pack, i)), PACK.holds, { fresh: PACK.fresh });
  put(J.pieces['Coin Pop'].file, J.pieces['Coin Pop'].at);
  const C = X.coins; texts.push([X.name.text, X.name.face, ...X.name.at, X.name.colour, 'left', X.name.outline], [SHOP.says, X.says.face, ...X.says.at, X.says.colour, 'left', X.says.outline]);
  texts.push([SHOP.coins, C.face, ...C.right, C.value, 'right', C.outline], [C.word, C.face, C.right[0] - wide(SHOP.coins, C.face) - C.gap, C.right[1], C.label, 'right', C.outline]);
  const Hw = X.how; texts.push([Hw.words[0], Hw.face, ...Hw.right, Hw.colours[0], 'right', Hw.outline], [Hw.words[1], Hw.face, ...Hw.at, Hw.colours[1], 'left', Hw.outline]);
  texts.push([X.close_key.text, X.close_key.face, ...X.close_key.at, X.close_key.colour, 'left', X.close_key.outline]);
  const Pk = X.pack, [lx, ly] = Pk.label_at, [rx] = Pk.right;
  texts.push([Pk.words[0], Pk.face, lx, ly, Pk.label, 'left', Pk.outline], [PACK.full, Pk.face, lx + wide(Pk.words[0], Pk.face) + Pk.gap, ly, Pk.value, 'left', Pk.outline]);
  texts.push([PACK.coins, Pk.face, rx, ly, Pk.value, 'right', Pk.outline], [Pk.words[1], Pk.face, rx - wide(PACK.coins, Pk.face) - Pk.gap, ly, Pk.label, 'right', Pk.outline]);
  const Po = J.pop; texts.push([PACK.pop, Po.text.face, Po.burst[0] + Po.text.right[0], Po.burst[1] + Po.text.right[1], Po.text.colour, 'right', Po.text.outline]);
  const base = draw(world(SCENE), parts, texts);
  // the menu, over everything
  const M = J.menu, mdx = shop[POINTED][0] - M.slot0[0], mdy = shop[POINTED][1] - M.slot0[1], [mx, my] = [M.corner[0] + mdx, M.corner[1] + mdy], menu = [], mt = [];
  put(M.file, [M.at[0] + mdx, M.at[1] + mdy], menu); put(M.lit.file, [M.lit.at[0] + mdx, M.lit.at[1] + mdy + MENU.lit * M.lines.step], menu);
  mt.push([MENU.title, M.name.face, mx + M.name.at[0], my + M.name.at[1], M.name.colour]);
  M.shop_lines.forEach((l, i) => mt.push([l, M.lines.face, mx + M.lines.at[0], my + M.lines.at[1] + i * M.lines.step, i === MENU.lit ? M.lines.lit : i ? M.lines.colour : M.lines.first]));
  return draw(base, menu, mt);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/shop'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png') || (f.endsWith('.png.import') && !(f.slice(0, -11) in PIECES))) rmSync(`${out}/${f}`);   // a dropped piece goes, its import too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/shop.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and shop.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/shop.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/shop_window.mjs --pieces`); process.exit(1); }
  const A = check(out), B = screen(); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'scripts/art/out/ui-shop-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(), 'scripts/art/out/ui-shop.png', t0);
