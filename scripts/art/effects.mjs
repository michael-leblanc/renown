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

/* ---------- the waking glow (D89): a newly woken character can't be harmed, and everyone sees it ----------
   Two strips of GLOW_FRAMES frames, each frame 256 x 256 with the tile's middle at 128,208 like a prop, played in a loop at GLOW_FPS:
     Waking Glow.png        a pale gold ring on the ground round the feet, a faint light inside it, three bright points running round
                            it; drawn under the character
     Waking Glow Front.png  motes of light rising past the character and fading; drawn over it
   Hard pixels in a few steps of light, like the rest of the art; no blur. The client stops drawing both the moment the protection ends
   (D73). The tileset's own effects were not looked at for this (they are on the Mac, unpacked only in part). */
export const GLOW_FRAMES = 8, GLOW_FPS = 8;
const GOLD = [[201, 160, 70], [241, 212, 110], [255, 240, 180]];       // dim, glow, bright
const RING = .36, MOTES = 9, RISE = 84;                                  // ring radius in tiles; motes; how high a mote rises, in px
const ground = (x, z) => [128 + (x - z) * 64, 208 + (x + z) * 32];      // a point on the ground to its pixel
const step = a => a < .12 ? 0 : a < .3 ? .25 : a < .55 ? .45 : a < .8 ? .7 : .9;   // light in a few hard steps
function frames(draw) {
  const strip = Buffer.alloc(GLOW_FRAMES * SIZE * SIZE * 4), W = GLOW_FRAMES * SIZE;
  for (let f = 0; f < GLOW_FRAMES; f++) {
    const plot = (x, y, c, a) => {
      x = Math.round(x); y = Math.round(y); a = step(a); if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || !a) return;
      const o = (y * W + f * SIZE + x) * 4; if (strip[o + 3] >= a * 255) return;
      strip[o] = c[0]; strip[o + 1] = c[1]; strip[o + 2] = c[2]; strip[o + 3] = Math.round(a * 255);
    };
    draw(f / GLOW_FRAMES, plot);
  }
  return strip;
}
const glowRing = frames((t, plot) => {
  const breath = .5 + .5 * Math.sin(t * 6.2832);
  for (let py = 160; py < 240; py++) for (let px = 60; px < 196; px++) {
    // back from the pixel to the ground: x - z and x + z
    const u = (px + .5 - 128) / 64, v = (py + .5 - 208) / 32, x = (u + v) / 2, z = (v - u) / 2, r = Math.hypot(x, z), ang = Math.atan2(z, x);
    const edge = Math.abs(r - RING);
    if (edge < .035) {
      let a = .55 + .2 * breath, c = GOLD[1];
      for (let k = 0; k < 3; k++) { const d = Math.abs(((ang / 6.2832 - t - k / 3) % 1 + 1.5) % 1 - .5); if (d < .045) { a = .95; c = GOLD[2]; } }   // three bright points running round
      plot(px, py, c, a);
    } else if (r < RING) plot(px, py, GOLD[2], (.16 + .1 * breath) * (1 - r / RING * .45));                               // faint pale light inside, brighter toward the middle
  }
});
const glowMotes = frames((t, plot) => {
  for (let k = 0; k < MOTES; k++) {
    const ph = (t + k / MOTES + .37 * h(k)) % 1, ang = 6.2832 * h(k + 11), [gx, gy] = ground(RING * .9 * Math.cos(ang), RING * .9 * Math.sin(ang));
    const y = gy - 6 - ph * RISE, x = gx + 3 * Math.sin(ph * 6.2832 + k), a = Math.sin(Math.PI * ph) * .95;
    for (const [dx, dy, k2] of [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1], [0, 2, .5], [1, 2, .5], [0, 3, .25]]) plot(x + dx, y + dy, a > .7 && k2 === 1 ? GOLD[2] : GOLD[1], a * k2);   // a 2 px mote with a short tail below it
  }
});
function h(k) { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
writePng(`${out}/Waking Glow.png`, glowRing, GLOW_FRAMES * SIZE, SIZE);
writePng(`${out}/Waking Glow Front.png`, glowMotes, GLOW_FRAMES * SIZE, SIZE);
console.log(`Waking Glow, Waking Glow Front: ${GLOW_FRAMES} frames of ${SIZE} px each, ${GLOW_FPS} a second, into ${out}`);
