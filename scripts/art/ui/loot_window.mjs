// Draft of the loot window (D142) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// One layout to judge; nothing here is a piece for the game yet. Every item, count and number shown is made up. The window is 1152 x 648.
//   Top:    what you opened, as its own boards: a chest's planks, iron bands and lock, like the chest in the world. 12 slots (made up: no decision says how much a chest holds).
//   Middle: "Take all" moves everything that fits (D142, D124); the round button closes.
//   Bottom: your pack, the character screen's satchel and its 12 + 8 slots (D124, D239), so an item is seen going where it will be found.
//   Left:   the item under the pointer, by name (D132), with its material and reference value (D37).
// A click moves an item to the pack at once in the slice (D142). Under the chest's name: who owns what is inside, since that is what makes taking it a theft (D35).
// New, not decided: the item note, the owner line's words, the keys, a chest's 12 slots. A body would open the same window under its description (D128): not drawn.
// Usage, from the repo root (a few seconds):
//   node scripts/art/ui/loot_window.mjs
//       prototype/shots/ui-loot.png (git-ignored). Over a made-up camp in the game's art: bought art (tileset, Creator), never commit the picture.
import { W, H, plate, boards, leather, packSlot, wordButton, button, crest, world, draw, wide, save } from './pieces.mjs';

const CHEST = { name: 'Chest', owner: 'It belongs to no one', holds: { 0: ['Coins', 'Gold', '23'], 1: ['Long Sword Bronze', 'Bronze'], 2: ['Leather Trousers', 'Leather'], 3: ['Arrows', 'Wood', '12'], 4: ['Bandage', 'Cloth', '2'], 6: ['Helmet Iron', 'Iron'] }, slots: 12, columns: 6 };
const PACK = { holds: { 0: ['Coins', 'Gold', '37'], 1: ['Arrows', 'Wood', '24'], 2: ['Short Bow', 'Wood'], 3: ['Leather Tunic', 'Leather'], 4: ['Hood Green', 'Cloth'], 5: ['Helmet Steel', 'Steel'], 6: ['Axe Bronze', 'Bronze'], 12: ['Trousers Red', 'Cloth'] }, slots: 20, columns: 10, full: '8 / 20', coins: '37' };
const POINTED = 1, NOTE = { name: 'Long Sword', lines: [['Material', 'Bronze'], ['Held', 'One hand'], ['Value', '40']], hint: 'Click to take' };

function screen() {
  const S = world({ you: 'plain', at: [150, 250], chest: 'open', yours: [2, 2], facing: 'E' }), parts = [], texts = [];
  const sx = 548, sw = 578, cx = sx + sw / 2;
  // what you opened
  const bw = 444, bh = 214, bx = cx - bw / 2, by = 60; parts.push(boards(bx, by, bw, bh));
  texts.push([CHEST.name, 'mid', bx + 64, by + 10, 'value', 'left', 2], [CHEST.owner, 'small', bx + bw - 64, by + 16, 'hint', 'right', 2]);
  const at = i => [bx + 62 + (i % CHEST.columns) * 54, by + 46 + Math.floor(i / CHEST.columns) * 80];
  for (let i = 0; i < CHEST.slots; i++) packSlot(parts, texts, ...at(i), CHEST.holds[i], i === POINTED);
  // the item under the pointer
  const [px, py] = at(POINTED), nw = 168, nh = 126, nx = bx - nw - 10, ny = py - 6; parts.push(plate(nx, ny, nw, nh, { full: [W, H] }));
  texts.push([NOTE.name, 'title', nx + 16, ny + 12, 'value']); NOTE.lines.forEach(([l, v], i) => texts.push([l, 'line', nx + 16, ny + 40 + i * 19, 'label'], [v, 'line', nx + nw - 16, ny + 40 + i * 19, 'value', 'right']));
  texts.push([NOTE.hint, 'small', nx + 16, ny + nh - 22, 'hint']);
  // take all, close
  const ty = by + bh + 16; parts.push(wordButton(cx - 92, ty, 184, 44, true), button('Close', cx + 92 + 40, ty + 22, 17)); texts.push(['Take all', 'mid', cx, ty + 9, 'glow', 'center', 2], ['Space', 'small', cx - 92 - 14, ty + 15, 'hint', 'right', 2], ['Esc', 'small', cx + 92 + 64, ty + 15, 'hint', 'left', 2]);
  // your pack
  const ly = 372, lh = 226; parts.push(leather(sx, ly, sw, lh));
  texts.push(['Pack', 'title', sx + 22, ly + 22, 'label', 'left', 1], [PACK.full, 'title', sx + 22 + wide('Pack', 'title') + 8, ly + 22, 'value', 'left', 1], [PACK.coins, 'title', sx + sw - 22, ly + 22, 'value', 'right', 1], ['Coins', 'title', sx + sw - 22 - wide(PACK.coins, 'title') - 8, ly + 22, 'label', 'right', 1]);
  for (let i = 0; i < PACK.slots; i++) packSlot(parts, texts, sx + 18 + (i % PACK.columns) * 54 + 2, ly + 52 + Math.floor(i / PACK.columns) * 80, PACK.holds[i]);
  return draw(S, parts, texts);
}
const t0 = Date.now(); save(screen(), 'prototype/shots/ui-loot.png', t0);
