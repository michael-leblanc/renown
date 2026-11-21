// A character in layers: every part (a body, a top, hair, a sword) is rendered alone by character.py --view, finished here
// into a layer picture, and the layers of what a character wears are laid over each other when it is drawn.
// A layer pixel holds no colour of its own: it says WHICH RAMP (a "channel": skin, hair, cloth...) and WHICH TONE of it,
// so a colour is swapped when the character is drawn, with no new render; and HOW FAR the surface is from the camera, so
// of two layers the nearer one shows, pixel by pixel, whatever is worn with whatever.
//   layer picture (RGBA): red = channel * 16 + tone (the channel's place in the rules' "ramps"), green and blue = how far
//   (65536 steps over 8 tiles, high byte then low), alpha 255 where the part is. Its ground shadow is a second picture.
// The rules (which slots a race has, what each part is, which colours may be swapped): scripts/art/paperdoll/human.json
//   node scripts/art/paperdoll.mjs layers <renders> <out> [--rules file] [--anims idle,walk] [--side SE]
//       <renders>/<anim>/<side>.<part>.NN.* from character.py  ->  <out>/<part>/<anim>.<side>.NN.png and .shadow.png
//   node scripts/art/paperdoll.mjs wear <layers> <out> --anim idle --wear "hair=parted,top=peasant,main_hand=sword"
//                                       [--colours "hair=rock,dye=straw"] [--how depth|order] [--side SE] [--rules file]
//       one character: <out>/<side>.NN.png and .shadow.png, as finish_sprite.mjs writes a whole one. --how order lays the
//       slots in the rules' order instead (what the game does today), to see what that gets wrong
//   node scripts/art/paperdoll.mjs check <renders> <layers> --anim idle --whole whole2 --wear "..." [--lit in2]
//       the proof: the layers laid over each other against ONE render of the same things together (<side>.<whole>.NN.*),
//       pixel by pixel. --lit in2 takes each part's light from <side>.in2.<part>.NN.things.png (the part as it is lit among
//       the others) in place of the part alone: with it the two must be the same to the pixel
//   node scripts/art/paperdoll.mjs orders <layers> --anim idle --wear "..."
//       how many pixels each way of laying the layers gets wrong, against the nearest-wins truth: one order for the whole
//       animation, the best order frame by frame, and both again with the parts cut by a dressed body beforehand
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from './png.mjs';
import { RAMP } from './style.mjs';
import { finishParts, finishShadow } from './finish_sprite.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), FRAMES = 15;
const nn = k => String(k).padStart(2, '0');
export const loadRules = (path = join(HERE, 'paperdoll', 'human.json')) => JSON.parse(readFileSync(path, 'utf8'));

/** One picture of one part (or of a whole character rendered in one go), finished into a layer picture.
 *  base: <renders>/<anim>/<side>.<view>.NN ; opt.lit: another base whose .things.png gives the light. */
export function finishLayer(base, rules, opt = {}) {
  const depth = readPng(`${base}.depth.png`), key = JSON.parse(readFileSync(`${base}.ids.json`, 'utf8'));
  const f = finishParts(readPng(`${opt.lit || base}.things.png`), readPng(`${base}.colour.png`), readPng(`${base}.ids.png`), key, rules.materials, 0.06, { there: depth, smooth: false });   // every pixel by itself: no look at its neighbours
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
  return { data: out, width, height, who };
}
/** A layer picture in its colours: an ordinary sprite. */
export function paint(L, pal) {
  const out = Buffer.alloc(L.data.length);
  for (let i = 0; i < L.width * L.height; i++) if (L.data[i * 4 + 3]) { const c = pal[L.data[i * 4] >> 4][L.data[i * 4] & 15]; out.set([c[0], c[1], c[2], 255], i * 4); }
  return { data: out, width: L.width, height: L.height };
}
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
export function frameLayers(dir, parts, anim, side, k) { return parts.map(p => ({ name: p, ...readPng(`${dir}/${p}/${anim}.${side}.${nn(k)}.png`) })); }

if (process.argv[1] && process.argv[1].endsWith('paperdoll.mjs')) {
  const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; };
  const rules = loadRules(opt('--rules') || undefined), side = opt('--side', 'SE'), anim = opt('--anim', 'idle');
  const pairs = t => Object.fromEntries((t || '').split(',').filter(Boolean).map(p => p.split('=').map(s => s.trim())));
  const wear = pairs(opt('--wear')), pick = pairs(opt('--colours')), how = opt('--how', 'depth'), whole = opt('--whole'), litFrom = opt('--lit'), anims = opt('--anims', 'idle,walk').split(',');
  const cmd = a.shift();
  if (cmd === 'layers') { const [renders, out] = a; let made = 0;
    for (const an of anims) for (const part of Object.keys(rules.parts)) for (let k = 0; k < FRAMES; k++) { const base = `${renders}/${an}/${side}.${part}.${nn(k)}`; if (!existsSync(`${base}.depth.png`)) continue;
      const L = finishLayer(base, rules), s = finishShadow(readPng(`${base}.cast.png`));
      writePng(`${out}/${part}/${an}.${side}.${nn(k)}.png`, L.data, L.width, L.height); writePng(`${out}/${part}/${an}.${side}.${nn(k)}.shadow.png`, s.data, s.width, s.height); made++; }
    console.log(`${made} layer pictures (and their shadows) in ${out}`);
  } else if (cmd === 'wear') { const [dir, out] = a, parts = outfit(rules, wear), pal = palette(rules, pick);
    for (let k = 0; k < FRAMES; k++) { const p = paint(lay(frameLayers(dir, parts, anim, side, k), how), pal), s = shade(parts.map(q => readPng(`${dir}/${q}/${anim}.${side}.${nn(k)}.shadow.png`)));
      writePng(`${out}/${side}.${nn(k)}.png`, p.data, p.width, p.height); writePng(`${out}/${side}.${nn(k)}.shadow.png`, s.data, s.width, s.height); }
    console.log(`${out}: ${parts.join(' + ')}, ${FRAMES} frames of ${anim} ${side}${Object.keys(pick).length ? ', colours ' + JSON.stringify(pick) : ''}`);
  } else if (cmd === 'check') { const [renders, dir] = a, parts = outfit(rules, wear), pal = palette(rules); let px = 0, part = 0, tone = 0, sh = 0, worst = 0;
    for (let k = 0; k < FRAMES; k++) { const ref = finishLayer(`${renders}/${anim}/${side}.${whole}.${nn(k)}`, rules);
      const layers = litFrom ? parts.map(p => finishLayer(`${renders}/${anim}/${side}.${p}.${nn(k)}`, rules, { lit: `${renders}/${anim}/${side}.${litFrom}.${p}.${nn(k)}` })) : frameLayers(dir, parts, anim, side, k);
      const got = lay(layers), A = paint(got, pal), B = paint(ref, pal); let p1 = 0, t1 = 0;
      for (let i = 0; i < ref.width * ref.height; i++) { if (ref.data[i * 4 + 3]) px++;
        if (ref.data[i * 4 + 3] !== got.data[i * 4 + 3] || far(ref, i) !== far(got, i)) p1++;          // another surface in front: a part shows that should not
        else if (A.data.readUInt32BE(i * 4) !== B.data.readUInt32BE(i * 4)) t1++; }                     // the right surface, another colour
      const s1 = shade(parts.map(q => finishShadow(readPng(`${renders}/${anim}/${side}.${q}.${nn(k)}.cast.png`)))), s0 = finishShadow(readPng(`${renders}/${anim}/${side}.${whole}.${nn(k)}.cast.png`));
      for (let i = 3; i < s0.data.length; i += 4) if (s0.data[i] !== s1.data[i]) sh++;
      part += p1; tone += t1; worst = Math.max(worst, p1 + t1); }
    console.log(`${anim} ${side}, ${parts.join(' + ')} against ${whole}${litFrom ? ` (each part lit as in ${litFrom})` : ''}: ${px} pixels in ${FRAMES} frames`);
    console.log(`  ${part} show another surface, ${tone} the same surface in another colour (worst frame ${worst}); the shadow differs in ${sh} pixels`);
    process.exit(part + tone ? 1 : 0);
  } else if (cmd === 'orders') { const [dir] = a, parts = outfit(rules, wear), frames = [...Array(FRAMES).keys()].map(k => frameLayers(dir, parts, anim, side, k));
    const dressed = rules.dressed.map(p => parts.indexOf(p)).filter(k => k >= 0), slot = k => rules.parts[parts[k]].slot;
    const plain = orders(frames), held = orders(frames, k => dressed.filter(c => slot(c) !== slot(k)));
    const say = (t, o) => console.log(`  ${t}: one order for the animation ${o.one.wrong} wrong (${o.one.order.map(k => parts[k]).join(' < ')}); the best order each frame ${o.perFrame.wrong} wrong, worst frame ${o.perFrame.worst}`);
    console.log(`${anim} ${side}, ${parts.join(' + ')}: ${plain.seen} pixels in ${FRAMES} frames; nearest-wins 0 wrong`);
    say('parts whole', plain); say('parts cut by the dressed body', held);
  } else { console.error('node scripts/art/paperdoll.mjs layers|wear|check|orders ... (see the top of the file)'); process.exit(1); }
}
