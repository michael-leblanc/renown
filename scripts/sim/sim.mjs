// Throwaway fight calculator for Renown's skill nodes (D161, D165, D171, D172, the six rules). Not for the game.
// A fighter: { skill, dodge (the Dodge skill), shield (skill, 0 = none), hp, dmg:[lo,hi], armour, swing (ticks of 0.1 s), + node effects }.
// Node effects, attacker side: hit, speed, bleed, bleedLen, finisher, finAt, finHit, flat, punish, answer, feint, first, momentum, keepMom, fury, furyHit,
//   pierce, dent, dentLen, crush, jolt, rattle, rattleLen, stun, concussion, setHit, breaker, combo, kick, trip, disarm.
// Defender side: parry, riposte, blockB, stalwart, bash, block (an absolute block chance), evade, lastStand, sidestep, untouch, roll, tough.
export const BASE = { skill: 100, dodge: 100, shield: 0, block: null, bash: 0, hp: 40, dmg: [3, 7], armour: 1, swing: 20,
  hit: 0, speed: 0, bleed: 0, bleedLen: 4, finisher: 0, finAt: .25, finHit: 0, parry: 0, riposte: false, punish: 0, answer: 0, flat: 0, first: false, feint: 0,
  momentum: 0, keepMom: false, fury: 0, furyHit: 0, pierce: 0, dent: 0, dentLen: 0, crush: 0, jolt: 0, rattle: 0, rattleLen: 0, stun: 0, concussion: 0,
  setHit: 0, breaker: 0, combo: false, kick: 0, trip: 0, disarm: 0, blockB: 0, stalwart: false, evade: 0, lastStand: 0, sidestep: 0, untouch: false, roll: false, tough: 0 };
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mk = (o = {}) => ({ ...BASE, ...o });
const swingOf = x => Math.max(1, Math.round(x.f.swing * (1 - x.f.speed - (x.hp < x.max / 2 ? x.f.fury : 0))));
function fresh(f) {
  const x = { f, hp: f.hp, max: f.hp, bleedUntil: -1, bleedNext: 0, sure: false, punish: false, answerUntil: -1, bashFree: 0,
    mom: 0, streak: 0, setUsed: false, dents: [], joltAt: -1, rattledUntil: -1, rattleAmt: 0, stunnedUntil: -1, concuss: 0, ctrlFree: 0, misses: 0, untouchReady: false, rolled: false };
  const s = swingOf(x); x.next = f.first ? 1 : 1 + Math.floor(Math.random() * s); return x;
}
/** A control effect (stun, trip): the target loses `len` ticks, then can't be controlled again for 10 s (rule 1). */
function control(d, t, len) { if (t < d.ctrlFree) return false; d.next = Math.max(d.next, t + len); d.ctrlFree = t + len + 100; return true; }
/** One attack from a on d at tick t. */
function attack(a, d, t) {
  const A = a.f, D = d.f;
  let p = .5 + .005 * (A.skill - D.dodge) + A.hit + (d.hp < d.max / 2 ? A.finHit : 0) + (a.answerUntil >= t ? A.answer : 0) + (a.hp < a.max / 2 ? A.furyHit : 0);
  p -= D.evade + (d.hp < d.max / 4 ? D.lastStand : 0) + (a.rattledUntil >= t ? a.rattleAmt : 0);
  p = clamp(p, .05, .95);
  const sure = a.sure; a.sure = false;
  const miss = () => { a.mom = 0; a.streak = 0; d.misses++; if (D.sidestep) a.next += D.sidestep; if (D.untouch && d.misses >= 2) { d.untouchReady = true; d.misses = 0; } };
  if (!sure && d.untouchReady) { d.untouchReady = false; return miss(); }
  if (!sure && Math.random() >= p) return miss();
  d.misses = 0;
  if (D.shield) {
    const b = Math.max(0, ((D.block ?? (D.stalwart ? D.shield * .006 : D.shield / 200)) + D.blockB) * (1 - A.breaker) - A.feint);
    if (Math.random() < b) {
      if (!A.keepMom) a.mom = 0; a.streak = 0;
      if (D.bash && t >= a.bashFree && Math.random() < D.bash) { a.next += 10; a.bashFree = t + 100; }
      return;
    }
  }
  if (!D.shield && D.parry && Math.random() < D.parry) { if (!A.keepMom) a.mom = 0; a.streak = 0; if (D.riposte) { d.next = t + 1; d.sure = true; } d.punish = true; d.answerUntil = t + 30; return; }
  let w = rnd(A.dmg[0], A.dmg[1]) + A.flat + (a.punish ? A.punish : 0) + a.mom; a.punish = false;
  if (A.momentum) a.mom = Math.min(A.momentum, a.mom + 1);
  if (A.setHit && !a.setUsed) { a.setUsed = true; w *= 1 + A.setHit; }
  if (A.crush && Math.random() < A.crush) w *= 1.5;
  if (A.kick && Math.random() < A.kick) w += 3;
  a.streak++; if (A.combo && a.streak % 3 === 0) w *= 2;
  if (d.stunnedUntil >= t) w *= 1 + d.concuss;
  if (A.finisher && d.hp < d.max * A.finAt) w *= 1 + A.finisher;
  d.dents = d.dents.filter(e => e >= t);
  const armour = Math.max(0, D.armour - A.pierce - d.dents.length);
  d.hp -= Math.max(1, Math.round(w) - armour - D.tough);
  if (A.dent) { d.dents.push(t + 100 + A.dentLen); d.dents.sort((x, y) => y - x); d.dents = d.dents.slice(0, A.dent); }
  if (A.bleed && Math.random() < A.bleed) { if (d.bleedUntil < t) d.bleedNext = t + 10; d.bleedUntil = t + A.bleedLen * 10; }
  const rattle = () => { if (A.rattle) { d.rattledUntil = t + 50 + A.rattleLen; d.rattleAmt = A.rattle; } };
  if (A.jolt && d.joltAt !== d.next && Math.random() < A.jolt) { d.next += 10; d.joltAt = d.next; rattle(); }            // once per swing of the target
  if (A.stun && Math.random() < A.stun && control(d, t, 20)) { d.stunnedUntil = t + 20; d.concuss = A.concussion; rattle(); }
  if (A.trip && Math.random() < A.trip) control(d, t, 15);
  if (A.disarm && Math.random() < A.disarm) d.next = Math.max(d.next, t + 30);                                              // it walks to its weapon and picks it up
  if (D.roll && !d.rolled && d.hp > 0 && d.hp < d.max / 4) { d.rolled = true; a.next = Math.max(a.next, t + 10); }          // a tile away: the attacker must step after it
}
function tickBleed(x, t) { if (x.bleedUntil >= t && t >= x.bleedNext) { x.hp -= 1; x.bleedNext = t + 10; } }
/** A duel. Returns 1 if a wins, 0 if b wins, .5 if both fall on the same tick. */
export function duel(fa, fb) {
  const a = fresh(fa), b = fresh(fb);
  for (let t = 1; t < 100000; t++) {
    tickBleed(a, t); tickBleed(b, t);
    const first = Math.random() < .5 ? [a, b] : [b, a];
    for (const [x, y] of [first, [first[1], first[0]]]) if (t >= x.next && x.hp > 0) { x.next = t + swingOf(x); attack(x, y, t); if (x.next < t + 1) x.next = t + 1; }
    if (a.hp <= 0 || b.hp <= 0) return a.hp <= 0 && b.hp <= 0 ? .5 : a.hp > 0 ? 1 : 0;
  }
  return .5;
}
export function winRate(fa, fb, n = 20000) { let s = 0; for (let i = 0; i < n; i++) s += duel(fa, fb); return s / n; }
/** A group of n against one top: the top fights one at a time, all n hit the top. Returns the group's win rate. */
export function group(top, one, n, fights = 4000) {
  let wins = 0;
  for (let k = 0; k < fights; k++) {
    const T = fresh(top), G = Array.from({ length: n }, () => fresh(one)); let target = 0;
    for (let t = 1; t < 200000; t++) {
      tickBleed(T, t); for (const x of G) if (x.hp > 0) tickBleed(x, t);
      while (target < n && G[target].hp <= 0) target++;
      if (target >= n) break;
      if (t >= T.next) { T.next = t + swingOf(T); attack(T, G[target], t); }
      for (const x of G) if (x.hp > 0 && t >= x.next) { x.next = t + swingOf(x); attack(x, T, t); if (x.next < t + 1) x.next = t + 1; }
      if (T.next < t + 1) T.next = t + 1;
      if (T.hp <= 0) { wins++; break; }
    }
  }
  return wins / fights;
}
/** How many ordinary characters it takes: the smallest group that wins at least half the time, with the win rates around it. */
export function needed(top, one, fights = 4000) { const out = {}; let need = null; for (let n = 3; n <= 14; n++) { const w = group(top, one, n, fights); out[n] = Math.round(w * 100); if (need === null && w >= .5) need = n; if (w > .97) break; } return { need, out }; }
export const GEAR = {
  'bronze v leather': { dmg: [3, 7], armour: 1 },
  'steel v steel': { dmg: [7, 11], armour: 4 },
  'bronze v steel': { dmg: [3, 7], armour: 4 },
};
export const ORDINARY = mk({ skill: 60, dodge: 60, dmg: [5, 9], armour: 2 });
export const TOP = mk({ skill: 100, dodge: 100, shield: 100, dmg: [7, 11], armour: 4 });
