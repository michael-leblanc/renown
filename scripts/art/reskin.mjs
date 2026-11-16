// Draft: repaints a Creator weapon or shield sheet, pixel for pixel, in the colours of the code-made item pictures.
// The part keeps its own shape and place in every frame, so every animation still lines up; only the colours change
// (wood, iron and a metal's ramp where the Creator has one grey to tint).
//   node scripts/art/reskin.mjs <folder of part sheets> <out folder>     writes <Part>-<metal>.png for every matched part found there
// The parts and their metals are the MATCHED list in items.mjs. A part with no sheet in the folder is skipped and named.
// The sheets are the Creator's own, as <Part>.png or <Part>/Idle.png: bought art, so the results are not committed.
const SRC = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3].replace(/\/?$/, '/');
const { readPng, writePng } = await import('./png.mjs');
const { existsSync } = await import('node:fs');
const { RAMP } = await import('./kit.mjs');
const { METAL, MATCHED } = await import('./items.mjs');
const F = 128, WOOD = RAMP.wood, IRON = RAMP.iron;

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
// Where a hafted weapon's head is in one frame. The part's long axis is found from its pixels; the head is at the end that is
// thicker (more of the part around each pixel there). `thick` given (axe, mace): the head starts at the first pixel with that
// much of the part within 2 pixels of it. `frac` given (spear): the head is that share of the visible length.
// Returns a map from pixel number (y * 128 + x) to 1 (socket) or 2 (head), and how sure it is of the end (1 = a coin toss).
function haft(grey, fx, fy, { thick, frac, socket = 2.5 }) {
  const pts = [];
  for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) {
    if (grey(fx + x, fy + y) < 0) continue; let c = 0;
    for (let dy = -2; dy <= 2; dy++)for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < F && Y < F && grey(fx + X, fy + Y) >= 0) c++; }
    pts.push({ x, y, c });
  }
  if (pts.length < 4) return { mask: new Map(), sure: 9 };
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  let sxx = 0, syy = 0, sxy = 0; for (const p of pts) { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); }
  const ang = .5 * Math.atan2(2 * sxy, sxx - syy), ax = Math.cos(ang), ay = Math.sin(ang);
  let t0 = 1e9, t1 = -1e9; for (const p of pts) { p.t = (p.x - mx) * ax + (p.y - my) * ay; t0 = Math.min(t0, p.t); t1 = Math.max(t1, p.t); }
  const len = t1 - t0 || 1; let lo = 0, hi = 0; for (const p of pts) { if (p.t < t0 + .3 * len) lo += p.c * p.c; if (p.t > t1 - .3 * len) hi += p.c * p.c; }
  const up = hi >= lo, d = p => up ? t1 - p.t : p.t - t0;                  // d: how far a pixel is from the head's end, along the part
  let reach = frac ? frac * len : 0;
  if (thick) for (const p of pts) if (p.c >= thick && d(p) < .6 * len) reach = Math.max(reach, d(p));
  const mask = new Map(); for (const p of pts) { const k = d(p); if (k <= reach + .5) mask.set(p.y * F + p.x, 2); else if (k <= reach + .5 + socket) mask.set(p.y * F + p.x, 1); }
  return { mask, sure: Math.max(hi, lo) / (Math.min(hi, lo) || 1) };
}

for (const { part, kind, metal: metalName, thicken, haft: haftOpt } of MATCHED) {
  const file = [`${SRC}${part}.png`, `${SRC}${part}/Idle.png`].find(existsSync);
  if (!file) { console.log(part, 'skipped: no sheet in', SRC); continue; }
  const p = readPng(file), W = p.width, H = p.height, out = Buffer.alloc(W * H * 4), metal = METAL[metalName];
  const grey = (x, y) => p.data[(y * W + x) * 4 + 3] > 30 ? p.data[(y * W + x) * 4 + 1] : -1;
  let unsure = 9;
  for (let fy = 0; fy < H; fy += F)for (let fx = 0; fx < W; fx += F) {
    // facts about this frame: how much pale face shows, and where its middle is
    let face = 0, sx = 0, sy = 0, n = 0, x0 = F, x1 = 0, y0 = F, y1 = 0;
    for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) { const g = grey(fx + x, fy + y); if (g < 0) continue; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (g >= 150) { face++; sx += x; sy += y; } }
    if (!n) continue;
    const mx = face ? sx / face : 0, my = face ? sy / face : 0, rad = Math.max(x1 - x0, y1 - y0) / 2 || 1;
    const hm = haftOpt ? haft(grey, fx, fy, haftOpt) : null; if (hm && hm.sure < unsure) unsure = hm.sure;
    for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) {
      const g = grey(fx + x, fy + y); if (g < 0) continue;
      let touchesBright = false, paleAround = 0;
      for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= F || Y >= F) continue; const q = grey(fx + X, fy + Y); if (q >= 140) touchesBright = true; if (q >= 128) paleAround++; }
      const c = KIND[kind](g, { face, fromMiddle: Math.hypot(x - mx, y - my) / rad, touchesBright, paleAround, head: hm?.mask.get(y * F + x) === 2, socket: hm?.mask.get(y * F + x) === 1, openAbove: y === 0 || grey(fx + x, fy + y - 1) < 0, openBelow: y === F - 1 || grey(fx + x, fy + y + 1) < 0 }, metal), o = ((fy + y) * W + fx + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
    // a thin blade drawn one pixel thicker (down and to the right), so it is as broad in the hand as on the ground
    if (thicken) for (let y = F - 2; y >= 0; y--)for (let x = F - 2; x >= 0; x--) { if (grey(fx + x, fy + y) < 140) continue; for (const [dx, dy] of [[0, 1]]) { const o = ((fy + y + dy) * W + fx + x + dx) * 4; if (!out[o + 3]) { out[o] = metal[3][0]; out[o + 1] = metal[3][1]; out[o + 2] = metal[3][2]; out[o + 3] = 255; } } }
  }
  writePng(`${OUT}${part}-${metalName}.png`, out, W, H); console.log(part, kind, metalName, haftOpt ? `(least sure frame: head end ${unsure.toFixed(2)} times heavier than the butt)` : '');
}
