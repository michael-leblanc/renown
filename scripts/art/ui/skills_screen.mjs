// Drafts of the Skills screen (D20, D125, D140, D151, D166) in the look of the character screen (D240, D241), with the screen kit.
// Three layouts to choose from; nothing here is a piece for the game yet. Every number shown is made up.
//   a  "ledger": one row per skill, a medallion, its name, a bar to 100 and the number; Weapons and Defence as two sections.
//   b  "rack":   a tall card per skill hanging from a steel rod, filled with warm light up to its value; the picked card explained below.
//   c  "stage":  the character on a lit stage at the left; the skills as bronze rings that fill to their value.
//   e  "tree":   D242 as one big tree: a bronze rosette at the root, a skill on each branch (later skills dim), its nodes branching out. 1152 x 648.
//   f  the tree at 200%, on Swords' branch: how it looks zoomed in (see tree()'s note on zoom).
//   d  "graph":  D242. The skill list at the left, the picked skill's graph of nodes on a lit stage, the picked node explained below. 960 x 760.
// Usage, from the repo root (a few seconds each):
//   node scripts/art/ui/skills_screen.mjs [--layout a|b|c|d|e|f|all] [--scale 2]
//       prototype/shots/ui-skills-<layout>.png (git-ignored). Over the game's grass, and c holds the Creator character:
//       bought art, never commit the pictures.
import { K, area, mask, layer, each, vnoise, box, boxLine, ellipse, roundBox, poly, line, blur, texture, metal, shadow, over, shrink } from './kit.mjs';
import { font, textWidth, drawText } from './text.mjs';
import { PIECES, FONTS, paste, blank, character, shot } from './character_screen.mjs';
import { writePng } from '../png.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = 620, H = 760, FULL = [W, H];
const COL = { label: [196, 160, 98], value: [242, 234, 214], hint: [110, 104, 94], dark: [30, 20, 10] };   // D241, and the character screen's slot-name grey
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
  if (name === 'Magic') { poly(M, [P(0, -12), P(3, -3), P(12, 0), P(3, 3), P(0, 12), P(-3, 3), P(-12, 0), P(-3, -3)]); }      // later skills (D151): a spark,
  if (name === 'Stealth') { E(-11, -6, 11, 8, 2.2, 255, (dx, dy) => dy < 0); E(-4, -4, 4, 4); }                                     // a half-shut eye,
  if (name === 'Trade') { for (const y of [5, 0, -5]) E(-9, y - 3, 9, y + 3, 1.6); }                                                   // a stack of coins,
  if (name === 'Crafting') { L(-8, 10, 4, -2, 2.4); poly(M, [P(-1, -10), P(9, 0), P(5, 4), P(-5, -6)]); }                             // a hammer
  if (name === 'Dodge') {                                 // an arrow that curves round
    E(-10, -9, 8, 13, 2.4, 255, (dx, dy) => dy < 0 && dx > -14 * s);
    poly(M, [P(9, 3), P(4, -2), P(13, -3)]); L(-11, 6, -5, 6, 1.4); L(-12, 10, -6, 10, 1.4);
  }
}
/** A bronze medallion with a skill's sign: centre cx, cy, radius r (screen pixels). */
function medal(name, cx, cy, r, kind = 'bronze') {
  const A = area(cx - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2, 8), disc = mask(A), M = mask(A), X = cx * K, Y = cy * K, R = r * K;
  ellipse(disc, X - R, Y - R, X + R, Y + R); ellipse(M, X - R, Y - R, X + R, Y + R, Math.trunc(2.5 * K * r / 19)); sign(M, name, X, Y, K * r / 19);
  return [shrink(over(plain(disc, [26, 24, 22]), metal(M, kind, FULL, kind === 'steel' ? .5 : 0))), cx - r - 1, cy - r - 1];
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
function draw(parts, texts, w = W, h = H, bare = false) {
  const S = blank(w, h); if (!bare) paste(S, w === W && h === H ? PIECES.Frame() : frame(w, h), 0, 0);
  for (const [p, x, y] of parts) paste(S, p, x, y);
  for (const [str, k, x, y, colour, align = 'left'] of texts) {
    const F = font(join(FONTS, `${FACE[k][0]}.woff`)), px = FACE[k][1], wd = textWidth(F, str, px);
    drawText(S.data, w, align === 'right' ? x - wd : align === 'center' ? x - wd / 2 : x, y, str, F, px, COL[colour]);
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

/* ---------- d: the graph of nodes (D242) ---------- */
// Made up for the picture: a point at 25, 50, 75 and 100 (Claude's proposal, not agreed). Swords 52 has earned 2, spent 1 on Deep cut.
const GW = 960, GFULL = [GW, H], MILESTONES = [25, 50, 75, 100];
const D_SKILLS = SKILLS.map(([n, v]) => [n, n === 'Swords' ? 52 : v]);
const D_SPENT = { Swords: 1 }, earned = v => MILESTONES.filter(m => v >= m).length;
/** The character screen's frame at another size: slate with grain, worn steel trim, spikes and studs at the corners. */
function frame(w, h) {
  const A = area(0, 0, w, h), L = layer(A), M = mask(A); texture(L, [24, 31, 33]);
  const trim = (x0, y0, x1, y1, wd) => boxLine(M, x0 * K, y0 * K, x1 * K, y1 * K, Math.trunc(wd * K));
  const spike = (cx, cy, ang, len = 16, wd = 3) => { const a = ang * Math.PI / 180, px = -Math.sin(a), py = Math.cos(a); poly(M, [[cx * K + px * wd * K, cy * K + py * wd * K], [cx * K + Math.cos(a) * len * K, cy * K + Math.sin(a) * len * K], [cx * K - px * wd * K, cy * K - py * wd * K]]); };
  trim(4, 4, w - 4, h - 4, 3); trim(10, 10, w - 10, h - 10, 1);
  for (const [cx, cy, a1, a2] of [[4, 4, -90, 180], [w - 4, 4, -90, 0], [4, h - 4, 90, 180], [w - 4, h - 4, 90, 0]]) { spike(cx, cy, a1); spike(cx, cy, a2); ellipse(M, (cx - 5) * K, (cy - 5) * K, (cx + 5) * K, (cy + 5) * K); }
  over(L, shadow(M)); over(L, metal(M, 'steel', [w, h], .35)); return shrink(L);
}
/** A bar to 100 with a small tick at each point milestone. */
function tickedBar(x, y, w, h, v) {
  const [p] = bar(x, y, w, h, v), A = area(x, y, w, h + 6, 2), M = mask(A);
  for (const m of MILESTONES.slice(0, -1)) { const X = Math.round((x + 2 + (w - 4) * m / 100) * K); box(M, X - K / 2, (y - 3) * K, X + K / 2, (y + h + 2) * K); }
  const t = shrink(plain(M, [150, 130, 96])), out = blank(w + 4, h + 10); paste(out, p, 2, 2); paste(out, t, 0, -1);
  return [out, x - 2, y - 2];
}
/** A round gold badge: points to spend. */
function badge(cx, cy, r) { const A = area(cx - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2, 4), M = mask(A); ellipse(M, (cx - r) * K, (cy - r) * K, (cx + r) * K, (cy + r) * K); return [shrink(metal(M, 'bronze', GFULL)), cx - r - 1, cy - r - 1]; }
/** A node: 'taken' (lit bronze), 'open' (bronze ring, can be taken now, with a warm glow), 'locked' (dull steel) or 'hidden' (a rare node). */
function node(cx, cy, r, state, picked, mark = null) {
  const g = r + 10, A = area(cx - g, cy - g, 2 * g, 2 * g, 4), X = cx * K, Y = cy * K, R = r * K, disc = mask(A), rim = mask(A), gem = mask(A), L = layer(A);
  ellipse(disc, X - R, Y - R, X + R, Y + R); ellipse(rim, X - R, Y - R, X + R, Y + R, Math.max(K, Math.trunc(Math.min(3, r / 3) * K)));
  if (state === 'open' || state === 'taken') {                    // a warm glow round it
    const halo = mask(A); ellipse(halo, X - R - 4 * K, Y - R - 4 * K, X + R + 4 * K, Y + R + 4 * K); const soft = blur(halo.m, A.w, A.h, 5 * K);
    for (let i = 0; i < soft.length; i++) { L.c[i * 3] = 214; L.c[i * 3 + 1] = 150; L.c[i * 3 + 2] = 70; L.a[i] = soft[i] / 255 * (state === 'open' ? .55 : .35); }
  }
  over(L, state === 'taken' ? metal(disc, 'bronze', TFULL) : plain(disc, state === 'locked' || state === 'hidden' ? [14, 16, 17] : [30, 24, 18]));
  if (mark) { sign(gem, mark, X, Y, K * r * 1.1 / 24); over(L, plain(gem, state === 'taken' ? [70, 44, 18] : state === 'open' ? [190, 140, 72] : [66, 70, 70])); }        // close up: the skill's sign
  else if (state === 'taken' || state === 'open') { const s = r * .45 * K; poly(gem, [[X, Y - s], [X + s, Y], [X, Y + s], [X - s, Y]]); over(L, plain(gem, state === 'taken' ? [96, 62, 26] : [70, 48, 26])); }
  over(L, state === 'locked' || state === 'hidden' ? metal(rim, 'steel', GFULL, .5) : metal(rim, 'bronze', GFULL));
  if (picked) { const ring2 = mask(A); ellipse(ring2, X - R - 5 * K, Y - R - 5 * K, X + R + 5 * K, Y + R + 5 * K, Math.trunc(1.5 * K)); over(L, plain(ring2, [230, 200, 130])); }
  return [shrink(L), cx - g, cy - g];
}
/** The line from one node to the next: lit bronze once taken, dark steel before. */
function link(a, b, lit, z = 1) {
  const x0 = Math.min(a[0], b[0]) - 4, y0 = Math.min(a[1], b[1]) - 4, A = area(x0, y0, Math.abs(a[0] - b[0]) + 8, Math.abs(a[1] - b[1]) + 8, 4), M = mask(A);
  line(M, a[0] * K, a[1] * K, b[0] * K, b[1] * K, Math.max(2, Math.trunc((lit ? 3 : 2) * Math.max(.6, z) * K)));
  return [shrink(lit ? metal(M, 'bronze', GFULL) : plain(M, [58, 62, 62])), x0, y0];
}
/** A steel-edged button. */
function button(x, y, w, h) {
  const A = area(x, y, w, h, 4), inside = mask(A), edge = mask(A); roundBox(inside, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, 4 * K); roundBox(edge, x * K, y * K, (x + w) * K - 1, (y + h) * K - 1, 4 * K, 2 * K);
  const L = layer(A); texture(L, [58, 40, 24], (X, Y) => inside.m[(Y - A.y) * A.w + X - A.x]); over(L, shadow(edge)); over(L, metal(edge, 'steel', GFULL, .35)); return [shrink(L), x, y];
}
// Swords' graph, made up: three branches of passive nodes that work with the art already owned (D163), and one hidden rare node (D134).
const COLS = [530, 640, 750, 860], ROWS = [196, 326, 456], ROOT = [426, 326];
const NODES = [
  ['Deep cut', 0, 0, 'taken'], ['Bleed', 0, 1, 'open'], ['Cleave', 0, 2, 'locked'], ['Executioner', 0, 3, 'locked'],
  ['Quick hands', 1, 0, 'open'], ['Weak spot', 1, 1, 'locked'], ['Follow-through', 1, 2, 'locked'], ['Master’s eye', 1, 3, 'locked'],
  ['Parry', 2, 0, 'open'], ['Riposte', 2, 1, 'locked'], ['Hold the line', 2, 2, 'locked'], ['Blade wall', 2, 3, 'locked'],
];
const PICKED = 'Bleed';
function graph() {
  const parts = [], texts = [];
  // the list
  texts.push(['Skills', 'heading', 40, 40, 'value']);
  const total = D_SKILLS.reduce((s, [, v]) => s + v, 0), F16 = font(join(FONTS, 'AlegreyaSC-Bold.woff'));
  texts.push([`${total} / ${CAP}`, 'title', 306, 43, 'value', 'right'], ['Total', 'title', 306 - textWidth(F16, `${total} / ${CAP}`, 16) - 8, 43, 'label', 'right']);
  parts.push(rule(30, 316, 76));
  let y = 92;
  for (const [group, list] of [['Weapons', D_SKILLS.slice(0, 6)], ['Defence', D_SKILLS.slice(6)]]) {
    texts.push([group, 'title', 40, y, 'label']); y += 26;
    for (const [name, v] of list) {
      if (name === 'Swords') parts.push(panel(30, y - 6, 288, 58));
      const pts = earned(v) - (D_SPENT[name] || 0);
      parts.push(medal(name, 54, y + 20, 16), tickedBar(80, y + 30, 226, 7, v)); texts.push([name, 'title', 80, y + 5, 'label'], [String(v), 'number', 306, y + 3, 'value', 'right']);
      if (pts > 0) { parts.push(badge(266, y + 13, 9)); texts.push([String(pts), 'line', 266, y + 6, 'dark', 'center']); }
      y += 60;
    }
    y += 4;
  }
  texts.push(['A gold badge: points to spend.', 'line', 40, 668, 'hint'], ['A tick on a bar: where the next point comes.', 'line', 40, 686, 'hint'], ['Skills rise as you use them.', 'line', 40, 704, 'hint']);
  // the stage and the graph
  parts.push(stage(334, 22, 604, 548, [640, 330, 360, 300]));
  texts.push(['Swords', 'heading', 356, 40, 'value'], ['52', 'heading', 356 + textWidth(font(join(FONTS, 'AlegreyaSC-Bold.woff')), 'Swords', 20) + 10, 40, 'value']);
  texts.push(['1 to spend', 'title', 918, 38, 'value', 'right'], ['Points', 'title', 918 - textWidth(F16, '1 to spend', 16) - 8, 38, 'label', 'right'],
    ['Next point at 75', 'line', 918, 62, 'value', 'right']);
  COLS.forEach((x, i) => texts.push([`Swords ${MILESTONES[i]}`, 'line', x, 104, 'label', 'center']));
  const at = (r, c) => [COLS[c], ROWS[r]];
  for (const [n, r, c, st] of NODES) { const prev = c === 0 ? ROOT : at(r, c - 1), lit = st === 'taken'; parts.push(link(prev, at(r, c), lit)); }
  parts.push(medal('Swords', ...ROOT, 26));
  for (const [n, r, c, st] of NODES) {
    const [x, yy] = at(r, c); parts.push(node(x, yy, 16, st, n === PICKED));
    texts.push([n, 'line', x, yy + 28, st === 'locked' ? 'hint' : st === 'taken' ? 'value' : 'label', 'center']);
  }
  parts.push(node(860, 530, 13, 'hidden', false)); texts.push(['?', 'title', 860, 520, 'hint', 'center'], ['Hidden: a teacher or a rare find', 'line', 846, 524, 'hint', 'right']);
  // the picked node
  parts.push(panel(334, 586, 604, 134), button(786, 670, 132, 34));
  texts.push(['Bleed', 'heading', 356, 602, 'value'], ['Passive', 'line', 918, 606, 'hint', 'right'],
    ['A hit can make the target bleed for a few seconds.', 'line', 356, 634, 'value'],
    ['Costs', 'line', 356, 662, 'label'], ['1 Swords point', 'line', 412, 662, 'value'],
    ['Needs', 'line', 356, 681, 'label'], ['Swords 50 and Deep cut', 'line', 412, 681, 'value'],
    ['Take', 'title', 852, 677, 'value', 'center']);
  return draw(parts, texts, GW, H);
}

/* ---------- e: one big tree (D242) ---------- */
const TW = 1152, TH = 648, TFULL = [TW, 1300], ROOT_AT = [560, 328], HUB = [232, 140];   // TFULL: the metal stays in the paler half of its ramp
const TREE = [['Swords', -105], ['Axes', -75], ['Maces', -45], ['Spears', -15], ['Bows', 15], ['Unarmed', 45], ['Shield', 75], ['Dodge', 105], ['Magic', 135], ['Stealth', 165], ['Trade', 195], ['Crafting', 225]];
const LATER = ['Magic', 'Stealth', 'Trade', 'Crafting'];
// Every branch the same shape for the picture: one node, two arms of two, a notable (a diamond) at each arm's end.
// [how far out from the hub, how far to the side, parent, kind], in pixels, along the line from the root through the hub.
const BRANCH = [[62, 0, -1, 'node'], [96, -18, 0, 'node'], [96, 18, 0, 'node'], [127, -24, 1, 'node'], [127, 24, 2, 'node'], [156, -28, 3, 'notable'], [156, 28, 4, 'notable']];
const hubAt = deg => [Math.round(ROOT_AT[0] + Math.cos(deg * Math.PI / 180) * HUB[0]), Math.round(ROOT_AT[1] + Math.sin(deg * Math.PI / 180) * HUB[1])];
const outward = (deg, out, side) => { const h = hubAt(deg), dx = h[0] - ROOT_AT[0], dy = h[1] - ROOT_AT[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n; return [Math.round(h[0] + ux * out - uy * side), Math.round(h[1] + uy * out + ux * side)]; };
const SWORDS_NODES = ['Deep cut', 'Bleed', 'Parry', 'Cleave', 'Riposte', 'Executioner', 'Blade wall'];
/** A notable: a diamond, in the same states as a node. */
function diamond(cx, cy, r, state, picked, mark = null) {
  const g = r + 10, A = area(cx - g, cy - g, 2 * g, 2 * g, 4), X = cx * K, Y = cy * K, d = (m, R, v = 255) => poly(m, [[X, Y - R * K], [X + R * K, Y], [X, Y + R * K], [X - R * K, Y]], v);
  const fill = mask(A), rim = mask(A), L = layer(A); d(fill, r); d(rim, r); d(rim, r - Math.max(1.5, r * .29), 0);
  if (state === 'open') { const halo = mask(A); d(halo, r + 4); const soft = blur(halo.m, A.w, A.h, 5 * K); for (let i = 0; i < soft.length; i++) { L.c[i * 3] = 214; L.c[i * 3 + 1] = 150; L.c[i * 3 + 2] = 70; L.a[i] = soft[i] / 255 * .55; } }
  over(L, state === 'taken' ? metal(fill, 'bronze', TFULL) : plain(fill, state === 'locked' ? [14, 16, 17] : [30, 24, 18]));
  if (mark) { const gem = mask(A); sign(gem, mark, X, Y, K * r * .95 / 24); over(L, plain(gem, state === 'taken' ? [70, 44, 18] : state === 'open' ? [190, 140, 72] : [66, 70, 70])); }
  over(L, state === 'locked' ? metal(rim, 'steel', TFULL, .5) : metal(rim, 'bronze', TFULL));
  if (picked) { const p2 = mask(A); d(p2, r + 5); d(p2, r + 3.5, 0); over(L, plain(p2, [230, 200, 130])); }
  return [shrink(L), cx - g, cy - g];
}
/** The tree's ground: dark slate, faint rings round the root, a pool of warm light at the middle. */
function ground() {
  const x = 14, y = 14, w = TW - 28, h = TH - 28, A = area(x, y, w, h), L = layer(A), [cx, cy] = ROOT_AT; texture(L, [17, 22, 24]);
  each(A, (X, Y, i) => { const g = Math.max(0, 1 - Math.hypot((X - cx * K) / (380 * K), (Y - cy * K) / (300 * K))) ** 1.8, sm = vnoise(X / (30 * K) + Math.sin(Y / (40 * K)), Y / (30 * K)); const warm = [96, 62, 40]; for (let c = 0; c < 3; c++) L.c[i * 3 + c] += g * (.6 + .5 * sm) * warm[c] * .8; });
  const rings = mask(A); for (const f of [.3, 1, 1.45, 1.85]) ellipse(rings, (cx - HUB[0] * f) * K, (cy - HUB[1] * f) * K, (cx + HUB[0] * f) * K, (cy + HUB[1] * f) * K, K);
  const faint = plain(rings, [120, 110, 90]); for (let i = 0; i < faint.a.length; i++) faint.a[i] *= .12; over(L, faint);
  return [shrink(L), x, y];
}
/** The root: a bronze rosette, a spoke towards each skill, round a glowing amber core. No god's or faction's sign (D240). */
function rosette(cx, cy, r) {
  const g = r + 14, A = area(cx - g, cy - g, 2 * g, 2 * g, 6), X = cx * K, Y = cy * K, R = r * K, L = layer(A), disc = mask(A), M = mask(A), core = mask(A), glow = mask(A);
  ellipse(glow, X - R - 8 * K, Y - R - 8 * K, X + R + 8 * K, Y + R + 8 * K); const soft = blur(glow.m, A.w, A.h, 8 * K);
  for (let i = 0; i < soft.length; i++) { L.c[i * 3] = 214; L.c[i * 3 + 1] = 150; L.c[i * 3 + 2] = 70; L.a[i] = soft[i] / 255 * .45; }
  ellipse(disc, X - R, Y - R, X + R, Y + R); over(L, plain(disc, [26, 21, 17]));
  const t = Math.max(K, Math.trunc(r / 13 * K));
  ellipse(M, X - R, Y - R, X + R, Y + R, t); ellipse(M, X - R * .74, Y - R * .74, X + R * .74, Y + R * .74, Math.max(K, Math.trunc(t * .6)));
  for (const [, deg] of TREE) {                                          // a spoke to each skill, a small petal between them
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); line(M, X + c * R * .36, Y + s * R * .36, X + c * R * .96, Y + s * R * .96, Math.max(K, Math.trunc(t * .55)));
    const b = a + Math.PI / 12, pc = Math.cos(b), ps = Math.sin(b), w = R * .07; poly(M, [[X + pc * R * .76, Y + ps * R * .76], [X + pc * R * .86 - ps * w, Y + ps * R * .86 + pc * w], [X + pc * R * .97, Y + ps * R * .97], [X + pc * R * .86 + ps * w, Y + ps * R * .86 - pc * w]]);
    ellipse(M, X + c * (R + 6 * K) - 2 * K, Y + s * (R + 6 * K) - 2 * K, X + c * (R + 6 * K) + 2 * K, Y + s * (R + 6 * K) + 2 * K);   // a stud outside the rim
  }
  ellipse(M, X - R * .4, Y - R * .4, X + R * .4, Y + R * .4, Math.max(K, Math.trunc(t * .7)));
  over(L, shadow(M)); over(L, metal(M, 'bronze', TFULL));
  ellipse(core, X - R * .34, Y - R * .34, X + R * .34, Y + R * .34); const C = layer(A);          // the amber core, bright in the middle
  each(A, (x, y, i) => { if (!core.m[i]) return; const d = Math.hypot(x - X, y - Y) / (R * .34), n = vnoise(x / (3 * K), y / (3 * K)) * .15; const k = Math.max(0, 1 - d) * .9 + .1 + n; C.c[i * 3] = Math.min(255, 120 + 135 * k); C.c[i * 3 + 1] = Math.min(255, 60 + 150 * k * k); C.c[i * 3 + 2] = 20 + 70 * k * k * k; C.a[i] = 1; });
  over(L, C);
  return [shrink(L), cx - g, cy - g];
}
/** A name plate: a small dark plate with a steel edge. */
const plate = (cx, cy, w) => panel(Math.round(cx - w / 2), cy - 11, Math.round(w), 22);
/** A steel cross to close the screen. */
function closer(cx, cy) { const A = area(cx - 12, cy - 12, 24, 24, 4), M = mask(A); line(M, (cx - 8) * K, (cy - 8) * K, (cx + 8) * K, (cy + 8) * K, 3 * K); line(M, (cx - 8) * K, (cy + 8) * K, (cx + 8) * K, (cy - 8) * K, 3 * K); return [shrink(over(shadow(M), metal(M, 'steel', TFULL, .35))), cx - 12, cy - 12]; }
// Zoom (D242): the tree lives in its own space and the screen is a camera on it, as in Path of Exile: scroll to zoom, drag to move.
// The panels, the title and the close cross stay put. How much is drawn depends on the zoom:
//   under 0.75   hubs, their names and the lit paths; small nodes as dots.
//   0.75 to 1.5  every node, every name plate.
//   1.5 and up   each node carries its skill's sign; taken, open and notable nodes show their names.
// In the game the pieces are drawn at the biggest zoom and shrunk, never stretched (the character screen showed stretched pieces go soft).
const VIEW = [14, 14, TW - 14, TH - 14], LOOK = [560, 328];                      // the part of the screen the tree shows in; where the camera looks at 100%
function tree(z = 1, cam = LOOK) {
  const parts = [], texts = [], top = [], F16 = font(join(FONTS, 'AlegreyaSC-Bold.woff')), F12 = font(join(FONTS, 'Alegreya-Bold.woff')), V = Object.fromEntries(D_SKILLS);
  const S = p => [Math.round((p[0] - cam[0]) * z + LOOK[0]), Math.round((p[1] - cam[1]) * z + LOOK[1])], seen = (p, m = 60) => p[0] > VIEW[0] - m && p[0] < VIEW[2] + m && p[1] > VIEW[1] - m && p[1] < VIEW[3] + m;
  const far = z < .75, close = z >= 1.5, links = [], nodes = [], hubs = [];
  for (const [name, deg] of TREE) {
    const later = LATER.includes(name), v = V[name] ?? 0, hubW = hubAt(deg), hub = S(hubW), pts = later ? 0 : earned(v), spent = D_SPENT[name] || 0;
    const pos = BRANCH.map(([o, sd]) => outward(deg, o, sd)), state = BRANCH.map(() => 'locked');
    if (!later) { state[0] = spent ? 'taken' : pts ? 'open' : 'locked'; if (spent && pts > spent) { state[1] = 'open'; state[2] = 'open'; } }
    const rootEdge = outward(deg, -(Math.hypot(hubW[0] - ROOT_AT[0], hubW[1] - ROOT_AT[1]) - 46), 0);
    if (seen(S(rootEdge), 400) || seen(hub)) links.push(link(S(rootEdge), S(outward(deg, -30, 0)), !later, z));
    BRANCH.forEach(([, , p, kind], i) => {
      const a = S(p < 0 ? outward(deg, 30, 0) : pos[p]), b = S(pos[i]), st = later ? 'locked' : state[i]; if (!seen(a) && !seen(b)) return;
      if (!far || st === 'taken') links.push(link(a, b, st === 'taken', z));
      const picked = name === 'Swords' && i === 1, mark = close ? name : null;
      if (far) nodes.push(node(...b, Math.max(3, Math.round(4 * z)), st, false));
      else nodes.push(kind === 'notable' ? diamond(...b, Math.round(12 * z), st, picked, mark) : node(...b, Math.round(9 * z), st, picked, mark));
      if (close && name === 'Swords' && (kind === 'notable' || st !== 'locked')) texts.push([SWORDS_NODES[i], 'line', b[0], b[1] + Math.round((kind === 'notable' ? 12 : 9) * z) + 6, st === 'locked' ? 'hint' : st === 'taken' ? 'value' : 'label', 'center']);
    });
    if (!seen(hub, 80)) continue;
    hubs.push(later ? ring(...hub, Math.round(28 * z), Math.max(3, Math.round(6 * z)), 0) : ring(...hub, Math.round(28 * z), Math.max(3, Math.round(6 * z)), v), medal(name, ...hub, Math.round(19 * z), later ? 'steel' : 'bronze'));
    const py = hub[1] + Math.round(36 * z) + (z < 1 ? 4 : 0), label = later ? name : `${name}  ${v}`, wd = textWidth(F16, label, 16) + (later ? textWidth(F12, ' later', 12) : 0) + 18;
    top.push(plate(hub[0], py, wd));
    if (later) texts.push([name, 'title', hub[0] - wd / 2 + 9, py - 8, 'hint'], ['later', 'line', hub[0] + wd / 2 - 9, py - 5, 'hint', 'right']);
    else { const nw = textWidth(F16, name + '  ', 16); texts.push([name, 'title', hub[0] - wd / 2 + 9, py - 8, 'label'], [String(v), 'title', hub[0] - wd / 2 + 9 + nw, py - 8, 'value']); }
    if (pts - spent > 0) { const o = Math.round(23 * z); top.push(badge(hub[0] + o, hub[1] - o, 9)); texts.push([String(pts - spent), 'line', hub[0] + o, hub[1] - o - 7, 'dark', 'center']); }
  }
  const R = S(ROOT_AT); if (seen(R, 120)) parts.push(rosette(...R, Math.round(40 * z)));
  // the tree is drawn on its own sheet, cut to the view, then laid on the frame
  const sheet = draw([ground(), ...links, ...nodes, ...hubs, ...parts, ...top], texts, TW, TH, true);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (x < VIEW[0] || y < VIEW[1] || x >= VIEW[2] || y >= VIEW[3]) sheet.data[(y * TW + x) * 4 + 3] = 0;
  const ui = [[sheet, 0, 0]], uiText = [];
  ui.push(closer(TW - 40, 40));
  // left: the skills' totals, the search, points to spend
  ui.push(panel(24, 24, 164, 238), search(36, 112, 140));
  uiText.push(['Skills', 'heading', 38, 36, 'value'], ['Total', 'title', 38, 70, 'label'], [`${D_SKILLS.reduce((s, [, v]) => s + v, 0)} / ${CAP}`, 'title', 38 + textWidth(F16, 'Total', 16) + 8, 70, 'value'], ['Search nodes', 'line', 60, 118, 'hint'], ['Points to spend', 'title', 38, 156, 'label']);
  let ly = 180; for (const [n, v] of D_SKILLS) { const p = earned(v) - (D_SPENT[n] || 0); if (p > 0) { uiText.push([n, 'line', 38, ly, 'value'], [String(p), 'line', 176, ly, 'value', 'right']); ly += 19; } }
  uiText.push(['Click one to find it', 'line', 38, ly + 6, 'hint']);
  // bottom left: the zoom and the key
  ui.push(panel(24, 446, 164, 180), button(36, 458, 30, 26), button(146, 458, 30, 26), button(36, 492, 140, 24));
  uiText.push(['−', 'title', 51, 461, 'value', 'center'], ['+', 'title', 161, 461, 'value', 'center'], [`${Math.round(z * 100)}%`, 'title', 106, 461, 'value', 'center'], ['Back to the root', 'line', 106, 497, 'value', 'center']);
  [['Taken', 'taken'], ['Can take', 'open'], ['Locked', 'locked']].forEach(([t, st], i) => { ui.push(node(46, 538 + i * 22, 7, st, false)); uiText.push([t, 'line', 64, 531 + i * 22, 'value']); });
  ui.push(diamond(46, 604, 9, 'locked', false)); uiText.push(['Notable', 'line', 64, 597, 'value']);
  // right: the picked node
  ui.push(panel(944, 380, 184, 236), button(960, 566, 152, 32));
  uiText.push(['Bleed', 'heading', 960, 396, 'value'], ['Swords', 'line', 960, 422, 'label'], ['Passive', 'line', 1112, 422, 'hint', 'right'],
    ['A hit can make the target', 'line', 960, 448, 'value'], ['bleed for a few seconds.', 'line', 960, 466, 'value'],
    ['Costs', 'line', 960, 496, 'label'], ['1 Swords point', 'line', 1008, 496, 'value'], ['Needs', 'line', 960, 515, 'label'], ['Deep cut', 'line', 1008, 515, 'value'],
    ['Take', 'title', 1036, 572, 'value', 'center']);
  return draw(ui, uiText, TW, TH);
}
/** A search box: a dark inset with a steel magnifier. */
function search(x, y, w) {
  const [p] = panel(x, y, w, 24), A = area(x + 6, y + 4, 16, 16, 2), M = mask(A), X = (x + 12) * K, Y = (y + 11) * K;
  ellipse(M, X - 5 * K, Y - 5 * K, X + 5 * K, Y + 5 * K, Math.trunc(1.6 * K)); line(M, X + 3 * K, Y + 3 * K, X + 8 * K, Y + 8 * K, 2 * K);
  const out = blank(w, 24); paste(out, p, 0, 0); paste(out, shrink(metal(M, 'steel', TFULL, .2)), 4, 2); return [out, x, y];
}
const treeClose = () => tree(2, outward(-105, 70, 0));      // 200%, on Swords' branch

const LAYOUTS = { a: ['ledger', ledger], b: ['rack', rack], c: ['stage', rings], d: ['graph', graph], e: ['tree', tree], f: ['tree at 200%', treeClose] };
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, which = flag('--layout', 'all'), scale = +flag('--scale', 2);
for (const k of which === 'all' ? Object.keys(LAYOUTS) : [which]) {
  const t0 = Date.now(), out = `prototype/shots/ui-skills-${k}.png`, p = shot(LAYOUTS[k][1](), scale); mkdirSync(dirname(out), { recursive: true }); writePng(out, p.data, p.w, p.h);
  console.log(`${out} (${LAYOUTS[k][0]}, ${p.w} x ${p.h}) in ${((Date.now() - t0) / 1000).toFixed(1)} s. It holds bought art: never commit it.`);
}
