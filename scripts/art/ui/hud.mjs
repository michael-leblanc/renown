// Draft of the HUD: what sits over the game while you play, in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// The layout Michael chose (2026-11-18: "C is the best"), called "corners":
//   top left      health and run bars behind a small round painted picture of your town's landmark;
//   top right     a small round map, the round buttons under it (Run, Character, Skills, Map), pack and coins;
//   bottom middle a short bar of slots: the weapon and shield in hand, the bandage;
//   top middle    who you clicked on; above the slots, the skill that just rose; bottom left, local speech.
// The picture:  --emblem door (the default)  Dawndoor's doorway at dawn (Michael: "let's go with #1 for now").
//               --emblem scar                Oldscar's cliff and its scar, for an orc or a goblin. Claude's idea: Michael has not seen it in the HUD.
// What it shows comes from decisions: health with exact numbers (D125), run energy (D228) and walk / run (D226), the weapon and shield in hand
// (D171), the bandage with its count and its 4 seconds (D167, D169), the waking protection's time left (D72, D90), a skill that just rose (D20),
// local speech (D150), who you clicked on with only what you know of them (D29), pack and coins (D123, D124), buttons for the screens.
// Nothing here is a piece for the game yet. Every number shown is made up. The window is 1152 x 648.
// Not here: the two layouts that lost (a "orbs", b "portrait and belt") and the top-left pictures not taken (your own character: "I would change
// for something else, more artsy"; an orb; a flame; none). Their script is kept in the Claude project, as the doc claude/hud-script.md.
// Usage, from the repo root (a few seconds):
//   node scripts/art/ui/hud.mjs [--emblem door|scar]
//       prototype/shots/ui-hud.png or ui-hud-scar.png (git-ignored). Over a made-up camp in the game's art: bought art (tileset, Creator),
//       never commit the pictures.
import { K, mask, layer, each, vnoise, metal, shadow, over } from './kit.mjs';
import { COL, BLOOD, AMBER, clamp, mix, LIT, room, done, plain, halo, disc, tri, plate, slot, item, button, bar, crest, rule, picture, roundFrame, dawnDoor, scarCliff, world, draw, wide, save } from './pieces.mjs';

const WHO = { door: { race: 'Human', background: 'Well-woken', kind: 'human' }, scar: { race: 'Orc', background: 'Brawler', kind: 'orc' } };
const STATE = { health: [32, 44], run: 55, bandages: 3, bandaging: .6, protected: '2:41', risen: ['Swords', 41], pack: '13 / 20', coins: '37' };
const SPEECH = [['Guard', 'Keep moving, stranger.'], ['You', 'What do people say here?'], ['Townswoman', 'Some say the stones were here first.']];
const TARGET = ['Guard', 'Human · name not known'];     // a name stays hidden until told (D29); no health shown: what you see of another's health is not decided
const BUTTONS = [['Run', 'R', true], ['Character', 'C'], ['Skills', 'K'], ['Map', 'M']];

/** A ring that fills clockwise from its top, up to v (0 to 1). Dark track, steel rims. */
function ring(cx, cy, r, wd, v, kind) {
  const A = room(cx - r, cy - r, 2 * r, 2 * r, 8), track = mask(A), fill = mask(A), rims = mask(A), turn = (dx, dy) => (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  disc(track, cx, cy, r, wd); disc(rims, cx, cy, r, 1.4); disc(rims, cx, cy, r - wd + 1.4, 1.4); if (v > 0) disc(fill, cx, cy, r - 1.4, wd - 2.8, 255, (dx, dy) => turn(dx, dy) <= 360 * v);
  const L = over(shadow(track, .8), plain(track, [10, 11, 12])); over(L, metal(fill, kind, LIT(cy - r))); over(L, metal(rims, 'steel', LIT(cy - r), .35)); return done(L);
}
/** The small map (D246): only what you have seen (D146), the rest dark. What it marks is not decided. */
function smallMap(parts, cx, cy, r) {
  const A = room(cx - r - 6, cy - r - 14, 2 * r + 12, 2 * r + 20, 10), back = mask(A), L = layer(A), ringM = mask(A), lip = mask(A), mark = mask(A); disc(back, cx, cy, r + 5);
  const path = (x, y) => Math.abs(y - (cy + 8 + Math.sin((x - cx) / 17) * 9)) < 1.3 || Math.abs(x - (cx - 14 + Math.sin((y - cy) / 13) * 6)) < 1.1 && y < cy + 10;
  each(A, (X, Y, i) => {
    const x = X / K, y = Y / K, d = Math.hypot(x - cx, y - cy) / r; if (d > 1.02) return;
    const seen = clamp((.86 - d * 1.05 + (vnoise(x / 13 + 9, y / 13) - .5) * 1.1) * 4), n = vnoise(x / 7, y / 7), fine = vnoise(x / 2, y / 2);
    let c = mix([40, 62, 34], [66, 96, 46], n); if (vnoise(x / 9 + 40, y / 9) > .68) c = mix(c, [28, 48, 28], .7);            // grass, woods
    if (path(x, y)) c = [150, 126, 86]; for (const [bx, by, bw, bh] of [[cx + 12, cy - 16, 12, 9], [cx + 28, cy - 6, 9, 9], [cx - 30, cy + 20, 11, 8]]) if (x > bx && x < bx + bw && y > by && y < by + bh) c = [92, 62, 40];
    c = mix([11, 13, 14].map(b => b + fine * 5), c, seen); const dim = 1 - .5 * d ** 3; for (let k = 0; k < 3; k++) L.c[i * 3 + k] = c[k] * dim; L.a[i] = 1;
  });
  disc(ringM, cx, cy, r + 5, 5.4); disc(lip, cx, cy, r + .6, 1.4); tri(ringM, [[cx - 5, cy - r - 3], [cx, cy - r - 12], [cx + 5, cy - r - 3]]);
  tri(mark, [[cx, cy - 6], [cx + 4, cy + 4], [cx, cy + 2], [cx - 4, cy + 4]]);
  const S = shadow(back, .85); over(S, L); over(S, plain(lip, [8, 6, 5])); over(S, shadow(ringM, .6)); over(S, metal(ringM, 'steel', LIT(cy - r), .35)); over(S, halo(mark, COL.dark, .9, 1.2)); over(S, plain(mark, COL.glow)); parts.push(done(S));
}
/** A square slot with an item in it. */
function held(parts, x, y, s, name, material) { parts.push(slot(x, y, s, s, material), [item(name, s - 6), Math.round(x) + 3, Math.round(y) + 3]); }
/** The bandage: its round slot (as on the character screen), its 4 seconds as a bronze ring round it, the count and the key. */
function bandage(parts, texts, cx, cy, d = 44) {
  parts.push(ring(cx, cy, d / 2 + 6, 5.5, STATE.bandaging, 'bronze'), slot(cx - d / 2, cy - d / 2, d, d, 'Cloth', true), [item('Bandage', d - 6), Math.round(cx - d / 2) + 3, Math.round(cy - d / 2) + 3]);
  texts.push([String(STATE.bandages), 'number', cx + 8, cy + 6, 'value', 'left', 2], ['B', 'small', cx - d / 2 - 2, cy - d / 2 - 4, 'hint', 'left', 2]);
}
function buttons(parts, texts, at, r = 17) { BUTTONS.forEach(([name, key, on], i) => { const [cx, cy] = at(i); parts.push(button(name, cx, cy, r, on)); texts.push([key, 'small', cx + r - 5, cy + r - 9, on ? 'glow' : 'hint', 'left', 2]); }); }
/** The waking protection: a small lit sign and the time left. */
function protection(parts, texts, x, y) { parts.push(button('Protected', x + 13, y + 13, 13, true)); texts.push([STATE.protected, 'number', x + 32, y + 5, 'glow', 'left', 2]); }
/** Who you clicked on (top middle), the skill that just rose (above the slots), local speech (bottom left). */
function common(parts, texts, toastY, [lx, ly]) {
  const tw = Math.max(wide(TARGET[0], 'title'), wide(TARGET[1], 'small')) + 56; parts.push(plate(576 - tw / 2, 12, tw, 46, { alpha: .94 }), crest(576, 58, .8));
  texts.push([TARGET[0], 'title', 576, 17, 'value', 'center'], [TARGET[1], 'small', 576, 38, 'hint', 'center']);
  const [skill, v] = STATE.risen, a = `${skill} rises to `, b = String(v), w = wide(a, 'mid') + wide(b, 'mid'), x = Math.round(576 - w / 2);
  parts.push(rule(x - 14, x - 74, toastY + 14), rule(x + Math.round(w) + 14, x + Math.round(w) + 74, toastY + 14)); texts.push([a, 'mid', x, toastY, 'label', 'left', 2], [b, 'mid', x + wide(a, 'mid'), toastY, 'value', 'left', 2]);
  parts.push(plate(lx, ly, 318, 104, { alpha: .6, thin: true, studs: false }));
  SPEECH.forEach(([who, said], i) => texts.push([`${who}:`, 'line', lx + 12, ly + 9 + i * 21, 'label', 'left', 1], [said, 'line', lx + 18 + wide(`${who}:`, 'line'), ly + 9 + i * 21, 'value', 'left', 1]));
  texts.push(['Enter to speak', 'small', lx + 12, ly + 80, 'hint']);
}

function hud(emblem) {
  const parts = [], texts = [], who = WHO[emblem], [hp, max] = STATE.health, px = 60, py = 60, r = 40, bx = 114, bw = 220;
  parts.push(plate(84, 26, 262, 68)); texts.push([who.race, 'title', bx + 2, 31, 'value'], [who.background, 'small', bx + bw, 36, 'hint', 'right']);
  parts.push(bar(bx, 53, bw, 17, hp / max, BLOOD), bar(bx, 74, bw, 10, STATE.run / 100, AMBER)); texts.push([`${hp} / ${max}`, 'small', bx + bw / 2, 55, 'value', 'center', 2]);
  picture(parts, px, py, r, emblem === 'scar' ? scarCliff(r) : dawnDoor(r)); roundFrame(parts, px, py, r);              // your town's landmark at the head of the bars
  protection(parts, texts, bx, 100);
  const y = 574, h = 58; parts.push(plate(484, y, 184, h), crest(576, y));
  held(parts, 496, y + 6, 46, 'Long Sword Iron', 'Iron'); held(parts, 546, y + 6, 46, 'Round Shield', 'Wood'); bandage(parts, texts, 632, y + h / 2);
  smallMap(parts, 1062, 80, 60); buttons(parts, texts, i => [1002 + i * 40, 172], 16);
  texts.push(['Pack', 'small', 988, 198, 'label', 'left', 2], [STATE.pack, 'small', 1018, 198, 'value', 'left', 2], ['Coins', 'small', 1076, 198, 'label', 'left', 2], [STATE.coins, 'small', 1110, 198, 'value', 'left', 2]);
  common(parts, texts, 508, [14, 530]);
  return draw(world({ race: who.kind }), parts, texts);
}
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, emblem = flag('--emblem', 'door'), t0 = Date.now();
save(hud(emblem), `prototype/shots/ui-hud${emblem === 'door' ? '' : `-${emblem}`}.png`, t0);
