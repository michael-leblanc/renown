// The kit for code-made screen art (D240): everything a screen script needs except the screen's own layout.
// A screen piece is drawn K times bigger than it ends up, as hard-edged shapes and textures, then shrunk: that gives the soft edges.
// Shapes take the same numbers as the Python draft they were ported from (Pillow's drawing calls) and fill the same pixels,
// so a piece comes out the same as in the picture Michael agreed to. Example: scripts/art/ui/character_screen.mjs.
// No package needed.

export const K = 3;                                    // everything is drawn K times bigger, then shrunk

/* ---------- noise ---------- */
// The draft's noise came from numpy's seeded generator (a Mersenne Twister). This is the same generator, so the grain falls in the same places.
function twister(seed) {
  const mt = new Uint32Array(624); let at = 624; mt[0] = seed >>> 0;
  for (let i = 1; i < 624; i++) { const s = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(s, 1812433253) + i) >>> 0; }
  return () => {
    if (at === 624) { for (let k = 0; k < 624; k++) { const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff); mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); } at = 0; }
    let y = mt[at++]; y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18; return y >>> 0;
  };
}
const G = (() => { const next = twister(7), g = new Float64Array(512 * 512); for (let i = 0; i < g.length; i++) { const a = next() >>> 5, b = next() >>> 6; g[i] = (a * 67108864 + b) / 9007199254740992; } return g; })();
/** The 512 x 512 grid of random values (0 to 1) the noise is smoothed from: the main menu writes it as a piece for the game's shader. */
export const NOISE = G;
/** Smooth noise, 0 to 1, the same every run. */
export function vnoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y); let fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const xa = x0 & 511, xb = (x0 + 1) & 511, ya = (y0 & 511) << 9, yb = ((y0 + 1) & 511) << 9;
  return (G[ya + xa] * (1 - fx) + G[ya + xb] * fx) * (1 - fy) + (G[yb + xa] * (1 - fx) + G[yb + xb] * fx) * fy;
}

/* ---------- where a piece is drawn ---------- */
/** A part of the screen to draw in: x, y, w, h in the screen's own pixels, plus `pad` spare pixels all round (blur and shrinking need room).
 *  Inside, x, y, w, h are in big pixels (K to one). */
export const area = (x, y, w, h, pad = 0) => ({ x: (x - pad) * K, y: (y - pad) * K, w: (w + 2 * pad) * K, h: (h + 2 * pad) * K, pad });
/** A mask over an area: 255 where a shape is, 0 elsewhere. */
export const mask = A => ({ ...A, m: new Uint8Array(A.w * A.h) });
/** A picture over an area: c holds red, green, blue (0 to 255) for every big pixel, a how solid it is (0 to 1). */
export const layer = A => ({ ...A, c: new Float32Array(A.w * A.h * 3), a: new Float32Array(A.w * A.h) });
/** Calls f(x, y, i) for every big pixel of an area: x, y in the screen's big pixels, i its place in the area's arrays. */
export function each(A, f) { for (let j = 0, i = 0; j < A.h; j++) for (let k = 0; k < A.w; k++, i++) f(A.x + k, A.y + j, i); }

/* ---------- shapes: all in big pixels, with both ends counted (Pillow's way) ---------- */
function span(M, xa, y, xb, v) { if (y < M.y || y >= M.y + M.h) return; xa = Math.max(xa, M.x); xb = Math.min(xb, M.x + M.w - 1); for (let x = xa; x <= xb; x++) M.m[(y - M.y) * M.w + x - M.x] = v; }
const T = Math.trunc;
/** A filled box. */
export function box(M, x0, y0, x1, y1, v = 255) { x0 = T(x0); y0 = T(y0); x1 = T(x1); y1 = T(y1); for (let y = Math.max(y0, M.y); y <= Math.min(y1, M.y + M.h - 1); y++) span(M, x0, y, x1, v); }
/** A box's outline, `wd` thick, drawn inwards. */
export function boxLine(M, x0, y0, x1, y1, wd, v = 255) { x0 = T(x0); y0 = T(y0); x1 = T(x1); y1 = T(y1); box(M, x0, y0, x1, y0 + wd - 1, v); box(M, x0, y1 - wd + 1, x1, y1, v); box(M, x0, y0, x0 + wd - 1, y1, v); box(M, x1 - wd + 1, y0, x1, y1, v); }

// One quarter of an ellipse's edge, walked a pixel at a time (in half pixels from the middle): for each row, the nearest and the furthest edge pixel.
function quarter(a, b) {
  const rows = new Map(); if (a < 0 || b < 0) return rows;
  const a2 = a * a, b2 = b * b, delta = (x, y) => Math.abs(a2 * y * y + b2 * x * x - a2 * b2);
  let cx = a, cy = b % 2; const ex = a % 2, ey = b;
  for (; ;) {
    const r = rows.get(cy); if (r) { r[0] = Math.min(r[0], cx); r[1] = Math.max(r[1], cx); } else rows.set(cy, [cx, cx]);
    if (cx === ex && cy === ey) break;
    let nx = cx, ny = cy + 2, nd = delta(nx, ny);
    if (nx > 1) { let d = delta(cx - 2, cy + 2); if (nd > d) { nx = cx - 2; ny = cy + 2; nd = d; } d = delta(cx - 2, cy); if (nd > d) { nx = cx - 2; ny = cy; } }
    cx = nx; cy = ny;
  }
  return rows;
}
/** An ellipse in the box x0, y0 to x1, y1: filled (no `wd`), or a ring `wd` thick drawn inwards.
 *  `keep(dx, dy)` can cut it: it is asked about each pixel, as half pixels from the middle. */
export function ellipse(M, x0, y0, x1, y1, wd = 0, v = 255, keep = null) {
  x0 = T(x0); y0 = T(y0); x1 = T(x1); y1 = T(y1); const a = x1 - x0, b = y1 - y0; if (a < 0 || b < 0) return;
  const out = quarter(a, b), inn = wd ? quarter(a - 2 * (wd - 1), b - 2 * (wd - 1)) : new Map(), left = a % 2;
  for (const [cy, [, r]] of out) {
    const l = inn.has(cy) ? inn.get(cy)[0] : left;
    for (const sy of cy ? [-1, 1] : [1]) for (const [xa, xb] of l > 0 ? [[-r, -l], [l, r]] : [[-r, r]]) {
      const y = y0 + (sy * cy + b) / 2;
      if (!keep) span(M, x0 + (xa + a) / 2, y, x0 + (xb + a) / 2, v);
      else for (let X = xa; X <= xb; X += 2) if (keep(X, sy * cy)) span(M, x0 + (X + a) / 2, y, x0 + (X + a) / 2, v);
    }
  }
}
/** Part of an ellipse's ring, from angle `from` to angle `to` (degrees, clockwise from 3 o'clock). */
export function arc(M, x0, y0, x1, y1, from, to, wd, v = 255) {
  const a = T(x1) - T(x0), b = T(y1) - T(y0), side = d => { const t = d * Math.PI / 180; return [-a * Math.sin(t), b * Math.cos(t), (a * a - b * b) * Math.sin(2 * t) / 2]; };
  const s = side(from), e = side(to);
  const turn = (dx, dy) => (Math.atan2(dy / b, dx / a) * 180 / Math.PI + 360) % 360;       // the ends are cut square to the ring; `turn` keeps the far side of the ellipse out
  ellipse(M, x0, y0, x1, y1, wd, v, (dx, dy) => s[0] * dx + s[1] * dy + s[2] >= 0 && e[0] * dx + e[1] * dy + e[2] <= 0 && turn(dx, dy) > from - 45 && turn(dx, dy) < to + 45);
}
/** A box with round corners of radius r: filled (no `wd`), or its outline `wd` thick. */
export function roundBox(M, x0, y0, x1, y1, r, wd = 0, v = 255) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const d = 2 * r;
  for (const [cx, cy, qx, qy] of [[x0, y0, -1, -1], [x1 - d, y0, 1, -1], [x1 - d, y1 - d, 1, 1], [x0, y1 - d, -1, 1]]) ellipse(M, cx, cy, cx + d, cy + d, wd, v, (dx, dy) => dx * qx >= 0 && dy * qy >= 0);
  if (!wd) { box(M, x0 + r + 1, y0, x1 - r - 1, y1, v); box(M, x0, y0 + r + 1, x0 + r, y1 - r - 1, v); box(M, x1 - r, y0 + r + 1, x1, y1 - r - 1, v); }
  else { box(M, x0 + r + 1, y0, x1 - r - 1, y0 + wd - 1, v); box(M, x0 + r + 1, y1 - wd + 1, x1 - r - 1, y1, v); box(M, x0, y0 + r + 1, x0 + wd - 1, y1 - r - 1, v); box(M, x1 - wd + 1, y0 + r + 1, x1, y1 - r - 1, v); }
}
/** A filled shape with straight sides: pts is [[x, y], ...]. */
export function poly(M, pts, v = 255) {
  const f = Math.fround, P = pts.map(p => [T(p[0]), T(p[1])]), E = []; let ymin = Infinity, ymax = -Infinity;
  P.forEach(([xa, ya], i) => {
    const [xb, yb] = P[(i + 1) % P.length], e = { x0: xa, y0: ya, ymin: Math.min(ya, yb), ymax: Math.max(ya, yb), dx: ya === yb ? 0 : f((xb - xa) / (yb - ya)) };
    ymin = Math.min(ymin, e.ymin); ymax = Math.max(ymax, e.ymax);
    if (ya === yb) span(M, Math.min(xa, xb), ya, Math.max(xa, xb), v); else E.push(e);
  });
  const at = (e, y) => f(f((y - e.y0) * e.dx) + e.x0), up = x => x >= 0 ? Math.floor(f(x + .5)) : -Math.floor(f(Math.abs(x) + .5)), down = x => x >= 0 ? Math.ceil(f(x - .5)) : -Math.ceil(f(Math.abs(x) - .5));
  for (let y = Math.max(ymin, 0); y <= ymax; y++) {
    const xx = [];
    E.forEach((c, i) => {
      if (y < c.ymin || y > c.ymax) return;
      xx.push(at(c, y)); const j = xx.length;
      if (y === c.ymax && y < ymax) xx.push(xx[j - 1]);
      else if (c.dx !== 0 && j % 2 === 1 && Math.round(xx[j - 1]) === xx[j - 1]) for (let k = 0; k < i; k++) {     // two sides that meet at a corner: no gap between them
        const o = E[k]; if ((c.dx > 0 && o.dx <= 0) || (c.dx < 0 && o.dx >= 0)) continue;
        if (xx[j - 1] !== at(o, y)) continue;
        const off = y === ymax ? -1 : 1, p = at(c, y + off), q = at(o, y + off);
        if (y === c.ymax) xx[k] = c.dx > 0 ? Math.max(p, q) + 1 : Math.min(p, q) - 1; else xx[k] = c.dx > 0 ? Math.min(p, q) : Math.max(p, q) + 1;
        break;
      }
    });
    xx.sort((p, q) => p - q);
    for (let i = 1; i < xx.length; i += 2) span(M, up(xx[i - 1]), y, down(xx[i]), v);
  }
}
/** A straight line `wd` thick. */
export function line(M, x0, y0, x1, y1, wd, v = 255) {
  x0 = T(x0); y0 = T(y0); x1 = T(x1); y1 = T(y1); const dx = x1 - x0, dy = y1 - y0, big = Math.hypot(dx, dy), small = (wd - 1) / 2;
  const up = x => x >= 0 ? Math.floor(x + .5) : -Math.floor(Math.abs(x) + .5), down = x => x >= 0 ? Math.ceil(x - .5) : -Math.ceil(Math.abs(x) - .5);
  const rmax = up(small) / big, rmin = down(small) / big, dxmin = down(rmin * dy), dxmax = down(rmax * dy), dymin = up(rmin * dx), dymax = up(rmax * dx);
  poly(M, [[x0 - dxmin, y0 + dymax], [x1 - dxmin, y1 + dymax], [x1 + dxmax, y1 - dymin], [x0 + dxmax, y0 - dymin]], v);
}

/* ---------- blur, shrink ---------- */
/** A mask blurred by `radius` big pixels (Pillow's Gaussian blur: three box blurs each way). Returns a new array, 0 to 255. */
export function blur(m, w, h, radius) {
  const s2 = radius * radius / 3, L = Math.sqrt(12 * s2 + 1), l = Math.floor((L - 1) / 2), fr = l + (2 * l + 1) * (l * (l + 1) - 3 * s2) / (6 * (s2 - (l + 1) * (l + 1)));
  const r = Math.trunc(fr), ww = Math.trunc(16777216 / (fr * 2 + 1)), fw = Math.trunc((16777216 - (r * 2 + 1) * ww) / 2);
  const pass = (src, n, step, from) => {                // one box blur along a row or a column, in place
    const tmp = new Float64Array(n); for (let i = 0; i < n; i++) tmp[i] = src[from + i * step];
    const g = i => tmp[i < 0 ? 0 : i >= n ? n - 1 : i]; let acc = 0; for (let k = -r; k <= r; k++) acc += g(k);
    for (let i = 0; i < n; i++) { src[from + i * step] = Math.floor((acc * ww + (g(i - r - 1) + g(i + r + 1)) * fw + 8388608) / 16777216); acc += g(i + r + 1) - g(i - r); }
  };
  const out = Uint8Array.from(m);
  for (let y = 0; y < h; y++) for (let p = 0; p < 3; p++) pass(out, w, 1, y * w);
  for (let x = 0; x < w; x++) for (let p = 0; p < 3; p++) pass(out, h, w, x);
  return out;
}
const FILTERS = { lanczos: [3, x => { if (x < -3 || x >= 3) return 0; if (x === 0) return 1; const p = x * Math.PI; return Math.sin(p) / p * Math.sin(p / 3) / (p / 3); }], bicubic: [2, x => { x = Math.abs(x); return x < 1 ? (1.5 * x - 2.5) * x * x + 1 : x < 2 ? (((x - 5) * x + 8) * x - 4) * -.5 : 0; }] };
/** Resizes a picture (4 numbers a pixel: colour already multiplied by how solid it is) from w x h to W x H, the way Pillow does. */
export function resize(src, w, h, W, H, how = 'lanczos') {
  const [sup, filt] = FILTERS[how];
  const one = (from, n, N, lines, step, lineStep, outStep, outLineStep, to) => {
    const scale = n / N, fs = Math.max(scale, 1), support = sup * fs;
    for (let i = 0; i < N; i++) {
      const centre = (i + .5) * scale, lo = Math.max(0, Math.trunc(centre - support + .5)), hi = Math.min(n, Math.trunc(centre + support + .5)), wt = []; let sum = 0;
      for (let x = lo; x < hi; x++) { const v = filt((x - centre + .5) / fs); wt.push(v); sum += v; }
      for (let j = 0; j < lines; j++) for (let ch = 0; ch < 4; ch++) { let s = 0; for (let x = lo; x < hi; x++) s += from[j * lineStep + x * step + ch] * wt[x - lo]; const v = Math.round(s / sum); to[j * outLineStep + i * outStep + ch] = v < 0 ? 0 : v > 255 ? 255 : v; }      // whole numbers from 0 to 255 after each pass, as Pillow keeps them
    }
  };
  const mid = new Float32Array(W * h * 4), out = new Float32Array(W * H * 4);
  one(src, w, W, h, 4, w * 4, 4, W * 4, mid); one(mid, h, H, W, W * 4, 4, W * 4, 4, out);
  return out;
}
/** A finished layer shrunk to the screen's own pixels, its spare margin cut off: { w, h, data } with data as RGBA bytes. */
export function shrink(Lr) {
  const pre = new Float32Array(Lr.w * Lr.h * 4);
  for (let i = 0; i < Lr.w * Lr.h; i++) { const a = Lr.a[i]; pre[i * 4] = Lr.c[i * 3] * a; pre[i * 4 + 1] = Lr.c[i * 3 + 1] * a; pre[i * 4 + 2] = Lr.c[i * 3 + 2] * a; pre[i * 4 + 3] = a * 255; }
  const W = Lr.w / K, H = Lr.h / K, small = resize(pre, Lr.w, Lr.h, W, H), p = Lr.pad, w = W - 2 * p, h = H - 2 * p, data = Buffer.alloc(w * h * 4), c8 = v => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y + p) * W + x + p) * 4, d = (y * w + x) * 4, a = c8(small[s + 3]);
    if (a) { const k = 255 / Math.min(255, small[s + 3]); data[d] = c8(small[s] * k); data[d + 1] = c8(small[s + 1] * k); data[d + 2] = c8(small[s + 2] * k); data[d + 3] = a; }
  }
  return { w, h, data };
}

/* ---------- textures and metal ---------- */
const clip = v => v < 0 ? 0 : v > 255 ? 255 : v;
/** Fills a layer (where `on(x, y)` says so, or everywhere) with a flat colour plus two sizes of smooth noise. */
export function texture(Lr, rgb, on = null, big = [14, 12], fine = [2, 8]) {
  each(Lr, (x, y, i) => {
    if (on && !on(x, y)) return;
    const n = (vnoise(x / (big[0] * K), y / (big[0] * K)) - .5) * big[1] + (vnoise(x / (fine[0] * K), y / (fine[0] * K)) - .5) * fine[1];
    for (let c = 0; c < 3; c++) Lr.c[i * 3 + c] = Math.floor(clip(rgb[c] + n)); Lr.a[i] = 1;
  });
}
export const METALS = {                                // pale to dark
  bronze: [[250, 222, 160], [214, 170, 98], [160, 112, 52], [96, 62, 26], [52, 32, 14]],
  steel: [[200, 200, 196], [130, 130, 126], [80, 80, 78], [44, 44, 44], [18, 18, 18]],
};
/** A mask as brushed metal lit from the top left, with a dark rim: a new layer over the mask's area.
 *  `full` is the whole screen's size in its own pixels: the metal is paler at the screen's top than at its bottom.
 *  `wear` (0 to 1) adds blotches and fine scratches. */
export function metal(M, kind, full, wear = 0) {
  const Lr = layer(M), { w, h, m } = M, ramp = METALS[kind], soft = blur(m, w, h, 2 * K), W = full[0] * K, H = full[1] * K;
  const at = (a, x, y) => a[(y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)];
  each(M, (X, Y, i) => {
    if (!m[i]) return;
    const x = X - M.x, y = Y - M.y, ys = Y / (H - 1), t = Math.min(1, Math.max(0, .15 + .75 * ys + .08 * Math.sin(ys * 14 + 3 * X / (W - 1))));
    const k = Math.min(ramp.length - 2, Math.floor(t * (ramp.length - 1))), f = t * (ramp.length - 1) - k;
    const gx = (at(soft, x + 1, y) - at(soft, x - 1, y)) / (x === 0 || x === w - 1 ? 1 : 2) / 255, gy = (at(soft, x, y + 1) - at(soft, x, y - 1)) / (y === 0 || y === h - 1 ? 1 : 2) / 255;
    let rim = 255; for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) rim = Math.min(rim, at(m, x + c, y + b));
    const lit = (1 + Math.min(.9, Math.max(-.6, -(gx * .7 + gy) * 18 * K / 3))) * (.55 + .45 * rim / 255);
    const worn = wear ? (1 - wear) + wear * (vnoise(X / (5 * K), Y / (5 * K)) * .6 + vnoise(X / (1.3 * K), Y / (1.3 * K)) * .4) : 1, scratch = wear && vnoise(X / (40 * K), Y / (.6 * K)) > .82 ? 21 : 0;
    for (let c = 0; c < 3; c++) { const v = Math.floor(clip((ramp[k][c] * (1 - f) + ramp[k + 1][c] * f) * lit)); Lr.c[i * 3 + c] = wear ? Math.floor(clip(v * worn + scratch)) : v; }
    Lr.a[i] = 1;
  });
  return Lr;
}
/** The soft shadow a mask's shape throws, one pixel right and two down: a new black layer. */
export function shadow(M, strength = .9) {
  const Lr = layer(M), soft = blur(M.m, M.w, M.h, 2 * K);
  for (let y = 2 * K; y < M.h; y++) for (let x = K; x < M.w; x++) Lr.a[y * M.w + x] = Math.round(soft[(y - 2 * K) * M.w + x - K] * strength) / 255;
  return Lr;
}
/** Puts layer `top` over layer `under` (same area), changing `under`. */
export function over(under, top) {
  for (let i = 0; i < under.a.length; i++) {
    const sa = top.a[i]; if (!sa) continue; const da = under.a[i] * (1 - sa), a = sa + da;
    for (let c = 0; c < 3; c++) under.c[i * 3 + c] = (top.c[i * 3 + c] * sa + under.c[i * 3 + c] * da) / a; under.a[i] = a;
  }
  return under;
}
