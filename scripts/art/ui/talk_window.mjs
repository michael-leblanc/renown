// The talk window: talking to someone (D23, D126 to D128), the RuneScape way (Michael, 2026-11-20: "I like the way they do it for
// runescape"): a box in the bottom left, where the HUD shows local speech (D244), not a window over the world. One line at a time:
// the speaker's head on the left with their name over their line, "Click here to continue"; your own lines with your head on the right;
// your replies as "Select an option", numbered. No history to scroll: a line is gone once you go on. Renown's own look (D240, D241),
// nothing of RuneScape's art. The conversation's choices are not decided (docs/open-questions.md, "Talking to NPCs"), so every name,
// line and reply shown is made up: placeholders, not the game's words. The window is 1152 x 648.
//   --state npc       they speak: their head left (facing you), their name if you were told it (D31), else what you see (D128)
//   --state you       you speak: your head right; a newborn has nobody's name (D31), so it says "You"
//   --state options   "Select an option", up to 5 numbered replies; a click or the number key picks one; the pointed one is lit
//   --state people    what "Tell me more about this person..." opens (D127): yourself (D126), people by name, seen, heard of (D128), Back
//
// The pieces, like the shop window's (#67), into game/client/art/made/ui/talk/ (--pieces):
//   Panel                                     the box's slate plate
//   Portrait Back Left, Portrait Ring Left    behind and round the speaker's head (the head is the character, drawn by the game)
//   Portrait Back Right, Portrait Ring Right  the same on the right, for yours
//   Option Lit                                the warm light behind the pointed reply
//   talk.json                                 where every piece and line of text goes. Godot reads the places from it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/talk_window.mjs [--state npc|you|options|people]   the draft, scripts/art/out/ui-talk-<state>.png (a few seconds)
//   node scripts/art/ui/talk_window.mjs --pieces [--out dir]             the pieces and talk.json, into game/client/art/made/ui/talk/
//   node scripts/art/ui/talk_window.mjs --check [--state ...] [--out dir]
//       puts the box together from the pieces the way the json says, into scripts/art/out/ui-talk-pieces.png, and counts the pixels
//       that differ from the draft. Write the pieces first.
// Every picture in scripts/art/out/ is over a made-up camp in the game's art: bought art (tileset, Creator), never commit them.
import { W, H, COL, FACE, YOU, plate, world, draw, wide, wrap, save, open, bake, room, done, picture, roundFrame, figure, blank } from './pieces.mjs';
import { layer } from './kit.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

// Made up: who speaks, what is said, your replies.
const HESK = { race: 'human', tints: { Chest1: '#8a4a3a', Head1: '#3a2a1a', Legs1: '#6a5a3a' } };       // the camp's man in red
const STATES = {
  npc: { who: 'left', name: 'Hesk', face: HESK, says: 'Folk talk, newcomer. Some say you helped the guards at the gate. Others say you only watched.' },
  you: { who: 'right', name: 'You', face: { race: 'human', tints: YOU }, says: 'I helped. Ask them yourself.' },
  options: { replies: ['What do people say about me?', 'Tell me more about this person...', 'I\'d like to trade.', 'Any work for me?', 'Farewell.'], lit: 1 },
  people: { replies: [['Yourself', ''], ['Brannoc', 'by name'], ['The orc in plate you saw at the gate', 'seen'], ['Whoever killed the shopkeeper', 'heard of'], ['Back', '']], lit: 2 },
};
const SCENE = { you: 'plain', at: [150, 250], chest: 'closed', yours: [4, 1], facing: 'N' };      // you face the camp's man in red (3, -1), as in the shop

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const BX = 14, BW = 456, BH = 150, BY = H - BH - 12;             // the box: bottom left, where local speech is (D244), clear of the HUD's slots
const R = 34, FACE_L = [BX + 54, BY + BH / 2], FACE_R = [BX + BW - 54, BY + BH / 2];
const TEXT_W = BW - 2 * (FACE_L[0] - BX) - 2 * R + 40;           // a line's width, between the head and the far edge
const textMid = who => who === 'left' ? (FACE_L[0] + R + BX + BW - 16) / 2 : (BX + 16 + FACE_R[0] - R) / 2;
const NAME_Y = BY + 16, SAYS_Y = BY + 44, SAYS_STEP = 21, MORE_Y = BY + BH - 30;
const OPT_HEAD_Y = BY + 14, OPT_Y = BY + 42, OPT_STEP = 21, LIT_H = 22, MID = BX + BW / 2;

/** Someone's head and shoulders from their character, twice the size, cut round (the shop's way), facing `dir`. The game draws it. */
function head(who, dir, r) {
  const f = figure(who.race, dir, who.tints); let x0 = f.w, x1 = 0, y0 = f.h;
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (f.data[(j * f.w + i) * 4 + 3] > 40) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); }
  const s = 2, cx = (x0 + x1 + 1) / 2, top = y0 - 3, o = blank(2 * r, 2 * r);
  for (let j = 0; j < 2 * r; j++) for (let i = 0; i < 2 * r; i++) {
    if (Math.hypot(i + .5 - r, j + .5 - r) > r - .5) continue; const sx = Math.floor(cx - r / s + i / s), sy = Math.floor(top + j / s);
    if (sx < 0 || sy < 0 || sx >= f.w || sy >= f.h) continue; f.data.copy(o.data, (j * 2 * r + i) * 4, (sy * f.w + sx) * 4, (sy * f.w + sx) * 4 + 4);
  }
  return o;
}
const DIR = { left: 'SE', right: 'SW' };                          // the two heads turn to each other
const back = ([cx, cy]) => { const p = []; picture(p, cx, cy, R, () => [14, 12, 11]); return p; };
const ring = ([cx, cy]) => { const p = []; roundFrame(p, cx, cy, R); return p; };
/** The warm light behind the pointed reply: strongest in the middle, gone at the ends. */
function optionLit(x, y, w, h) { const A = room(x, y, w, h, 0), L = layer(A); for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) { const t = Math.abs(i / A.w - .5) * 2, v = Math.abs(j / A.h - .5) * 2, q = j * A.w + i; L.c[q * 3] = 168; L.c[q * 3 + 1] = 104; L.c[q * 3 + 2] = 40; L.a[q] = .5 * (1 - t * t) * (1 - v ** 4); } return done(L); }
const LIT_BOX = [BX + 40, BW - 80];                               // the light's x and width

/** The words of a state: the same for the draft and the check. */
function words(state) {
  const S = STATES[state], t = [];
  if (S.says) {
    const mid = textMid(S.who); t.push([S.name, 'title', mid, NAME_Y, 'label', 'center', 1]);
    wrap(S.says, 'text', TEXT_W).forEach((l, i) => t.push([l, 'text', mid, SAYS_Y + i * SAYS_STEP, 'value', 'center', 1]));
    t.push(['Click here to continue', 'line', mid, MORE_Y, 'glow', 'center', 1]);
  } else {
    t.push(['Select an option', 'title', MID, OPT_HEAD_Y, 'label', 'center', 1]);
    S.replies.forEach((r, i) => {
      const [txt, kind] = Array.isArray(r) ? r : [r, ''], line = `${i + 1}. ${txt}`, on = i === S.lit, y = OPT_Y + i * OPT_STEP;
      const tail = kind ? ` (${kind})` : '', w = wide(line, 'text') + (kind ? wide(tail, 'line') : 0), x = MID - w / 2;
      t.push([line, 'text', x, y, on ? 'glow' : 'value', 'left', 1]); if (kind) t.push([tail, 'line', x + wide(line, 'text'), y + 2, 'hint', 'left', 1]);
    });
  }
  return t;
}

function screen(state) {
  const S = STATES[state], parts = [plate(BX, BY, BW, BH, { full: [W, H] })];
  if (S.says) { const at = S.who === 'left' ? FACE_L : FACE_R; parts.push(...back(at), [head(S.face, DIR[S.who], R), at[0] - R, at[1] - R], ...ring(at)); }
  else parts.push(optionLit(LIT_BOX[0], OPT_Y + S.lit * OPT_STEP - 3, LIT_BOX[1], LIT_H));
  return draw(world(SCENE), parts, words(state));
}

/* ---------- the pieces ---------- */
const PIECES = {
  Panel: () => [plate(BX, BY, BW, BH, { full: [W, H] })],
  'Portrait Back Left': () => back(FACE_L), 'Portrait Ring Left': () => ring(FACE_L),
  'Portrait Back Right': () => back(FACE_R), 'Portrait Ring Right': () => ring(FACE_R),
  'Option Lit': () => [optionLit(LIT_BOX[0], OPT_Y - 3, LIT_BOX[1], LIT_H)],
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function layout(at) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] });
  const side = (who, c) => ({ back: P(`Portrait Back ${who}`), ring: P(`Portrait Ring ${who}`), head: { centre: c, radius: R, facing: DIR[who.toLowerCase()] }, text_centre_x: textMid(who.toLowerCase()) });
  return {
    _note: 'Written by scripts/art/ui/talk_window.mjs --pieces: do not edit by hand. The talk window (D23, D126 to D128), the RuneScape way (Michael, 2026-11-20): a box in the bottom left, one line at a time, in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "centre" its top middle. Every place and size here is a setting. The conversation\'s choices are not decided: every name, line and reply in the draft is made up. In another window size the box would keep to the bottom left (not done).',
    size: [W, H],
    panel: P('Panel'),
    line: {
      _note: 'Someone speaks: Panel, then on their side Portrait Back, their head (their character\'s head and shoulders facing "facing", twice the size, cut to a circle of "radius" round "centre", the shop\'s way) and Portrait Ring; their name, their line wrapped to "width" (at most "most_lines"), "Click here to continue", each centred on that side\'s text_centre_x. The other side stays empty. A click anywhere on the box, or Space, goes on. The speaker is "left"; you are "right", named "You" (a newborn has nobody\'s name, D31).',
      left: side('Left', FACE_L), right: side('Right', FACE_R),
      name: { face: 'title', y: NAME_Y, colour: 'label', outline: 1 }, says: { face: 'text', y: SAYS_Y, step: SAYS_STEP, width: TEXT_W, most_lines: 3, colour: 'value', outline: 1 },
      more: { text: 'Click here to continue', face: 'line', y: MORE_Y, colour: 'glow', outline: 1, key: 'Space' },
    },
    options: {
      _note: 'Your replies: Panel, "Select an option", then one line per reply, "N. words", centred on centre_x, "step" apart (at most "most"); a click or the number key picks one. The pointed one: Option Lit behind it (drawn for the first line: move it down by step times its place) and its words in "on". In a list of people (D127, D128), how you know each one follows in brackets, in "kind", "kind_dy" lower.',
      heading: { text: 'Select an option', face: 'title', centre: [MID, OPT_HEAD_Y], colour: 'label', outline: 1 },
      first_y: OPT_Y, step: OPT_STEP, most: 5, centre_x: MID, lit: P('Option Lit'),
      words: { face: 'text', colour: 'value', on: 'glow', outline: 1 }, kind: { face: 'line', kind_dy: 2, colour: 'hint', outline: 1 },
      keys: ['1', '2', '3', '4', '5'], close: 'Esc',
    },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'dim', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['title', 'text', 'line'].map(k => [k, face(k)])),
    },
  };
}

/* ---------- the check: the box from the pieces ---------- */
function check(dir, state) {
  const J = JSON.parse(readFileSync(`${dir}/talk.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], put = (p, dy = 0) => parts.push([pic(p.file), p.at[0], p.at[1] + dy]), S = STATES[state];
  put(J.panel);
  if (S.says) { const L = J.line[S.who], h = L.head; put(L.back); parts.push([head(S.face, h.facing, h.radius), h.centre[0] - h.radius, h.centre[1] - h.radius]); put(L.ring); }
  else put(J.options.lit, S.lit * J.options.step);
  const t = [];
  if (S.says) {
    const L = J.line, mid = L[S.who].text_centre_x; t.push([S.name, L.name.face, mid, L.name.y, L.name.colour, 'center', L.name.outline]);
    wrap(S.says, L.says.face, L.says.width).forEach((l, i) => t.push([l, L.says.face, mid, L.says.y + i * L.says.step, L.says.colour, 'center', L.says.outline]));
    t.push([L.more.text, L.more.face, mid, L.more.y, L.more.colour, 'center', L.more.outline]);
  } else {
    const O = J.options; t.push([O.heading.text, O.heading.face, ...O.heading.centre, O.heading.colour, 'center', O.heading.outline]);
    S.replies.forEach((r, i) => {
      const [txt, kind] = Array.isArray(r) ? r : [r, ''], line = `${i + 1}. ${txt}`, y = O.first_y + i * O.step, tail = kind ? ` (${kind})` : '';
      const w = wide(line, O.words.face) + (kind ? wide(tail, O.kind.face) : 0), x = O.centre_x - w / 2;
      t.push([line, O.words.face, x, y, i === S.lit ? O.words.on : O.words.colour, 'left', O.words.outline]); if (kind) t.push([tail, O.kind.face, x + wide(line, O.words.face), y + O.kind.kind_dy, O.kind.colour, 'left', O.kind.outline]);
    });
  }
  return draw(world(SCENE), parts, t);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/talk'), t0 = Date.now(), state = flag('--state', 'npc');
if (!STATES[state]) { console.error(`--state: one of ${Object.keys(STATES).join(', ')}`); process.exit(1); }
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png') || (f.endsWith('.png.import') && !(f.slice(0, -11) in PIECES))) rmSync(`${out}/${f}`);   // a dropped piece goes, its import too
  const at = {}; for (const [n, make] of Object.entries(PIECES)) { const { img, at: a } = bake(make()); at[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); }
  writeFileSync(`${out}/talk.json`, JSON.stringify(layout(at), null, '\t') + '\n');
  console.log(`${Object.keys(PIECES).length} pieces and talk.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/talk.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/talk_window.mjs --pieces`); process.exit(1); }
  const A = check(out, state), B = screen(state); let n = 0, worst = 0, bx = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); bx = [Math.min(bx[0], x), Math.min(bx[1], y), Math.max(bx[2], x), Math.max(bx[3], y)]; } }
  save(A, 'scripts/art/out/ui-talk-pieces.png', t0);
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${bx[0]} to ${bx[2]}, y ${bx[1]} to ${bx[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else save(screen(state), `scripts/art/out/ui-talk-${state}.png`, t0);
