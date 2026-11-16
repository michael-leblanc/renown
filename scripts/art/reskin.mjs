// Repaints the Creator's weapon and shield sheets, pixel for pixel, in the colours of the code-made item pictures (D219).
// The part keeps its own shape and place in every frame, so every animation still lines up; only the colours change
// (wood, iron and a metal's ramp where the Creator has one grey to tint).
//   node scripts/art/reskin.mjs <folder of part sheets> <out folder> [--only Melee2,Shield1] [--unsure 0.8]
// <folder of part sheets> is the Creator's own Spritesheets folder, or any folder laid out like it: <Part>/<Animation>.png, every
// animation found is repainted (a lone <Part>.png is taken as Idle). Writes <out folder>/<Part>-<metal>/<Animation>.png.
// The parts and their metals are the MATCHED list in items.mjs. A part with no sheet in the folder is skipped and named.
// For a hafted weapon it prints on how many frames the head is hidden, how many it settled from the frames beside them, and the row
// it is least sure of, and it checks every frame for a thick clump at the butt's half left painted as haft (a head taken for the butt);
// --unsure N lists every row (an animation seen from one side) it is less sure of than N, and every row with a settled frame,
// to look at by eye.
// The sheets are bought art, so the results are never committed.
const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const [SRC, OUT] = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--'))).map(a => a.replace(/\/?$/, '/'));
if (!SRC || !OUT) { console.error('Usage: node scripts/art/reskin.mjs <folder of part sheets> <out folder> [--only Melee2,Shield1]'); process.exit(1); }
const { readPng, writePng } = await import('./png.mjs');
const { existsSync, readdirSync, statSync } = await import('node:fs');
const { RAMP } = await import('./kit.mjs');
const { METAL, MATCHED } = await import('./items.mjs');
const F = 128, WOOD = RAMP.wood, IRON = RAMP.iron, only = flag('--only', ''), unsure = +flag('--unsure', 0);
const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];   // the sheets' rows, top to bottom

// kinds of part: each gives a colour for one solid pixel. g = its grey, 0 to 255; f = facts about its frame and its neighbours.
const KIND = {
  // a sword: the bright pixels are the blade (the metal), the dark ones the hilt: metal where it touches the blade (the guard), bound grip elsewhere
  sword: (g, f, metal) => g >= 140 ? metal[g >= 170 ? 5 : 4] : f.touchesBright ? metal[2] : WOOD[5],
  // an all-metal shield: the metal's ramp by grey
  metalShield: (g, f, metal) => metal[g >= 155 ? 4 : g >= 135 ? 3 : g >= 90 ? 1 : 0],   // a plain face and a dark rim, as on the item's picture
  // a round wooden shield: a wooden face, a darker rim and back, an iron boss in the middle of the face
  roundWood: (g, f) => g >= 150 ? WOOD[g >= 185 ? 5 : 4] : f.face > 20 && f.fromMiddle < .42 ? IRON[g >= 90 ? 4 : 3] : WOOD[g >= 90 ? 2 : 1],
  // a plank shield: wood by grey, dark gaps, and iron studs where a dark pixel sits alone among pale ones
  planks: (g, f) => g < 100 ? (f.paleAround >= 5 ? IRON[4] : WOOD[0]) : WOOD[g >= 170 ? 5 : g >= 150 ? 4 : g >= 132 ? 3 : 2],
  // a hafted weapon (axe, mace, spear): a wooden haft with darker binding, a metal head, and a dark metal socket where the two meet.
  // The Creator draws haft and head in the same grey, so the head is found by shape (see `haft` below), not by grey.
  // The head is lit from above like the item's picture: its top edge a tone paler, its lower edge a tone darker.
  hafted: (g, f, metal) => f.socket ? metal[2] : f.head ? (g < 140 ? metal[2] : f.openAbove ? metal[5] : f.openBelow ? metal[3] : metal[4]) : g >= 140 ? WOOD[4] : WOOD[1],
};
// Where a hafted weapon's head is. The Creator draws haft and head in one grey, so the head is found by shape. A sheet has the part
// already cut where the body or a hand hides it, so in many frames (most of all seen from behind) the head is half hidden or gone.
// 1. axis(): in one frame, the haft's line (fitted to the part's pixels, then again without those that stand off it), the part's two
//    ends along it, and for each end the signs of a head there: pixels in a thick clump (`thick`: that much of the part within
//    2 pixels), pixels standing off the haft's line, or, for a part with only `frac` (the spear), pixels a little thicker than a
//    shaft. `darkButt`: the Creator paints the butt's tip dark, which counts for the other end.
// 2. settle(): the frames of one row (one animation seen from one side) are settled together: each frame takes the end its own
//    signs point to and keeps the head near where it was in the frame before. A frame with no sign follows its neighbours.
// 3. mask(): a map from pixel number (y * 128 + x) to 1 (socket) or 2 (head). The head reaches as far as the signs do, and at least
//    `frac` of the visible length. With no sign of a head at the settled end, the head is hidden: the map is empty and all is haft.
//    A head half hidden through a whole row shows a faint sign on every frame: the row is then painted alike, not on and off.
const OFF = 1.2, SIGN = 1.5, FAINT = .2, ROW = .5, HEAD = 9;   // how far off the haft's line a pixel counts; how much sign a head needs to be painted;
                                                         // the fainter sign that is enough in a row where half the frames show at least ROW (no flicker);
                                                         // HEAD: a head is looked for at least this many pixels in from an end, however short the part shows
function line(pts) {
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  let sxx = 0, syy = 0, sxy = 0; for (const p of pts) { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); }
  const ang = .5 * Math.atan2(2 * sxy, sxx - syy); return [mx, my, Math.cos(ang), Math.sin(ang)];
}
function axis(grey, fx, fy, { thick, darkButt }) {
  const pts = [];
  for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) {
    const g = grey(fx + x, fy + y); if (g < 0) continue; let c = 0;
    for (let dy = -2; dy <= 2; dy++)for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < F && Y < F && grey(fx + X, fy + Y) >= 0) c++; }
    pts.push({ x, y, c, g });
  }
  if (pts.length < 4) return null;
  let L = line(pts); const on = pts.filter(p => Math.abs(-(p.x - L[0]) * L[3] + (p.y - L[1]) * L[2]) <= 1.5); if (on.length >= 4 && on.length >= .5 * pts.length) L = line(on);
  const [mx, my, ax, ay] = L; let t0 = 1e9, t1 = -1e9;
  for (const p of pts) { p.t = (p.x - mx) * ax + (p.y - my) * ay; p.off = Math.abs(-(p.x - mx) * ay + (p.y - my) * ax); t0 = Math.min(t0, p.t); t1 = Math.max(t1, p.t); }
  const len = t1 - t0 || 1, sign = [0, 0], butt = [0, 0];
  for (const p of pts) for (const e of [0, 1]) {
    const d = e ? t1 - p.t : p.t - t0, win = Math.max(.3 * len, HEAD); if (d > win) continue;
    sign[e] += 2 * (1 - d / win) * (thick ? (p.c >= thick ? 2 : 0) + Math.min(Math.max(p.off - OFF, 0), 2) : Math.max(p.c - 7, 0) / 3);   // nearer the end counts more
    if (darkButt && d <= 1.5 && p.g < 100) butt[e]++;
  }
  return { pts, t0, t1, len, sign, butt, end: [[mx + ax * t0, my + ay * t0], [mx + ax * t1, my + ay * t1]] };
}
const STAY = 2.5;                                        // how much a head that jumps the part's whole length between two frames counts against a frame's own signs
const own = (a, s) => Math.max(-3, Math.min(3, Math.log((a.sign[1 - s] + 3 * a.butt[s] + 1) / (a.sign[s] + 3 * a.butt[1 - s] + 1))));   // low when the signs point to end s
const step = (a, q, b, s) => STAY * Math.hypot(a.end[q][0] - b.end[s][0], a.end[q][1] - b.end[s][1]) / Math.max(a.len, b.len, 4);
/** Settles the head's end for a row of frames (null = an empty frame). Returns, per frame, 1 if the head is at end[1], else 0;
 *  and for the row: the frames that differ from their own signs, and how much better the row is than the same row turned round. */
function settle(A) {
  const n = A.length, pick = new Array(n).fill(1), changed = []; let margin = 99;
  for (let i = 0; i < n; i++) {
    if (!A[i]) continue;
    let j = i; while (j + 1 < n && A[j + 1]) j++;
    let c = [own(A[i], 0), own(A[i], 1)]; const back = [];
    for (let k = i + 1; k <= j; k++) {
      const nc = [0, 0], bk = [0, 0];
      for (const s of [0, 1]) { const v0 = c[0] + step(A[k - 1], 0, A[k], s), v1 = c[1] + step(A[k - 1], 1, A[k], s); bk[s] = v1 < v0 ? 1 : 0; nc[s] = Math.min(v0, v1) + own(A[k], s); }
      c = nc; back.push(bk);
    }
    let s = c[1] <= c[0] ? 1 : 0; pick[j] = s; for (let k = j; k > i; k--) { s = back[k - i - 1][s]; pick[k - 1] = s; }
    let sum = 0; for (let k = i; k <= j; k++) { sum += own(A[k], 1 - pick[k]) - own(A[k], pick[k]); if (own(A[k], pick[k]) > own(A[k], 1 - pick[k])) changed.push(k); }
    margin = Math.min(margin, sum / (j - i + 1));
    i = j;
  }
  return { pick, changed, margin };
}
function mask(a, s, { thick, frac, socket = 2.5 }, faintOk) {
  const m = new Map(); if (a.sign[s] < (faintOk ? FAINT : SIGN)) return m;
  const d = p => s ? a.t1 - p.t : p.t - a.t0;            // how far a pixel is from the head's end, along the part
  let reach = frac ? frac * a.len : 0;
  if (thick) for (const p of a.pts) if ((p.c >= thick && d(p) < Math.max(.6 * a.len, HEAD)) || (p.off > OFF && d(p) < Math.max(.3 * a.len, HEAD))) reach = Math.max(reach, d(p));
  for (const p of a.pts) { const k = d(p); if (k <= reach + .5) m.set(p.y * F + p.x, 2); else if (k <= reach + .5 + socket) m.set(p.y * F + p.x, 1); }
  return m;
}

/** Repaints one sheet. Returns the new pixels and, for a hafted weapon, what was found: frames, frames settled from their neighbours,
 *  frames with the head hidden, the weakest row, and how often a dark butt tip sits at the end taken for the head. */
function repaint(p, { kind, metal: metalName, thicken, haft: haftOpt }) {
  const W = p.width, H = p.height, out = Buffer.alloc(W * H * 4), metal = METAL[metalName], found = { frames: 0, changed: 0, margin: 99, row: -1, hidden: 0, butts: 0, buttsWrong: 0, missed: [], rows: [] };
  const grey = (x, y) => p.data[(y * W + x) * 4 + 3] > 30 ? p.data[(y * W + x) * 4 + 1] : -1;
  for (let fy = 0; fy < H; fy += F) {
    let masks = null;
    if (haftOpt) {
      const A = []; for (let fx = 0; fx < W; fx += F) A.push(axis(grey, fx, fy, haftOpt));
      const st = settle(A), lv = A.map((a, i) => a ? a.sign[st.pick[i]] : -1).filter(v => v >= 0).sort((u, v) => u - v), faintOk = lv.length > 0 && lv[lv.length >> 1] >= ROW;
      masks = A.map((a, i) => a ? mask(a, st.pick[i], haftOpt, faintOk) : null);
      // counts, and the check: a thick clump of the part in the half away from the head, painted as haft
      A.forEach((a, i) => { if (!a) return; if (!masks[i].size) found.hidden++;
        { const s = st.pick[i], far = Math.max(.5 * a.len, HEAD); if (a.pts.filter(p => p.c >= (haftOpt.thick || 11) && masks[i].get(p.y * F + p.x) !== 2 && (s ? a.t1 - p.t : p.t - a.t0) > far).length >= 3) found.missed.push([fy / F, i]); } const s = st.pick[i]; if (a.butt[0] + a.butt[1] && a.sign[0] + a.sign[1] >= SIGN) { found.butts++; if (a.butt[s] > a.butt[1 - s]) found.buttsWrong++; } });
      found.frames += A.filter(Boolean).length; found.changed += st.changed.length; if (st.margin < found.margin) { found.margin = st.margin; found.row = fy / F; }
      { const L = A.filter(Boolean); if (L.length) found.rows.push([fy / F, st.margin, L.reduce((t, a) => t + a.len, 0) / L.length, st.changed]); }
    }
    for (let fx = 0; fx < W; fx += F) {
      // facts about this frame: how much pale face shows, and where its middle is
      let face = 0, sx = 0, sy = 0, n = 0, x0 = F, x1 = 0, y0 = F, y1 = 0;
      for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) { const g = grey(fx + x, fy + y); if (g < 0) continue; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (g >= 150) { face++; sx += x; sy += y; } }
      if (!n) continue;
      const mx = face ? sx / face : 0, my = face ? sy / face : 0, rad = Math.max(x1 - x0, y1 - y0) / 2 || 1, hm = masks?.[fx / F];
      for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) {
        const g = grey(fx + x, fy + y); if (g < 0) continue;
        let touchesBright = false, paleAround = 0;
        for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= F || Y >= F) continue; const q = grey(fx + X, fy + Y); if (q >= 140) touchesBright = true; if (q >= 128) paleAround++; }
        const c = KIND[kind](g, { face, fromMiddle: Math.hypot(x - mx, y - my) / rad, touchesBright, paleAround, head: hm?.get(y * F + x) === 2, socket: hm?.get(y * F + x) === 1, openAbove: y === 0 || grey(fx + x, fy + y - 1) < 0, openBelow: y === F - 1 || grey(fx + x, fy + y + 1) < 0 }, metal), o = ((fy + y) * W + fx + x) * 4;
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
      }
      // a thin blade drawn one pixel thicker (downwards), so it is as broad in the hand as on the ground
      if (thicken) for (let y = F - 2; y >= 0; y--)for (let x = F - 1; x >= 0; x--) { if (grey(fx + x, fy + y) < 140) continue; const o = ((fy + y + 1) * W + fx + x) * 4; if (!out[o + 3]) { out[o] = metal[3][0]; out[o + 1] = metal[3][1]; out[o + 2] = metal[3][2]; out[o + 3] = 255; } }
    }
  }
  return { out, found };
}

let sheets = 0;
for (const m of MATCHED) {
  if (only && !only.split(',').includes(m.part)) continue;
  const dir = `${SRC}${m.part}/`, isDir = existsSync(dir) && statSync(dir).isDirectory();
  const files = isDir ? readdirSync(dir).filter(f => f.endsWith('.png')).sort().map(f => [f.slice(0, -4), dir + f]) : existsSync(`${SRC}${m.part}.png`) ? [['Idle', `${SRC}${m.part}.png`]] : [];
  if (!files.length) { console.log(m.part, 'skipped: no sheet in', SRC); continue; }
  let frames = 0, changed = 0, hidden = 0, butts = 0, buttsWrong = 0, weak = { margin: 99 }; const missed = [];
  for (const [anim, file] of files) {
    const p = readPng(file), { out, found } = repaint(p, m);
    for (const [row, mg, len, ch] of found.rows) if (mg < unsure || (unsure && ch.length)) console.log(`  ${mg < unsure ? 'unsure' : 'settled'}: ${m.part} ${anim} ${DIRS[row]}: ${mg.toFixed(2)}, about ${len.toFixed(0)} px long${ch.length ? ', frames settled from the ones beside them: ' + ch.join(' ') : ''}`);
    writePng(`${OUT}${m.part}-${m.metal}/${anim}.png`, out, p.width, p.height); sheets++;
    for (const [row, fr] of found.missed) missed.push(`${anim} ${DIRS[row]} ${fr}`);
    frames += found.frames; changed += found.changed; hidden += found.hidden; butts += found.butts; buttsWrong += found.buttsWrong; if (found.margin < weak.margin) weak = { margin: found.margin, anim, row: found.row };
  }
  console.log(`${m.part} (${m.name}, ${m.metal}): ${files.length} animation${files.length > 1 ? 's' : ''}` + (m.haft ? `; ${frames} frames: head hidden on ${hidden}, ${changed} settled from the frames beside them; least sure row: ${weak.anim} ${DIRS[weak.row]} (${weak.margin.toFixed(2)}; 0 = a coin toss)` + (m.haft.darkButt ? `; the dark butt tip is at the head's end on ${buttsWrong} of ${butts} frames that show one` : '') : ''));
  if (m.haft) console.log(`  check: a thick clump at the butt's half, painted as haft, on ${missed.length} frames${missed.length ? ': ' + missed.slice(0, 16).join(', ') + (missed.length > 16 ? ', ...' : '') : ''}`);
}
console.log(`Wrote ${sheets} sheets to ${OUT}`);
