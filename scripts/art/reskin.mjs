// Draft: repaints a Creator weapon or shield sheet, pixel for pixel, in the colours of the code-made item pictures.
// The part keeps its own shape and place in every frame, so every animation still lines up; only the colours change
// (wood, iron and a metal's ramp where the Creator has one grey to tint).
//   node scripts/art/reskin.mjs <folder of part sheets> <out folder>     writes <Part>-<metal>.png for the six parts matched so far
// The sheets are the Creator's own (one PNG per part, e.g. Melee2.png = Melee2/Idle.png): bought art, so the results are not committed.
const SRC = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3].replace(/\/?$/, '/');
const { readPng, writePng } = await import('./png.mjs');
const { RAMP } = await import('./kit.mjs');
const { METAL } = await import('./items.mjs');
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
};
const JOBS = [['Melee2', 'sword', 'steel', true], ['Melee5', 'sword', 'bronze'], ['Melee4', 'sword', 'iron'], ['Shield1', 'roundWood', 'iron'], ['Shield5', 'metalShield', 'bronze'], ['Shield7', 'planks', 'iron']];

for (const [part, kind, metalName, thicken] of JOBS) {
  const p = readPng(`${SRC}${part}.png`), W = p.width, H = p.height, out = Buffer.alloc(W * H * 4), metal = METAL[metalName];
  const grey = (x, y) => p.data[(y * W + x) * 4 + 3] > 30 ? p.data[(y * W + x) * 4 + 1] : -1;
  for (let fy = 0; fy < H; fy += F)for (let fx = 0; fx < W; fx += F) {
    // facts about this frame: how much pale face shows, and where its middle is
    let face = 0, sx = 0, sy = 0, n = 0, x0 = F, x1 = 0, y0 = F, y1 = 0;
    for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) { const g = grey(fx + x, fy + y); if (g < 0) continue; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (g >= 150) { face++; sx += x; sy += y; } }
    if (!n) continue;
    const mx = face ? sx / face : 0, my = face ? sy / face : 0, rad = Math.max(x1 - x0, y1 - y0) / 2 || 1;
    for (let y = 0; y < F; y++)for (let x = 0; x < F; x++) {
      const g = grey(fx + x, fy + y); if (g < 0) continue;
      let touchesBright = false, paleAround = 0;
      for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= F || Y >= F) continue; const q = grey(fx + X, fy + Y); if (q >= 140) touchesBright = true; if (q >= 128) paleAround++; }
      const c = KIND[kind](g, { face, fromMiddle: Math.hypot(x - mx, y - my) / rad, touchesBright, paleAround }, metal), o = ((fy + y) * W + fx + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
    // a thin blade drawn one pixel thicker (down and to the right), so it is as broad in the hand as on the ground
    if (thicken) for (let y = F - 2; y >= 0; y--)for (let x = F - 2; x >= 0; x--) { if (grey(fx + x, fy + y) < 140) continue; for (const [dx, dy] of [[0, 1]]) { const o = ((fy + y + dy) * W + fx + x + dx) * 4; if (!out[o + 3]) { out[o] = metal[3][0]; out[o + 1] = metal[3][1]; out[o + 2] = metal[3][2]; out[o + 3] = 255; } } }
  }
  writePng(`${OUT}${part}-${metalName}.png`, out, W, H); console.log(part, kind, metalName);
}
