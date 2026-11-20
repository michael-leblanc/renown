// Dawndoor's buildings, drafted from the green tileset's pieces (D189, D236): walls on tile edges, doors, gables and roofs.
//   node scripts/art/buildings.mjs                 # every draft, one picture each and a sheet of all, in scripts/art/out/buildings/
//   node scripts/art/buildings.mjs "House 1"       # only the drafts whose name starts with that
//   node scripts/art/buildings.mjs --pieces        # the tileset pieces the drafts use (each in 4 sides), one per line
// A building is written as a few lines (size, wall family, roof, what stands on which edge) and laid out here into pieces:
// [piece, i, j, lift]. i runs down to the right, j down to the left (as on the scene page), the door side is south-west (j = d - 1),
// and lift is pixels above the ground. Reads the pieces in game/client/art/tiles/ (bought art; the pictures it writes hold it too:
// never commit them). Drafts for Michael to pick from, not decided: none of it is game data yet.
//
// What the pieces do (found by laying them out, 2026-11-20):
// - A wall piece stands on one edge of its tile, the side its name ends with: _S the south-west edge, _E south-east, _N north-east,
//   _W north-west (as in land_plan.gd). A wall is one storey, about 132 px; a second storey is the same pieces lifted 132.
// - A doorway is no wall on that edge, the family's lintel (D5, F5, G10) on top, and Door A1 in it.
// - Gables (D17, D18; F17, F18) and roofs are drawn at ground height in their pictures: lift them by the walls' height.
//   A gable end over two tiles is the tall half (18) on the tile at the back and the small half (17) at the front, or the other way
//   round on the far end.
// - Roof families: A thatch, C red tile, D blue slate, E shingle, F planks, B a bare timber frame; 9 and 10 are broken (ruins).
//   C1, D1, E1, F1 (and A1, A8 for thatch) are a full slope over one tile: _S on the front row and _N on the back row make a
//   ridge along a building two tiles deep. C5 roofs a building one tile deep by itself (_S for a row along i, _E along j).
//   C4 _E, _S, _W, _N on the four tiles of a 2 by 2 make a low pyramid; C6_E a spire on one tile; G1 a chimney.
import { readFileSync, existsSync } from 'node:fs';
import { readPng, writePng } from './png.mjs';

export const TILES = 'game/client/art/tiles/', OUT = 'scripts/art/out/buildings/';
export const STOREY = 132;               // a wall's height in pixels: what a gable, a roof or an upper storey is lifted by
const AX = 128, AY = 208;                // the tile's middle in every 256 x 256 piece
const DEPTH = { N: -0.5, W: -0.5, S: 0.5, E: 0.5 };

/** Lays a building out into pieces, back to front. w tiles along i, d along j. at: {'i,j,side,storey': piece | 'door' | 'gap' | ''}. */
export function build({ w, d, walls, roof, storeys = 1, at = {}, gable = ['18', '17'], kind = 'gable', plain = null, lintel = null, props = [], chimney = null }) {
  plain = plain || `Wall ${walls}1`; lintel = lintel || `Wall ${walls}5`;
  const W = [], edges = [];
  for (let i = 0; i < w; i++) edges.push([i, 0, 'N']);
  for (let j = 0; j < d; j++) edges.push([0, j, 'W']);
  for (let i = 0; i < w; i++) edges.push([i, d - 1, 'S']);
  for (let j = 0; j < d; j++) edges.push([w - 1, j, 'E']);
  for (let s = 0; s < storeys; s++) for (const [i, j, e] of edges) {
    const v = at[`${i},${j},${e},${s}`] ?? plain, L = s * STOREY, k = [i + j + DEPTH[e], L];
    if (v === 'door') W.push([k, [`${lintel}_${e}`, i, j, L]], [k, [`Door A1_${e}`, i, j, L]]);
    else if (v === 'gap') W.push([k, [`${lintel}_${e}`, i, j, L]]);
    else if (v) W.push([k, [`${v}_${e}`, i, j, L]]);
  }
  const T = storeys * STOREY, R = [];
  if (kind === 'gable') {                 // the ridge runs along i
    if (gable) {
      const [tall, small] = gable.map(g => / /.test(g) ? g : `Wall ${/^[A-Z]/.test(g) ? g : walls + g}`);   // '18' the walls' own family, 'D18' another's, 'Roof B2' any piece
      W.push([[-0.5, T], [`${small}_W`, 0, 0, T]], [[d - 1.5, T], [`${tall}_W`, 0, d - 1, T]],
        [[w - 0.5, T], [`${tall}_E`, w - 1, 0, T]], [[w + d - 1.5, T], [`${small}_E`, w - 1, d - 1, T]]);
    }
    for (let i = 0; i < w; i++) R.push([`Roof ${roof}_N`, i, 0, T]);
    for (let i = 0; i < w; i++) R.push([`Roof ${roof}_S`, i, d - 1, T]);
  } else if (kind === 'pyramid') R.push([`Roof ${roof}_E`, 0, 0, T], [`Roof ${roof}_S`, 1, 0, T], [`Roof ${roof}_N`, 0, 1, T], [`Roof ${roof}_W`, 1, 1, T]);
  else if (kind === 'spire') R.push([`Roof ${roof}`, 0, 0, T]);
  W.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1]);
  const outside = [...props].sort((a, b) => a[1] + a[2] - b[1] - b[2]);
  const behind = outside.filter(p => p[1] < 0 || p[2] < 0), before = outside.filter(p => !behind.includes(p));
  // a chimney goes in before the roof, so the slope in front hides its foot
  return { w, d, walls: [...behind, ...W.map(x => x[1])], roof: [...(chimney ? [chimney] : []), ...R], props: before };
}

/** The drafts: three houses, three shops, three guard posts. Each door faces the south-west (the viewer's left). */
export const DRAFTS = {
  'House 1, stone and red tile': build({ w: 3, d: 2, walls: 'D', roof: 'C1', chimney: ['Roof G1_S', 1, 0, 100],
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall D7', '2,1,S,0': 'Wall D7', '2,0,E,0': 'Wall D16' } }),
  'House 2, dark stone and thatch': build({ w: 3, d: 2, walls: 'F', roof: 'A1',
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall F7', '2,0,E,0': 'Wall F7', '2,1,E,0': 'Wall F13' } }),
  'House 3, timber, two storeys': build({ w: 3, d: 2, walls: 'D', roof: 'E1', storeys: 2,
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall D7', '2,1,S,0': 'Wall D12', '0,1,S,1': 'Wall D16', '1,1,S,1': 'Wall D10', '2,1,S,1': 'Wall D16',
      '2,0,E,1': 'Wall D16', '2,1,E,1': 'Wall D14', '2,0,E,0': 'Wall D13', '2,1,E,0': 'Wall D7' } }),
  'Shop 1, stone and slate, sign and stall': build({ w: 4, d: 2, walls: 'D', roof: 'D1',
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall D7', '2,1,S,0': 'Wall D7', '3,1,S,0': 'Wall D7' }, props: [['Misc B32_S', 1, 2, 0], ['Misc B14_S', 3, 2, 0]] }),
  'Shop 2, timber and red tile, open front': build({ w: 4, d: 2, walls: 'F', roof: 'C1',
    at: { '1,1,S,0': 'gap', '2,1,S,0': 'gap', '0,1,S,0': 'Wall F16', '3,1,S,0': 'Wall F16' }, props: [['Misc B30_S', 0, 2, 0], ['Misc B37_S', 1, 2, 0], ['Misc B1_S', 3, 2, 0]] }),
  'Shop 3, planks': build({ w: 3, d: 2, walls: 'G', roof: 'F1', plain: 'Wall G1', lintel: 'Wall G10', gable: ['D18', 'D17'],   // the planks have no gable of their own
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall G8', '2,1,S,0': 'Wall G7', '2,0,E,0': 'Wall G8' }, props: [['Misc B33_S', 2, 2, 0]] }),
  'Guard post 1, stone tower': build({ w: 2, d: 2, walls: 'D', roof: 'C1', storeys: 2,
    at: { '0,1,S,0': 'door', '1,1,S,1': 'Wall D7', '1,1,E,1': 'Wall D7', '1,0,E,0': 'Wall D16' }, props: [['Misc B45_S', 2, 1, 0]] }),
  'Guard post 2, thin tower with a spire': build({ w: 1, d: 1, walls: 'D', roof: 'C6_E', storeys: 3, kind: 'spire',
    at: { '0,0,S,0': 'door', '0,0,S,2': 'Wall D7', '0,0,E,2': 'Wall D7', '0,0,E,1': 'Wall D16' } }),
  'Guard post 3, guardhouse with slate': build({ w: 3, d: 2, walls: 'F', roof: 'D1',
    at: { '1,1,S,0': 'door', '0,1,S,0': 'Wall F16', '2,1,S,0': 'Wall F16' }, props: [['Misc B45_S', 0, 2, 0], ['Misc B15_S', 3, 2, 0], ['Misc B18_S', 3, 1, 0]] }),
};

/** Every piece name the drafts use, without its side. */
export function piecesUsed() {
  const s = new Set();
  for (const b of Object.values(DRAFTS)) for (const [n] of [...b.walls, ...b.roof, ...b.props]) s.add(n.replace(/_[SENW]$/, ''));
  return [...s].sort();
}

const cache = {};
const load = n => cache[n] ||= readPng(`${TILES}${n}.png`);
const scr = (i, j) => [(i - j) * 64, (i + j) * 32];

/** One building as one picture: { rgba, width, height, ax, ay } with ax, ay the middle of its front tile (w - 1, d - 1).
 *  roof: false leaves the roof off (D208: what you see from inside). */
export function compose(b, { roof = true } = {}) {
  const all = [...b.walls, ...(roof ? b.roof : []), ...b.props];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [, i, j, l] of all) { const [x, y] = scr(i, j); x0 = Math.min(x0, x - AX); y0 = Math.min(y0, y - AY - l); x1 = Math.max(x1, x + 256 - AX); y1 = Math.max(y1, y + 256 - AY - l); }
  const W = x1 - x0, H = y1 - y0, o = Buffer.alloc(W * H * 4);
  for (const [n, i, j, l] of all) {
    const p = load(n), [x, y] = scr(i, j), ox = x - AX - x0, oy = y - AY - l - y0;
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
