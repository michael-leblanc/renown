// Oldscar under its cliff as a full painting, made by code alone: scarPaint(x, y) gives the colour of one point. A still.
// It is the cliff Michael accepted on branch art/oldscar-cliff (the tall one, CLIFF_TALL=1 in scripts/art/cliff_pieces.mjs), seen from the
// ground in front of it instead of from above: upright columns cut in flat faces, each face one flat tone, dark gaps between them, slanted
// pale tops; a lumpy rock lip along the rim; and the scar as that cliff has it: a cleft leaning about 28 degrees that starts narrow at the
// ground, widens, pinches, widens again and notches the rim, dark in steps towards its middle, with five thin cracks off it.
// The rock's tones are that cliff's own (the desert tileset's, D235). Not layers: Michael turned layered rock down ("like a wall or ruins").
// Nobody goes inside the scar (D234): nothing leads to it, and the town stands in front of its foot.
// The light is the painting's own: the last sun on the upper cliff, from behind the eye; the cliff's foot and the town already in shade.
// Painted in the game window's pixels (1152 x 648). No bought art, nothing to load.
import { vnoise } from './kit.mjs';

const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const stops = (list, t) => { let k = 1; while (k < list.length - 1 && t > list[k][0]) k++; return mix(list[k - 1][1], list[k][1], clamp((t - list[k - 1][0]) / (list[k][0] - list[k - 1][0]))); };
/** Noise in straight runs, 0 to 1: faceted, like the rock. */
const lin = (t, seed) => { const k = Math.floor(t), f = t - k; return hash(k, seed) * (1 - f) + hash(k + 1, seed) * f; };

const ROCK = [[205, 188, 153], [191, 166, 118], [173, 146, 100], [164, 137, 92], [145, 118, 76], [131, 105, 66], [108, 87, 55], [87, 69, 45], [58, 45, 30], [43, 33, 23]];   // the cliff's tones, pale to dark
const SAND = [192, 174, 138], TOP0 = 182, FOOT = 500, RISE = FOOT - TOP0;
const SKY = [[0, [22, 26, 62]], [.5, [78, 66, 118]], [.82, [196, 126, 134]], [1, [236, 170, 140]]];
const cliffTop = x => TOP0 + 26 * (vnoise(x / 140 + 3, 1.7) - .5) + 10 * (vnoise(x / 37 + 8, 4.4) - .5);

/* ---------- the columns ---------- */
/** A row of columns side by side, of uneven widths. Each has a main face and a narrow side face turned from the light, a slanted top, and a height. */
function row(seed, least, most) {
  const cols = []; for (let x = -260, n = 0; x < 1500; n++) { const w = least + (most - least) * hash(n, seed); cols.push({ x0: x, w, n, tone: 2 + Math.floor(hash(n, seed + 1) * 2.99), side: .14 + .2 * hash(n, seed + 2), left: hash(n, seed + 3) < .5, slant: (hash(n, seed + 4) - .5) * 1.5, tall: hash(n, seed + 5), cap: 7 + 9 * hash(n, seed + 6), there: hash(n, seed + 7) }); x += w; }
  return cols;
}
const find = (cols, x) => { let a = 0, b = cols.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (cols[m].x0 <= x) a = m; else b = m - 1; } return cols[a]; };
const WALL = row(11, 18, 44), PILLARS = row(23, 22, 50), LOW = row(37, 26, 58);     // the face behind; pillars standing in front of it; short ones at its foot
const pillarTop = (p, x) => FOOT - RISE * (.3 + .58 * p.tall) + p.slant * (x - p.x0 - p.w / 2), lowTop = (l, x) => FOOT - RISE * (.05 + .2 * l.tall) + l.slant * .6 * (x - l.x0 - l.w / 2);
/** Which tone a column shows at a point: `top` is where its slanted top is, there. */
function face(c, x, y, top) {
  const xin = x - c.x0, f = xin / c.w, turned = c.left ? f < c.side : f > 1 - c.side; let t = c.tone + (turned ? 2 : 0);
  if (c.w - xin < 2.4) return 7; if (xin < 1.4) t -= 1;                                                 // the dark gap at its right; its left edge catches the light
  if (y - top < c.cap * (turned ? .55 : 1)) return vnoise(x / 1.2, y / 1.2) > .8 ? 0 : 1;              // its cut top: pale, speckled
  if (vnoise(x / 1.4 + c.n * 9.1, y / 60 + c.n) > .7) t += 1;                                           // grain, running down
  return clamp(t, 1, 7);
}

/* ---------- the scar ---------- */
const CLEFT = { x: 462, run: 190, wide: [7, 16, 25, 24, 14, 10, 17, 24, 21, 27, 27] };      // where it meets the ground, how far it leans over by the rim, half its width at nine heights
const bend = k => k <= 0 ? 0 : (hash(k, 71) - .5) * 30, girth = k => CLEFT.wide[clamp(k, 0, 10)] * (.85 + .3 * hash(k, 72));
/** The cleft at a point: how far up it (0 at the ground, 1 at the rim), how far across from its middle, half its width there. It runs in straight stretches. */
function cleftAt(x, y) { const h = (FOOT - y) / RISE, s = clamp(h, 0, 1.25) * 8, k = Math.floor(s), f = s - k; return [h, x - (CLEFT.x + h * CLEFT.run + bend(k) * (1 - f) + bend(k + 1) * f), girth(k) * (1 - f) + girth(k + 1) * f]; }
const RIMX = CLEFT.x + CLEFT.run + bend(8), RIMW = girth(8);
// Thin cracks off the cleft: how far up it, which side, the way each runs (degrees: 0 right, 90 down), how long.
const CRACKS = [[.2, -1, 205, 46], [.37, 1, -28, 58], [.55, -1, 160, 40], [.7, 1, -50, 52], [.88, -1, 215, 44]].map(([h, side, turn, len], n) => { const y = FOOT - h * RISE, [, across, half] = cleftAt(0, y); return { x: -across + side * half * .8, y, cos: Math.cos(turn * Math.PI / 180), sin: Math.sin(turn * Math.PI / 180), len, n }; });

/* ---------- the town ---------- */
const HOUSES = [                                            // flat-roofed houses, back row first: left, width, height, foot
  [386, 46, 34, 512], [440, 38, 50, 514], [452, 22, 66, 514], [486, 54, 30, 512], [548, 40, 58, 516], [596, 60, 36, 514], [612, 26, 54, 514], [664, 36, 46, 512], [706, 52, 32, 514], [764, 40, 44, 512],
  [352, 50, 36, 532], [412, 58, 40, 532], [498, 48, 52, 536], [510, 24, 70, 536], [566, 66, 38, 534], [650, 50, 48, 536], [716, 44, 34, 532], [772, 56, 42, 534]];
const FIRES = [[476, 538], [634, 541], [704, 537], [556, 520]];

export const SCAR = { CX: 576, CY: 330, MX: CLEFT.x + CLEFT.run / 2, MY: FOOT - RISE * .52 };     // the middle of what a round cut should show; the cleft's own middle, for a small one
/** The colour of one point of Oldscar as the sun goes down. */
export function scarPaint(x, y) {
  const t = clamp(y / 250), cl = vnoise(x / 150 + 2, y / 26 + 4) * .65 + vnoise(x / 50, y / 10 + 1) * .35, cloud = smooth(.54, .7, cl) * smooth(.1, .4, t) * .55;
  let c = mix(stops(SKY, t), mix([124, 100, 146], [255, 200, 166], smooth(.3, .9, t)), cloud), solid = false, lamp = null;
  if (y < 130) { const cx = Math.floor(x / 22), cy = Math.floor(y / 22); if (hash(cx, cy) > .55 && Math.hypot(x - (cx + hash(cx + .3, cy)) * 22, y - (cy + hash(cx, cy + .7)) * 22) < .9) c = mix(c, [236, 232, 220], (.3 + .7 * hash(cx + 9, cy + 4)) * (1 - y / 130) * (1 - cloud * 1.8)); }
  const foot = FOOT + (vnoise(x / 60 + 12, 9.1) - .5) * 8, rim = cliffTop(x) + 5 * vnoise(x / 14, 3.3) + Math.max(0, 26 * (1 - Math.abs(x - RIMX) / (RIMW + 9)));     // the rim dips where the scar notches it
  if (y > rim && y <= foot) {
    solid = true; let tone; const lip = 7 + 5 * vnoise(x / 9, 8.1);
    if (y - rim < lip) tone = vnoise(x / 3, 5.5) > .86 ? 6 : vnoise(x / 22, 1.2) > .5 ? 2 : 3;          // the rock top's edge, hanging over a little
    else if (y - rim < lip + 5) tone = 7;                                                                // its shade on the face
    else {
      tone = face(find(WALL, x), x, y, -1e9);
      const p = find(PILLARS, x), up = p.there > .42 && y >= pillarTop(p, x), q = find(PILLARS, x - 4); if (up) tone = face(p, x, y, pillarTop(p, x));
      else if (q !== p && q.there > .42 && y >= pillarTop(q, q.x0 + q.w)) tone = 7;                      // a pillar's shade on the face behind it
      const l = find(LOW, x); if (l.there > .55 && y >= lowTop(l, x)) tone = face(l, x, y, lowTop(l, x));
    }
    for (const k of CRACKS) { const px = x - k.x, py = y - k.y, along = px * k.cos + py * k.sin, off = -px * k.sin + py * k.cos; if (along > 0 && along < k.len && Math.abs(off - 5 * (lin(along / 9, 90 + k.n) - .5)) < 1.3 * (1 - along / k.len) + .45) tone = 7; }
    const [h, across, half] = cleftAt(x, y), edge = half * (.82 + .4 * lin(h * 26, across < 0 ? 81 : 82)), d = Math.abs(across) / edge;
    if (d < 1) tone = across > 0 ? (d > .62 ? 6 : d > .36 ? 8 : 9) : (d > .8 ? 7 : d > .5 ? 8 : 9);      // the scar: darker in steps towards its middle, its lower side a little paler
    c = ROCK[tone];
  } else if (y > foot) { solid = true; c = SAND.map(v => v * (y - foot < 9 ? .78 : Math.sin(y * .9 + 7 * vnoise(x / 60, y / 18)) > .93 ? .93 : 1)); }      // sand: the cliff's shade at its foot, wind ridges
  const cell = Math.floor(x / 8), size = 3 + 6 * hash(cell, 91), by = foot + 2 + 8 * hash(cell, 94);                                                        // rock fallen at its foot
  if (hash(cell, 92) > .5 && Math.abs(x - (cell + .5) * 8 - (hash(cell, 93) - .5) * 4) < size / 2 && by - y >= 0 && by - y < size) { solid = true; c = ROCK[by - y > size * .55 ? 1 : 4]; }
  if (y > 440 && y < 545) for (const [hx, hw, hh, fy] of HOUSES) {
    if (x < hx || x > hx + hw || y < fy - hh || y > fy) continue;
    const k = hash(hx, hh), up = fy - y; solid = true; lamp = null; c = ROCK[k > .5 ? 3 : 4].map(v => v * (.86 + .22 * up / hh));
    if (hh - up < 2.6) c = ROCK[1]; else if (hh - up > 5 && hh - up < 7.2 && (x - hx) % 8 < 2.2) c = ROCK[7];                                              // the roof's edge; beam ends under it
    const wx = hx + hw * (.22 + .2 * k), wy = fy - hh * .58; if (hw > 30 && Math.abs(x - wx) < 2.6 && Math.abs(y - wy) < 3.6) { if (k > .25) lamp = [255, 206, 120]; else c = ROCK[8]; }   // a window, lit or not
    if (hw > 30 && Math.abs(x - hx - hw * .66) < 3.6 && up < 14) { if (k > .6) lamp = [255, 182, 96]; else c = ROCK[9]; }                                  // a doorway
  }
  if (solid) { const sh = smooth(-20, 20, y - (404 + 12 * Math.sin(x / 150 + 1))); c = [c[0] * (1.05 - .5 * sh), c[1] * (.93 - .46 * sh), c[2] * (.78 - .2 * sh)]; }   // the last sun above, shade below
  if (lamp) c = lamp;
  for (const [fx, fy] of FIRES) { const d2 = (x - fx) ** 2 + ((y - fy) * 1.5) ** 2; c = mix(c, [255, 176, 88], Math.exp(-d2 / 260) * .55); if (d2 < 5) c = [255, 232, 170]; }
  return c;
}
