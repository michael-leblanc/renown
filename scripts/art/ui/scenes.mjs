// Dawndoor's landmark as a full painting, made by code alone: no bought art in it, nothing to load. (Oldscar's is scar_scene.mjs.)
//   doorScene()  Dawndoor's lone doorway (D108) on the east shore (D113), the sun coming up over the Long Water (D99) through it.
//                It can move: clouds drift, the water glitters, the light through the doorway shimmers, dust drifts in it, grass sways, stars blink.
//                Time runs from 0 to 1 and the last moment meets the first, so it plays round and round.
// It is painted in the game window's own pixels (1152 x 648) and can be looked at through any view of it: the menu shows the whole
// doorway, the death screen a round cut of it. Plain old stone, no carvings (D68); nothing across the water (D115); no animals (D103).
// The doorway here is far bigger than the one in the world (2 tiles): Michael asked for it "more impressive" (2026-11-18). It is a painting, not the prop.
import { vnoise } from './kit.mjs';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
/** A colour from a list of [where, colour] stops, `where` rising from 0 to 1. */
const stops = (list, t) => { let k = 1; while (k < list.length - 1 && t > list[k][0]) k++; return mix(list[k - 1][1], list[k][1], clamp((t - list[k - 1][0]) / (list[k][0] - list[k - 1][0]))); };
/** Two samples of a moving noise blended so the movement loops: `a` taken at time t, `b` at time t - 1. */
const loop = (a, b, t) => .5 + ((a - .5) * (1 - t) + (b - .5) * t) / Math.sqrt((1 - t) * (1 - t) + t * t);

/* ---------- the doorway: its shape ---------- */
// SX: its middle. HY: the horizon, and the height of the eye. BASE: its foot. HALF: half the opening. SPRING: where the arch starts. TOP: its top.
// DEEP: how much smaller the far end of the opening looks than the near end (the doorway is thick, and seen from the front).
export const DOOR = { SX: 880, HY: 408, BASE: 572, HALF: 64, SPRING: 310, TOP: 132, DEEP: .86 };
const { SX, HY, BASE, HALF, SPRING, TOP, DEEP } = DOOR, COURSE = 26, BLOCK = 56, RING = 36, SUN = [SX, HY - 4, 36];
// From the point straight through the doorway at eye height, a line to (x, y) leaves the opening's near edge after REACH pixels, through its
// floor (KIND 0), a side (1) or the arch (2). Q is how far (x, y) is along it: under DEEP the far opening (sky), up to 1 the opening's
// inner faces, over 1 outside the opening. Light through the doorway spreads along the same lines.
let Q = 0, KIND = 0, REACH = 1;
function reach(x, y) {
  const dx = x - SX, dy = y - HY, D = Math.hypot(dx, dy); if (D < 1e-6) { Q = 0; KIND = 0; REACH = 1; return; }
  const ux = dx / D, uy = dy / D, ax = Math.abs(ux);
  if (uy > 0) { const tb = (BASE - HY) / uy; if (ax * tb <= HALF) { REACH = tb; KIND = 0; } else { REACH = HALF / ax; KIND = 1; } }
  else {
    const ts = ax > 1e-9 ? HALF / ax : 1e9;
    if (HY + uy * ts >= SPRING) { REACH = ts; KIND = 1; }
    else { const uc = (SPRING - HY) * uy; REACH = uc + Math.sqrt(Math.max(0, uc * uc - ((HY - SPRING) ** 2 - HALF * HALF))); KIND = 2; }
  }
  Q = D / REACH;
}
const outer = y => 140 + 12 * (y - TOP) / (BASE - TOP) + (y > BASE - 34 ? 10 : 0);       // half its width: wider at the foot, and a plinth
const DROPS = [26, 0, 0, 0, 52, 104, 104];                                                 // its broken top: courses missing, block by block from the left
const topAt = x => TOP + DROPS[clamp(Math.floor((x - SX + 168) / BLOCK), 0, 6)] + (vnoise(x / 5, 7.7) - .5) * 3;
/** The doorway's stone at a point, or null where there is none. Its front is in shade: the sun is behind it. */
function wall(x, y) {
  const dx = x - SX, adx = Math.abs(dx); if (y > BASE + 3 || adx > 172) return null;
  const top = topAt(x), edge = outer(y) + (vnoise(y / 16, dx > 0 ? 4.1 : 8.6) - .5) * 5; if (y < top || adx > edge) return null;
  reach(x, y); const q = Q, kind = KIND, far = REACH; if (q < DEEP) return null;
  const grain = (vnoise(x / 9 + 7, y / 6) - .5) * 10 + (vnoise(x / 2.2, y / 2.2) - .5) * 6;
  if (q < 1) {                                             // the opening's inner faces, lit along their length by the sun: floor, sides, arch
    const f = (1 - q) / (1 - DEEP), fx = SX + dx / q, fy = HY + (y - HY) / q; let c, joint;      // f: 0 at the near edge, 1 at the far one. fx, fy: the point of the near edge in front of it
    if (kind === 0) { c = mix([112, 66, 40], [255, 218, 152], f ** .8); joint = ((fx - SX + 301) % 43 + 43) % 43 < 1.6 / q; }
    else if (kind === 1) { c = mix([70, 44, 38], [238, 160, 94], f ** 1.4).map(v => v * (.72 + .28 * smooth(SPRING - 40, BASE, y))); joint = (BASE - fy) % COURSE < 1.9; }
    else { c = mix([58, 38, 36], [216, 140, 86], f ** 1.4); joint = ((Math.atan2(fx - SX, SPRING - fy) * 180 / Math.PI + 367.5) % 15) * Math.PI / 180 * HALF < 1.8; }
    if (joint) c = c.map(v => v * .6); if (f > .9) c = mix(c, [255, 238, 196], (f - .9) * 7);
    return c.map(v => v + grain * .8);
  }
  let joint, tone, arris = 1; const r = Math.hypot(dx, y - SPRING), ang = Math.atan2(dx, SPRING - y) * 180 / Math.PI, ring = HALF + RING + (Math.abs(ang) < 7.5 ? 12 : 0);
  if (y < SPRING && r < ring) { joint = ((ang + 367.5) % 15) * Math.PI / 180 * r < 1.8 || ring - r < 1.9; tone = hash(Math.floor((ang + 367.5) / 15), 99) * .7 + .3; }     // the arch's stones, a taller one at its top
  else if (y >= SPRING && y < SPRING + 13) { joint = y - SPRING < 1.7 || SPRING + 13 - y < 1.7 || (dx + 560) % 84 < 1.8; tone = .95; }                                  // a band where the arch starts
  else if (y > BASE - 34) { joint = y - (BASE - 34) < 2 || (dx + 580) % 76 < 1.9; tone = hash(Math.floor((dx + 580) / 76), 77) * .6; }                                   // the plinth
  else { const course = Math.floor((BASE - y) / COURSE), yin = BASE - y - course * COURSE, bx = dx + 560 + (course % 2 ? BLOCK / 2 : 0); joint = yin < 1.8 || bx % BLOCK < 1.8; tone = hash(Math.floor(bx / BLOCK), course); if (yin > COURSE - 1.6) arris = 1.16; }
  const v = 30 + 16 * tone + grain, lit = .8 + .42 * smooth(BASE, TOP, y); let c = [v * lit, v * .94 * lit, v * 1.1 * lit].map(p => p * (joint ? .5 : arris));
  const streak = vnoise(x / 7 + 3, y / 70 + 1); if (streak > .6) c = c.map(p => p * (1 - .32 * (streak - .6) / .4 * smooth(top + 160, top, y)));                          // rain streaks under the top
  const moss = vnoise(x / 13 + 30, y / 17 + 2) + .28 * smooth(BASE - 150, BASE, y); if (moss > .78) c = mix(c, [24, 38, 24], clamp((moss - .78) * 4, 0, .8));
  if (y > 240 && y < 430 && Math.abs(dx - (92 + (y - 250) * .21 + (vnoise(y / 9, 5) - .5) * 8)) < 1.3) c = c.map(p => p * .4);                                             // one crack down the right pier
  const e = edge - adx; if (e < 2.8) c = mix(c, [255, 172, 104], (1 - e / 2.8) * .8 * smooth(TOP + 30, HY, y));                                                            // its sides glow where the bright sky is behind
  if (y - top < 2.2) c = mix(c, [128, 110, 134], .55);
  const d = (q - 1) * far; if (d < 1.8) c = mix(c, [255, 196, 124], .7 * (1 - d / 1.8));                                                                                   // the opening's near edge catches the sun
  return c;
}
const FALLEN = [[196, 26, 46, 30], [242, 40, 32, 22], [-214, 28, 40, 26], [150, 52, 26, 18], [-170, 48, 22, 15]];   // fallen blocks: across from the doorway's middle, their near foot down from the doorway's, wide, tall
/** What lies in front of the doorway at a point, or null: three worn steps, lit down their middle, and the fallen blocks. */
function front(x, y) {
  const dx = x - SX, adx = Math.abs(dx), step = Math.floor((y - (BASE - 2)) / 11), out = (y - HY) / (BASE - HY);       // out: how far towards the eye, 1 at the doorway's foot
  if (step >= 0 && step <= 2 && adx < (HALF + 22) * out + 14 * step) {
    const yin = y - (BASE - 2) - step * 11, light = clamp(1 - (adx - (HALF - 10) * out) / 16) * (.95 - .2 * step);
    if (yin >= 7) return mix([12, 11, 14], [120, 70, 40], light * .25);
    let c = mix([28, 26, 30], [250, 184, 110], light).map(v => v + (vnoise(x / 5, y / 2 + 9) - .5) * 8); if ((dx + 600) % 47 < 1.6) c = c.map(v => v * .7); if (yin < 1.3) c = c.map(v => v * 1.12); return c;
  }
  for (const [bx, by, bw, bh] of FALLEN) {
    const px = dx - bx, py = y - (BASE + by), lean = bx > 0 ? .35 : -.35, v = 24 + 8 * hash(bx, by) + (vnoise(x / 4, y / 4) - .5) * 8;                                // its top leans towards the doorway: it is seen from in front of it
    if (py <= 0 && py > -bh * .62 && Math.abs(px) < bw / 2) return [v * .62, v * .58, v * .7];                                                                        // its near face, in shade
    const ty = py + bh * .62; if (ty <= 0 && ty > -bh * .38 && Math.abs(px - lean * ty) < bw / 2) return ty < -bh * .38 + 1.8 ? [226, 154, 108] : [v * 1.75, v * 1.6, v * 1.9];   // its top, under the sky, its far edge lit
  }
  return null;
}
const groundAt = x => BASE - 4 - 50 * smooth(640, 80, x) + smooth(130, 300, Math.abs(x - SX)) * (5 * Math.sin(x / 190 + 1) + (vnoise(x / 46, 2.2) - .5) * 12);
const tuftAt = (x, t) => vnoise((x + 3.4 * Math.sin(TAU * t + x / 37)) / 1.7, 9.4) * 13 * (.3 + vnoise(x / 30, 1.1)) * (.35 + .65 * smooth(60, 150, Math.abs(x - SX)));   // grass against the light, swaying
const DRIFT = 96, fbm = (x, y) => vnoise(x / 170 + 3, y / 34 + 7) * .58 + vnoise(x / 58 + 9, y / 13 + 2) * .3 + vnoise(x / 20, y / 5.5) * .12;                            // cloud; how far it drifts in one loop
const ripple = (x, y, far, at) => vnoise(x / (5 + far * 26) + 3, (y - 64 * at * (.3 + far)) / (1.3 + far * 3.4));
const SKY = [[0, [9, 12, 30]], [.4, [44, 36, 78]], [.72, [152, 82, 86]], [.9, [234, 142, 86]], [1, [255, 214, 142]]];                                                    // night still at the top

/** The door at dawn seen through a view of the painting: x0, y0 its top left in the painting, w x h its size in pixels, `zoom` pixels to one of
 *  the painting's. `gain(x, y)` can dim parts of it. Returns frame(t): the picture at time t (0 to 1), as { w, h, data } with data in RGBA bytes.
 *  The still parts are painted once, when this is called (under a second); a frame takes about 0.2 seconds at the window's size. */
export function doorScene({ x0 = 0, y0 = 0, w = 1152, h = 648, zoom = 1, gain = null } = {}) {
  const N = w * h, X = i => x0 + (i + .5) / zoom, Y = j => y0 + (j + .5) / zoom;
  const still = (paint, bx0, by0, bx1, by1) => {          // a still part: 3 x 3 points a pixel, inside a box of the painting
    const C = new Float32Array(N * 3), A = new Float32Array(N), i0 = Math.max(0, Math.floor((bx0 - x0) * zoom)), i1 = Math.min(w - 1, Math.ceil((bx1 - x0) * zoom)), j0 = Math.max(0, Math.floor((by0 - y0) * zoom)), j1 = Math.min(h - 1, Math.ceil((by1 - y0) * zoom));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      let n = 0, r = 0, g = 0, b = 0; for (let v = 0; v < 3; v++) for (let u = 0; u < 3; u++) { const c = paint(x0 + (i + (u + .5) / 3) / zoom, y0 + (j + (v + .5) / 3) / zoom); if (c) { n++; r += c[0]; g += c[1]; b += c[2]; } }
      if (n) { const k = j * w + i; C[k * 3] = r / n; C[k * 3 + 1] = g / n; C[k * 3 + 2] = b / n; A[k] = n / 9; }
    }
    return [C, A];
  };
  const [wallC, wallA] = still(wall, SX - 174, TOP - 6, SX + 174, BASE + 4), [frontC, frontA] = still(front, SX - 250, BASE - 4, SX + 270, BASE + 62);
  // The light through the doorway: a glow on the stone round the opening (rayW), a pool on the ground in front of it (rayG), and which line of light each pixel is on (rayB).
  const rayW = new Float32Array(N), rayG = new Float32Array(N), rayB = new Uint16Array(N), glowA = new Float32Array(N), glowB = new Float32Array(N), dimmed = new Float32Array(N).fill(1);
  for (let j = 0, k = 0; j < h; j++) for (let i = 0; i < w; i++, k++) {
    const x = X(i), y = Y(j), dx = x - SX, ds2 = dx * dx + (y - SUN[1]) ** 2;
    glowA[k] = Math.exp(-ds2 / (2 * 130 * 130)) * .6; glowB[k] = Math.exp(-ds2 / (2 * 46 * 46)) * .62; if (gain) dimmed[k] = gain(x, y);
    if (Math.abs(dx) > 340 || y < TOP - 30) continue;
    reach(x, y); rayB[k] = Math.floor((Math.atan2(y - HY, dx) / TAU + .5) * 719.99);
    if (Q > 1) { const d = (Q - 1) * REACH; rayW[k] = .42 * Math.exp(-d / 16) + .05 * Math.exp(-d / 70); }
    if (y > BASE - 8) { const qg = (y - HY) / (BASE - HY), pen = 4 + 30 * Math.max(0, qg - 1); rayG[k] = smooth(HALF + pen, HALF - pen * .6, Math.abs(dx / qg)) * Math.exp(-Math.max(0, qg - 1) * 1.4); }
  }
  const rows = Array.from({ length: h }, (_, j) => { const y = Y(j), t = clamp(y / HY), far = clamp((y - HY) / 240); return { y, far, sky: stops(SKY, t), cloud: mix([92, 70, 104], [250, 156, 106], smooth(.4, .88, t)), amount: smooth(.14, .4, t) * (1 - smooth(.9, .99, t)) * .74, mist: Math.exp(-(((y - HY + 3) / 11) ** 2)) * .5, deep: smooth(0, .55, far) }; });
  const cols = Array.from({ length: w }, (_, i) => { const x = X(i); return { x, ground: groundAt(x), shine: Math.exp(-(((x - SX) / 300) ** 2)) * .35 }; });
  const stars = [], motes = Array.from({ length: 64 }, (_, n) => ({ x: SX + (hash(n, 1) - .5) * 250, y: BASE + 44 - hash(n, 2) * 300, n: 1 + n % 2, p: hash(n, 3), s: hash(n, 4) }));
  for (let cy = Math.floor(y0 / 24); cy * 24 < Math.min(y0 + h / zoom, HY * .62); cy++) for (let cx = Math.floor(x0 / 24); cx * 24 < x0 + w / zoom; cx++) if (hash(cx, cy) > .5) stars.push({ x: (cx + hash(cx + .3, cy)) * 24, y: (cy + hash(cx, cy + .7)) * 24, b: .3 + .7 * hash(cx + 9, cy + 4), n: 1 + Math.floor(hash(cx + 2, cy + 2) * 3), p: hash(cx + 5, cy + 1) });

  function frame(t = 0) {
    const data = Buffer.alloc(N * 4), streak = new Float32Array(720), t1 = t - 1, breath = 1 + .07 * Math.sin(TAU * t);
    for (let b = 0; b < 720; b++) { const a = b / 720 * TAU; streak[b] = .74 + .2 * Math.sin(a * 19 + TAU * t) + .14 * Math.sin(a * 43 - 2 * TAU * t + 1.3) + .08 * Math.sin(a * 7 + TAU * t + 4); }
    const add = (k, r, g, b) => { const p = k * 4; data[p] = Math.min(255, data[p] + r); data[p + 1] = Math.min(255, data[p + 1] + g); data[p + 2] = Math.min(255, data[p + 2] + b); };
    for (let j = 0, k = 0; j < h; j++) {
      const row = rows[j], y = row.y;
      for (let i = 0; i < w; i++, k++) {
        const col = cols[i], x = col.x, wa = wallA[k], fa = frontA[k], ga = y > col.ground - 15 ? clamp(y - (col.ground - tuftAt(x, t)) + .5) : 0; let r = 0, g = 0, b = 0, m;
        if (ga < 1 && fa < 1) {
          if (wa < 1 && y < HY) {                           // the sky: cloud, the sun and its glow, mist on the water's edge
            r = row.sky[0]; g = row.sky[1]; b = row.sky[2];
            const cl = loop(fbm(x + DRIFT * t, y), fbm(x + DRIFT * t1, y), t); m = smooth(.5, .66, cl) * row.amount; r += (row.cloud[0] - r) * m; g += (row.cloud[1] - g) * m; b += (row.cloud[2] - b) * m;
            m = glowA[k] * breath; r += (255 - r) * m; g += (222 - g) * m; b += (156 - b) * m; m = glowB[k] * breath; r += (255 - r) * m; g += (240 - g) * m; b += (200 - b) * m;
            const sd = SUN[2] - Math.hypot(x - SUN[0], y - SUN[1]); if (sd > -1) { m = clamp(sd / 1.4 + .5); r += (255 - r) * m; g += (247 - g) * m; b += (214 - b) * m; }
            m = row.mist * (.3 + .7 * cl); r += (255 - r) * m; g += (204 - g) * m; b += (156 - b) * m;
          } else if (wa < 1) {                              // the Long Water: the sun's path on it, glints further out
            const far = row.far, rp = loop(ripple(x, y, far, t), ripple(x, y, far, t1), t), path = clamp(1 - Math.abs(x - SX) / (15 + (y - HY) * 1.05));
            r = 120 + 135 * col.shine; g = 92 + 104 * col.shine; b = 88 + 40 * col.shine; r += (14 - r) * row.deep; g += (28 - g) * row.deep; b += (44 - b) * row.deep;
            m = path * (.2 + .8 * smooth(.41, .47, rp)) * (1 - far * .45) * .92; r += (255 - r) * m; g += (208 - g) * m; b += (132 - b) * m;
            m = smooth(.72, .8, rp) * .22 * (1 - far * .8) * (1 - path); r += (226 - r) * m; g += (160 - g) * m; b += (120 - b) * m;
            m = row.mist * .7; r += (255 - r) * m; g += (204 - g) * m; b += (156 - b) * m;
          }
          if (wa > 0) { r += (wallC[k * 3] - r) * wa; g += (wallC[k * 3 + 1] - g) * wa; b += (wallC[k * 3 + 2] - b) * wa; }
        }
        if (ga > 0) {                                       // the shore, dark against the light
          const dk = smooth(0, 70, y - col.ground), gr = (vnoise(x / 3, y / 3) - .5) * 5, lip = y - col.ground < 1.6 && y >= col.ground ? .35 * smooth(900, 300, Math.abs(x - SX)) : 0;
          let R0 = 18 - 13 * dk + gr, G0 = 21 - 15 * dk + gr, B0 = 17 - 11 * dk + gr; R0 += (128 - R0) * lip; G0 += (88 - G0) * lip; B0 += (48 - B0) * lip;
          r += (R0 - r) * ga; g += (G0 - g) * ga; b += (B0 - b) * ga;
        }
        if (fa > 0) { r += (frontC[k * 3] - r) * fa; g += (frontC[k * 3 + 1] - g) * fa; b += (frontC[k * 3 + 2] - b) * fa; }
        const lit = (rayW[k] * wa * (1 - ga) * (1 - fa) + rayG[k] * (ga * (1 - fa) * (.7 + .6 * vnoise(x / 6, y / 2)) + fa * .12)) * streak[rayB[k]] * breath;
        if (lit > 0) { r += 255 * lit; g += 166 * lit; b += 92 * lit; }
        const d = dimmed[k], p = k * 4; data[p] = clamp(Math.round(r * d), 0, 255); data[p + 1] = clamp(Math.round(g * d), 0, 255); data[p + 2] = clamp(Math.round(b * d), 0, 255); data[p + 3] = 255;
      }
    }
    for (const s of stars) {                                // stars, where no cloud or stone is in the way
      const i = Math.floor((s.x - x0) * zoom), j = Math.floor((s.y - y0) * zoom); if (i < 1 || j < 1 || i >= w - 1 || j >= h - 1) continue; const k = j * w + i; if (wallA[k] || s.y > cols[i].ground - 16) continue;
      const cl = loop(fbm(s.x + DRIFT * t, s.y), fbm(s.x + DRIFT * t1, s.y), t), a = s.b * (.55 + .45 * Math.sin(TAU * (s.n * t + s.p))) * (1 - smooth(.5, .66, cl)) * (1 - smooth(.08, .62, s.y / HY)) * dimmed[k] * 215;
      add(k, a, a * .98, a * .93); for (const o of [-1, 1, -w, w]) add(k + o, a * .28, a * .27, a * .26);
    }
    for (const mo of motes) {                               // dust drifting up through the light: it shows only where the light falls
      const ph = (mo.n * t + mo.p) % 1, mx = mo.x + 9 * Math.sin(TAU * (ph + mo.s)), my = mo.y - 46 * ph, i = Math.round((mx - x0) * zoom), j = Math.round((my - y0) * zoom); if (i < 1 || j < 1 || i >= w - 1 || j >= h - 1) continue;
      const k = j * w + i; reach(mx, my); const a = Math.sin(Math.PI * ph) ** 2 * (Q < 1 ? .6 : Math.min(1, Math.max(.22, rayW[k] * 1.9, rayG[k]))) * dimmed[k] * 235; if (a < 2 || i < 2 || j < 2 || i >= w - 2 || j >= h - 2) continue;
      for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const f = Math.exp(-(u * u + v * v) / 1.3); add(k + v * w + u, a * f, a * .92 * f, a * .7 * f); }
    }
    return { w, h, data };
  }
  return { w, h, frame };
}
