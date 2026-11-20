// The death screen (D148, D149, D247) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// Every name, number and deed shown is made up. The window is 1152 x 648.
//   Left:   the life that ended, as the character lived it (D148): where it woke, how long it lasted, its deeds, how it ended as it saw it (D128).
//           The deeds are a list that scrolls (Michael, 2026-11-18: a life can leave a long one): the lines that fit, a fade over the last, a scroll bar.
//   Right:  what the world really remembers, town by town (D149), the life's own town first: only deeds somebody saw (D5), told of a face
//           when the name was never learned (D30). It scrolls the same way once it is longer than its plate.
//   Middle: the landmark of the town the life woke in (Michael, 2026-11-18): Dawndoor's doorway at dawn, the menu's painting (scenes.mjs);
//           Oldscar's cliff and its scar as the sun goes down, painted after the cliff on branch art/oldscar-cliff (scar_scene.mjs). Then "Wake" (D148). The new life knows none of this (D50).
// The made-up lives show the rules at work: a theft nobody saw is among the deeds and in no town's tales (D45); the enemy town knows a face, not a name.
// New, not decided: the words of every line, showing the best skills and the coins, how the deeds are ordered (here: oldest first).
//
// The pieces, like the HUD's (#50), into game/client/art/made/ui/death/ (--pieces):
//   Plate Life, Plate World                        the two plates, each with its crest
//   Rule Left, Rule Right                          a long steel rule with its diamond at the inner end: the game cuts it to the length it needs
//                                                  (either side of the name and of each heading, and the divider under the towns)
//   Bullet                                         the diamond before a deed
//   Scroll Trough, Scroll Thumb                    the deeds' scroll bar: the thumb is a nine-patch (death_screen.json says its margins)
//   Fade                                           laid over the last deed that shows when more follow, over the text
//   Town Dawndoor, Town Oldscar                    a town's small landmark in its bronze frame, beside what that town remembers
//   Landmark Dawndoor, Landmark Oldscar            the big one in the middle: the town the life woke in
//   Button Wake
//   death_screen.json                              where every piece and line of text goes. Godot reads the places from it.
// Not a piece: the world behind, dimmed and greyed (the json's "veil": the game does it with a shader). Text is drawn by Godot in Alegreya
// (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/death_screen.mjs [--town dawndoor|oldscar|all]      the draft, scripts/art/out/ui-death.png and ui-death-oldscar.png (about 7 s each)
//   node scripts/art/ui/death_screen.mjs --pieces [--out dir]               the pieces and death_screen.json, into game/client/art/made/ui/death/ (about 5 s)
//   node scripts/art/ui/death_screen.mjs --check [--out dir] [--town dawndoor|oldscar|all]
//       puts the screen together from the pieces the way the json says, into scripts/art/out/ui-death-pieces.png (-oldscar), and counts the
//       pixels that differ from the draft. Write the pieces first.
// Every picture in scripts/art/out/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { K } from './kit.mjs';
import { W, H, COL, FACE, clamp, plate, crest, rule, diamond, heading, picture, roundFrame, dawnDoor, scarCliff, wordButton, scrollbar, fade, world, dim, draw, wide, wrap, para, save, open, blank, bake, cut } from './pieces.mjs';
import { doorScene, DOOR } from './scenes.mjs';
import { scarPaint, SCAR } from './scar_scene.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

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

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const PY = 124, PW = 336, PH = 432, LX = 40, RX = W - 40 - PW, CX = W / 2;
const AT = {
  title: 18, name: 36, kind: 88, nameRule: [64, 18, 150],     // the y of each top line; the name's rules: y, gap from the name, how far out they reach
  plate: [PY, PW, PH], life: LX, world: RX, half: PW / 2 - 26,  // the plates; a heading's rules reach `half` from its middle
  lifeHeading: 20, rows: [62, 22, 28],                           // from the plate's top; the rows: first y, step, inset from either side
  deedsHeading: 162, deeds: [28, 196, PW - 50, 136, 19],         // the list: x and y from the plate's corner, width, height, line step
  endHeading: 348, end: [380, 18],
  towns: [70, 150, 58, 34, 32, 2],                               // first town's y from the plate's top, step; its picture's middle from the plate's x and the town's y, radius; how many fit
  divider: [-14, 40], unseen: [40, 2],                           // under the towns
  landmark: [CX, 262, 104], left: [392, 18], wake: [CX - 104, 456, 208, 52], wakeText: 465, newLife: 526,
};
const DEEDS_BULLET = 5, DEEDS_TEXT = 18, DEEDS_WRAP = 36;       // in the list: the bullet's middle and the text from its left, and what the text leaves of its width
const DEED_DROP = 8, TONE = .88;                               // the bullet's middle under a line's top; how pale the plate is under the fade

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
/** The deeds' list: its x, y, width and height in the window. */
const listBox = () => { const [dx, dy, w, h] = AT.deeds; return [LX + dx, PY + dy, w, h]; };
/** The wrapped lines of a list, each [line, whether it starts an item]. */
const lineUp = (items, w) => items.flatMap(d => wrap(d, 'line', w - DEEDS_WRAP).map((l, n) => [l, n === 0]));
/** A list that scrolls, at its top: the lines that fit in h, each item under a diamond; when more follow, a fade over the last line and a scroll bar. */
function scrolling(parts, texts, tops, items, x, y, w, h, tone) {
  const step = AT.deeds[4], lines = lineUp(items, w), fits = Math.floor(h / step);
  lines.slice(0, fits).forEach(([l, first], n) => { if (first) parts.push(diamond(x + DEEDS_BULLET, y + n * step + DEED_DROP, 4)); texts.push([l, 'line', x + DEEDS_TEXT, y + n * step, 'value']); });
  if (lines.length > fits) { tops.push(fade(x, Math.round(y + (fits - 1.5) * step), w - 14, Math.round(step * 1.5) + 2, tone)); parts.push(scrollbar(x + w - 4, y + 2, h - 4, 0, fits / lines.length)); }
}
const kindLine = L => `${L.race}  ·  ${L.background}`, deedsTitle = n => `Deeds  ·  ${n}`;

function screen(home) {
  const L = LIVES[home], S = dim(world({ you: 'dead', at: [684, 652], facing: 'SE', race: L.kind }), .5, .7), parts = [], texts = [], tops = [], cx = CX, [py, pw, ph] = AT.plate;
  // the name
  texts.push(['A life has ended', 'title', cx, AT.title, 'label', 'center', 2], [L.name, 'huge', cx, AT.name, 'value', 'center', 2], [kindLine(L), 'text', cx, AT.kind, 'hint', 'center', 2]);
  const nw = wide(L.name, 'huge'), [ny, ngap, nreach] = AT.nameRule; parts.push(rule(cx - nw / 2 - ngap, cx - nw / 2 - nreach, ny), rule(cx + nw / 2 + ngap, cx + nw / 2 + nreach, ny));
  // the life, as it was lived
  const lx = AT.life, [ry, rstep, rin] = AT.rows; parts.push(plate(lx, py, pw, ph, { full: [W, H] }), crest(lx + pw / 2, py));
  heading(parts, texts, 'The life', lx + pw / 2, py + AT.lifeHeading, AT.half);
  L.rows.forEach(([l, v], i) => texts.push([l, 'line', lx + rin, py + ry + i * rstep, 'label'], [v, 'line', lx + pw - rin, py + ry + i * rstep, 'value', 'right']));
  heading(parts, texts, deedsTitle(L.deeds.length), lx + pw / 2, py + AT.deedsHeading, AT.half, 'title', 'label');
  scrolling(parts, texts, tops, L.deeds, ...listBox(), TONE);
  heading(parts, texts, 'The end', lx + pw / 2, py + AT.endHeading, AT.half, 'title', 'label');
  L.end.forEach((l, i) => texts.push([l, 'line', lx + pw / 2, py + AT.end[0] + i * AT.end[1], 'value', 'center']));
  // what the world remembers, the life's own town first
  const rx = AT.world, [ty, tstep, tdx, tdy, tr] = AT.towns; parts.push(plate(rx, py, pw, ph, { full: [W, H] }), crest(rx + pw / 2, py));
  heading(parts, texts, 'What the world remembers', rx + pw / 2, py + AT.lifeHeading, AT.half);
  let y = py + ty;
  for (const [id, says] of Object.entries(L.says)) {
    const t = TOWN[id]; picture(parts, rx + tdx, y + tdy, tr, t.small(tr)); roundFrame(parts, rx + tdx, y + tdy, tr);
    texts.push([t.name, 'title', rx + 104, y - 4, 'value'], [t.faction, 'small', rx + pw - 28, y + 1, 'hint', 'right']);
    para(texts, says, 'line', rx + 104, y + 22, pw - 132, 'value', 18); y += tstep;
  }
  const [ddy, dreach] = AT.divider; parts.push(rule(rx + pw / 2, rx + dreach, y + ddy), rule(rx + pw / 2, rx + pw - dreach, y + ddy)); para(texts, L.unseen, 'line', rx + AT.unseen[0], y + AT.unseen[1], pw - 80, 'hint', 18);
  // the town's landmark, and waking
  landmark(parts, home, ...AT.landmark);
  texts.push(['What you wore and carried', 'line', cx, AT.left[0], 'hint', 'center', 2], ['lies where you fell.', 'line', cx, AT.left[0] + AT.left[1], 'hint', 'center', 2]);
  parts.push(wordButton(...AT.wake, true)); texts.push(['Wake', 'big', cx, AT.wakeText, 'glow', 'center', 2]);
  texts.push(['The new life knows none of this.', 'line', cx, AT.newLife, 'hint', 'center', 2]);
  return draw(S, parts, texts, tops);
}

/* ---------- the pieces ---------- */
const RULE = [CX - 60, CX + 60, 156, 200];                      // where the rules are drawn as pieces: the left one's inner end, the right one's, their y, their length
const THUMB = 40;                                               // the scroll bar's thumb is drawn this tall; the game stretches its middle
const one = f => () => { const parts = []; f(parts); return parts; };
const fadeBox = () => { const [x, y, w] = listBox(), step = AT.deeds[4], fits = Math.floor(AT.deeds[3] / step); return [x, Math.round(y + (fits - 1.5) * step), w - 14, Math.round(step * 1.5) + 2]; };
const barBox = () => { const [x, y, w, h] = listBox(); return [x + w - 4, y + 2, h - 4]; };
const PIECES = {
  'Plate Life': () => [plate(AT.life, PY, PW, PH, { full: [W, H] }), crest(AT.life + PW / 2, PY)],
  'Plate World': () => [plate(AT.world, PY, PW, PH, { full: [W, H] }), crest(AT.world + PW / 2, PY)],
  'Rule Left': () => [rule(RULE[0], RULE[0] - RULE[3], RULE[2])], 'Rule Right': () => [rule(RULE[1], RULE[1] + RULE[3], RULE[2])],
  Bullet: () => { const [x, y] = listBox(); return [diamond(x + DEEDS_BULLET, y + DEED_DROP, 4)]; },
  'Scroll Trough': () => [scrollbar(...barBox(), 0, 1, 'trough')],
  'Scroll Thumb': () => { const [x, y, h] = barBox(); return [scrollbar(x, y, h, 0, THUMB / (h - 2), 'thumb')]; },
  Fade: () => [fade(...fadeBox(), TONE)],
  ...Object.fromEntries(Object.values(TOWN).map(t => [`Town ${t.name}`, one(p => { const [ty, , dx, dy, r] = AT.towns, x = AT.world + dx, y = PY + ty + dy; picture(p, x, y, r, t.small(r)); roundFrame(p, x, y, r); })])),
  ...Object.fromEntries(Object.entries(TOWN).map(([id, t]) => [`Landmark ${t.name}`, one(p => landmark(p, id, ...AT.landmark))])),
  'Button Wake': () => [wordButton(...AT.wake, true)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at, size) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), towns = Object.values(TOWN).map(t => t.name);
  const [lx, ly, lw, lh, step] = listBox().concat(AT.deeds[4]), [bx, by, bh] = barBox(), [ty, tstep] = AT.towns, mid = PW / 2, thumbTop = by + 1;
  return {
    _note: 'Written by scripts/art/ui/death_screen.mjs --pieces: do not edit by hand. The death screen (D148, D149, D247) in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; the fade goes over the text. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. The screen is one block: in a bigger window it would be centred (not done).',
    size: [W, H],
    order: ['veil', 'Plate Life', 'Plate World', 'rules', 'bullets', 'Scroll Trough', 'Scroll Thumb', 'towns', 'landmark', 'Button Wake', 'text', 'Fade'],
    veil: { _note: 'The world behind, done by the game (a shader over the screen): each colour goes `grey` of the way to its grey, then `dark` of the way to `tint`, then is darkened towards the corners: times 1 - corners * d^2, d from 0 in the middle to 1 at a corner along each axis (d^2 = dx^2 + dy^2, dx and dy from -1 to 1).', dark: .5, grey: .7, tint: hex([18, 20, 26]), corners: .35 },
    pieces: Object.fromEntries(['Plate Life', 'Plate World', 'Scroll Trough', 'Fade', 'Button Wake'].map(n => [n, P(n)])),
    rules: {
      _note: 'A steel rule with a diamond at its inner end, drawn from that end (x, y) out to a length. Rule Left reaches left: draw its columns from inner[0] - length to its right edge. Rule Right reaches right: its columns from 0 to inner[0] + length. The piece goes so that its "inner" lands on (x, y), both rounded to whole pixels. The name: either side, "gap" from its ends, "length" long, at y. A heading: "gap" from its ends out to "half" from its middle, at its top + "drop" times its px. The divider under the towns: both from x, "length" long, "dy" from where the next town would start.',
      left: { file: 'Rule Left.png', inner: [RULE[0] - at['Rule Left'][0], RULE[2] - at['Rule Left'][1]] }, right: { file: 'Rule Right.png', inner: [RULE[1] - at['Rule Right'][0], RULE[2] - at['Rule Right'][1]] }, drawn: RULE[3],
      name: { y: AT.nameRule[0], gap: AT.nameRule[1], length: AT.nameRule[2] - AT.nameRule[1] }, heading: { gap: 10, drop: .62, half: AT.half }, divider: { x: RX + mid, dy: AT.divider[0], length: mid - AT.divider[1] },
    },
    headings: {
      life: { text: 'The life', face: 'mid', centre: [LX + mid, PY + AT.lifeHeading], colour: 'value' },
      deeds: { text: 'Deeds  ·  <n>', face: 'title', centre: [LX + mid, PY + AT.deedsHeading], colour: 'label', _note: '<n>: how many deeds' },
      end: { text: 'The end', face: 'title', centre: [LX + mid, PY + AT.endHeading], colour: 'label' },
      world: { text: 'What the world remembers', face: 'mid', centre: [RX + mid, PY + AT.lifeHeading], colour: 'value' }, outline: 1,
    },
    deeds: {
      _note: 'The deeds, oldest first, each wrapped to "wrap" px (greedy, word by word) in face "line": "lines" lines show, "step" apart, from "at" (each line\'s text starts at at + text_dx). The first line of a deed has the Bullet, its corner "bullet" from that line\'s text corner. When more lines follow those that show: the Fade over the last line that shows, and the scroll bar. Its thumb: a nine-patch, from y = round(top + travel * first / total) and round(travel * shown / total) tall (at least "min"), with its shadow above and below it (put the piece "shadow_top" above the thumb; it is drawn "drawn" tall plus the shadow).',
      at: [lx, ly], text_dx: DEEDS_TEXT, wrap: lw - DEEDS_WRAP, step, lines: Math.floor(lh / step), face: 'line', colour: 'value', rect: [lx, ly, lw, lh],
      bullet: { file: 'Bullet.png', dx: at.Bullet[0] - lx - DEEDS_TEXT, dy: at.Bullet[1] - ly },
      thumb: { file: 'Scroll Thumb.png', x: at['Scroll Thumb'][0], top: thumbTop, travel: bh - 2, min: 16, drawn: THUMB, shadow_top: thumbTop - at['Scroll Thumb'][1], patch_margin: { top: thumbTop - at['Scroll Thumb'][1] + 4, bottom: at['Scroll Thumb'][1] + size['Scroll Thumb'][1] - thumbTop - THUMB + 4 } },
    },
    towns: {
      _note: 'What each town remembers, the life\'s own town first: at most "fits" of them, "step" apart, the first at "top". Each: its small landmark, its name, its faction (right-aligned), what it says (wrapped to "wrap" px, "step" apart). The places are the first town\'s; the next is "step" lower.',
      files: Object.fromEntries(towns.map(t => [t, `Town ${t}.png`])), at: at['Town Dawndoor'], top: PY + ty, step: tstep, fits: AT.towns[5],
      name: { face: 'title', at: [RX + 104, PY + ty - 4], colour: 'value' }, faction: { face: 'small', right: [RX + PW - 28, PY + ty + 1], colour: 'hint' },
      says: { face: 'line', at: [RX + 104, PY + ty + 22], wrap: PW - 132, step: 18, colour: 'value' },
      unseen: { _note: 'Under the divider: what nobody saw, "dy" from where the next town would start.', face: 'line', x: RX + AT.unseen[0], dy: AT.unseen[1], wrap: PW - 80, step: 18, colour: 'hint' },
    },
    landmark: { _note: 'The town the life woke in (D247).', at: at['Landmark Dawndoor'], files: Object.fromEntries(towns.map(t => [t, `Landmark ${t}.png`])) },
    wake: { _note: 'Clicking it, or Enter, wakes the new life (D148).', rect: AT.wake },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['huge', 'big', 'mid', 'title', 'text', 'line', 'small'].map(k => [k, face(k)])),
      title: { text: 'A life has ended', face: 'title', centre: [CX, AT.title], colour: 'label', outline: 2 },
      name: { face: 'huge', centre: [CX, AT.name], colour: 'value', outline: 2 },
      kind: { face: 'text', centre: [CX, AT.kind], colour: 'hint', outline: 2, join: '  ·  ', _note: 'race, join, background' },
      rows: { face: 'line', label_at: [LX + AT.rows[2], PY + AT.rows[0]], value_right: [LX + PW - AT.rows[2], PY + AT.rows[0]], step: AT.rows[1], label: 'label', value: 'value' },
      end: { face: 'line', centre: [LX + mid, PY + AT.end[0]], step: AT.end[1], colour: 'value' },
      left_behind: { lines: ['What you wore and carried', 'lies where you fell.'], face: 'line', centre: [CX, AT.left[0]], step: AT.left[1], colour: 'hint', outline: 2, _note: 'D3' },
      wake: { text: 'Wake', face: 'big', centre: [CX, AT.wakeText], colour: 'glow', outline: 2 },
      new_life: { text: 'The new life knows none of this.', face: 'line', centre: [CX, AT.newLife], colour: 'hint', outline: 2, _note: 'D50' },
    },
  };
}

/* ---------- the check: the screen from the pieces ---------- */
/** A picture stretched (or squeezed) down to height h: `t` and `b` rows kept at the ends, the middle resampled. */
function nineV(p, h, t, b) {
  const o = blank(p.w, h), mid = p.h - t - b, to = h - t - b;
  for (let j = 0; j < h; j++) { const sy = j < t ? j : j >= h - b ? j - h + p.h : t + Math.min(mid - 1, Math.floor((j - t + .5) * mid / to)); p.data.copy(o.data, j * p.w * 4, sy * p.w * 4, (sy + 1) * p.w * 4); }
  return o;
}
function check(dir, home) {
  const J = JSON.parse(readFileSync(`${dir}/death_screen.json`, 'utf8')), pic = f => open(`${dir}/${f}`), L = LIVES[home], parts = [], texts = [], tops = [], put = (f, a) => parts.push([pic(f), ...a]), X = J.text;
  const say = (str, s, colour = s.colour, align = 'left', outline = s.outline ?? 0, at = s.at ?? s.centre ?? s.right) => texts.push([str, s.face, ...at, colour, align, outline]);
  const sayC = (str, s, at = s.centre) => say(str, s, s.colour, 'center', s.outline ?? 0, at);
  /** A rule the game's way: its piece cut to `length` from the inner end at x, y. */
  const ruleAt = (side, x, y, length) => {
    const R0 = J.rules[side], p = pic(R0.file), [ix, iy] = R0.inner, x0 = Math.round(x) - ix, y0 = Math.round(y) - iy;
    parts.push([cut(p, i => side === 'left' ? i >= ix - length : i <= ix + length), x0, y0]);
  };
  const W2 = (str, k) => wide(str, k);
  for (const n of ['Plate Life', 'Plate World']) put(J.pieces[n].file, J.pieces[n].at);
  // the rules: the name's, each heading's, the divider
  const nw = W2(L.name, X.name.face), N = J.rules.name, hd = J.headings;
  ruleAt('left', CX - nw / 2 - N.gap, N.y, N.length); ruleAt('right', CX + nw / 2 + N.gap, N.y, N.length);
  const heads = [[hd.life, hd.life.text], [hd.deeds, hd.deeds.text.replace('<n>', L.deeds.length)], [hd.end, hd.end.text], [hd.world, hd.world.text]];
  for (const [h, str] of heads) {
    const w = W2(str, h.face), G = J.rules.heading, ry = h.centre[1] + FACE[h.face][1] * G.drop, len = G.half - w / 2 - G.gap;
    ruleAt('left', h.centre[0] - w / 2 - G.gap, ry, len); ruleAt('right', h.centre[0] + w / 2 + G.gap, ry, len);
    texts.push([str, h.face, ...h.centre, h.colour, 'center', hd.outline]);
  }
  const T = J.towns, says = Object.entries(L.says), shown = says.slice(0, T.fits), end = T.top + T.step * shown.length, D = J.rules.divider;
  ruleAt('left', D.x, end + D.dy, D.length); ruleAt('right', D.x, end + D.dy, D.length);
  // the deeds
  const Dd = J.deeds, lines = L.deeds.flatMap(d => wrap(d, Dd.face, Dd.wrap).map((l, n) => [l, n === 0])), first = 0;
  lines.slice(first, first + Dd.lines).forEach(([l, isFirst], n) => {
    const x = Dd.at[0] + Dd.text_dx, y = Dd.at[1] + n * Dd.step; if (isFirst) put(Dd.bullet.file, [x + Dd.bullet.dx, y + Dd.bullet.dy]); texts.push([l, Dd.face, x, y, Dd.colour]);
  });
  if (lines.length > first + Dd.lines) {
    put(J.pieces['Scroll Trough'].file, J.pieces['Scroll Trough'].at);
    const th = Dd.thumb, ty = Math.round(th.top + th.travel * first / lines.length), tl = Math.max(th.min, Math.round(th.travel * Dd.lines / lines.length)), p = pic(th.file);
    parts.push([nineV(p, tl + p.h - th.drawn, th.patch_margin.top, th.patch_margin.bottom), th.x, ty - th.shadow_top]);
    tops.push([pic(J.pieces.Fade.file), ...J.pieces.Fade.at]);
  }
  // the towns
  shown.forEach(([id, line], i) => {
    const t = TOWN[id], dy = T.step * i; put(T.files[t.name], [T.at[0], T.at[1] + dy]);
    texts.push([t.name, T.name.face, T.name.at[0], T.name.at[1] + dy, T.name.colour], [t.faction, T.faction.face, T.faction.right[0], T.faction.right[1] + dy, T.faction.colour, 'right']);
    para(texts, line, T.says.face, T.says.at[0], T.says.at[1] + dy, T.says.wrap, T.says.colour, T.says.step);
  });
  para(texts, L.unseen, T.unseen.face, T.unseen.x, end + T.unseen.dy, T.unseen.wrap, T.unseen.colour, T.unseen.step);
  // the middle
  put(J.landmark.files[TOWN[home].name], J.landmark.at); put(J.pieces['Button Wake'].file, J.pieces['Button Wake'].at);
  // the text
  sayC(X.title.text, X.title); sayC(L.name, X.name); sayC([L.race, L.background].join(X.kind.join), X.kind);
  L.rows.forEach(([l, v], i) => texts.push([l, X.rows.face, X.rows.label_at[0], X.rows.label_at[1] + i * X.rows.step, X.rows.label], [v, X.rows.face, X.rows.value_right[0], X.rows.value_right[1] + i * X.rows.step, X.rows.value, 'right']));
  L.end.forEach((l, i) => texts.push([l, X.end.face, X.end.centre[0], X.end.centre[1] + i * X.end.step, X.end.colour, 'center']));
  X.left_behind.lines.forEach((l, i) => sayC(l, X.left_behind, [X.left_behind.centre[0], X.left_behind.centre[1] + i * X.left_behind.step]));
  sayC(X.wake.text, X.wake); sayC(X.new_life.text, X.new_life);
  return draw(dim(world({ you: 'dead', at: [684, 652], facing: 'SE', race: L.kind }), J.veil.dark, J.veil.grey), parts, texts, tops);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, which = flag('--town', 'all'), out = flag('--out', 'game/client/art/made/ui/death'), t0 = Date.now();
const towns = which === 'all' ? Object.keys(LIVES) : [which], name = (base, town) => `scripts/art/out/${base}${town === 'dawndoor' ? '' : `-${town}`}.png`;
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}, size = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; size[n] = [img.w, img.h]; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/death_screen.json`, JSON.stringify(layout(at, size), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and death_screen.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/death_screen.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/death_screen.mjs --pieces`); process.exit(1); }
  for (const town of towns) {
    const t = Date.now(), A = check(out, town), B = screen(town); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
    for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
    save(A, name('ui-death-pieces', town), t);
    console.log(n ? `${town}: ${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : `${town}: same as the draft (no pixel off by more than 2).`);
  }
} else for (const town of towns) { const t = Date.now(); save(screen(town), name('ui-death', town), t); }
