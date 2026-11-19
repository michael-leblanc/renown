// Draft of the death screen (D148, D149) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// Nothing here is a piece for the game yet. Every name, number and deed shown is made up. The window is 1152 x 648.
//   Left:   the life that ended, as the character lived it (D148): where it woke, how long it lasted, its deeds, how it ended as it saw it (D128).
//           The deeds are a list that scrolls (Michael, 2026-11-18: a life can leave a long one): the lines that fit, a fade over the last, a scroll bar.
//   Right:  what the world really remembers, town by town (D149), the life's own town first: only deeds somebody saw (D5), told of a face
//           when the name was never learned (D30). It scrolls the same way once it is longer than its plate.
//   Middle: the landmark of the town the life woke in (Michael, 2026-11-18): Dawndoor's doorway at dawn, the menu's painting (scenes.mjs);
//           Oldscar's cliff and its scar as the sun goes down, painted after the cliff on branch art/oldscar-cliff (scar_scene.mjs). Then "Wake" (D148). The new life knows none of this (D50).
// The made-up lives show the rules at work: a theft nobody saw is among the deeds and in no town's tales (D45); the enemy town knows a face, not a name.
// New, not decided: the words of every line, showing the best skills and the coins, how the deeds are ordered (here: oldest first).
// Usage, from the repo root (about 10 seconds each):
//   node scripts/art/ui/death_screen.mjs [--town dawndoor|oldscar|all]
//       prototype/shots/ui-death.png and ui-death-oldscar.png (git-ignored). Over a made-up camp in the game's art: bought art (tileset, Creator),
//       never commit the pictures.
import { K } from './kit.mjs';
import { W, H, clamp, plate, crest, rule, diamond, heading, picture, roundFrame, dawnDoor, scarCliff, wordButton, scrollbar, fade, world, dim, draw, wide, wrap, para, save } from './pieces.mjs';
import { doorScene, DOOR } from './scenes.mjs';
import { scarPaint, SCAR } from './scar_scene.mjs';

const TOWN = { dawndoor: { name: 'Dawndoor', faction: 'The Keeping', small: dawnDoor }, oldscar: { name: 'Oldscar', faction: 'The Tally', small: scarCliff } };
const LIVES = {
  dawndoor: {
    name: 'Aldric', race: 'Human', kind: 'human', background: 'Well-woken', rows: [['Woke in', 'Dawndoor'], ['Lived', '3 days'], ['Best skills', 'Swords 41, Shield 36'], ['Coins at the end', '37']],
    deeds: ['Bandaged a hurt man outside the gate.', 'Took bread from a baker\'s shelf. Nobody saw.', 'Killed a goblin by the old well.', 'Killed two orcs on the west road.', 'Killed an orc at the ford.', 'Bandaged a guard after the fight at the ford.',
      'Killed a goblin in the north wood.', 'Killed an orc in iron on the west road.', 'Bandaged a hunter in the north wood.', 'Killed two goblins at the ford.', 'Killed an orc by the standing stone.', 'Killed a goblin on the west road.'],
    end: ['Killed by an orc in steel plate,', 'on the west road.'],
    says: { dawndoor: 'They say you killed five orcs and four goblins, and that you bandaged three of their own. They knew you as Aldric.', oldscar: 'They speak of a human with a round shield who killed nine of theirs. They never learned your name.' },
    unseen: 'The bread is in no tale: nobody saw it taken.',
  },
  oldscar: {
    name: 'Ulgra', race: 'Orc', kind: 'orc', background: 'Brawler', rows: [['Woke in', 'Oldscar'], ['Lived', '5 days'], ['Best skills', 'Maces 38, Unarmed 33'], ['Coins at the end', '12']],
    deeds: ['Killed a human hunter in the green wood.', 'Took an axe from a shop\'s shelf. Nobody saw.', 'Bandaged a goblin at the cliff\'s foot.', 'Killed two humans on the east road.', 'Killed a human guard at the ford.', 'Killed a human in iron on the east road.',
      'Bandaged an orc after the fight at the ford.', 'Killed a human by the standing stone.', 'Killed two human guards at the ford.', 'Killed a human hunter on the east road.'],
    end: ['Killed by a human in an iron platebody,', 'at the ford.'],
    says: { oldscar: 'They say you killed eight of the Hoarders, three of them guards at their own ford. They knew you as Ulgra.', dawndoor: 'They speak of an orc with a mace who killed three guards at the ford. They never learned your name.' },
    unseen: 'The axe is in no tale: nobody saw it taken.',
  },
};

/** A town's landmark as a round picture with its bronze frame: a cut of the full painting, 289 of its pixels from middle to edge. */
function landmark(parts, town, cx, cy, r) {
  const zoom = r / 289;
  if (town === 'oldscar') picture(parts, cx, cy, r, (x, y) => scarPaint(SCAR.CX + x / zoom, SCAR.CY + y / zoom));
  else {
    const n = 2 * r * K, shot = doorScene({ x0: DOOR.SX - 289, y0: 362 - 289, w: n, h: n, zoom: zoom * K }).frame(0);
    picture(parts, cx, cy, r, (x, y) => { const p = (clamp(Math.round((y + r) * K), 0, n - 1) * n + clamp(Math.round((x + r) * K), 0, n - 1)) * 4; return [shot.data[p], shot.data[p + 1], shot.data[p + 2]]; });
  }
  roundFrame(parts, cx, cy, r);
}
/** A list that scrolls, at its top: the lines that fit in h, each item under a diamond; when more follow, a fade over the last line and a scroll bar. */
function scrolling(parts, texts, tops, items, x, y, w, h, tone) {
  const step = 19, lines = items.flatMap(d => wrap(d, 'line', w - 36).map((l, n) => [l, n === 0])), fits = Math.floor(h / step);
  lines.slice(0, fits).forEach(([l, first], n) => { if (first) parts.push(diamond(x + 5, y + n * step + 8, 4)); texts.push([l, 'line', x + 18, y + n * step, 'value']); });
  if (lines.length > fits) { tops.push(fade(x, Math.round(y + (fits - 1.5) * step), w - 14, Math.round(step * 1.5) + 2, tone)); parts.push(scrollbar(x + w - 4, y + 2, h - 4, 0, fits / lines.length)); }
}

function screen(home) {
  const L = LIVES[home], S = dim(world({ you: 'dead', at: [684, 652], facing: 'SE', race: L.kind }), .5, .7), parts = [], texts = [], tops = [], cx = W / 2;
  // the name
  texts.push(['A life has ended', 'title', cx, 18, 'label', 'center', 2], [L.name, 'huge', cx, 36, 'value', 'center', 2], [`${L.race}  ·  ${L.background}`, 'text', cx, 88, 'hint', 'center', 2]);
  const nw = wide(L.name, 'huge'); parts.push(rule(cx - nw / 2 - 18, cx - nw / 2 - 150, 64), rule(cx + nw / 2 + 18, cx + nw / 2 + 150, 64));
  // the life, as it was lived
  const lx = 40, py = 124, pw = 336, ph = 432; parts.push(plate(lx, py, pw, ph, { full: [W, H] }), crest(lx + pw / 2, py));
  heading(parts, texts, 'The life', lx + pw / 2, py + 20, pw / 2 - 26);
  L.rows.forEach(([l, v], i) => texts.push([l, 'line', lx + 28, py + 62 + i * 22, 'label'], [v, 'line', lx + pw - 28, py + 62 + i * 22, 'value', 'right']));
  heading(parts, texts, `Deeds  ·  ${L.deeds.length}`, lx + pw / 2, py + 162, pw / 2 - 26, 'title', 'label');
  scrolling(parts, texts, tops, L.deeds, lx + 28, py + 196, pw - 50, 136, .88);
  heading(parts, texts, 'The end', lx + pw / 2, py + 348, pw / 2 - 26, 'title', 'label');
  L.end.forEach((l, i) => texts.push([l, 'line', lx + pw / 2, py + 380 + i * 18, 'value', 'center']));
  // what the world remembers, the life's own town first
  const rx = W - 40 - pw; parts.push(plate(rx, py, pw, ph, { full: [W, H] }), crest(rx + pw / 2, py));
  heading(parts, texts, 'What the world remembers', rx + pw / 2, py + 20, pw / 2 - 26);
  let y = py + 70;
  for (const [id, says] of Object.entries(L.says)) {
    const t = TOWN[id]; picture(parts, rx + 58, y + 34, 32, t.small(32)); roundFrame(parts, rx + 58, y + 34, 32);
    texts.push([t.name, 'title', rx + 104, y - 4, 'value'], [t.faction, 'small', rx + pw - 28, y + 1, 'hint', 'right']);
    para(texts, says, 'line', rx + 104, y + 22, pw - 132, 'value', 18); y += 150;
  }
  parts.push(rule(rx + pw / 2, rx + 40, y - 14), rule(rx + pw / 2, rx + pw - 40, y - 14)); para(texts, L.unseen, 'line', rx + 40, y + 2, pw - 80, 'hint', 18);
  // the town's landmark, and waking
  landmark(parts, home, cx, 262, 104);
  texts.push(['What you wore and carried', 'line', cx, 392, 'hint', 'center', 2], ['lies where you fell.', 'line', cx, 410, 'hint', 'center', 2]);
  parts.push(wordButton(cx - 104, 456, 208, 52, true)); texts.push(['Wake', 'big', cx, 465, 'glow', 'center', 2]);
  texts.push(['The new life knows none of this.', 'line', cx, 526, 'hint', 'center', 2]);
  return draw(S, parts, texts, tops);
}
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, which = flag('--town', 'all');
for (const town of which === 'all' ? Object.keys(LIVES) : [which]) { const t0 = Date.now(); save(screen(town), `prototype/shots/ui-death${town === 'dawndoor' ? '' : `-${town}`}.png`, t0); }
