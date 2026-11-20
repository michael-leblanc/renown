// The Skills screen's pieces and json (D242, D243, D252): the whole skill tree as a wheel of eight webs, drawn by the game from pieces, like the HUD (#50).
// The look and the moving about are the tree page's (skills_tree_page.mjs, agreed for v1 on 2026-11-20); this cuts it into what Godot needs.
// Two kinds of piece, into game/client/art/made/ui/skills/ (--pieces):
//   On the screen, at its own size (they stay put):
//     Frame, Ground                    the screen's steel frame and the tree's dark ground (the ground does not move with the tree)
//     Panel                            a dark plate with a steel edge, 260 x 420: cut to any smaller size, never stretched (json "panel")
//     Button, Button Take, Close       the zoom buttons (- and +), the card's Take button, the cross that closes the screen
//   In the tree's space, drawn S (4) times bigger than at 100% and shrunk by the game (D242: "never stretched"):
//     Rosette                          the root
//     Ring Empty, Ring Full            a skill's ring; the game shows Ring Full over Ring Empty as a pie, up to the skill's value
//     Medallion <skill>                the twelve skills' medallions (the four later ones in steel)
//     Node <state>                     a plain node: the material beads, and every node as a dot when zoomed far out
//     Node Bare <state>, Notable Bare <state>   a web node's face with no sign: its sign goes on top
//     Sign <name>                      a node's sign, white, 96 px for 24 units: the game tints it (its side's colour) and shrinks it
//   skills.json: the tree (every skill, bead, node, strand and ring, in the tree's space), the colours, the zoom, the panels, the rules' numbers.
// State is <Locked|Open|Taken>. Strands, rings, glows, the route and the picked ring are lines and gradients: Godot draws them from the json, as the page does.
// Usage, from the repo root:
//   node scripts/art/ui/skills_tree.mjs --pieces [--out dir]   the pieces and skills.json (about 20 s)
//   node scripts/art/ui/skills_tree.mjs --check [--out dir]
//       checks the json against the webs (every node, strand and sign is there and in its place) and puts the tree together from the pieces
//       the way the json says, at the opening view and inside Swords: scripts/art/out/ui-skills-pieces-{whole,swords}.png. Write the pieces first.
// No bought art in any of it.
import { medal, ring, panel, node, diamond, shape, button, frame, ground, rosette, closer, TREE, LATER, ROOT_AT, TW, TH } from './skills_screen.mjs';
import { WEBS, MARKS } from './skills_web.mjs';
import { SHAPES, signKey, signPiece } from './skills_signs.mjs';
import { FONTS, paste, blank } from './character_screen.mjs';
import { font, textWidth, drawText } from './text.mjs';
import { resize } from './kit.mjs';
import { writePng, readPng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------- the tree's space: one source for the page and the pieces ---------- */
export const GEO = {
  S: 4,                       // tree pieces are drawn S times bigger than at 100%
  K: 3,                       // the tree is K times bigger than the first draft: hubs and webs spread K times
  HUB: [320, 320],            // a hub's distance from the root (x K): a circle, every skill 30 degrees from the next (2026-11-19)
  ANG: .75,                   // a web's angles are drawn at 75%, so two neighbours never touch and the bridges have the gap
  RAD: { small: 9.5, bridge: 10, stub: 7, node: 14, notable: 18 },   // a node's radius at 100%
  BEAD: [6.5, 5],             // a material bead's radius; a bead still to come
  FAM: { e: [240, 112, 60], g: [127, 209, 194], t: [232, 198, 110], x: [226, 206, 150], c: [120, 126, 126] },   // left side ember, right side verdigris, stem gold, bridge pale gold, a later bridge grey
  OLD: { OUT: [60, 94, 130, 163], SIDE: [13, 18, 23, 27], FORK: 46 },   // the four later skills keep the first draft's branch: 8 blank nodes
  HOME: [560, 328], HOMEZ: .2,                                         // where the screen opens: the whole wheel in view
};
const { S, K, HUB, ANG, RAD, BEAD, FAM, OLD } = GEO, D2R = Math.PI / 180;
export const hubAt = deg => [ROOT_AT[0] + Math.cos(deg * D2R) * HUB[0] * K, ROOT_AT[1] + Math.sin(deg * D2R) * HUB[1] * K];
/** A place on the line from the root through a hub: `out` past the hub, `side` to its right. */
export const outward = (deg, out, side) => { const h = hubAt(deg), dx = h[0] - ROOT_AT[0], dy = h[1] - ROOT_AT[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n; return [h[0] + ux * out - uy * side, h[1] + uy * out + ux * side]; };
/** A place on a skill's fan: rho past its hub along a ring round the root, th degrees off its stem (+ is clockwise), drawn at ANG. */
export const fan = (hub, rho, th0) => { const th = th0 * ANG, dx = hub[0] - ROOT_AT[0], dy = hub[1] - ROOT_AT[1], a = Math.atan2(dy, dx) + th * D2R, d = Math.hypot(dx, dy) + rho; return [ROOT_AT[0] + Math.cos(a) * d, ROOT_AT[1] + Math.sin(a) * d]; };
const r1 = v => Math.round(v * 10) / 10, P1 = p => p.map(r1);

/** Where a node's name goes (the page's label()): at p + along x (r + pad) on the screen, r its radius there (+2 for a notable). Never on the other side's path. */
function labelOf(w, key, kind, th, hub) {
  const dx = hub[0] - ROOT_AT[0], dy = hub[1] - ROOT_AT[1], len = Math.hypot(dx, dy), R = v => Math.round(v * 1000) / 1000;
  if (kind === 'bridge' || kind === 'stub') return { along: [0, 1], pad: 10, align: 'center' };   // under it, clear of the strand
  const named = kind === 'node' || kind === 'notable', bridged = named && w.links.some(l => l.includes(key) && /^(x\db|c[eg])$/.test(l[0] === key ? l[1] : l[0]));
  if (bridged) return { along: [R(dx / len * .5), R(dy / len)], pad: 12, align: 'center' };                               // outward, clear of its bridge
  const side = Math.sign(th) || (key === 't2' ? -1 : 1), nx = -dy / len * side, ny = dx / len * side;
  if (Math.abs(nx) > .62) return { along: [R(nx), R(ny)], pad: 7, align: nx > 0 ? 'left' : 'right' };
  return { along: [R(nx * .4), Math.sign(ny)], pad: 10, align: 'center' };
}

/** The whole tree as plain data, in the tree's space (pixels at 100%). */
export function tree() {
  const skills = TREE.map(([name, deg]) => {
    const hub = hubAt(deg), w = WEBS[name], dist = Math.hypot(hub[0] - ROOT_AT[0], hub[1] - ROOT_AT[1]), a = Math.atan2(hub[1] - ROOT_AT[1], hub[0] - ROOT_AT[0]);
    const sk = { name, deg, later: LATER.includes(name), hub: P1(hub), spoke: [P1(outward(deg, -(dist - OLD.FORK), 0)), P1(outward(deg, -30, 0))] };
    if (!w) {                                                                // a later skill: the first draft's branch, 8 blank nodes, never open
      sk.fork = P1(outward(deg, OLD.FORK, 0)); sk.stem = [P1(outward(deg, 30, 0)), sk.fork];
      sk.blank = [0, 1].flatMap(p => [0, 1, 2, 3].map(i => ({ kind: i > 1 ? 'notable' : 'node', at: P1(outward(deg, OLD.OUT[i], (p ? 1 : -1) * OLD.SIDE[i])), r: i > 1 ? 12 : 9, after: i ? p * 4 + i - 1 : -1 })));
      return sk;
    }
    Object.assign(sk, { status: w.status, paths: { left: w.paths.e, right: w.paths.g }, next: w.other });
    sk.beads = w.beads.map(([label, level, rho0, said], i) => {
      const soon = label.startsWith('A later'), rho = rho0 * K, b = { key: 'm' + i, name: soon ? 'Later' : label, level, at: P1(fan(hub, rho, 0)), r: soon ? BEAD[1] : BEAD[0], soon };
      b.text = soon ? 'A material above steel comes later. Its place is kept here.' : said || (level ? `Nodes past this ring need ${name} ${level}.` : `${label}: where every route starts.`);
      if (i) {                                                               // the bead's ring across the web: dotted; its name at the ring's left end
        const d = dist + rho, e = a - 3.2 * D2R, t = [Math.sin(e), -Math.cos(e)];
        b.ring = { radius: r1(d), from: r1((a - 20.5 * ANG * D2R) / D2R), to: r1((a + 17 * ANG * D2R) / D2R), label: soon ? null : { text: `${label} ${level}`, at: P1([ROOT_AT[0] + Math.cos(e) * d + t[0] * 7, ROOT_AT[1] + Math.sin(e) * d + t[1] * 7]), align: t[0] < -.3 ? 'right' : t[0] > .3 ? 'left' : 'center' } };
      }
      return b;
    });
    sk.nodes = w.nodes.map(([key, kind, nm, text, level, rho0, th]) => {
      const n = { key, kind, name: nm, text, level, at: P1(fan(hub, rho0 * K, th)), r: RAD[kind], side: key[0] === 'e' ? 'left' : key[0] === 'g' ? 'right' : key[0] === 't' ? 'stem' : key[0] === 'x' ? 'bridge' : 'later', colour: key[0] };
      if (kind !== 'stub') n.sign = signPiece(signKey(nm)); if (kind === 'bridge') n.also = w.other;
      n.label = labelOf(w, key, kind, th, hub);
      return n;
    });
    sk.links = w.links; sk.cross = w.cross.map(([a, b]) => [a, b]);
    sk.stem = [P1(outward(deg, 30, 0)), sk.beads[0].at]; sk.tail = ['t3', 'm3', 'm4'];   // the stem goes on, dim, to the materials to come
    sk.haze = [['left', -9.5], ['right', 9.5]].map(([side, th]) => ({ side, at: P1(fan(hub, 108 * K, th)), radius: 84 * K }));
    sk.side_names = [['left', w.paths.e, -12.5], ['right', w.paths.g, 12.5]].map(([side, text, th]) => ({ side, text, at: P1(fan(hub, 174 * K, th)) }));
    sk.into = P1(fan(hub, 104 * K, 2));                                       // where its medallion takes the camera (at 100%)
    return sk;
  });
  return { root: ROOT_AT, skills };
}

/* ---------- the signs: SVG path data to a white picture ---------- */
/** A path's outlines as point lists: [{ pts: [[x, y]...], closed }]. M L H V C S A Z, absolute (all the signs use). */
function outlines(d) {
  const tok = d.match(/[MLHVCSAZ]|-?(?:\d+\.?\d*|\.\d+)/g), out = []; let i = 0, cmd = '', cur = [0, 0], start = [0, 0], sub = null, lastC = null;
  const num = () => +tok[i++], push = p => { sub.pts.push(p); cur = p; };
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'Z') { if (sub) { sub.closed = true; cur = start; } sub = null; cmd = ''; lastC = null; continue; }
    if (cmd === 'M') { sub = { pts: [], closed: false }; out.push(sub); start = [num(), num()]; push(start); cmd = 'L'; lastC = null; continue; }
    if (!sub) { sub = { pts: [cur], closed: false }; out.push(sub); }
    if (cmd === 'L') { push([num(), num()]); lastC = null; }
    else if (cmd === 'H') { push([num(), cur[1]]); lastC = null; }
    else if (cmd === 'V') { push([cur[0], num()]); lastC = null; }
    else if (cmd === 'C' || cmd === 'S') {
      const p0 = cur, c1 = cmd === 'C' ? [num(), num()] : lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur, c2 = [num(), num()], p3 = [num(), num()];
      for (let k = 1; k <= 24; k++) { const t = k / 24, u = 1 - t; push([0, 1].map(j => u * u * u * p0[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * p3[j])); } lastC = c2;
    } else if (cmd === 'A') {                                                // SVG's endpoint arc to its centre (SVG 1.1, F.6.5)
      let rx = Math.abs(num()), ry = Math.abs(num()); const phi = num() * D2R, large = num(), sweep = num(), p = [num(), num()], [x1, y1] = cur, [x2, y2] = p;
      const c = Math.cos(phi), s = Math.sin(phi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = c * dx + s * dy, yp = -s * dx + c * dy;
      const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const num2 = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp, f = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den));
      const cxp = f * rx * yp / ry, cyp = -f * ry * xp / rx, cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy), t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry); let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
      if (!sweep && dt > 0) dt -= 2 * Math.PI; if (sweep && dt < 0) dt += 2 * Math.PI;
      const n = Math.max(8, Math.ceil(Math.abs(dt) / (Math.PI / 24)));
      for (let k = 1; k <= n; k++) { const t = t1 + dt * k / n; push(k === n ? p : [cx + c * rx * Math.cos(t) - s * ry * Math.sin(t), cy + s * rx * Math.cos(t) + c * ry * Math.sin(t)]); } lastC = null;
    } else throw new Error(`sign path: ${cmd} not handled`);
  }
  return out;
}
/** A sign as a white picture, `px` across for its 24 units: strokes 2.5 wide with round ends and joins, fills by the nonzero rule (a canvas's way). */
export function signPicture({ s, f }, px = 96) {
  const SS = 4, N = px * SS, k = N / 24, hit = new Uint8Array(N * N);
  if (f) for (let y = 0; y < N; y++) {                                       // fill: winding number along each row of samples
    const Y = (y + .5) / k, xs = [];
    for (const o of outlines(f)) { const p = o.pts; for (let j = 0; j < p.length; j++) { const [ax, ay] = p[j], [bx, by] = p[(j + 1) % p.length]; if ((ay <= Y) !== (by <= Y)) xs.push([ax + (Y - ay) / (by - ay) * (bx - ax), by > ay ? 1 : -1]); } }
    xs.sort((a, b) => a[0] - b[0]); let wn = 0;
    for (let j = 0; j < xs.length - 1; j++) { wn += xs[j][1]; if (wn) for (let x = Math.max(0, Math.ceil(xs[j][0] * k - .5)); x < Math.min(N, Math.ceil(xs[j + 1][0] * k - .5)); x++) hit[y * N + x] = 1; }
  }
  if (s) { const h = 1.25 * k; for (const o of outlines(s)) {               // stroke: every sample within half the width of a segment
    const p = o.pts.map(([x, y]) => [x * k, y * k]), segs = []; for (let j = 0; j < p.length - 1; j++) segs.push([p[j], p[j + 1]]); if (o.closed) segs.push([p[p.length - 1], p[0]]); if (p.length === 1) segs.push([p[0], p[0]]);
    for (const [[ax, ay], [bx, by]] of segs) {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by) - h)); y <= Math.min(N - 1, Math.ceil(Math.max(ay, by) + h)); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - h)); x <= Math.min(N - 1, Math.ceil(Math.max(ax, bx) + h)); x++) {
        const X = x + .5, Y = y + .5, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / L2)), ex = ax + t * dx - X, ey = ay + t * dy - Y; if (ex * ex + ey * ey <= h * h) hit[y * N + x] = 1;
      }
    }
  } }
  const img = blank(px, px);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { let c = 0; for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) c += hit[(y * SS + j) * N + x * SS + i]; const q = (y * px + x) * 4; img.data[q] = img.data[q + 1] = img.data[q + 2] = 255; img.data[q + 3] = Math.round(c / (SS * SS) * 255); }
  return img;
}

/* ---------- the pieces ---------- */
const C = 400, STATES = { Locked: 'locked', Open: 'open', Taken: 'taken' };
// Each: () => [picture, x, y, (middle x, middle y)]. Screen pieces carry their place; tree pieces their middle (the json's "middle").
const SCREEN = {
  Frame: () => [frame(TW, TH), 0, 0], Ground: () => ground(), Panel: () => panel(24, 24, 260, 420),
  Button: () => button(36, 590, 30, 26), 'Button Take': () => button(952, 566, 152, 32), Close: () => closer(TW - 40, 40),
};
const TREE_PIECES = {
  Rosette: () => rosette(C, C, 40 * S), 'Ring Empty': () => ring(C, C, 28 * S, 6 * S, 0), 'Ring Full': () => ring(C, C, 28 * S, 6 * S, 100),
  ...Object.fromEntries(TREE.map(([n]) => [`Medallion ${n}`, () => medal(n, C, C, 19 * S, LATER.includes(n) ? 'steel' : 'bronze')])),
  ...Object.fromEntries(Object.entries(STATES).flatMap(([N, st]) => [
    [`Node ${N}`, () => node(C, C, 9 * S, st, false)], [`Node Bare ${N}`, () => shape('circle', C, C, 9 * S, st, false, null, true)], [`Notable Bare ${N}`, () => diamond(C, C, 12 * S, st, false, null, true)],
  ])),
};
const SIGNS = Object.fromEntries([...new Set(Object.values(WEBS).flatMap(w => w.nodes.filter(n => n[1] !== 'stub').map(n => signKey(n[2]))))].map(k => [signPiece(k), k]));

/* ---------- where everything goes: the json Godot reads ---------- */
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const COL = { label: [196, 160, 98], value: [242, 234, 214], hint: [110, 104, 94], blue: [120, 196, 255], dark: [30, 20, 10], outline: [8, 6, 4] };   // the page's; blue only for points to spend (D243)
const FACES = { heading: ['AlegreyaSC-Bold', 20], title: ['AlegreyaSC-Bold', 16], line: ['Alegreya-Bold', 12] };
function layout(at, mid) {
  const T = tree(), P = n => ({ file: `${n}.png`, at: at[n] }), Q = n => ({ file: `${n}.png`, middle: mid[n] });
  return {
    _note: 'Written by scripts/art/ui/skills_tree.mjs --pieces: do not edit by hand. The Skills screen (D243) with the tree as a wheel of webs (D252), in the window\'s pixels, 1152 x 648. Screen pieces have "at", their top left, shadow counted. The tree lives in its own space (pixels at 100%) and the screen is a camera on it: a point p of the tree is on the screen at (p - camera) * zoom + look, clipped to "view". Tree pieces are drawn "scale" times bigger than at 100%: draw one at zoom / scale, its "middle" on the point. Every place, size, colour and number here is a setting, and every word a placeholder. Draw order: ground; strands (under everything); beads; nodes; skills (ring, medallion, plate); rosette; names; then the panels, which stay put.',
    size: [TW, TH], view: [14, 14, TW - 28, TH - 28], look: [560, 328], scale: S,
    pieces: Object.fromEntries(['Frame', 'Ground', 'Button', 'Button Take', 'Close'].map(n => [n, P(n)])),
    tree_pieces: Object.fromEntries(Object.keys(TREE_PIECES).map(n => [n, Q(n)])),
    panel: { file: 'Panel.png', cut: 10, _note: 'Any plate up to 260 x 420: the big piece\'s top left part (w - cut by h - cut) and its right, bottom and corner edges of "cut" pixels, never stretched (the page\'s panelAt).' },
    signs: { _note: 'A web node\'s sign, white on clear: "Sign <name>.png", 96 px for its 24 units. Tint it and draw it at "size" times the node\'s radius on screen across (small nodes and bridges "small", named nodes "node", notables "notable"). Under 8.5 px across, draw a dot of radius "dot" times the node\'s radius instead.', px: 96, size: { small: 1.34, bridge: 1.34, node: 1.34, notable: 1.08 }, dot: .36, min_px: 8.5, files: Object.keys(SIGNS).map(n => `${n}.png`) },
    zoom: {
      _note: 'Opens at "open" with the camera on "home"; the zoom figure flies back there. Scroll: "wheel" a notch, the buttons "step" a click, between "min" and "max". A medallion flies into its web ("into") at 1. Under "far": small nodes are dots, unlit strands, beads and rings are not drawn, names hidden. From "near": named nodes show their names. From "side_names": each side\'s name. Medallions and the rosette never drawn under "medallion_min".',
      open: GEO.HOMEZ, home: GEO.HOME, min: .16, max: 2.4, wheel: 1.15, step: 1.25, far: .36, near: .8, side_names: .55, medallion_min: .7, fly_s: .32, camera_x: [-900, 2020], camera_y: [-760, 1420],
    },
    tree: {
      _note: 'Positions are the tree\'s space at 100%. A web node: "kind" small, node (a named node, round), notable (a named node, diamond), bridge (costs either skill\'s point and counts for both, D252) or stub (a bridge kept for a later skill, never open). "colour" picks its side\'s colour in "colours.sides" (e left, g right, t stem, x bridge, c later). "links" join keys in the same web (m0 is the first bead); "cross" joins a key to "<skill>/<key>" in the next web. A material bead\'s "ring" is a dotted arc round the root, degrees clockwise from 3 o\'clock. A later skill has 8 "blank" nodes: "after" is the one it hangs from (-1: the fork).',
      root: T.root, rosette_radius: 40, skills: T.skills,
      hub: { _note: 'Round a medallion, at the medallion zoom zz = max(z, medallion_min): clicked within hit x zz; the ring of points to spend at ring x zz + plus_gap, its +n at ring x zz + 5 below; the plate plate_dy x zz below (+ under_100 under 100%, + with_points when it has points).', hit: 30, ring: 28, plus_gap: 4, glow: [27, 34, 14], plate_dy: 40, under_100: 4, with_points: 12 },
    },
    look_of: {
      _note: 'How the page draws what is not a piece. Widths are screen pixels at zoom z. Strands: lit = a dark under-line (w + 1.6), the side\'s colour (w), a pale line on top (max(.6, .3 w)); unlit = one line in "unlit". A lit strand is w = .72 x max(1.6, 3 x max(.6, z)); unlit .9 x max(1.4, 2 x max(.6, z)). A bridge strand to another web is drawn only its first 60 x z px, dashed 3, 4, until it is crossed. The spoke from the root to a hub: lit unless a later skill. Rings: dotted 2.5 z, 3.5 z, max(1, .8 z) wide, "ring_on" once the material is reached. An open node glows in its side\'s colour from .7 r to r + (small 6, else 10) x max(1, .8 z), .4 at its middle. A taken web node gets a thin ring of its colour at r + 1.7 z (a notable: a diamond at r + 3 z). A bridge or stub: a second ring at r + 2.2 z. The picked thing: a ring "picked" 2 px at r + 4. Pointed at: a ring "pointed" at r + 3. A skill with points to spend: a blue ring 2.2 px at 28 z + 4, a blue glow, "+n" under it. The route to a node pointed at: a dashed line 6, 5 through it, "route_ok" or "route_no". Haze: a radial glow of the side\'s colour, .07 at its middle, behind each side of a web.',
      sides: Object.fromEntries(Object.entries(FAM).map(([k, c]) => [k, hex(c)])), unlit: '#4d5354', under: '#3a2410', on_top: '#fff0d299', spoke_unlit: '#3a3e3e', bronze: '#d0a05a',
      ring_on: '#d6aa626b', ring_off: '#6066666b', picked: '#e8cc8c', pointed: '#f2ead6bf', route_ok: '#ffeeb4f2', route_no: '#b0b6b6cc', blue: hex(COL.blue), blue_ring: '#8fd0ff',
      sign_alpha: { open: 1, locked: .6, dark: .3 }, sign_taken: '#3a2208f2', dark_overlay: .3, stub_alpha: .55,
    },
    rules: {
      _note: 'The screen\'s numbers for D242 and D252, all placeholders: a point every "point_every" levels; a named node also needs a mark, one at each of "marks", so 4 named nodes at most (v1 only); a node needs its level and a taken node beside it (the first bead starts every route); a node whose skill drops below its level goes dark. The game\'s own rules will live in game/data/ once the server knows skills: this is what the screen shows, not what it decides.',
      point_every: 5, marks: MARKS, total_cap: 500,
    },
    text: {
      colours: Object.fromEntries(Object.entries(COL).map(([k, c]) => [k, hex(c)])),
      faces: Object.fromEntries(Object.entries(FACES).map(([k, [f, px]]) => [k, { font: f, px }])),
      _note: '"mid" text has its capitals centred on y; "top" text starts its line at y. Outline 2 px in "outline" where marked.',
      plate: { _note: 'Under each medallion: a plate cut from Panel, the name in "label" then the level in "value" (a later skill: "later" in "hint"). Its middle is at hub + (0, 40 z), + 4 under 100%, + 12 when the skill has points to spend. Face "title", "line" when far. Height 26 (20 far); padding 12 (8 far), gap 7 (5 far), right padding 12 (8 far).', face: 'title', far_face: 'line' },
      node_name: { face: 'line', outline: 2, colour: { taken: 'value', open: 'label', locked: 'hint', dark: 'hint' } },
      side_name: { face: 'title', outline: 2, alpha: .9 },
      ring_label: { face: 'line', outline: 2, colour: { on: 'label', off: 'hint' } },
      baseline: { _note: 'Where the baseline sits below y, in px of the face: "mid" text (capitals centred on y), and "top" text by face.', mid: .31, top: { heading: 1.06, title: 1.04, line: 1 } },
    },
    panels: {
      _note: 'What stays put, in the window\'s pixels. "skills": Skills (heading), Total and "sum / cap", Points to spend, then a row per skill with points (name, "+n" in blue, right at x 176), 19 apart; "Click one to find it" under them, or "None". "zoom": - and + as Button, the zoom as a figure that flies home. "card": the picked node, skill or bead at the right, its bottom at y 616, with Take (Button Take) when it can be taken. "tip": what the pointer is on, beside it, 190 wide.',
      skills: { at: [24, 24], width: 164, min_height: 120, heading: [38, 36], total: [38, 70], points: [38, 108], first_row: [38, 132], row_step: 19, plus_right: 176 },
      zoom: { rect: [24, 580, 164, 46], out: [36, 590, 30, 26], in: [146, 590, 30, 26], figure: [106, 603], home: [70, 590, 72, 26] },
      close: { centre: [TW - 40, 40], radius: 16 },
      card: { x: 928, width: 200, bottom: 616, text_x: 16, take: { dx: 24, dy_from_bottom: 46, size: [152, 32] } },
      tip: { width: 190, gap: 16 },
    },
  };
}

/* ---------- the check: the json against the webs, and the tree put together from the pieces ---------- */
function checkJson(J) {
  const bad = [], T = J.tree, by = Object.fromEntries(T.skills.map(s => [s.name, s]));
  if (T.skills.length !== TREE.length) bad.push(`${T.skills.length} skills, not ${TREE.length}`);
  for (const [name, w] of Object.entries(WEBS)) {
    const s = by[name]; if (!s) { bad.push(`no ${name}`); continue; }
    const keys = new Set([...s.nodes.map(n => n.key), ...s.beads.map(b => b.key)]);
    if (s.nodes.length !== w.nodes.length) bad.push(`${name}: ${s.nodes.length} nodes, the web has ${w.nodes.length}`);
    for (const [a, b] of s.links) if (!keys.has(a) || !keys.has(b)) bad.push(`${name}: a link to nowhere ${a}-${b}`);
    for (const [a, b] of s.cross) { const [o, k] = b.split('/'); if (!keys.has(a) || !by[o] || !by[o].nodes.some(n => n.key === k)) bad.push(`${name}: a cross link to nowhere ${a}-${b}`); }
    for (const n of s.nodes) {
      if (n.kind !== 'stub' && !J.signs.files.includes(`${n.sign}.png`)) bad.push(`${name}/${n.key}: no sign ${n.sign}`);
      const [, , , , , rho, th] = w.nodes.find(x => x[0] === n.key), p = fan(hubAt(s.deg), rho * K, th); if (Math.hypot(p[0] - n.at[0], p[1] - n.at[1]) > .1) bad.push(`${name}/${n.key}: at ${n.at}, the web says ${P1(p)}`);
    }
  }
  return bad;
}
const open = path => { const p = readPng(path); return { w: p.width, h: p.height, data: p.data }; };
/** A picture shrunk by k (and tinted, faded), pasted with its middle on x, y. */
function put(D, pic, mx, my, k, x, y, { tint = null, alpha = 1 } = {}) {
  const w = Math.max(1, Math.round(pic.w * k)), h = Math.max(1, Math.round(pic.h * k)), pre = new Float32Array(pic.w * pic.h * 4);
  for (let i = 0; i < pic.w * pic.h; i++) { const a = pic.data[i * 4 + 3] / 255; for (let c = 0; c < 3; c++) pre[i * 4 + c] = (tint ? tint[c] : pic.data[i * 4 + c]) * a; pre[i * 4 + 3] = pic.data[i * 4 + 3] * alpha; }
  const sm = resize(pre, pic.w, pic.h, w, h), out = blank(w, h);
  for (let i = 0; i < w * h; i++) { const a = sm[i * 4 + 3]; if (a <= 0) continue; for (let c = 0; c < 3; c++) out.data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(sm[i * 4 + c] / a * 255 * alpha))); out.data[i * 4 + 3] = Math.min(255, Math.round(a)); }
  paste(D, out, Math.round(x - mx * k), Math.round(y - my * k));
}
const rgba = s => { const h = s.slice(1); return [0, 2, 4, 6].map(i => i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255); };
/** A soft line, w wide with round ends, of colour c (rgba). */
function strand(D, [ax, ay], [bx, by], w, c) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, h = w / 2;
  for (let y = Math.max(0, Math.floor(Math.min(ay, by) - h - 1)); y <= Math.min(D.h - 1, Math.ceil(Math.max(ay, by) + h + 1)); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - h - 1)); x <= Math.min(D.w - 1, Math.ceil(Math.max(ax, bx) + h + 1)); x++) {
    const X = x + .5, Y = y + .5, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / L2)), d = Math.hypot(ax + t * dx - X, ay + t * dy - Y), a = Math.max(0, Math.min(1, h + .5 - d)) * c[3] / 255;
    if (a > 0) blend(D, x, y, c, a);
  }
}
function blend(D, x, y, c, a) { const q = (y * D.w + x) * 4, da = D.data[q + 3] / 255 * (1 - a), oa = a + da; for (let k = 0; k < 3; k++) D.data[q + k] = Math.round((c[k] * a + D.data[q + k] * da) / oa); D.data[q + 3] = Math.round(oa * 255); }
function glow(D, x, y, r0, r1, c, a0) { for (let j = Math.floor(y - r1); j <= Math.ceil(y + r1); j++) for (let i = Math.floor(x - r1); i <= Math.ceil(x + r1); i++) { if (i < 0 || j < 0 || i >= D.w || j >= D.h) continue; const d = Math.hypot(i + .5 - x, j + .5 - y), a = d <= r0 ? a0 : d >= r1 ? 0 : a0 * (1 - (d - r0) / (r1 - r0)); if (a > 0) blend(D, i, j, c, a); } }
const FONT = Object.fromEntries(Object.entries(FACES).map(([k, [f, px]]) => [k, [font(join(FONTS, `${f}.woff`)), px]]));
function say(D, str, face, x, y, colour, align = 'left', mid = true, outline = 0) {
  const [F, px] = FONT[face], w = textWidth(F, str, px), X = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  drawText(D.data, D.w, X, mid ? y - px * .66 : y, str, F, px, colour, outline, [8, 6, 4]);
}
/** A plate of any size cut from Panel, never stretched. */
function plateAt(D, pan, cut, x, y, w, h) {
  [x, y, w, h] = [x, y, w, h].map(Math.round); const part = (sx, sy, sw, sh, dx, dy) => { const o = blank(sw, sh); for (let j = 0; j < sh; j++) pan.data.copy(o.data, j * sw * 4, ((sy + j) * pan.w + sx) * 4, ((sy + j) * pan.w + sx + sw) * 4); paste(D, o, dx, dy); };
  part(0, 0, w - cut, h - cut, x, y); part(pan.w - cut, 0, cut, h - cut, x + w - cut, y); part(0, pan.h - cut, w - cut, cut, x, y + h - cut); part(pan.w - cut, pan.h - cut, cut, cut, x + w - cut, y + h - cut);
}
// A made-up character for the check: the page's "seasoned fighter".
const LEVELS = { Swords: 78, Shield: 64, Dodge: 52, Axes: 27, Bows: 12, Unarmed: 5 };
const TAKEN = new Set(['Swords/ek1', 'Swords/ek2', 'Swords/eK', 'Swords/ex1', 'Swords/eb1', 'Swords/eb2', 'Swords/eB', 'Shield/ek1', 'Shield/ek2', 'Shield/eK']);
function compose(dir, J, z, cam) {
  const pic = {}, get = f => pic[f] ||= open(`${dir}/${f}`), D = blank(TW, TH, [0, 0, 0, 255]), [lx, ly] = J.look, SC = p => [(p[0] - cam[0]) * z + lx, (p[1] - cam[1]) * z + ly];
  const far = z < J.zoom.far, near = z >= J.zoom.near, sc = J.scale, LO = J.look_of, side = k => rgba(LO.sides[k]), col = k => rgba(J.text.colours[k]);
  const level = s => LEVELS[s.name] || 0, by = Object.fromEntries(J.tree.skills.map(s => [s.name, s]));
  const nodeOf = id => { const [s, k] = id.split('/'); return by[s].nodes.find(n => n.key === k) || by[s].beads.find(b => b.key === k); };
  const on = (s, x) => x.ring !== undefined || x.key[0] === 'm' ? !x.soon && level(s) >= x.level : TAKEN.has(`${s.name}/${x.key}`);
  const spent = s => s.nodes.filter(n => TAKEN.has(`${s.name}/${n.key}`)).length, free = s => s.later ? 0 : Math.floor(level(s) / J.rules.point_every) - spent(s);
  const marks = s => J.rules.marks.filter(m => level(s) >= m).length, named = s => s.nodes.filter(n => (n.kind === 'node' || n.kind === 'notable') && TAKEN.has(`${s.name}/${n.key}`)).length;
  const stateOf = (s, n) => {
    if (n.kind === 'stub') return 'locked'; if (TAKEN.has(`${s.name}/${n.key}`)) return 'taken';
    const nb = s.links.filter(l => l.includes(n.key)).map(l => l[0] === n.key ? l[1] : l[0]), reach = nb.some(k => k === 'm0' || TAKEN.has(`${s.name}/${k}`));
    const isNamed = n.kind === 'node' || n.kind === 'notable';
    return reach && level(s) >= n.level && free(s) > 0 && (!isNamed || named(s) < marks(s)) ? 'open' : 'locked';
  };
  // the ground, clipped to the view
  paste(D, get('Frame.png'), ...J.pieces.Frame.at); paste(D, get('Ground.png'), ...J.pieces.Ground.at);
  const lw = Math.max(1.6, 3 * Math.max(.6, z)), thin = Math.max(1.4, 2 * Math.max(.6, z));
  const lit = (a, b, w, c) => { strand(D, a, b, w + 1.6, rgba(LO.under)); strand(D, a, b, w, c); strand(D, a, b, Math.max(.6, w * .3), rgba(LO.on_top)); };
  for (const s of J.tree.skills) {
    const [a, b] = s.spoke.map(SC); if (s.later) strand(D, a, b, Math.max(1.6, 2 * Math.max(.6, z)), rgba(LO.spoke_unlit)); else lit(a, b, lw, rgba(LO.bronze));
    if (!s.nodes) { if (!far) { strand(D, ...s.stem.map(SC), thin, rgba(LO.spoke_unlit)); s.blank.forEach(n => strand(D, SC(n.after < 0 ? s.fork : s.blank[n.after].at), SC(n.at), thin, rgba(LO.spoke_unlit))); } continue; }
    if (!far) {
      for (const h of s.haze) glow(D, ...SC(h.at), 0, h.radius * z, side(h.side === 'left' ? 'e' : 'g'), .07);
      for (const b of s.beads.slice(1)) { const R = SC(J.tree.root), c = rgba(on(s, b) ? LO.ring_on : LO.ring_off); for (let t = b.ring.from; t < b.ring.to; t += 6 / (b.ring.radius * z) / (Math.PI / 180)) { const u = t + 2.5 / (b.ring.radius * z) / (Math.PI / 180), p = d => [R[0] + Math.cos(d * Math.PI / 180) * b.ring.radius * z, R[1] + Math.sin(d * Math.PI / 180) * b.ring.radius * z]; strand(D, p(t), p(u), Math.max(1, .8 * z), c); } }
    }
    lit(...s.stem.map(SC), lw * .8, rgba(LO.bronze));
    const at = k => (s.nodes.find(n => n.key === k) || s.beads.find(b => b.key === k)).at;
    if (!far) for (let i = 1; i < s.tail.length; i++) strand(D, SC(at(s.tail[i - 1])), SC(at(s.tail[i])), thin * .7, rgba(LO.unlit));
    for (const [ka, kb] of s.links) {
      const A = s.nodes.find(n => n.key === ka) || s.beads.find(b => b.key === ka), B = s.nodes.find(n => n.key === kb) || s.beads.find(b => b.key === kb), L = on(s, A) && on(s, B);
      if (far && !L) continue; const fam = A.colour && A.colour !== 't' ? A.colour : B.colour || 't';
      if (L) lit(SC(A.at), SC(B.at), lw * .72, side(fam)); else strand(D, SC(A.at), SC(B.at), thin * (A.kind === 'stub' || B.kind === 'stub' ? .5 : .9), rgba(LO.unlit));
    }
    for (const [ka, id] of s.cross) { if (far) continue; const A = SC(at(ka)), B = SC(nodeOf(id).at), d = Math.hypot(B[0] - A[0], B[1] - A[1]), L = Math.min(d, 60 * z); for (let t = 0; t < L; t += 7) strand(D, [A[0] + (B[0] - A[0]) * t / d, A[1] + (B[1] - A[1]) * t / d], [A[0] + (B[0] - A[0]) * Math.min(L, t + 3) / d, A[1] + (B[1] - A[1]) * Math.min(L, t + 3) / d], thin * .7, rgba(LO.unlit)); }
  }
  const names = [];
  for (const s of J.tree.skills) {
    if (!s.nodes && far) { s.blank.forEach(n => put(D, get('Node Locked.png'), ...J.tree_pieces['Node Locked'].middle, Math.max(3, 4 * z) / (9 * sc), ...SC(n.at))); continue; }
    if (!s.nodes) { if (!far) s.blank.forEach(n => { const k = n.r * z / (n.kind === 'notable' ? 12 : 9) / sc, f = n.kind === 'notable' ? 'Notable Bare Locked' : 'Node Locked'; put(D, get(f + '.png'), ...J.tree_pieces[f].middle, k, ...SC(n.at)); }); continue; }
    if (!far) for (const b of s.beads) if (b.ring && b.ring.label) names.push([b.ring.label.text, SC(b.ring.label.at), 0, on(s, b) ? 'label' : 'hint', { along: [0, 0], pad: 0, align: b.ring.label.align }]);
    if (!far) for (const b of s.beads) put(D, get(`Node ${on(s, b) ? 'Taken' : 'Locked'}.png`), ...J.tree_pieces['Node Taken'].middle, b.r * z / (9 * sc), ...SC(b.at));
    for (const n of s.nodes) {
      const st = stateOf(s, n), St = st[0].toUpperCase() + st.slice(1), p = SC(n.at), little = n.kind === 'small' || n.kind === 'bridge' || n.kind === 'stub', notable = n.kind === 'notable';
      if (far) { const r = little ? Math.max(1.8, 2.4 * z) : Math.max(3, 4 * z); put(D, get(`Node ${St}.png`), ...J.tree_pieces['Node Taken'].middle, r / (9 * sc), ...p); continue; }
      const r = n.r * z, f = `${notable ? 'Notable' : 'Node'} Bare ${St}`, c = side(n.colour);
      if (st === 'open') glow(D, ...p, r * .7, r + (little ? 6 : 10) * Math.max(1, z * .8), c, .4);
      if (n.kind === 'bridge' || n.kind === 'stub') { for (let t = 0; t < 360; t += 2) { const q = d => [p[0] + Math.cos(d * Math.PI / 180) * (r + 2.2 * z), p[1] + Math.sin(d * Math.PI / 180) * (r + 2.2 * z)]; strand(D, q(t), q(t + 2), Math.max(1, .7 * z), st === 'taken' ? [214, 170, 98, 204] : [110, 116, 116, 178]); } }
      put(D, get(f + '.png'), ...J.tree_pieces[f].middle, n.r / (notable ? 12 : 9) * z / sc, ...p, { alpha: n.kind === 'stub' ? LO.stub_alpha : 1 });
      if (n.sign) { const size = r * J.signs.size[n.kind], a = st === 'taken' ? 1 : LO.sign_alpha[st], tint = st === 'taken' ? rgba(LO.sign_taken).slice(0, 3) : c; if (size >= J.signs.min_px) put(D, get(`${n.sign}.png`), J.signs.px / 2, J.signs.px / 2, size / J.signs.px, ...p, { tint, alpha: a }); else glow(D, ...p, r * J.signs.dot, r * J.signs.dot + .5, tint, a); }
      if (near && (n.kind === 'node' || n.kind === 'notable')) names.push([n.name, p, r + (notable ? 2 : 0), J.text.node_name.colour[st], n.label]);
    }
  }
  for (const s of J.tree.skills) {                                           // the skills: ring, medallion, plate
    const zz = Math.max(z, J.zoom.medallion_min), h = SC(s.hub), k = zz / sc, f = free(s), v = level(s), M = J.tree_pieces['Ring Empty'].middle;
    if (f > 0) glow(D, ...h, 27 * zz, 34 * zz + 14, rgba(LO.blue), .5);
    put(D, get('Ring Empty.png'), ...M, k, ...h);
    if (v > 0) { const full = get('Ring Full.png'), cutp = blank(full.w, full.h); for (let j = 0; j < full.h; j++) for (let i = 0; i < full.w; i++) { const t = (Math.atan2(i - M[0], -(j - M[1])) * 180 / Math.PI + 360) % 360; if (t <= v * 3.6) full.data.copy(cutp.data, (j * full.w + i) * 4, (j * full.w + i) * 4, (j * full.w + i) * 4 + 4); } put(D, cutp, ...M, k, ...h); }
    put(D, get(`Medallion ${s.name}.png`), ...J.tree_pieces[`Medallion ${s.name}`].middle, k, ...h);
    if (f > 0) { for (let t = 0; t < 360; t += 2) { const q = d => [h[0] + Math.cos(d * Math.PI / 180) * (28 * zz + 4), h[1] + Math.sin(d * Math.PI / 180) * (28 * zz + 4)]; strand(D, q(t), q(t + 2), 2.2, rgba(LO.blue_ring)); } say(D, '+' + f, 'title', h[0], h[1] + 28 * zz + 5, col('blue'), 'center', true, 2); }
    const face = far ? 'line' : 'title', py = Math.round(h[1] + 40 * zz + (zz < 1 ? 4 : 0) + (f > 0 ? 12 : 0)), val = s.later ? 'later' : String(v), [F1, p1] = FONT[face], [F2, p2] = FONT[s.later ? 'line' : face];
    const nw = textWidth(F1, s.name, p1), vw = textWidth(F2, val, p2), wd = nw + (far ? 5 : 7) + vw + (far ? 16 : 24), hh = far ? 20 : 26, x0 = h[0] - wd / 2 + (far ? 8 : 12);
    plateAt(D, get('Panel.png'), J.panel.cut, h[0] - wd / 2, py - hh / 2, wd, hh); say(D, s.name, face, x0, py, col(s.later ? 'hint' : 'label')); say(D, val, s.later ? 'line' : face, x0 + nw + (far ? 5 : 7), py, col(s.later ? 'hint' : 'value'));
  }
  put(D, get('Rosette.png'), ...J.tree_pieces.Rosette.middle, Math.max(z, J.zoom.medallion_min) / sc, ...SC(J.tree.root));
  for (const [str, p, r, c, L] of names) say(D, str, 'line', p[0] + L.along[0] * (r + L.pad), p[1] + L.along[1] * (r + L.pad), col(c), L.align, true, 2);
  if (z >= J.zoom.side_names) for (const s of J.tree.skills) for (const n of s.side_names || []) say(D, n.text, 'title', ...SC(n.at), [...side(n.side === 'left' ? 'e' : 'g'), 230].slice(0, 3), 'center', true, 2);
  // the panels stay put
  const S1 = J.panels.skills, list = J.tree.skills.filter(s => free(s) > 0), hgt = Math.max(S1.min_height, 132 + list.length * S1.row_step + (list.length ? 30 : 8) - 24);
  plateAt(D, get('Panel.png'), J.panel.cut, ...S1.at, S1.width, hgt);
  say(D, 'Skills', 'heading', ...S1.heading, col('value'), 'left', false); say(D, 'Total', 'title', ...S1.total, col('label'), 'left', false);
  say(D, J.tree.skills.reduce((t, s) => t + level(s), 0) + ' / ' + J.rules.total_cap, 'title', S1.total[0] + textWidth(FONT.title[0], 'Total', FONT.title[1]) + 8, S1.total[1], col('value'), 'left', false);
  say(D, 'Points to spend', 'title', ...S1.points, col('label'), 'left', false);
  list.forEach((s, i) => { const y = S1.first_row[1] + i * S1.row_step; say(D, s.name, 'line', S1.first_row[0], y, col('value'), 'left', false); say(D, '+' + free(s), 'line', S1.plus_right, y, col('blue'), 'right', false); });
  if (list.length) say(D, 'Click one to find it', 'line', S1.first_row[0], S1.first_row[1] + list.length * S1.row_step + 6, col('hint'), 'left', false);
  const Z = J.panels.zoom, B = J.pieces.Button.at, dB = [B[0] - Z.out[0], B[1] - Z.out[1]]; plateAt(D, get('Panel.png'), J.panel.cut, ...Z.rect);
  for (const r of [Z.out, Z.in]) paste(D, get('Button.png'), r[0] + dB[0], r[1] + dB[1]);
  say(D, '−', 'title', Z.out[0] + Z.out[2] / 2, Z.figure[1], col('value'), 'center'); say(D, '+', 'title', Z.in[0] + Z.in[2] / 2, Z.figure[1], col('value'), 'center'); say(D, Math.round(z * 100) + '%', 'title', ...Z.figure, col('value'), 'center');
  paste(D, get('Close.png'), ...J.pieces.Close.at);
  return D;
}

/* ---------- the command line ---------- */
const MAIN = process.argv[1] === fileURLToPath(import.meta.url);
const argv = MAIN ? process.argv.slice(2) : [], flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, out = flag('--out', 'game/client/art/made/ui/skills'), t0 = Date.now();
if (argv.includes('--pieces')) {
  mkdirSync(out, { recursive: true }); for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(`${out}/${f}`);       // a piece that was dropped goes too
  const at = {}, mid = {};
  for (const [n, make] of Object.entries(SCREEN)) { const r = make(), [p, x, y] = Array.isArray(r) ? r : [r, 0, 0]; at[n] = [x, y]; writePng(`${out}/${n}.png`, p.data, p.w, p.h); }
  for (const [n, make] of Object.entries(TREE_PIECES)) { const [p, x, y] = make(); mid[n] = [C - x, C - y]; writePng(`${out}/${n}.png`, p.data, p.w, p.h); }
  for (const [n, k] of Object.entries(SIGNS)) { const p = signPicture(SHAPES[k]); writePng(`${out}/${n}.png`, p.data, p.w, p.h); }
  writeFileSync(`${out}/skills.json`, JSON.stringify(layout(at, mid), null, '\t') + '\n');
  console.log(`${Object.keys(SCREEN).length + Object.keys(TREE_PIECES).length} pieces, ${Object.keys(SIGNS).length} signs and skills.json in ${out}/ in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (argv.includes('--check')) {
  if (!existsSync(`${out}/skills.json`)) { console.error(`--check: no pieces in ${out}/. Write them first: node scripts/art/ui/skills_tree.mjs --pieces`); process.exit(1); }
  const J = JSON.parse(readFileSync(`${out}/skills.json`, 'utf8')), bad = checkJson(J), missing = [...Object.keys(J.pieces), ...Object.keys(J.tree_pieces), 'Panel'].map(n => `${n}.png`).concat(J.signs.files).filter(f => !existsSync(`${out}/${f}`));
  for (const f of missing) bad.push(`missing ${f}`);
  const sw = J.tree.skills.find(s => s.name === 'Swords');
  for (const [name, z, cam] of [['whole', J.zoom.open, J.zoom.home], ['swords', 1, sw.into]]) { const D = compose(out, J, z, cam), f = `scripts/art/out/ui-skills-pieces-${name}.png`; mkdirSync(dirname(f), { recursive: true }); writePng(f, D.data, D.w, D.h); console.log(`${f} (${D.w} x ${D.h})`); }
  console.log(bad.length ? `${bad.length} problems:\n  ` + bad.slice(0, 20).join('\n  ') : `The json matches the webs: ${J.tree.skills.reduce((t, s) => t + (s.nodes ? s.nodes.length : 0), 0)} nodes, every strand and sign in place. ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (bad.length) process.exit(1);
} else if (MAIN) console.log('node scripts/art/ui/skills_tree.mjs --pieces | --check [--out dir]');
