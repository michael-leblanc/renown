// Lists the colours a tileset piece uses most, dark to pale: the starting point for a new colour ramp in kit.mjs.
// Usage, from the repo root: node scripts/art/colours.mjs "Door A1_S" [how many, default 12]
import { readPng } from './png.mjs';
import { existsSync } from 'node:fs';

const name = process.argv[2], many = +(process.argv[3] || 12);
const path = ['prototype/art/tiles/', 'prototype/art/made/'].map(d => `${d}${name}.png`).find(existsSync);
if (!path) { console.error(`Usage: node scripts/art/colours.mjs "<piece>" [how many]. No ${name}.png in prototype/art/tiles/ or prototype/art/made/`); process.exit(1); }
const { data } = readPng(path), count = new Map();
for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) { const k = (data[i] >> 2 << 16) | (data[i + 1] >> 2 << 8) | (data[i + 2] >> 2); count.set(k, (count.get(k) || 0) + 1); }   // near-equal colours counted together
const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, many).map(([k, n]) => ({ rgb: [(k >> 16) << 2, ((k >> 8) & 255) << 2, (k & 255) << 2], n }));
top.sort((a, b) => (.3 * a.rgb[0] + .59 * a.rgb[1] + .11 * a.rgb[2]) - (.3 * b.rgb[0] + .59 * b.rgb[1] + .11 * b.rgb[2]));
for (const { rgb, n } of top) console.log('#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('') + '  ' + n + ' px');
