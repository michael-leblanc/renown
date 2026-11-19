// The main menu (D173, D197 to D199, D250) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// The window is 1152 x 648.
//   Behind: the door at dawn (scenes.mjs) the size of the window: Dawndoor's lone doorway (D108), tall and ruined, the sun coming up over the
//           Long Water (D99) through it. It moves (Michael, 2026-11-18: "more impressive", "animated"): clouds drift, the water glitters, the
//           light through the doorway shimmers, dust drifts in it, grass sways, stars blink. All made by code: no bought art in the picture.
//   Left:   the name in bronze, then Join game, Host game (D197), Settings, Quit. No "new character": nobody chooses who they wake as.
//   Middle: with --panel host, what "Host game" asks: a name for the world, a seed (D136), how many players (about 10), the port,
//           and the address the others on the home network type in (D199).
// New, not decided: everything "Host game" asks and its made-up values, the buttons' order, the version line. Not drawn: "Join game" (an address to type),
// picking a saved world (D27, D182), Settings.
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
//   Field, Button Host             a field for a value, and the panel's lit Host button
//   menu.json                      where every piece and line of text goes, the stars and the dust, the loop's length. Godot reads it.
// Text is drawn by Godot in Alegreya (game/client/art/fonts/), a label gold and its value pale (D241).
// Usage, from the repo root:
//   node scripts/art/ui/main_menu.mjs [--panel host|none] [--at 0.5]
//       prototype/shots/ui-menu.png, or ui-menu-plain.png without the panel (git-ignored), in a few seconds. --at: the moment of the loop to draw, 0 to 1.
//   node scripts/art/ui/main_menu.mjs --frames 150 [--part 1/2] [--panel none] | ffmpeg -f rawvideo -pix_fmt rgba -s 1152x648 -r 30 -i - \
//       -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p menu.mp4
//       the loop as raw pictures on the output, for ffmpeg to make a film of (150 pictures at 30 a second: 5 seconds, its end meets its start).
//       --part a/n writes only the a-th of n equal parts, so several can be drawn at once and joined after.
//   node scripts/art/ui/main_menu.mjs --pieces [--out dir]        the pieces and menu.json, into game/client/art/made/ui/menu/ (about 10 s)
//   node scripts/art/ui/main_menu.mjs --check [--out dir] [--panel host|none] [--at 0.5]
//       puts the menu together from the pieces the way the json says (the painting moved the way the shader moves it), into
//       prototype/shots/ui-menu-pieces.png, and counts the pixels that differ from the draft. Write the pieces first.
import { K, mask, metal, shadow, over, NOISE } from './kit.mjs';
import { W, H, COL, FACE, smooth, room, done, halo, plate, crest, rule, field, wordButton, wordMask, wordWidth, wide, draw, save, open, bake, blank } from './pieces.mjs';
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
const HOST = { fields: [['World', 'Home'], ['Seed', '48213'], ['Players', '10'], ['Port', '7777']], hint: 'Leave the seed empty for a land nobody has seen.', address: ['Others on your network join at', '192.168.1.20 : 7777'] };

// Where everything goes, in the window's pixels (1152 x 648). The draft and the pieces both read this.
const MX = 76, MW = 264, NAME = [MX - 4, 62, 96], RULE_Y = 182;           // the menu's left edge and the buttons' width; the name's top left and size
const BTN = [MX + 8, 226, MW, 46], BTN_STEP = 62, BTN_TEXT = 11;         // the first button, from one to the next, its word's top from the button's
const PANEL = [388, 214, 318, 352];                                      // "Host game"'s plate
const [PX, PY, PW, PH] = PANEL, HEAD_Y = PY + 20, HEAD_HALF = PW / 2 - 26;
const FIELD = [PX + 118, PY + 66, PW - 146, 28], FIELD_STEP = 40, LABEL_X = PX + 28, VALUE_X = PX + 130, FIELD_TEXT = 4;
const HOST_BTN = [PX + PW / 2 - 80, PY + 250, 160, 42], HOST_TEXT = 9;
const btnAt = i => [BTN[0], BTN[1] + i * BTN_STEP];
const nameRule = tw => [rule(MX + tw / 2, MX, RULE_Y), rule(MX + tw / 2, MX + tw, RULE_Y)];
const headRules = () => { const w = wide('Host game', 'mid'), cx = PX + PW / 2, ry = HEAD_Y + FACE.mid[1] * .62; return [rule(cx - w / 2 - 10, cx - HEAD_HALF, ry), rule(cx + w / 2 + 10, cx + HEAD_HALF, ry)]; };

/** Everything that lies over the painting: [parts, texts] for draw(). */
function menu(panel) {
  const parts = [], texts = [], picked = panel === 'host' ? 1 : -1;
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
    text: {
      colours: Object.fromEntries(['label', 'value', 'hint', 'dim', 'glow'].map(k => [k, hex(COL[k])]).concat([['outline', hex(COL.dark)]])),
      faces: Object.fromEntries(['mid', 'text', 'line', 'small'].map(k => [k, face(k)])),
      version: { text: VERSION, face: 'small', at: [MX + 8, H - 30], colour: 'dim', outline: 1 },
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
    const x = B.first[0] + i * B.step[0], y = B.first[1] + i * B.step[1], on = open_ && B.says[i] === Pn.name, p = on ? B.on : B.off;
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
  return draw(fromPieces(dir, J)(t), parts, texts);
}

/* ---------- the command line ---------- */
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/menu'), t0 = Date.now();
const panel = flag('--panel', 'host'), at = Number(flag('--at', 0)), frames = Number(flag('--frames', 0));
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
  if (!frames) save(draw(scene.frame(at), parts, texts), `prototype/shots/ui-menu${panel === 'host' ? '' : '-plain'}.png`, t0, 'No bought art in it.');
  else {
    const [a, n] = flag('--part', '1/1').split('/').map(Number), from = Math.floor(frames * (a - 1) / n), to = Math.floor(frames * a / n);
    for (let f = from; f < to; f++) await new Promise(next => process.stdout.write(draw(scene.frame(f / frames), parts, texts).data, next));
    console.error(`pictures ${from} to ${to - 1} of ${frames} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
