// The HUD: what sits over the game while you play, in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// The layout Michael chose (2026-11-18: "C is the best"), called "corners" (D244 to D246):
//   top left      health and run bars behind a small round painted picture of your town's landmark;
//   top right     a small round map, the round buttons under it (Run, Character, Skills, Map), pack and coins;
//   bottom middle a short bar of slots: the weapon and shield in hand, the bandage;
//   top middle    who you clicked on; above the slots, the skill that just rose; bottom left, local speech.
// The picture:  --emblem door (the default)  Dawndoor's doorway at dawn (Michael: "let's go with #1 for now").
//               --emblem scar                Oldscar's cliff and its scar, for an orc or a goblin. Claude's idea: Michael has not seen it in the HUD.
// What it shows comes from decisions: health with exact numbers (D125), run energy (D228) and walk / run (D226), the weapon and shield in hand
// (D171), the bandage with its count and its 4 seconds (D167, D169), the waking protection's time left (D72, D90), a skill that just rose (D20),
// local speech (D150), who you clicked on with only what you know of them (D29), pack and coins (D123, D124), buttons for the screens.
// Every number shown is made up. The window is 1152 x 648.
// Not here: the two layouts that lost (a "orbs", b "portrait and belt") and the top-left pictures not taken (your own character: "I would change
// for something else, more artsy"; an orb; a flame; none). Their script is kept in the Claude project, as the doc claude/hud-script.md.
//
// The pieces, like the character screen's (#46), into game/client/art/made/ui/hud/ (--pieces):
//   Plate Bars, Plate Slots (with its crest), Plate Speech, Plate Target (a nine-patch: hud.json says its margins), Crest Target
//   Bar Health Under / Fill, Bar Run Under / Fill   the empty bar, and only the liquid of a full one: the game cuts the fill at the value
//   Ring Under / Ring Fill                           the bandage's 4 seconds round its slot: the fill is cut clockwise from the top
//   Emblem Dawndoor, Emblem Oldscar                  your town's landmark, painted, in its bronze frame (D245)
//   Map Back, Map Ring, Map You                      under the map, its steel ring, the mark for you; the land in it is drawn by the game (D146, D246)
//   Button <Run|Character|Skills|Map> <On|Off>, Protected
//   Slot Square <material> (46 x 46), Slot Round <Cloth|Empty> (44)   a slot tinted by its item's material, the character screen's way
//   Rule Left, Rule Right                            either side of "Swords rises to 41"
//   hud.json                                         where every piece, slot, picture and line of text goes. Godot reads the places from it.
// Text is not a piece: Godot draws it in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/hud.mjs [--emblem door|scar]          the draft, prototype/shots/ui-hud.png or ui-hud-scar.png (a few seconds)
//   node scripts/art/ui/hud.mjs --pieces [--out dir]          the pieces and hud.json, into game/client/art/made/ui/hud/ (about 10 s)
//   node scripts/art/ui/hud.mjs --check [--out dir] [--emblem door|scar]
//       puts the HUD together from the pieces the way hud.json says, into prototype/shots/ui-hud-pieces.png, and counts the pixels that
//       differ from the draft. Write the pieces first.
// Every picture in prototype/shots/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { K, mask, layer, each, vnoise, metal, shadow, over } from './kit.mjs';
import { COL, BLOOD, AMBER, MATERIAL, FACE, clamp, mix, LIT, room, done, plain, halo, disc, tri, plate, slot, item, button, bar, crest, rule, picture, roundFrame, dawnDoor, scarCliff, world, draw, wide, save, paste, blank, open, bake, cut } from './pieces.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

const WHO = { door: { race: 'Human', background: 'Well-woken', kind: 'human' }, scar: { race: 'Orc', background: 'Brawler', kind: 'orc' } };
const STATE = { health: [32, 44], run: 55, bandages: 3, bandaging: .6, protected: '2:41', risen: ['Swords', 41], pack: '13 / 20', coins: '37' };
const SPEECH = [['Guard', 'Keep moving, stranger.'], ['You', 'What do people say here?'], ['Townswoman', 'Some say the stones were here first.']];
const TARGET = ['Guard', 'Human · name not known'];     // a name stays hidden until told (D29); no health shown: what you see of another's health is not decided
const BUTTONS = [['Run', 'R', true], ['Character', 'C'], ['Skills', 'K'], ['Map', 'M']];
const EMBLEMS = { door: ['Dawndoor', dawnDoor], scar: ['Oldscar', scarCliff] };

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const AT = {
  emblem: [60, 60, 40], plate: [84, 26, 262, 68], bars: [114, 220], health: [53, 17], run: [74, 10], protection: [114, 100],
  slots: [484, 574, 184, 58], held: 46, weapon: [496, 580], shield: [546, 580], bandage: [632, 603, 44],
  map: [1062, 80, 60], button: i => [1002 + i * 40, 172], buttonR: 16, packY: 198,
  target: [576, 12, 46], targetPad: 56, toastY: 508, speech: [14, 530, 318, 104],
};
const NINE = 400, NINE_MARGIN = 20;                     // the target's plate is drawn this wide; the game stretches its middle, keeping this much at each end

/** A ring that fills clockwise from its top, up to v (0 to 1). Dark track, steel rims. `part` 'under' (v is 0) or 'fill' (only the fill, v is 1). */
function ring(cx, cy, r, wd, v, kind, part = 'all') {
  if (part !== 'all') v = part === 'fill' ? 1 : 0;
  const A = room(cx - r, cy - r, 2 * r, 2 * r, 8), track = mask(A), fill = mask(A), rims = mask(A), turn = (dx, dy) => (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  disc(track, cx, cy, r, wd); disc(rims, cx, cy, r, 1.4); disc(rims, cx, cy, r - wd + 1.4, 1.4); if (v > 0) disc(fill, cx, cy, r - 1.4, wd - 2.8, 255, (dx, dy) => turn(dx, dy) <= 360 * v);
  if (part === 'fill') return done(metal(fill, kind, LIT(cy - r)));
  const L = over(shadow(track, .8), plain(track, [10, 11, 12])); over(L, metal(fill, kind, LIT(cy - r))); over(L, metal(rims, 'steel', LIT(cy - r), .35)); return done(L);
}
/** The small map (D246): only what you have seen (D146), the rest dark. What it marks is not decided; the land here is made up.
 *  `part`: 'all', or one layer of it: 'back' (its shadow), 'land' (the made-up land: the game draws its own), 'ring' (the steel ring and lip), 'you' (the mark). */
function smallMap(parts, cx, cy, r, part = 'all') {
  const A = room(cx - r - 6, cy - r - 14, 2 * r + 12, 2 * r + 20, 10), back = mask(A), L = layer(A), ringM = mask(A), lip = mask(A), mark = mask(A); disc(back, cx, cy, r + 5);
  const path = (x, y) => Math.abs(y - (cy + 8 + Math.sin((x - cx) / 17) * 9)) < 1.3 || Math.abs(x - (cx - 14 + Math.sin((y - cy) / 13) * 6)) < 1.1 && y < cy + 10;
  if (part === 'all' || part === 'land') each(A, (X, Y, i) => {
    const x = X / K, y = Y / K, d = Math.hypot(x - cx, y - cy) / r; if (d > 1.02) return;
    const seen = clamp((.86 - d * 1.05 + (vnoise(x / 13 + 9, y / 13) - .5) * 1.1) * 4), n = vnoise(x / 7, y / 7), fine = vnoise(x / 2, y / 2);
    let c = mix([40, 62, 34], [66, 96, 46], n); if (vnoise(x / 9 + 40, y / 9) > .68) c = mix(c, [28, 48, 28], .7);            // grass, woods
    if (path(x, y)) c = [150, 126, 86]; for (const [bx, by, bw, bh] of [[cx + 12, cy - 16, 12, 9], [cx + 28, cy - 6, 9, 9], [cx - 30, cy + 20, 11, 8]]) if (x > bx && x < bx + bw && y > by && y < by + bh) c = [92, 62, 40];
    c = mix([11, 13, 14].map(b => b + fine * 5), c, seen); const dim = 1 - .5 * d ** 3; for (let k = 0; k < 3; k++) L.c[i * 3 + k] = c[k] * dim; L.a[i] = 1;
  });
  disc(ringM, cx, cy, r + 5, 5.4); disc(lip, cx, cy, r + .6, 1.4); tri(ringM, [[cx - 5, cy - r - 3], [cx, cy - r - 12], [cx + 5, cy - r - 3]]);
  tri(mark, [[cx, cy - 6], [cx + 4, cy + 4], [cx, cy + 2], [cx - 4, cy + 4]]);
  const ringL = () => { const T = plain(lip, [8, 6, 5]); over(T, shadow(ringM, .6)); over(T, metal(ringM, 'steel', LIT(cy - r), .35)); return T; }, youL = () => over(halo(mark, COL.dark, .9, 1.2), plain(mark, COL.glow));
  const S = { back: () => shadow(back, .85), land: () => L, ring: ringL, you: youL }[part]?.() ?? over(over(over(shadow(back, .85), L), ringL()), youL());
  parts.push(done(S));
}
/** A square slot with an item in it. */
function held(parts, x, y, s, name, material) { parts.push(slot(x, y, s, s, material), [item(name, s - 6), Math.round(x) + 3, Math.round(y) + 3]); }
/** The bandage: its round slot (as on the character screen), its 4 seconds as a bronze ring round it, the count and the key. */
function bandage(parts, texts, cx, cy, d) {
  parts.push(ring(cx, cy, d / 2 + 6, 5.5, STATE.bandaging, 'bronze'), slot(cx - d / 2, cy - d / 2, d, d, 'Cloth', true), [item('Bandage', d - 6), Math.round(cx - d / 2) + 3, Math.round(cy - d / 2) + 3]);
  texts.push([String(STATE.bandages), 'number', cx + 8, cy + 6, 'value', 'left', 2], ['B', 'small', cx - d / 2 - 2, cy - d / 2 - 4, 'hint', 'left', 2]);
}
function buttons(parts, texts, at, r) { BUTTONS.forEach(([name, key, on], i) => { const [cx, cy] = at(i); parts.push(button(name, cx, cy, r, on)); texts.push([key, 'small', cx + r - 5, cy + r - 9, on ? 'glow' : 'hint', 'left', 2]); }); }
/** The waking protection: a small lit sign and the time left. */
function protection(parts, texts, x, y) { parts.push(button('Protected', x + 13, y + 13, 13, true)); texts.push([STATE.protected, 'number', x + 32, y + 5, 'glow', 'left', 2]); }
const targetWidth = () => Math.max(wide(TARGET[0], 'title'), wide(TARGET[1], 'small')) + AT.targetPad;
/** The skill that just rose: where its text starts, and how wide it is. */
const toast = () => { const [skill, v] = STATE.risen, a = `${skill} rises to `, b = String(v), w = wide(a, 'mid') + wide(b, 'mid'); return { a, b, w, x: Math.round(576 - w / 2) }; };
/** Who you clicked on (top middle), the skill that just rose (above the slots), local speech (bottom left). */
function common(parts, texts) {
  const [tx, ty, th] = AT.target, tw = targetWidth(); parts.push(plate(tx - tw / 2, ty, tw, th, { alpha: .94 }), crest(tx, ty + th, .8));
  texts.push([TARGET[0], 'title', tx, ty + 5, 'value', 'center'], [TARGET[1], 'small', tx, ty + 26, 'hint', 'center']);
  const { a, b, w, x } = toast(), y = AT.toastY;
  parts.push(rule(x - 14, x - 74, y + 14), rule(x + Math.round(w) + 14, x + Math.round(w) + 74, y + 14)); texts.push([a, 'mid', x, y, 'label', 'left', 2], [b, 'mid', x + wide(a, 'mid'), y, 'value', 'left', 2]);
  const [lx, ly, lw, lh] = AT.speech; parts.push(plate(lx, ly, lw, lh, { alpha: .6, thin: true, studs: false }));
  SPEECH.forEach(([who, said], i) => texts.push([`${who}:`, 'line', lx + 12, ly + 9 + i * 21, 'label', 'left', 1], [said, 'line', lx + 18 + wide(`${who}:`, 'line'), ly + 9 + i * 21, 'value', 'left', 1]));
  texts.push(['Enter to speak', 'small', lx + 12, ly + 80, 'hint']);
}
/** The texts that sit in the top corners and on the slots: the same for the draft and the check. */
function cornerTexts(texts, who) {
  const [bx, bw] = AT.bars, [hp, max] = STATE.health, py = AT.packY;
  texts.push([who.race, 'title', bx + 2, 31, 'value'], [who.background, 'small', bx + bw, 36, 'hint', 'right'], [`${hp} / ${max}`, 'small', bx + bw / 2, AT.health[0] + 2, 'value', 'center', 2]);
  texts.push(['Pack', 'small', 988, py, 'label', 'left', 2], [STATE.pack, 'small', 1018, py, 'value', 'left', 2], ['Coins', 'small', 1076, py, 'label', 'left', 2], [STATE.coins, 'small', 1110, py, 'value', 'left', 2]);
}

function hud(emblem) {
  const parts = [], texts = [], who = WHO[emblem], [hp, max] = STATE.health, [px, py, r] = AT.emblem, [bx, bw] = AT.bars;
  parts.push(plate(...AT.plate)); cornerTexts(texts, who);
  parts.push(bar(bx, AT.health[0], bw, AT.health[1], hp / max, BLOOD), bar(bx, AT.run[0], bw, AT.run[1], STATE.run / 100, AMBER));
  picture(parts, px, py, r, EMBLEMS[emblem][1](r)); roundFrame(parts, px, py, r);              // your town's landmark at the head of the bars
  protection(parts, texts, ...AT.protection);
  const [sx, sy, sw, sh] = AT.slots, s = AT.held, [cx, cy, d] = AT.bandage; parts.push(plate(sx, sy, sw, sh), crest(576, sy));
  held(parts, ...AT.weapon, s, 'Long Sword Iron', 'Iron'); held(parts, ...AT.shield, s, 'Round Shield', 'Wood'); bandage(parts, texts, cx, cy, d);
  smallMap(parts, ...AT.map); buttons(parts, texts, AT.button, AT.buttonR);
  common(parts, texts);
  return draw(world({ race: who.kind }), parts, texts);
}

/* ---------- the pieces ---------- */
const one = f => () => { const parts = []; f(parts); return parts; };
const SQUARE = Object.keys(MATERIAL), ROUND = ['Cloth', 'Empty'];
const PIECES = {
  'Plate Bars': () => [plate(...AT.plate)],
  'Bar Health Under': () => [bar(AT.bars[0], AT.health[0], AT.bars[1], AT.health[1], 0, BLOOD, 'under')],
  'Bar Health Fill': () => [bar(AT.bars[0], AT.health[0], AT.bars[1], AT.health[1], 1, BLOOD, 'fill')],
  'Bar Run Under': () => [bar(AT.bars[0], AT.run[0], AT.bars[1], AT.run[1], 0, AMBER, 'under')],
  'Bar Run Fill': () => [bar(AT.bars[0], AT.run[0], AT.bars[1], AT.run[1], 1, AMBER, 'fill')],
  ...Object.fromEntries(Object.values(EMBLEMS).map(([town, paint]) => [`Emblem ${town}`, one(p => { const [x, y, r] = AT.emblem; picture(p, x, y, r, paint(r)); roundFrame(p, x, y, r); })])),
  Protected: () => [button('Protected', AT.protection[0] + 13, AT.protection[1] + 13, 13, true)],
  'Plate Slots': () => [plate(...AT.slots), crest(576, AT.slots[1])],
  'Ring Under': () => [ring(AT.bandage[0], AT.bandage[1], AT.bandage[2] / 2 + 6, 5.5, 0, 'bronze', 'under')],
  'Ring Fill': () => [ring(AT.bandage[0], AT.bandage[1], AT.bandage[2] / 2 + 6, 5.5, 1, 'bronze', 'fill')],
  'Map Back': one(p => smallMap(p, ...AT.map, 'back')), 'Map Ring': one(p => smallMap(p, ...AT.map, 'ring')), 'Map You': one(p => smallMap(p, ...AT.map, 'you')),
  ...Object.fromEntries(BUTTONS.flatMap(([name], i) => [true, false].map(on => [`Button ${name} ${on ? 'On' : 'Off'}`, () => [button(name, ...AT.button(i), AT.buttonR, on)]]))),
  'Plate Target': () => [plate(AT.target[0] - NINE / 2, AT.target[1], NINE, AT.target[2], { alpha: .94 })],
  'Crest Target': () => [crest(AT.target[0], AT.target[1] + AT.target[2], .8)],
  'Rule Left': () => [rule(500 - 14, 500 - 74, AT.toastY + 14)], 'Rule Right': () => [rule(600 + 14, 600 + 74, AT.toastY + 14)],
  'Plate Speech': () => [plate(...AT.speech, { alpha: .6, thin: true, studs: false })],
  ...Object.fromEntries(SQUARE.map(m => [`Slot Square ${m}`, () => [slot(0, 0, AT.held, AT.held, m)]])),
  ...Object.fromEntries(ROUND.map(m => [`Slot Round ${m}`, () => [slot(0, 0, AT.bandage[2], AT.bandage[2], m, true)]])),
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] });
  const [bx, bw] = AT.bars, [cx, cy, d] = AT.bandage, [tx, ty, th] = AT.target, [lx, ly] = AT.speech;
  return {
    _note: 'Written by scripts/art/ui/hud.mjs --pieces: do not edit by hand. The HUD "corners" (D244 to D246) in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. "group" is the corner a piece belongs to, for when the window is another size. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting.',
    size: [1152, 648],
    groups: { top_left: 'the bars, the emblem, the protection', top_middle: 'who you clicked on', top_right: 'the map, the buttons, pack and coins', bottom_middle: 'the slots and the skill that rose', bottom_left: 'local speech' },
    order: ['Plate Bars', 'bars', 'emblem', 'Protected', 'Plate Slots', 'bandage ring', 'slots', 'pictures', 'Map Back', 'map land', 'Map Ring', 'Map You', 'buttons', 'Plate Target', 'Crest Target', 'rules', 'Plate Speech', 'text'],
    pieces: Object.fromEntries(['Plate Bars', 'Protected', 'Plate Slots', 'Map Back', 'Map Ring', 'Map You', 'Crest Target', 'Plate Speech'].map(n => [n, { ...P(n), group: { 'Plate Bars': 'top_left', Protected: 'top_left', 'Plate Slots': 'bottom_middle', 'Crest Target': 'top_middle', 'Plate Speech': 'bottom_left' }[n] ?? 'top_right' }])),
    bars: {
      _note: 'The game draws "under", then "fill" cut at the value: the fill reaches x = track x + inset + (track width - 2 * inset) * value. The fill holds only the liquid, so nothing doubles. "track" is the bar itself, x, y, width, height.',
      inset: 2,
      health: { under: P('Bar Health Under'), fill: P('Bar Health Fill'), track: [bx, AT.health[0], bw, AT.health[1]], group: 'top_left' }, run: { under: P('Bar Run Under'), fill: P('Bar Run Fill'), track: [bx, AT.run[0], bw, AT.run[1]], group: 'top_left' },
    },
    emblem: { _note: 'Your town\'s landmark (D245): Dawndoor for the human faction, Oldscar for orcs and goblins (D12). Oldscar\'s is Claude\'s idea: Michael has not seen it in the HUD.', at: at['Emblem Dawndoor'], files: { Dawndoor: 'Emblem Dawndoor.png', Oldscar: 'Emblem Oldscar.png' }, group: 'top_left' },
    protection: { _note: 'Shown only while the waking protection lasts (D72, D90).', piece: 'Protected', group: 'top_left' },
    bandage_ring: { _note: 'The bandage\'s 4 seconds (D169): "under", then "fill" cut clockwise from the top, round the bandage slot.', under: P('Ring Under'), fill: P('Ring Fill'), centre: [cx, cy], group: 'bottom_middle' },
    slots: {
      file: 'Slot <kind> <material>.png', kinds: { Square: [AT.held, AT.held], Round: [d, d] }, materials: { Square: SQUARE, Round: ROUND }, group: 'bottom_middle',
      main_hand: { kind: 'Square', at: AT.weapon }, off_hand: { kind: 'Square', at: AT.shield }, bandage: { kind: 'Round', at: [cx - d / 2, cy - d / 2] },
      picture: { _note: 'An item\'s pack picture (D237): the part "from" of the 256 x 256 picture, drawn "px" wide with its top left "inset" in from the slot\'s.', from: [103, 103, 50, 50], px: { Square: AT.held - 6, Round: d - 6 }, inset: 3 },
    },
    map: { _note: 'The land is drawn by the game: only what you have seen (D146), the rest "unseen", darker towards the edge (1 - 0.5 d^3, d from 0 in the middle to 1 at the edge). What it marks is not decided. "You" points up.', centre: AT.map.slice(0, 2), radius: AT.map[2], unseen: hex([11, 13, 14]), group: 'top_right' },
    buttons: BUTTONS.map(([name, key], i) => ({ name, key, centre: AT.button(i), on: P(`Button ${name} On`), off: P(`Button ${name} Off`), group: 'top_right' })),
    target: {
      _note: 'Who you clicked on: a nine-patch (NinePatchRect), its middle stretched to the width "pad" + the wider of its two lines, centred on centre_x. Its plate is "drawn" px wide, plus its shadow ("shadow_left" of it at the left); the margins count the shadow. Put it at x = centre_x - width / 2 - shadow_left.',
      plate: { file: 'Plate Target.png', top: at['Plate Target'][1], centre_x: tx, patch_margin: { left: at.nineL + NINE_MARGIN, right: at.nineR + NINE_MARGIN, top: 0, bottom: 0 }, pad: AT.targetPad, drawn: NINE, shadow_left: at.nineL },
      crest: P('Crest Target'), group: 'top_middle',
    },
    toast: { _note: 'The skill that just rose (D20): label then value on one line centred on centre_x; a rule each side, its piece\'s left this far from the text\'s left (Rule Left) or right (Rule Right), and this far down from the text\'s top.', centre_x: 576, top: AT.toastY, rule_left: { file: 'Rule Left.png', dx: at['Rule Left'][0] - 500, dy: at['Rule Left'][1] - AT.toastY }, rule_right: { file: 'Rule Right.png', dx: at['Rule Right'][0] - 600, dy: at['Rule Right'][1] - AT.toastY }, group: 'bottom_middle' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['title', 'mid', 'number', 'line', 'small'].map(k => [k, face(k)])),
      race: { face: 'title', at: [bx + 2, 31], colour: 'value' }, background: { face: 'small', right: [bx + bw, 36], colour: 'hint' },
      health: { face: 'small', centre: [bx + bw / 2, AT.health[0] + 2], colour: 'value', outline: 2, _note: '"32 / 44" (D125)' },
      protection: { face: 'number', at: [AT.protection[0] + 32, AT.protection[1] + 5], colour: 'glow', outline: 2, _note: 'time left, "2:41"' },
      bandages: { face: 'number', at: [cx + 8, cy + 6], colour: 'value', outline: 2 }, bandage_key: { face: 'small', at: [cx - d / 2 - 2, cy - d / 2 - 4], colour: 'hint', outline: 2, text: 'B' },
      button_key: { face: 'small', from_centre: [AT.buttonR - 5, AT.buttonR - 9], colour: { on: 'glow', off: 'hint' }, outline: 2 },
      pack: { face: 'small', label_at: [988, AT.packY], value_at: [1018, AT.packY], outline: 2 }, coins: { face: 'small', label_at: [1076, AT.packY], value_at: [1110, AT.packY], outline: 2 },
      target: { name: { face: 'title', centre: [tx, ty + 5], colour: 'value' }, detail: { face: 'small', centre: [tx, ty + 26], colour: 'hint' } },
      toast: { face: 'mid', label: 'label', value: 'value', outline: 2 },
      speech: { face: 'line', at: [lx + 12, ly + 9], step: 21, lines: SPEECH.length, gap: 6, who: 'label', said: 'value', outline: 1, hint: { face: 'small', at: [lx + 12, ly + 80], colour: 'hint', text: 'Enter to speak' } },
    },
  };
}

/* ---------- the check: the HUD from the pieces ---------- */
/** A nine-patch stretched (or squeezed) across to width w: `l` and `r` pixels kept at the ends, the middle resampled. */
function nine(p, w, l, r) {
  const o = blank(w, p.h), mid = p.w - l - r, to = w - l - r;
  for (let j = 0; j < p.h; j++) for (let i = 0; i < w; i++) { const sx = i < l ? i : i >= w - r ? i - w + p.w : l + Math.min(mid - 1, Math.floor((i - l + .5) * mid / to)); p.data.copy(o.data, (j * w + i) * 4, (j * p.w + sx) * 4, (j * p.w + sx) * 4 + 4); }
  return o;
}
function check(dir, emblem) {
  const J = JSON.parse(readFileSync(`${dir}/hud.json`, 'utf8')), pic = f => open(`${dir}/${f}`), who = WHO[emblem], parts = [], texts = [], put = (f, at) => parts.push([pic(f), ...at]);
  put(J.pieces['Plate Bars'].file, J.pieces['Plate Bars'].at);
  for (const [k, v] of [['health', STATE.health[0] / STATE.health[1]], ['run', STATE.run / 100]]) {      // the fill cut at the value, the way a TextureProgressBar does it
    const B = J.bars[k], [bx, bw] = AT.bars, end = bx + 2 + (bw - 4) * v; put(B.under.file, B.under.at); parts.push([cut(pic(B.fill.file), x => x + B.fill.at[0] < end), ...B.fill.at]);
  }
  put(J.emblem.files[EMBLEMS[emblem][0]], J.emblem.at); put('Protected.png', J.pieces.Protected.at); put('Plate Slots.png', J.pieces['Plate Slots'].at);
  const R0 = J.bandage_ring, [rcx, rcy] = R0.centre; put(R0.under.file, R0.under.at);
  parts.push([cut(pic(R0.fill.file), (x, y) => (Math.atan2(x + R0.fill.at[0] + .5 - rcx, -(y + R0.fill.at[1] + .5 - rcy)) * 180 / Math.PI + 360) % 360 <= 360 * STATE.bandaging), ...R0.fill.at]);
  const S = J.slots, pp = S.picture;
  for (const [name, holds] of [['main_hand', ['Long Sword Iron', 'Iron']], ['off_hand', ['Round Shield', 'Wood']], ['bandage', ['Bandage', 'Cloth']]]) {
    const s = S[name]; put(`Slot ${s.kind} ${holds[1]}.png`, s.at); parts.push([item(holds[0], pp.px[s.kind]), s.at[0] + pp.inset, s.at[1] + pp.inset]);
  }
  put('Map Back.png', J.pieces['Map Back'].at); smallMap(parts, ...AT.map, 'land'); put('Map Ring.png', J.pieces['Map Ring'].at); put('Map You.png', J.pieces['Map You'].at);
  BUTTONS.forEach(([, , on], i) => { const b = J.buttons[i]; put((on ? b.on : b.off).file, (on ? b.on : b.off).at); });
  const T = J.target, tw = targetWidth(), P0 = T.plate, M = P0.patch_margin, full = pic(P0.file); parts.push([nine(full, Math.round(tw) + full.w - P0.drawn, M.left, M.right), Math.round(P0.centre_x - tw / 2) - P0.shadow_left, P0.top]); put(T.crest.file, T.crest.at);
  const { a, b, w, x } = toast(), y = J.toast.top; put('Rule Left.png', [x + J.toast.rule_left.dx, y + J.toast.rule_left.dy]); put('Rule Right.png', [x + Math.round(w) + J.toast.rule_right.dx, y + J.toast.rule_right.dy]);
  texts.push([a, 'mid', x, y, 'label', 'left', 2], [b, 'mid', x + wide(a, 'mid'), y, 'value', 'left', 2]);
  put('Plate Speech.png', J.pieces['Plate Speech'].at);
  // The text, from hud.json's places
  const X = J.text; cornerTexts(texts, who);
  texts.push([STATE.protected, X.protection.face, ...X.protection.at, X.protection.colour, 'left', 2], [String(STATE.bandages), X.bandages.face, ...X.bandages.at, 'value', 'left', 2], ['B', X.bandage_key.face, ...X.bandage_key.at, 'hint', 'left', 2]);
  BUTTONS.forEach(([, key, on], i) => texts.push([key, X.button_key.face, J.buttons[i].centre[0] + X.button_key.from_centre[0], J.buttons[i].centre[1] + X.button_key.from_centre[1], on ? 'glow' : 'hint', 'left', 2]));
  texts.push([TARGET[0], X.target.name.face, ...X.target.name.centre, 'value', 'center'], [TARGET[1], X.target.detail.face, ...X.target.detail.centre, 'hint', 'center']);
  const L = X.speech; SPEECH.forEach(([w2, said], i) => texts.push([`${w2}:`, L.face, L.at[0], L.at[1] + i * L.step, 'label', 'left', 1], [said, L.face, L.at[0] + L.gap + wide(`${w2}:`, L.face), L.at[1] + i * L.step, 'value', 'left', 1]));
  texts.push([L.hint.text, L.hint.face, ...L.hint.at, 'hint']);
  return draw(world({ race: who.kind }), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, emblem = flag('--emblem', 'door'), out = flag('--out', 'game/client/art/made/ui/hud'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  at.nineL = AT.target[0] - NINE / 2 - at['Plate Target'][0]; at.nineR = open(`${out}/Plate Target.png`).w - NINE - at.nineL;   // the shadow at each end
  writeFileSync(`${out}/hud.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and hud.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/hud.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/hud.mjs --pieces`); process.exit(1); }
  const A = check(out, emblem), B = hud(emblem); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, `prototype/shots/ui-hud-pieces${emblem === 'door' ? '' : `-${emblem}`}.png`, t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(hud(emblem), `prototype/shots/ui-hud${emblem === 'door' ? '' : `-${emblem}`}.png`, t0);
