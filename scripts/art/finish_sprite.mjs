// Finishes a Blender picture the way the kit finishes a prop: a hard edge (a pixel is there or it is not), every pixel
// snapped to a colour of the shared ramps (style.mjs, nearest in OKLab), and the ground shadow as its own
// black sprite. A character's shadow fades toward its tip and carries its own alpha (190 to 120, as the pack's pots');
// a shadow pass with no fade gives a solid sprite, which is drawn at the official sun's alpha.
//   node scripts/art/finish_sprite.mjs <things.png> <cast.png> <out base> [--ramps all|none|a,b,...]
//     things.png, cast.png: what blender_style.py's render_with_shadow writes (things_out, shadow_out); character.py names them so
//     writes <out base>.png and <out base>.shadow.png, and prints the sprite's size and which ramps it took
//     --ramps: the later ramps (EXTRA in style.mjs) the picture may snap to; all by default
//   node scripts/art/finish_sprite.mjs <things.png> <cast.png> <out base> --materials "MI_Peasant=cloth+hide+iron;MI_Hair_1=hair"
//     a character: each material snaps only to the ramps named for it, so a shirt is never part stone, part iron.
//     Needs character.py's <base>.colour.png, .ids.png and .ids.json beside <base>.things.png. Where a material has
//     several ramps (one texture for shirt, boots and buckle), the pixel's own unlit colour picks the ramp; its lit
//     colour then picks the tone. A material not named falls back to every ramp.
//     Small things painted into a material's texture (character.py --mask) are named "G_MatUp:eyes=eye_yellow"; with
//     <base>.ids4.png beside the others, a pixel goes to a small thing that covers a quarter of it (smallThings below).
import { readFileSync, existsSync } from 'fs';
import { readPng, writePng } from './png.mjs';
import { RAMP, EXTRA, PALETTE, PAL_AT, OFFICIAL_SUN, TONE_FROM, TOP_TONE, snapper, oklab } from './style.mjs';

/** Finishes one picture: { data, width, height } RGBA in, the same out with a hard edge and the ramps' colours.
 *  Also gives box (left, top, right, bottom of what is there), ramps (pixels per ramp) and far (pixels whose own colour
 *  was further than `farAt` from every ramp, in OKLab: a sign the ramps lack that colour). */
export function finish(p, used = new Set(EXTRA), farAt = 0.06) {
  const snap = snapper(used), out = Buffer.alloc(p.data.length), ramps = {}, box = [1e9, 1e9, -1, -1]; let far = 0, n = 0;
  for (let i = 0; i < p.width * p.height; i++) {
    if (p.data[i * 4 + 3] < 128) continue;
    const c = [p.data[i * 4], p.data[i * 4 + 1], p.data[i * 4 + 2]], k = snap(c), q = PALETTE[k], x = i % p.width, y = (i / p.width) | 0;
    out.set([q[0], q[1], q[2], 255], i * 4); n++;
    ramps[PAL_AT[k][0]] = (ramps[PAL_AT[k][0]] || 0) + 1;
    const a = oklab(c), b = oklab(q); if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > farAt) far++;
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
  }
  return { data: out, width: p.width, height: p.height, box, ramps, far, n };
}
/** Finishes a character: lit, colour, ids are character.py's pictures (things, colour, ids), key its ids.json
 *  (material name -> the id colours), parts { material: [ramp names] }. A pixel's material comes from ids; where the
 *  material has several ramps, the ramp is the one whose nearest colour to the pixel's unlit colour is nearest (by how strong
 *  the colour is for its lightness, lightness itself counting a quarter, so a pale buckle is iron and a dark cuff is not), smoothed over 3 by 3 so no pixel stands alone; the tone
 *  is the ramp's nearest to the lit colour. Gives the same things as finish, and parts (pixels per material and ramp).
 *  For a character in layers (paperdoll.mjs), opt.there is a picture whose alpha says where the part is (character.py's
 *  depth picture: each pixel's middle), in place of the lit picture's own alpha; and the result also holds rampAt (each
 *  pixel's ramp name) and toneAt (its tone's place in that ramp), which is what lets a colour be swapped when it is drawn. */
export function finishParts(lit, colour, ids, key, parts, farAt = 0.06, opt = {}) {
  const W = lit.width, H = lit.height, out = Buffer.alloc(lit.data.length), ramps = {}, counts = {}, box = [1e9, 1e9, -1, -1]; let far = 0, n = 0;
  const names = Object.keys(key), idOf = (i) => { if (ids.data[i * 4 + 3] < 128) return -1;
    let best = 60, bi = -1; names.forEach((nm, k) => key[nm].forEach(c => { const d = Math.abs(ids.data[i * 4] - c[0]) + Math.abs(ids.data[i * 4 + 1] - c[1]) + Math.abs(ids.data[i * 4 + 2] - c[2]); if (d < best) { best = d; bi = k; } })); return bi; };
  const there = opt.there ? i => opt.there.data[i * 4 + 3] >= 128 : i => lit.data[i * 4 + 3] >= 128, mat = new Int16Array(W * H).fill(-1);
  const toneAt = new Uint8Array(W * H), litAt = i => { if (lit.data[i * 4 + 3]) return i;       // a pixel the lit picture just missed: its nearest lit neighbour
    let best = 1e9, bj = i; const x = i % W, y = (i / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (lit.data[j * 4 + 3] >= 128 && dx * dx + dy * dy < best) { best = dx * dx + dy * dy; bj = j; } }
    return bj; };
  for (let i = 0; i < W * H; i++) if (there(i)) mat[i] = idOf(i);
  // an edge pixel the id picture missed takes the material of the nearest pixel that has one
  for (let i = 0; i < W * H; i++) if (there(i) && mat[i] < 0) { let best = 1e9; const x = i % W, y = (i / W) | 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X, m = idOf(j); if (m >= 0 && dx * dx + dy * dy < best) { best = dx * dx + dy * dy; mat[i] = m; } } }
  // how strong a colour is for its lightness: a dark brown and a dark grey are near in OKLab and far here
  const sat = q => [q[0], q[1] / Math.max(q[0], 0.15), q[2] / Math.max(q[0], 0.15)];
  const labs = Object.fromEntries(Object.entries(RAMP).map(([r, cs]) => [r, cs.map(oklab)])), all = Object.keys(RAMP);
  const sats = Object.fromEntries(Object.entries(labs).map(([r, ls]) => [r, ls.map(sat)]));
  const rampsOf = m => (m >= 0 && parts[names[m]]) || all, rgb = (p, i) => [p.data[i * 4], p.data[i * 4 + 1], p.data[i * 4 + 2]];
  const pick = new Array(W * H).fill(null);
  for (let i = 0; i < W * H; i++) { if (!there(i)) continue; const rs = rampsOf(mat[i]); if (rs.length === 1) { pick[i] = rs[0]; continue; }
    const q = oklab(colour.data[i * 4 + 3] >= 128 ? rgb(colour, i) : rgb(lit, litAt(i))), s = sat(q); let best = 1e9;
    for (const r of rs) for (const p of sats[r]) { const d = (0.25 * (p[0] - q[0])) ** 2 + (p[1] - s[1]) ** 2 + (p[2] - s[2]) ** 2; if (d < best) { best = d; pick[i] = r; } } }
  const smooth = pick.slice();
  if (opt.smooth !== false) for (let i = 0; i < W * H; i++) { if (!pick[i] || rampsOf(mat[i]).length === 1) continue; const x = i % W, y = (i / W) | 0, c = {};
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (pick[j] && mat[j] === mat[i]) c[pick[j]] = (c[pick[j]] || 0) + 1; }
    if ((c[pick[i]] || 0) <= 2) smooth[i] = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; }
  for (let i = 0; i < W * H; i++) { if (!there(i)) continue; const r = smooth[i], c = rgb(lit, litAt(i)), q = oklab(c), x = i % W, y = (i / W) | 0; let best = 1e9, t = 0;
    const from = TONE_FROM[r], ls = TOP_TONE[r] ? labs[r].slice(0, -1) : labs[r], L = from ? ls[0][0] + (q[0] - from[0]) / (from[1] - from[0]) * (ls[ls.length - 1][0] - ls[0][0]) : q[0];
    ls.forEach((p, k) => { const d = Math.abs(p[0] - L); if (d < best) { best = d; t = k; } });
    const to = RAMP[r][t]; out.set([to[0], to[1], to[2], 255], i * 4); n++; toneAt[i] = t; if (Math.hypot(ls[t][0] - q[0], ls[t][1] - q[1], ls[t][2] - q[2]) > farAt) far++;
    ramps[r] = (ramps[r] || 0) + 1; const nm = mat[i] >= 0 ? names[mat[i]] : '(none)'; (counts[nm] ||= {})[r] = (counts[nm][r] || 0) + 1;
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
  // TOP_TONE: a ramp's palest tone is kept out of the spread above and given only to the surfaces lit most, in clumps
  const lightOf = new Float32Array(W * H), topOf = i => smooth[i] && TOP_TONE[smooth[i]];
  const notTop = i => mat[i] >= 0 && (TOP_TONE[smooth[i]].except || []).some(z => names[mat[i]].endsWith('_' + z));   // the plate's lighter edge bands: lighter, never the palest
  for (let i = 0; i < W * H; i++) if (there(i) && topOf(i) && !notTop(i)) lightOf[i] = oklab(rgb(lit, litAt(i)))[0];
  const zoneIs = (i, zs) => mat[i] >= 0 && (zs || []).some(z => names[mat[i]].endsWith('_' + z));
  for (let i = 0; i < W * H; i++) { const r = smooth[i], top = topOf(i); if (!top || !there(i)) continue;
    if (zoneIs(i, top.shine) && lightOf[i] >= top.shineLit) { const t = RAMP[r].length - 1, to = RAMP[r][t]; out.set([to[0], to[1], to[2], 255], i * 4); toneAt[i] = t; continue; }   // a plate's top edge
    if (lightOf[i] < top.lit) continue;
    const x = i % W, y = (i / W) | 0; let k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy, j = Y * W + X; if ((dx || dy) && X >= 0 && Y >= 0 && X < W && Y < H && there(j) && smooth[j] === r && lightOf[j] >= top.lit) k++; }
    if (k < top.clump && !(mat[i] >= 0 && (top.always || []).some(z => names[mat[i]].endsWith('_' + z)))) continue;   // a rivet: one or two pixels, kept
    const t = RAMP[r].length - 1, to = RAMP[r][t]; out.set([to[0], to[1], to[2], 255], i * 4); toneAt[i] = t; }
  // a plate's top rim (TOP_TONE rim: depth steps): a pixel of a piece that has a _Shine zone, with nothing of the piece
  // above it or the piece above it that much farther away, takes the palest tone: the plate's upper edge, one pixel thick
  if (opt.there) { const dep = i => opt.there.data[i * 4] * 256 + opt.there.data[i * 4 + 1];
    const rimMat = names.map(nm => { const m = nm.match(/^(.*)_(Metal|Shine)$/); return !!m && names.includes(m[1] + '_Shine'); });
    for (let i = 0; i < W * H; i++) { const top = topOf(i); if (!top || !top.rim || !there(i) || mat[i] < 0 || !rimMat[mat[i]]) continue;
      const up = i - W; if (up >= 0 && there(up) && dep(up) - dep(i) <= top.rim) continue;
      const t = RAMP[smooth[i]].length - 1, to = RAMP[smooth[i]][t]; out.set([to[0], to[1], to[2], 255], i * 4); toneAt[i] = t; }
    // its rivets: the palest tone however lit, with a dark pixel under each so it shows on a pale plate too
    const rivet = names.map(nm => { const m = nm.match(/^(.*)_Rivet$/); return !!m && names.includes(m[1] + '_Shine'); }), set = (i, t) => { const to = RAMP[smooth[i]][t]; out.set([to[0], to[1], to[2], 255], i * 4); toneAt[i] = t; };
    for (let i = 0; i < W * H; i++) { if (!there(i) || mat[i] < 0 || !rivet[mat[i]] || !topOf(i)) continue; set(i, RAMP[smooth[i]].length - 1);
      const dn = i + W; if (dn < W * H && there(dn) && mat[dn] >= 0 && !rivet[mat[dn]] && rimMat[mat[dn]] !== undefined && topOf(dn)) set(dn, 1); } }
  return { data: out, width: W, height: H, box, ramps, far, n, parts: counts, rampAt: smooth, toneAt };
}
/** Small things painted into a material's texture (character.py --mask: eyes, fangs, claws) are often narrower than a
 *  pixel, and a look through each pixel's middle misses them or catches them by chance. ids4 is the ids picture 4 times
 *  as fine (16 looks a pixel): a pixel goes to a small thing ("material:name" in key) that covers at least `least` of its
 *  16 looks, the one that covers most; and a thing seen for less (half of `least` over a pixel and its neighbours) still
 *  gets the one pixel that holds most of it, so an eye is in every frame. Every other pixel stays as ids has it.
 *  Gives ids back, changed in place. */
export function smallThings(ids, ids4, key, least = 4) {
  const small = Object.keys(key).filter(n => n.includes(':')), k = Math.round(ids4.width / ids.width);
  if (!small.length || k < 2) return ids;
  const which = (p, i) => { if (p.data[i * 4 + 3] < 128) return -1; let best = 60, bi = -1;
    small.forEach((nm, s) => key[nm].forEach(c => { const d = Math.abs(p.data[i * 4] - c[0]) + Math.abs(p.data[i * 4 + 1] - c[1]) + Math.abs(p.data[i * 4 + 2] - c[2]); if (d < best) { best = d; bi = s; } }));
    if (bi < 0) return -1;                                             // nearer to another material's colour? then it is not a small thing
    for (const nm of Object.keys(key)) if (!nm.includes(':')) for (const c of key[nm]) if (Math.abs(p.data[i * 4] - c[0]) + Math.abs(p.data[i * 4 + 1] - c[1]) + Math.abs(p.data[i * 4 + 2] - c[2]) < best) return -1;
    return bi; };
  const W = ids.width, H = ids.height, n = small.map(() => new Uint8Array(W * H)), was = new Int8Array(W * H).fill(-1), won = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; was[i] = which(ids, i);
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const s = which(ids4, (y * k + dy) * ids4.width + x * k + dx); if (s >= 0) n[s][i]++; } }
  const need = least * k * k / 16;
  for (let i = 0; i < W * H; i++) { let top = 0; for (let s = 1; s < small.length; s++) if (n[s][i] > n[top][i]) top = s; if (n[top][i] >= need) won[i] = top; }
  // a thing split over several pixels, or seen for less than a quarter of one (an eye under a brow): where an eighth of a
  // pixel is seen it still gets one pixel, the one that holds most of it, so it does not blink from one frame to the next
  for (let s = 0; s < small.length; s++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!n[s][i] || won[i] >= 0) continue;
    let sum = 0, most = true, taken = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; sum += n[s][j]; if (won[j] === s) taken = true; if (n[s][j] > n[s][i] || (n[s][j] === n[s][i] && j < i)) most = false; }
    if (sum >= need / 2 && most && !taken) won[i] = s; }
  for (let i = 0; i < W * H; i++) { const to = won[i] >= 0 ? small[won[i]] : was[i] >= 0 ? small[was[i]].split(':')[0] : null;     // caught by the middle look alone: back to its material
    if (to) { const c = key[to][0]; ids.data.set([c[0], c[1], c[2], 255], i * 4); } }
  return ids;
}
/** The shadow as its own sprite: black where the shadow pass is at least half there (a hard edge).
 *  A pass that fades (character.py: its red holds the alpha each pixel is to have, OFFICIAL_SUN.shadowFade) gives a sprite
 *  that carries that alpha itself, as the pack's baked shadows do: draw it as it is. A pass that does not gives a solid
 *  black sprite, to be drawn at OFFICIAL_SUN.shadowAlpha. Tells which in `fades`, with the darkest and palest alpha. */
export function finishShadow(p, full = OFFICIAL_SUN.shadowAlpha) {
  const out = Buffer.alloc(p.data.length); let n = 0, fades = false, lo = 255, hi = 0;
  for (let i = 0; i < p.width * p.height; i++) if (p.data[i * 4 + 3] >= full / 2 && p.data[i * 4]) { fades = true; break; }
  for (let i = 0; i < p.width * p.height; i++) if (p.data[i * 4 + 3] >= full / 2) { const a = fades ? p.data[i * 4] || OFFICIAL_SUN.shadowFade[0] : 255;
    out[i * 4 + 3] = a; n++; lo = Math.min(lo, a); hi = Math.max(hi, a); }
  return { data: out, width: p.width, height: p.height, n, fades, lo, hi };
}

if (process.argv[1] && process.argv[1].endsWith('finish_sprite.mjs')) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : null; };
  const rampsArg = opt('--ramps') || 'all', matArg = opt('--materials');
  if (a.length < 3) { console.error('node scripts/art/finish_sprite.mjs <things.png> <cast.png> <out base> [--ramps all|none|a,b,...] [--materials "material=ramp+ramp;..."]'); process.exit(1); }
  const used = rampsArg === 'all' ? new Set(EXTRA) : new Set(rampsArg === 'none' ? [] : rampsArg.split(','));
  for (const r of used) if (!RAMP[r]) { console.error(`no ramp named ${r}`); process.exit(1); }
  let f;
  if (matArg) {
    const base = a[0].replace(/\.things\.png$/, ''), key = JSON.parse(readFileSync(`${base}.ids.json`, 'utf8')), parts = {};
    for (const one of matArg.split(';').filter(Boolean)) { const [m, rs] = one.split('='); parts[m.trim()] = rs.split('+').map(r => r.trim());
      if (!key[m.trim()]) { console.error(`no material named ${m.trim()}; there are: ${Object.keys(key).join(', ')}`); process.exit(1); }
      for (const r of parts[m.trim()]) if (!RAMP[r]) { console.error(`no ramp named ${r}`); process.exit(1); } }
    let ids = readPng(`${base}.ids.png`);
    if (existsSync(`${base}.ids4.png`)) ids = smallThings(ids, readPng(`${base}.ids4.png`), key);     // character.py --mask
    f = finishParts(readPng(a[0]), readPng(`${base}.colour.png`), ids, key, parts);
  } else f = finish(readPng(a[0]), used);
  const s = finishShadow(readPng(a[1]));
  writePng(`${a[2]}.png`, f.data, f.width, f.height); writePng(`${a[2]}.shadow.png`, s.data, s.width, s.height);
  console.log(`${a[2]}.png: ${f.n} px, ${f.box[2] - f.box[0] + 1} wide, ${f.box[3] - f.box[1] + 1} tall (x ${f.box[0]} to ${f.box[2]}, y ${f.box[1]} to ${f.box[3]})`);
  console.log(`  ramps: ${Object.entries(f.ramps).sort((x, y) => y[1] - x[1]).map(([r, c]) => `${r} ${c}`).join(', ')}`);
  if (f.parts) for (const [m, c] of Object.entries(f.parts)) console.log(`  ${m}: ${Object.entries(c).sort((x, y) => y[1] - x[1]).map(([r, k]) => `${r} ${k}`).join(', ')}`);
  console.log(`  ${f.far} px (${(100 * f.far / f.n).toFixed(1)} %) had a colour far from its ramp`);
  console.log(s.fades ? `${a[2]}.shadow.png: ${s.n} px, its own alpha ${s.hi} (at the feet) to ${s.lo} (at the tip): draw it as it is` : `${a[2]}.shadow.png: ${s.n} px, drawn at alpha ${OFFICIAL_SUN.shadowAlpha} of 255`);
}
