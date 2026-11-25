// A character in layers: every part (a body, a top, hair, a sword) is rendered alone by character.py --view, finished here
// into a layer picture, and the layers of what a character wears are laid over each other when it is drawn.
// A layer pixel holds no colour of its own: it says WHICH RAMP (a "channel": skin, hair, cloth...) and WHICH TONE of it,
// so a colour is swapped when the character is drawn, with no new render; and HOW FAR the surface is from the camera, so
// of two layers the nearer one shows, pixel by pixel, whatever is worn with whatever.
//   layer picture (RGBA): red = channel * 16 + tone (the channel's place in the rules' "ramps"), green and blue = how far
//   (65536 steps over 8 tiles, high byte then low), alpha 255 where the part is. Its ground shadow is a second picture.
// The rules (which slots a race has, what each part is, which colours may be swapped) come from the wardrobe,
// scripts/art/wardrobe.json, race by race: --race human (the default) or --race goblin, on every command.
//   node scripts/art/paperdoll.mjs layers <renders> <out> [--race goblin] [--anims idle,walk] [--side SE] [--parts sword,shield]
//       <renders>/<anim>/<side>.<part>.NN.* from character.py  ->  <out>/<part>/<anim>.<side>.NN.png and .shadow.png
//   node scripts/art/paperdoll.mjs wear <layers> <out> --anim idle --wear "hair=parted,top=peasant,main_hand=sword"
//                                       [--colours "hair=rock,dye=straw,metal=steel,main_hand.metal=bronze"] [--how depth|order] [--side SE]
//       a colour named "<slot>.<channel>" is for the part in that slot only (an item's own metal)
//       one character: <out>/<side>.NN.png and .shadow.png, as finish_sprite.mjs writes a whole one. --how order lays the
//       slots in the rules' order instead (what the game does today), to see what that gets wrong
//       Every character is drawn with the outline (OUTLINE in style.mjs: 1 px of dark round the figure, added when it is
//       drawn, never in the layer pictures), and the part lines (PART_LINE: a 1 px line of the same colour where a helm, a
//       breastplate or pauldrons lie in front of another part). --no-outline, on wear, godot and pack, leaves both out
//   node scripts/art/paperdoll.mjs check <renders> <layers> --anim idle --whole whole2 --wear "..." [--lit in2]
//       the proof: the layers laid over each other against ONE render of the same things together (<side>.<whole>.NN.*),
//       pixel by pixel. --lit in2 takes each part's light from <side>.in2.<part>.NN.things.png (the part as it is lit among
//       the others) in place of the part alone: with it the two must be the same to the pixel
//   node scripts/art/paperdoll.mjs godot <layers> <work> --anim idle --wear "..." [--colours "..."] [--method forward_plus|mobile|gl_compatibility]
//       the same in Godot itself: the small project in paperdoll_check/ draws the layers through doll.gdshader (the nearer
//       pixel wins, colours filled in) and shadow.gdshader, and compares every frame with what `wear` makes: PASS or FAIL.
//       It draws, so it needs a screen: on Linux with none it runs under xvfb-run. <work> holds art: never in the repo
//   node scripts/art/paperdoll.mjs pack <layers> <folder> --anim idle --outfits "label|slot=part,...|hair=rock,dye=straw;label|..."
//       the same check as a folder that runs on its own, to try on another machine (its own renderer, its own card): the
//       Godot project, the layers of those outfits and the pictures they must give. It shows the outfits side by side,
//       moving, with the result under each, and prints it. <folder> holds art: never in the repo
//   node scripts/art/paperdoll.mjs orders <layers> --anim idle --wear "..."
//       how many pixels each way of laying the layers gets wrong, against the nearest-wins truth: one order for the whole
//       animation, the best order frame by frame, and both again with the parts cut by a dressed body beforehand
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from './png.mjs';
import { RAMP, OUTLINE, PART_LINE, TUCK } from './style.mjs';
import { finishParts, finishShadow, smallThings } from './finish_sprite.mjs';
import { load as wardrobe, rules as raceRules } from './wardrobe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), FRAMES = 15;
const nn = k => String(k).padStart(2, '0');
export const loadRules = (race = 'human') => raceRules(wardrobe(), race);

/** One picture of one part (or of a whole character rendered in one go), finished into a layer picture.
 *  base: <renders>/<anim>/<side>.<view>.NN ; opt.lit: another base whose .things.png gives the light. */
/** character.py --super: the lit picture K times as fine (<base>.thingsS.png, with <base>.idsS.png). Each pixel of the
 *  1x picture takes the mean of the small pixels under it that show ITS material (from the 1x ids), so no colour leaks
 *  across a part's edge and the layers still stack exactly; a pixel none of whose small pixels show it keeps its own.
 *  Gives the lit picture to finish with, or null when there is no fine one. */
export function fineLight(base, key) {
  if (!existsSync(`${base}.thingsS.png`) || !existsSync(`${base}.idsS.png`)) return null;
  const big = readPng(`${base}.thingsS.png`), bigIds = readPng(`${base}.idsS.png`), lit = readPng(`${base}.things.png`), ids = readPng(`${base}.ids.png`);
  const k = Math.round(big.width / lit.width), names = Object.keys(key), cols = names.map(n => key[n]);
  const which = (p, i) => { if (p.data[i * 4 + 3] < 128) return -1; let best = 60, bi = -1;
    cols.forEach((cs, m) => cs.forEach(c => { const d = Math.abs(p.data[i * 4] - c[0]) + Math.abs(p.data[i * 4 + 1] - c[1]) + Math.abs(p.data[i * 4 + 2] - c[2]); if (d < best) { best = d; bi = m; } })); return bi; };
  const out = Buffer.from(lit.data), W = lit.width;
  for (let y = 0; y < lit.height; y++) for (let x = 0; x < W; x++) { const i = y * W + x, m = which(ids, i); if (m < 0) continue; let r = 0, g = 0, b = 0, n = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const j = (y * k + dy) * big.width + x * k + dx; if (big.data[j * 4 + 3] < 128 || which(bigIds, j) !== m) continue; r += big.data[j * 4]; g += big.data[j * 4 + 1]; b += big.data[j * 4 + 2]; n++; }
    if (n) out.set([Math.round(r / n), Math.round(g / n), Math.round(b / n), 255], i * 4); }
  return { data: out, width: W, height: lit.height };
}
export function finishLayer(base, rules, opt = {}) {
  const depth = readPng(`${base}.depth.png`), key = JSON.parse(readFileSync(`${base}.ids.json`, 'utf8'));
  let ids = readPng(`${base}.ids.png`); if (existsSync(`${base}.ids4.png`)) ids = smallThings(ids, readPng(`${base}.ids4.png`), key);     // character.py --mask: eyes, fangs, claws
  const f = finishParts((!opt.lit && fineLight(base, key)) || readPng(`${opt.lit || base}.things.png`), readPng(`${base}.colour.png`), ids, key, rules.materials, 0.06, { there: depth, smooth: false });   // every pixel by itself: no look at its neighbours
  const out = Buffer.alloc(depth.data.length); let n = 0;
  for (let i = 0; i < depth.width * depth.height; i++) { if (depth.data[i * 4 + 3] < 128) continue;
    const ch = rules.ramps.indexOf(f.rampAt[i]); if (ch < 0) throw new Error(`${base}: ramp ${f.rampAt[i]} is not in the rules' ramps`);
    out.set([ch * 16 + f.toneAt[i], depth.data[i * 4], depth.data[i * 4 + 1], 255], i * 4); n++; }
  return { data: out, width: depth.width, height: depth.height, n };
}

/** What a character wears, as the rules allow it: wear is { slot: part }. A slot left empty shows the race's own body
 *  there if it has one; a worn part that hides other slots (a helmet hides hair) empties them. Returns the parts, in slot order. */
export function outfit(rules, wear) {
  const on = { ...rules.body, ...wear };
  for (const [slot, part] of Object.entries(wear)) { const p = rules.parts[part]; if (!p) throw new Error(`no part named ${part}`);
    if (p.slot !== slot) throw new Error(`${part} goes in ${p.slot}, not ${slot}`); }
  for (const part of Object.values({ ...on })) for (const slot of rules.parts[part].hides || []) delete on[slot];
  return rules.slots.filter(s => on[s]).map(s => on[s]);
}

/** The colours a character is drawn with: for every channel its tones. pick is { skin: 'skin', hair: 'rock', dye: 'straw' }:
 *  a channel the rules tie to one of those takes that ramp, tone for tone (stretched if the ramps differ in length). */
export function palette(rules, pick = {}) {
  return rules.ramps.map(r => { const from = rules.channels[r], to = (from && pick[from]) || r, n = RAMP[r].length, m = RAMP[to].length;
    if (from && pick[from] && !(rules.colours[from] || []).includes(to)) throw new Error(`${to} is not one of the rules' colours for ${from}`);
    return RAMP[r].map((_, t) => RAMP[to][n === 1 ? 0 : Math.round(t * (m - 1) / (n - 1))]); });
}
const far = (L, i) => L.data[i * 4 + 1] * 256 + L.data[i * 4 + 2];

/** Lays layers over each other. how 'depth': at each pixel the nearest shows (equally far: the later in the list).
 *  how 'order': the later in the list shows, near or far (plain stacked sprites). Returns a layer picture and who (which layer where). */
export function lay(layers, how = 'depth') {
  const { width, height } = layers[0], out = Buffer.alloc(width * height * 4), who = new Int8Array(width * height).fill(-1);
  for (let i = 0; i < width * height; i++) { let best = -1;
    layers.forEach((L, k) => { if (L.data[i * 4 + 3] && (best < 0 || how === 'order' || far(L, i) <= far(layers[best], i))) best = k; });
    if (best >= 0) { layers[best].data.copy(out, i * 4, i * 4, i * 4 + 4); who[i] = best; } }
  // the tuck (TUCK in style.mjs): a garment worn under, a little in front of one worn over it, gives way to it
  const over = how === 'depth' ? tucks(layers.map(L => L.name)) : [], tucked = new Uint8Array(width * height); let nT = 0;
  if (over.some(Boolean)) for (let i = 0; i < width * height; i++) { const k = who[i]; if (k < 0 || !over[k]) continue; let best = -1;
    layers.forEach((L, j) => { if ((over[k] >> j & 1) && L.data[i * 4 + 3] && far(L, i) - far(layers[k], i) < TUCK.gap && (best < 0 || far(L, i) < far(layers[best], i))) best = j; });
    if (best >= 0) { layers[best].data.copy(out, i * 4, i * 4, i * 4 + 4); who[i] = best; tucked[i] = 1; nT++; } }
  return { data: out, width, height, who, tucked, nTucked: nT };
}
let SLOT_OF = null;
/** For each part laid (by name), a bit mask of the parts laid that go over it (TUCK.pairs, by slot); 0 for none or a
 *  layer with no name. What doll.gdshader takes as `tucks`. */
export function tucks(names) {
  if (!SLOT_OF) SLOT_OF = Object.fromEntries(Object.entries(wardrobe().parts).filter(([, p]) => p && typeof p === 'object').map(([k, p]) => [k, p.slot]));
  return names.map(n => { const ov = TUCK.pairs[SLOT_OF[n]] || []; return names.reduce((m, q, j) => (q && ov.includes(SLOT_OF[q]) ? m | (1 << j) : m), 0); });
}
/** A layer picture in its colours: an ordinary sprite. pal: one palette, or one per layer laid (a list of palettes), each
 *  pixel then painted with the palette of the layer it came from (L.who, from lay). */
export function paint(L, pal) {
  const out = Buffer.alloc(L.data.length), each = Array.isArray(pal[0]?.[0]?.[0]);
  for (let i = 0; i < L.width * L.height; i++) if (L.data[i * 4 + 3]) { const P = each ? pal[L.who[i]] : pal, c = P[L.data[i * 4] >> 4][L.data[i * 4] & 15]; out.set([c[0], c[1], c[2], 255], i * 4); }
  return { data: out, width: L.width, height: L.height };
}
/** The palettes of the parts worn, one each. pick as palette's; a key "<slot>.<channel>" (main_hand.metal=bronze) is for the
 *  part in that slot only: the item's own metal (Michael, 2026-11-23: "Every metal zone ... takes the item's material ramp"). */
export function palettes(rules, parts, pick = {}) {
  const all = Object.fromEntries(Object.entries(pick).filter(([k]) => !k.includes('.')));
  return parts.map(p => { const slot = rules.parts[p].slot, own = Object.fromEntries(Object.entries(pick).filter(([k]) => k.startsWith(slot + '.')).map(([k, v]) => [k.slice(slot.length + 1), v]));
    return palette(rules, { ...all, ...own }); });
}
/** A painted character with its outline: every empty pixel that touches the figure (up, down, left or right) takes the
 *  outline's colour. What doll.gdshader does when it draws; the sprites and the layer pictures hold no outline. */
export function outline(p, colour = OUTLINE.colour) {
  const { width: W, height: H } = p, out = Buffer.from(p.data), on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && p.data[(y * W + x) * 4 + 3] > 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) out.set([colour[0], colour[1], colour[2], 255], (y * W + x) * 4);
  return { data: out, width: W, height: H };
}
/** The part line (PART_LINE in style.mjs): where a layer that is lined (a helm, a breastplate, pauldrons) shows in front of
 *  another layer, the pixel of the one behind next to it (up, down, left, right) takes the colour, when it is more than gap
 *  depth steps farther. p: the painted picture; laid: what lay gave (its depth and who); lined: per layer laid, true or not.
 *  What doll.gdshader does with `lined` and `line_gap`. */
export function partLine(p, laid, lined, colour = OUTLINE.colour, gap = PART_LINE.gap) {
  const { width: W, height: H } = laid, out = Buffer.from(p.data), who = laid.who;
  for (let i = 0; i < W * H; i++) { const k = who[i]; if (k < 0 || !lined[k]) continue; const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X;
      if (who[j] >= 0 && who[j] !== k && far(laid, j) - far(laid, i) > gap) out.set([colour[0], colour[1], colour[2], 255], j * 4); } }
  return { data: out, width: W, height: H };
}
/** Which of the parts worn are lined (their slot is one of PART_LINE's). */
export const linedParts = (rules, parts) => parts.map(q => PART_LINE.slots.includes(rules.parts[q].slot));
/** The parts' ground shadows as one: at each pixel the darkest (a shadow under a shadow is no darker). */
export function shade(shadows) {
  const out = Buffer.alloc(shadows[0].data.length);
  for (const s of shadows) for (let i = 3; i < out.length; i += 4) out[i] = Math.max(out[i], s.data[i]);
  return { data: out, width: shadows[0].width, height: shadows[0].height };
}

/** How many pixels each way of stacking gets wrong over an animation. frames: per frame, the layers (same order each time).
 *  truth = the nearest shows. cut(k) (optional) names layers that are cut out of layer k beforehand wherever they are nearer
 *  (a "holdout"). Gives { seen, one: {order, wrong}, perFrame: {wrong, orders, worst} }: one order for all frames, and the best order for each frame. */
export function orders(frames, cut = null) {
  const n = frames[0].length, perms = []; const go = (a, rest) => rest.length ? rest.forEach((r, k) => go([...a, r], rest.filter((_, j) => j !== k))) : perms.push(a); go([], [...Array(n).keys()]);
  const hists = frames.map(layers => { const h = new Map(); const N = layers[0].width * layers[0].height;
    for (let i = 0; i < N; i++) { let mask = 0, truth = -1;
      for (let k = 0; k < n; k++) if (layers[k].data[i * 4 + 3] && (truth < 0 || far(layers[k], i) <= far(layers[truth], i))) truth = k;
      if (truth < 0) continue;
      for (let k = 0; k < n; k++) { if (!layers[k].data[i * 4 + 3]) continue;
        if (cut && cut(k).some(c => c !== k && layers[c].data[i * 4 + 3] && far(layers[c], i) < far(layers[k], i))) continue; mask |= 1 << k; }
      const key = mask * 16 + truth; h.set(key, (h.get(key) || 0) + 1); }
    return h; });
  const wrongs = (h, order) => { const rank = []; order.forEach((k, r) => rank[k] = r); let w = 0;
    for (const [key, c] of h) { const mask = Math.floor(key / 16), truth = key % 16; let top = -1; for (let k = 0; k < n; k++) if (mask >> k & 1 && (top < 0 || rank[k] > rank[top])) top = k; if (top !== truth) w += c; } return w; };
  const best = h => { let b = null; for (const p of perms) { const w = wrongs(h, p); if (!b || w < b.wrong) b = { order: p, wrong: w }; } return b; };
  const all = new Map(); let seen = 0; for (const h of hists) for (const [k, c] of h) { all.set(k, (all.get(k) || 0) + c); seen += c; }
  const each = hists.map(best);
  return { seen, one: best(all), perFrame: { wrong: each.reduce((s, b) => s + b.wrong, 0), worst: Math.max(...each.map(b => b.wrong)), orders: each.map(b => b.order) } };
}

/** The layers of one frame of what is worn: [{ name, data, width, height }] in slot order. */
/** A part's layer picture (suffix '.png') or its shadow ('.shadow.png') in one animation, side and frame. A variant of an
 *  animation ("guard+shield": the arm that carries a shield, held up) holds only the parts it changes (the shield and
 *  what covers that arm); every other part is the plain animation's ("guard"). */
export function layerFile(dir, part, anim, side, k, suffix = '.png') {
  const f = `${dir}/${part}/${anim}.${side}.${nn(k)}${suffix}`;
  return !anim.includes('+') || existsSync(f) ? f : `${dir}/${part}/${anim.split('+')[0]}.${side}.${nn(k)}${suffix}`;
}
/** With a shield (<anim>+shield), a part that covers the shield arm ("arms") must have its own raised-arm layers: its plain
 *  animation's show that arm down while the shield is up, beside it (Michael, 2026-11-24, "shield looks not aligned"). */
export function armsReady(dir, rules, parts, anim, side) {
  if (!anim.includes('+')) return;
  const lack = parts.filter(p => rules.parts[p]?.arms && !existsSync(`${dir}/${p}/${anim}.${side}.00.png`));
  if (lack.length) throw new Error(`${lack.join(', ')}: no ${anim} ${side} layers (the arm that carries the shield, raised). Render them: node scripts/art/intake.mjs <a shield> --race ${rules.race} --anims ${anim.split('+')[0]} --sides ${side}`);
}
export function frameLayers(dir, parts, anim, side, k) { return parts.map(p => ({ name: p, ...readPng(layerFile(dir, p, anim, side, k)) })); }

/** The proof: the layers of `parts` laid over each other against ONE render of the same things together
 *  (<renders>/<anim>/<side>.<whole>.NN.*), pixel by pixel, over the frames. litFrom: see `check` at the top.
 *  Gives { px, part (another surface shows), tone (the right surface, another colour), worst, shadow }. */
export function against(renders, dir, rules, parts, anim, side, whole, litFrom = null, frames = [...Array(FRAMES).keys()]) {
  const pal = palette(rules); let px = 0, part = 0, tone = 0, sh = 0, worst = 0, tk = 0;
  for (const k of frames) { const ref = finishLayer(`${renders}/${anim}/${side}.${whole}.${nn(k)}`, rules);
    const layers = litFrom ? parts.map(p => finishLayer(`${renders}/${anim}/${side}.${p}.${nn(k)}`, rules, { lit: `${renders}/${anim}/${side}.${litFrom}.${p}.${nn(k)}` })) : frameLayers(dir, parts, anim, side, k);
    const got = lay(layers), A = paint(got, pal), B = paint(ref, pal); let p1 = 0, t1 = 0;
    for (let i = 0; i < ref.width * ref.height; i++) { if (ref.data[i * 4 + 3]) px++;
      if (got.tucked[i]) { tk++; continue; }                                                     // tucked (TUCK): the render together shows the garment under
      if (ref.data[i * 4 + 3] !== got.data[i * 4 + 3] || Math.abs(far(ref, i) - far(got, i)) > 1) p1++;   // another surface in front: a part shows that should not (one step of depth, 1/8192 of a tile, is the same surface rounded otherwise in another render)
      else if (A.data.readUInt32BE(i * 4) !== B.data.readUInt32BE(i * 4)) t1++; }                     // the right surface, another colour
    const cast = q => `${renders}/${anim}/${side}.${q}.${nn(k)}.cast.png`;              // a part not rendered here (a variant's plain part): its layer's shadow
    const s1 = shade(parts.map(q => existsSync(cast(q)) ? finishShadow(readPng(cast(q))) : readPng(layerFile(dir, q, anim, side, k, '.shadow.png')))), s0 = finishShadow(readPng(`${renders}/${anim}/${side}.${whole}.${nn(k)}.cast.png`));
    for (let i = 3; i < s0.data.length; i += 4) if (s0.data[i] !== s1.data[i]) sh++;
    part += p1; tone += t1; worst = Math.max(worst, p1 + t1); }
  return { px, part, tone, worst, shadow: sh, tucked: tk };
}

/** Finishes the renders of some parts into layer pictures: <renders>/<anim>/<side>.<part>.NN.* -> <out>/<part>/<anim>.<side>.NN.png
 *  and .shadow.png. Parts with no render there are passed over. Returns how many pictures it made. */
export function makeLayers(renders, out, rules, parts, anims, side) { let made = 0;
  for (const an of anims) for (const part of parts) for (let k = 0; k < FRAMES; k++) { const base = `${renders}/${an}/${side}.${part}.${nn(k)}`; if (!existsSync(`${base}.depth.png`)) continue;
    const L = finishLayer(base, rules), s = finishShadow(readPng(`${base}.cast.png`));
    writePng(`${out}/${part}/${an}.${side}.${nn(k)}.png`, L.data, L.width, L.height); writePng(`${out}/${part}/${an}.${side}.${nn(k)}.shadow.png`, s.data, s.width, s.height); made++; }
  return made;
}

if (process.argv[1] && process.argv[1].endsWith('paperdoll.mjs')) {
  const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; };
  const rules = loadRules(opt('--race') || undefined), side = opt('--side', 'SE'), anim = opt('--anim', 'idle');
  const pairs = t => Object.fromEntries((t || '').split(',').filter(Boolean).map(p => p.split('=').map(s => s.trim())));
  const wear = pairs(opt('--wear')), pick = pairs(opt('--colours')), how = opt('--how', 'depth'), whole = opt('--whole'), only = opt('--parts'), litFrom = opt('--lit'), method = opt('--method'), outfitsSpec = opt('--outfits'), anims = opt('--anims', 'idle,walk').split(',');
  const bare = a.includes('--no-outline'); if (bare) a.splice(a.indexOf('--no-outline'), 1);
  const lined = p => bare ? p : outline(p), CH = 256;     // CH: the colours the shader holds, 16 channels of 16 tones
  // one frame drawn as the game draws it: laid, painted, outlined, part lines (--no-outline: neither)
  const draw = (layers, parts, pal, how = 'depth') => { const L = lay(layers, how), p = lined(paint(L, pal)); return bare ? p : partLine(p, L, linedParts(rules, parts)); };
  const lineMask = parts => bare ? 0 : linedParts(rules, parts).reduce((m, on, k) => on ? m | (1 << k) : m, 0);
  const cmd = a.shift();
  if (cmd === 'layers') { const [renders, out] = a, made = makeLayers(renders, out, rules, only ? only.split(',') : Object.keys(rules.parts), anims, side);
    console.log(`${made} layer pictures (and their shadows) in ${out}`);
  } else if (cmd === 'wear') { const [dir, out] = a, parts = outfit(rules, wear); armsReady(dir, rules, parts, anim, side); const pal = Object.keys(pick).some(k => k.includes('.')) ? palettes(rules, parts, pick) : palette(rules, pick);
    for (let k = 0; k < FRAMES; k++) { const p = draw(frameLayers(dir, parts, anim, side, k), parts, pal, how), s = shade(parts.map(q => readPng(layerFile(dir, q, anim, side, k, '.shadow.png'))));
      writePng(`${out}/${side}.${nn(k)}.png`, p.data, p.width, p.height); writePng(`${out}/${side}.${nn(k)}.shadow.png`, s.data, s.width, s.height); }
    console.log(`${out}: ${parts.join(' + ')}, ${FRAMES} frames of ${anim} ${side}${Object.keys(pick).length ? ', colours ' + JSON.stringify(pick) : ''}${bare ? ', no outline' : ', outlined, part lines'}`);
  } else if (cmd === 'check') { const [renders, dir] = a, parts = outfit(rules, wear), r = against(renders, dir, rules, parts, anim, side, whole, litFrom);
    console.log(`${anim} ${side}, ${parts.join(' + ')} against ${whole}${litFrom ? ` (each part lit as in ${litFrom})` : ''}: ${r.px} pixels in ${FRAMES} frames`);
    console.log(`  ${r.part} show another surface, ${r.tone} the same surface in another colour (worst frame ${r.worst}); the shadow differs in ${r.shadow} pixels`);
    process.exit(r.part + r.tone ? 1 : 0);
  } else if (cmd === 'orders') { const [dir] = a, parts = outfit(rules, wear), frames = [...Array(FRAMES).keys()].map(k => frameLayers(dir, parts, anim, side, k));
    const dressed = rules.dressed.map(p => parts.indexOf(p)).filter(k => k >= 0), slot = k => rules.parts[parts[k]].slot;
    const plain = orders(frames), held = orders(frames, k => dressed.filter(c => slot(c) !== slot(k)));
    const say = (t, o) => console.log(`  ${t}: one order for the animation ${o.one.wrong} wrong (${o.one.order.map(k => parts[k]).join(' < ')}); the best order each frame ${o.perFrame.wrong} wrong, worst frame ${o.perFrame.worst}`);
    console.log(`${anim} ${side}, ${parts.join(' + ')}: ${plain.seen} pixels in ${FRAMES} frames; nearest-wins 0 wrong`);
    say('parts whole', plain); say('parts cut by the dressed body', held);
  } else if (cmd === 'godot') { const [dir, work] = a, parts = outfit(rules, wear), pal = palette(rules, pick), jobs = []; armsReady(dir, rules, parts, anim, side);
    const colours = Array.from({ length: CH }, (_, i) => (pal[i >> 4] || [])[i & 15] || [0, 0, 0]);
    for (let k = 0; k < FRAMES; k++) { const p = draw(frameLayers(dir, parts, anim, side, k), parts, pal), s = shade(parts.map(q => readPng(layerFile(dir, q, anim, side, k, '.shadow.png'))));
      writePng(`${work}/${side}.${nn(k)}.png`, p.data, p.width, p.height); writePng(`${work}/${side}.${nn(k)}.shadow.png`, s.data, s.width, s.height);
      jobs.push({ outfit: parts.join(' + '), name: `${anim} ${side} frame ${k}`, colours, outline: bare ? null : OUTLINE.colour, lined: lineMask(parts), line_gap: PART_LINE.gap, tucks: tucks(parts), tuck_gap: TUCK.gap, want: resolve(work, `${side}.${nn(k)}.png`), want_shadow: resolve(work, `${side}.${nn(k)}.shadow.png`),
        layers: parts.map(q => resolve(layerFile(dir, q, anim, side, k))), shadows: parts.map(q => resolve(layerFile(dir, q, anim, side, k, '.shadow.png'))) }); }
    const file = resolve(work, 'godot_check.json'); writeFileSync(file, JSON.stringify({ jobs }));
    const godot = [join(HERE, '..', 'godot.sh'), '--path', join(HERE, 'paperdoll_check'), ...(method ? ['--rendering-method', method] : []), '--', file];
    const noScreen = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
    const r = noScreen ? spawnSync('xvfb-run', ['-a', ...godot], { encoding: 'utf8' }) : spawnSync(godot[0], godot.slice(1), { encoding: 'utf8' });
    if (r.error) { console.error(noScreen ? 'No screen and no xvfb-run: Godot cannot draw here.' : String(r.error)); process.exit(1); }
    const lines = r.stdout.split('\n'), seen = lines.map(l => l.match(/: (\d+) of (\d+) drawn pixels differ; shadow: (\d+) of (\d+)$/)).filter(Boolean), sum = c => seen.reduce((s, m) => s + +m[c], 0);
    console.log(lines.find(l => l.startsWith('renderer:')) || 'renderer: not told');
    console.log(`${parts.join(' + ')}${Object.keys(pick).length ? ', colours ' + JSON.stringify(pick) : ''}: ${seen.length} of ${FRAMES} frames drawn by Godot; ${sum(1)} of ${sum(2)} pixels differ from paperdoll.mjs; shadow ${sum(3)} of ${sum(4)}`);
    const pass = r.status === 0 && seen.length === FRAMES && lines.includes('PASS');
    if (!pass) console.error((r.stdout + r.stderr).split('\n').filter(l => /error|SHADER|FAIL/i.test(l)).slice(0, 12).join('\n'));
    console.log(pass ? 'PASS' : 'FAIL'); process.exit(pass ? 0 : 1);
  } else if (cmd === 'pack') { const [dir, out] = a, jobs = [], put = (from, to) => { mkdirSync(dirname(join(out, to)), { recursive: true }); copyFileSync(from, join(out, to)); };
    (outfitsSpec || '').split(';').filter(Boolean).forEach((spec, n) => { const [label, wearText, pickText] = spec.split('|').map(s => s.trim()), parts = outfit(rules, pairs(wearText)), pal = palette(rules, pairs(pickText)); armsReady(dir, rules, parts, anim, side);
      const colours = Array.from({ length: CH }, (_, i) => (pal[i >> 4] || [])[i & 15] || [0, 0, 0]);
      for (let k = 0; k < FRAMES; k++) { const f = `${anim}.${side}.${nn(k)}`, p = draw(frameLayers(dir, parts, anim, side, k), parts, pal), s = shade(parts.map(q => readPng(layerFile(dir, q, anim, side, k, '.shadow.png'))));
        writePng(join(out, 'data', 'want', String(n), `${f}.png`), p.data, p.width, p.height); writePng(join(out, 'data', 'want', String(n), `${f}.shadow.png`), s.data, s.width, s.height);
        for (const q of parts) for (const e of ['.png', '.shadow.png']) put(layerFile(dir, q, anim, side, k, e), `data/layers/${q}/${f}${e}`);
        jobs.push({ outfit: label, name: `${label}, frame ${k}`, colours, outline: bare ? null : OUTLINE.colour, lined: lineMask(parts), line_gap: PART_LINE.gap, tucks: tucks(parts), tuck_gap: TUCK.gap, want: `res://data/want/${n}/${f}.png`, want_shadow: `res://data/want/${n}/${f}.shadow.png`,
          layers: parts.map(q => `res://data/layers/${q}/${f}.png`), shadows: parts.map(q => `res://data/layers/${q}/${f}.shadow.png`) }); } });
    if (!jobs.length) { console.error('pack: name the outfits: --outfits "label|slot=part,slot=part|hair=rock,dye=straw;label|..."'); process.exit(1); }
    writeFileSync(join(out, 'data', 'jobs.json'), JSON.stringify({ jobs })); writeFileSync(join(out, 'data', '.gdignore'), '');
    for (const f of ['project.godot', 'main.tscn', 'main.gd', 'doll.gdshader', 'shadow.gdshader']) put(join(HERE, 'paperdoll_check', f), f);
    writeFileSync(join(out, 'README.txt'), ['Renown: layered characters drawn by the depth shader, a check to run on your own machine.', '',
      'Run it with Godot 4.7 (from the repo: scripts/godot.sh --path <this folder>), or open project.godot in the editor and press F5.',
      'It draws every frame of each outfit from its layer pictures (data/layers) through doll.gdshader and shadow.gdshader,',
      'compares it pixel for pixel with the picture made outside Godot (data/want), prints the result in the terminal,',
      'and shows the outfits side by side with the result under each. The first line printed names the renderer in use.',
      'Add "-- --once" to quit after the check. Add "--rendering-method gl_compatibility" to try the OpenGL renderer.', '',
      'The pictures are made from model files: do not put this folder in the repo.', ''].join('\n'));
    console.log(`${out}: ${jobs.length / FRAMES} outfits, ${jobs.length} frames of ${anim} ${side}, with the Godot project. Run: scripts/godot.sh --path ${out}`);
  } else { console.error('node scripts/art/paperdoll.mjs layers|wear|check|orders|godot|pack ... (see the top of the file)'); process.exit(1); }
}
