// Balance check of a skill web: every choice of named nodes, its cheapest route, the best use of spare points, duel and group numbers.
// Usage: node scripts/sim/web-check.mjs <Skill> [all|builds|named]   ·   node scripts/sim/web-check.mjs stack
import { mk, winRate, needed, GEAR, ORDINARY, TOP } from './sim.mjs';
import { WEBS, isNamed } from '../art/ui/skills_web.mjs';

const POINTS = 20, pct = v => Math.round(v * 100);
const subsets = (arr, k) => k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map(r => [x, ...r]));
// Who a skill is checked with: its own gear, the same character with no nodes across from it, and the top for the group check.
const SETUP = {
  weapon: { gear: GEAR, top: TOP },
  Unarmed: { gear: { 'bare v leather': { dmg: [2, 5], armour: 1 }, 'bare v steel': { dmg: [2, 5], armour: 4 } }, top: mk({ skill: 100, dodge: 100, dmg: [2, 5], armour: 1 }) },
  Shield: { gear: { 'bronze v leather, both shields': { dmg: [3, 7], armour: 1, shield: 100 }, 'steel v steel, both shields': { dmg: [7, 11], armour: 4, shield: 100 } }, top: TOP },
  Dodge: { gear: { 'bronze v leather': GEAR['bronze v leather'] }, top: mk({ ...TOP, armour: 1 }) },   // dodge nodes work only without metal armour (rule 6)
};
const setupOf = s => SETUP[s] || SETUP.weapon;

export function analyse(skill) {
  const W = WEBS[skill], N = Object.fromEntries(W.nodes.map(([id, kind, name, text, level, rho, th, fx]) => [id, { id, kind, name, level, fx }]));
  const adj = {}; for (const [a, b] of W.links) { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); }
  const named = W.nodes.filter(n => isNamed(n[1])).map(n => n[0]), smalls = W.nodes.filter(n => n[1] === 'small' || n[1] === 'bridge').map(n => n[0]);
  const connected = set => { const seen = new Set([W.root]), todo = [W.root]; while (todo.length) for (const v of adj[todo.pop()] || []) if (set.has(v) && !seen.has(v)) { seen.add(v); todo.push(v); } return seen.size - 1 === set.size; };
  const fxOf = set => { const f = {}; for (const id of set) for (const [k, v] of Object.entries(N[id].fx)) { if (typeof v === 'boolean') f[k] = f[k] || v; else if (k === 'finAt') f[k] = v; else f[k] = (f[k] || 0) + v; } for (const k in f) if (typeof f[k] === 'number') f[k] = Math.round(f[k] * 1000) / 1000; return f; };
  const travel = ['t1', 't2', 't3', 'ex1', 'ex2', 'ex3', 'gx1', 'gx2', 'gx3'], ribs = ['ek', 'eb', 'eq', 'ef', 'gk', 'gb', 'gq', 'gf'];
  const skeletons = [];
  for (let tm = 0; tm < 512; tm++) for (let rm = 0; rm < 256; rm++) {
    const set = new Set(); travel.forEach((t, i) => { if (tm >> i & 1) set.add(t); }); ribs.forEach((r, i) => { if (rm >> i & 1) { set.add(r + '1'); set.add(r + '2'); } });
    if (set.size <= POINTS && connected(set)) skeletons.push([rm, set]);
  }
  const ribOf = id => ribs.indexOf(id[0] + id[1].toLowerCase());
  const route = T => { let need = 0; for (const t of T) need |= 1 << ribOf(t); let best = null; for (const [rm, set] of skeletons) if ((rm & need) === need && (!best || set.size < best.size)) best = set; return best; };
  // A rough score of what a small node is worth in a duel, to spend spare points well.
  const WT = { hit: 300, parry: 300, evade: 300, blockB: 250, speed: 250, bleed: 100, finHit: 75, furyHit: 60, lastStand: 30, jolt: 60, stun: 120, crush: 40, disarm: 60, trip: 80, kick: 40, rattleLen: .05, dentLen: .02, sidestep: 3, bash: 30, feint: setupOf(skill).gear[Object.keys(setupOf(skill).gear)[0]].shield ? 150 : 0 };
  const worth = (id, f) => { let s = 0; for (const [k, v] of Object.entries(N[id].fx)) s += typeof v === 'number' ? (WT[k] || 0) * v : 0; if (N[id].fx.punish && f.parry) s += 1; if (N[id].fx.answer && f.parry) s += 1; if (N[id].fx.keepMom && f.momentum) s += 1; return s; };
  function fill(base, spare) {
    let best = base, bestScore = -1; const f0 = fxOf(base), rest = smalls.filter(s => !base.has(s));
    (function go(set, left, from) {
      const score = [...set].reduce((t, id) => t + worth(id, f0), 0); if (score > bestScore) { bestScore = score; best = new Set(set); }
      if (!left) return;
      for (let i = from; i < rest.length; i++) { const id = rest[i]; if (set.has(id) || !(adj[id] || []).some(v => v === W.root || set.has(v))) continue; set.add(id); go(set, left - 1, 0); set.delete(id); }
    })(new Set(base), Math.min(spare, 3), 0);
    let set = best, left = spare - (best.size - base.size);
    while (left > 0) { const c = rest.filter(id => !set.has(id) && (adj[id] || []).some(v => v === W.root || set.has(v))).sort((a, b) => worth(b, f0) - worth(a, f0))[0]; if (!c) break; set.add(c); left--; }
    return set;
  }
  return { W, N, named, fxOf, route, fill };
}

function check(skill, mode) {
  const { W, N, named, fxOf, route, fill } = analyse(skill), S = setupOf(skill), gears = Object.entries(S.gear), G1 = gears[0][1];
  const name = T => T.map(t => N[t].name).join(', ');
  console.log(`== ${skill}: ${W.paths.e} (left) / ${W.paths.g} (right), ${W.nodes.length} nodes. Duels against the same character with no nodes: ${gears.map(g => g[0]).join(' / ')}`);
  const side = s => named.filter(t => t[0] === s), deep = s => new Set([...route(side(s)), ...side(s)]);
  const BUILDS = {};
  for (const s of ['e', 'g']) BUILDS[`old ${W.paths[s]} (4 points)`] = { fx: fxOf(new Set(side(s))) };
  for (const s of ['e', 'g']) { const d = deep(s); BUILDS[`web ${W.paths[s]}, all four + ${POINTS - d.size} spare`] = { set: fill(d, POINTS - d.size) }; }
  if (mode !== 'named') {
    const rows = [];
    for (let k = 0; k <= 4; k++) for (const T of subsets(named, k)) {
      const r = route(T), cost = T.length + r.size; if (cost > POINTS) continue;
      const full = fill(new Set([...r, ...T]), POINTS - cost); rows.push({ T, cost, full, w: winRate(mk({ ...G1, ...fxOf(full) }), mk(G1), 6000) });
    }
    rows.sort((a, b) => b.w - a.w);
    console.log('best builds of 20 points (named nodes, cost of the route, duel %):');
    for (const r of rows.slice(0, 5)) console.log('  ', name(r.T).padEnd(44), String(r.cost).padStart(3), String(pct(r.w)).padStart(5));
    const best = rows[0], split = rows.find(r => r.T.length === 4 && r.T.some(t => t[0] === 'e') && r.T.some(t => t[0] === 'g'));
    BUILDS[`web best: ${name(best.T)}`] = { set: best.full };
    if (split && split !== best) BUILDS[`web best split: ${name(split.T)}`] = { set: split.full };
  }
  for (const b of Object.values(BUILDS)) b.fx ||= fxOf(b.set);
  console.log('\nbuild'.padEnd(60), 'duel', ' '.repeat(8), 'group v it as the top (5 / 6 win %)');
  for (const [k, b] of Object.entries(BUILDS)) {
    const duel = gears.map(([, g]) => pct(winRate(mk({ ...g, ...b.fx }), mk(g), 12000))).join(' / '), n = needed(mk({ ...S.top, ...b.fx }), ORDINARY, 4000);
    console.log(k.slice(0, 58).padEnd(59), duel.padEnd(14), `need ${n.need}  (${n.out[5]} / ${n.out[6]})`);
  }
  const none = needed(S.top, ORDINARY, 4000); console.log('no nodes'.padEnd(59), '50'.padEnd(14), `need ${none.need}  (${none.out[5]} / ${none.out[6]})`);
  const web = Object.entries(BUILDS).filter(([k]) => k.startsWith('web'));
  console.log('\n20 points against 20 points (row beats column, %), ' + gears[0][0]);
  for (const [a, A] of web) console.log('  ', a.slice(0, 40).padEnd(42), web.map(([, B]) => String(pct(winRate(mk({ ...G1, ...A.fx }), mk({ ...G1, ...B.fx }), 10000))).padStart(5)).join(''));
  return BUILDS;
}

/** The stack: a top character with the deep Edge of Swords plus a full web in each of its other skills, against ordinary characters. */
function stack() {
  const pickFx = (skill, side) => { const { named, route, fill, fxOf } = analyse(skill), T = named.filter(t => t[0] === side), d = new Set([...route(T), ...T]); return fxOf(fill(d, POINTS - d.size)); };
  const SW = pickFx('Swords', 'e'), BUL = pickFx('Shield', 'e'), PRO = pickFx('Shield', 'g'), EVA = pickFx('Dodge', 'e'), ESC = pickFx('Dodge', 'g');
  const merge = (...fs) => { const o = {}; for (const f of fs) for (const [k, v] of Object.entries(f)) o[k] = typeof v === 'boolean' ? o[k] || v : k === 'finAt' ? v : (o[k] || 0) + v; return o; };
  const OE = { hit: .05, bleed: .15, speed: .15, finisher: .5 }, OB = { blockB: .05, bash: .2, stalwart: true }, OV = { evade: .05, sidestep: 5, untouch: true };
  const rows = [['no nodes', TOP], ['OLD Edge + OLD Bulwark', mk({ ...TOP, ...merge(OE, OB) })], ['OLD Edge + Bulwark + Evasion (leather)', mk({ ...TOP, armour: 1, ...merge(OE, OB, OV) })], ['Swords Edge', mk({ ...TOP, ...SW })], ['Swords Edge + Shield Bulwark', mk({ ...TOP, ...merge(SW, BUL) })], ['Swords Edge + Shield Protector', mk({ ...TOP, ...merge(SW, PRO) })],
    ['Swords Edge + Shield Bulwark + Dodge Evasion (leather)', mk({ ...TOP, armour: 1, ...merge(SW, BUL, EVA) })], ['Swords Edge + Shield Bulwark, steel (no Dodge nodes)', mk({ ...TOP, ...merge(SW, BUL) })],
    ['Swords Edge + Dodge Evasion, no shield, leather', mk({ ...TOP, shield: 0, armour: 1, ...merge(SW, EVA) })], ['Swords Edge + Dodge Escape, no shield, leather', mk({ ...TOP, shield: 0, armour: 1, ...merge(SW, ESC) })]];
  console.log('the stack: ordinary characters needed against one top character (win % for 5 / 6 / 7)');
  for (const [k, top] of rows) { const n = needed(top, ORDINARY, 4000); console.log('  ', k.padEnd(56), 'need', n.need, ` (${n.out[5]} / ${n.out[6]} / ${n.out[7] ?? 100})`); }
}

const [skill = 'Swords', mode = 'all'] = process.argv.slice(2);
if (skill === 'stack') stack(); else check(skill, mode);
