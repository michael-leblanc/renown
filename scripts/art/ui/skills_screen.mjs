// Drafts of the Skills screen (D20, D125, D140, D151, D166) in the look of the character screen (D240, D241), with the screen kit.
// Three layouts to choose from; nothing here is a piece for the game yet. Every number shown is made up.
//   a  "ledger": one row per skill, a medallion, its name, a bar to 100 and the number; Weapons and Defence as two sections.
//   b  "rack":   a tall card per skill hanging from a steel rod, filled with warm light up to its value; the picked card explained below.
//   c  "stage":  the character on a lit stage at the left; the skills as bronze rings that fill to their value.
// Usage, from the repo root (a few seconds each):
//   node scripts/art/ui/skills_screen.mjs [--layout a|b|c|all] [--scale 2]
//       prototype/shots/ui-skills-<layout>.png (git-ignored). Over the game's grass, and c holds the Creator character:
//       bought art, never commit the pictures.
import { K, area, mask, layer, each, vnoise, box, ellipse, roundBox, poly, line, texture, metal, shadow, over, shrink } from './kit.mjs';
import { font, textWidth, drawText } from './text.mjs';
import { PIECES, FONTS, paste, blank, character, shot } from './character_screen.mjs';
import { writePng } from '../png.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = 620, H = 760, FULL = [W, H];
const COL = { label: [196, 160, 98], value: [242, 234, 214], hint: [110, 104, 94] };   // D241, and the character screen's slot-name grey
const FACE = { heading: ['AlegreyaSC-Bold', 20], big: ['AlegreyaSC-Bold', 30], number: ['AlegreyaSC-Bold', 17], title: ['AlegreyaSC-Bold', 16], line: ['Alegreya-Bold', 12] };

// The made-up character: a Soldier woke with 30 in Swords and Shield (D152, D166) and has used them since. Swords just rose.
const SKILLS = [['Swords', 41], ['Axes', 3], ['Maces', 0], ['Spears', 0], ['Bows', 2], ['Unarmed', 5], ['Shield', 36], ['Dodge', 7]];
const WEAPONS = SKILLS.slice(0, 6), DEFENCE = SKILLS.slice(6), RISEN = 'Swords', TOTAL = SKILLS.reduce((s, [, v]) => s + v, 0), CAP = 500;   // the total cap's number is not chosen (D140)

/* ---------- small pieces, each made where it goes ---------- */
const plain = (M, rgb) => { const L = layer(M); each(M, (x, y, i) => { if (M.m[i]) { L.c[i * 3] = rgb[0]; L.c[i * 3 + 1] = rgb[1]; L.c[i * 3 + 2] = rgb[2]; L.a[i] = 1; } }); return L; };
/** A skill's sign, drawn into mask M around X, Y (big pixels), s big pixels to one of its own units (about 24 across). */
function sign(M, name, X, Y, s) {
  const P = (x, y) => [X + x * s, Y + y * s], L = (a, b, c, d, w) => line(M, ...P(a, b), ...P(c, d), Math.max(1, Math.trunc(w * 1.35 * s))), E = (a, b, c, d, wd = 0, v = 255, keep = null) => ellipse(M, ...P(a, b), ...P(c, d), wd ? Math.max(1, Math.trunc(wd * s)) : 0, v, keep);
  if (name === 'Swords') { L(-9, 9, 9, -9, 2.6); L(-8, 2, -2, 8, 2.2); E(-11.5, 9.5, -8.5, 12.5); }
  if (name === 'Axes') { L(-9, 10, 5, -7, 2.2); poly(M, [P(1, -11), P(10, -9), P(12, 0), P(5, -3)]); }
  if (name === 'Maces') { L(-9, 10, 2, -2, 2.2); E(-1, -10, 9, 0); for (const [a, b] of [[4, -13], [12, -5], [4, 3], [-4, -5]]) E(a - 1.6, b - 1.6, a + 1.6, b + 1.6); }
  if (name === 'Spears') { L(-11, 11, 6, -6, 1.6); poly(M, [P(11, -11), P(3, -8), P(5, -5), P(8, -3)]); }
  if (name === 'Bows') { E(-10, -12, 6, 12, 2.4, 255, dx => dx <= 0); L(-2, -11, -2, 11, .8); L(-9, 0, 10, 0, 1.4); poly(M, [P(12, 0), P(7, -3), P(7, 3)]); }
  if (name === 'Unarmed') {
    roundBox(M, ...P(-8, -3), ...P(7, 9), 3 * s); for (let f = 0; f < 4; f++) E(-8 + f * 3.8, -8, -3.6 + f * 3.8, -1.5);
    for (let f = 1; f < 4; f++) L(-8 + f * 3.8, -6, -8 + f * 3.8, 0, .9, 0); poly(M, [P(-10, 0), P(-6, -2), P(-3, 4), P(-7, 6)]);
    for (let f = 1; f < 4; f++) line(M, ...P(-8 + f * 3.8, -7), ...P(-8 + f * 3.8, -1), Math.max(1, Math.trunc(.9 * s)), 0);
  }
  if (name === 'Shield') { E(-10, -10, 10, 10); E(-7.5, -7.5, 7.5, 7.5, 1.2, 0); E(-3, -3, 3, 3); }
  if (name === 'Dodge') {                                 // an arrow that curves round
    E(-10, -9, 8, 13, 2.4, 255, (dx, dy) => dy < 0 && dx > -14 * s);
    poly(M, [P(9, 3), P(4, -2), P(13, -3)]); L(-11, 6, -5, 6, 1.4); L(-12, 10, -6, 10, 1.4);
  }
}
/** A bronze medallion with a skill's sign: centre cx, cy, radius r (screen pixels). */
function medal(name, cx, cy, r) {
  const A = area(cx - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2, 8), disc = mask(A), M = mask(A), X = cx * K, Y = cy * K, R = r * K;
  ellipse(disc, X - R, Y - R, X + R, Y + R); ellipse(M, X - R, Y - R, X + R, Y + R, Math.trunc(2.5 * K * r / 19)); sign(M, name, X, Y, K * r / 19);
  return [shrink(over(plain(disc, [26, 24, 22]), metal(M, 'bronze', FULL))), cx - r - 1, cy - r - 1];
}
/** A bar to 100: a dark trough with a worn steel edge, filled in bronze up to `v`. */
function bar(x, y, w, h, v) {
  const A = area(x, y, w, h, 4), trough = mask(A), edge = mask(A), fill = mask(A);
  roundBox(trough, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, h * K / 2); roundBox(edge, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, h * K / 2, K);
  const L = plain(trough, [10, 12, 12]);
  if (v > 0) { roundBox(fill, (x + 2) * K, (y + 2) * K, (x + 2 + (w - 4) * v / 100) * K - 1, (y + h - 2) * K - 1, (h - 4) * K / 2); over(L, metal(fill, 'bronze', FULL)); }
  over(L, metal(edge, 'steel', FULL, .35));
  return [shrink(L), x, y];
}
/** A thin steel rule. */
function rule(x0, x1, y) { const A = area(x0, y - 2, x1 - x0, 4, 4), M = mask(A); box(M, x0 * K, y * K, x1 * K, y * K + 2 * K - 1); return [shrink(over(shadow(M), metal(M, 'steel', FULL, .35))), x0, y - 2]; }
/** A sagging steel rod things hang from. */
function rod(x0, x1, y, sag) {
  const A = area(x0 - 4, y - 4, x1 - x0 + 8, sag + 12, 6), M = mask(A);
  for (let X = x0 * K; X <= x1 * K; X++) { const t = (X - x0 * K) / ((x1 - x0) * K), yy = (y + Math.sin(t * Math.PI) * sag) * K; box(M, X, yy, X, yy + 3 * K - 1); }
  for (const xe of [x0, x1]) ellipse(M, (xe - 4) * K, (y - 3) * K, (xe + 4) * K, (y + 5) * K);
  return [shrink(over(shadow(M), metal(M, 'steel', FULL, .35))), x0 - 4, y - 4];
}
/** A dark inset panel with a steel edge. */
function panel(x, y, w, h) {
  const A = area(x, y, w, h, 4), inside = mask(A), edge = mask(A); roundBox(inside, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, 6 * K); roundBox(edge, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, 6 * K, Math.trunc(1.5 * K));
  const L = layer(A); texture(L, [16, 20, 21], (X, Y) => inside.m[(Y - A.y) * A.w + X - A.x]); over(L, metal(edge, 'steel', FULL, .35)); return [shrink(L), x, y];
}
/** A skill card: dark, filled from the bottom with the stage's warm light up to `v`, with the slots' gold edge (brighter when picked). */
function card(x, y, w, h, v, picked) {
  const A = area(x, y, w, h), L = layer(A), M = mask(A), level = (y + h - 6 - (h - 12) * v / 100) * K; box(M, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1);
  each(A, (X, Y, i) => {
    const r = Math.hypot((X - (x + w / 2) * K) / (w / 2 * K), (Y - (y + h * .4) * K) / (h / 2 * K)), n = (vnoise(X / (4 * K), Y / (4 * K)) - .5) * 8, lit = Y >= level ? .55 + .45 * vnoise(X / (24 * K) + Math.sin(Y / (30 * K)), Y / (24 * K)) : 0;
    const base = [26, 30, 32].map(c => c * (1.25 - .45 * r)), warm = [96, 62, 40];
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = Math.max(0, Math.min(255, base[c] + lit * warm[c] + n)); L.a[i] = 1;
  });
  const edge = mask(A), inner = mask(A), surface = mask(A);
  box(edge, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1); box(edge, x * K + Math.trunc(1.5 * K), y * K + Math.trunc(1.5 * K), (x + w) * K - 1 - Math.trunc(1.5 * K), (y + h) * K - 1 - Math.trunc(1.5 * K), 0);
  box(inner, x * K + 2 * K, y * K + 2 * K, (x + w) * K - 1 - 2 * K, (y + h) * K - 1 - 2 * K); box(inner, x * K + 3 * K, y * K + 3 * K, (x + w) * K - 1 - 3 * K, (y + h) * K - 1 - 3 * K, 0);
  if (v > 0) box(surface, (x + 4) * K, level, (x + w - 4) * K - 1, level + K - 1);
  over(L, plain(surface, [214, 170, 98])); over(L, plain(edge, (picked ? [222, 190, 120] : [150, 130, 96]).map(c => c * 200 / 255))); over(L, plain(inner, [0, 0, 0]));
  return [shrink(L), x, y];
}
/** A ring that fills clockwise from the top to `v`, round a medallion: radius r, the ring `wd` wide. */
function ring(cx, cy, r, wd, v) {
  const A = area(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4, 6), track = mask(A), fill = mask(A), rim = mask(A), X = cx * K, Y = cy * K, R = r * K;
  ellipse(track, X - R, Y - R, X + R, Y + R, wd * K); ellipse(rim, X - R, Y - R, X + R, Y + R, K); ellipse(rim, X - R + wd * K, Y - R + wd * K, X + R - wd * K, Y + R - wd * K, K);
  const turn = (dx, dy) => (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  if (v > 0) ellipse(fill, X - R + K, Y - R + K, X + R - K, Y + R - K, (wd - 2) * K, 255, (dx, dy) => turn(dx, dy) <= v * 3.6);
  const L = plain(track, [10, 12, 12]); over(L, metal(fill, 'bronze', FULL)); over(L, metal(rim, 'steel', FULL, .35)); return [shrink(L), cx - r - 2, cy - r - 2];
}
/** A stage like the character screen's: dark, with a pool of warm smoky light at lx, ly reaching rx, ry. */
function stage(x, y, w, h, [lx, ly, rx, ry]) {
  const L = layer(area(x, y, w, h)), dark = [22, 17, 14], warm = [96, 62, 40];
  each(L, (X, Y, i) => {
    const glow = Math.max(0, 1 - Math.hypot((X - lx * K) / (rx * K), (Y - ly * K) / (ry * K))) ** 1.6, smoke = vnoise(X / (30 * K) + Math.sin(Y / (40 * K)), Y / (30 * K));
    for (let c = 0; c < 3; c++) L.c[i * 3 + c] = Math.floor(dark[c] + glow * (.75 + .5 * smoke) * warm[c]); L.a[i] = 1;
  });
  return [shrink(L), x, y];
}
/** The small gold mark beside a skill that just rose. */
function risen(x, y) { const A = area(x, y, 10, 9, 2), M = mask(A); poly(M, [[(x + 5) * K, y * K], [(x + 10) * K, (y + 8) * K], [x * K, (y + 8) * K]]); return [shrink(plain(M, COL.label)), x, y]; }

/* ---------- the three layouts ---------- */
function draw(parts, texts) {
  const S = blank(W, H); paste(S, PIECES.Frame(), 0, 0);
  for (const [p, x, y] of parts) paste(S, p, x, y);
  for (const [str, k, x, y, colour, align = 'left'] of texts) {
    const F = font(join(FONTS, `${FACE[k][0]}.woff`)), px = FACE[k][1], wd = textWidth(F, str, px);
    drawText(S.data, W, align === 'right' ? x - wd : align === 'center' ? x - wd / 2 : x, y, str, F, px, COL[colour]);
  }
  return S;
}
const header = (x0, x1, y) => [['Skills', 'heading', x0, y, 'value'], [`${TOTAL} / ${CAP}`, 'title', x1, y + 3, 'value', 'right'], ['Total', 'title', x1 - textWidth(font(join(FONTS, 'AlegreyaSC-Bold.woff')), `${TOTAL} / ${CAP}`, 16) - 8, y + 3, 'label', 'right']];
const HINT = 'Skills rise as you use them. Intellect makes them rise faster.';

function ledger() {
  const parts = [rule(30, 590, 76)], texts = [...header(40, 580, 40)];
  let y = 92;
  for (const [group, list] of [['Weapons', WEAPONS], ['Defence', DEFENCE]]) {
    texts.push([group, 'title', 40, y, 'label']); y += 28;
    for (const [name, v] of list) {
      parts.push(medal(name, 62, y + 21, 19), bar(98, y + 28, 482, 9, v)); texts.push([name, 'title', 98, y + 4, 'label'], [String(v), 'number', 580, y + 3, 'value', 'right']);
      if (name === RISEN) parts.push(risen(580 - 30, y + 8));
      y += 64;
    }
    y += 6;
  }
  texts.push([HINT, 'line', W / 2, 712, 'hint', 'center']);
  return draw(parts, texts);
}
function rack() {
  const parts = [rule(30, 590, 76)], texts = [...header(40, 580, 40)], cw = 124, ch = 192, xs = i => 38 + (i % 4) * 140, ys = i => 108 + Math.floor(i / 4) * 222;
  for (const r of [0, 1]) parts.push(rod(30, 590, ys(r * 4) - 10, 6));
  SKILLS.forEach(([name, v], i) => {
    const x = xs(i), y = ys(i); parts.push(card(x, y, cw, ch, v, name === RISEN), medal(name, x + cw / 2, y + 40, 22));
    texts.push([name, 'title', x + cw / 2, y + 72, 'label', 'center'], [String(v), 'big', x + cw / 2, y + 94, 'value', 'center']);
    if (name === RISEN) parts.push(risen(x + cw / 2 + 24, y + 102));
  });
  parts.push(panel(30, 556, 560, 140));
  texts.push(['Swords', 'heading', 50, 572, 'value'], ['41', 'heading', 570, 572, 'value', 'right'],
    ['Rises when you fight with a sword.', 'line', 50, 606, 'value'], ['Strength', 'line', 50, 628, 'label'], ['14 adds to its damage', 'line', 120, 628, 'value'],
    ['Agility', 'line', 50, 648, 'label'], ['11 helps it hit', 'line', 120, 648, 'value'], ['Woke with', 'line', 50, 668, 'label'], ['30, as a Soldier', 'line', 120, 668, 'value'],
    [HINT, 'line', W / 2, 716, 'hint', 'center']);
  return draw(parts, texts);
}
function rings() {
  const parts = [stage(22, 22, 220, 716, [132, 300, 150, 260])], texts = [...header(266, 580, 40)], body = character(4);
  parts.push([body, Math.trunc(132 - body.w / 2), 400 - body.h], rule(256, 590, 76));
  texts.push(['Human', 'heading', 132, 440, 'value', 'center']);
  [['Background', 'Soldier'], ['Intellect', '9']].forEach(([l, v], i) => texts.push([l, 'line', 44, 680 + i * 19, 'label'], [v, 'line', 128, 680 + i * 19, 'value']));
  const cx = i => 352 + (i % 2) * 160;
  let y = 92;
  for (const [group, list] of [['Weapons', WEAPONS], ['Defence', DEFENCE]]) {
    texts.push([group, 'title', 266, y, 'label']); y += 24;
    list.forEach(([name, v], i) => {
      const x = cx(i), cy = y + 44 + Math.floor(i / 2) * 140;
      parts.push(ring(x, cy, 40, 7, v), medal(name, x, cy, 26)); texts.push([String(v), 'number', x, cy + 46, 'value', 'center'], [name, 'line', x, cy + 66, 'label', 'center']);
      if (name === RISEN) parts.push(risen(x + 20, cy + 50));
    });
    y += Math.ceil(list.length / 2) * 140 - 4;
  }
  return draw(parts, texts);
}

const LAYOUTS = { a: ['ledger', ledger], b: ['rack', rack], c: ['stage', rings] };
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, which = flag('--layout', 'all'), scale = +flag('--scale', 2);
for (const k of which === 'all' ? Object.keys(LAYOUTS) : [which]) {
  const t0 = Date.now(), out = `prototype/shots/ui-skills-${k}.png`, p = shot(LAYOUTS[k][1](), scale); mkdirSync(dirname(out), { recursive: true }); writePng(out, p.data, p.w, p.h);
  console.log(`${out} (${LAYOUTS[k][0]}, ${p.w} x ${p.h}) in ${((Date.now() - t0) / 1000).toFixed(1)} s. It holds bought art: never commit it.`);
}
