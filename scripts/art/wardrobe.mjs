// The wardrobe: scripts/art/wardrobe.json is the one data file of the layered characters (every source, race, animation
// and part). This reads it for everyone else and answers the questions asked of it. Plan: docs/art-production-plan.md
//   node scripts/art/wardrobe.mjs check              the file against itself and against style.mjs, and CREDITS.md against
//                                                    the file: "ok", or every problem on a line of its own (exit 1)
//   node scripts/art/wardrobe.mjs credits [--check]  writes CREDITS.md from the sources in use (--check: only says if it is stale)
//   node scripts/art/wardrobe.mjs budget [--race goblin] [--plus "clothing=20,weapon.one_handed=6,animation=4"] [--md]
//                                                    render time per race as the file stands, what one more part or animation
//                                                    costs, and (--plus) what a planned addition would cost
//   node scripts/art/wardrobe.mjs list [--race human]   the parts, one a line
//   node scripts/art/wardrobe.mjs animations [--md]     the animation list, one a line
//   node scripts/art/wardrobe.mjs rules <race>          a race's rules as paperdoll.mjs reads them (JSON)
// RENOWN_WARDROBE=<file> reads another wardrobe file (to try something without touching the real one).
// Taking in a new part or animation: scripts/art/intake.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAMP } from './style.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const FILE = process.env.RENOWN_WARDROBE || join(HERE, 'wardrobe.json'), CREDITS = join(HERE, '..', '..', 'CREDITS.md');
export const KINDS = ['body', 'clothing', 'hair', 'weapon', 'shield'], NEEDS = ['slice', 'later', 'never'];
export const load = (path = FILE) => JSON.parse(readFileSync(path, 'utf8'));
/** An object's own entries: a key that starts with _ is a note for the reader. */
export const real = o => Object.entries(o || {}).filter(([k]) => !k.startsWith('_'));
export const held = p => p.kind === 'weapon' || p.kind === 'shield';
/** Does this race wear this part? Clothes, armour and hair name their races; weapons and shields say "all". */
export const wears = (p, race) => p.races === 'all' || p.races.includes(race);
export const partsOf = (W, race) => real(W.parts).filter(([, p]) => wears(p, race));
/** A part still rendered: a retired one (replaced, kept only for the pictures already made) is not, nor a rejected one
 *  (Michael dropped it; its line stays so it can come back). */
export const live = p => p.status !== 'retired' && p.status !== 'rejected';

/** A race's rules, in the shape paperdoll.mjs works with: its slots, its bare body, its parts, which ramps each
 *  material may take (every part's materials together), the channels and the colours that may be swapped. */
export function rules(W, race) {
  const R = W.races[race]; if (!R) throw new Error(`no race named ${race}: ${real(W.races).map(([k]) => k).join(', ')}`);
  const parts = {}, materials = {};
  for (const [id, p] of partsOf(W, race)) { const hides = Array.isArray(p.hides) ? p.hides : p.hides?.[race]; parts[id] = { slot: p.slot, ...(hides ? { hides } : {}), ...(p.arms ? { arms: true } : {}) };
    for (const [m, ramps] of real(p.materials)) materials[m] = ramps; }
  return { race, slots: R.slots, body: R.body, parts, dressed: R.dressed || R.outfit, outfit: R.outfit, materials, ramps: R.ramps, channels: R.channels, colours: R.colours };
}

/** An animation's name in the wardrobe (its row is what is passed around). */
const idOf = (W, anim) => Object.keys(W.animations).find(k => W.animations[k] === anim);
/** The animations a race's shields are drawn in: each has a variant, <anim>+shield, with the shield arm. */
export const shieldAnims = (W, race) => real(W.animations).filter(([, a]) => partsOf(W, race).some(([, p]) => p.kind === 'shield' && live(p) && takesPart(W, p, a))).map(([k]) => k);

/** Is this part rendered in this animation? Every part is in an animation made for everyone. An animation made for some
 *  weapon families shows the body, the clothes and the hair, and of the held things only those families' own
 *  (and a shield, if it goes with one of them): a bow is not rendered in a sword's swing. */
export function takesPart(W, p, anim) {
  if (anim.need === 'never') return false;
  if (p.kind === 'shield' && W.render.shield_arm && !W.render.shield_arm.in.includes(idOf(W, anim))) return false;     // only where its arm can carry it
  if (!anim.for || !held(p)) return true;
  return anim.for.includes(p.family) || (W.families[p.family]?.with || []).some(f => anim.for.includes(f));
}

/** The render time of one race. plus: [{ kind, family, n }] parts or { kind: 'animation', n } animations added on trial.
 *  Gives, for the first game ("slice") and for everything listed ("all"): how many part-animations and how many hours;
 *  and what one more of each kind costs, in minutes, as the file stands. */
export function budget(W, race, plus = []) {
  const { sides, pictures, seconds_per_part_picture: each } = W.render, perPA = sides.length * pictures * (W.races[race].render?.seconds_per_part_picture || each);
  const parts = partsOf(W, race).map(([, p]) => p).filter(live), anims = real(W.animations).map(([, a]) => a).filter(a => a.need !== 'never');
  for (const x of plus) if (x.kind === 'animation') for (let i = 0; i < x.n; i++) anims.push({ need: 'slice', for: x.family ? [x.family] : null });
    else for (let i = 0; i < x.n; i++) parts.push({ kind: x.kind, family: x.family });
  // a shield's animation has a variant with the shield arm: the parts that cover that arm are rendered again in it
  const arms = parts.filter(p => p.arms).length, shielded = a => parts.some(p => p.kind === 'shield' && takesPart(W, p, a));
  const variant = need => anims.filter(a => (!need || a.need === need) && shielded(a)).length * arms;
  const count = need => anims.filter(a => !need || a.need === need).reduce((s, a) => s + parts.filter(p => takesPart(W, p, a)).length, 0) + variant(need);
  const one = (p, need) => anims.filter(a => (!need || a.need === need) && takesPart(W, p, a)).length;
  const hours = n => n * perPA / 3600, mins = n => n * perPA / 60;
  const kinds = Object.fromEntries(KINDS.map(k => [k, parts.filter(p => p.kind === k).length]));
  return { race, perPA, parts: parts.length, kinds, animations: { slice: anims.filter(a => a.need === 'slice').length, all: anims.length },
    slice: { n: count('slice'), hours: hours(count('slice')) }, all: { n: count(), hours: hours(count()) },
    shieldArm: { arms, slice: { n: variant('slice'), mins: mins(variant('slice')) }, all: { n: variant(), mins: mins(variant()) } },
    more: { part: { slice: mins(one({ kind: 'clothing' }, 'slice')), all: mins(one({ kind: 'clothing' })) },
      ...Object.fromEntries(real(W.families).filter(([, f]) => f.hold).map(([id]) => [id, { slice: mins(one({ kind: id === 'shield' ? 'shield' : 'weapon', family: id }, 'slice')), all: mins(one({ kind: id === 'shield' ? 'shield' : 'weapon', family: id })) }])),
      animation: { slice: mins(parts.length), all: mins(parts.length) } } };
}

/** Everything wrong with the file, as lines to read. None: it is sound. */
export function problems(W) {
  const out = [], bad = t => out.push(t), races = real(W.races).map(([k]) => k), src = Object.fromEntries(real(W.sources));
  for (const [id, s] of real(W.sources)) { for (const k of ['title', 'by', 'licence']) if (!s[k]) bad(`source ${id}: no ${k}`);
    if (s.credit_required && !s.credit) bad(`source ${id}: its licence asks for credit, and it has no credit line`); }
  for (const [race, R] of real(W.races)) {
    for (const r of R.ramps) { if (!RAMP[r]) bad(`race ${race}: ramp ${r} is not in style.mjs`); if (!(r in R.channels)) bad(`race ${race}: ramp ${r} has no channel`); }
    if (R.ramps.length > 16) bad(`race ${race}: ${R.ramps.length} ramps, the shader holds 16`);
    for (const [what, list] of real(R.colours)) for (const r of list) if (!RAMP[r]) bad(`race ${race}: colour ${r} (${what}) is not in style.mjs`);
    for (const [slot, part] of real(R.body)) { if (!R.slots.includes(slot)) bad(`race ${race}: body slot ${slot} is not one of its slots`); if (!W.parts[part]) bad(`race ${race}: body part ${part} is not a part`); }
    for (const part of [...R.outfit, ...(R.dressed || [])]) if (!W.parts[part] || !wears(W.parts[part], race)) bad(`race ${race}: its outfit names ${part}, which is not one of its parts`);
    const slots = R.outfit.map(p => W.parts[p]?.slot); if (new Set(slots).size !== slots.length) bad(`race ${race}: two parts of its outfit share a slot`);
  }
  for (const [id, a] of real(W.animations)) { if (!NEEDS.includes(a.need)) bad(`animation ${id}: need is ${a.need}, not one of ${NEEDS.join(', ')}`);
    for (const s of [a.source, a.fallback]) if (s && !src[s]) bad(`animation ${id}: no source named ${s}`);
    for (const f of a.for || []) if (!W.families[f]) bad(`animation ${id}: no weapon family named ${f}`);
    for (const [race, sides] of real(a.made)) { if (!races.includes(race)) bad(`animation ${id}: made for ${race}, which is not a race`); for (const s of sides) if (!W.render.sides.includes(s)) bad(`animation ${id}: no side named ${s}`);
      if (!a.action) bad(`animation ${id}: made for ${race} and it names no action`); } }
  const given = {};
  for (const [id, p] of real(W.parts)) { if (!KINDS.includes(p.kind)) bad(`part ${id}: kind is ${p.kind}, not one of ${KINDS.join(', ')}`);
    if (!src[p.source]) bad(`part ${id}: no source named ${p.source}`);
    if (p.races !== 'all' && !(Array.isArray(p.races) && p.races.length)) bad(`part ${id}: races must be "all" or a list`);
    for (const race of races) if (wears(p, race)) { const R = W.races[race];
      if (!R.slots.includes(p.slot)) bad(`part ${id}: ${race} has no slot named ${p.slot}`);
      for (const [m, ramps] of real(p.materials)) { for (const r of ramps) if (!R.ramps.includes(r)) bad(`part ${id}: material ${m} takes ramp ${r}, which is not one of ${race}'s`);
        const k = `${race} ${m}`; if (given[k] && given[k].ramps.join() !== ramps.join()) bad(`part ${id}: material ${m} takes ${ramps.join('+')} here and ${given[k].ramps.join('+')} on ${given[k].id} (one material, one answer for a race)`); given[k] = { id, ramps }; } }
    for (const r of p.races === 'all' ? [] : p.races) if (!W.races[r]) bad(`part ${id}: no race named ${r}`);
    if (held(p)) { if (!W.families[p.family]) bad(`part ${id}: no weapon family named ${p.family}`); if (!p.gear && !p.file) bad(`part ${id}: a held thing needs "file" (its model) or "gear" (a stand-in)`); }
    else if (!p.meshes) bad(`part ${id}: no meshes`);
    if (!real(p.materials).length) bad(`part ${id}: no materials`);
    for (const s of (Array.isArray(p.hides) ? p.hides : Object.values(p.hides || {}).flat())) if (!races.some(r => W.races[r].slots.includes(s))) bad(`part ${id}: hides ${s}, which is no race's slot`); }
  const SA = W.render.shield_arm; if (SA) { if (!src[SA.source]) bad(`render.shield_arm: no source named ${SA.source}`); for (const a of SA.in || []) if (!W.animations[a]) bad(`render.shield_arm: "in" names ${a}, which is not an animation`); }
  for (const [side] of Object.entries(W.render.turn)) if (!W.render.sides.includes(side)) bad(`render: a turn for ${side}, which is not a side`);
  for (const side of W.render.sides) if (!(side in W.render.turn)) bad(`render: no turn for ${side}`);
  return out;
}

/** The sources CREDITS.md names: every one we have (Michael, 2026-11-21: the new packs go in the catalogue and in
 *  CREDITS as soon as they are here), and any other that a part or an animation is made from. Not our own. */
export function inUse(W) {
  const ids = new Set(real(W.parts).filter(([, p]) => p.status !== 'planned').map(([, p]) => p.source));
  for (const [, a] of real(W.animations)) if (real(a.made).length) ids.add(a.source);
  return real(W.sources).filter(([id, s]) => (ids.has(id) || s.have) && s.by && !s.ours);
}

/** CREDITS.md, from the sources in use. */
export function credits(W) {
  const used = inUse(W), must = used.filter(([, s]) => s.credit_required), free = used.filter(([, s]) => !s.credit_required);
  const link = s => s.licence_url ? `[${s.licence}](${s.licence_url})` : s.licence, url = s => s.url ? `<${s.url}>` : '';
  const L = ['# Credits', '', 'Work by other people that Renown uses or is trying out. A line stays here for as long as anything made from the work is in the repo or the game.', '',
    'This file is written from `scripts/art/wardrobe.json` by `node scripts/art/wardrobe.mjs credits`. Change that file, not this one.', '', '## Credit required', ''];
  if (must.length) { L.push('| Work | By | Licence | Source | What we do with it |', '|---|---|---|---|---|');
    for (const [, s] of must) L.push(`| "${s.title}" | ${s.by} | ${link(s)} | ${url(s)} | ${s.use}${s.changed ? ` Changed: ${s.changed[0].toLowerCase()}${s.changed.slice(1)}` : ''} The model file is not in this repo. |`);
    L.push('', '- **If anything made from one of these ships, its credit has to ship with the game too** (a credits screen or a file beside the game), with the author, the title, the link, the licence and the note that it was changed. The line to ship:');
    for (const [, s] of must) L.push(`  - ${s.credit}`);
    L.push('- When nothing is made from one of them any more, its line goes, with the pictures made from it.');
  } else L.push('None today.');
  L.push('', '## No credit required, named anyway', '', '| Work | By | Licence | Source | What we do with it |', '|---|---|---|---|---|');
  for (const [, s] of free) L.push(`| ${s.title} | ${s.by} | ${link(s)} | ${url(s)} | ${s.use} Only rendered 2D sprites are made from it; the files are not in this repo. |`);
  const ai = used.filter(([, s]) => s.ai_generated);
  L.push('', '## Made with AI tools (for the Steam AI disclosure)', '', 'Steam asks what in a game was made with AI and how. The sources marked `ai_generated` in the wardrobe:', '');
  if (ai.length) for (const [, s] of ai) L.push(`- **${s.title}**: ${s.ai_generated}`);
  else L.push('None today.');
  return L.join('\n') + '\n';
}

const h = x => x < 10 ? x.toFixed(1) : String(Math.round(x)), m = x => x < 10 ? x.toFixed(1) : String(Math.round(x));
/** The budget as lines to read (md: a table for the plan). */
export function budgetText(W, races, plus = [], md = false) {
  const B = races.map(r => budget(W, r)), P = plus.length ? races.map(r => budget(W, r, plus)) : null, L = [];
  const fam = real(W.families).filter(([, f]) => f.hold).map(([id]) => id);
  if (md) {
    L.push(`| Race | Parts | Animations (first game / all) | First game | Everything listed |`, '|---|---|---|---|---|');
    B.forEach(b => L.push(`| ${b.race} | ${b.parts} | ${b.animations.slice} / ${b.animations.all} | ${h(b.slice.hours)} h | ${h(b.all.hours)} h |`));
    L.push('', `| One more... | costs, per race (first game / everything listed) |`, '|---|---|');
    const b = B[0]; L.push(`| piece of clothing, hair or body | ${m(b.more.part.slice)} min / ${m(b.more.part.all)} min |`);
    for (const f of fam) L.push(`| ${f === 'shield' ? f : 'weapon, ' + f.replace('_', '-')} | ${m(b.more[f].slice)} min / ${m(b.more[f].all)} min |`);
    L.push(`| animation for everyone | ${B.map(x => `${x.race} ${m(x.more.animation.slice)} min`).join(', ')} |`);
    L.push(`| the shield arm (in the totals): the parts that cover that arm, again in each animation a shield is drawn in | ${B.map(x => `${x.race} ${x.shieldArm.arms} parts, ${m(x.shieldArm.slice.mins)} min / ${m(x.shieldArm.all.mins)} min`).join(', ')} |`);
  } else {
    L.push(`One part in one animation: ${W.render.sides.length} sides x ${W.render.pictures} pictures x ${W.render.seconds_per_part_picture} s = ${Math.round(B[0].perPA)} s (${W.render.samples} samples, the cloud's 4 processors).`);
    for (const b of B) { L.push(`${b.race}: ${b.parts} parts (${KINDS.filter(k => b.kinds[k]).map(k => `${b.kinds[k]} ${k}`).join(', ')}), ${b.animations.slice} animations for the first game, ${b.animations.all} in all`);
      L.push(`  first game: ${b.slice.n} part-animations, ${h(b.slice.hours)} h.  everything listed: ${b.all.n}, ${h(b.all.hours)} h`);
      if (b.shieldArm.arms) L.push(`  the shield arm (counted above): ${b.shieldArm.arms} part${b.shieldArm.arms > 1 ? 's' : ''} covering that arm, again in ${b.shieldArm.slice.n / b.shieldArm.arms} first-game animations: ${m(b.shieldArm.slice.mins)} min (${m(b.shieldArm.all.mins)} with the later ones)`);
      L.push(`  one more: clothing or hair ${m(b.more.part.slice)} min (${m(b.more.part.all)} with the later animations); ${fam.map(f => `${f === 'shield' ? f : f + ' weapon'} ${m(b.more[f].slice)} min`).join('; ')}; an animation for everyone ${m(b.more.animation.slice)} min`); }
    if (P) { L.push(`with ${plus.map(x => `${x.n} more ${x.kind}${x.family ? ' ' + x.family : ''}`).join(', ')} for each race:`);
      P.forEach((p, i) => L.push(`  ${p.race}: first game ${h(p.slice.hours)} h (now ${h(B[i].slice.hours)} h), everything listed ${h(p.all.hours)} h (now ${h(B[i].all.hours)} h)`)); }
    const all = (P || B).reduce((s, b) => s + b.slice.hours, 0); L.push(`all races, first game: ${h(all)} h`);
  }
  return L.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('wardrobe.mjs')) {
  const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; }, flag = n => { const i = a.indexOf(n); if (i >= 0) a.splice(i, 1); return i >= 0; };
  const W = load(), race = opt('--race'), races = race ? [race] : real(W.races).map(([k]) => k), md = flag('--md'), cmd = a.shift();
  if (cmd === 'check') { const bad = problems(W); let stale = false;
    try { stale = readFileSync(CREDITS, 'utf8') !== credits(W); } catch { stale = true; }
    if (stale) bad.push('CREDITS.md is not what the wardrobe gives: node scripts/art/wardrobe.mjs credits');
    console.log(bad.length ? bad.join('\n') : `ok: ${real(W.sources).length} sources, ${real(W.races).length} races, ${real(W.animations).length} animations, ${real(W.parts).length} parts`); process.exit(bad.length ? 1 : 0);
  } else if (cmd === 'credits') { const text = credits(W);
    if (flag('--check')) { const same = readFileSync(CREDITS, 'utf8') === text; console.log(same ? 'CREDITS.md is up to date' : 'CREDITS.md is stale'); process.exit(same ? 0 : 1); }
    writeFileSync(CREDITS, text); console.log(`CREDITS.md: ${inUse(W).filter(([, s]) => s.credit_required).length} with credit required, ${inUse(W).filter(([, s]) => !s.credit_required).length} named anyway`);
  } else if (cmd === 'budget') { const plus = (opt('--plus') || '').split(',').filter(Boolean).map(t => { const [k, n] = t.split('='), [kind, family] = k.trim().split('.'); return { kind, family, n: +n }; });
    console.log(budgetText(W, races, plus, md));
  } else if (cmd === 'list') { for (const r of races) for (const [id, p] of partsOf(W, r)) console.log(`${r}  ${id.padEnd(14)} ${p.kind.padEnd(9)} ${(p.family || p.slot).padEnd(11)} ${p.status.padEnd(9)} ${W.sources[p.source].title}`);
  } else if (cmd === 'animations') { const rows = real(W.animations);
    const from = x => x.source ? W.sources[x.source].title + (x.action ? `: ${x.action}` : ' (which action: not known yet)') + (x.fallback ? `; if it has none, ${W.sources[x.fallback].title}` : '') : 'none found';
    if (md) { console.log('| Animation | For | Needed | From | Why | Made |\n|---|---|---|---|---|---|');
      for (const [id, x] of rows) console.log(`| ${id} | ${x.for ? x.for.map(f => f.replace('_', '-')).join(', ') : 'everyone'} | ${x.need === 'slice' ? 'first game' : x.need} | ${from(x)} | ${x.why} | ${real(x.made).map(([r, s]) => `${r} ${s.join(' ')}`).join(', ') || 'no'} |`);
    } else for (const [id, x] of rows) console.log(`${id.padEnd(11)} ${x.need.padEnd(6)} ${(x.for ? x.for.join('+') : 'everyone').padEnd(11)} ${from(x)}`);
  } else if (cmd === 'rules') { console.log(JSON.stringify(rules(W, a[0] || 'human'), null, 1));
  } else { console.error('node scripts/art/wardrobe.mjs check | credits [--check] | budget | list | animations | rules <race> (see the top of the file)'); process.exit(1); }
}
