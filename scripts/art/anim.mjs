// Code-made animated props and tiles for Renown, written with the kit (scripts/art/kit.mjs).
//   node scripts/art/anim.mjs [names|all] [--draft] [--views S,E,N,W] [--out prototype/art/made/anim]
// Each animation is a loop of FRAMES pictures. Per side it writes one strip, `<Name>_<side>.png`, the frames side by side, each
// 256 x 256 with the tile's middle at 128,208 like any prop, and one still shadow `<Shadow>_<side>.png` (drawn at 0.3 alpha).
// `anim.json` beside them lists each one's frames and frames a second, so the game and the scene page play them alike.
// --draft writes no sprite: it puts every frame of the first side in a row, big, in prototype/shots/anim-draft.png.
// The ANIMS are added below, family by family; ANIMS[name] = { frames, fps, shadow, at: t => prop } or, for ground, { tile: (t, side) => rgba }.
import { render, SIZE, RAMP } from './kit.mjs';
import { readPng, writePng } from './png.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { font, textWidth, drawText } from './ui/text.mjs';

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
      const FW = A.canvas ? A.canvas[0] : A.size || SIZE, FH = A.canvas ? A.canvas[1] : A.size || SIZE, strip = Buffer.alloc(FW * A.frames * FH * 4); let shadow = null;
      for (let f = 0; f < A.frames; f++) {
        const t = f / A.frames;
        let pic;
        if (A.tile) pic = A.tile(t, v);
        else { const r = render({ ...A.at(t), canvas: A.canvas }, v, ss); pic = r.out; if (!f) shadow = r.so; }
        if (A.post) pic = A.post(pic, FW, FH, f);
        for (let y = 0; y < FH; y++) pic.copy(strip, (y * FW * A.frames + f * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
      }
      if (draft) { if (!vi) rows.push({ n, strip, frames: A.frames, shadow, FW, FH }); }
      else {
        writePng(`${out}/${n}_${v}.png`, strip, FW * A.frames, FH);
        if (shadow && A.shadow) writePng(`${out}/${A.shadow}_${v}.png`, shadow, FW, FH);
      }
      if (draft) break;
    }
    if (!draft) manifest[n] = { frames: A.frames, fps: A.fps, loop: A.loop !== false, sides: views, ...(A.under ? { under: A.under } : {}), ...(A.foamOf ? { foamOf: A.foamOf } : {}), ...(A.canvas ? { w: A.canvas[0], h: A.canvas[1], ax: (A.anchor || A.canvas)[A.anchor ? 0 : 2], ay: (A.anchor || A.canvas)[A.anchor ? 1 : 3] } : A.size ? { w: A.size, h: A.size } : {}), shadow: A.shadow || null, ground: !!A.tile && !A.effect && !A.overlay, effect: !!A.effect, overlay: !!A.overlay, light: !!A.light, surface: !!A.surface };
    console.log(`${n}: ${A.frames} frames${draft ? '' : ` x ${views.length} sides`} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  if (!draft) { writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n'); console.log(`Wrote to ${out}`); return; }
  // the draft: each animation's frames in a row on grass, with the shadow, cropped to what is drawn, at 2 to 3 times the size
  const BG = [66, 92, 46];
  const SW = rows[0].FW, SH = rows[0].FH;                                      // one draft holds animations of one picture size
  let x0 = SW, x1 = 0, y0 = SH, y1 = 0;
  for (const r of rows) for (let f = 0; f < r.frames; f++) for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (r.strip[(y * SW * r.frames + f * SW + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(SW - 1, x1 + 4); y1 = Math.min(SH - 1, y1 + 4);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cols = Math.max(...rows.map(r => r.frames)), z = Math.max(1, Math.min(3, Math.floor(1800 / (cw * cols)))), W = cw * cols * z, H = ch * rows.length * z, img = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set([...BG, 255], i * 4);
  rows.forEach((r, ri) => { for (let f = 0; f < r.frames; f++) for (let y = 0; y < ch * z; y++) for (let x = 0; x < cw * z; x++) {
    const sx = x0 + Math.floor(x / z), sy = y0 + Math.floor(y / z), o = ((ri * ch * z + y) * W + f * cw * z + x) * 4;
    if (r.shadow) { const a = r.shadow[(sy * SW + sx) * 4 + 3] / 255 * .3; for (let k = 0; k < 3; k++) img[o + k] *= 1 - a; }
    const s = (sy * SW * r.frames + f * SW + sx) * 4, a = r.strip[s + 3] / 255; if (!a) continue;
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

/* ---------- things that open: played once (loop: false), the last frame held ---------- */
import { chest } from './props.mjs';
const ease = u => u * u * (3 - 2 * u);
ANIMS['Chest A1 Opening'] = { frames: 6, fps: 12, loop: false, shadow: 'Chest Shadow A1 Opening', at: t => chest(Math.max(1e-6, ease(t * 6 / 5))) };   // frame 0 just ajar, frame 5 fully open (Chest A1 Open)

/* a plank door in a timber frame on the tile's far edge, swinging open into the tile (D191) */
const DZ = -.5, DW = .4, DH = 1.5, HX = -.4;            // the wall's face, the door's half width and height, the hinge
function doorAt(x, y, z, ang) {
  let d = 9;
  for (const px of [-.47, .47]) { const q = chBox(x - px, y - .82, z - DZ, .05, .82, .05, .01); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .3; } }   // the posts
  { const q = chBox(x, y - 1.6, z - DZ, .52, .055, .055, .01); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .45; } }                                 // the lintel
  { const q = chBox(x, y - .01, z - DZ, .44, .012, .06, .004); if (q < d) { d = q; hit.mat = ROCK; hit.grv = 1; hit.var = .5; } }                                 // a stone sill
  // the door, turned about its hinge by ang (0 shut, in the wall; toward the viewer as it opens)
  const c = Math.cos(ang), sn = Math.sin(ang), rx = x - HX, rz = z - DZ, lx = rx * c - rz * sn, lz = rx * sn + rz * c;
  const dx = lx - DW, dy = y - DH / 2 - .02;
  let q = chBox(dx, dy, lz, DW - .01, DH / 2, .025, .006);
  if (q < d) { d = q; hit.mat = WOOD; const [fj, k] = gaps(lx, .1); hit.grv = fj < .06 ? 0 : 1; hit.var = h3(k, 9, 3); }
  for (const by of [.3, 1.2]) { const qq = chBox(dx, y - by, lz - .03, DW - .04, .03, .008, .003); if (qq < d) { d = qq; hit.mat = IRON; hit.grv = 1; hit.var = .5; } }   // iron straps
  { const qq = Math.max(Math.abs(Math.hypot(lx - DW * 1.7, y - .78) - .04) - .008, Math.abs(lz - .035) - .008); if (qq < d) { d = qq; hit.mat = IRON; hit.grv = 1; hit.var = .7; } }   // a ring to pull
  return d;
}
const DOOR_OPEN = 1.75;                                   // about 100 degrees
ANIMS['Door A2 Opening'] = { frames: 6, fps: 12, loop: false, shadow: 'Door Shadow A2 Opening', at: t => ({ H: 1.7, bound: [.56, .85, .52], boundZ: -.1, sdf: (x, y, z) => doorAt(x, y, z, DOOR_OPEN * ease(t * 6 / 5)) }) };

/* ---------- 2D effects: drawn straight into the picture, hard tones, no shadow, played over a character or the land ---------- */
// A character's chest is about 48 px above the tile's middle (a human, D205); effects meant for a character are centred there.
const CHEST_Y = 208 - 48;
function canvas2d(w = SIZE, h = SIZE) {
  const o = Buffer.alloc(w * h * 4);
  const put = (x, y, c, a = 1) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return; const i = (y * w + x) * 4; if (o[i + 3] > a * 255) return; o.set([...c, Math.round(Math.min(1, a) * 255)], i); };
  const disc = (cx, cy, r, c, a = 1, sy = 1) => { for (let y = Math.floor(cy - r * sy); y <= cy + r * sy; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (Math.hypot(x - cx, (y - cy) / sy) <= r) put(x, y, c, a); };
  const line = (x0, y0, x1, y1, c, a = 1, wd = 1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (wd > 1) disc(x, y, wd / 2, c, a); else put(x, y, c, a); } };
  return { o, put, disc, line, w, h };
}
const WHITE = hexc('#fffdf2'), PALE = hexc('#fff1b8'), GOLD = hexc('#ffc94a'), ORANGE = hexc('#ff8a2a'), RED = hexc('#d2421c'), DUST = ['#8d8576', '#b3ab99', '#d8d1bf'].map(hexc);
const step = a => a > .66 ? 1 : a > .33 ? .66 : a > .05 ? .35 : 0;            // fading in hard steps

/* the block (D207): a white flash on the shield side, a burst and a ring */
ANIMS['Block Flash A1'] = { frames: 5, fps: 15, loop: false, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), f = Math.round(t * 5), cx = 140, cy = CHEST_Y + 2;
  if (f === 0) { C.disc(cx, cy, 6, WHITE); }
  if (f === 1) { C.disc(cx, cy, 11, WHITE); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; C.line(cx + 12 * Math.cos(a), cy + 12 * Math.sin(a) * .8, cx + 22 * Math.cos(a), cy + 22 * Math.sin(a) * .8, PALE, 1, 2); } }
  if (f === 2) { C.disc(cx, cy, 8, PALE, .66); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + .2; C.line(cx + 18 * Math.cos(a), cy + 18 * Math.sin(a) * .8, cx + 28 * Math.cos(a), cy + 28 * Math.sin(a) * .8, WHITE, 1, 2); } }
  if (f >= 3) { const r = f === 3 ? 22 : 28, a = f === 3 ? .66 : .35; for (let k = 0; k < 64; k++) { const q = k * TAU / 64; C.put(cx + r * Math.cos(q), cy + r * Math.sin(q) * .8, WHITE, a); } }
  return C.o;
} };

/* a hit that lands: sparks flying out from the chest, white heart, orange tails */
ANIMS['Hit Spark A1'] = { frames: 6, fps: 15, loop: false, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), u = t * 6 / 5, cx = 128, cy = CHEST_Y;
  if (u < .25) C.disc(cx, cy, 5 + 14 * u, WHITE); else if (u < .45) C.disc(cx, cy, 7, PALE, .66);
  for (let k = 0; k < 9; k++) {
    const a = k * TAU / 9 + h3(k, 1, 4) * .6 - .3, sp = 18 + 22 * h3(k, 2, 4), r0 = sp * u, r1 = sp * u + 6 * (1 - u) + 2, fall = 14 * u * u;
    const x0 = cx + r0 * Math.cos(a), y0 = cy + r0 * Math.sin(a) * .8 + fall, x1 = cx + r1 * Math.cos(a), y1 = cy + r1 * Math.sin(a) * .8 + fall;
    C.line(x0, y0, x1, y1, u < .4 ? GOLD : ORANGE, step(1.2 - u), u < .5 ? 2 : 1); C.disc(x1, y1, 1, u < .5 ? WHITE : GOLD, step(1.2 - u));
  }
  return C.o;
} };

/* a miss: a pale swish where the blow went by, and a puff of dust */
ANIMS['Miss Puff A1'] = { frames: 6, fps: 15, loop: false, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), u = t * 6 / 5, cx = 128, cy = CHEST_Y;
  const a0 = -2.4 + 2.2 * u, a1 = a0 + 1.1;                                  // an arc sweeping past, thin and fading
  for (let k = 0; k <= 40; k++) { const q = a0 + (a1 - a0) * k / 40, r = 26; C.put(cx + 6 + r * Math.cos(q), cy - 4 + r * Math.sin(q) * .7, k > 30 ? WHITE : DUST[2], step((1 - u) * (k / 40))); }
  for (let k = 0; k < 3; k++) { const r = 3 + 7 * u, x = cx - 10 + k * 9 + 6 * u * (k - 1), y = 206 - 6 * u - (k === 1 ? 3 : 0); C.disc(x, y, r, DUST[k === 1 ? 2 : 1], step(1 - u), .7); }   // dust at the feet
  return C.o;
} };

/* ---------- markers in the world (D16, D17, D161): what a click asked for, and what the attack roll said ----------
   Looked at first: click-to-move games (Diablo, Ultima Online's later clients, RuneScape) mark the clicked spot with a short mark on the
   ground that closes in and is gone in about half a second, and the attacked one with a ring on the ground under it that stays while
   the attack lasts; UO and RuneScape show a miss as a word or a splash over the head. Kept on the ground and small so the land shows. */
const GROUND_Y = 208;                                                        // the tile's middle, on the ground
const ring = (C, cx, cy, rx, ry, c, a = 1, from = 0, to = TAU) => { const n = Math.ceil(Math.abs(to - from) * rx * 3); for (let k = 0; k <= n; k++) { const q = from + (to - from) * k / n; C.put(cx + rx * Math.cos(q), cy + ry * Math.sin(q), c, a); } };

/* where a click sends you (D16): four small white corner marks on the ground closing in on the spot, a ring tightening, gone in half a second */
ANIMS['Move Spot A1'] = { frames: 8, fps: 16, loop: false, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), u = t * 8 / 7, cx = 128, cy = GROUND_Y, r = 26 - 16 * u, fade = step(1.15 - u);
  ring(C, cx, cy, r, r / 2, u < .4 ? PALE : GOLD, fade);
  if (u > .15) ring(C, cx, cy, r + 1, r / 2 + .5, GOLD, step(.8 - u));                 // a second line while it is big: reads as thicker
  for (let k = 0; k < 4; k++) {                                                        // a chevron on each side, its point to the middle
    const q = k * TAU / 4 + TAU / 8, d = r + 9 - 4 * u, on = (rr, qq) => [cx + rr * Math.cos(qq), cy + rr * Math.sin(qq) / 2];   // a point on the ground
    const tip = on(d - 4, q), w1 = on(d + 3, q - 6 / d), w2 = on(d + 3, q + 6 / d);
    C.line(...w1, ...tip, WHITE, fade, 2); C.line(...w2, ...tip, WHITE, fade, 2);
  }
  if (u > .7) C.disc(cx, cy, 2, WHITE, step(1.3 - u), .5);                              // the spot itself, last
  return C.o;
} };

/* who you attack (D17): a red ring on the ground under it with four brackets turning, a quarter turn a loop; drawn under the character
   while the attack lasts, like the waking glow */
const BLOOD_DARK = hexc('#7a1410'), BLOOD_MID = hexc('#c2301e'), BLOOD_PALE = hexc('#ff7a5c');
ANIMS['Target Ring A1'] = { frames: 8, fps: 8, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), cx = 128, cy = GROUND_Y, rx = 30, ry = 15, beat = .5 + .5 * Math.cos(TAU * t);
  ring(C, cx, cy, rx, ry, BLOOD_MID, 1); ring(C, cx, cy, rx - 1, ry - .5, BLOOD_DARK, 1); ring(C, cx, cy, rx + 1, ry + .5, BLOOD_DARK, .66);
  for (let k = 0; k < 4; k++) {                                                         // the brackets: arcs just outside the ring
    const q0 = k * TAU / 4 + TAU / 4 * t, q1 = q0 + .5;
    ring(C, cx, cy, rx + 4, ry + 2, beat > .5 ? BLOOD_PALE : BLOOD_MID, 1, q0, q1); ring(C, cx, cy, rx + 5, ry + 2.5, BLOOD_MID, 1, q0, q1);
  }
  return C.o;
} };

/* a miss (D161): the word over the head (clear of an orc's, D205), rising and fading; Miss Puff A1 shows where the blow went by */
const MISS_FONT = font(new URL('../../game/client/art/fonts/AlegreyaSC-Bold.woff', import.meta.url).pathname);
ANIMS['Miss Word A1'] = { frames: 10, fps: 12, loop: false, sides: ['S'], effect: true, tile: t => {
  const u = t * 10 / 9, px = 14, w = textWidth(MISS_FONT, 'Miss', px), y = 84 - 18 * Math.sqrt(u), a = step(1.3 - u);
  const img = Buffer.alloc(SIZE * SIZE * 4); drawText(img, SIZE, 128 - w / 2, y, 'Miss', MISS_FONT, px, hexc('#e8e2d0'), 2, hexc('#141210'));
  for (let i = 3; i < img.length; i += 4) img[i] = img[i] < 90 ? 0 : Math.round(255 * a);    // hard edges, then the fade in steps
  for (let i = 0; i < img.length; i += 4) if (!img[i + 3]) img[i] = img[i + 1] = img[i + 2] = 0;
  return img;
} };

/* bandaging (D164): a strip of cloth wound round the chest, going round; plays while it lasts */
ANIMS['Bandage A1'] = { frames: 8, fps: 10, sides: ['S'], effect: true, tile: t => {
  const C = canvas2d(), cx = 128, cy = CHEST_Y + 4, rx = 16, ry = 6;
  for (let k = 0; k < 18; k++) {                                            // the band: an arc of cloth that turns, the front pale, the back dim
    const q = TAU * (t + k / 40), x = cx + rx * Math.cos(q), y = cy + ry * Math.sin(q) - k * .5, front = Math.sin(q) > 0;
    C.line(x, y, x, y + 3, front ? WHITE : DUST[2], front ? 1 : .66);
  }
  const tail = TAU * t, tx = cx + rx * Math.cos(tail), ty = cy + ry * Math.sin(tail);   // the loose end
  C.line(tx, ty, tx + 6 * Math.cos(tail + 1.5), ty + 8, WHITE, Math.sin(tail) > 0 ? 1 : .66);
  return C.o;
} };

/* steam off a pot, and a taller column of smoke for a chimney */
function puffs(t, { n, x0, y0, rise, r0, r1, drift, cols, alpha }) {
  const C = canvas2d();
  for (let k = 0; k < n; k++) {
    const u = (t + k / n) % 1, cx = x0 + 5 * Math.sin(TAU * u + k * 1.3) + drift * u * u, cy = y0 - rise * u, r = r0 + (r1 - r0) * u, fade = u < .1 ? u / .1 : 1 - (u - .1) / .9;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.15) / r; if (d > 1) continue;
      C.put(x, y, cols[Math.hypot(x - cx + r * .3, y - cy + r * .3) < r * .45 ? 2 : d > .75 ? 0 : 1], step(fade) * alpha);
    }
  }
  return C.o;
}
ANIMS['Steam A1'] = { frames: 10, fps: 10, sides: ['S'], effect: true, tile: t => puffs(t, { n: 8, x0: 128, y0: 178, rise: 70, r0: 3, r1: 9, drift: 10, cols: ['#c9cdc9', '#e3e6e1', '#f7f8f4'].map(hexc), alpha: .7 }) };
ANIMS['Smoke A2'] = { frames: 12, fps: 6, sides: ['S'], effect: true, tile: t => puffs(t, { n: 12, x0: 128, y0: 120, rise: 118, r0: 4, r1: 12, drift: 26, cols: ['#5b5a55', '#77756e', '#96938a'].map(hexc), alpha: .85 }) };   // from a chimney top, about 1.4 tiles up

/* Night light and weather, after how 2D games do it (looked up 2026-11-18): night is the whole picture multiplied by a dark blue
   ambient colour (Godot: CanvasModulate), with lights added back (PointLight2D, whose texture sets the falloff); a retro look comes
   from ordered dithering of the light's falloff rather than hard rings. Rain is thin streaks at one slant (about 2 down for 1
   across) in two or more layers, the far ones shorter, fainter and slower, with splashes where drops land. Fog is soft noise
   scrolled in two layers at different speeds. All repeat across the screen with no seam and loop in time. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const dither = (v, x, y, levels) => Math.floor(v * levels + BAYER[(y & 3) * 4 + (x & 3)]) / levels;   // v (0 to 1) to one of levels steps, mixed by a 4 x 4 pattern
/* a light for the game's PointLight2D: white, brightest in the middle, falling off like real light (1 / (1 + k d^2)), dithered into
   8 steps so it stays pixel art; flat on the ground (twice as wide as tall, like a tile) */
ANIMS['Light A1'] = { frames: 1, fps: 1, sides: ['S'], effect: true, light: true, size: 256, tile: () => {
  const o = Buffer.alloc(256 * 256 * 4);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dx = (x + .5 - 128) / 128, dy = (y + .5 - 128) / 64, d = Math.hypot(dx, dy); if (d >= 1) continue;
    const v = (1 / (1 + 9 * d * d) - .1) / .9 * (1 - d * d), a = dither(Math.max(0, v), x, y, 8); if (a <= 0) continue;
    o.set([255, 255, 255, Math.round(a * 255)], (y * 256 + x) * 4);
  }
  return o;
} };

/* rain: two layers of streaks (far: short, faint, slow; near: long, brighter, fast), slanted 2 down for 1 across */
function rainLayer(t) {
  const C = canvas2d(), far = hexc('#8796a8'), near = hexc('#c3cfdc');
  for (const [n, len, speed, col, a, seed] of [[90, 4, 1, far, .35, 21], [45, 9, 2, near, .55, 22]])
    for (let k = 0; k < n; k++) {
      const x0 = h3(k, 1, seed) * 256, y0 = h3(k, 2, seed) * 256, L = len + Math.floor(h3(k, 3, seed) * 3);
      for (let m = 0; m < 2 * L; m++) { const yy = y0 + speed * 256 * t + m, y = ((Math.floor(yy) % 256) + 256) % 256, x = (((Math.floor(x0 - yy * .5)) % 256) + 256) % 256; C.put(x, y, col, m >= 2 * L - 3 ? Math.min(1, a + .2) : a); }   // one unbroken slant line; the head of a drop a little brighter
    }
  return C.o;
}
/* where drops land: a dot, a little crown, two droplets thrown out, gone; each splash at its own time and place */
function splashLayer(t) {
  const C = canvas2d(), c = hexc('#c9d4de'), f8 = Math.floor(t * 8);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(h3(k, 4, 23) * 256), y = Math.floor(h3(k, 5, 23) * 256), ph = (f8 + Math.floor(h3(k, 6, 23) * 8)) % 8;
    if (ph === 0) C.put(x, y, c, .7);
    if (ph === 1) { C.put(x - 1, y, c, .6); C.put(x + 1, y, c, .6); C.put(x - 1, y - 1, c, .5); C.put(x + 1, y - 1, c, .5); }
    if (ph === 2) { C.put(x - 2, y - 2, c, .45); C.put(x + 2, y - 2, c, .45); C.put(x - 2, y, c, .3); C.put(x + 2, y, c, .3); }
  }
  return C.o;
}
/* fog: soft noise that repeats every 512 px, dithered to stay pixel art; one frame (the page and the game scroll it) */
function fogLayer() {
  const N = 512, C = canvas2d(N, N), c = hexc('#dfe3e6');
  const noise = (X, Y, gx, gy, o) => { const fx = X * gx, fy = Y * gy, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);   // value noise on a lattice that wraps
    const w = (a, b) => h3(((a % gx) + gx) % gx, ((b % gy) + gy) % gy, 40 + o); return (w(i, j) * (1 - su) + w(i + 1, j) * su) * (1 - sv) + (w(i, j + 1) * (1 - su) + w(i + 1, j + 1) * su) * sv; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const X = x / N, Y = y / N, v = .5 * noise(X, Y, 2, 5, 1) + .3 * noise(X, Y, 4, 10, 2) + .2 * noise(X, Y, 8, 20, 3);   // banks of fog, long across and thin up and down
    const a = dither(clamp((v - .35) / .45, 0, 1) * .5, x, y, 6); if (a > 0) C.put(x, y, c, a);
  }
  return C.o;
}
/* leaves: a few, each turning over as it falls (face, tilt, edge, tilt), blown along by the wind */
const LEAF = [[[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2]], [[0, 0], [1, 1], [0, 1], [-1, 2], [0, 2]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [-1, 1], [0, 1], [1, 2], [0, 2]]];
function leavesLayer(t) {
  const C = canvas2d(), cols = [['#a65a22', '#6e3512'], ['#c98a2b', '#7d5114'], ['#8a962e', '#4f5a16'], ['#d9a640', '#8a6420']].map(p => p.map(hexc));
  for (let k = 0; k < 7; k++) {
    const x0 = h3(k, 5, 22) * 256, y0 = h3(k, 6, 22) * 256, y = (y0 + 256 * t) % 256, x = ((x0 + 256 * t + 8 * Math.sin(TAU * (2 * t + k / 7))) % 256 + 256) % 256;
    const shape = LEAF[(Math.floor(t * 16) + k) % 4], [c, dark] = cols[k % 4];
    for (const [dx, dy] of shape) C.put((x + dx + 256) % 256, (y + dy) % 256, dy === 2 ? dark : c);
  }
  return C.o;
}
/* the open water's surface for the game's water shader (and the scene page): two squares of 512 px that repeat without a seam, scrolled
   against each other in world space so the pattern never lines up with the tiles: a calm base of three blues, and short glints */
function wrapNoise(X, Y, gx, gy, o) { const fx = X * gx, fy = Y * gy, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const w = (a, b) => h3(((a % gx) + gx) % gx, ((b % gy) + gy) % gy, 60 + o); return (w(i, j) * (1 - su) + w(i + 1, j) * su) * (1 - sv) + (w(i, j + 1) * (1 - su) + w(i + 1, j + 1) * su) * sv; }
ANIMS['Water Base A1'] = { frames: 1, fps: 1, size: 512, sides: ['S'], overlay: true, surface: true, tile: () => {
  const C = canvas2d(512, 512), R = WATER.deep;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const X = x / 512, Y = y / 512, v = .6 * wrapNoise(X, Y, 3, 6, 1) + .4 * wrapNoise(X, Y, 7, 14, 2);
    C.put(x, y, R[1 + Math.min(2, Math.floor(dither(clamp((v - .25) / .5, 0, .999), x, y, 3) * 3))]); }   // wide, soft swells, long across
  return C.o;
} };
ANIMS['Water Glints A1'] = { frames: 1, fps: 1, size: 512, sides: ['S'], overlay: true, surface: true, tile: () => {
  const C = canvas2d(512, 512), R = WATER.deep;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const X = x / 512, Y = y / 512, a = wrapNoise(X, Y, 20, 170, 3), b = wrapNoise(X, Y, 6, 12, 4);
    if (a > .76 && b > .5) C.put(x, y, R[a > .88 && b > .62 ? 6 : a > .82 ? 5 : 4], a > .82 ? .85 : .5); }   // short streaks of light, thicker where two noises agree
  return C.o;
} };
ANIMS['Rain A1'] = { frames: 8, fps: 16, sides: ['S'], overlay: true, tile: rainLayer };
ANIMS['Rain Splash A1'] = { frames: 8, fps: 16, sides: ['S'], overlay: true, tile: splashLayer };
ANIMS['Fog A1'] = { frames: 1, fps: 1, size: 512, sides: ['S'], overlay: true, tile: fogLayer };
ANIMS['Leaves A1'] = { frames: 16, fps: 8, sides: ['S'], overlay: true, tile: leavesLayer };

/* ---------- things that turn or flap in the wind or the water ---------- */
/* Sizes from real mills, at about 0.6 of life (one unit is about 1.3 m; a Creator human 1.4 units): an undershot wheel is
   about 4.6 m across (Saltford brass mill's were 15 ft), a post mill's body about 5 x 4 m and 11.7 m to the roof, its sails about 10 m
   long (Cromer, Hertfordshire; English patent sails of 33 ft). Too big for a 256 px picture: these draw on a bigger one (canvas). */

/* a water wheel against the stone wall of a mill house on the far side: 16 paddles on two rims, its foot in the water;
   one loop turns it an eighth of a turn, so it never jumps */
const WR = 1.4, WY = 1.15, WHW = .4;                      // radius, the axle's height, half the wheel's width
function wheelAt(x, y, z, th, under = false) {
  let d = chBox(x, y - 1.3, z + 1.05, 1.7, 1.3, .2, .02) + .006 * fbm3(x * 14, y * 14, z * 14); hit.mat = ROCK;   // the mill house's wall, behind
  hit.grv = (gaps(y + (Math.floor(x / .45) % 2) * .09, .18)[0] < .09 || gaps(x + (Math.floor(y / .18) % 2) * .22, .45)[0] < .05) ? 0 : 1; hit.var = h3(Math.floor(x / .45), Math.floor(y / .18), 97);
  { const q = chBox(x, y - 2.62, z + 1.05, 1.74, .05, .22, .01); if (q < d) { d = q; hit.mat = WOOD; const [fj, k] = gaps(x, .6); hit.grv = fj < .05 ? 0 : 1; hit.var = h3(k, 2, 9) * .4 + .3; } }   // a beam along the wall's top
  { const q = sdCap(x, y, z, 0, WY, -.86, 0, WY, WHW + .45, .07, .07); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .6; } }   // the axle, out of the wall
  for (const sx of [-1, 1]) { const q = sdCap(x, y, z, sx * .6, 0, WHW + .45, 0, WY + .05, WHW + .45, .06, .05); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .35; } }   // an A-frame holding its outer end
  if (under) { d = 9; hit.mat = WOOD; }                                       // under the water: the wheel alone, no wall, no frames
  const py = y - WY, r = Math.hypot(x, py), a = Math.atan2(py, x) - th, az = Math.abs(z);
  { const q = Math.max(r - .2, az - WHW - .06); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .75; } }   // the hub
  { const q = Math.max(Math.abs(r - (WR - .12)) - .06, Math.abs(az - WHW) - .035); if (q < d) { d = q; hit.mat = WOOD; hit.grv = gaps(a, TAU / 8)[0] < .018 ? 0 : 1; hit.var = .5; } }   // two rims, in 8 segments (everything on the wheel repeats every eighth of a turn, so the loop has no jump)
  const near = n => { const w = TAU / n, q = ((a % w) + w * 1.5) % w - w / 2; return Math.abs(r * Math.sin(q)); };
  { const q = Math.max(near(8) - .035, r - (WR - .12), Math.abs(az - WHW) - .03); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .4; } }   // spokes
  { const q = Math.max(near(16) - .025, Math.abs(r - (WR - .1)) - .2, az - WHW - .02); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .85; } }   // paddles
  if (under && y > -.03 && d > -.02) hit.grv = 0;                              // the cut at the waterline drawn dark, not as a lit face
  return under ? Math.max(d, y + .01) : Math.max(d, -y);                           // above the water, or (under) only what is below it
}
/* the part of the wheel under the water, drawn on its own so the game can show it through the water (dimmer, wavering) while the paddles
   dig in. The kit only draws above the ground, so the shape is lifted 24 px and the camera lowered 24 px: in the picture everything is where it belongs. */
const UNDER = 24 / (.866025 * 90.5097), WF = 32, WF2 = 16;   // the loop is an eighth of a turn (8 spokes, 16 paddles): 32 frames, the rim moving about 2.5 px a frame, smooth when the game blends two frames; 16 for the parts seen less clearly
/* where the wheel meets the water, exactly: the wheel drawn again with the 3 px just above the waterline marked, so the wheel's own
   front parts hide what is behind them; everything else is thrown away and the marked pixels become broken white water (anim.json: foamOf) */
const FIRE_SET = new Set(RAMP.fire.map(c => c.join(',')));
function foamMask(pic, W, H, f) {
  for (let i = 0; i < W * H; i++) { const o = i * 4, x = i % W, y = i / W | 0, on = pic[o + 3] > 128 && FIRE_SET.has(pic[o] + ',' + pic[o + 1] + ',' + pic[o + 2]), q = h3(x >> 1, y >> 1, 300 + f);   // broken up in 2 px bits, differently in each frame
    if (on && q > .22) { const c = q > .6 ? [244, 250, 246] : [198, 224, 222]; pic[o] = c[0]; pic[o + 1] = c[1]; pic[o + 2] = c[2]; pic[o + 3] = 255; } else pic[o + 3] = 0; }
  return pic;
}
ANIMS['Water Wheel A1 Foam'] = { frames: WF2, fps: WF2, foamOf: 'Water Wheel A1', canvas: [512, 512, 256, 400], post: foamMask, at: t => ({ H: 2.7, bound: [1.85, 1.38, 1.05], boundZ: -.25, noMoss: true,
  sdf: (x, y, z) => { const d = wheelAt(x, y, z, -TAU / 8 * t); if (y < .045 && z > -.8) { hit.mat = FIRE; hit.var = 1; hit.grv = 1; } return d; } }) };
ANIMS['Water Wheel A1 Under'] = { frames: WF2, fps: WF2, under: 'Water Wheel A1', canvas: [512, 512, 256, 424], anchor: [256, 400],   // drawn lifted 24 px, so in the picture the tile's middle is still at 256,400
  at: t => ({ H: 2.7, bound: [1.85, 1.38, 1.05], boundZ: -.25, noMoss: true, sdf: (x, y, z) => wheelAt(x, y - UNDER, z, -TAU / 8 * t, true) }) };
ANIMS['Water Wheel A1'] = { frames: WF, fps: WF, shadow: 'Water Wheel Shadow A1', canvas: [512, 512, 256, 400], at: t => ({ H: 2.7, bound: [1.85, 1.38, 1.05], boundZ: -.25, sdf: (x, y, z) => wheelAt(x, y, z, -TAU / 8 * t) }) };

/* a post mill: brick piers, crosstrees and quarter bars holding the main post, the weatherboarded body on top with a curved roof,
   a ladder and a tail pole behind, four sails with canvas on lattice frames; one loop turns them a quarter */
const MH = 4.6, MZ = 1.75, SR = 3.8;                       // the sails' hub height and how far forward it stands, the sails' reach
function millAt(x, y, z, th) {
  let d = 9;
  for (const [px, pz] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) { const q = chBox(x - px, y - .18, z - pz, .17, .18, .17, .01); if (q < d) { d = q; hit.mat = ROCK; hit.grv = gaps(y, .09)[0] < .15 ? 0 : 1; hit.var = .3 + .1 * px; } }   // brick piers
  for (const [ax, az] of [[1, 0], [0, 1]]) { const q = chBox(x, y - .44, z, ax ? 1.42 : .08, .08, az ? 1.42 : .08, .01); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .35; } }   // the crosstrees
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = sdCap(x, y, z, ax * 1.15, .5, az * 1.15, ax * .1, 1.75, az * .1, .065, .055); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .45; } }   // quarter bars
  { const q = chBox(x, y - 1.25, z, .14, .95, .14, .02); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .55; } }   // the main post
  // the body: boards running across, a little wider at the top, a curved roof
  { const bx = Math.abs(x) - 1.05 - .04 * clamp((y - 2.2) / 2.8, 0, 1), q0 = Math.max(bx, Math.abs(z + .1) - 1.4, Math.abs(y - 3.6) - 1.4);
    const roof = Math.max(Math.hypot(x * .85, y - 4.35) - 1.25, Math.abs(z + .1) - 1.48, 5 - y);
    let q = Math.min(q0, roof);
    if (q < d) { d = q; hit.mat = WOOD; const top = y > 4.98 && q === roof; const [fj, k] = top ? gaps(z, .2) : gaps(y, .13); hit.grv = fj < .07 ? 0 : 1; hit.var = top ? .8 : h3(k, Math.sign(x) + 2, 8) * .5 + .2; } }
  { const q = chBox(x - .5, y - 3.2, z - 1.31, .2, .32, .03, .01); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .05; } }   // a door in the front
  { const q = chBox(x + .45, y - 4.1, z - 1.31, .14, .14, .03, .005); if (q < d) { d = q; hit.mat = IRON; hit.grv = 1; hit.var = .05; } }   // a small window, dark
  // behind: the ladder up to the door at the back, and the tail pole that turns the mill to the wind
  { const t = clamp((y - .02) / 2.2, 0, 1), lz = z - (-1.55 - 1.3 * (1 - t)), rails = Math.max(Math.abs(Math.abs(x) - .28) - .035, Math.abs(lz) - .035, y - 2.25, -y);
    let q = rails; if (y < 2.2 && y > .05) { const tr = Math.max(Math.abs(x) - .28, Math.abs(gaps(y, .22)[0] * .22 - .11) - .02, Math.abs(lz) - .05); q = Math.min(q, tr); }
    if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .6; } }
  { const q = sdCap(x, y, z, .35, 2.3, -1.45, .45, .35, -3.4, .06, .05); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .5; } }
  // the windshaft and the sails, in the plane z = MZ
  { const q = sdCap(x, y, z, 0, MH - .12, 1.1, 0, MH, MZ + .1, .1, .1); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .7; } }
  const py = y - MH, lz = z - MZ, r = Math.hypot(x, py), a = Math.atan2(py, x) - th, w = TAU / 4, q0 = ((a % w) + w * 1.5) % w - w / 2;
  const along = r * Math.cos(q0), across = r * Math.sin(q0);
  { const q = Math.max(Math.abs(across) - .07, along - SR, -along, Math.abs(lz) - .07); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .5; } }   // the stocks
  if (along > .7 && along < SR && across > 0 && across < .9 && Math.abs(lz + .06) < .08) {                                                                 // a sail: a lattice frame, cloth on it
    const fr = Math.min(Math.abs(across - .88), Math.abs(gaps(along, .42)[0] * .42 - .21) * 2, Math.abs(gaps(across, .3)[0] * .3 - .15) * 2.5);
    const q = Math.max(Math.abs(lz + .06) - .02, Math.max(.7 - along, along - SR, -across, across - .9));
    if (q < d) { d = q; if (fr < .03) { hit.mat = WOOD; hit.var = .45; } else { hit.mat = CANVAS; hit.var = .7; } hit.grv = 1; }
  }
  return d;
}
ANIMS['Windmill A1'] = { frames: 8, fps: 8, shadow: 'Windmill Shadow A1', canvas: [1024, 1024, 512, 820], at: t => ({ H: 8.5, bound: [3.95, 4.3, 2.8], boundZ: -.8, sdf: (x, y, z) => millAt(x, y, z, -TAU / 4 * t) }) };

/* a market stall: a counter, four posts, a plain canvas awning whose front edge flaps */
function stallAt(x, y, z, t) {
  let d = chBox(x, y - .24, z, .46, .24, .2, .012); hit.mat = WOOD; const [fj, k] = gaps(x, .11); hit.grv = fj < .06 && y < .45 ? 0 : 1; hit.var = h3(k, 6, 6);   // the counter
  { const q = chBox(x, y - .49, z, .48, .015, .22, .006); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .75; } }   // its top
  for (const [sx, sz, h] of [[-.46, -.2, 1.5], [.46, -.2, 1.5], [-.46, .2, 1.3], [.46, .2, 1.3]]) { const q = chBox(x - sx, y - h / 2, z - sz, .025, h / 2, .025, .006); if (q < d) { d = q; hit.mat = WOOD; hit.grv = 1; hit.var = .3; } }
  const ay = 1.52 - (z + .26) * .55;                                          // the awning: back high, front low, past the posts
  { const q = Math.max(Math.abs(y - ay - .02 * Math.sin(TAU * (x * 1.5 - t)) * clamp(z + .1, 0, 1)) - .012, Math.abs(x) - .52, Math.abs(z - .04) - .32); if (q < d) { d = q; hit.mat = CANVAS; hit.grv = gaps(x, .13)[0] < .05 ? 0 : 1; hit.var = .55; } }
  { const fz = .36 + .025 * Math.sin(TAU * (2 * x - t)) , bot = 1.18 - .025 * (1 + Math.cos(TAU * x * 5)) + .02 * Math.sin(TAU * (x - t));   // the valance hanging off the front, flapping
    const q = Math.max(Math.abs(z - fz) - .008, Math.abs(x) - .52, y - 1.33, bot - y); if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .4; } }
  for (const [gx, gz, gr] of [[-.25, 0, .09], [-.08, .05, .07], [.2, -.02, .1]]) { const q = Math.hypot(x - gx, (y - .5 - gr * .7) * 1.2, z - gz) - gr; if (q < d) { d = q; hit.mat = CANVAS; hit.grv = 1; hit.var = .25; } }   // sacks of goods
  return d;
}
ANIMS['Market Stall A1'] = { frames: 8, fps: 8, shadow: 'Market Stall Shadow A1', at: t => ({ H: 1.6, bound: [.56, .8, .42], boundZ: .04, sdf: (x, y, z) => stallAt(x, y, z, t) }) };

await main();
