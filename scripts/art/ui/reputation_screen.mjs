// Draft of the Reputation screen (D7, D8, D22, D126) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// One layout to judge; nothing here is a piece for the game yet. Every word, number and tale shown is made up. The window is 1152 x 648; the screen is 880 x 592.
//   Top:    one card per town you could be known in, under its painted landmark (the HUD's door at dawn; Oldscar's cliff and scar, D107, D234).
//           Standing with its faction (D7, D9), Morality and Fame (D8; Mercy waits, D22), each a scale with a bronze diamond where you were told you stand.
//           It holds only what you were told there, by whom and when (D126). A town that told you nothing shows empty scales.
//   Bottom: the tales told of you that you have heard (D194), with where and when you heard each.
// It starts blank (D126) and fills as you ask in a town: "Tell me more about this person..." (D127).
// New, not decided: the words for each level (Welcome, Decent, Little known), Fame as a bar that only fills (D8 says it only grows),
// the signs (a shield, a pair of scales, a crown), Oldscar's picture. Not shown: standing with people in general (D7), and Mercy.
// Usage, from the repo root (a few seconds):
//   node scripts/art/ui/reputation_screen.mjs
//       prototype/shots/ui-reputation.png (git-ignored). Over a made-up camp in the game's art: bought art (tileset, Creator), never commit the picture.
import { W, H, AMBER, frame, stage, button, scale, bar, diamond, rule, picture, roundFrame, dawnDoor, scarCliff, world, dim, draw, wide, save } from './pieces.mjs';

const TOWNS = [
  { name: 'Dawndoor', faction: 'The Keeping', paint: dawnDoor, told: 'Told by a guard, 2 days ago', rows: [['Standing', 'Welcome', .72], ['Morality', 'Decent', .63], ['Fame', 'Little known', .18]] },
  { name: 'Oldscar', faction: 'The Tally', paint: scarCliff, told: 'Nobody there has told you. They are at war with your people.', rows: [['Standing'], ['Morality'], ['Fame']] },
];
const ENDS = { Standing: ['Enemy', 'Friend'], Morality: ['Evil', 'Good'], Fame: ['Unknown', 'Legendary'] };
const TALES = [['You killed two orcs on the west road.', 'Dawndoor  ·  heard 2 days ago'], ['You bandaged a hurt man outside the gate.', 'Dawndoor  ·  heard 2 days ago']];

function screen() {
  const S = dim(world({ you: 'plain' }), .45, .5), parts = [], texts = [], x = 136, y = 28, w = 880, h = 592;
  parts.push(frame(x, y, w, h));
  texts.push(['Reputation', 'big', x + 34, y + 24, 'value'], ['Only what you have been told', 'line', x + w - 34, y + 38, 'hint', 'right']);
  parts.push(rule(x + 34 + wide('Reputation', 'big') + 16, x + w - 34 - wide('Only what you have been told', 'line') - 14, y + 46));
  TOWNS.forEach((t, n) => {
    const cx = x + 30 + n * 420, cy = y + 76, cw = 400, ch = 254, known = t.rows[0].length > 1;
    parts.push(stage(cx, cy, cw, ch, cx + 60, cy + 60, 300, 260, known ? 1 : .35));
    picture(parts, cx + 56, cy + 56, 38, t.paint(38), known ? 0 : .8); roundFrame(parts, cx + 56, cy + 56, 38, known ? 'bronze' : 'steel');
    texts.push([t.name, 'mid', cx + 112, cy + 26, known ? 'value' : 'hint'], [t.faction, 'line', cx + 112, cy + 52, known ? 'label' : 'dim']);
    t.rows.forEach(([what, word, v], i) => {
      const ry = cy + 118 + i * 38, sx = cx + 180, sw = 196;
      parts.push(button(what, cx + 32, ry + 8, 13)); texts.push([what, 'line', cx + 54, ry - 8, known ? 'label' : 'dim'], [word ?? 'Not known', 'line', cx + 54, ry + 8, known ? 'value' : 'dim']);
      if (what === 'Fame') parts.push(bar(sx - 4, ry - 1, sw + 8, 11, v ?? 0, AMBER)); else parts.push(scale(sx, ry + 4, sw, v ?? null));
      texts.push([ENDS[what][0], 'small', sx, ry + 14, 'dim'], [ENDS[what][1], 'small', sx + sw, ry + 14, 'dim', 'right']);
    });
    texts.push([t.told, 'small', cx + 20, cy + ch - 22, known ? 'hint' : 'dim']);
  });
  const ty = y + 350; texts.push(['Tales told of you', 'mid', x + 34, ty, 'value']); parts.push(rule(x + 34 + wide('Tales told of you', 'mid') + 14, x + w - 34, ty + 14));
  parts.push(stage(x + 30, ty + 34, w - 60, 164, x + w / 2, ty + 110, 520, 150, .6));
  TALES.forEach(([tale, where], i) => { const ry = ty + 54 + i * 30; parts.push(diamond(x + 54, ry + 8, 4)); texts.push([tale, 'text', x + 70, ry - 2, 'value'], [where, 'small', x + w - 54, ry + 2, 'hint', 'right']); });
  texts.push(['Ask in a town to hear more:  "Tell me more about this person..."', 'line', x + w / 2, ty + 164, 'hint', 'center']);
  parts.push(button('Close', x + w - 6, y + 6, 15));
  return draw(S, parts, texts);
}
const t0 = Date.now(); save(screen(), 'prototype/shots/ui-reputation.png', t0);
