// Code-made animated props and tiles for Renown, written with the kit (scripts/art/kit.mjs).
//   node scripts/art/anim.mjs [names|all] [--draft] [--views S,E,N,W] [--out prototype/art/made/anim]
// Each animation is a loop of FRAMES pictures. Per side it writes one strip, `<Name>_<side>.png`, the frames side by side, each
// 256 x 256 with the tile's middle at 128,208 like any prop, and one still shadow `<Shadow>_<side>.png` (drawn at 0.3 alpha).
// `anim.json` beside them lists each one's frames and frames a second, so the game and the scene page play them alike.
// --draft writes no sprite: it puts every frame of the first side in a row, big, in prototype/shots/anim-draft.png.
// The ANIMS are added below, family by family; ANIMS[name] = { frames, fps, shadow, at: t => prop } or, for ground, { tile: (t, side) => rgba }.
import { render, SIZE } from './kit.mjs';
import { readPng, writePng } from './png.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const ANIMS = {};
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };

export async function main() {
  const first = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all';
  const names = first === 'all' ? Object.keys(ANIMS) : first.split(',');
  for (const n of names) if (!ANIMS[n]) { console.error(`No animation named "${n}". There are: ${Object.keys(ANIMS).join(', ')}`); process.exit(1); }
  const draft = argv.includes('--draft'), out = flag('--out', 'prototype/art/made/anim'), ss = +flag('--ss', draft ? 2 : 3);
  mkdirSync(out, { recursive: true });
  const manifestPath = `${out}/anim.json`, manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const rows = [];
  for (const n of names) {
    const A = ANIMS[n], views = flag('--views', A.sides ? A.sides.join(',') : 'S,E,N,W').split(','), t0 = Date.now();
    for (const [vi, v] of views.entries()) {
      const strip = Buffer.alloc(SIZE * A.frames * SIZE * 4); let shadow = null;
      for (let f = 0; f < A.frames; f++) {
        const t = f / A.frames;
        let pic;
        if (A.tile) pic = A.tile(t, v);
        else { const r = render(A.at(t), v, ss); pic = r.out; if (!f) shadow = r.so; }
        for (let y = 0; y < SIZE; y++) pic.copy(strip, (y * SIZE * A.frames + f * SIZE) * 4, y * SIZE * 4, (y + 1) * SIZE * 4);
      }
      if (draft) { if (!vi) rows.push({ n, strip, frames: A.frames, shadow }); }
      else {
        writePng(`${out}/${n}_${v}.png`, strip, SIZE * A.frames, SIZE);
        if (shadow && A.shadow) writePng(`${out}/${A.shadow}_${v}.png`, shadow, SIZE, SIZE);
      }
      if (draft) break;
    }
    if (!draft) manifest[n] = { frames: A.frames, fps: A.fps, sides: views, shadow: A.shadow || null, ground: !!A.tile && !A.effect, effect: !!A.effect };
    console.log(`${n}: ${A.frames} frames${draft ? '' : ` x ${views.length} sides`} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  if (!draft) { writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n'); console.log(`Wrote to ${out}`); return; }
  // the draft: each animation's frames in a row on grass, with the shadow, cropped to what is drawn, at 2 to 3 times the size
  const BG = [66, 92, 46];
  let x0 = SIZE, x1 = 0, y0 = SIZE, y1 = 0;
  for (const r of rows) for (let f = 0; f < r.frames; f++) for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (r.strip[(y * SIZE * r.frames + f * SIZE + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(SIZE - 1, x1 + 4); y1 = Math.min(SIZE - 1, y1 + 4);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cols = Math.max(...rows.map(r => r.frames)), z = Math.max(1, Math.min(3, Math.floor(1800 / (cw * cols)))), W = cw * cols * z, H = ch * rows.length * z, img = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set([...BG, 255], i * 4);
  rows.forEach((r, ri) => { for (let f = 0; f < r.frames; f++) for (let y = 0; y < ch * z; y++) for (let x = 0; x < cw * z; x++) {
    const sx = x0 + Math.floor(x / z), sy = y0 + Math.floor(y / z), o = ((ri * ch * z + y) * W + f * cw * z + x) * 4;
    if (r.shadow) { const a = r.shadow[(sy * SIZE + sx) * 4 + 3] / 255 * .3; for (let k = 0; k < 3; k++) img[o + k] *= 1 - a; }
    const s = (sy * SIZE * r.frames + f * SIZE + sx) * 4, a = r.strip[s + 3] / 255; if (!a) continue;
    for (let k = 0; k < 3; k++) img[o + k] = img[o + k] * (1 - a) + r.strip[s + k] * a;
  } });
  writePng('prototype/shots/anim-draft.png', img, W, H); console.log('Draft picture: prototype/shots/anim-draft.png');
}

/* ---------- fire ----------
   Every flame here is a few tongues of FIRE that lean, stretch and sway in a loop over t (0 to 1). Flames throw no shadow (cast). */
import { campfireAt, fireAt } from './camp.mjs';
import { clamp, h3, fbm3, sdBox, chBox, sdCap, hit, ROCK, WOOD, IRON, CANVAS, LEATHER, FIRE, gaps, cutStone, cutSdf } from './kit.mjs';
const TAU = 6.2832;
ANIMS['Campfire A1 Lit'] = { frames: 8, fps: 10, shadow: 'Campfire Shadow A1', at: t => campfireAt(t + 1e-6) };   // t > 0: the sparks are on in every frame

/** Tongues of flame standing on the point bx, by, bz: h tall, w wide at the foot. Returns the nearer of d and the flame. */
function flame(x, y, z, bx, by, bz, h, w, t, seed, d, n = 3) {
  if (Math.abs(x - bx) > w * 3 + .1 || Math.abs(z - bz) > w * 3 + .1 || y < by - w || y > by + h * 1.5) return Math.min(d, .02 + Math.max(Math.abs(x - bx) - w * 3 - .1, Math.abs(z - bz) - w * 3 - .1, by - w - y, y - by - h * 1.5));   // outside the flame's box: a step that never stops on the box
  for (let k = 0; k < n; k++) {
    const ph = seed + k * 2.1, s = (a, o = 0) => Math.sin(TAU * a + ph + o);
    const a = k * TAU / n + seed, r = k ? w * .55 : 0, fx = bx + r * Math.cos(a), fz = bz + r * Math.sin(a);
    const top = by + h * (k ? .62 : 1) * (1 + .2 * s(t) + .09 * s(2 * t, 1.3));
    const lx = w * .5 * s(t, 1.6), lz = w * .4 * s(2 * t, .4), rel = clamp((y - by) / h, 0, 1);
    const wob = w * .3 * Math.sin(rel * 9 + k * 2 - TAU * 2 * t) * rel;
    const q = sdCap(x - wob, y, z, fx, by, fz, fx + lx, top, fz + lz, w * (k ? .7 : 1) * (1 + .12 * s(2 * t, .7)), w * .1) * .8;
    if (q < d) { d = q; hit.mat = FIRE; hit.grv = 1; hit.var = 1 - clamp((y - by) / (top - by), 0, 1); }
  }
  return d;
}
/** A torch's head: a pole's end wrapped in rags, tied with cord. */
function torchHead(x, y, z, ax, ay, az, bx, by, bz, d) {
  const q = sdCap(x, y, z, ax, ay, az, bx, by, bz, .05, .046);
  if (q < d) { d = q; hit.mat = CANVAS; hit.grv = gaps(y, .034)[0] < .2 ? 0 : 1; hit.var = .15; }
  return d;
}

/* a standing torch, stuck in the ground with a few stones round its foot */
const TORCH_STONES = [0, 1, 2, 3].map(k => ({ a: k * 1.6 + .3, P: cutStone(80 + k, .07 + .02 * h3(k, 1, 8), .07, .055, { sides: 6, chips: 1, tops: 1, taper: .3 }) }));
const torchAt = t => ({
  H: 1.6, bound: [.28, .82, .28], noMoss: true,
  sdf: (x, y, z) => flame(x, y, z, .012, 1.22, 0, .32, .06, t, 1, torchBody(x, y, z)),
  cast: (x, y, z) => torchBody(x, y, z),
});
function torchBody(x, y, z) {
  let d = sdCap(x, y, z, 0, 0, 0, .012, 1.1, 0, .034, .028); hit.mat = WOOD; hit.grv = 1; hit.var = .5;
  d = torchHead(x, y, z, .012, 1.08, 0, .014, 1.24, 0, d);
  { const q = sdCap(x, y, z, .012, 1.065, 0, .012, 1.08, 0, .042, .042); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // an iron band under the rags
  if (y < .2) for (const s of TORCH_STONES) {
    const lx = x - Math.cos(s.a) * .1, lz = z - Math.sin(s.a) * .1, q = cutSdf(s.P, lx * Math.cos(s.a) + lz * Math.sin(s.a), y, -lx * Math.sin(s.a) + lz * Math.cos(s.a));
    if (q < d) { d = q; hit.mat = ROCK; hit.grv = 1; hit.var = h3(hit.face, 80, 1); }
  }
  return d;
}
ANIMS['Torch A1'] = { frames: 8, fps: 10, shadow: 'Torch Shadow A1', at: torchAt };

/* a torch in an iron bracket, on the tile's far edge, where a wall stands (D203: walls are on the edges between tiles) */
const WZ = -.5;                                                           // the wall's face
function wallTorchBody(x, y, z) {
  let d = sdBox(x, y - 1, z - (WZ + .012), .045, .09, .012, .004); hit.mat = IRON; hit.grv = 1; hit.var = .4;   // the plate on the wall
  { const q = sdCap(x, y, z, 0, .96, WZ + .02, 0, .99, WZ + .13, .016, .016); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // the arm
  { const q = Math.max(Math.abs(Math.hypot(x, (z - (WZ + .15)) * 1.1) - .042) - .01, Math.abs(y - 1.0) - .014); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .6; } }   // the ring that holds it
  { const q = sdCap(x, y, z, 0, .86, WZ + .11, 0, 1.12, WZ + .19, .028, .024); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .5; } }   // the torch, leaning out
  return torchHead(x, y, z, 0, 1.1, WZ + .186, 0, 1.24, WZ + .23, d);
}
ANIMS['Wall Torch A1'] = { frames: 8, fps: 10, shadow: 'Wall Torch Shadow A1', at: t => ({
  H: 1.6, bound: [.2, .75, .2], boundZ: WZ + .2, noMoss: true,
  sdf: (x, y, z) => flame(x, y, z, 0, 1.22, WZ + .235, .3, .055, t, 2, wallTorchBody(x, y, z)),
  cast: wallTorchBody,
}) };

/* a brazier: an iron bowl of coals on three legs */
function brazierBody(x, y, z, lit) {
  const r = Math.hypot(x, z);
  let d = Math.max(Math.abs(Math.hypot(r, (y - .7) * 1.25) - .24) - .018, y - .7); hit.mat = IRON; hit.grv = 1; hit.var = .5;   // the bowl
  { const q = Math.max(Math.abs(r - .24) - .022, Math.abs(y - .7) - .02); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .8; } }   // its rim
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .5, q = sdCap(x, y, z, Math.cos(a) * .25, 0, Math.sin(a) * .25, Math.cos(a) * .13, .56, Math.sin(a) * .13, .02, .018); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .4; } }
  { const q = Math.max(r - .21, y - .66 - .025 * (fbm3(x * 22, 1, z * 22) + .4), .6 - y); if (q < d) { d = q; const hot = fbm3(x * 26, 4, z * 26); if (lit && hot > .05) { hit.mat = FIRE; hit.var = hot > .25 ? .55 : .2; } else { hit.mat = IRON; hit.var = .1; } hit.grv = hot < -.25 ? 0 : 1; } }   // lumps of coal, some glowing
  return d;
}
ANIMS['Brazier A1'] = { frames: 8, fps: 10, shadow: 'Brazier Shadow A1', at: t => ({
  H: 1.2, bound: [.3, .55, .3], noMoss: true,
  sdf: (x, y, z) => flame(x, y, z, 0, .68, 0, .36, .09, t, 3, brazierBody(x, y, z, true), 4),
  cast: (x, y, z) => brazierBody(x, y, z, false),
}) };

/* a lantern on a post: a square post, an arm, an iron lantern hanging from it with a small flame inside */
const LX = .3;
function lanternBody(x, y, z) {
  let d = chBox(x + .02, y - .82, z, .045, .82, .045, .01); hit.mat = WOOD; hit.grv = 1; hit.var = .5;           // the post
  { const q = chBox(x - LX / 2 + .02, y - 1.58, z, LX / 2 + .02, .025, .025, .006); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .7; } }   // the arm
  { const q = sdCap(x, y, z, LX - .04, 1.555, 0, -.02, 1.36, 0, .014, .014); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .3; } }   // a brace
  { const q = sdCap(x, y, z, LX, 1.555, 0, LX, 1.47, 0, .006, .006); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .3; } }   // the hook
  // the lantern: a pointed cap, a base, four corner bars, open between them
  const lx = x - LX, ly = y - 1.36, ax = Math.abs(lx), az = Math.abs(z);
  { const q = Math.max(Math.max(ax, az) - .065 + (ly - .1) * .7, Math.abs(ly - .12) - .035); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .6; } }
  { const q = sdBox(lx, ly + .1, z, .06, .015, .06, .004); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }
  { const q = Math.max(Math.hypot(ax - .055, az - .055) - .009, Math.abs(ly) - .1); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .4; } }
  return d;
}
ANIMS['Lantern Post A1'] = { frames: 8, fps: 10, shadow: 'Lantern Post Shadow A1', at: t => ({
  H: 1.7, bound: [.36, .85, .1], noMoss: true,
  sdf: (x, y, z) => flame(x, y, z, LX, 1.27, 0, .11, .025, t, 4, lanternBody(x, y, z), 2),
  cast: lanternBody,
}) };

/* a cooking fire: the campfire with a tripod over it and an iron pot on a chain */
function tripod(x, y, z, d) {
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .9, q = sdCap(x, y, z, Math.cos(a) * .46, 0, Math.sin(a) * .46, Math.cos(a) * .02, 1.0, Math.sin(a) * .02, .022, .018); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .4 + .2 * k; } }
  { const q = sdCap(x, y, z, 0, .98, 0, 0, .56, 0, .007, .007); if (q < d) { d = q; hit.mat = IRON; hit.grv = gaps(y, .03)[0] < .25 ? 0 : 1; hit.var = .5; } }   // the chain
  const r = Math.hypot(x, z);
  { const q = Math.max(Math.hypot(r, (y - .44) * 1.2) - .15, y - .52); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .3; } }   // the pot
  { const q = Math.max(Math.abs(r - .13) - .014, Math.abs(y - .52) - .012); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .7; } }   // its rim
  { const q = Math.max(Math.abs(Math.hypot(x, y - .52) - .13) - .007, Math.abs(z) - .007, .52 - y); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .6; } }   // its handle
  return d;
}
ANIMS['Cooking Fire A1'] = { frames: 8, fps: 10, shadow: 'Cooking Fire Shadow A1', at: t => { const c = campfireAt(t + 1e-6); return { ...c, H: 1.1, bound: [.64, .52, .64], sdf: (x, y, z) => tripod(x, y, z, c.sdf(x, y, z)), cast: (x, y, z) => tripod(x, y, z, fireAt(x, y, z, false)) }; } };

/* ---------- water: a ground tile, drawn straight in 2D (it is flat), every wave a whole number of times across the tile so tiles
   join with no seam, and a whole number of times over the loop so the loop has no jump. Hard tones like the rest of the art. ---------- */
const hexc = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const WATER = {
  deep: ['#1d3a47', '#234452', '#2a505e', '#325d6a', '#3e6e7a', '#6a9ea4', '#a9cfc9'].map(hexc),
  shallow: ['#2b5a5f', '#33676b', '#3c7477', '#478284', '#579293', '#86b8b2', '#bcdcd2'].map(hexc),
};
const FOAM = ['#7fa9a8', '#b7d3cc', '#dfece4'].map(hexc);
const waves = (x, z, t) => .5 * Math.sin(TAU * (x + 2 * z + t)) + .42 * Math.sin(TAU * (2 * x - z - t) + 1) + .3 * Math.sin(TAU * (3 * x + z + 2 * t) + 2) + .24 * Math.sin(TAU * (-x + 3 * z - 2 * t) + 3);
const EDGE = { S: (x, z) => [.5 - x, z], E: (x, z) => [.5 - z, x], N: (x, z) => [x + .5, z], W: (x, z) => [z + .5, x] };   // per side: how far a point is from the shore edge, and where along it
function waterTile(t, side, kind, shore, inner) {
  const o = Buffer.alloc(SIZE * SIZE * 4), R = WATER[kind];
  for (let py = 176; py <= 240; py++) for (let px = 64; px <= 192; px++) {
    const u = (px + .5 - 128) / 64, v = (py + .5 - 208) / 32;
    if (Math.abs(u) + Math.abs(v) > 1) continue;
    const x = (u + v) / 2, z = (v - u) / 2, h = waves(x, z, t);
    let c = R[h < -.75 ? 1 : 2];                                                         // mostly one flat tone, a darker one in the troughs
    const ln = Math.sin(TAU * (x + 2 * z + t) + .9 * Math.sin(TAU * (3 * x - z))), br = Math.sin(TAU * (2 * x - 3 * z - t) + .5);
    if (ln > .9 && br > .1) c = R[ln > .97 && br > .6 ? 4 : 3];                          // short streaks of light that drift: the ripples
    const ln2 = Math.sin(TAU * (-2 * x + z + t) + .7 * Math.sin(TAU * (x + 3 * z)) + 2), br2 = Math.sin(TAU * (x + 2 * z + 2 * t) + 1);
    if (ln2 > .93 && br2 > .3) c = R[3];
    const gl = h3(Math.floor((x + .5) * 24), Math.floor((z + .5) * 24), 17);           // now and then a glint, on and off over the loop
    if (gl > .93 && (gl * 37 + t) % 1 < .25 && h > .4) c = R[6];
    if (inner) {                                                                         // land only at one corner: foam round that corner
      const [e1] = EDGE[inner](x, z), [e2] = EDGE[{ S: 'E', E: 'N', N: 'W', W: 'S' }[inner]](x, z), e = Math.hypot(e1, e2), lap = .1 + .035 * (1 + Math.sin(TAU * (t + 2 * Math.atan2(e1, e2) / Math.PI)));
      if (e < lap) c = FOAM[e < lap * .5 ? 2 : 1]; else if (e < lap + .06) c = FOAM[0];
    }
    if (shore) for (const s of shore) {
      const [e, along] = EDGE[s](x, z), lap = .05 + .035 * (1 + Math.sin(TAU * (2 * along + t))) + .015 * Math.sin(TAU * (5 * along - t) + 1);
      if (e < lap) c = FOAM[e < lap * .45 ? 2 : 1];
      else if (e < lap + .06) c = FOAM[0];                                               // wet, darker, where the wave has just gone back
    }
    o.set([...c, 255], (py * SIZE + px) * 4);
  }
  return o;
}
ANIMS['Water A1'] = { frames: 8, fps: 6, sides: ['S'], tile: t => waterTile(t, 'S', 'deep') };
ANIMS['Water A2'] = { frames: 8, fps: 6, sides: ['S'], tile: t => waterTile(t, 'S', 'shallow') };
ANIMS['Water Shore A1'] = { frames: 8, fps: 6, tile: (t, s) => waterTile(t, s, 'shallow', [s]) };   // foam along one edge, the side names which
ANIMS['Water Shore Inner A1'] = { frames: 8, fps: 6, tile: (t, s) => waterTile(t, s, 'shallow', null, s) };   // land at one corner only: the inside of a bend in the shore
ANIMS['Water Shore Corner A1'] = { frames: 8, fps: 6, tile: (t, s) => waterTile(t, s, 'shallow', [s, { S: 'E', E: 'N', N: 'W', W: 'S' }[s]]) };   // foam along two edges that meet

/* ---------- a pennant: a pole with a plain undyed cloth that flaps in the wind ---------- */
function pennantAt(t) {
  const body = (x, y, z) => { const q = sdCap(x, y, z, 0, 0, 0, 0, 1.9, 0, .03, .022); hit.mat = WOOD; hit.grv = 1; hit.var = .5; return q; };
  return { H: 2, bound: [.62, 1, .3], noMoss: true, cast: (x, y, z) => Math.min(body(x, y, z), cloth(x, y, z)), sdf: (x, y, z) => { const b = body(x, y, z), c = cloth(x, y, z); if (c < b) { hit.mat = CANVAS; hit.grv = 1; hit.var = .6; return c; } body(x, y, z); return b; } };
  function cloth(x, y, z) {                                                // a long tapering cloth along +x from the pole's top, waving in z
    const u = clamp(x / .55, 0, 1), wave = .07 * u * Math.sin(TAU * (u * 1.3 - t)) + .02 * u * Math.sin(TAU * (u * 3 - 2 * t)), droop = .1 * u * u;
    const half = .12 * (1 - .7 * u), cy = 1.74 - droop + .025 * u * Math.sin(TAU * (u - t) + 1);
    return Math.max(Math.abs(z - wave) - .01, Math.abs(y - cy) - half, -x, x - .55) * .7;
  }
}
ANIMS['Pennant A1'] = { frames: 8, fps: 8, shadow: 'Pennant Shadow A1', at: pennantAt };

/* ---------- smoke: grey puffs rising and fading, an effect drawn over a fire gone out or a chimney (no shadow, no sides) ---------- */
function smoke(t) {
  const o = Buffer.alloc(SIZE * SIZE * 4), G = ['#5b5a55', '#77756e', '#96938a'].map(hexc);
  const put = (x, y, c, a) => { if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return; const i = (y * SIZE + x) * 4; if (o[i + 3] >= a * 255) return; o.set([...c, Math.round(a * 255)], i); };
  for (let k = 0; k < 10; k++) {
    const u = (t + k / 10) % 1, cx = 128 + 7 * Math.sin(TAU * u + k * 1.3) + 22 * u * u, cy = 196 - 104 * u, r = 6 + 13 * u, fade = u < .1 ? u / .1 : 1 - (u - .1) / .9;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.15) / r; if (d > 1) continue;
      const lit = Math.hypot(x - cx + r * .3, y - cy + r * .3) < r * .45 ? 2 : d > .75 ? 0 : 1;   // pale on the upper left, dark round the rim
      put(x, y, G[lit], (fade > .66 ? .7 : fade > .33 ? .5 : .3));                     // fading in hard steps
    }
  }
  return o;
}
ANIMS['Smoke A1'] = { frames: 10, fps: 6, sides: ['S'], effect: true, tile: t => smoke(t) };

/* ---------- fire indoors ---------- */
import { table } from './furniture.mjs';
/* a candle in an iron dish on the plank table (furniture.mjs), for a room at night */
const candleBody = (x, y, z) => {
  let d = table.sdf(x, y, z);
  { const q = Math.max(Math.hypot(x - .08, z + .04) - .055, Math.abs(y - .507) - .007); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // the dish
  { const q = Math.max(Math.hypot(x - .08, z + .04) - .02, y - .6, .5 - y); if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .9; } }   // the candle, pale tallow
  return d;
};
ANIMS['Table A1 Candle'] = { frames: 8, fps: 10, shadow: 'Table Shadow A1 Candle', at: t => ({ ...table, H: .8, bound: [table.bound[0], .4, table.bound[2]], sdf: (x, y, z) => flame(x, y, z, .08, .6, -.04, .07, .014, t, 5, candleBody(x, y, z), 1), cast: candleBody }) };

/* a hearth: a stone fireplace against the wall on the tile's far edge, a fire in it, a chimney going up */
const HZ = -.5;
const HEARTH_STONES = cutStone(95, .6, .5, .3, { sides: 9, chips: 4, tops: 2, taper: .05 });
function hearthBody(x, y, z) {
  const lz = z - (HZ + .2);
  let d = chBox(x, y - .45, lz, .46, .45, .2, .02);                                                  // the stone block
  d = Math.max(d, -chBox(x, y - .24, lz - .1, .26, .24, .2, .01));                                   // its mouth, open to the room
  d = Math.min(d, chBox(x, y - 1.25, z - (HZ + .12), .24, .38, .12, .015));                         // the chimney breast going up the wall
  { const q = chBox(x, y - .92, lz + .02, .5, .04, .22, .01); if (q < d) { d = q; } }                // a mantel ledge
  d += .006 * fbm3(x * 18, y * 18, z * 18);
  hit.mat = ROCK; hit.grv = (gaps(y + (gaps(x, .3)[1] % 2) * .07, .14)[0] < .1 || gaps(x + (Math.floor(y / .14) % 2) * .15, .3)[0] < .05) ? 0 : 1; hit.var = h3(Math.floor(x / .3), Math.floor(y / .14), 95);   // coursed stone
  for (const k of [0, 1]) { const q = log(x, y, z, -.18, .05, HZ + .26 + k * .05, .18, .07, HZ + .3 - k * .04, .04, 9); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = -1; } }   // charred logs
  return d;
  function log(x, y, z, ax, ay, az, bx, by, bz, r, dd) { return sdCap(x, y, z, ax, ay, az, bx, by, bz, r, r); }
}
ANIMS['Hearth A1'] = { frames: 8, fps: 10, shadow: 'Hearth Shadow A1', at: t => ({
  H: 1.65, bound: [.52, .84, .32], boundZ: HZ + .3, noMoss: true, glow: [0, .25, HZ + .3, .5],
  sdf: (x, y, z) => flame(x, y, z, 0, .08, HZ + .28, .3, .07, t, 6, hearthBody(x, y, z), 4),
  cast: hearthBody,
}) };

/* a smith's forge: a stone hearth at waist height, a bed of coals that glow brighter and dimmer, a hood, bellows at the side */
function forgeBody(x, y, z, t, lit) {
  let d = chBox(x, y - .35, z, .4, .35, .32, .02) + .006 * fbm3(x * 16, y * 16, z * 16); hit.mat = ROCK; hit.grv = gaps(y, .14)[0] < .1 ? 0 : 1; hit.var = h3(Math.floor(x / .27 + (Math.floor(y / .14) % 2) * .5), Math.floor(y / .14), 96);
  d = Math.max(d, -chBox(x, y - .72, z, .28, .1, .2, .01));                                          // the hollow on top for the coals
  { const q = Math.max(Math.hypot(x, z * 1.2) - .26, y - .66 - .02 * (fbm3(x * 20, 5, z * 20) + .4), .58 - y); if (q < d) { d = q; const hot = fbm3(x * 22, 6, z * 22) + .25 * Math.sin(TAU * t + x * 7); if (lit && hot > -.05) { hit.mat = FIRE; hit.var = hot > .3 ? .7 : hot > .12 ? .45 : .2; } else { hit.mat = IRON; hit.var = .1; } hit.grv = 1; } }   // coals, breathing
  { const q = Math.max(Math.abs(x) - .3 + (y - 1.15) * .9, Math.abs(z) - .26 + (y - 1.15) * .8, Math.abs(y - 1.15) - .1); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .4; } }   // the hood
  { const q = chBox(x, y - 1.6, z, .08, .36, .08, .01); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .3; } }   // the flue
  for (const sx of [-.33, .33]) { const q = sdCap(x, y, z, sx, .7, -.22, sx, 1.1, -.2, .015, .015); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // the hood's legs
  // bellows on the +x side: two boards and a leather body that fills and empties over the loop
  const open = .045 + .03 * (1 + Math.sin(TAU * t)), bx = x - .55, by = y - .5;
  { const q = Math.max(chBox(bx, by, z, .14, open, .1, .01), -(bx + .14) * .3 - Math.abs(by) + .0); if (q < d) { d = q; hit.mat = LEATHER; hit.grv = gaps(by, .025)[0] < .2 ? 0 : 1; hit.var = .5; } }
  for (const s of [-1, 1]) { const q = chBox(bx, by - s * (open + .01), z, .15, .01, .11, .004); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .5; } }
  { const q = sdCap(x, y, z, .41, .5, 0, .3, .55, 0, .02, .02); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // the nozzle into the fire
  for (const lx of [-.1, .1]) { const q = sdCap(x, y, z, .55 + lx, 0, 0, .55 + lx, .4, 0, .02, .02); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .4; } }   // the bellows' stand
  return d;
}
ANIMS['Forge A1'] = { frames: 8, fps: 8, shadow: 'Forge Shadow A1', at: t => ({
  H: 2, bound: [.74, 1, .36], boundZ: 0, noMoss: true, glow: [0, .7, 0, .5],
  sdf: (x, y, z) => flame(x, y, z, 0, .64, 0, .14 + .05 * (1 + Math.sin(TAU * t)), .06, t, 7, forgeBody(x, y, z, t, true), 3),
  cast: (x, y, z) => forgeBody(x, y, z, 0, false),
}) };

/* ripples: rings spreading on water round something that stands in it (a jetty's posts, a moored boat); an effect, no shadow */
function ripples(t) {
  const o = Buffer.alloc(SIZE * SIZE * 4), C = ['#5f8f97', '#9cc4c2'].map(hexc);
  for (let k = 0; k < 2; k++) {
    const u = (t + k / 2) % 1, r = .08 + .34 * u, a = u < .6 ? 1 : (1 - u) / .4;
    for (let py = 160; py < 256; py++) for (let px = 40; px < 216; px++) {
      const x = (px + .5 - 128) / 64, y = (py + .5 - 208) / 32, d = Math.abs(Math.hypot(x, y) - r * 2);   // a ring on the ground
      if (d < .035) { const i = (py * SIZE + px) * 4; o.set([...C[a > .5 ? 1 : 0], Math.round((a > .5 ? .8 : .5) * 255)], i); }
    }
  }
  return o;
}
ANIMS['Ripples A1'] = { frames: 10, fps: 6, sides: ['S'], effect: true, tile: t => ripples(t) };

await main();
