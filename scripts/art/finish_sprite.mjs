// Finishes a Blender picture the way the kit finishes a prop: a hard edge (a pixel is there or it is not), every pixel
// snapped to the nearest colour of the shared ramps (style.mjs, nearest in OKLab), and the ground shadow as its own
// black sprite, which the game draws at the official sun's alpha.
//   node scripts/art/finish_sprite.mjs <things.png> <shadow.png> <out base> [--ramps all|none|a,b,...]
//     things.png, shadow.png: what blender_style.py's render_with_shadow writes (things_out, shadow_out)
//     writes <out base>.png and <out base>.shadow.png, and prints the sprite's size and which ramps it took
//     --ramps: the later ramps (EXTRA in style.mjs) the picture may snap to; all by default
import { readPng, writePng } from './png.mjs';
import { RAMP, EXTRA, PALETTE, PAL_AT, OFFICIAL_SUN, snapper, oklab } from './style.mjs';

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
/** The shadow as its own sprite: black where the shadow pass is at least half there. */
export function finishShadow(p, full = OFFICIAL_SUN.shadowAlpha) {
  const out = Buffer.alloc(p.data.length); let n = 0;
  for (let i = 0; i < p.width * p.height; i++) if (p.data[i * 4 + 3] >= full / 2) { out[i * 4 + 3] = 255; n++; }
  return { data: out, width: p.width, height: p.height, n };
}

if (process.argv[1] && process.argv[1].endsWith('finish_sprite.mjs')) {
  const a = process.argv.slice(2), ri = a.indexOf('--ramps'), rampsArg = ri >= 0 ? a.splice(ri, 2)[1] : 'all';
  if (a.length < 3) { console.error('node scripts/art/finish_sprite.mjs <things.png> <shadow.png> <out base> [--ramps all|none|a,b,...]'); process.exit(1); }
  const used = rampsArg === 'all' ? new Set(EXTRA) : new Set(rampsArg === 'none' ? [] : rampsArg.split(','));
  for (const r of used) if (!RAMP[r]) { console.error(`no ramp named ${r}`); process.exit(1); }
  const f = finish(readPng(a[0]), used), s = finishShadow(readPng(a[1]));
  writePng(`${a[2]}.png`, f.data, f.width, f.height); writePng(`${a[2]}.shadow.png`, s.data, s.width, s.height);
  console.log(`${a[2]}.png: ${f.n} px, ${f.box[2] - f.box[0] + 1} wide, ${f.box[3] - f.box[1] + 1} tall (x ${f.box[0]} to ${f.box[2]}, y ${f.box[1]} to ${f.box[3]})`);
  console.log(`  ramps: ${Object.entries(f.ramps).sort((x, y) => y[1] - x[1]).map(([r, c]) => `${r} ${c}`).join(', ')}`);
  console.log(`  ${f.far} px (${(100 * f.far / f.n).toFixed(1)} %) had a colour far from every ramp`);
  console.log(`${a[2]}.shadow.png: ${s.n} px, drawn at alpha ${OFFICIAL_SUN.shadowAlpha} of 255`);
}
