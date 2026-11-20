// The main menu (D173, D197 to D199, D250) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// The window is 1152 x 648.
//   Behind: the door at dawn (scenes.mjs) the size of the window: Dawndoor's lone doorway (D108), tall and ruined, the sun coming up over the
//           Long Water (D99) through it. It moves (Michael, 2026-11-18: "more impressive", "animated"): clouds drift, the water glitters, the
//           light through the doorway shimmers, dust drifts in it, grass sways, stars blink. All made by code: no bought art in the picture.
//   Left:   the name in bronze, then Join game, Host game (D197), Settings, Quit. No "new character": nobody chooses who they wake as.
//   Middle: with --panel host, what "Host game" asks: a name for the world, a seed (D136), how many players (about 10), the port,
//           and the address the others on the home network type in (D199).
//           With --panel join, what "Join game" asks: the address and port the host's game shows (D199), and the last one joined.
//           With --panel settings: three volumes (Master, Music, Effects) as bars, the window (windowed or full screen) and motion
//           (full or reduced: the Skills screen's movement is off when reduced), each applied at once; Done closes it.
//           All three panels are the same plate in the same place.
//           The connecting panels, the same plate again (Michael, 2026-11-20; what each says is Claude's, not decided):
//             --panel connecting  after Join: the address being reached, three diamonds lit in turn while it waits, Cancel.
//             --panel refused     no game answered at that address (the wrong address, or the host not running): what to check, Try again, Back.
//             --panel lost        the connection dropped in play: the game goes back to the menu with this panel. The character stays
//                                 in the world 30 seconds and comes back when you join again (D49; whether a lost connection counts as
//                                 logging off is still open there). Join again, Back.
// New, not decided: everything the panels ask and their made-up values, the buttons' order, the version line. Not drawn: picking a saved world (D27, D182).
//
// The pieces, like the Reputation screen's (#56), into game/client/art/made/ui/menu/ (--pieces). The painting moves, so it is cut into what does
// not move; the game moves it with a shader (menu_scene.gdshader: sky, cloud, water, shore, the light's shimmer) and draws the stars and dust:
//   Door, Steps                    the doorway's stone, and the steps and fallen blocks before it, each over nothing (the shader lays them on)
//   Light                          the whole window, a value a pixel in each colour: red the light's glow on the stone round the opening (times 2),
//                                  green its pool on the ground in front, blue how much the painting is darkened there (behind the menu, the corners)
//   Noise                          the 512 x 512 grid the painting's noise is smoothed from (kit.mjs), 16 bits a value: red the high byte, green the low
//   Name, Name Rule                "Renown" in bronze, and the rule under it
//   Button, Button On              a menu button, and lit (pointed at, or its panel open)
//   Panel, Crest, Panel Rules      "Host game"'s plate, the crest on its top edge, the rules each side of its heading
//   Field, Button Host             a field for a value, and the panel's lit Host button (Join and Done use the same picture)
//   Panel Rules Join, Panel Rules Settings   the rules each side of "Join game"'s and "Settings"' headings
//   Bar, Bar Fill                  a volume's trough, and its amber fill, cut to the volume by the game (the HUD's bars' way)
//   Button Panel                   the panel's button, not lit (Cancel)
//   Button Small, Button Small On  a half-width panel button, and lit (Try again, Join again; Back is not lit)
//   Dot, Dot On                    a waiting diamond, steel, and lit (connecting: one lit at a time, left to right)
//   Panel Rules Connecting, Panel Rules Refused, Panel Rules Lost   the rules each side of those panels' headings
//   menu.json                      where every piece and line of text goes, the stars and the dust, the loop's length. Godot reads it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/main_menu.mjs [--panel host|join|settings|connecting|refused|lost|none] [--at 0.5]
//       prototype/shots/ui-menu.png, ui-menu-join.png, ui-menu-settings.png, ui-menu-connecting.png and so on, or ui-menu-plain.png without a panel (git-ignored), in a few seconds. --at: the moment of the loop to draw, 0 to 1.
//   node scripts/art/ui/main_menu.mjs --frames 150 [--part 1/2] [--panel none] | ffmpeg -f rawvideo -pix_fmt rgba -s 1152x648 -r 30 -i - \
//       -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p menu.mp4
//       the loop as raw pictures on the output, for ffmpeg to make a film of (150 pictures at 30 a second: 5 seconds, its end meets its start).
//       --part a/n writes only the a-th of n equal parts, so several can be drawn at once and joined after.
//   node scripts/art/ui/main_menu.mjs --pieces [--out dir]        the pieces and menu.json, into game/client/art/made/ui/menu/ (about 10 s)
//   node scripts/art/ui/main_menu.mjs --check [--out dir] [--panel host|join|settings|connecting|refused|lost|none] [--at 0.5]
//       puts the menu together from the pieces the way the json says (the painting moved the way the shader moves it), into
//       prototype/shots/ui-menu-pieces.png, and counts the pixels that differ from the draft. Write the pieces first.
import { K, mask, metal, shadow, over, NOISE } from './kit.mjs';
import { W, H, COL, FACE, AMBER, bar, cut, smooth, room, done, halo, plate, crest, rule, field, wordButton, wordMask, wordWidth, wide, wrap, diamond, tri, draw, save, open, bake, blank } from './pieces.mjs';
import { doorScene, doorStills, doorFrames, DOOR, DRIFT } from './scenes.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';

// The painting is darker behind the menu, and towards the corners.
const gain = (x, y) => (1 - .5 * smooth(640, 90, x) * (1 - .25 * y / H)) * (1 - .3 * Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)) ** 2.4);
const LOOP = 5;                                                            // seconds the painting takes to come round
/** The game's name in bronze letters. */
function name(x, y, px) {
  const w = wordWidth('Renown', 'AlegreyaSC-Bold', px), A = room(x, y, w + 8, px * 1.1, 16), M = mask(A); wordMask(M, 'Renown', 'AlegreyaSC-Bold', px, x, y);
  const S = halo(M, [255, 190, 110], .28, 9); over(S, shadow(M, .95)); over(S, metal(M, 'bronze', [W, Math.round((y + px) / .34)])); return [done(S), w];
}
const MENU = ['Join game', 'Host game', 'Settings', 'Quit'], SAYS = ['join', 'host', 'settings', 'quit'], VERSION = 'Renown 0.1  ·  the first slice';
const JOIN = { fields: [['Address', '192.168.1.20'], ['Port', '7777']], hint: 'The address the host\'s game shows.', last: ['Last joined', '192.168.1.20 : 7777'], button: 'Join' };
const SETTINGS = { volumes: [['Master', .8], ['Music', .6], ['Effects', .7]], choices: [['Window', 'Windowed'], ['Motion', 'Full']], hint: 'Changes apply at once.', button: 'Done' };
const HEADS = { host: 'Host game', join: 'Join game', settings: 'Settings', connecting: 'Joining', refused: 'Could not join', lost: 'Connection lost' };
// The connecting panels (Claude's words, not decided). `top`: a hint line, then the address under it; `body`: wrapped lines under that.
const ADDRESS = '192.168.1.20 : 7777';
const CONNECTING = { top: 'Reaching', hint: 'Waiting for the host\'s game to answer.', button: 'Cancel', dots: 3, step_seconds: .3 };
const REFUSED = { top: 'No game answered at', body: 'Check the address and port the host\'s game shows, and that the host is in the game. From outside the home network, the host\'s port must be open.', buttons: ['Try again', 'Back'] };
const LOST = { top: 'The host\'s game stopped answering', body: 'Your character stays where it was for 30 seconds, then leaves the world, safe, until you join again.', buttons: ['Join again', 'Back'] };
const STATUS = ['connecting', 'refused', 'lost'];
const HOST = { fields: [['World', 'Home'], ['Seed', '48213'], ['Players', '10'], ['Port', '7777']], hint: 'Leave the seed empty for a land nobody has seen.', address: ['Others on your network join at', '192.168.1.20 : 7777'] };

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const MX = 76, MW = 264, NAME = [MX - 4, 62, 96], RULE_Y = 182;           // the menu's left edge and the buttons' width; the name's top left and size
const BTN = [MX + 8, 226, MW, 46], BTN_STEP = 62, BTN_TEXT = 11;         // the first button, from one to the next, its word's top from the button's
const PANEL = [388, 214, 318, 352];                                      // "Host game"'s plate
const [PX, PY, PW, PH] = PANEL, HEAD_Y = PY + 20, HEAD_HALF = PW / 2 - 26;
const FIELD = [PX + 118, PY + 66, PW - 146, 28], FIELD_STEP = 40, LABEL_X = PX + 28, VALUE_X = PX + 130, FIELD_TEXT = 4;
const HOST_BTN = [PX + PW / 2 - 80, PY + 250, 160, 42], HOST_TEXT = 9;
const DONE_BTN = [HOST_BTN[0], PY + 290, HOST_BTN[2], HOST_BTN[3]], SET_HINT_Y = PY + 264;          // Settings has one row more: its button sits lower
const BAR = [FIELD[0], 9, FIELD[2] - 40, 10], VOL_RIGHT = FIELD[0] + FIELD[2];   // a volume's bar: x, y from the row's top, width, height; its number right-aligned at VOL_RIGHT
const TOP_Y = PY + 72, ADDR_Y = PY + 88, BODY_Y = PY + 128, BODY_W = PW - 56, BODY_STEP = 17;   // the connecting panels' lines
const DOT_Y = PY + 146, DOT_STEP = 26, DOT_S = 6, WAIT_Y = PY + 184;                            // the waiting diamonds' middle row, their spacing and half-size; the hint under them
const SMALL_W = 126, SMALL_GAP = 16, SMALL = [[PX + PW / 2 - SMALL_GAP / 2 - SMALL_W, HOST_BTN[1], SMALL_W, HOST_BTN[3]], [PX + PW / 2 + SMALL_GAP / 2, HOST_BTN[1], SMALL_W, HOST_BTN[3]]];
const btnAt = i => [BTN[0], BTN[1] + i * BTN_STEP];
const dotAt = i => [PX + PW / 2 + (i - (CONNECTING.dots - 1) / 2) * DOT_STEP, DOT_Y];
/** A waiting diamond: steel when off, the lit gem (a list's bullet, glowing) when on. */
function dot(cx, cy, on) {
  const [hx, hy] = dotAt(1); if (cx !== hx || cy !== hy) { const [img, x, y] = dot(hx, hy, on); return [img, x + cx - hx, y + cy - hy]; }   // drawn in one place and moved, so the metal's grain is the same in every place (the piece's way)
  if (on) return diamond(cx, cy, DOT_S);
  const A = room(cx - DOT_S, cy - DOT_S, 2 * DOT_S, 2 * DOT_S, 5), M = mask(A); tri(M, [[cx, cy - DOT_S], [cx + DOT_S, cy], [cx, cy + DOT_S], [cx - DOT_S, cy]]);
  return done(over(shadow(M, .8), metal(M, 'steel', [W, 3000], .35)));
}
const nameRule = tw => [rule(MX + tw / 2, MX, RULE_Y), rule(MX + tw / 2, MX + tw, RULE_Y)];
const headRules = (head = 'Host game') => { const w = wide(head, 'mid'), cx = PX + PW / 2, ry = HEAD_Y + FACE.mid[1] * .62; return [rule(cx - w / 2 - 10, cx - HEAD_HALF, ry), rule(cx + w / 2 + 10, cx + HEAD_HALF, ry)]; };

/** Everything that lies over the painting: [parts, texts] for draw(). */
function menu(panel) {
  const parts = [], texts = [], picked = SAYS.indexOf(panel);
  const [title, tw] = name(...NAME); parts.push(title, ...nameRule(tw));
  MENU.forEach((m, i) => { const [x, y] = btnAt(i), on = i === picked; parts.push(wordButton(x, y, BTN[2], BTN[3], on)); texts.push([m, 'mid', x + BTN[2] / 2, y + BTN_TEXT, on ? 'glow' : 'value', 'center', 2]); });
  texts.push([VERSION, 'small', MX + 8, H - 30, 'dim', 'left', 1]);
  if (panel === 'host') {
    parts.push(plate(PX, PY, PW, PH, { full: [W, H], alpha: .96 }), crest(PX + PW / 2, PY));
    texts.push(['Host game', 'mid', PX + PW / 2, HEAD_Y, 'value', 'center', 1]); parts.push(...headRules());
    HOST.fields.forEach(([l, v], i) => { const y = FIELD[1] + i * FIELD_STEP; texts.push([l, 'text', LABEL_X, y + FIELD_TEXT, 'label']); parts.push(field(FIELD[0], y, FIELD[2], FIELD[3])); texts.push([v, 'text', VALUE_X, y + FIELD_TEXT, 'value']); });
    texts.push([HOST.hint, 'small', LABEL_X, PY + 226, 'hint']);
    parts.push(wordButton(...HOST_BTN, true)); texts.push(['Host', 'mid', PX + PW / 2, HOST_BTN[1] + HOST_TEXT, 'glow', 'center', 2]);
    texts.push([HOST.address[0], 'small', PX + PW / 2, PY + 306, 'hint', 'center'], [HOST.address[1], 'line', PX + PW / 2, PY + 322, 'value', 'center']);
  }
  if (panel === 'join' || panel === 'settings') {
    const head = HEADS[panel]; parts.push(plate(PX, PY, PW, PH, { full: [W, H], alpha: .96 }), crest(PX + PW / 2, PY));
    texts.push([head, 'mid', PX + PW / 2, HEAD_Y, 'value', 'center', 1]); parts.push(...headRules(head));
    if (panel === 'join') {
      JOIN.fields.forEach(([l, v], i) => { const y = FIELD[1] + i * FIELD_STEP; texts.push([l, 'text', LABEL_X, y + FIELD_TEXT, 'label']); parts.push(field(FIELD[0], y, FIELD[2], FIELD[3])); texts.push([v, 'text', VALUE_X, y + FIELD_TEXT, 'value']); });
      texts.push([JOIN.hint, 'small', LABEL_X, FIELD[1] + 2 * FIELD_STEP + 4, 'hint']);
      parts.push(wordButton(...HOST_BTN, true)); texts.push([JOIN.button, 'mid', PX + PW / 2, HOST_BTN[1] + HOST_TEXT, 'glow', 'center', 2]);
      texts.push([JOIN.last[0], 'small', PX + PW / 2, PY + 186, 'hint', 'center'], [JOIN.last[1], 'line', PX + PW / 2, PY + 202, 'value', 'center']);
    } else {
      SETTINGS.volumes.forEach(([l, v], i) => { const y = FIELD[1] + i * FIELD_STEP; texts.push([l, 'text', LABEL_X, y + FIELD_TEXT, 'label']); parts.push(bar(BAR[0], y + BAR[1], BAR[2], BAR[3], v, AMBER)); texts.push([String(Math.round(v * 100)), 'text', VOL_RIGHT, y + FIELD_TEXT, 'value', 'right']); });
      SETTINGS.choices.forEach(([l, v], k) => { const y = FIELD[1] + (SETTINGS.volumes.length + k) * FIELD_STEP; texts.push([l, 'text', LABEL_X, y + FIELD_TEXT, 'label']); parts.push(field(FIELD[0], y, FIELD[2], FIELD[3])); texts.push(['\u2039', 'text', FIELD[0] + 10, y + FIELD_TEXT, 'label'], [v, 'text', FIELD[0] + FIELD[2] / 2, y + FIELD_TEXT, 'value', 'center'], ['\u203a', 'text', FIELD[0] + FIELD[2] - 10, y + FIELD_TEXT, 'label', 'right']); });
      texts.push([SETTINGS.hint, 'small', LABEL_X, SET_HINT_Y, 'hint']);
      parts.push(wordButton(...DONE_BTN, true)); texts.push([SETTINGS.button, 'mid', PX + PW / 2, DONE_BTN[1] + HOST_TEXT, 'glow', 'center', 2]);
    }
  }
  if (STATUS.includes(panel)) {
    const head = HEADS[panel], Q = { connecting: CONNECTING, refused: REFUSED, lost: LOST }[panel], cx = PX + PW / 2;
    parts.push(plate(PX, PY, PW, PH, { full: [W, H], alpha: .96 }), crest(cx, PY)); texts.push([head, 'mid', cx, HEAD_Y, 'value', 'center', 1]); parts.push(...headRules(head));
    texts.push([Q.top, 'small', cx, TOP_Y, 'hint', 'center'], [ADDRESS, 'line', cx, ADDR_Y, 'value', 'center']);
    if (panel === 'connecting') {
      for (let i = 0; i < Q.dots; i++) parts.push(dot(...dotAt(i), i === litDot));
      texts.push([Q.hint, 'small', cx, WAIT_Y, 'hint', 'center']);
      parts.push(wordButton(...HOST_BTN, false)); texts.push([Q.button, 'mid', cx, HOST_BTN[1] + HOST_TEXT, 'value', 'center', 2]);
    } else {
      wrap(Q.body, 'text', BODY_W).forEach((l, k) => texts.push([l, 'text', cx, BODY_Y + k * BODY_STEP, 'label', 'center']));
      Q.buttons.forEach((b, k) => { const r = SMALL[k], on = k === 0; parts.push(wordButton(...r, on)); texts.push([b, 'mid', r[0] + r[2] / 2, r[1] + HOST_TEXT, on ? 'glow' : 'value', 'center', 2]); });
    }
  }
  return [parts, texts];
}

/* ---------- the pieces ---------- */
/** A still layer of the painting (colour 0 to 255, cover 0 to 1, a value a pixel) as a picture over nothing. */
function stillPicture(C, A) { const P = blank(W, H); for (let k = 0; k < W * H; k++) { if (!A[k]) continue; for (let c = 0; c < 3; c++) P.data[k * 4 + c] = Math.max(0, Math.min(255, Math.round(C[k * 3 + c]))); P.data[k * 4 + 3] = Math.round(A[k] * 255); } return P; }
const PAINT = {
  Door: S => bake([[stillPicture(S.wallC, S.wallA), 0, 0]]),
  Steps: S => bake([[stillPicture(S.frontC, S.frontA), 0, 0]]),
  Light: S => { const P = blank(W, H); for (let k = 0; k < W * H; k++) { P.data[k * 4] = Math.round(Math.min(1, S.rayW[k] * 2) * 255); P.data[k * 4 + 1] = Math.round(S.rayG[k] * 255); P.data[k * 4 + 2] = Math.round(S.dimmed[k] * 255); P.data[k * 4 + 3] = 255; } return { img: P, at: [0, 0] }; },
  Noise: () => { const P = blank(512, 512); for (let k = 0; k < 512 * 512; k++) { const v = Math.round(NOISE[k] * 65535); P.data[k * 4] = v >> 8; P.data[k * 4 + 1] = v & 255; P.data[k * 4 + 3] = 255; } return { img: P, at: [0, 0] }; },
};
const PIECES = {
  Name: () => [name(...NAME)[0]],
  'Name Rule': () => nameRule(name(...NAME)[1]),
  Button: () => [wordButton(...btnAt(0), BTN[2], BTN[3], false)],
  'Button On': () => [wordButton(...btnAt(1), BTN[2], BTN[3], true)],
  Panel: () => [plate(PX, PY, PW, PH, { full: [W, H], alpha: .96 })],
  Crest: () => [crest(PX + PW / 2, PY)],
  'Panel Rules': headRules,
  Field: () => [field(FIELD[0], FIELD[1], FIELD[2], FIELD[3])],
  'Button Host': () => [wordButton(...HOST_BTN, true)],
  'Panel Rules Join': () => headRules('Join game'),
  'Panel Rules Settings': () => headRules('Settings'),
  Bar: () => [bar(BAR[0], FIELD[1] + BAR[1], BAR[2], BAR[3], 0, AMBER, 'empty')],
  'Bar Fill': () => [bar(BAR[0], FIELD[1] + BAR[1], BAR[2], BAR[3], 1, AMBER, 'fill')],
  'Button Panel': () => [wordButton(...HOST_BTN, false)],
  'Button Small': () => [wordButton(...SMALL[1], false)],
  'Button Small On': () => [wordButton(...SMALL[0], true)],
  Dot: () => [dot(...dotAt(1), false)],
  'Dot On': () => [dot(...dotAt(0), true)],
  'Panel Rules Connecting': () => headRules(HEADS.connecting),
  'Panel Rules Refused': () => headRules(HEADS.refused),
  'Panel Rules Lost': () => headRules(HEADS.lost),
};

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const r4 = v => Math.round(v * 1e4) / 1e4;
function layout(at, S) {
  const P = n => ({ file: `${n}.png`, at: at[n] }), face = k => ({ font: FACE[k][0], px: FACE[k][1] }), rel = (n, [x, y]) => [at[n][0] - x, at[n][1] - y];
  return {
    _note: 'Written by scripts/art/ui/main_menu.mjs --pieces: do not edit by hand. The main menu (D197, D250) in the window\'s pixels, 1152 x 648; "at" is a top left corner, and a piece\'s "at" already counts its shadow. Draw in the order of "order"; text last. Text is drawn by Godot: "at" is the top left of the line (the top is the font\'s ascent line), "centre" its top middle; "outline" how far a dark edge reaches out from the letters. Every place and size here is a setting. The menu is one block: in a bigger window the painting would be stretched (not done).',
    size: [W, H],
    order: ['scene', 'sparks', 'Name', 'Name Rule', 'buttons', 'panel', 'text'],
    scene: {
      _note: 'The door at dawn, moving: game/client/screens/menu_scene.gdshader paints the window from these pieces, a port of doorFrames in scripts/art/ui/scenes.mjs (change one, change the other). Time runs from 0 to 1 every "loop_seconds" and 1 meets 0. "door" is the doorway\'s shape (scenes.mjs DOOR): the shader and the dust read it.',
      loop_seconds: LOOP, door: Object.fromEntries(Object.entries(DOOR).map(([k, v]) => [k.toLowerCase(), v])), drift: DRIFT,
      door_piece: P('Door'), steps: P('Steps'), light: P('Light'), noise: { file: 'Noise.png' },
    },
    sparks: {
      _note: 'Added over the painting (blend: add), each frame at time t. Star [i, j, x, y, amp, n, p]: at pixel (i, j), a = amp * (0.55 + 0.45 sin(2 pi (n t + p))) * (1 - smoothstep(0.5, 0.66, cloud)), cloud the painting\'s cloud at (x, y) and t; colour (a, 0.98 a, 0.93 a) / 255 there and (0.28, 0.27, 0.26) a / 255 on the 4 pixels beside it. Dust [x, y, n, p, s]: ph = (n t + p) mod 1, at (x + 9 sin(2 pi (ph + s)), y - 46 ph) rounded to a pixel; a = sin(pi ph)^2 * (0.6 inside the opening, else min(1, max(0.22, 1.9 glow, pool))) * dark * 235, glow, pool and dark the Light piece\'s at that pixel; skipped under 2 or within 2 pixels of the edge; a 5 x 5 spot, (a, 0.92 a, 0.7 a) / 255 times exp(-(u^2 + v^2) / 1.3).',
      stars: S.stars.map(s => [s.i, s.j, r4(s.x), r4(s.y), r4(s.amp), s.n, r4(s.p)]),
      dust: S.motes.map(m => [m.x, m.y, m.n, m.p, m.s]),
    },
    pieces: Object.fromEntries(['Name', 'Name Rule'].map(n => [n, P(n)])),
    buttons: {
      _note: 'One button per word, the first at "first", "step" down to the next. "Button" each, or "Button On" when pointed at or when its panel is open, the word then in "on". A click sends its "says". Its box (for the pointer) is "size" from its corner.',
      first: btnAt(0), step: [0, BTN_STEP], size: [BTN[2], BTN[3]],
      off: { file: 'Button.png', at: rel('Button', btnAt(0)) }, on: { file: 'Button On.png', at: rel('Button On', btnAt(1)) },
      words: MENU, says: SAYS,
      text: { face: 'mid', centre: [BTN[2] / 2, BTN_TEXT], colour: 'value', on: 'glow', outline: 2 },
    },
    panel: {
      _note: '"Host game"\'s panel, shown while it is open (D197): its plate, crest and heading, a field per value with its label, the hint, the Host button (a click sends "host" with the values), and where the others join (D199). Typing in the fields is not done. Esc closes it.',
      name: 'host', rect: PANEL,
      pieces: Object.fromEntries(['Panel', 'Crest', 'Panel Rules'].map(n => [n, P(n)])),
      heading: { text: 'Host game', face: 'mid', centre: [PX + PW / 2, HEAD_Y], colour: 'value', outline: 1 },
      fields: {
        first: [FIELD[0], FIELD[1]], step: [0, FIELD_STEP], piece: { file: 'Field.png', at: rel('Field', [FIELD[0], FIELD[1]]) },
        names: HOST.fields.map(f => f[0]), label: { face: 'text', x: LABEL_X, dy: FIELD_TEXT, colour: 'label' }, value: { face: 'text', x: VALUE_X, dy: FIELD_TEXT, colour: 'value' },
      },
      hint: { text: HOST.hint, face: 'small', at: [LABEL_X, PY + 226], colour: 'hint' },
      host: { piece: P('Button Host'), rect: HOST_BTN, text: { text: 'Host', face: 'mid', centre: [PX + PW / 2, HOST_BTN[1] + HOST_TEXT], colour: 'glow', outline: 2 } },
      address: { text: HOST.address[0], face: 'small', centre: [PX + PW / 2, PY + 306], colour: 'hint', value: { face: 'line', centre: [PX + PW / 2, PY + 322], colour: 'value' } },
    },
    panels: {
      _note: 'The other panels, "Join game" and "Settings": the same plate, crest and place as "panel" (Host game), their own heading rules. A click on Join sends "join" with the address and port; Settings applies each change at once (not done) and Done (or Esc) closes it. Typing and choosing are not done.',
      join: {
        heading: { text: 'Join game', face: 'mid', centre: [PX + PW / 2, HEAD_Y], colour: 'value', outline: 1 }, rules: P('Panel Rules Join'),
        fields: { first: [FIELD[0], FIELD[1]], step: [0, FIELD_STEP], piece: { file: 'Field.png', at: rel('Field', [FIELD[0], FIELD[1]]) }, names: JOIN.fields.map(f => f[0]), label: { face: 'text', x: LABEL_X, dy: FIELD_TEXT, colour: 'label' }, value: { face: 'text', x: VALUE_X, dy: FIELD_TEXT, colour: 'value' } },
        hint: { text: JOIN.hint, face: 'small', at: [LABEL_X, FIELD[1] + 2 * FIELD_STEP + 4], colour: 'hint' },
        button: { piece: P('Button Host'), rect: HOST_BTN, says: 'join', text: { text: JOIN.button, face: 'mid', centre: [PX + PW / 2, HOST_BTN[1] + HOST_TEXT], colour: 'glow', outline: 2 } },
        last: { _note: 'The last address joined, if any.', text: JOIN.last[0], face: 'small', centre: [PX + PW / 2, PY + 186], colour: 'hint', value: { face: 'line', centre: [PX + PW / 2, PY + 202], colour: 'value' } },
      },
      settings: {
        heading: { text: 'Settings', face: 'mid', centre: [PX + PW / 2, HEAD_Y], colour: 'value', outline: 1 }, rules: P('Panel Rules Settings'),
        rows: { _note: 'One row per setting, the first at "first" (its field\'s corner), "step" down to the next: the volumes first, then the choices.', first: [FIELD[0], FIELD[1]], step: [0, FIELD_STEP], label: { face: 'text', x: LABEL_X, dy: FIELD_TEXT, colour: 'label' } },
        volumes: {
          _note: 'A volume, 0 to 1: Bar at the row\'s place plus "bar", then Bar Fill over it cut at x + 2 + (w - 4) * volume (w the bar\'s width); the volume times 100, right-aligned at "number_right".',
          names: SETTINGS.volumes.map(v => v[0]), bar: { dx: 0, dy: BAR[1], size: [BAR[2], BAR[3]] }, empty: { file: 'Bar.png', at: rel('Bar', [BAR[0], FIELD[1] + BAR[1]]) }, fill: { file: 'Bar Fill.png', at: rel('Bar Fill', [BAR[0], FIELD[1] + BAR[1]]) },
          number_right: VOL_RIGHT, number: { face: 'text', dy: FIELD_TEXT, colour: 'value' },
        },
        choices: {
          _note: 'A choice: Field at the row\'s place, the value centred in it, a pointed bracket each side (a click on one steps through "options").',
          names: SETTINGS.choices.map(c => c[0]), options: { Window: ['Windowed', 'Full screen'], Motion: ['Full', 'Reduced'] }, piece: { file: 'Field.png', at: rel('Field', [FIELD[0], FIELD[1]]) },
          value: { face: 'text', centre_dx: FIELD[2] / 2, dy: FIELD_TEXT, colour: 'value' }, arrows: { text: ['\u2039', '\u203a'], face: 'text', left_dx: 10, right_dx: FIELD[2] - 10, dy: FIELD_TEXT, colour: 'label' },
        },
        hint: { text: SETTINGS.hint, face: 'small', at: [LABEL_X, SET_HINT_Y], colour: 'hint' },
        button: { piece: { file: 'Button Host.png', at: [at['Button Host'][0], at['Button Host'][1] + DONE_BTN[1] - HOST_BTN[1]] }, rect: DONE_BTN, says: 'done', text: { text: SETTINGS.button, face: 'mid', centre: [PX + PW / 2, DONE_BTN[1] + HOST_TEXT], colour: 'glow', outline: 2 } },
      },
      ...statusPanels(at, P),
    },
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'dim', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'text', 'line', 'small'].map(k => [k, face(k)])),
      version: { text: VERSION, face: 'small', at: [MX + 8, H - 30], colour: 'dim', outline: 1 },
    },
  };
}

/** The connecting panels in menu.json: "connecting", "refused" and "lost", each the Host panel's plate and crest with its own heading rules. */
function statusPanels(at, P) {
  const cx = PX + PW / 2, rel = (n, [x, y]) => [at[n][0] - x, at[n][1] - y];
  const common = (panel, Q, rules) => ({
    heading: { text: HEADS[panel], face: 'mid', centre: [cx, HEAD_Y], colour: 'value', outline: 1 }, rules: P(rules),
    top: { text: Q.top, face: 'small', centre: [cx, TOP_Y], colour: 'hint' },
    address: { _note: 'The address and port being joined, as "address : port".', face: 'line', centre: [cx, ADDR_Y], colour: 'value' },
  });
  const body = Q => ({ _note: 'Wrapped by the game to "width", each line centred, "step" apart.', text: Q.body, face: 'text', centre: [cx, BODY_Y], width: BODY_W, step: BODY_STEP, colour: 'label' });
  const two = (Q, says) => ({
    _note: 'Two buttons side by side: the first lit (Button Small On), the second not (Button Small), each its word centred; a click sends its "says". Enter is the first, Esc the second.',
    rects: SMALL, says, words: Q.buttons, on: { file: 'Button Small On.png', at: rel('Button Small On', SMALL[0]) }, off: { file: 'Button Small.png', at: rel('Button Small', SMALL[1]) },
    text: { face: 'mid', centre_dx: SMALL_W / 2, dy: HOST_TEXT, colour: 'value', on: 'glow', outline: 2 },
  });
  return {
    connecting: {
      _note: 'Shown after Join is clicked, while the game waits for the host\'s game to answer (D197, D199). The diamonds light one at a time, left to right, "step_seconds" each, round and round; under reduced motion all stay off but the first. Cancel or Esc sends "cancel" and goes back to Join game. An answer closes the menu; no answer in time opens "refused".',
      ...common('connecting', CONNECTING, 'Panel Rules Connecting'),
      dots: { first: dotAt(0), step: [DOT_STEP, 0], count: CONNECTING.dots, step_seconds: CONNECTING.step_seconds, off: { file: 'Dot.png', at: rel('Dot', dotAt(1)) }, on: { file: 'Dot On.png', at: rel('Dot On', dotAt(0)) } },
      hint: { text: CONNECTING.hint, face: 'small', centre: [cx, WAIT_Y], colour: 'hint' },
      button: { piece: P('Button Panel'), rect: HOST_BTN, says: 'cancel', text: { text: CONNECTING.button, face: 'mid', centre: [cx, HOST_BTN[1] + HOST_TEXT], colour: 'value', outline: 2 } },
    },
    refused: {
      _note: 'No game answered at the address (a wrong address, a wrong port, or the host not in the game). Try again joins the same address again ("connecting"); Back opens Join game with the fields as they were.',
      ...common('refused', REFUSED, 'Panel Rules Refused'), body: body(REFUSED), buttons: two(REFUSED, ['retry', 'back']),
    },
    lost: {
      _note: 'The connection dropped in play: the game goes back to the menu with this panel open (D49: the character stays 30 seconds, then leaves the world safe until its player is back). Join again joins the same address ("connecting"); Back closes the panel.',
      ...common('lost', LOST, 'Panel Rules Lost'), body: body(LOST), buttons: two(LOST, ['rejoin', 'back']),
    },
  };
}

/* ---------- the check: the menu from the pieces ---------- */
/** The painting's still parts and noise read back from the pieces: what the game's shader has. */
function fromPieces(dir, J) {
  const pic = f => open(`${dir}/${f}`), N = W * H, S = { x0: 0, y0: 0, w: W, h: H, zoom: 1 };
  const spread = p => { const C = new Float32Array(N * 3), A = new Float32Array(N), d = pic(p.file), [ax, ay] = p.at; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const s = (j * d.w + i) * 4, k = (ay + j) * W + ax + i; for (let c = 0; c < 3; c++) C[k * 3 + c] = d.data[s + c]; A[k] = d.data[s + 3] / 255; } return [C, A]; };
  [S.wallC, S.wallA] = spread(J.scene.door_piece); [S.frontC, S.frontA] = spread(J.scene.steps);
  const L = pic(J.scene.light.file); S.rayW = new Float32Array(N); S.rayG = new Float32Array(N); S.dimmed = new Float32Array(N);
  for (let k = 0; k < N; k++) { S.rayW[k] = L.data[k * 4] / 255 / 2; S.rayG[k] = L.data[k * 4 + 1] / 255; S.dimmed[k] = L.data[k * 4 + 2] / 255; }
  S.stars = J.sparks.stars.map(([i, j, x, y, amp, n, p]) => ({ i, j, x, y, amp, n, p })); S.motes = J.sparks.dust.map(([x, y, n, p, s]) => ({ x, y, n, p, s }));
  const Np = pic(J.scene.noise.file), G = new Float64Array(512 * 512); for (let k = 0; k < G.length; k++) G[k] = (Np.data[k * 4] * 256 + Np.data[k * 4 + 1]) / 65535;
  const nz = (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y); let fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const xa = x0 & 511, xb = (x0 + 1) & 511, ya = (y0 & 511) << 9, yb = ((y0 + 1) & 511) << 9; return (G[ya + xa] * (1 - fx) + G[ya + xb] * fx) * (1 - fy) + (G[yb + xa] * (1 - fx) + G[yb + xb] * fx) * fy; };
  return doorFrames(S, nz);
}
function check(dir, panel, t) {
  const J = JSON.parse(readFileSync(`${dir}/menu.json`, 'utf8')), pic = f => open(`${dir}/${f}`), parts = [], texts = [], put = (f, a) => parts.push([pic(f), ...a]), T = J.text, B = J.buttons, Pn = J.panel;
  const say = (str, s, at = s.at ?? s.centre, align = s.centre ? 'center' : 'left') => texts.push([str, s.face, ...at, s.colour, align, s.outline ?? 0]);
  for (const n of ['Name', 'Name Rule']) put(J.pieces[n].file, J.pieces[n].at);
  const open_ = panel === 'host';
  B.words.forEach((word, i) => {
    const x = B.first[0] + i * B.step[0], y = B.first[1] + i * B.step[1], on = B.says[i] === panel && panel !== 'quit', p = on ? B.on : B.off;
    put(p.file, [x + p.at[0], y + p.at[1]]); texts.push([word, B.text.face, x + B.text.centre[0], y + B.text.centre[1], on ? B.text.on : B.text.colour, 'center', B.text.outline]);
  });
  say(T.version.text, T.version);
  if (open_) {
    for (const n of ['Panel', 'Crest', 'Panel Rules']) put(Pn.pieces[n].file, Pn.pieces[n].at);
    say(Pn.heading.text, Pn.heading);
    const F = Pn.fields; F.names.forEach((l, i) => {
      const x = F.first[0] + i * F.step[0], y = F.first[1] + i * F.step[1]; put(F.piece.file, [x + F.piece.at[0], y + F.piece.at[1]]);
      texts.push([l, F.label.face, F.label.x, y + F.label.dy, F.label.colour], [HOST.fields[i][1], F.value.face, F.value.x, y + F.value.dy, F.value.colour]);
    });
    say(Pn.hint.text, Pn.hint); put(Pn.host.piece.file, Pn.host.piece.at); say(Pn.host.text.text, Pn.host.text);
    say(Pn.address.text, Pn.address); texts.push([HOST.address[1], Pn.address.value.face, ...Pn.address.value.centre, Pn.address.value.colour, 'center']);
  }
  if (panel === 'join' || panel === 'settings') {
    const Q = J.panels[panel]; for (const n of ['Panel', 'Crest']) put(Pn.pieces[n].file, Pn.pieces[n].at); put(Q.rules.file, Q.rules.at); say(Q.heading.text, Q.heading);
    if (panel === 'join') {
      const F = Q.fields; F.names.forEach((l, i) => {
        const x = F.first[0] + i * F.step[0], y = F.first[1] + i * F.step[1]; put(F.piece.file, [x + F.piece.at[0], y + F.piece.at[1]]);
        texts.push([l, F.label.face, F.label.x, y + F.label.dy, F.label.colour], [JOIN.fields[i][1], F.value.face, F.value.x, y + F.value.dy, F.value.colour]);
      });
      say(Q.hint.text, Q.hint); put(Q.button.piece.file, Q.button.piece.at); say(Q.button.text.text, Q.button.text);
      say(Q.last.text, Q.last); texts.push([JOIN.last[1], Q.last.value.face, ...Q.last.value.centre, Q.last.value.colour, 'center']);
    } else {
      const Rw = Q.rows, V = Q.volumes, C = Q.choices, rowY = k => Rw.first[1] + k * Rw.step[1];
      V.names.forEach((l, i) => {
        const y = rowY(i), v = SETTINGS.volumes[i][1], bx = Rw.first[0] + V.bar.dx, by = y + V.bar.dy, end = bx + 2 + (V.bar.size[0] - 4) * v;
        texts.push([l, Rw.label.face, Rw.label.x, y + Rw.label.dy, Rw.label.colour]); put(V.empty.file, [bx + V.empty.at[0], by + V.empty.at[1]]);
        const fx = bx + V.fill.at[0]; parts.push([cut(pic(V.fill.file), i2 => fx + i2 + .5 < end), fx, by + V.fill.at[1]]);
        texts.push([String(Math.round(v * 100)), V.number.face, V.number_right, y + V.number.dy, V.number.colour, 'right']);
      });
      C.names.forEach((l, k) => {
        const y = rowY(V.names.length + k), x = Rw.first[0]; texts.push([l, Rw.label.face, Rw.label.x, y + Rw.label.dy, Rw.label.colour]); put(C.piece.file, [x + C.piece.at[0], y + C.piece.at[1]]);
        texts.push([C.arrows.text[0], C.arrows.face, x + C.arrows.left_dx, y + C.arrows.dy, C.arrows.colour], [SETTINGS.choices[k][1], C.value.face, x + C.value.centre_dx, y + C.value.dy, C.value.colour, 'center'], [C.arrows.text[1], C.arrows.face, x + C.arrows.right_dx, y + C.arrows.dy, C.arrows.colour, 'right']);
      });
      say(Q.hint.text, Q.hint); put(Q.button.piece.file, Q.button.piece.at); say(Q.button.text.text, Q.button.text);
    }
  }
  if (STATUS.includes(panel)) {
    const Q = J.panels[panel]; for (const n of ['Panel', 'Crest']) put(Pn.pieces[n].file, Pn.pieces[n].at); put(Q.rules.file, Q.rules.at); say(Q.heading.text, Q.heading);
    say(Q.top.text, Q.top); say(ADDRESS, Q.address);
    if (panel === 'connecting') {
      const D = Q.dots; for (let i = 0; i < D.count; i++) { const x = D.first[0] + i * D.step[0], y = D.first[1] + i * D.step[1], p = i === litDot ? D.on : D.off; put(p.file, [x + p.at[0], y + p.at[1]]); }
      say(Q.hint.text, Q.hint); put(Q.button.piece.file, Q.button.piece.at); say(Q.button.text.text, Q.button.text);
    } else {
      const Bd = Q.body; wrap(Bd.text, Bd.face, Bd.width).forEach((l, k) => texts.push([l, Bd.face, Bd.centre[0], Bd.centre[1] + k * Bd.step, Bd.colour, 'center']));
      const Bt = Q.buttons; Bt.words.forEach((w, k) => { const r = Bt.rects[k], p = k === 0 ? Bt.on : Bt.off; put(p.file, [r[0] + p.at[0], r[1] + p.at[1]]); texts.push([w, Bt.text.face, r[0] + Bt.text.centre_dx, r[1] + Bt.text.dy, k === 0 ? Bt.text.on : Bt.text.colour, 'center', Bt.text.outline]); });
    }
  }
  return draw(fromPieces(dir, J)(t), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/menu'), t0 = Date.now();
const panel = flag('--panel', 'host'), at = Number(flag('--at', 0)), frames = Number(flag('--frames', 0));
const litDot = Number(flag('--dot', 0));                                   // connecting: which diamond is lit (0 to 2)
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const S = doorStills({ gain }), where = {}, write = (n, { img, at: a }) => { where[n] = a; writePng(`${out}/${n}.png`, img.data, img.w, img.h); };
  for (const [n, make] of Object.entries(PAINT)) write(n, make(S));
  for (const [n, make] of Object.entries(PIECES)) write(n, bake(make()));
  writeFileSync(`${out}/menu.json`, JSON.stringify(layout(where, S), null, '\t') + '\n');
  console.log(`${Object.keys(PAINT).length + Object.keys(PIECES).length} pieces and menu.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/menu.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/main_menu.mjs --pieces`); process.exit(1); }
  const A = check(out, panel, at), [parts, texts] = menu(panel), Bp = draw(doorScene({ gain }).frame(at), parts, texts); let n = 0, worst = 0, box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < A.w * A.h; i++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - Bp.data[i * 4 + c])); if (d > 2) { n++; worst = Math.max(worst, d); const x = i % A.w, y = Math.floor(i / A.w); box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; } }
  save(A, 'prototype/shots/ui-menu-pieces.png', t0, 'No bought art in it.');
  console.log(n ? `${n} pixels differ from the draft by more than 2 (worst ${worst}), within x ${box[0]} to ${box[2]}, y ${box[1]} to ${box[3]}` : 'Same as the draft (no pixel off by more than 2).');
} else {
  const scene = doorScene({ gain }), [parts, texts] = menu(panel);
  if (!frames) save(draw(scene.frame(at), parts, texts), `prototype/shots/ui-menu${panel === 'host' ? '' : panel === 'none' ? '-plain' : '-' + panel}.png`, t0, 'No bought art in it.');
  else {
    const [a, n] = flag('--part', '1/1').split('/').map(Number), from = Math.floor(frames * (a - 1) / n), to = Math.floor(frames * a / n);
    for (let f = from; f < to; f++) await new Promise(next => process.stdout.write(draw(scene.frame(f / frames), parts, texts).data, next));
    console.error(`pictures ${from} to ${to - 1} of ${frames} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
