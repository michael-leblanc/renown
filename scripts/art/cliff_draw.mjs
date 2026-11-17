// Draws a row of Oldscar's cliff pieces (cliff_pieces.mjs) on worker threads, in rows of 8 px.
//   draw(arr, first, count, ss) → { out, so, HX, GX, SW, SH, AX, AY }: the pixels of pieces first .. first+count-1 (the others are only there for shadows and edges).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { setCanvas, setLong, setNoiseX, trace, finish } from './cliffkit.mjs';
import { build, P, TOP } from './cliff_pieces.mjs';
export const SOFT = 1.2;      // the shadow's soft edge counts only this near the surface (cliffkit setLong)

/** The canvas for pieces first .. first+count-1. Linear in first with whole numbers, so a piece drawn alone lands on the same pixels as in a row. */
export function frame(first, count) {
  const xa = first * P, xb = (first + count) * P;
  const AX = Math.round(-64 * (xa - .4 - 2.9)) + 4, AY = Math.round(-32 * (xa - 5.9) + 78.4 * (TOP + .1)) + 4;
  const SW = Math.ceil(64 * ((xb + .4 + 5.5) - (xa - .4 - 2.9))) + 8, SH = Math.ceil(32 * (xb + .4 + 2.9) + AY) + 8;
  return { AX, AY, SW, SH };
}
const setup = (arr, f) => { const { S, noiseX } = build(arr); setCanvas(f.SW, f.SH, f.AX, f.AY); setLong(11, .07, SOFT); setNoiseX(noiseX); return S; };

if (!isMainThread) {
  const { arr, f, ss } = workerData, S = setup(arr, f);
  parentPort.on('message', ([y0, y1]) => { const r = trace(S, 'S', ss, y0, y1); parentPort.postMessage({ y0, r }, [r.img.buffer, r.shad.buffer, r.GB.buffer, r.HX.buffer, r.GX.buffer]); });
}

export function draw(arr, first, count, ss = 2) {
  const f = frame(first, count), STEP = 8, jobs = []; for (let y = 0; y < f.SH; y += STEP) jobs.push([y, Math.min(f.SH, y + STEP)]);
  const parts = new Map(), nw = Math.max(1, availableParallelism());
  return new Promise(res => {
    let live = nw;
    for (let w = 0; w < nw; w++) {
      const wk = new Worker(new URL(import.meta.url), { workerData: { arr, f, ss } });
      const next = () => { const j = jobs.shift(); if (j) wk.postMessage(j); else { wk.terminate(); if (--live === 0) { setup(arr, f); const r = finish([...parts.keys()].sort((a, b) => a - b).map(k => parts.get(k))); res({ ...r, ...f }); } } };
      wk.on('message', ({ y0, r }) => { parts.set(y0, r); next(); }); next();
    }
  });
}
