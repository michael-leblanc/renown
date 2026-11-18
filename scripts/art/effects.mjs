// Code-made effects the game draws over the world (not props, not items), with the kit's camera, light and colours.
//   node scripts/art/effects.mjs [--out prototype/art/made/effects]
// Arrow Flight.png: one arrow in the air, the arrow the item 'Arrows' shows (items.mjs), pointing right across the picture, its
// middle at 128,128 of a 256 x 256 picture and no shadow. The client turns it to point from the archer to the target as it flies
// (D163: nothing in the Creator or the tileset flies to a target); a thin arrow turned that way still reads.
import { render, SIZE } from './kit.mjs';
import { arrows, box } from './items.mjs';
import { writePng } from './png.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const out = flag('--out', 'prototype/art/made/effects');

/** The same picture moved so that the middle of what is drawn is at 128,128. */
const centred = buf => {
  const [x, y, w, h] = box(buf), dx = 128 - (x + (w >> 1)), dy = 128 - (y + (h >> 1)), o = Buffer.alloc(buf.length);
  for (let r = 0; r < h; r++) buf.copy(o, ((y + r + dy) * SIZE + x + dx) * 4, ((y + r) * SIZE + x) * 4, ((y + r) * SIZE + x + w) * 4);
  return o;
};

// one arrow along the picture's width: (x - z) runs straight across, so the arrow points at -45 degrees in x and z, raised off the ground
const one = arrows([[0, 0, -Math.PI / 4, 0]]);
const FLIGHT = { ...one, H: .6, bound: [.4, .45, .4], boundZ: 0, cast: () => 9, sdf: (x, y, z) => one.sdf(x, y - .35, z) };

const pic = centred(render(FLIGHT, 'S', 3).out), b = box(pic);
writePng(`${out}/Arrow Flight.png`, pic, SIZE, SIZE);
console.log(`Arrow Flight: ${b[2]} x ${b[3]} px, into ${out}`);
