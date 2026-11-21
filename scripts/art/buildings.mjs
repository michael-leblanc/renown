// Dawndoor's buildings, drafted from the green tileset's pieces (D189, D236): walls on tile edges, doors, gables and roofs.
//   node scripts/art/buildings.mjs                 # every draft, one picture each and a sheet of all, in scripts/art/out/buildings/
//   node scripts/art/buildings.mjs "House 1"       # only the drafts whose name starts with that
//   node scripts/art/buildings.mjs --pieces        # the tileset pieces the drafts use (each in 4 sides), one per line
// A building is written as a few lines (size, a wall family and style per storey, the roof, what stands on which edge) and laid
// out here into pieces { n, i, j, lift, key, part, ... }: i runs down to the right, j down to the left (as on the scene page), the
// door side is the south-west (j = d - 1), lift is pixels above the ground. Reads the pieces in game/client/art/tiles/ (bought art;
// the pictures it writes hold it too: never commit them). Drafts for Michael to pick from, not decided: none of it is game data yet.
//
// What the pieces do (found by laying them out, 2026-11-20; the full list is in docs/art-check.md):
// - A wall piece stands on one edge of its tile, the side its name ends with: _S the south-west edge, _E south-east, _N north-east,
//   _W north-west (as in land_plan.gd). An outside corner takes a corner piece, which holds both edges.
// - Ground floors use the pieces with a stone foot (1, 2, 7). Timber houses, upper storeys and gables use the ones on a timber sill
//   (8 to 16), lifted a storey (132 px): the sill reads as the beam between floors.
// - A doorway is no wall on that edge, the family's arched lintel (D6, F6) on top, and Door A1 in it. The flat lintel (5) leaves a gap.
// - Roofs are drawn at ground height: lift them by the walls' height. A slope piece (1) covers one tile and climbs RISE; a hip
//   roof's corners are the corner pieces (6).
// - The pieces are lit the same on every side. LIGHT darkens the sides facing left, shades the walls under the eaves and lays a
//   shadow on the ground: without them a building reads as flat.
// - Draw a building as its pieces sorted with the characters, never as one picture: one picture covers whoever is inside or behind.
import { readFileSync, existsSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';
import { round, floorPaint } from './round.mjs';

export const TILES = 'game/client/art/tiles/', OUT = 'scripts/art/out/buildings/';
export const STOREY = 132;               // a wall's height in pixels: what a gable, a roof or an upper storey is lifted by
export const RISE = 64;                  // how much a roof slope climbs over one tile
const AX = 128, AY = 208;                // the tile's middle in every 256 x 256 piece
const DEPTH = { N: -0.5, W: -0.5, S: 0.5, E: 0.5 };
const DARK = [0.5, 0.49, 0.56], DARK_ROOF = [0.6, 0.58, 0.66];   // tints that turn pale stone and mud to dark rock
/** Every edge of a w by d building left open: for a shed that stands on posts. */
const open = (w, d) => Object.fromEntries([...Array(w).keys()].flatMap(i => [[`${i},0,N,0`, ''], [`${i},${d - 1},S,0`, '']]).concat([...Array(d).keys()].flatMap(j => [[`0,${j},W,0`, ''], [`${w - 1},${j},E,0`, '']])));
const RED = [1.3, 0.74, 0.7];   // a tint that turns the pack's brown plank roof dark red
const GABLE_UP = 5;   // a gable wall runs this far up under the roof's edge, so no land shows through the edge's notches
const BACK = [96, 128], BACK_IN = 16;   // the dark behind a stake wall's points: heights above the ground, and how far it stays in from an outer corner
const TURN = { E: 'S', N: 'E', W: 'N', S: 'W' };   // some desert corner pieces (the palisade, the thatch) are named a quarter turn on from the green set's
// Light comes from the right, as on the pack's own props (their shadows fall to the left): walls and slopes facing the
// viewer's left are darker. The pieces themselves are lit the same on every side, which reads as flat.
export const LIGHT = { S: 0.85, E: 1, N: 1, W: 1, roofS: 0.9, roofE: 1.06, eave: 26, eaveDark: 0.62, shadow: [-0.35, 0.8], shadowAlpha: 84 };
// the wall pieces of each style, by number in the family (D pale stone, F darker stone)
const STYLE = {
  stone: { plain: 1, corner: 2, window: 7, lintel: 6 },      // with a stone foot: ground floors only
  timber: { plain: 8, corner: 10, window: 16, lintel: 6 },   // on a timber sill: timber houses, upper storeys, gables
  // the desert tileset (set: 'desert/'): logs (C), mud walls straight or leaning (H tan, I dark, K pale), a spiked palisade (B),
  // cracked plaster (G)
  log: { plain: 1, corner: 2, window: 4, lintel: 6 }, logtop: { plain: 8, corner: 2, window: 9, lintel: 6 },
  mud: { plain: 3, corner: 20, window: 22, lintel: 12 }, lean: { plain: 1, corner: 4, window: 13, lintel: 12, grow: true },   // grow: a leaning wall's slanted end leaves pinholes at the joint
  stakes: { plain: 1, corner: 2, window: 1, lintel: null, turn: true },   // its corners are named a quarter turn on
  plaster: { plain: 1, corner: 3, window: 9, lintel: 10 },
  ruin: { plain: 1, corner: 2, window: 4, lintel: 9 },   // sandstone ruins (A): ragged tops, dark barred windows, a broken arch
};

/** Lays a building out into pieces { n, i, j, lift, key, part, edges, band, tone, eave }. Sort by key (i + j, plus half a tile for
 *  an edge in front) and draw in that order with the characters (a character on tile i, j sorts at i + j + 0.01). part: 'wall',
 *  'near' (on the side toward the viewer, faded when you are inside, D208), 'roof' (hidden when you are inside: the slopes and
 *  the gables), 'prop', 'ground' (its shadow). pixels() turns a piece into its picture (cut, shaded).
 *  w tiles along i, d along j (both even). floors: one 'family style' per storey, ground first ('D stone', 'F timber').
 *  roof: { fam, kind: 'gable' (ridge along i, gable ends left and right) | 'hip' (four slopes), dormers: [i, ...] on the front
 *  eave row }. at: {'i,j,side,storey': 'door' | 'gap' | 'w' (window) | a piece number | ''}; the door side is the south-west,
 *  j = d - 1. gable: {j: number} pieces for the right gable's tiles. flora: [[i, j, side, n]] ivy (WallFlora A n) on a wall.
 *  A corner tile gets its style's corner piece, over any window named there, unless one of its two edges has a door or a gap. */
export function build({ w, d, floors, roof, at = {}, gable = {}, door = 'Door A1', props = [], chimney = null, flora = [], shadow = true, set = '', tones = true, wallTint = null }) {
  // wallTint: a colour for every wall piece (a keep of dark stone)
  const P = [], put = (n, i, j, lift, key, part, more = {}) => { const p = { n, i, j, lift, key, part, edges: null, band: null, ...more }; if (wallTint && p.edges && !p.tint) p.tint = wallTint; P.push(p); return p; };
  const F = floors.map(f => { const [fam, style] = f.split(' '); return { fam, ...STYLE[style] }; }), top = F.length - 1;
  const T = F.length * STOREY, half = d / 2, hip = roof.kind === 'hip', flat = roof.kind === 'flat', bare = roof.kind === 'none', rw = roof.to ?? w;   // bare: no roof. roof.to: the roof covers columns 0 to roof.to - 1 only, the rest is an open yard
  const tone = es => !tones ? null : es.includes('S') && es.includes('E') ? [LIGHT.S, LIGHT.E] : es.includes('S') ? [LIGHT.S, LIGHT.S] : null;   // the front corner shows both faces
  // the corner pieces: named for the corner of their tile they stand on, holding its two edges (_W the back corner, N + W edges)
  const CORNER = [[0, 0, 'W', ['N', 'W'], -0.5, 'wall'], [w - 1, 0, 'N', ['N', 'E'], 0.5, 'near'], [w - 1, d - 1, 'E', ['E', 'S'], 0.5, 'near'], [0, d - 1, 'S', ['S', 'W'], 0.5, 'near']];
  F.forEach((f, s) => {
    const L = s * STOREY, taken = new Set(), name = v => `${set}Wall ${f.fam}${v}`;
    // under the eaves the roof shades the top of the wall; under a gable roof that is the front wall only (the gable is shaded along its slope)
    const eave = (e, i = 0) => !flat && !bare && i < rw && s === top && (e === 'S' || (hip && e === 'E')) ? T : null;
    for (const [i, j, side, es, dk, part] of CORNER) {
      if (es.some(e => ['door', 'gap', ''].includes(at[`${i},${j},${e},${s}`]))) continue;   // a corner wins over a window
      put(`${name(f.corner)}_${f.turn ? TURN[side] : side}`, i, j, L, i + j + dk, part, { edges: es, tone: tone(es), eave: es.map(e => eave(e, i)).find(Boolean) ?? null, eaveOn: es.filter(e => eave(e, i)), grow: f.grow });
      es.forEach(e => taken.add(`${i},${j},${e}`));
    }
    const edges = [];
    // behind the points of a stake wall, and behind its door: the dark of the room, not the land beyond. It stays clear of
    // the two outer corners, and reaches a little past a door, whose piece is narrower than its tile
    if (f.turn && s === top) {
      const back = (e, door, first) => ({ edges: [e], back: door ? [4, 128] : BACK,
        clip: e === 'S' ? [first ? 64 + BACK_IN : 64, door ? 136 : 128] : [door ? 120 : 128, first ? 192 - BACK_IN : 192] });
      for (let i = 0; i < w; i++) put('#back', i, d - 1, L, i + d - 1 + 0.49, 'roof', back('S', at[`${i},${d - 1},S,${s}`] === 'door', !i));
      for (let j = 0; j < d; j++) put('#back', w - 1, j, L, w - 1 + j + 0.49, 'roof', back('E', at[`${w - 1},${j},E,${s}`] === 'door', !j));
    }
    for (let i = 0; i < w; i++) edges.push([i, 0, 'N'], [i, d - 1, 'S']);
    for (let j = 0; j < d; j++) edges.push([0, j, 'W'], [w - 1, j, 'E']);
    for (const [i, j, e] of edges) {
      if (taken.has(`${i},${j},${e}`)) continue;
      const v = at[`${i},${j},${e},${s}`] ?? f.plain, k = i + j + DEPTH[e], part = e === 'S' || e === 'E' ? 'near' : 'wall', more = { edges: [e], tone: tone([e]), eave: eave(e, i), eaveOn: [e], grow: f.grow };
      if (v === 'door') { if (f.lintel) put(`${name(f.lintel)}_${e}`, i, j, L, k, part, { ...more, open: true }); put(/_[SENW]$/.test(door) ? set + door : `${set}${door}_${e}`, i, j, L, k + 0.001, part, { tone: tone([e]), open: true }); }
      else if (v === 'gap') { if (f.lintel) put(`${name(f.lintel)}_${e}`, i, j, L, k, part, { ...more, open: true }); }
      else if (v !== '') put(`${name(v === 'w' ? f.window : v)}_${e}`, i, j, L, k, part, more);
    }
  });
  for (const [i, j, e, n] of flora) put(`${set}WallFlora A${n}_${e}`, i, j, 0, i + j + DEPTH[e] + 0.002, e === 'S' || e === 'E' ? 'near' : 'wall', { tone: tone([e]) });
  // the roof. Every slope piece (1) covers one tile and climbs RISE; its lower lip lies over the row below. The slopes facing the
  // viewer are _S (left) and _E (right); _N and _W are the far sides, seen edge-on. A hip roof's corners are the corner pieces (6).
  const rf = (v, side) => `${set}Roof ${roof.fam}${v}_${side}`, rt = side => side === 'S' ? [LIGHT.roofS, LIGHT.roofS] : side === 'E' ? [LIGHT.roofE, LIGHT.roofE] : null;
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
    const near = { S: d - 1 - j, N: j, E: rw - 1 - i, W: i };
    if (bare || i >= rw) continue;
    if (flat) {
      // a flat mud roof: a slab on every tile, its top level with the walls' top; round the edge the slab with a low wall on its
      // outer side (10), a corner (7) or one with a roof beam poking out (6, on the tiles named in roof.beams)
      const out = Object.keys(near).filter(s => near[s] === 0).join(''), c = { ES: 'E', SW: 'S', EN: 'N', NW: 'W' }[[...out].sort().join('')];
      const v = c ? 7 : out ? ((roof.beams || []).includes(`${i},${j}`) ? 6 : 10) : 5;
      put(`${set}Wall ${roof.fam}${v}_${c || out || 'S'}`, i, j, T - (roof.drop ?? 28), i + j + 0.6, 'roof', { tint: roof.tint });
      continue;
    }
    if (!hip) {
      const side = j < half ? 'N' : 'S', up = near[side], dormer = side === 'S' && up === 0 && (roof.dormers || []).includes(i);
      put(dormer ? rf(8, 'W') : rf(1, side), i, j, T + up * RISE, i + j + 0.6, 'roof', { tone: rt(side) });   // the dormer piece's sides are named a quarter turn off
      continue;
    }
    const up = Math.min(...Object.values(near)), on = Object.keys(near).filter(s => near[s] === up).join('');
    const corner = { SE: 'E', SW: 'S', NE: 'N', NW: 'W' }[on];
    const piece = corner ? rf(6, roof.turn ? TURN[corner] : corner) : rf(1, on), tone = corner === 'E' ? [LIGHT.roofS, LIGHT.roofE] : corner === 'S' ? rt('S') : corner === 'N' ? rt('E') : rt(on);
    // a roof of loose planks has gaps: the same piece a little lower and dark shows through them, not the land
    if (roof.back) for (const n of [2, 1]) put(piece, i, j, T + up * RISE - n * roof.back, i + j + 0.59, 'roof', { tint: [0.28, 0.24, 0.24] });
    put(piece, i, j, T + up * RISE, i + j + 0.6, 'roof', { tone, tint: roof.tint });
  }
  // the right gable end: the style's plain wall on its sill (a tie beam along the walls' top), stacked a storey at a time and cut
  // along the roof's slope. The pack's gable halves (17, 18) leave steps; the left gable faces away and is not built.
  if (!hip && !flat && !bare) for (let j = 0; j < d; j++) {
    const i = w - 1, G = STYLE[roof.gable || 'timber'], peak = T + RISE * Math.min(j + 1, d - j), f = F[top];
    for (let n = 0; T + n * STOREY < peak; n++) {
      const v = gable[`${j},${n}`] ?? gable[j] ?? G.plain;
      put(`${set}Wall ${roof.gableFam || f.fam}${v === 'w' ? G.window : v}_E`, i, j, T + n * STOREY, i + j + DEPTH.E + 0.001 * (n + 1), 'roof', { edges: ['E'], band: [T + n * STOREY - 1, T + (n + 1) * STOREY, 'roof'] });
    }
  }
  if (chimney) put(set + chimney[0], chimney[1], chimney[2], T + chimney[3], chimney[1] + chimney[2] + 0.55, 'roof');   // before the roof row in front, so the slope hides its foot
  for (const [n, i, j, lift = 0, key = i + j, part, tint] of props) put(set + n, i, j, lift, key, part || (!set && /^Misc D/.test(n) ? 'near' : 'prop'), !set && /^Misc D/.test(n) && n.endsWith('_E') ? { tone: tone(['S']) } : tint ? { tint } : {});   // a banner hangs on a wall
  // its shadow on the ground, one piece a tile: the footprint pushed along LIGHT.shadow, longer for a taller building
  const sv = LIGHT.shadow.map(v => v * (0.55 + 0.45 * F.length));
  if (shadow) for (let i = Math.floor(sv[0]); i < w; i++) for (let j = 0; j < Math.ceil(d + sv[1]); j++) if (i < 0 || j >= d) put('#shadow', i, j, 0, i + j - 0.9, 'ground');
  P.sort((a, b) => a.key - b.key || a.lift - b.lift);
  return { w, d, T, hip, sv, set, pieces: P };
}

// where each edge runs in a 256 x 256 piece (the tile's middle at 128, 208): [x, y] at its back end, then at its front end
const EDGE = { N: [[128, 176], [192, 208]], E: [[192, 208], [128, 240]], S: [[128, 240], [64, 208]], W: [[128, 176], [64, 208]] };
const shade = (out, o, m) => { for (let k = 0; k < 3; k++) out[o + k] = Math.min(255, Math.round(out[o + k] * m)); };
/** A piece's picture, as it is drawn: cut to its band (a pixel stays if its height above the ground under it, on the piece's
 *  edges, is within [lo, hi); hi 'roof': up to the roof's slope over that point, for a gable), toned by the side it faces, and
 *  darkened under the eaves. '#shadow' is drawn here: the building's shadow over one tile. b: the building. */
export function pixels(p, b) {
  if (p.data) return { width: 256, height: 256, data: p.data };   // a round building's piece, drawn in round.mjs
  if (p.n === '#shadow') return shadowTile(p, b);
  if (p.n === '#back') {
    const out = Buffer.alloc(256 * 256 * 4), [[ax, ay], [bx, by]] = EDGE[p.edges[0]];
    for (let x = p.clip ? p.clip[0] : Math.min(ax, bx); x < (p.clip ? p.clip[1] : Math.max(ax, bx)); x++) { const gy = ay + (x - ax) / (bx - ax) * (by - ay);
      for (let y = Math.round(gy - p.back[1]); y < gy - p.back[0]; y++) out.set([44, 33, 24, 255], (y * 256 + x) * 4); }
    return { width: 256, height: 256, data: out };
  }
  const img = load(p.n); if (!p.band && !p.tone && !p.eave && !p.grow && !p.tint) return img;
  const [lo, hi, roofCut] = p.band || [-Infinity, Infinity], out = Buffer.from(img.data);
  for (let x = 0; x < 256; x++) {
    const m = p.tone ? p.tone[x < 128 ? 0 : 1] : 1;
    let e = null, t = 0, gy = 0;
    if (p.edges) {
      // a column two edges share (the left and right corner pieces) shows the front face, so measure from the lower ground line
      const cand = p.edges.map(e => { const [[ax, ay], [bx, by]] = EDGE[e], t = Math.max(0, Math.min(1, (x - ax) / (bx - ax)));
        return { e, t, gy: ay + t * (by - ay), on: x >= Math.min(ax, bx) && x <= Math.max(ax, bx) }; });
      ({ e, t, gy } = cand.filter(c => c.on).sort((a, b) => b.gy - a.gy)[0] || cand[0]);
    }
    // slope: the roof's height over this column of a gable (the shade under it follows it, not a storey's top). A log's end
    // that reaches past its tile is cut by the roof's line over the next tile, as it shows on screen
    let top = hi, slope = hi;
    if (roofCut) {
      const [[ax, ay], [bx, by]] = EDGE[e], tt = (x - ax) / (bx - ax), u = p.j + (e === 'N' || e === 'S' ? 0.5 : tt);
      slope = b.T + RISE * Math.min(u, b.d - u) + GABLE_UP - (tt - t) * (by - ay); top = Math.min(hi, slope);
    }
    const eave = p.eave && p.eaveOn.includes(e) ? p.eave : roofCut ? slope : null;   // where the roof's edge is over this column
    for (let y = 0; y < 256; y++) {
      const o = (y * 256 + x) * 4; if (!out[o + 3]) continue;
      const h = gy - y + p.lift;
      if (p.edges && (h < lo || h >= top)) { out[o + 3] = 0; continue; }
      let k = m;
      if (eave !== null && h > eave - LIGHT.eave) k *= LIGHT.eaveDark + (1 - LIGHT.eaveDark) * Math.max(0, Math.min(1, (eave - h) / LIGHT.eave));
      if (k !== 1) shade(out, o, k);
    }
  }
  if (p.tint) for (let o = 0; o < out.length; o += 4) if (out[o + 3]) for (let k = 0; k < 3; k++) out[o + k] = Math.min(255, Math.round(out[o + k] * p.tint[k]));   // a colour of its own (a dark red roof)
  if (p.grow) {   // one pixel wider on each side, in the colour next to it
    const src = Buffer.from(out);
    for (let y = 0; y < 256; y++) for (let x = 1; x < 255; x++) { const o = (y * 256 + x) * 4; if (src[o + 3]) continue;
      const q = src[o - 1] ? o - 4 : src[o + 7] ? o + 4 : -1; if (q >= 0) src.copy(out, o, q, q + 4); }
  }
  return { width: 256, height: 256, data: out };
}
/** The building's shadow over tile p.i, p.j: every point of the ground the footprint covers when pushed along b.sv, less the
 *  footprint itself (a floor inside is not in shadow once the roof is off). */
function shadowTile(p, b) {
  const out = Buffer.alloc(256 * 256 * 4), [vx, vy] = b.sv;
  for (let y = 176; y <= 240; y++) for (let x = 64; x <= 192; x++) {
    const X = (x + 0.5 - AX) / 64, Y = (y + 0.5 - AY) / 32, du = (X + Y) / 2 + 0.5, dv = (Y - X) / 2 + 0.5;
    if (du < 0 || du >= 1 || dv < 0 || dv >= 1) continue;
    const u = p.i + du, v = p.j + dv;
    if (u >= 0 && u < b.w && v >= 0 && v < b.d) continue;
    // is there an s in [0, 1] with (u, v) - s * (vx, vy) inside the footprint? (vx < 0, vy > 0: the shadow falls to the left)
    if (Math.max(0, u / vx, (v - b.d) / vy) <= Math.min(1, (u - b.w) / vx, v / vy)) out[(y * 256 + x) * 4 + 3] = LIGHT.shadowAlpha;
  }
  return { width: 256, height: 256, data: out };
}

/** The drafts, sized from Ultima Online (its smallest house and its small shops are 7 by 7 tiles with walls on tiles; here walls
 *  are on edges, so every tile inside is floor). Each door faces the south-west (the viewer's left). */
// round buildings (round.mjs): the packs have no curved pieces, so the wall is a pack wall bent into a ring and the roof a cone or a dome
const RND = o => round({ light: LIGHT, ...o });
const EARTH = floorPaint('game/client/art/made/Floor Earth A1_S.png');
const BARREN = [154, 124, 94], STONE_DARK = [0.8, 0.76, 0.78], THATCH_DARK = [0.84, 0.78, 0.74], STAKES = [0.86, 0.8, 0.78], DOOR = [1.22, 1.16, 1.1];   // the dry earth the round drafts are shown on; darker stone and thatch than the desert's
export const DRAFTS = {
  'House 1, stone and red tile': build({ w: 6, d: 4, floors: ['D stone'], roof: { fam: 'C', kind: 'gable' }, chimney: ['Roof G1_S', 1, 1, 60],
    at: { '2,3,S,0': 'door', '0,3,S,0': 'w', '1,3,S,0': 'w', '4,3,S,0': 'w', '5,1,E,0': 'w', '5,2,E,0': 'w', '1,0,N,0': 'w', '4,0,N,0': 'w', '0,1,W,0': 'w' },
    flora: [[3, 3, 'S', 9], [5, 2, 'E', 14]], props: [['Misc A3_S', 3, 4], ['Misc B1_S', 6, 3]] }),
  'House 2, timber frame and thatch': build({ w: 6, d: 4, floors: ['F timber'], roof: { fam: 'A', kind: 'gable' }, gable: { 1: 13, 2: 12 },
    at: { '3,3,S,0': 'door', '1,3,S,0': 'w', '4,3,S,0': 'w', '2,3,S,0': 12, '5,1,E,0': 'w', '5,2,E,0': 14, '2,0,N,0': 'w', '0,2,W,0': 'w' },
    props: [['Misc A9_S', 2, 4], ['Misc B1_S', 4, 4]] }),
  'Shop 1, stone and slate': build({ w: 8, d: 6, floors: ['D stone'], roof: { fam: 'D', kind: 'hip' },
    at: { '2,5,S,0': 'door', '5,5,S,0': 'door', '0,5,S,0': 'w', '1,5,S,0': 'w', '3,5,S,0': 'w', '4,5,S,0': 'w', '6,5,S,0': 'w',
      '7,1,E,0': 'w', '7,2,E,0': 'w', '7,3,E,0': 'w', '7,4,E,0': 'w', '2,0,N,0': 'w', '5,0,N,0': 'w', '0,2,W,0': 'w', '0,3,W,0': 'w' },
    props: [['Misc B52_S', 4, 6], ['Misc B3_S', -1, 5]] }),
  'Shop 2, stone below, timber above': build({ w: 8, d: 6, floors: ['D stone', 'D timber'], roof: { fam: 'E', kind: 'gable' }, gable: { 2: 'w', 3: 'w', '2,1': 8, '3,1': 8 },
    at: { '3,5,S,0': 'door', '1,5,S,0': 'w', '2,5,S,0': 'w', '5,5,S,0': 'w', '6,5,S,0': 'w', '7,1,E,0': 'w', '7,2,E,0': 'w', '7,3,E,0': 'w', '7,4,E,0': 'w', '3,0,N,0': 'w', '0,2,W,0': 'w',
      '1,5,S,1': 'w', '3,5,S,1': 'w', '4,5,S,1': 12, '6,5,S,1': 'w', '2,5,S,1': 12, '5,5,S,1': 12, '7,1,E,1': 'w', '7,4,E,1': 'w', '7,2,E,1': 12, '7,3,E,1': 12, '2,0,N,1': 'w', '5,0,N,1': 'w', '0,2,W,1': 'w' },
    props: [['Misc B37_N', 5, 6, 0, 11.4], ['Misc B37_N', 6, 6, 0, 12.4], ['Misc B1_S', 7, 6], ['Misc A9_S', 0, 6]] }),
  'Guard post 1, dark stone and slate': build({ w: 6, d: 6, floors: ['F stone'], roof: { fam: 'D', kind: 'hip' },
    at: { '2,5,S,0': 'door', '0,5,S,0': 'w', '4,5,S,0': 'w', '5,1,E,0': 'w', '5,4,E,0': 'w', '2,0,N,0': 'w', '0,3,W,0': 'w' },
    props: [['Misc D1_E', 1, 5, 30, 6.5], ['Misc D1_E', 3, 5, 30, 8.5]] }),
  'Guard post 2, a tower, red tile': build({ w: 4, d: 4, floors: ['F stone', 'F timber'], roof: { fam: 'C', kind: 'hip' },
    at: { '1,3,S,0': 'door', '3,1,E,0': 'w', '0,3,S,1': 'w', '2,3,S,1': 'w', '3,1,E,1': 'w', '3,2,E,1': 'w', '1,0,N,1': 'w', '0,1,W,1': 'w' },
    props: [['Misc D1_E', 2, 3, 30, 5.5]] }),
  // Oldscar, the orc and goblin town, from the desert tileset (D235, D236). Orcs build big and heavy, goblins small and patched.
  'Orc house 1, logs and thatch': build({ set: 'desert/', w: 8, d: 6, floors: ['C log'], roof: { fam: 'A', kind: 'gable', gable: 'logtop' },
    at: { '3,5,S,0': 'door', '1,5,S,0': 'w', '5,5,S,0': 'w', '6,5,S,0': 'w', '7,1,E,0': 'w', '7,4,E,0': 'w', '2,0,N,0': 'w', '5,0,N,0': 'w', '0,2,W,0': 'w', '0,4,W,0': 'w' },
    props: [['Misc D2_E', 3, 6, 0, 8.7], ['Misc D1_E', 3, 6, 0, 9.3], ['Misc D8_E', 7, 2.5, 96, 10.7, 'roof'], ['Misc B45_S', 0, 6], ['Misc B45_S', 8, 5], ['Misc B8_S', 6, 6]] }),
  'Orc house 2, dark mud and roof beams': build({ set: 'desert/', tones: false, w: 8, d: 5, floors: ['I lean'], roof: { fam: 'I', kind: 'flat', drop: 4, beams: ['1,4', '2,4', '3,4', '4,4', '5,4', '6,4'] },
    at: { '3,4,S,0': 'door', '2,4,S,0': 8, '4,4,S,0': 9, '6,4,S,0': 15, '7,1,E,0': 13, '7,3,E,0': 13, '2,0,N,0': 14, '5,0,N,0': 14, '0,2,W,0': 14 },
    props: [['Misc D8_E', 7, 2, -34, 9.7, 'near'], ['Misc B45_S', 2, 5], ['Misc B45_S', 5, 5], ['Misc A1_E', 9, 4]] }),
  // a wilder take (Michael, 2026-11-20: "more orcish"): battered walls or a stockade, crossed spars on the ridge, a dark red roof, spikes and trophies
  'Orc house 3, war hall with ridge spars': build({ set: 'desert/', tones: false, w: 8, d: 6, floors: ['I lean'], roof: { fam: 'A', kind: 'hip', turn: true },
    at: { '3,5,S,0': 'door', '2,5,S,0': 8, '4,5,S,0': 9, '6,5,S,0': 15, '7,1,E,0': 13, '7,4,E,0': 13, '2,0,N,0': 14, '5,0,N,0': 14, '0,2,W,0': 14 },
    props: [['Roof A3_S', 3, 2.5, 292, 12, 'roof'], ['Roof A3_S', 4, 2.5, 292, 12.1, 'roof'], ['Misc A1_E', 3.5, 4.5, 200, 13, 'roof'],
      ['Misc D2_E', 3, 6, 0, 8.7], ['Misc D1_E', 3, 6, 0, 9.3], ['Misc D8_E', 7, 2.5, -50, 10.7, 'near'], ['Misc B45_S', 1, 6], ['Misc B45_S', 5, 6],
      ['Wall B6_S', -1, 6], ['Wall B6_E', 8, 6], ['Wall B5_E', 8, 1], ['Wall B5_E', 8, 3]] }),
  'Orc house 4, stockade lodge, red roof': build({ set: 'desert/', w: 8, d: 6, floors: ['B stakes'], roof: { fam: 'E', kind: 'hip', back: 5, tint: RED }, door: 'Door C9_E',
    at: { '3,5,S,0': 'door' },
    props: [['Roof A3_S', 3, 2.5, 292, 12, 'roof', RED], ['Roof A3_S', 4, 2.5, 292, 12.1, 'roof', RED],
      ['Misc D2_E', 3, 6, 0, 8.7], ['Misc D1_E', 3, 6, 0, 9.3], ['Misc D8_S', 6, 5, -30, 11.7, 'near'], ['Misc D8_E', 7, 2.5, -30, 10.7, 'near'], ['Misc B45_S', 1, 6], ['Misc B45_S', 5, 6],
      ['Wall B6_S', -1, 6], ['Wall B6_E', 8, 6]] }),
  // three more styles, after reading how orcs build in other games, books and tabletop settings (2026-11-20): a palisaded
  // stronghold's open shed, a hall taken over in a sandstone ruin, and a keep of dark stone
  'Orc house 5, forge shed on posts': build({ set: 'desert/', w: 4, d: 4, floors: ['C log'], roof: { fam: 'A', kind: 'hip', turn: true }, at: open(4, 4),
    props: [['Wall E1_W', 0, 0, 0, -0.4], ['Wall E1_N', 3, 0, 0, 2.6], ['Wall E1_S', 0, 3, 0, 3.4], ['Wall E8_E', 3, 3, 0, 6.5],
      ['Misc B16_S', 0.9, 3], ['Misc A9_S', 3, 1.2], ['Misc B8_S', 1.9, 2.9]] }),
  // the roof was rebuilt over six columns; the last two are a walled yard open to the sky, with a breach closed by spikes
  'Orc house 6, a hall in a captured ruin': build({ set: 'desert/', w: 8, d: 6, floors: ['A ruin'], roof: { fam: 'A', kind: 'hip', turn: true, to: 6 }, door: 'Door C9_E',
    at: { '3,5,S,0': 'door', '1,5,S,0': 'w', '6,5,S,0': 7, '7,1,E,0': 'w', '7,3,E,0': '', '7,4,E,0': 7, '2,0,N,0': 'w', '4,0,N,0': 'w', '6,0,N,0': 5, '0,2,W,0': 'w' },
    props: [['Wall A6_S', 3, 5, 0, 8.55, 'near'], ['Wall A6_S', 4, 5, 0, 9.55, 'near'], ['Misc D8_S', 5, 5, -24, 11.7, 'near'], ['Wall E1_E', 5, 2, 0, 7.5], ['Wall E1_E', 5, 0, 0, 5.5],
      ['Wall A8_S', -1, 5], ['Wall A8_S', 7, 3, 0, 10.4], ['Wall B6_E', 8, 3], ['Misc B8_S', 6, 4, 0, 10], ['Misc B45_S', 0, 6], ['Misc B45_S', 7, 6]] }),
  'Orc house 7, a keep of dark stone': build({ set: 'desert/', w: 6, d: 6, floors: ['D stone', 'D timber'], roof: { fam: 'I', kind: 'flat', drop: 4, tint: DARK }, door: 'Door C1', wallTint: DARK,
    at: { '2,5,S,0': 'door', '5,5,S,0': 'w', '1,5,S,1': 'w', '4,5,S,1': 'w', '5,1,E,1': 'w', '5,4,E,1': 'w', '5,2,E,0': 'w', '2,0,N,1': 'w', '0,3,W,1': 'w' },
    props: [['Misc D8_S', 2.5, 5, 96, 8.9, 'near'], ['Misc B45_S', 1, 6], ['Misc B45_S', 4, 6], ['Wall B6_S', 0, 5, 280, 11.7, 'roof'], ['Wall B6_S', 5, 5, 280, 11.8, 'roof'], ['Wall B6_S', 5, 0, 280, 11.6, 'roof'], ['Wall B6_S', 0, 0, 280, 11.5, 'roof'], ['Wall B6_S', -1, 6], ['Wall B6_E', 6, 6], ['Wall B5_E', 6, 1], ['Wall B5_E', 6, 3]] }),
  // round homes on barren land (Michael, 2026-11-21: less "cowboy", more round): a ring wall under a dome of hides or a cone of thatch,
  // tusks of bone round it. Drawn by round.mjs; the door, the skulls and the banners are the pack's pieces
  'Orc round house 1, hide dome and tusks': RND({ D: 6, floor: EARTH, land: BARREN, wall: { paint: 'stones', H: 124, tint: STONE_DARK, holes: [{ at: 15, w: 8, h: 11 }, { at: 48, w: 8, h: 11 }, { at: 128, w: 8, h: 11 }] }, door: { tex: 'Door C9_E', tint: DOOR },
    roofs: [{ kind: 'dome', paint: 'hide', gores: 18, band: 13, r0: 3.12, z0: 112, z1: 112 + 150 }, { kind: 'dome', paint: 'flat', color: [52, 40, 30], r0: 0.42, z0: 256, z1: 266 }],
    bones: [0, 45, 90, 135, 180, 225, 270, 315].map(at => ({ at: at + 22.5, r: 3.05, z: 116, h: 112, out: 0.5, back: 0.35, w: 19 })),
    props: [['Misc D8_S', 3, 5, 122, 99, 'roof'], ['Misc B45_S', 2, 6], ['Misc B45_S', 5, 6]] }),
  'Orc round house 2, stakes and thatch': RND({ D: 6, floor: EARTH, land: BARREN, wall: { paint: 'stakes', H: 136, foot: 10, tint: STAKES }, door: { tex: 'Door C9_E', tint: DOOR },
    roofs: [{ kind: 'cone', paint: 'thatch', tex: 'desert/Roof A1_S', tint: THATCH_DARK, r0: 3.25, z0: 122, r1: 0, z1: 122 + 3.25 * 80 }, { kind: 'cone', paint: 'flat', color: [84, 64, 48], r0: 0.34, z0: 358, r1: 0.22, z1: 398 }],
    bones: [{ at: 'door', off: -15, r: 3.42, h: 176, out: 0.05, back: 0.12, swing: 0.5, w: 24, after: true }, { at: 'door', off: 15, r: 3.42, h: 176, out: 0.05, back: 0.12, swing: -0.5, w: 24, after: true }] }),
  'Orc round house 3, great hall': RND({ D: 8, floor: EARTH, land: BARREN, wall: { paint: 'stakes', H: 136, foot: 10, tint: STAKES }, door: { tex: 'Door C9_E', tint: DOOR },
    roofs: [{ kind: 'cone', paint: 'hide', gores: 26, band: 13, rows: 1, r0: 4.25, z0: 124, r1: 2.1, z1: 124 + 150 }, { kind: 'cone', paint: 'stakes', per: 7, H: 60, tint: [0.7, 0.64, 0.62], r0: 2.1, z0: 268, r1: 2.1, z1: 306 },
      { kind: 'dome', paint: 'hide', gores: 14, band: 11, r0: 2.5, z0: 300, z1: 300 + 110 }, { kind: 'dome', paint: 'flat', color: [52, 40, 30], r0: 0.36, z0: 404, z1: 413 }],
    bones: [{ at: 'door', off: -12, r: 4.42, h: 190, out: 0.05, back: 0.12, swing: 0.55, w: 27, after: true }, { at: 'door', off: 12, r: 4.42, h: 190, out: 0.05, back: 0.12, swing: -0.55, w: 27, after: true },
      ...[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map(at => ({ at, r: 2.4, z: 302, h: 92, out: 0.42, back: 0.3, w: 16 }))],
    props: [['Misc D8_S', 4, 7, 172, 99, 'roof'], ['Misc B45_S', 2, 8], ['Misc B45_S', 7, 8]] }),
  'Goblin round hut, a mud beehive': RND({ D: 4, floor: EARTH, land: BARREN, wall: { paint: 'mud', color: [146, 122, 92], H: 84, holes: [{ at: 22 }, { at: 126 }] }, door: { tex: 'Door C7_E', tint: DOOR },
    roofs: [{ kind: 'dome', paint: 'mud', color: [146, 122, 92], bands: 2, r0: 2.0, z0: 70, z1: 70 + 130 }, { kind: 'dome', paint: 'hide', gores: 9, r0: 1.2, z0: 152, z1: 152 + 58 }, { kind: 'cone', paint: 'flat', color: [84, 64, 48], r0: 0.2, z0: 204, r1: 0.14, z1: 232 }],
    props: [['Misc A3_S', 0, 3], ['Misc A4_S', 3, 4]] }),
  'Goblin house 1, stakes and thatch': build({ set: 'desert/', w: 6, d: 6, floors: ['B stakes'], roof: { fam: 'A', kind: 'hip', turn: true }, door: 'Door C7_E',
    at: { '2,5,S,0': 'door' },
    props: [['Misc D7_S', 3.25, 5, -36, 8.7, 'near'], ['Misc A3_S', 0, 6], ['Misc C12_S', 5, 6], ['Misc B8_S', 1, 6]] }),
  'Goblin house 2, pale mud and a ladder': build({ set: 'desert/', tones: false, w: 6, d: 4, floors: ['K mud'], roof: { fam: 'K', kind: 'flat', drop: 4, beams: ['1,3', '2,3', '3,3', '4,3'] }, door: 'Door C9_E',
    at: { '2,3,S,0': 'door', '1,3,S,0': 'w', '4,3,S,0': 'w', '5,1,E,0': 'w', '1,0,N,0': 'w', '4,0,N,0': 'w', '0,2,W,0': 'w' },
    props: [['Misc B59_S', 6, 3], ['Misc A4_S', 1, 1, 168, 2.7], ['Misc A3_S', 0, 4], ['Misc A9_S', 4, 4]] }),
};

/** Every piece name the drafts use, without its side. */
export function piecesUsed() {
  const s = new Set();
  for (const b of Object.values(DRAFTS)) for (const n of [...b.pieces.map(p => p.n), ...(b.uses || [])]) if (n[0] !== '#') s.add(b.uses?.includes(n) ? n : n.replace(/_[SENW]$/, ''));
  return [...s].sort();
}

const cache = {};
const load = n => cache[n] ||= readPng(`${TILES}${n}.png`);
const scr = (i, j) => [Math.round((i - j) * 64), Math.round((i + j) * 32)];   // whole pixels, for a prop set between tiles

/** One building as one picture: { rgba, width, height, ax, ay } with ax, ay the middle of its front tile (w - 1, d - 1).
 *  roof: false leaves the roof off (D208: what you see from inside). */
export function compose(b, { roof = true } = {}) {
  const all = b.pieces.filter(p => roof || p.part !== 'roof').map(p => [p, p.i, p.j, p.lift]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [, i, j, l] of all) { const [x, y] = scr(i, j); x0 = Math.min(x0, x - AX); y0 = Math.min(y0, y - AY - l); x1 = Math.max(x1, x + 256 - AX); y1 = Math.max(y1, y + 256 - AY - l); }
  const W = x1 - x0, H = y1 - y0, o = Buffer.alloc(W * H * 4);
  for (const [n, i, j, l] of all) {
    const p = pixels(n, b), [x, y] = scr(i, j), ox = x - AX - x0, oy = y - AY - l - y0;
    for (let py = 0; py < p.height; py++) for (let px = 0; px < p.width; px++) {
      const s = (py * p.width + px) * 4, a = p.data[s + 3] / 255; if (!a) continue;
      const q = ((oy + py) * W + ox + px) * 4, A = o[q + 3] / 255, na = a + A * (1 - a);
      for (let k = 0; k < 3; k++) o[q + k] = Math.round((p.data[s + k] * a + o[q + k] * A * (1 - a)) / na);
      o[q + 3] = Math.round(na * 255);
    }
  }
  const [fx, fy] = scr(b.w - 1, b.d - 1);
  return { rgba: o, width: W, height: H, ax: fx - x0, ay: fy - y0 };
}

/* ---------- the command line: one picture per draft, on grass with the tiles marked, and a sheet of them all ---------- */
function onGrass(c, label, sand) {
  const pad = 24, W = c.width + 2 * pad, H = c.height + 2 * pad, o = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) o.set(Array.isArray(sand) ? [...sand, 255] : sand ? [196, 160, 104, 255] : [78, 104, 64, 255], k * 4);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const s = (y * c.width + x) * 4, a = c.rgba[s + 3] / 255; if (!a) continue; const q = ((y + pad) * W + x + pad) * 4;
    for (let k = 0; k < 3; k++) o[q + k] = Math.round(c.rgba[s + k] * a + o[q + k] * (1 - a));
  }
  return { rgba: o, width: W, height: H, label };
}
function sheet(ims, cols) {
  const cw = Math.max(...ims.map(i => i.width)), ch = Math.max(...ims.map(i => i.height)), rows = Math.ceil(ims.length / cols);
  const W = cw * cols, H = ch * rows, o = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) o.set([60, 70, 60, 255], k * 4);
  ims.forEach((im, n) => { const cx = (n % cols) * cw, cy = Math.floor(n / cols) * ch, bx = cx + ((cw - im.width) >> 1), by = cy + (ch - im.height);
    for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) im.rgba.copy(o, (y * W + x) * 4, 0, 4);   // the cell takes the picture's own ground colour
    for (let y = 0; y < im.height; y++) im.rgba.copy(o, ((by + y) * W + bx) * 4, y * im.width * 4, (y + 1) * im.width * 4); });
  // a thin line between cells
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x % cw < 2 && x >= cw) || (y % ch < 2 && y >= ch)) o.set([60, 70, 60, 255], (y * W + x) * 4);
  return { rgba: o, width: W, height: H };
}
if (process.argv[1] && process.argv[1].endsWith('buildings.mjs')) {
  const inside = process.argv.includes('--inside'), args = process.argv.slice(2).filter(a => a !== '--inside');   // --inside: the roofs left off (D208)
  if (args.includes('--pieces')) { console.log(piecesUsed().join('\n')); process.exit(0); }
  const missing = piecesUsed().flatMap(n => (/_[SENW]$/.test(n) ? [n] : ['S', 'E', 'N', 'W'].map(s => `${n}_${s}`))).filter(n => !existsSync(`${TILES}${n}.png`));
  if (missing.length) { console.error(`missing in ${TILES}: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ` and ${missing.length - 6} more` : ''}`); process.exit(1); }
  const names = Object.keys(DRAFTS).filter(n => !args.length || args.some(a => n.startsWith(a)));
  const ims = [];
  for (const n of names) {
    const im = onGrass(compose(DRAFTS[n], { roof: !inside }), n, DRAFTS[n].land || !!DRAFTS[n].set), file = `${OUT}${n.split(',')[0]}.png`;
    im.set = DRAFTS[n].round ? 'round' : DRAFTS[n].set; writePng(file, im.rgba, im.width, im.height); ims.push(im); console.log(file);
  }
  // one sheet a town: Dawndoor's on grass, Oldscar's on sand
  for (const [set, name, cols] of [['', 'buildings', 3], ['desert/', 'buildings-oldscar', 3], ['round', 'buildings-oldscar-round', 2]]) {
    const of = ims.filter(i => i.set === set); if (of.length < 2) continue;
    const s = sheet(of, cols); writePng(`${OUT}${name}.png`, s.rgba, s.width, s.height); console.log(`${OUT}${name}.png`);
  }
}
