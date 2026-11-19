// Draft of the main menu (D173, D197 to D199) in the look of the character screen (D240, D241), with the shared draft pieces (pieces.mjs).
// Nothing here is a piece for the game yet. The window is 1152 x 648.
//   Behind: the door at dawn (scenes.mjs) the size of the window: Dawndoor's lone doorway (D108), tall and ruined, the sun coming up over the
//           Long Water (D99) through it. It moves (Michael, 2026-11-18: "more impressive", "animated"): clouds drift, the water glitters, the
//           light through the doorway shimmers, dust drifts in it, grass sways, stars blink. All made by code: no bought art in the picture.
//   Left:   the name in bronze, then Join game, Host game (D197), Settings, Quit. No "new character": nobody chooses who they wake as.
//   Middle: with --panel host, what "Host game" asks: a name for the world, a seed (D136), how many players (about 10), the port,
//           and the address the others on the home network type in (D199).
// New, not decided: everything "Host game" asks and its made-up values, the buttons' order, the version line. Not drawn: "Join game" (an address to type),
// picking a saved world (D27, D182), Settings. In the game the moving parts would be a shader and particles, not frames: not built.
// Usage, from the repo root:
//   node scripts/art/ui/main_menu.mjs [--panel host|none] [--at 0.5]
//       prototype/shots/ui-menu.png, or ui-menu-plain.png without the panel (git-ignored), in a few seconds. --at: the moment of the loop to draw, 0 to 1.
//   node scripts/art/ui/main_menu.mjs --frames 150 [--part 1/2] [--panel none] | ffmpeg -f rawvideo -pix_fmt rgba -s 1152x648 -r 30 -i - \
//       -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p menu.mp4
//       the loop as raw pictures on the output, for ffmpeg to make a film of (150 pictures at 30 a second: 5 seconds, its end meets its start).
//       --part a/n writes only the a-th of n equal parts, so several can be drawn at once and joined after.
import { K, mask, metal, shadow, over } from './kit.mjs';
import { W, H, smooth, room, done, halo, plate, crest, rule, field, heading, wordButton, wordMask, wordWidth, draw, save } from './pieces.mjs';
import { doorScene } from './scenes.mjs';

// The painting is darker behind the menu, and towards the corners.
const gain = (x, y) => (1 - .5 * smooth(640, 90, x) * (1 - .25 * y / H)) * (1 - .3 * Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)) ** 2.4);
/** The game's name in bronze letters. */
function name(x, y, px) {
  const w = wordWidth('Renown', 'AlegreyaSC-Bold', px), A = room(x, y, w + 8, px * 1.1, 16), M = mask(A); wordMask(M, 'Renown', 'AlegreyaSC-Bold', px, x, y);
  const S = halo(M, [255, 190, 110], .28, 9); over(S, shadow(M, .95)); over(S, metal(M, 'bronze', [W, Math.round((y + px) / .34)])); return [done(S), w];
}
const MENU = ['Join game', 'Host game', 'Settings', 'Quit'];
const HOST = { fields: [['World', 'Home'], ['Seed', '48213'], ['Players', '10'], ['Port', '7777']], hint: 'Leave the seed empty for a land nobody has seen.', address: ['Others on your network join at', '192.168.1.20 : 7777'] };

/** Everything that lies over the painting: [parts, texts] for draw(). */
function menu(panel) {
  const parts = [], texts = [], mx = 76, mw = 264, picked = panel === 'host' ? 1 : -1;
  const [title, tw] = name(mx - 4, 62, 96); parts.push(title, rule(mx + tw / 2, mx, 182), rule(mx + tw / 2, mx + tw, 182));
  MENU.forEach((m, i) => { const y = 226 + i * 62, on = i === picked; parts.push(wordButton(mx + 8, y, mw, 46, on)); texts.push([m, 'mid', mx + 8 + mw / 2, y + 11, on ? 'glow' : 'value', 'center', 2]); });
  texts.push(['Renown 0.1  ·  the first slice', 'small', mx + 8, H - 30, 'dim', 'left', 1]);
  if (panel === 'host') {
    const px = 388, py = 214, pw = 318, ph = 352; parts.push(plate(px, py, pw, ph, { full: [W, H], alpha: .96 }), crest(px + pw / 2, py));
    heading(parts, texts, 'Host game', px + pw / 2, py + 20, pw / 2 - 26);
    HOST.fields.forEach(([l, v], i) => { const y = py + 66 + i * 40; texts.push([l, 'text', px + 28, y + 4, 'label']); parts.push(field(px + 118, y, pw - 146, 28)); texts.push([v, 'text', px + 130, y + 4, 'value']); });
    texts.push([HOST.hint, 'small', px + 28, py + 226, 'hint']);
    parts.push(wordButton(px + pw / 2 - 80, py + 250, 160, 42, true)); texts.push(['Host', 'mid', px + pw / 2, py + 259, 'glow', 'center', 2]);
    texts.push([HOST.address[0], 'small', px + pw / 2, py + 306, 'hint', 'center'], [HOST.address[1], 'line', px + pw / 2, py + 322, 'value', 'center']);
  }
  return [parts, texts];
}

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const panel = flag('--panel', 'host'), frames = Number(flag('--frames', 0)), t0 = Date.now(), scene = doorScene({ gain }), [parts, texts] = menu(panel);
if (!frames) save(draw(scene.frame(Number(flag('--at', 0))), parts, texts), `prototype/shots/ui-menu${panel === 'host' ? '' : '-plain'}.png`, t0, 'No bought art in it.');
else {
  const [a, n] = flag('--part', '1/1').split('/').map(Number), from = Math.floor(frames * (a - 1) / n), to = Math.floor(frames * a / n);
  for (let f = from; f < to; f++) await new Promise(next => process.stdout.write(draw(scene.frame(f / frames), parts, texts).data, next));
  console.error(`pictures ${from} to ${to - 1} of ${frames} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
