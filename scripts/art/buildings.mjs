// Dawndoor's buildings, drafted from the green tileset's pieces (D189, D236): walls on tile edges, doors, gables and roofs.
//   node scripts/art/buildings.mjs                 # every draft, one picture each and a sheet of all, in scripts/art/out/buildings/
//   node scripts/art/buildings.mjs "House 1"       # only the drafts whose name starts with that
//   node scripts/art/buildings.mjs --pieces        # the tileset pieces the drafts use (each in 4 sides), one per line
// A building is written as a few lines (size, wall family, roof, what stands on which edge) and laid out here into pieces
// { n, i, j, lift, key, part }: i runs down to the right, j down to the left (as on the scene page), the door side is the
// south-west (j = d - 1), lift is pixels above the ground. Reads the pieces in game/client/art/tiles/ (bought art; the pictures it
// writes hold it too: never commit them). Drafts for Michael to pick from, not decided: none of it is game data yet.
//
// What the pieces do (found by laying them out, 2026-11-20; more in docs/art-check.md):
// - A wall piece stands on one edge of its tile, the side its name ends with: _S the south-west edge, _E south-east, _N north-east,
//   _W north-west (as in land_plan.gd). A storey is about 132 px; a second storey is the same pieces lifted 132 less the stone
//   foot (FOOT), with the foot cut off, so no ledge shows. An outside corner takes the family's corner piece (2), which holds both edges.
// - A doorway is no wall on that edge, the family's arched lintel (D6, F6) on top, and Door A1 in it. The flat lintel (5) leaves a gap.
// - Roofs are drawn at ground height: lift them by the walls' height. A roof row climbs RISE a tile. A gable end is the plain wall
//   stacked and cut along the slope (the pack's gable halves 17, 18 showed steps and timber tips).
// - Draw a building as its pieces sorted with the characters, never as one picture: one picture covers whoever is inside or behind.
import { readFileSync, existsSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';

export const TILES = 'game/client/art/tiles/', OUT = 'scripts/art/out/buildings/';
export const STOREY = 132;               // a wall's height in pixels: what a gable, a roof or an upper storey is lifted by
export const RISE = 64;                  // how much a roof slope climbs over one tile: the pack's slopes are seen edge-on from the back at this pitch
const AX = 128, AY = 208;                // the tile's middle in every 256 x 256 piece
const DEPTH = { N: -0.5, W: -0.5, S: 0.5, E: 0.5 };

/** Lays a building out into pieces { n, i, j, lift, key, part, edges, band }. Sort by key (i + j, plus half a tile for an edge in
 *  front) and draw in that order with the characters (a character on tile i, j sorts at i + j + 0.01). part: 'wall', 'near' (on the
 *  side toward the viewer, faded when you are inside, D208), 'roof' (hidden when you are inside: the slopes and the gables), 'prop'.
 *  edges: the tile edges a wall piece stands on. band: [lo, hi] heights in pixels above the ground to keep of it (hi 'roof' = up to
 *  the roof's slope); see pixels(). w tiles along i, d along j (even: the ridge runs along i). at: {'i,j,side,storey': piece |
 *  'door' | 'gap' | ''}; the door side is the south-west, j = d - 1. A corner tile gets the family's corner piece (2), over any window
 *  named there, unless one of its two edges has a door or a gap. */
export function build({ w, d, walls, roof, storeys = 1, at = {}, plain = null, corner = null, lintel = null, door = 'Door A1', props = [], chimney = null }) {
  plain = plain || `Wall ${walls}1`; corner = corner ?? `Wall ${walls}2`; lintel = lintel || `Wall ${walls}6`;   // corner '': two straight walls meet
  const P = [], put = (n, i, j, lift, key, part, edges = null, band = null) => P.push({ n, i, j, lift, key, part, edges, band });
  const T = (storeys - 1) * (STOREY - FOOT) + STOREY, half = d / 2;
  // the corner pieces: named for the corner of their tile they stand on, holding its two edges (_W the back corner, N + W edges)
  const CORNER = [[0, 0, 'W', ['N', 'W'], -0.5, 'wall'], [w - 1, 0, 'N', ['N', 'E'], 0.5, 'near'], [w - 1, d - 1, 'E', ['E', 'S'], 0.5, 'near'], [0, d - 1, 'S', ['S', 'W'], 0.5, 'near']];
  for (let s = 0; s < storeys; s++) {
    // an upper storey stands FOOT lower and is cut above its stone foot, which would show as a ledge; its bottom covers the top of the wall below
    const L = s * (STOREY - FOOT), band = s ? [L + FOOT - 4, Infinity] : null, taken = new Set();
    for (const [i, j, side, es, dk, part] of CORNER) {
      if (!corner || es.some(e => ['door', 'gap', ''].includes(at[`${i},${j},${e},${s}`]))) continue;   // a corner wins over a window
      put(`${corner}_${side}`, i, j, L, i + j + dk, part, es, band); es.forEach(e => taken.add(`${i},${j},${e}`));
    }
    const edges = [];
    for (let i = 0; i < w; i++) edges.push([i, 0, 'N'], [i, d - 1, 'S']);
    for (let j = 0; j < d; j++) edges.push([0, j, 'W'], [w - 1, j, 'E']);
    for (const [i, j, e] of edges) {
      if (taken.has(`${i},${j},${e}`)) continue;
      const v = at[`${i},${j},${e},${s}`] ?? plain, k = i + j + DEPTH[e], part = e === 'S' || e === 'E' ? 'near' : 'wall';
      if (v === 'door') { put(`${lintel}_${e}`, i, j, L, k, part, [e], band); put(`${door}_${e}`, i, j, L, k, part); }
      else if (v === 'gap') put(`${lintel}_${e}`, i, j, L, k, part, [e], band);
      else if (v) put(`${v}_${e}`, i, j, L, k, part, [e], band);
    }
  }
  // the roof: rows climb RISE a tile from each eave to the ridge. The front slope (_S) is what the viewer sees; the back one (_N) is edge-on.
  for (let j = 0; j < d; j++) {
    const up = j < half ? j : d - 1 - j, side = j < half ? 'N' : 'S';
    for (let i = 0; i < w; i++) put(`Roof ${roof}_${side}`, i, j, T + up * RISE, i + j + 0.6, 'roof');
  }
  // the gable ends: the plain wall stacked in bands of GABLE px from the walls' top, each cut along the roof's slope. The pack's
  // gable halves (17, 18) were tried: their timber tips and the steps between them showed. Only the right (east) gable is
  // built: the left one faces away from the camera, and its timber poked out above the roof.
  for (let j = 0; j < d; j++) for (const [i, e] of [[w - 1, 'E']]) {
    const top = T + RISE * Math.min(j + 1, d - j);   // the highest the roof gets over this tile
    for (let n = 0; T - 4 + n * GABLE < top; n++) put(`${plain}_${e}`, i, j, T - 36 + n * GABLE, i + j + DEPTH[e] + 0.001 * (n + 1), 'roof', [e], [T - 4 + n * GABLE, T - 4 + (n + 1) * GABLE, 'roof']);
  }
  if (chimney) put(chimney[0], chimney[1], chimney[2], T + chimney[3], chimney[1] + chimney[2] + 0.55, 'roof');   // before the roof row in front, so the slope hides its foot
  for (const [n, i, j, lift = 0, key = i + j] of props) put(n, i, j, lift, key, /^Misc D/.test(n) ? 'near' : 'prop');   // a banner hangs on a wall
  P.sort((a, b) => a.key - b.key || a.lift - b.lift);
  return { w, d, T, pieces: P };
}

// where each edge runs in a 256 x 256 piece (the tile's middle at 128, 208): [x, y] at its back end, then at its front end
const EDGE = { N: [[128, 176], [192, 208]], E: [[192, 208], [128, 240]], S: [[128, 240], [64, 208]], W: [[128, 176], [64, 208]] };
const GABLE = 96, FOOT = 30;   // FOOT: the height of a wall's stone foot                         // a gable band: less than a wall's height without its foot and its top
/** A piece's pixels, cut to its band: a pixel stays if its height above the ground under it (on the piece's edges) is within
 *  [lo, hi). hi 'roof': up to the roof's slope over that point, for a gable (b: the building, for its depth and wall height). */
export function pixels(p, b) {
  const img = load(p.n); if (!p.band) return img;
  const [lo, hi, roofCut] = p.band, out = Buffer.from(img.data);
  for (let x = 0; x < 256; x++) {
    // a column two edges share (the left and right corner pieces) shows the front face, so measure from the lower ground line
    const cand = p.edges.map(e => { const [[ax, ay], [bx, by]] = EDGE[e], t = Math.max(0, Math.min(1, (x - ax) / (bx - ax)));
      return { e, t, gy: ay + t * (by - ay), on: x >= Math.min(ax, bx) && x <= Math.max(ax, bx) }; });
    const { e, t, gy } = cand.filter(c => c.on).sort((a, b) => b.gy - a.gy)[0] || cand[0];
    let top = hi;
    if (roofCut) { const u = p.j + (e === 'N' || e === 'S' ? 0.5 : t); top = Math.min(hi, b.T + RISE * Math.min(u, b.d - u) + 2); }
    for (let y = 0; y < 256; y++) { const h = gy - y + p.lift; if (h < lo || h >= top) out[(y * 256 + x) * 4 + 3] = 0; }
  }
  return { width: 256, height: 256, data: out };
}

/** The drafts, sized from Ultima Online (its smallest house and its small shops are 7 by 7 tiles with walls on tiles; here walls
 *  are on edges, so every tile inside is floor). Each door faces the south-west (the viewer's left). */
export const DRAFTS = {
  'House 1, stone and red tile': build({ w: 6, d: 4, walls: 'D', roof: 'C1', chimney: ['Roof G1_S', 4, 1, 60],
    at: { '2,3,S,0': 'door', '0,3,S,0': 'Wall D7', '4,3,S,0': 'Wall D7', '5,1,E,0': 'Wall D7', '5,2,E,0': 'Wall D7', '1,0,N,0': 'Wall D7', '4,0,N,0': 'Wall D7', '0,1,W,0': 'Wall D7' } }),
  'House 2, dark stone and thatch': build({ w: 6, d: 4, walls: 'F', roof: 'A1',
    at: { '3,3,S,0': 'door', '1,3,S,0': 'Wall F7', '5,3,S,0': 'Wall F7', '5,1,E,0': 'Wall F7', '5,2,E,0': 'Wall F7', '2,0,N,0': 'Wall F7', '0,2,W,0': 'Wall F7' } }),
  'Shop 1, stone and slate': build({ w: 8, d: 6, walls: 'D', roof: 'D1',
    at: { '2,5,S,0': 'door', '5,5,S,0': 'door', '0,5,S,0': 'Wall D7', '1,5,S,0': 'Wall D7', '3,5,S,0': 'Wall D7', '4,5,S,0': 'Wall D7', '6,5,S,0': 'Wall D7', '7,5,S,0': 'Wall D7',
      '7,1,E,0': 'Wall D7', '7,2,E,0': 'Wall D7', '7,3,E,0': 'Wall D7', '7,4,E,0': 'Wall D7', '2,0,N,0': 'Wall D7', '5,0,N,0': 'Wall D7', '0,2,W,0': 'Wall D7', '0,3,W,0': 'Wall D7' },
    props: [['Misc D1_E', 1, 5, 30, 6.5], ['Misc D1_E', 6, 5, 30, 11.5], ['Misc B52_S', 4, 6], ['Misc B14_S', 7, 7]] }),
  'Shop 2, timber frame and shingle': build({ w: 8, d: 6, walls: 'D', roof: 'E1', plain: 'Wall D10', corner: '',
    at: { '3,5,S,0': 'door', '1,5,S,0': 'Wall D16', '2,5,S,0': 'Wall D16', '5,5,S,0': 'Wall D16', '6,5,S,0': 'Wall D16', '7,1,E,0': 'Wall D16', '7,2,E,0': 'Wall D16', '7,3,E,0': 'Wall D16', '7,4,E,0': 'Wall D16', '3,0,N,0': 'Wall D16', '0,2,W,0': 'Wall D16' },
    props: [['Misc B37_S', 5, 6], ['Misc B1_S', 7, 6], ['Misc A9_S', 0, 6]] }),
  'Guard post 1, stone with slate': build({ w: 6, d: 6, walls: 'F', roof: 'D1',
    at: { '2,5,S,0': 'door', '0,5,S,0': 'Wall F7', '4,5,S,0': 'Wall F7', '5,5,S,0': 'Wall F7', '5,1,E,0': 'Wall F7', '5,4,E,0': 'Wall F7', '2,0,N,0': 'Wall F7', '0,3,W,0': 'Wall F7' },
    props: [['Misc D1_E', 1, 5, 30, 6.5], ['Misc D1_E', 3, 5, 30, 8.5], ['Misc B15_S', 6, 7], ['Misc B57_S', 5, 8]] }),
  'Guard post 2, two storeys, red tile': build({ w: 4, d: 4, walls: 'D', roof: 'C1', storeys: 2,
    at: { '1,3,S,0': 'door', '3,3,S,0': 'Wall D7', '0,3,S,1': 'Wall D7', '2,3,S,1': 'Wall D7', '3,1,E,1': 'Wall D7', '3,2,E,1': 'Wall D7', '3,1,E,0': 'Wall D7', '1,0,N,1': 'Wall D7', '0,1,W,1': 'Wall D7' },
    props: [['Misc D1_E', 2, 3, 30, 5.5], ['Misc B56_S', 5, 1]] }),
};

/** Every piece name the drafts use, without its side. */
export function piecesUsed() {
  const s = new Set();
  for (const b of Object.values(DRAFTS)) for (const { n } of b.pieces) s.add(n.replace(/_[SENW]$/, ''));
  return [...s].sort();
}

const cache = {};
const load = n => cache[n] ||= readPng(`${TILES}${n}.png`);
const scr = (i, j) => [(i - j) * 64, (i + j) * 32];

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
function onGrass(c, label) {
  const pad = 24, W = c.width + 2 * pad, H = c.height + 2 * pad, o = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) o.set([78, 104, 64, 255], k * 4);
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
  ims.forEach((im, n) => { const bx = (n % cols) * cw + ((cw - im.width) >> 1), by = Math.floor(n / cols) * ch + (ch - im.height);
    for (let y = 0; y < im.height; y++) im.rgba.copy(o, ((by + y) * W + bx) * 4, y * im.width * 4, (y + 1) * im.width * 4); });
  return { rgba: o, width: W, height: H };
}
if (process.argv[1] && process.argv[1].endsWith('buildings.mjs')) {
  const args = process.argv.slice(2);
  if (args.includes('--pieces')) { console.log(piecesUsed().join('\n')); process.exit(0); }
  const missing = piecesUsed().flatMap(n => (/_[SENW]$/.test(n) ? [n] : ['S', 'E', 'N', 'W'].map(s => `${n}_${s}`))).filter(n => !existsSync(`${TILES}${n}.png`));
  if (missing.length) { console.error(`missing in ${TILES}: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ` and ${missing.length - 6} more` : ''}`); process.exit(1); }
  const names = Object.keys(DRAFTS).filter(n => !args.length || args.some(a => n.startsWith(a)));
  const ims = [];
  for (const n of names) {
    const im = onGrass(compose(DRAFTS[n]), n), file = `${OUT}${n.split(',')[0]}.png`;
    writePng(file, im.rgba, im.width, im.height); ims.push(im); console.log(file);
  }
  if (ims.length > 1) { const s = sheet(ims, 3); writePng(`${OUT}buildings.png`, s.rgba, s.width, s.height); console.log(`${OUT}buildings.png`); }
}
