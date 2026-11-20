// The talk window: talking to someone (D23, D126 to D128), in the shop window's family (#67): a slate plate on the right, the speaker's
// face in a bronze ring. The conversation's choices are not decided (docs/open-questions.md, "Talking to NPCs"), so every name, line and
// choice shown is made up: placeholders, not the game's words. The window is 1152 x 648.
//   Top:    the speaker's face in a bronze ring (the game draws them from their character), their name if you were told it (D31), else
//           what you see of them (D128), and under it their work and town. The round button closes.
//   Middle: the last exchange, dim (what you asked, what they said), then what they say now, pale.
//   Bottom: your replies, numbered: a click or the number key picks one. The pointed one is lit.
// With --people: what "Tell me more about this person..." opens (D127): everyone you know of, by name, by face or by a tale (D128),
// yourself first (D126), then Back. Picking one asks the speaker what their town knows.
//
// The pieces, like the shop window's (#67), into game/client/art/made/ui/talk/ (--pieces):
//   Panel                          the slate plate
//   Portrait Back, Portrait Ring   behind and round the speaker's face (the face itself is the character, drawn by the game)
//   Rule                           the thin steel rule between the speaker and what is said, and between that and your replies
//   Badge, Badge Lit               a reply's number in a small bronze ring, and lit (pointed at)
//   Choice Lit                     the warm light across the pointed reply
//   Button Close
//   talk.json                      where every piece and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/talk_window.mjs [--people]                 the draft, prototype/shots/ui-talk.png or ui-talk-people.png (a few seconds)
//   node scripts/art/ui/talk_window.mjs --pieces [--out dir]       the pieces and talk.json, into game/client/art/made/ui/talk/
//   node scripts/art/ui/talk_window.mjs --check [--people] [--out dir]
//       puts the window together from the pieces the way the json says, into prototype/shots/ui-talk-pieces.png, and counts the pixels
//       that differ from the draft. Write the pieces first.
// Every picture in prototype/shots/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, plate, button, world, draw, wide, wrap, save, open, bake, room, done, halo, picture, roundFrame, rule, figure, blank, disc } from './pieces.mjs';
import { mask, layer } from './kit.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

// Made up: who speaks, what was said, your replies.
const TALK = {
  name: 'Hesk', about: 'Smith  ·  Dawndoor',
  speaker: { race: 'human', tints: { Chest1: '#8a4a3a', Head1: '#3a2a1a', Legs1: '#6a5a3a' } },     // the camp's man in red
  earlier: [['You', 'What\'s your name?'], ['Hesk', 'Hesk. You\'re the one who woke by the door last night.']],
  says: '"Folk talk, newcomer. Some say you helped the guards at the gate. Others say you only watched. Which is it?"',
  replies: ['What do people say about me?', 'Tell me more about this person...', 'I helped. Ask them yourself.', 'I\'d like to trade.', 'Any work for me?', 'Farewell.'],
  lit: 1,
};
const PEOPLE = {
  earlier: [['Hesk', 'Folk talk, newcomer. Some say you helped the guards...'], ['You', 'Tell me more about this person...']],
  says: '"Who do you want to know about?"',
  replies: [['Yourself', ''], ['Brannoc', 'by name'], ['The orc in plate you saw at the Dawndoor gate', 'seen'], ['Whoever killed the Dawndoor shopkeeper', 'heard of'], ['Back', '']],
  lit: 2,
};
const SCENE = { you: 'plain', at: [150, 250], chest: 'closed', yours: [4, 1], facing: 'N' };      // you face the camp's man in red (3, -1), as in the shop

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const SX = 548, SW = 578, CX = SX + SW / 2;                       // the window's column, as the shop's
const PY = 120, PH = 504;                                         // the plate: lower than the shop's, so the world above stays in view
const FACE_AT = [SX + 52, PY + 50, 32];                           // the speaker's face: middle and radius
const NAME_X = FACE_AT[0] + FACE_AT[2] + 18, CLOSE = [SX + SW - 32, PY + 32, 17];
const RULE1 = PY + 104, EARLY_Y = PY + 118, EARLY_STEP = 18, SAYS_Y = PY + 168, SAYS_W = SW - 56, SAYS_STEP = 21, RULE2 = PY + 252;
const CHOICE_Y = PY + 268, CHOICE_STEP = 34, BADGE_DX = 34, BADGE_R = 11, CHOICE_X = SX + 58, CHOICE_H = 28;
const HINT_Y = PY + PH - 30;
const choiceAt = i => CHOICE_Y + i * CHOICE_STEP;

/** The speaker's face, from their character: the head and shoulders, twice the size, cut round (the shop's keeperFace). The game draws it. */
function speakerFace(r) {
  const f = figure(TALK.speaker.race, 'S', TALK.speaker.tints); let x0 = f.w, x1 = 0, y0 = f.h;
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (f.data[(j * f.w + i) * 4 + 3] > 40) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); }
  const s = 2, cx = (x0 + x1 + 1) / 2, top = y0 - 3, o = blank(2 * r, 2 * r);
  for (let j = 0; j < 2 * r; j++) for (let i = 0; i < 2 * r; i++) {
    if (Math.hypot(i + .5 - r, j + .5 - r) > r - .5) continue; const sx = Math.floor(cx - r / s + i / s), sy = Math.floor(top + j / s);
    if (sx < 0 || sy < 0 || sx >= f.w || sy >= f.h) continue; f.data.copy(o.data, (j * 2 * r + i) * 4, (sy * f.w + sx) * 4, (sy * f.w + sx) * 4 + 4);
  }
  return o;
}
const faceParts = (withFace = true) => { const p = [], [cx, cy, r] = FACE_AT; picture(p, cx, cy, r, () => [14, 12, 11]); if (withFace) p.push([speakerFace(r), cx - r, cy - r]); return p; };
const ringParts = () => { const p = [], [cx, cy, r] = FACE_AT; roundFrame(p, cx, cy, r); return p; };
/** A reply's number in a small bronze ring; lit, a warm glow round it. */
function badge(cx, cy, on) { const p = []; if (on) { const A = room(cx - BADGE_R - 8, cy - BADGE_R - 8, 2 * BADGE_R + 16, 2 * BADGE_R + 16, 6), M = mask(A); disc(M, cx, cy, BADGE_R + 3); p.push(done(halo(M, COL.glow, .9, 5))); } picture(p, cx, cy, BADGE_R, () => on ? [54, 38, 22] : [16, 14, 12]); roundFrame(p, cx, cy, BADGE_R); return p; }
/** The warm light across the pointed reply: strongest at the left, gone at the right. */
function choiceLit(x, y, w, h) { const A = room(x, y, w, h, 0), L = layer(A); for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) { const t = i / A.w, v = Math.abs(j / A.h - .5) * 2, q = j * A.w + i; L.c[q * 3] = 168; L.c[q * 3 + 1] = 104; L.c[q * 3 + 2] = 40; L.a[q] = .42 * (1 - t) ** 1.4 * (1 - v ** 4); } return done(L); }
const rules = () => [RULE1, RULE2].flatMap(y => [rule(CX, SX + 24, y), rule(CX, SX + SW - 24, y)]);
const LIT_BOX = [SX + 14, -4, SW - 28, CHOICE_H + 2];             // the light's x, y from the reply's top, width, height

function lines(people) {
  const T = people ? PEOPLE : TALK, texts = [];
  T.earlier.forEach(([who, l], i) => { const y = EARLY_Y + i * EARLY_STEP, w = wide(who + ':', 'line'); texts.push([who + ':', 'line', SX + 28, y, 'dim'], [l, 'line', SX + 28 + w + 6, y, 'dim']); });
  wrap(T.says, 'text', SAYS_W).forEach((l, i) => texts.push([l, 'text', SX + 28, SAYS_Y + i * SAYS_STEP, 'value', 'left', 1]));
  T.replies.forEach((r, i) => {
    const [txt, kind] = people ? r : [r, ''], y = choiceAt(i), on = i === T.lit;
    texts.push([String(i + 1), 'title', SX + BADGE_DX, y + 4, on ? 'glow' : 'label', 'center', 1], [txt, 'text', CHOICE_X, y + 5, on ? 'glow' : 'value', 'left', 1]);
    if (kind) texts.push([kind, 'small', SX + SW - 28, y + 8, 'hint', 'right', 1]);
  });
  return texts;
}

function screen(people) {
  const S = world(SCENE), parts = [], T = people ? PEOPLE : TALK, texts = [];
  parts.push(plate(SX, PY, SW, PH), ...faceParts(), ...ringParts(), button('Close', ...CLOSE), ...rules());
  texts.push([TALK.name, 'mid', NAME_X, FACE_AT[1] - 26, 'value', 'left', 1], [TALK.about, 'line', NAME_X, FACE_AT[1] + 4, 'hint', 'left', 1], ['Esc', 'small', CLOSE[0] - CLOSE[2] - 8, CLOSE[1] - 6, 'hint', 'right', 1]);
  T.replies.forEach((_, i) => { const y = choiceAt(i), on = i === T.lit; if (on) parts.push(choiceLit(LIT_BOX[0], y + LIT_BOX[1], LIT_BOX[2], LIT_BOX[3])); parts.push(...badge(SX + BADGE_DX, y + BADGE_R + 3, on)); });
  texts.push(...lines(people), ['Click a reply, or press its number', 'small', CX, HINT_Y, 'hint', 'center', 1]);
  return draw(S, parts, texts);
}

/* ---------- the pieces ---------- */
const PIECES = {
  Panel: () => [plate(SX, PY, SW, PH)],
  'Portrait Back': () => faceParts(false),
  'Portrait Ring': ringParts,
  Rule: () => [rule(CX, SX + 24, RULE1), rule(CX, SX + SW - 24, RULE1)],
  Badge: () => badge(SX + BADGE_DX, choiceAt(0) + BADGE_R + 3, false),
  'Badge Lit': () => badge(SX + BADGE_DX, choiceAt(0) + BADGE_R + 3, true),
  'Choice Lit': () => [choiceLit(LIT_BOX[0], choiceAt(0) + LIT_BOX[1], LIT_BOX[2], LIT_BOX[3])],
  'Button Close': () => [button('Close', ...CLOSE)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), rel = (n, y) => [at[n][0], at[n][1] - y];
  return {
    _note: 'Written by scripts/art/ui/talk_window.mjs --pieces: do not edit by hand. The talk window (D23, D126 to D128), in the shop window\'s family, in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "right" its top right, "centre" its top middle. Every place and size here is a setting. The conversation\'s choices are not decided: every name, line and reply in the draft is made up. The window is one block on the right of the screen: in another window size it would keep to the right (not done).',
    size: [W, H],
    order: ['Panel', 'Portrait Back', 'the face', 'Portrait Ring', 'Button Close', 'Rule', 'Choice Lit', 'badges', 'text'],
    pieces: Object.fromEntries(['Panel', 'Portrait Back', 'Portrait Ring', 'Button Close'].map(n => [n, P(n)])),
    face: { _note: 'The speaker\'s face: their character\'s head and shoulders (S side), twice the size, cut to a circle of "radius" round "centre" (the shop\'s way).', centre: FACE_AT.slice(0, 2), radius: FACE_AT[2] },
    rule: { _note: 'Drawn twice: once at each y in "ys" (the piece is drawn for the first).', file: 'Rule.png', at: at.Rule, ys: [RULE1, RULE2] },
    close: { _note: 'A click, or Esc.', centre: CLOSE.slice(0, 2), radius: CLOSE[2], key: 'Esc' },
    replies: {
      _note: 'One reply per row, the first row\'s top at "first_y", "step" down to the next; a click on the row or its number key (1 to 9) picks it. The pointed one: Choice Lit and Badge Lit, its words and number in "on". Badge and Choice Lit are drawn for the first row: move them down by the row\'s top minus "first_y". For a list of people (D127, D128), how you know each one, right-aligned at "kind".',
      first_y: CHOICE_Y, step: CHOICE_STEP, height: CHOICE_H, most: 9, badge: P('Badge'), badge_lit: P('Badge Lit'), lit: P('Choice Lit'),
      number: { face: 'title', centre_x: SX + BADGE_DX, dy: 4, colour: 'label', on: 'glow', outline: 1 }, words: { face: 'text', x: CHOICE_X, dy: 5, colour: 'value', on: 'glow', outline: 1 },
      kind: { face: 'small', right_x: SX + SW - 28, dy: 8, colour: 'hint', outline: 1 },
    },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'dim', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'title', 'text', 'line', 'small'].map(k => [k, face(k)])),
      name: { _note: 'Their name if you were told it (D31), else what you see of them (D128).', face: 'mid', at: [NAME_X, FACE_AT[1] - 26], colour: 'value', outline: 1 },
      about: { _note: 'Their work and town, as far as you know them.', face: 'line', at: [NAME_X, FACE_AT[1] + 4], colour: 'hint', outline: 1 },
      close_key: { text: 'Esc', face: 'small', right: [CLOSE[0] - CLOSE[2] - 8, CLOSE[1] - 6], colour: 'hint', outline: 1 },
      earlier: { _note: 'The last exchange, dim: "who:" then the line, "gap" after it; one line each, "step" apart.', face: 'line', at: [SX + 28, EARLY_Y], step: EARLY_STEP, gap: 6, colour: 'dim', most: 2 },
      says: { _note: 'What they say now, wrapped to "width", "step" apart.', face: 'text', at: [SX + 28, SAYS_Y], width: SAYS_W, step: SAYS_STEP, colour: 'value', outline: 1, most_lines: 3 },
      hint: { text: 'Click a reply, or press its number', face: 'small', centre: [CX, HINT_Y], colour: 'hint', outline: 1 },
    },
  };
}

/* ---------- the check: the window from the pieces ---------- */
function check(dir, people) {
  const J = JSON.parse(readFileSync(`${dir}/talk.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), Rp = J.replies, X = J.text, T = people ? PEOPLE : TALK;
  put(J.pieces.Panel.file, J.pieces.Panel.at); put(J.pieces['Portrait Back'].file, J.pieces['Portrait Back'].at);
  parts.push([speakerFace(J.face.radius), J.face.centre[0] - J.face.radius, J.face.centre[1] - J.face.radius]); put(J.pieces['Portrait Ring'].file, J.pieces['Portrait Ring'].at);
  put(J.pieces['Button Close'].file, J.pieces['Button Close'].at);
  J.rule.ys.forEach(y => put(J.rule.file, [J.rule.at[0], J.rule.at[1] + y - J.rule.ys[0]]));
  T.replies.forEach((_, i) => { const dy = i * Rp.step, on = i === T.lit; if (on) put(Rp.lit.file, [Rp.lit.at[0], Rp.lit.at[1] + dy]); const b = on ? Rp.badge_lit : Rp.badge; put(b.file, [b.at[0], b.at[1] + dy]); });
  texts.push([TALK.name, X.name.face, ...X.name.at, X.name.colour, 'left', X.name.outline], [TALK.about, X.about.face, ...X.about.at, X.about.colour, 'left', X.about.outline], [X.close_key.text, X.close_key.face, ...X.close_key.right, X.close_key.colour, 'right', X.close_key.outline]);
  const E = X.earlier; T.earlier.forEach(([who, l], i) => { const y = E.at[1] + i * E.step; texts.push([who + ':', E.face, E.at[0], y, E.colour], [l, E.face, E.at[0] + wide(who + ':', E.face) + E.gap, y, E.colour]); });
  const Sy = X.says; wrap(T.says, Sy.face, Sy.width).forEach((l, i) => texts.push([l, Sy.face, Sy.at[0], Sy.at[1] + i * Sy.step, Sy.colour, 'left', Sy.outline]));
  T.replies.forEach((r, i) => {
    const [txt, kind] = people ? r : [r, ''], y = Rp.first_y + i * Rp.step, on = i === T.lit, N = Rp.number, Wd = Rp.words;
    texts.push([String(i + 1), N.face, N.centre_x, y + N.dy, on ? N.on : N.colour, 'center', N.outline], [txt, Wd.face, Wd.x, y + Wd.dy, on ? Wd.on : Wd.colour, 'left', Wd.outline]);
    if (kind) texts.push([kind, Rp.kind.face, Rp.kind.right_x, y + Rp.kind.dy, Rp.kind.colour, 'right', Rp.kind.outline]);
  });
  texts.push([X.hint.text, X.hint.face, ...X.hint.centre, X.hint.colour, 'center', X.hint.outline]);
  return draw(world(SCENE), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/talk'), t0 = Date.now(), people = argv.includes('--people');
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png') || (f.endsWith('.png.import') && !(f.slice(0, -11) in PIECES))) rmSync(`${out}/${f}`);   // a dropped piece goes, its import too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/talk.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and talk.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/talk.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/talk_window.mjs --pieces`); process.exit(1); }
  const A = check(out, people), B = screen(people); let n = 0, worst = 0, bx = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); bx = [Math.min(bx[0], x), Math.min(bx[1], y), Math.max(bx[2], x), Math.max(bx[3], y)]; } }
  save(A, 'prototype/shots/ui-talk-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${bx[0]} to ${bx[2]}, y ${bx[1]} to ${bx[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(people), `prototype/shots/ui-talk${people ? '-people' : ''}.png`, t0);
