// Compares the PNGs of two folders pixel by pixel (the decoded RGBA, not the files' bytes): the proof that a change to the
// art scripts changed no picture.
//   node scripts/art/pixdiff.mjs <folder a> <folder b>          # every PNG of a against the one of the same name in b
//   node scripts/art/pixdiff.mjs <folder a> <folder b> --both   # also a failure if b has a PNG that a lacks
// Prints one line per picture that differs (how many pixels, the biggest step in a channel), then the totals. Exit 1 on a difference
// or a picture missing in b. Not looked into: sub-folders.
import { readdirSync, existsSync } from 'node:fs';
import { readPng } from './png.mjs';

const [a, b] = process.argv.slice(2).filter(x => !x.startsWith('--')), both = process.argv.includes('--both');
if (!a || !b) { console.error('usage: node scripts/art/pixdiff.mjs <folder a> <folder b> [--both]'); process.exit(2); }
const pngs = d => readdirSync(d).filter(f => f.endsWith('.png')).sort();
let same = 0, differ = 0, missing = 0, pixels = 0;
for (const f of pngs(a)) {
  if (!existsSync(`${b}/${f}`)) { console.log(`missing in ${b}: ${f}`); missing++; continue; }
  const p = readPng(`${a}/${f}`), q = readPng(`${b}/${f}`); pixels += p.width * p.height;
  if (p.width !== q.width || p.height !== q.height) { console.log(`${f}: ${p.width} x ${p.height} against ${q.width} x ${q.height}`); differ++; continue; }
  let n = 0, big = 0;
  for (let i = 0; i < p.data.length; i += 4) { let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(p.data[i + k] - q.data[i + k])); if (d) { n++; big = Math.max(big, d); } }
  if (n) { console.log(`${f}: ${n} pixels differ, by up to ${big} of 255`); differ++; } else same++;
}
if (both) for (const f of pngs(b)) if (!existsSync(`${a}/${f}`)) { console.log(`missing in ${a}: ${f}`); missing++; }
console.log(`${same} pictures the same pixel for pixel (${pixels.toLocaleString('en')} pixels compared), ${differ} differ, ${missing} missing`);
process.exit(differ || missing ? 1 : 0);
