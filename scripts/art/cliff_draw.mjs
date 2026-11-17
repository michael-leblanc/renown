// Draws a row of Oldscar's cliff pieces (cliff_pieces.mjs) on worker threads, in rows of 8 px.
//   draw(arr, first, count, ss, zoom) → { out, so, HX, HZ, GX, SW, SH, AX, AY }: the pixels of pieces first .. first+count-1 (the others are only there for shadows and edges).
//   A row with a bend in it ("U V") is drawn whole, on a canvas round all of it.
//   drawScene(scene, f, ss): any scene on canvas f (frameOf): { arr } a row, { top: box } the tall cliff's top tile (buildTop), { arr, behind: z } a row with the top carried on behind it to z (buildBehind).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { setCanvas, setLong, setNoiseX, setZoom, setSettle, trace, finish } from './cliffkit.mjs';
import { build, buildTop, buildBehind, P, HIGH, BACK } from './cliff_pieces.mjs';
export const SOFT = 1.2;      // the shadow's soft edge counts only this near the surface (cliffkit setLong)

/** The canvas for pieces first .. first+count-1. Linear in first with whole numbers, so a piece drawn alone lands on the same pixels as in a row. */
export function frame(first, count, zoom = 1) {
  const xa = first * P, xb = (first + count) * P, k = zoom;
  const AX = Math.round(-64 * k * (xa - .4 - 2.9)) + 4, AY = Math.round(-32 * k * (xa - 5.9 - (BACK - 5.5)) + 78.4 * k * (HIGH + .05)) + 4;
  const SW = Math.ceil(64 * k * ((xb + .4 + 5.5 + (BACK - 5.5)) - (xa - .4 - 2.9))) + 8, SH = Math.ceil(32 * k * (xb + .4 + 2.9) + AY) + 8;
  return { AX, AY, SW, SH, zoom };
}
/** The canvas for a whole row that bends (a "U V" in it): the world box round it, seen through the camera. */
export function frameBox(arr, zoom = 1) {
  const [x0, x1, , , z0, z1] = build(arr).S.box, k = zoom;
  const AX = Math.round(-64 * k * (x0 - z1)) + 4, AY = Math.round(-32 * k * (x0 + z0) + 78.4 * k * (HIGH + .05)) + 4;
  return { AX, AY, SW: Math.ceil(64 * k * ((x1 - z0) - (x0 - z1))) + 8, SH: Math.ceil(32 * k * (x1 + z1) + AY) + 8, zoom };
}
/** A canvas round the world points of a box [x0, x1, y0, y1, z0, z1], seen through the camera (one unit along x: 64 px right and 32 down; along z: 64 left and 32 down; up: 78.4 px). AX and AY are whole numbers, so any two canvases put a world point on the same place in their pixels, shifted by whole pixels. */
export function frameOf([x0, x1, y0, y1, z0, z1], zoom = 1) {
  const k = zoom, sx = [], sy = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) { sx.push(64 * k * (x - z)); sy.push(32 * k * (x + z) - 78.4 * k * y); }
  const AX = Math.round(-Math.min(...sx)) + 4, AY = Math.round(-Math.min(...sy)) + 4;
  return { AX, AY, SW: Math.ceil(Math.max(...sx)) + AX + 4, SH: Math.ceil(Math.max(...sy)) + AY + 4, zoom };
}
const scene = sc => sc.top ? { S: buildTop(sc.top), noiseX: null } : sc.behind !== undefined ? buildBehind(sc.arr, sc.behind) : build(sc.arr);
const setup = (sc, f) => { const { S, noiseX } = scene(sc); setCanvas(f.SW, f.SH, f.AX, f.AY); setZoom(f.zoom); setLong(11, .07, SOFT); setNoiseX(noiseX); if (process.env.CLIFF_TALL === '1') setSettle(60, 1e-12); return S; };

if (!isMainThread) {
  const { sc, f, ss } = workerData, S = setup(sc, f);
  parentPort.on('message', ([y0, y1]) => { const r = trace(S, 'S', ss, y0, y1); parentPort.postMessage({ y0, r }, [r.img.buffer, r.shad.buffer, r.GB.buffer, r.HX.buffer, r.HZ.buffer, r.GX.buffer]); });
}

export function draw(arr, first, count, ss = 2, zoom = 1) { return drawScene({ arr }, arr.includes('U') ? frameBox(arr, zoom) : frame(first, count, zoom), ss); }
export function drawScene(sc, f, ss = 2) {
  const STEP = 8, jobs = []; for (let y = 0; y < f.SH; y += STEP) jobs.push([y, Math.min(f.SH, y + STEP)]);
  const parts = new Map(), nw = Math.max(1, availableParallelism());
  return new Promise(res => {
    let live = nw;
    for (let w = 0; w < nw; w++) {
      const wk = new Worker(new URL(import.meta.url), { workerData: { sc, f, ss } });
      const next = () => { const j = jobs.shift(); if (j) wk.postMessage(j); else { wk.terminate(); if (--live === 0) { setup(sc, f); const r = finish([...parts.keys()].sort((a, b) => a - b).map(k => parts.get(k))); res({ ...r, ...f }); } } };
      wk.on('message', ({ y0, r }) => { parts.set(y0, r); next(); }); next();
    }
  });
}
