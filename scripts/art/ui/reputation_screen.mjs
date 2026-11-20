// The Reputation screen (D7, D8, D22, D126, D249) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// Every word, number and tale shown is made up. The window is 1152 x 648; the screen is 880 x 592.
//   Top:    one card per town you could be known in, under its painted landmark (the HUD's door at dawn; Oldscar's cliff and scar, D107, D234).
//           Standing with its faction (D7, D9), Morality and Fame (D8; Mercy waits, D22), each a scale with a bronze diamond where you were told you stand.
//           It holds only what you were told there, by whom and when (D126). A town that told you nothing shows empty scales.
//   Bottom: the tales told of you that you have heard (D194), with where and when you heard each.
// It starts blank (D126) and fills as you ask in a town: "Tell me more about this person..." (D127).
// New, not decided: the words for each level (Welcome, Decent, Little known), Fame as a bar that only fills (D8 says it only grows),
// the signs (a shield, a pair of scales, a crown), Oldscar's picture. Not shown: standing with people in general (D7), and Mercy.
//
// The pieces, like the death screen's (#52) and the loot window's (#54), into game/client/art/made/ui/reputation/ (--pieces):
//   Frame                                          the screen's slate frame
//   Rule                                           a long steel rule with its diamond at the left end: the game cuts it to the length it needs
//                                                  (after the title, after "Tales told of you")
//   Card Known, Card Unknown                       a town's lit stage, and the dim one of a town that told you nothing
//   Town <name>, Town <name> Unknown               a town's landmark in its bronze frame, and greyed in a steel one (each drawn on the draft's card for it)
//   Sign Standing, Sign Morality, Sign Fame        the round sign before each row
//   Scale, Scale Mark                              Standing's and Morality's scale, and the bronze diamond the game puts where you stand
//   Bar Fame Under, Bar Fame Fill                  Fame's empty bar, and only the liquid of a full one: the game cuts the fill at the value
//   Tales, Bullet                                  the tales' lit stage, and the diamond before a tale
//   Button Close
//   reputation.json                                where every piece and line of text goes. Godot reads the places from it.
// Not a piece: the world behind, dimmed and greyed (the json's "veil": the game does it with the death screen's shader). Text is drawn by Godot
// in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/reputation_screen.mjs                          the draft, scripts/art/out/ui-reputation.png (about 8 s)
//   node scripts/art/ui/reputation_screen.mjs --pieces [--out dir]     the pieces and reputation.json, into game/client/art/made/ui/reputation/ (a few seconds)
//   node scripts/art/ui/reputation_screen.mjs --check [--out dir]
//       puts the screen together from the pieces the way the json says, into scripts/art/out/ui-reputation-pieces.png, and counts the pixels
//       that differ from the draft. Write the pieces first.
// Every picture in scripts/art/out/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, AMBER, frame, stage, button, scale, scaleMark, bar, diamond, rule, picture, roundFrame, dawnDoor, scarCliff, world, dim, draw, wide, save, open, bake, cut } from './pieces.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

const TOWNS = [
  { name: 'Dawndoor', faction: 'The Keeping', paint: dawnDoor, told: 'Told by a guard, 2 days ago', rows: [['Standing', 'Welcome', .72], ['Morality', 'Decent', .63], ['Fame', 'Little known', .18]] },
  { name: 'Oldscar', faction: 'The Tally', paint: scarCliff, told: 'Nobody there has told you. They are at war with your people.', rows: [['Standing'], ['Morality'], ['Fame']] },
];
const ENDS = { Standing: ['Enemy', 'Friend'], Morality: ['Evil', 'Good'], Fame: ['Unknown', 'Legendary'] };
const TALES = [['You killed two orcs on the west road.', 'Dawndoor  ·  heard 2 days ago'], ['You bandaged a hurt man outside the gate.', 'Dawndoor  ·  heard 2 days ago']];
const ROWS = ['Standing', 'Morality', 'Fame'], UNKNOWN = 'Not known';
const TITLE = 'Reputation', HINT = 'Only what you have been told', TALES_TITLE = 'Tales told of you', ASK = 'Ask in a town to hear more:  "Tell me more about this person..."';

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const X = 136, Y = 28, SW = 880, SH = 592;                                 // the screen
const CARD = [X + 30, Y + 76, 400, 254], CARD_STEP = 420;                  // the first town's card, and from one to the next
const PIC = [56, 56, 38];                                                  // the landmark's middle from the card's corner, its radius
const ROW = [118, 38, 32, 8, 13, 54, -8, 8];                               // rows: first y and step from the card's top; the sign's middle (x, dy) and radius; label and word x, dy
const SCALE = [180, 4, 196], ENDS_DY = 14;                                 // a scale: x from the card's corner, dy from the row, width; the ends' text dy
const BAR = [176, -1, 204, 11];                                            // Fame's bar: x, dy, width, height
const TY = Y + 350, TALE = [54, 30, 54, 8, 70, -2, 2];                     // the tales' heading y; the list: first dy, step, bullet's middle x from the screen and dy, text x and dy, where dy
const TALES_STAGE = [X + 30, TY + 34, SW - 60, 164], CLOSE = [X + SW - 6, Y + 6, 15];
const cardAt = n => [CARD[0] + n * CARD_STEP, CARD[1]];

function screen() {
  const S = dim(world({ you: 'plain' }), .45, .5), parts = [], texts = [], x = X, y = Y, w = SW, h = SH;
  parts.push(frame(x, y, w, h));
  texts.push([TITLE, 'big', x + 34, y + 24, 'value'], [HINT, 'line', x + w - 34, y + 38, 'hint', 'right']);
  parts.push(rule(x + 34 + wide(TITLE, 'big') + 16, x + w - 34 - wide(HINT, 'line') - 14, y + 46));
  TOWNS.forEach((t, n) => {
    const [cx, cy] = cardAt(n), [, , cw, ch] = CARD, known = t.rows[0].length > 1;
    parts.push(stage(cx, cy, cw, ch, cx + 60, cy + 60, 300, 260, known ? 1 : .35));
    picture(parts, cx + PIC[0], cy + PIC[1], PIC[2], t.paint(PIC[2]), known ? 0 : .8); roundFrame(parts, cx + PIC[0], cy + PIC[1], PIC[2], known ? 'bronze' : 'steel');
    texts.push([t.name, 'mid', cx + 112, cy + 26, known ? 'value' : 'hint'], [t.faction, 'line', cx + 112, cy + 52, known ? 'label' : 'dim']);
    t.rows.forEach(([what, word, v], i) => {
      const ry = cy + ROW[0] + i * ROW[1], sx = cx + SCALE[0], sw = SCALE[2];
      parts.push(button(what, cx + ROW[2], ry + ROW[3], ROW[4])); texts.push([what, 'line', cx + ROW[5], ry + ROW[6], known ? 'label' : 'dim'], [word ?? UNKNOWN, 'line', cx + ROW[5], ry + ROW[7], known ? 'value' : 'dim']);
      if (what === 'Fame') parts.push(bar(cx + BAR[0], ry + BAR[1], BAR[2], BAR[3], v ?? 0, AMBER)); else parts.push(scale(sx, ry + SCALE[1], sw, v ?? null));
      texts.push([ENDS[what][0], 'small', sx, ry + ENDS_DY, 'dim'], [ENDS[what][1], 'small', sx + sw, ry + ENDS_DY, 'dim', 'right']);
    });
    texts.push([t.told, 'small', cx + 20, cy + ch - 22, known ? 'hint' : 'dim']);
  });
  const ty = TY; texts.push([TALES_TITLE, 'mid', x + 34, ty, 'value']); parts.push(rule(x + 34 + wide(TALES_TITLE, 'mid') + 14, x + w - 34, ty + 14));
  parts.push(stage(...TALES_STAGE, x + w / 2, ty + 110, 520, 150, .6));
  TALES.forEach(([tale, where], i) => { const ry = ty + TALE[0] + i * TALE[1]; parts.push(diamond(x + TALE[2], ry + TALE[3], 4)); texts.push([tale, 'text', x + TALE[4], ry + TALE[5], 'value'], [where, 'small', x + w - 54, ry + TALE[6], 'hint', 'right']); });
  texts.push([ASK, 'line', x + w / 2, ty + 164, 'hint', 'center']);
  parts.push(button('Close', ...CLOSE));
  return draw(S, parts, texts);
}

/* ---------- the pieces ---------- */
const RULE = [X + 200, Y + 46, 720];                                       // where the rule is drawn as a piece: its diamond end, its y, its length
const one = f => () => { const parts = []; f(parts); return parts; };
const [C0x, C0y] = cardAt(0), rowY = i => C0y + ROW[0] + i * ROW[1];
const townPiece = (t, known, n) => one(p => { const [cx, cy, r] = [cardAt(n)[0] + PIC[0], cardAt(n)[1] + PIC[1], PIC[2]]; picture(p, cx, cy, r, t.paint(r), known ? 0 : .8); roundFrame(p, cx, cy, r, known ? 'bronze' : 'steel'); });
const PIECES = {
  Frame: () => [frame(X, Y, SW, SH)],
  Rule: () => [rule(RULE[0], RULE[0] + RULE[2], RULE[1])],
  'Card Known': () => { const [cx, cy] = cardAt(0); return [stage(cx, cy, CARD[2], CARD[3], cx + 60, cy + 60, 300, 260, 1)]; },
  'Card Unknown': () => { const [cx, cy] = cardAt(1); return [stage(cx, cy, CARD[2], CARD[3], cx + 60, cy + 60, 300, 260, .35)]; },
  ...Object.fromEntries(TOWNS.flatMap((t, n) => [[`Town ${t.name}`, townPiece(t, true, n)], [`Town ${t.name} Unknown`, townPiece(t, false, n)]])),
  ...Object.fromEntries(ROWS.map((what, i) => [`Sign ${what}`, () => [button(what, C0x + ROW[2], rowY(i) + ROW[3], ROW[4])]])),
  Scale: () => [scale(C0x + SCALE[0], rowY(0) + SCALE[1], SCALE[2], null)],
  'Scale Mark': () => [scaleMark(C0x + SCALE[0], rowY(0) + SCALE[1])],
  'Bar Fame Under': () => [bar(C0x + BAR[0], rowY(2) + BAR[1], BAR[2], BAR[3], 0, AMBER, 'under')],
  'Bar Fame Fill': () => [bar(C0x + BAR[0], rowY(2) + BAR[1], BAR[2], BAR[3], 1, AMBER, 'fill')],
  Tales: () => [stage(...TALES_STAGE, X + SW / 2, TY + 110, 520, 150, .6)],
  Bullet: () => [diamond(X + TALE[2], TY + TALE[0] + TALE[3], 4)],
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), [cw, ch] = [CARD[2], CARD[3]];
  const rel = (n, [x, y] = [C0x, C0y]) => [at[n][0] - x, at[n][1] - y];
  return {
    _note: 'Written by scripts/art/ui/reputation_screen.mjs --pieces: do not edit by hand. The Reputation screen (D7, D8, D22, D126, D249) in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. The screen is one block: in a bigger window it would be centred (not done).',
    size: [W, H],
    order: ['veil', 'Frame', 'rules', 'cards', 'Tales', 'bullets', 'Button Close', 'text'],
    veil: { _note: 'The world behind, done by the game (the death screen\'s veil shader): each colour goes `grey` of the way to its grey, then `dark` of the way to `tint`, then is darkened towards the corners: times 1 - corners * d^2, d from 0 in the middle to 1 at a corner along each axis (d^2 = dx^2 + dy^2, dx and dy from -1 to 1).', dark: .45, grey: .5, tint: hex([18, 20, 26]), corners: .35 },
    pieces: Object.fromEntries(['Frame', 'Tales', 'Button Close'].map(n => [n, P(n)])),
    rule: {
      _note: 'A steel rule with a diamond at its left end, drawn from that end (x, y) to the right, "length" long: draw the piece\'s columns from 0 to inner[0] + length, so that its "inner" lands on (x, y), both rounded to whole pixels. After the title: from "gap" past the title\'s end to "gap_hint" before the hint\'s start, at y. After the tales\' heading: from "gap" past its end to "end" (an x), at the heading\'s top + "dy".',
      file: 'Rule.png', inner: [RULE[0] - at.Rule[0], RULE[1] - at.Rule[1]], drawn: RULE[2],
      title: { gap: 16, gap_hint: 14, y: Y + 46 }, tales: { gap: 14, end: X + SW - 34, dy: 14 },
    },
    cards: {
      _note: 'One card per town (D249), the first at "first", "step" to the right for the next: at most "fits". A town is "known" when it told you anything (D126): Card Known and the town\'s picture, else Card Unknown, its picture greyed ("Town <name> Unknown") and every text "dim". Every place below is from the card\'s top left corner. Each row: its sign, its label and its word (UNKNOWN when not known), then Standing and Morality a Scale with the Scale Mark where you stand (v, 0 to 1: the mark\'s "at" plus scale width times v, rounded; no mark when not known), Fame a bar: "under", then "fill" cut at the value (it reaches x = bar x + inset + (bar width - 2 * inset) * value). The ends of each scale or bar in face "small", colour "dim".',
      first: cardAt(0), step: [CARD_STEP, 0], size: [cw, ch], fits: 2,
      card: { known: { file: 'Card Known.png', at: rel('Card Known') }, unknown: { file: 'Card Unknown.png', at: rel('Card Unknown', cardAt(1)) } },
      towns: Object.fromEntries(TOWNS.map((t, n) => [t.name, { known: { file: `Town ${t.name}.png`, at: rel(`Town ${t.name}`, cardAt(n)) }, unknown: { file: `Town ${t.name} Unknown.png`, at: rel(`Town ${t.name} Unknown`, cardAt(n)) } }])),
      name: { face: 'mid', at: [112, 26], colour: 'value', unknown: 'hint' }, faction: { face: 'line', at: [112, 52], colour: 'label', unknown: 'dim' },
      rows: {
        first: ROW[0], step: ROW[1], names: ROWS, unknown_word: UNKNOWN,
        signs: Object.fromEntries(ROWS.map(r => [r, { file: `Sign ${r}.png`, at: [at[`Sign ${r}`][0] - C0x, at[`Sign ${r}`][1] - rowY(ROWS.indexOf(r))] }])),
        label: { face: 'line', at: [ROW[5], ROW[6]], colour: 'label', unknown: 'dim' }, word: { face: 'line', at: [ROW[5], ROW[7]], colour: 'value', unknown: 'dim' },
        scale: { file: 'Scale.png', at: [at.Scale[0] - C0x, at.Scale[1] - rowY(0)], x: SCALE[0], width: SCALE[2], mark: { file: 'Scale Mark.png', at: [at['Scale Mark'][0] - C0x, at['Scale Mark'][1] - rowY(0)] } },
        bar: { under: { file: 'Bar Fame Under.png', at: [at['Bar Fame Under'][0] - C0x, at['Bar Fame Under'][1] - rowY(2)] }, fill: { file: 'Bar Fame Fill.png', at: [at['Bar Fame Fill'][0] - C0x, at['Bar Fame Fill'][1] - rowY(2)] }, rect: [BAR[0], BAR[1], BAR[2], BAR[3]], inset: 2 },
        ends: { face: 'small', left_at: [SCALE[0], ENDS_DY], right: [SCALE[0] + SCALE[2], ENDS_DY], colour: 'dim', words: ENDS, _note: 'the bar\'s ends sit where the scale\'s do' },
      },
      told: { face: 'small', at: [20, ch - 22], colour: 'hint', unknown: 'dim', _note: 'who told you and when (D126); the words are not decided' },
    },
    tales: {
      _note: 'The tales told of you that you heard (D194), oldest first: at most "fits" show (scrolling not done). Each: the Bullet, the tale, and where and when you heard it, right-aligned.',
      first: TY + TALE[0], step: TALE[1], fits: 4,
      bullet: { file: 'Bullet.png', at: [at.Bullet[0], at.Bullet[1] - TY - TALE[0]], _note: 'x as is, y from the tale\'s row' },
      text: { face: 'text', x: X + TALE[4], dy: TALE[5], colour: 'value' }, where: { face: 'small', right: X + SW - 54, dy: TALE[6], colour: 'hint', join: '  ·  ' },
    },
    close: { _note: 'A click, or Esc.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'dim', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['big', 'mid', 'text', 'line', 'small'].map(k => [k, face(k)])),
      title: { text: TITLE, face: 'big', at: [X + 34, Y + 24], colour: 'value' },
      hint: { text: HINT, face: 'line', right: [X + SW - 34, Y + 38], colour: 'hint' },
      tales_title: { text: TALES_TITLE, face: 'mid', at: [X + 34, TY], colour: 'value' },
      ask: { text: ASK, face: 'line', centre: [X + SW / 2, TY + 164], colour: 'hint', _note: 'D127' },
    },
  };
}

/* ---------- the check: the screen from the pieces ---------- */
function check(dir) {
  const J = JSON.parse(readFileSync(`${dir}/reputation.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), T = J.text, C = J.cards, Rw = C.rows, Ru = J.rule;
  const say = (str, s, colour = s.colour, align = 'left', at = s.at ?? s.centre ?? s.right) => texts.push([str, s.face, ...at, colour, align]);
  /** The rule the game's way: its piece cut to `length` from its left end at x, y. */
  const ruleAt = (x, y, length) => { const p = pic(Ru.file), [ix, iy] = Ru.inner; parts.push([cut(p, i => i <= ix + length), Math.round(x) - ix, Math.round(y) - iy]); };
  put(J.pieces.Frame.file, J.pieces.Frame.at);
  say(T.title.text, T.title); say(T.hint.text, T.hint, T.hint.colour, 'right');
  { const x0 = T.title.at[0] + wide(T.title.text, T.title.face) + Ru.title.gap, x1 = T.hint.right[0] - wide(T.hint.text, T.hint.face) - Ru.title.gap_hint; ruleAt(x0, Ru.title.y, x1 - x0); }
  TOWNS.slice(0, C.fits).forEach((t, n) => {
    const cx = C.first[0] + n * C.step[0], cy = C.first[1] + n * C.step[1], known = t.rows[0].length > 1, k = known ? 'known' : 'unknown', o = ([dx, dy]) => [cx + dx, cy + dy];
    const tone = s => known ? s.colour : s.unknown;
    put(C.card[k].file, o(C.card[k].at)); put(C.towns[t.name][k].file, o(C.towns[t.name][k].at));
    texts.push([t.name, C.name.face, ...o(C.name.at), tone(C.name)], [t.faction, C.faction.face, ...o(C.faction.at), tone(C.faction)]);
    t.rows.forEach(([what, word, v], i) => {
      const ry = cy + Rw.first + i * Rw.step, at = ([dx, dy]) => [cx + dx, ry + dy], sg = Rw.signs[what];
      put(sg.file, at(sg.at));
      texts.push([what, Rw.label.face, ...at(Rw.label.at), tone(Rw.label)], [word ?? Rw.unknown_word, Rw.word.face, ...at(Rw.word.at), tone(Rw.word)]);
      if (what === 'Fame') {
        const B = Rw.bar, bx = cx + B.rect[0], end = bx + B.inset + (B.rect[2] - 2 * B.inset) * (v ?? 0), fx = cx + B.fill.at[0];
        put(B.under.file, at(B.under.at)); parts.push([cut(pic(B.fill.file), x => x + fx < end), ...at(B.fill.at)]);
      } else {
        put(Rw.scale.file, at(Rw.scale.at));
        if (v != null) { const M = Rw.scale.mark; put(M.file, [Math.round(cx + M.at[0] + Rw.scale.width * v), ry + M.at[1]]); }
      }
      texts.push([Rw.ends.words[what][0], Rw.ends.face, ...at(Rw.ends.left_at), Rw.ends.colour], [Rw.ends.words[what][1], Rw.ends.face, ...at(Rw.ends.right), Rw.ends.colour, 'right']);
    });
    texts.push([t.told, C.told.face, ...o(C.told.at), tone(C.told)]);
  });
  say(T.tales_title.text, T.tales_title);
  ruleAt(T.tales_title.at[0] + wide(T.tales_title.text, T.tales_title.face) + Ru.tales.gap, T.tales_title.at[1] + Ru.tales.dy, Ru.tales.end - T.tales_title.at[0] - wide(T.tales_title.text, T.tales_title.face) - Ru.tales.gap);
  put(J.pieces.Tales.file, J.pieces.Tales.at);
  const L = J.tales; TALES.slice(0, L.fits).forEach(([tale, where], i) => {
    const ry = L.first + i * L.step; put(L.bullet.file, [L.bullet.at[0], ry + L.bullet.at[1]]);
    texts.push([tale, L.text.face, L.text.x, ry + L.text.dy, L.text.colour], [where, L.where.face, L.where.right, ry + L.where.dy, L.where.colour, 'right']);
  });
  say(T.ask.text, T.ask, T.ask.colour, 'center');
  put(J.pieces['Button Close'].file, J.pieces['Button Close'].at);
  return draw(dim(world({ you: 'plain' }), J.veil.dark, J.veil.grey), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/reputation'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/reputation.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and reputation.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/reputation.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/reputation_screen.mjs --pieces`); process.exit(1); }
  const A = check(out), B = screen(); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'scripts/art/out/ui-reputation-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(), 'scripts/art/out/ui-reputation.png', t0);
