// The skill tree to try in a browser (D242, D243): one page with the tree's own pieces inside it. Scroll to zoom, drag to move,
// click a node to read it, Take to buy it. Swords is drawn as a web (skills_web.mjs), to be judged before the other seven are redone;
// the other seven are still the branches in `claude/skill-branches.md` (BRANCHES below).
// Nothing here is for the game: the game will draw the tree from pieces and a json, like the other screens.
// Usage, from the repo root (about a minute):
//   node scripts/art/ui/skills_tree_page.mjs [--out scripts/art/out/skills-tree.html]
// Only code-made art and the game's own font are in the page (no bought art), so the page can be shown anywhere.
import { medal, ring, panel, node, diamond, shape, button, frame, ground, rosette, closer, TREE, LATER, ROOT_AT, TW, TH } from './skills_screen.mjs';
import { WEBS as ALL_WEBS } from './skills_web.mjs';
import { GLYPHS } from './skills_signs.mjs';
import { GEO } from './skills_tree.mjs';
import { FONTS } from './character_screen.mjs';
import { writePng } from '../png.mjs';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; }, OUT = flag('--out', 'scripts/art/out/skills-tree.html');
const S = GEO.S, C = 400, TMP = join(tmpdir(), `skills-tree-${process.pid}.png`);   // tree pieces are drawn S times bigger than at 100%, then shrunk by the page
/** A piece as a data URI, with where its own middle is. */
const piece = ([p, x, y], cx = x, cy = y) => { writePng(TMP, p.data, p.w, p.h); return { u: 'data:image/png;base64,' + readFileSync(TMP).toString('base64'), w: p.w, h: p.h, ax: cx - x, ay: cy - y }; };

/* ---------- the branches: [path name, [node name, what it does] x 4], at skill 15, 40, 65 (notable), 90 (notable): between the materials (Iron 25, Steel 50) ---------- */
const WEAPON_MILES = w => [['Bronze', 0, `Bronze ${w} work at full from the start.`], ['Iron', 25, `Iron ${w} work at full. Below this they are usable but worse: −10% to hit and a slower swing.`], ['Steel', 50, `Steel ${w} work at full. Below this they are usable but worse: −10% to hit and a slower swing.`]];
const BRANCHES = {
  Swords: { status: 'agreed', miles: WEAPON_MILES('swords'), paths: [['Edge', []], ['Guard', []]] },   // its nodes are the web, in skills_web.mjs
  Axes: { status: 'agreed', miles: WEAPON_MILES('axes'), paths: [
    ['Reaver', [['Bite', '+1 damage.'], ['Reap', 'After a kill, your next swing comes at once.'], ['Momentum', 'Each hit in a row adds +1 damage, up to +3. A miss resets it.'], ['Fury', 'Under half health, you swing 20% faster.']]],
    ['Brute', [['Strong grip', 'An axe too heavy for you is only half as hard to use.'], ['Cleave', 'Your hit also strikes one enemy beside your target, for half damage.'], ['Shieldbreaker', 'Your target blocks half as often.'], ['Whirl', 'Cleave strikes two enemies beside your target.']]]] },
  Maces: { status: 'agreed', miles: WEAPON_MILES('maces'), paths: [
    ['Crush', [['Weight', 'Your hits ignore 1 armour.'], ['Dent', 'Each hit takes 1 off the target\'s armour for 10 seconds, up to 2. Everyone hitting it gains.'], ['Crushing blow', '20% of your hits do +50% damage.'], ['Ruin', 'A crushing blow also takes a quarter of the target\'s run energy.']]],
    ['Daze', [['Jolt', '25% of your hits delay the target\'s next swing by 1 second.'], ['Rattle', 'A jolted or stunned target has −20% to hit for 5 seconds.'], ['Stun', '15% of your hits stun for 2 seconds. The target then can\'t be stunned for 10 seconds.'], ['Concussion', 'A stunned target takes +50% damage from everyone.']]]] },
  Spears: { status: 'agreed', miles: WEAPON_MILES('spears'), paths: [
    ['Reach', [['Long arm', 'You attack from 2 tiles away, but never through a wall or a closed door.'], ['Set', 'Your first hit on someone who walks up to you does +50% damage.'], ['Keep back', '15% of your hits push the target back a tile.'], ['Hedge', 'An enemy who steps next to you takes a free hit, once every 10 seconds.']]],
    ['Thrust', [['Point', '+5% chance to hit.'], ['Quick thrust', 'You thrust 15% faster.'], ['Pin', '10% of your hits stop the target from walking for 2 seconds.'], ['Skewer', 'Your hit also strikes one enemy behind your target.']]]] },
  Bows: { status: 'agreed', miles: [], paths: [
    ['Marksman', [['Steady aim', '+5% chance to hit.'], ['Long shot', '+2 tiles of range.'], ['Aimed shot', 'Your first arrow at someone who isn\'t fighting you yet does double damage.'], ['Piercing arrow', 'Your arrows ignore 2 armour.']]],
    ['Skirmisher', [['Quick draw', 'You shoot 10% faster.'], ['Hobble', '15% of your hits halve the target\'s walking speed for 3 seconds.'], ['Retrieval', 'Half your spent arrows lie where they landed, to pick up.'], ['Volley', 'Every 4th shot looses 2 arrows.']]]] },
  Unarmed: { status: 'draft', miles: [], paths: [
    ['Brawler', [['Hard fists', '+1 damage.'], ['Combo', 'Every third hit in a row does double damage.'], ['Kick', '15% of your hits are a kick: +3 damage, and the target is pushed back a tile.'], ['Iron body', 'With no weapon and no metal armour, you take 1 less damage from every hit.']]],
    ['Grappler', [['Quick hands', 'You strike 10% faster.'], ['Disarm', '5% of your hits make the target drop its weapon.'], ['Trip', '10% of your hits stagger the target for 1.5 seconds.'], ['Open hand', '+10% dodge while you hold nothing.']]]] },
  Shield: { status: 'draft', miles: [['Wood', 0, 'Wooden shields work at full from the start.'], ['Iron', 25, 'Iron shields work at full. Below this they are usable but worse.'], ['Steel', 50, 'Steel shields work at full. Below this they are usable but worse.']], paths: [
    ['Bulwark', [['Brace', '+5% chance to block.'], ['Arrow guard', '+10% chance to block arrows.'], ['Bash', 'After a block, 20% chance to stagger the attacker for 1 second.'], ['Stalwart', 'Your block chance is 60% of your Shield skill, not half.']]],
    ['Protector', [['Cover', 'You can block a hit on an ally beside you, at half your chance.'], ['Steady', 'A hit doesn\'t interrupt your bandage while you hold a shield. (To be replaced.)'], ['Guardian', 'Cover works at your full block chance.'], ['Shield wall', 'You and the allies beside you take 1 less damage from each hit.']]]] },
  Dodge: { status: 'draft', miles: [], paths: [
    ['Evasion', [['Light feet', '+5% dodge in cloth or leather.'], ['Sidestep', 'A dodge delays the attacker\'s next swing by half a second.'], ['Untouchable', 'After 2 dodges in a row, the next attack on you misses.'], ['Arrow dodge', '+15% dodge against arrows.']]],
    ['Escape', [['Second wind', 'Your run energy lasts 20% longer.'], ['Slip away', '+15% dodge while running away.'], ['Roll', 'Once a fight, under a quarter health, you roll a tile away from your attacker.'], ['Last stand', '+15% dodge under a quarter health.']]]] },
};
const WEBS = Object.fromEntries(Object.entries(ALL_WEBS).map(([k, w]) => [k, { ...w, nodes: w.nodes.map(n => n.slice(0, 7)) }]));   // the page needs no fight numbers
// The wheel grew (2026-11-19): a circle, every skill 30 degrees from the next, and further out, so eight webs fit side by side with a bridge in each gap.
const HUB = GEO.HUB;   // the wheel's sizes, colours and where it opens are skills_tree.mjs's (GEO): the game's json reads the same
for (const w of Object.values(WEBS)) for (const n of w.nodes) if (n[1] !== 'stub' && !GLYPHS[n[2]]) throw new Error(`no sign for ${n[2]}`);

/* ---------- the pieces ---------- */
const t0 = Date.now(), P = {}, STATES = ['locked', 'open', 'taken'];
P.frame = piece([frame(TW, TH), 0, 0]); P.ground = piece(ground());
P.rosette = piece(rosette(C, C, 40 * S), C, C);
P.ring0 = piece(ring(C, C, 28 * S, 6 * S, 0), C, C); P.ring100 = piece(ring(C, C, 28 * S, 6 * S, 100), C, C);
for (const [name] of TREE) P[`medal ${name}`] = piece(medal(name, C, C, 19 * S, LATER.includes(name) ? 'steel' : 'bronze'), C, C);
for (const st of STATES) {
  P[`node ${st}`] = piece(node(C, C, 9 * S, st, false), C, C); P[`notable ${st}`] = piece(diamond(C, C, 12 * S, st, false), C, C);
  P[`bare node ${st}`] = piece(shape('circle', C, C, 9 * S, st, false, null, true), C, C); P[`bare notable ${st}`] = piece(diamond(C, C, 12 * S, st, false, null, true), C, C);   // an empty face, for a web node's own sign
  for (const name of Object.keys(BRANCHES)) { P[`node ${st} ${name}`] = piece(node(C, C, 9 * S, st, false, name), C, C); P[`notable ${st} ${name}`] = piece(diamond(C, C, 12 * S, st, false, name), C, C); }
}
P.panel = piece(panel(24, 24, 260, 420)); P.zoomButton = piece(button(36, 590, 30, 26)); P.take = piece(button(952, 566, 152, 32)); P.closer = piece(closer(TW - 40, 40), TW - 40, 40);
rmSync(TMP, { force: true });
const fontUri = f => 'data:font/woff;base64,' + readFileSync(join(FONTS, f)).toString('base64');

/* ---------- the page ---------- */
const DATA = { TW, TH, S, ROOT_AT, HUB, TREE, LATER, BRANCHES, WEBS, GLYPHS, GEO };
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Renown — skill tree to try</title>
<style>
@font-face { font-family: "Alegreya SC"; font-weight: 700; src: url(${fontUri('AlegreyaSC-Bold.woff')}) format("woff"); }
@font-face { font-family: "Alegreya"; font-weight: 700; src: url(${fontUri('Alegreya-Bold.woff')}) format("woff"); }
html, body { margin: 0; background: #0c0f10; color: #c4a062; font: 700 14px/1.4 "Alegreya", Georgia, serif; }
main { max-width: 1152px; margin: 0 auto; padding: 12px; }
canvas { display: block; width: 100%; height: auto; aspect-ratio: 1152 / 648; touch-action: none; cursor: grab; background: #111618; }
canvas.drag { cursor: grabbing; } canvas.point { cursor: pointer; }
.test { margin-top: 12px; padding: 10px 12px; border: 1px dashed #4a4640; border-radius: 6px; color: #9a9488; }
.test b { color: #c4a062; font-family: "Alegreya SC", Georgia, serif; letter-spacing: .03em; }
.test .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
.test button { font: inherit; color: #f2ead6; background: #2a2018; border: 1px solid #6a665e; border-radius: 4px; padding: 5px 10px; cursor: pointer; }
.test button:hover { background: #3a2c1e; } .test button.on { border-color: #d6aa62; color: #d6aa62; }
.test input[type=range] { flex: 1 1 200px; max-width: 360px; accent-color: #d6aa62; }
.test output { color: #f2ead6; min-width: 9em; }
.how { margin: 10px 2px 0; color: #6e685e; }
.how b { color: #9a9488; }
</style></head><body><main>
<canvas id="c" width="1152" height="648"></canvas>
<div class="test"><b>Test controls</b> — not part of the game's screen.
  <div class="row"><span>Character:</span><button data-preset="newborn">Newly woken Soldier</button><button data-preset="seasoned">Seasoned fighter</button><button data-preset="master">100 in everything (to try it all)</button><button id="reset">Give the points back</button><button id="again">Open the screen again</button><button id="look">Look at Swords</button></div>
  <div class="row"><span>Level of</span><output id="who">Swords</output><input id="level" type="range" min="0" max="100" value="0"><output id="lv"></output></div>
</div>
<p class="how">The tree is bigger than the screen: scroll to zoom, drag to move. Point at a node to read it and see the way to it; click it, then Take, or Take route to buy the whole way at once. Click a skill's medallion to go into it, and the zoom figure to come back. <b>Swords is redone as a web, to judge:</b> a point every 5 levels (20 in all), small round nodes make the routes from the Bronze bead outward, and a named node needs a route to it and one of the four marks (15, 40, 65, 90), so still 4 named nodes at most. The dotted rings are the materials: nodes past a ring need it. The other seven skills are still the old shape. Unarmed, Shield and Dodge are drafts. Every number is a placeholder.</p>
</main>
<script>
const D = ${JSON.stringify(DATA)}, P = ${JSON.stringify(P)};
const { TW, TH, S, ROOT_AT, HUB, TREE, LATER, BRANCHES, WEBS, GLYPHS } = D, LOOK = [560, 328], VIEW = [14, 14, TW - 14, TH - 14], MARKS = [15, 40, 65, 90], CAP = 500;
const COL = { label: '#c4a062', value: '#f2ead6', hint: '#6e685e', blue: '#78c4ff', dark: '#1e140a' };
const HOME = D.GEO.HOME, HOMEZ = D.GEO.HOMEZ;   // where the screen opens, and where the zoom figure takes you back: the whole tree in view
const FACE = { heading: '700 20px "Alegreya SC"', title: '700 16px "Alegreya SC"', line: '700 12px "Alegreya"' }, PX = { heading: 20, title: 16, line: 12 };
const cv = document.getElementById('c'), g = cv.getContext('2d'), img = {};
/* ----- the tree's own space (the draft's pixels at 100%) ----- */
const K = D.GEO.K;   // the tree is far bigger than the screen: every skill sits K times further from the root than in the first draft and a web is spread by as much. You move about and zoom.
const hubAt = deg => [ROOT_AT[0] + Math.cos(deg * Math.PI / 180) * HUB[0] * K, ROOT_AT[1] + Math.sin(deg * Math.PI / 180) * HUB[1] * K];
const outward = (deg, out, side) => { const h = hubAt(deg), dx = h[0] - ROOT_AT[0], dy = h[1] - ROOT_AT[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n; return [h[0] + ux * out - uy * side, h[1] + uy * out + ux * side]; };
/** A place on a skill's fan: rho pixels past its hub along a ring round the root, th degrees off its stem (+ is clockwise). */
const ANG = D.GEO.ANG;   // a web's angles are drawn at 75%: with 12 skills round a circle each has 30 degrees, and the bridges need the gap
const fan = (hub, rho, th0) => { const th = th0 * ANG; const dx = hub[0] - ROOT_AT[0], dy = hub[1] - ROOT_AT[1], a = Math.atan2(dy, dx) + th * Math.PI / 180, d = Math.hypot(dx, dy) + rho; return [ROOT_AT[0] + Math.cos(a) * d, ROOT_AT[1] + Math.sin(a) * d]; };
// Along an old branch, nodes and materials take turns: Bronze, the 15 nodes, Iron 25, the 40 nodes, Steel 50, the 65 notables, a material to come at 75, the 90 notables, one to come at 100.
const OUT = [60, 94, 130, 163], SIDE = [13, 18, 23, 27], MILE_OUT = [42, 77, 111, 147, 179];
const RAD = D.GEO.RAD, byId = {};
// A web's sides each have a colour: Edge ember, Guard verdigris, the stem gold, a bridge pale gold.
const FAM = Object.fromEntries(Object.entries(D.GEO.FAM).map(([k, c]) => [k, c.join(',')])), KIND = { small: 'Small', bridge: 'Bridge', node: 'Named', notable: 'Notable', stub: 'Later' };
const GL = {}; for (const k in GLYPHS) GL[k] = { s: GLYPHS[k].s && new Path2D(GLYPHS[k].s), f: GLYPHS[k].f && new Path2D(GLYPHS[k].f) };
const skills = TREE.map(([name, deg]) => {
  const later = LATER.includes(name), b = BRANCHES[name], w = WEBS[name], sk = { name, deg, later, hub: hubAt(deg), status: b ? b.status : 'later', nodes: [], miles: [], links: [], web: !!w };
  if (w) {                                                                // a web: beads on the stem, nodes on the fan, strands between them
    const by = {};
    w.beads.forEach(([label, level, r0, said], i) => { const rho = r0 * K, soon = label.startsWith('A later'), m = { id: name + '/m' + i, key: 'm' + i, skill: sk, kind: 'mile', soon, name: label, level, rho, text: soon ? 'A material above steel comes later. Its place is kept here.' : said ? said : level ? 'Nodes past this ring need ' + name + ' ' + level + '.' : label + ': where every route starts.', at: fan(sk.hub, rho, 0), r: soon ? 5 : 6.5, adj: [] }; sk.miles.push(m); by[m.key] = m; });
    sk.rootBead = sk.miles[0]; sk.fork = sk.rootBead.at;
    for (const [key, kind, nm, text, level, r0, th] of w.nodes) { const rho = r0 * K, n = { id: name + '/' + key, key, skill: sk, kind, web: true, named: kind === 'node' || kind === 'notable', name: nm, text, level, at: fan(sk.hub, rho, th), rho, fam: key[0], r: RAD[kind], side: Math.sign(th), path: w.paths[key[0]], adj: [] }; sk.nodes.push(n); by[key] = n; }
    for (const [a, c] of w.links) { by[a].adj.push(by[c]); by[c].adj.push(by[a]); sk.links.push([by[a], by[c]]); }
    sk.pathNames = [w.paths.e, w.paths.g]; sk.status = w.status; sk.tail = [by.t3, by.m3, by.m4]; sk.cross = w.cross; sk.other = w.other; sk.by = by;
    return sk;
  }
  const miles = b ? b.miles : []; miles.forEach(([label, level, text], i) => sk.miles.push({ id: name + '/m' + i, skill: sk, kind: 'mile', name: label, level, text, at: outward(deg, MILE_OUT[i], 0), r: 4 }));
  if (miles.length) [75, 100].forEach((level, j) => sk.miles.push({ id: name + '/m' + (3 + j), skill: sk, kind: 'mile', soon: true, name: 'A later material', level, text: 'A material above steel comes later. Its place is kept here.', at: outward(deg, MILE_OUT[3 + j], 0), r: 3 }));
  sk.fork = sk.miles.length ? sk.miles[0].at : outward(deg, 46, 0);
  for (let p = 0; p < 2; p++) { let prev = null; for (let i = 0; i < 4; i++) {
    const def = b ? b.paths[p][1][i] : ['', ''], n = { id: name + '/' + p + '/' + i, skill: sk, kind: i > 1 ? 'notable' : 'node', path: b ? b.paths[p][0] : '', name: def[0], text: def[1], level: MARKS[i], prev, mat: sk.miles[i] || null, at: outward(deg, OUT[i], (p ? 1 : -1) * SIDE[i]), r: i > 1 ? 12 : 9 };   // mat: the material just below it on the stem
    sk.nodes.push(n); prev = n; } }
  return sk;
});
const byName = Object.fromEntries(skills.map(s => [s.name, s]));
for (const s of skills) for (const n of [...s.nodes, ...s.miles]) byId[n.id] = n;
for (const s of skills) if (s.web) {                                      // a bridge's far end is a node of the neighbour: it opens that node too
  for (const n of s.nodes) if (n.kind === 'bridge') n.other = byName[s.other];
  for (const [key, id] of s.cross) { const a = s.by[key], c = byId[id]; a.adj.push(c); c.via = a; s.links.push([a, c]); }
}
/* ----- the character ----- */
const PRESETS = {
  newborn: { levels: { Swords: 30, Shield: 30 }, taken: [] },
  seasoned: { levels: { Swords: 78, Shield: 64, Dodge: 52, Axes: 27, Bows: 12, Unarmed: 5 }, taken: ['Swords/ek1', 'Swords/ek2', 'Swords/eK', 'Swords/ex1', 'Swords/eb1', 'Swords/eb2', 'Swords/eB', 'Shield/ek1', 'Shield/ek2', 'Shield/eK'] },
  master: { levels: Object.fromEntries(Object.keys(BRANCHES).map(k => [k, 100])), taken: [] },
};
const st = { zTo: HOMEZ, anchor: null, openAt: 0, pickAt: -9, z: HOMEZ, cam: HOME.slice(), pick: null, hover: null, levels: {}, taken: new Set(), order: [], paid: {}, queue: [], route: null, preset: 'seasoned', slider: 'Swords', fly: null };
const level = s => st.levels[s.name] || 0, payer = n => st.paid[n.id] ? byName[st.paid[n.id]] : n.skill;
/** Points: an old branch earns one at each mark; a web earns one every 5 levels. */
const earned = s => s.later ? 0 : s.web ? Math.floor(level(s) / 5) : MARKS.filter(m => level(s) >= m).length;
const spent = s => { let k = 0; for (const id of st.taken) if (payer(byId[id]) === s) k++; return k; }, free = s => s.later ? 0 : earned(s) - spent(s);
/** A web's named nodes: one for each mark reached, so 4 at most (as D242 agreed). */
const marks = s => MARKS.filter(m => level(s) >= m).length, namedTaken = s => s.nodes.filter(n => n.named && st.taken.has(n.id)).length;
const on = x => x.kind === 'mile' ? !x.soon && level(x.skill) >= x.level : st.taken.has(x.id);
/** A web node can be reached when a node beside it is taken; the Bronze bead is where every route starts. */
const reach = n => n.adj.some(a => a.kind === 'mile' ? a === a.skill.rootBead : st.taken.has(a.id));
/** Who pays for a bridge node: either of its two skills, the one it hangs from first. */
const payFor = n => [n.skill, n.other].find(s => s && !s.later && level(s) >= n.level && free(s) > 0);
/** A node is 'taken', 'dark' (taken, but the skill dropped under its level), 'open' (can be taken now) or 'locked'. */
function stateOf(n) {
  const s = n.skill; if (s.later || n.kind === 'stub') return 'locked';
  if (n.kind === 'mile') return on(n) ? 'taken' : 'locked';
  if (st.taken.has(n.id)) return level(payer(n)) >= n.level ? 'taken' : 'dark';
  if (n.web) return why(n) ? 'locked' : 'open';
  return level(s) >= n.level && (!n.prev || st.taken.has(n.prev.id) || (n.via && st.taken.has(n.via.id))) && free(s) > 0 ? 'open' : 'locked';
}
function why(n) {
  const s = n.skill;
  if (n.kind === 'bridge') { if (level(s) < n.level && level(n.other) < n.level) return 'Needs ' + n.level + ' in either'; if (!reach(n)) return 'No route to it yet'; return payFor(n) ? '' : 'No point to spend'; }
  if (level(s) < n.level) return 'Needs ' + s.name + ' ' + n.level;
  if (n.web) {
    if (!reach(n)) return 'No route to it yet';
    if (n.named && namedTaken(s) >= marks(s)) return marks(s) < 4 ? 'Next named at ' + s.name + ' ' + MARKS[marks(s)] : 'All 4 named taken';
  } else if (n.prev && !st.taken.has(n.prev.id) && !(n.via && st.taken.has(n.via.id))) return 'Needs ' + n.prev.name;
  if (free(s) <= 0) return 'No ' + s.name + ' point to spend'; return '';
}
/** Buy a node that is open. */
function buy(n) { if (!n || !n.kind || stateOf(n) !== 'open') return false; if (n.web) n.from = n.adj.find(a => a.kind === 'mile' ? a === a.skill.rootBead : st.taken.has(a.id)); if (n.kind === 'bridge') st.paid[n.id] = payFor(n).name; st.taken.add(n.id); st.order.push(n.id); n.tookAt = T; return true; }
/** The shortest way from what is taken to a web node: { from, path (the nodes to buy, in order), cost, ok, why }. */
function routeTo(n) {
  if (!n || !n.web || n.kind === 'stub' || st.taken.has(n.id)) return null;
  const s = n.skill, start = x => x.kind === 'mile' ? x === s.rootBead : st.taken.has(x.id);
  const search = strict => { const prev = new Map([[n, null]]), todo = [n]; while (todo.length) { const v = todo.shift(); for (const a of v.adj) { if (prev.has(a)) continue; if (start(a)) { const path = []; for (let x = v; x; x = prev.get(x)) path.push(x); return { from: a, path }; } if (!a.web || a.named || a.kind === 'stub' || a.kind === 'mile' || (strict && level(s) < a.level)) continue; prev.set(a, v); todo.push(a); } } return null; };
  const r = search(true) || search(false); if (!r) return null;
  const low = r.path.find(x => level(s) < x.level && !(x.kind === 'bridge' && level(x.other) >= x.level)); r.cost = r.path.length; r.skill = s;
  r.why = low ? 'Needs ' + s.name + ' ' + low.level : n.named && namedTaken(s) >= marks(s) ? (marks(s) < 4 ? 'Next named at ' + s.name + ' ' + MARKS[marks(s)] : 'All 4 named taken') : free(s) < r.cost ? 'Needs ' + r.cost + ' points, has ' + free(s) : '';
  r.ok = !r.why; return r;
}
function untake(id) { st.taken.delete(id); delete st.paid[id]; st.order = st.order.filter(x => x !== id); }
/** After a level drops (the test slider): give back the last nodes bought until the points and the marks fit, then drop web nodes left with no route. */
function tidy(s) {
  while (free(s) < 0) { const last = st.order.filter(id => payer(byId[id]) === s).pop(); if (!last) break; untake(last); }
  if (s.web) while (namedTaken(s) > marks(s)) untake(st.order.filter(id => byId[id].named && byId[id].skill === s).pop());
  for (const w of skills) if (w.web) {
    const seen = new Set([w.rootBead, ...w.nodes.filter(n => st.taken.has(n.id) && n.adj.some(a => !a.web && a.kind !== 'mile' && st.taken.has(a.id)))]), todo = [...seen];
    while (todo.length) for (const a of todo.pop().adj) if (a.web && st.taken.has(a.id) && !seen.has(a)) { seen.add(a); todo.push(a); }
    for (const n of w.nodes) if (st.taken.has(n.id) && !seen.has(n)) untake(n.id);
  }
}
function usePreset(k) { const p = PRESETS[k]; st.preset = k; st.levels = { ...p.levels }; st.taken = new Set(p.taken); st.order = [...p.taken]; st.paid = {}; st.queue = []; for (const id in byId) { delete byId[id].tookAt; delete byId[id].from; } sync(); }
/* ----- drawing ----- */
const SC = p => [(p[0] - st.cam[0]) * st.z + LOOK[0], (p[1] - st.cam[1]) * st.z + LOOK[1]];
/* Movement: T is the time in seconds; everything that moves is worked out from T and a moment it started (openAt, pickAt, tookAt...). */
let GA = 1, T = 0;
const clamp = k => k < 0 ? 0 : k > 1 ? 1 : k, ease = k => k * k * (3 - 2 * k), easeOut = k => 1 - (1 - k) ** 3, CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const intro = () => CALM ? 1 : easeOut(clamp((T - st.openAt) / .3));      // the screen comes up all at once, in a third of a second
/* How things move here (Michael, 2026-11-19: the first set looked "too childish"): short, eased out, nothing bounces, nothing loops, no sparks. A thing changes once and is still. */
const alpha = a => { GA = a; g.globalAlpha = a; };
function sprite(k, x, y, scale = 1, a = 1) { const p = P[k], i = img[k]; if (!i) return; g.globalAlpha = a * GA; g.drawImage(i, x - p.ax * scale, y - p.ay * scale, p.w * scale, p.h * scale); g.globalAlpha = GA; }
/** Text with its capitals centred on y (mid) or its line starting at y (top), as the draft places it. */
function text(str, face, x, y, colour, align = 'left', mid = false, outline = 0) {
  g.font = FACE[face]; g.textAlign = align; g.textBaseline = 'alphabetic'; const by = mid ? y + PX[face] * .31 : y + PX[face] * BASE[face];
  if (outline) { g.lineWidth = outline * 2; g.strokeStyle = '#080604'; g.lineJoin = 'round'; g.strokeText(str, x, by); }
  g.fillStyle = COL[colour] || colour; g.fillText(str, x, by);
}
const BASE = { heading: 1.06, title: 1.04, line: 1.0 };
const width = (str, face) => { g.font = FACE[face]; return g.measureText(str).width; };
/** A panel of any size, cut from the big one (never stretched). */
function panelAt(x, y, w, h) {
  const p = P.panel, i = img.panel, e = 10; if (!i) return; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.drawImage(i, 0, 0, w - e, h - e, x, y, w - e, h - e); g.drawImage(i, p.w - e, 0, e, h - e, x + w - e, y, e, h - e);
  g.drawImage(i, 0, p.h - e, w - e, e, x, y + h - e, w - e, e); g.drawImage(i, p.w - e, p.h - e, e, e, x + w - e, y + h - e, e, e);
}
function strand(a, b, lit, wd, k = 1, rgb = '208,160,90', dim = '#3a3e3e') {
  if (k <= 0) return; if (k < 1) b = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; g.lineCap = 'round';
  if (lit) { g.strokeStyle = '#3a2410'; g.lineWidth = wd + 1.6; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = 'rgb(' + rgb + ')'; g.lineWidth = wd; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = 'rgba(255,240,210,.6)'; g.lineWidth = Math.max(.6, wd * .3); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  else { g.strokeStyle = dim; g.lineWidth = wd; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
}
function shapePath(p, d, diamond) { if (diamond) { g.moveTo(p[0], p[1] - d); g.lineTo(p[0] + d, p[1]); g.lineTo(p[0], p[1] + d); g.lineTo(p[0] - d, p[1]); g.closePath(); } else g.arc(p[0], p[1], d, 0, 7); }
function glow(x, y, r0, r1, rgb, a) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r1, 0, 7); g.fill(); }
function wrap(str, face, w) { const out = []; let cur = ''; for (const word of str.split(' ')) { const t = cur ? cur + ' ' + word : word; if (width(t, face) > w && cur) { out.push(cur); cur = word; } else cur = t; } if (cur) out.push(cur); return out; }
/** A web node's sign, size pixels across. */
function glyph(name, x, y, size, colour) { const gl = GL[name]; if (!gl) return; const k = size / 24; g.save(); g.translate(x, y); g.scale(k, k); g.translate(-12, -12); g.fillStyle = g.strokeStyle = colour; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round'; if (gl.s) g.stroke(gl.s); if (gl.f) g.fill(gl.f); g.restore(); }
/** Behind a web: a warm haze on one side and a cool one on the other. (A great blade along the stem was tried and taken out: Michael found it too crowded.) */
function webBack(s) {
  const z = st.z;
  for (const [th, f] of [[-9.5, 'e'], [9.5, 'g']]) { const c = SC(fan(s.hub, 108 * K, th)); glow(c[0], c[1], 0, 84 * K * z, FAM[f], .07); }
}
/** A material's ring across a web: dotted, warm once the material is reached. Nodes past it need it. */
function ringOf(s, m) {
  const R = SC(ROOT_AT), dx = s.hub[0] - ROOT_AT[0], dy = s.hub[1] - ROOT_AT[1], a = Math.atan2(dy, dx), d = (Math.hypot(dx, dy) + m.rho) * st.z, w = 17 * ANG * Math.PI / 180, w0 = 20.5 * ANG * Math.PI / 180;   // a little longer on the side its name sits
  g.strokeStyle = on(m) ? 'rgba(214,170,98,.42)' : 'rgba(96,102,102,.42)'; g.lineWidth = Math.max(1, .8 * st.z); g.setLineDash([2.5 * st.z, 3.5 * st.z]); g.lineCap = 'butt';
  g.beginPath(); g.arc(R[0], R[1], d, a - w0, a + w); g.stroke(); g.setLineDash([]);
  if (!m.soon) { const e = a - 3.2 * Math.PI / 180, t = [Math.sin(e), -Math.cos(e)]; text(m.name + ' ' + m.level, 'line', R[0] + Math.cos(e) * d + t[0] * 7, R[1] + Math.sin(e) * d + t[1] * 7, on(m) ? 'label' : 'hint', t[0] < -.3 ? 'right' : t[0] > .3 ? 'left' : 'center', true, 2); }   // its name, at the ring's end
}
let hits = [];                                                            // what can be clicked, last drawn first
function draw() {
  const z = st.z, far = z < .36, close = z >= 1.5, near = z >= .8; hits = [];
  { const aim = st.hover && st.hover.kind && st.hover.web ? st.hover : st.pick && st.pick.kind && st.pick.web && !st.queue.length ? st.pick : null; st.route = aim && stateOf(aim) === 'locked' ? routeTo(aim) : null; }
  g.setTransform(cv.width / TW, 0, 0, cv.height / TH, 0, 0); g.clearRect(0, 0, TW, TH); g.imageSmoothingQuality = 'high';
  sprite('frame', 0, 0);
  g.save(); g.beginPath(); g.rect(VIEW[0], VIEW[1], VIEW[2] - VIEW[0], VIEW[3] - VIEW[1]); g.clip();
  sprite('ground', 14, 14);
  const R = SC(ROOT_AT), names = [];
  for (const s of skills) {                                               // the strands first, under everything
    const hub = SC(s.hub), wd = Math.max(1.6, (s.later ? 2 : 3) * Math.max(.6, z)), thin = Math.max(1.4, 2 * Math.max(.6, z));
    const si = skills.indexOf(s); alpha(1); strand(SC(outward(s.deg, -(Math.hypot(s.hub[0] - ROOT_AT[0], s.hub[1] - ROOT_AT[1]) - 46), 0)), SC(outward(s.deg, -30, 0)), !s.later, wd, intro(.15 + .02 * si, .5 + .02 * si)); alpha(intro(.6 + .03 * si, .95 + .03 * si));
    if (s.web) {
      if (!far) { webBack(s); for (const m of s.miles.slice(1)) ringOf(s, m); }
      strand(SC(outward(s.deg, 30, 0)), SC(s.rootBead.at), true, wd * .8);
      if (!far) for (let i = 1; i < s.tail.length; i++) strand(SC(s.tail[i - 1].at), SC(s.tail[i].at), false, thin * .7);   // the stem goes on to the materials to come
      for (const [a, b] of s.links) {
        const lit = on(a) && on(b); if (far && !lit) continue;
        const rgb = FAM[(a.fam && a.fam !== 't' ? a.fam : b.fam) || 't'], A = SC(a.at), B = SC(b.at);
        if (a.skill !== b.skill && !lit) { const w0 = a.web ? A : B, w1 = a.web ? B : A, d = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]), L = Math.min(d, 60 * z); g.setLineDash([3, 4]); strand(w0, [w0[0] + (w1[0] - w0[0]) * L / d, w0[1] + (w1[1] - w0[1]) * L / d], false, thin * .7, 1, rgb, '#4d5354'); g.setLineDash([]); continue; }   // a bridge's far end is a long way off: only its start is drawn until it is crossed
        const fresh = [a, b].find(x => x.tookAt !== undefined && T - x.tookAt < .18 && x.from === (x === a ? b : a));
        if (fresh) { const from = fresh === a ? b : a; strand(SC(from.at), SC(fresh.at), false, thin * .75); strand(SC(from.at), SC(fresh.at), true, wd * .72, (T - fresh.tookAt) / .18, rgb); }   // light runs along the strand to a node just taken
        else if ([a, b].some(x => x.tookAt !== undefined && T - x.tookAt < .18)) strand(A, B, false, thin * .75);
        else strand(A, B, lit, lit ? wd * .72 : thin * (a.kind === 'stub' || b.kind === 'stub' ? .5 : .9), 1, rgb, '#4d5354');
      }
      const rt = st.route && st.route.skill === s ? st.route : null;
      if (rt && !far) { g.setLineDash([6, 5]); g.lineCap = 'butt'; g.strokeStyle = rt.ok ? 'rgba(255,238,180,.95)' : 'rgba(176,182,182,.8)'; g.lineWidth = Math.max(1.4, 1.4 * z); g.beginPath(); g.moveTo(...SC(rt.from.at)); for (const x of rt.path) g.lineTo(...SC(x.at)); g.stroke(); g.setLineDash([]); }   // the way to the node pointed at
      continue;
    }
    const fork = SC(s.fork), anyTaken = s.nodes.some(n => st.taken.has(n.id)), spine = [outward(s.deg, 30, 0), ...s.miles.map(m => m.at)];
    if (!s.miles.length) { if (!far || anyTaken) strand(SC(spine[0]), fork, anyTaken, anyTaken ? wd : thin); }
    else for (let i = 1; i < spine.length; i++) { const lit = !s.later && stateOf(s.miles[i - 1]) === 'taken'; if (!far || lit) strand(SC(spine[i - 1]), SC(spine[i]), lit, lit ? wd * .8 : thin); }   // the stem runs through the materials
    for (const n of s.nodes) { const lit = st.taken.has(n.id), dt = T - (n.tookAt ?? -9), a = n.prev ? SC(n.prev.at) : fork, b = SC(n.at); if (far && !lit) continue; if (n.mat && n.prev && !far) strand(SC(n.mat.at), b, lit && !n.mat.soon && dt >= .18, thin * .8); if (lit && dt < .18) { strand(a, b, false, thin); strand(a, b, true, wd, dt / .18); } else strand(a, b, lit, lit ? wd : thin); }   // light runs along the strand to a node just taken
  }
  for (const s of skills) {
    const si = skills.indexOf(s); alpha(intro(.6 + .03 * si, .95 + .03 * si));
    if (!far) for (const m of s.miles) { const p = SC(m.at), lit = stateOf(m) === 'taken', du = T - (m.litAt ?? -9), pop = du < .3 ? 1 - easeOut(du / .3) : 0, r = m.r * z * (1 + .05 * (m.hv || 0)); if (pop) glow(p[0], p[1], 0, r + 8, '255,224,170', .55 * pop); sprite('node ' + (lit ? 'taken' : 'locked'), p[0], p[1], r / (9 * S)); if (st.pick === m) ring2(p, r + 3, false); hits.push({ x: p[0], y: p[1], r: Math.max(s.web ? 6.5 : 8, r + 4), what: m }); if ((close && !m.soon && !s.web) || st.hover === m || st.pick === m) names.push([m.soon ? 'Later' : m.name + (m.level ? ' ' + m.level : ''), p, r, lit ? 'label' : 'hint', m]); }
    for (const n of s.nodes) {
      const p = SC(n.at), dt = T - (n.tookAt ?? -9), real = stateOf(n), state = real === 'taken' && dt < .18 ? 'open' : real, key = state === 'dark' ? 'locked' : state, notable = n.kind === 'notable', little = n.web && !n.named, u = clamp((dt - .18) / .4), burst = real === 'taken' && dt >= .18 && u < 1;
      if (far) { const r = little ? Math.max(1.8, 2.4 * z) : Math.max(3, 4 * z); sprite('node ' + key, p[0], p[1], r / (9 * S)); hits.push({ x: p[0], y: p[1], r: little ? 5 : 9, what: n }); continue; }
      const grow = 1 + .04 * (n.hv || 0), r = n.r * z * grow, kind = notable ? 'notable ' : 'node ', base = kind + key, k = n.web ? 'bare ' + base : close && !s.later ? base + ' ' + s.name : base, sc = n.r / (notable ? 12 : 9) * z / S * grow;
      if (state === 'open') glow(p[0], p[1], r * .7, r + (little ? 6 : 10) * Math.max(1, z * .8), n.web ? FAM[n.fam] : '222,156,74', .4);   // a steady glow: it can be taken
      if (n.kind === 'bridge' || n.kind === 'stub') { g.strokeStyle = real === 'taken' ? 'rgba(214,170,98,.8)' : 'rgba(110,116,116,.7)'; g.lineWidth = Math.max(1, .7 * z); g.beginPath(); g.arc(p[0], p[1], r + 2.2 * z, 0, 7); g.stroke(); }   // a second ring marks a bridge
      sprite(k, p[0], p[1], sc, n.kind === 'stub' ? .55 : 1); if (state === 'dark') sprite(n.web ? 'bare ' + kind + 'taken' : kind + 'taken' + (close ? ' ' + s.name : ''), p[0], p[1], sc, .3);
      if (n.web && n.kind !== 'stub') {                                       // its own sign, in its side's colour
        const c = FAM[n.fam], size = r * (notable ? 1.08 : 1.34), col = state === 'taken' ? 'rgba(58,34,8,.95)' : state === 'open' ? 'rgba(' + c + ',1)' : 'rgba(' + c + ',' + (state === 'dark' ? .3 : .6) + ')';
        if (size >= 8.5) glyph(n.name, p[0], p[1], size, col); else { g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], r * .36, 0, 7); g.fill(); }
        if (real === 'taken') { const d = r + (notable ? 3 : 1.7) * z; g.strokeStyle = 'rgba(' + c + ',.7)'; g.lineWidth = Math.max(1, .6 * z); g.beginPath(); if (notable) { g.moveTo(p[0], p[1] - d); g.lineTo(p[0] + d, p[1]); g.lineTo(p[0], p[1] + d); g.lineTo(p[0] - d, p[1]); g.closePath(); } else g.arc(p[0], p[1], d, 0, 7); g.stroke(); }
        if (st.route && st.route.path.includes(n)) { g.strokeStyle = st.route.ok ? 'rgba(255,238,180,.95)' : 'rgba(176,182,182,.8)'; g.lineWidth = 1.3; g.beginPath(); g.arc(p[0], p[1], r + 3.2 * Math.max(1, z * .6), 0, 7); g.stroke(); }
      }
      if (burst) { const k = 1 - easeOut(u); g.globalCompositeOperation = 'lighter'; glow(p[0], p[1], 0, r * 1.5, '255,236,190', .5 * k); g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(255,236,190,' + .8 * k + ')'; g.lineWidth = 1.2; g.beginPath(); shapePath(p, r + 2 + 4 * easeOut(u), notable); g.stroke(); }   // it catches: one short flash, and a thin ring that barely moves
      if (st.pick === n) ring2(p, r + 4, notable); else if ((n.hv || 0) > .03) { g.strokeStyle = 'rgba(242,234,214,' + .75 * n.hv + ')'; g.lineWidth = 1.2; g.beginPath(); shapePath(p, r + 3, notable); g.stroke(); }   // pointed at: a thin pale ring, no swelling
      hits.push({ x: p[0], y: p[1], r: Math.max(little ? 7.5 : 10, r + 4), what: n });
      const show = n.web ? (near && n.named) || st.pick === n : (close && (notable || state !== 'locked')) || st.hover === n || st.pick === n;
      if (!s.later && n.name && show) names.push([n.name, p, r + (notable ? 2 : 0), state === 'taken' ? 'value' : state === 'locked' || state === 'dark' ? 'hint' : 'label', n]);
    }
  }
  const plates = [];
  for (const s of skills) {                                               // the skills: a ring that fills, a medallion, a name plate
    const z = Math.max(st.z, .7);                                           // medallions stay readable from far off
    const si = skills.indexOf(s), ik = intro(), hub = SC(s.hub), v = s.shown ?? level(s), f = free(s), sc = z / S, fl = clamp((T - (s.flashAt ?? -9)) / .45); alpha(ik);
    if (f > 0) glow(hub[0], hub[1], 27 * z, 34 * z + 14, '120,196,255', .5);
    if (fl < 1) { g.strokeStyle = 'rgba(143,208,255,' + (1 - easeOut(fl)) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(hub[0], hub[1], 30 * z + 6 * z * easeOut(fl), 0, 7); g.stroke(); }   // a point just earned
    sprite('ring0', hub[0], hub[1], sc);
    if (v > 0) { g.save(); g.beginPath(); g.moveTo(hub[0], hub[1]); g.arc(hub[0], hub[1], 40 * z, -Math.PI / 2, -Math.PI / 2 + v * 3.6 * Math.PI / 180); g.closePath(); g.clip(); sprite('ring100', hub[0], hub[1], sc); g.restore(); }
    sprite('medal ' + s.name, hub[0], hub[1], sc);
    if (st.pick === s) ring2(hub, 28 * z + (f > 0 ? 9 : 5), false);
    if (f > 0) { g.strokeStyle = '#8fd0ff'; g.lineWidth = 2.2; g.beginPath(); g.arc(hub[0], hub[1], 28 * z + 4, 0, 7); g.stroke(); text('+' + f, 'title', hub[0], hub[1] + 28 * z + 5, 'blue', 'center', true, 2); }
    hits.push({ x: hub[0], y: hub[1], r: 30 * z, what: s });
    const face = far ? 'line' : 'title', py = Math.round(hub[1] + 40 * z + (z < 1 ? 4 : 0) + (f > 0 ? 12 : 0)), nw = width(s.name, face), val = s.later ? 'later' : String(level(s)), vw = width(val, s.later ? 'line' : face), wd = nw + (far ? 5 : 7) + vw + (far ? 16 : 24);
    plates.push([s, hub[0], py, wd, nw, val, ik]);
  }
  alpha(intro()); sprite('rosette', R[0], R[1], Math.max(z, .7) / S);
  for (const [s, cx, py, wd, nw, val, ik] of plates) { alpha(ik); const face = far ? 'line' : 'title', hh = far ? 20 : 26; panelAt(cx - wd / 2, py - hh / 2, wd, hh); const x0 = cx - wd / 2 + (far ? 8 : 12); text(s.name, face, x0, py, s.later ? 'hint' : 'label', 'left', true); text(val, s.later ? 'line' : face, x0 + nw + (far ? 5 : 7), py + (s.later && !far ? 1 : 0), s.later ? 'hint' : 'value', 'left', true); }
  alpha(intro(.9, 1.2)); for (const [str, p, r, colour, n] of names) label(str, n, p, r, colour);
  if (z >= .55) for (const s of skills) if (s.web) for (const [th, f, i] of [[-12.5, 'e', 0], [12.5, 'g', 1]]) { const c = SC(fan(s.hub, 174 * K, th)); text(s.pathNames[i], 'title', c[0], c[1], 'rgba(' + FAM[f] + ',.9)', 'center', true, 2); }   // each side's name, in its colour
  g.restore(); alpha(intro(.1, .4));
  /* the panels stay put */
  sprite('closer', TW - 40, 40); hits.push({ x: TW - 40, y: 40, r: 16, what: 'close' });
  const list = skills.filter(s => free(s) > 0), lh = 132 + list.length * 19 + (list.length ? 30 : 8) - 24;
  panelAt(24, 24, 164, Math.max(120, lh)); hits.push({ box: [24, 24, 164, Math.max(120, lh)], what: 'panel' });
  text('Skills', 'heading', 38, 36, 'value'); text('Total', 'title', 38, 70, 'label'); text(skills.reduce((t, s) => t + level(s), 0) + ' / ' + CAP, 'title', 38 + width('Total', 'title') + 8, 70, 'value'); text('Points to spend', 'title', 38, 108, 'label');
  let ly = 132; for (const s of list) { text(s.name, 'line', 38, ly, st.hover === 'find ' + s.name ? 'label' : 'value'); text('+' + free(s), 'line', 176, ly, 'blue', 'right'); hits.push({ box: [30, ly - 2, 152, 18], what: 'find ' + s.name }); ly += 19; }
  if (list.length) text('Click one to find it', 'line', 38, ly + 6, 'hint'); else text('None', 'line', 38, 132, 'hint');
  panelAt(24, 580, 164, 46); sprite('zoomButton', 36, 590); sprite('zoomButton', 146, 590);
  text('−', 'title', 51, 603, 'value', 'center', true); text('+', 'title', 161, 603, 'value', 'center', true); text(Math.round(z * 100) + '%', 'title', 106, 603, 'value', 'center', true);
  hits.push({ box: [24, 580, 164, 46], what: 'panel' }, { box: [36, 590, 30, 26], what: 'out' }, { box: [146, 590, 30, 26], what: 'in' }, { box: [70, 590, 72, 26], what: 'home' });   // the figure takes you back to the whole tree
  if (st.pick) card(st.pick);
  { const h = st.hover; if (h && h.kind && h !== st.pick && h.skill.web && (h.web || h.kind === 'mile')) tip(h); }
  alpha(1);
}
/** A node's name, on the outer side of its path so it never sits on the other path; a milestone's on alternate sides of the stem. */
function label(str, n, p, r, colour) {
  const h = n.skill.hub, dx = h[0] - ROOT_AT[0], dy = h[1] - ROOT_AT[1], len = Math.hypot(dx, dy), q = n.id.split('/'), mile = n.kind === 'mile';
  if (n.web && (n.kind === 'bridge' || n.kind === 'stub')) return text(str, 'line', p[0], p[1] + r + 10 + (n.key === 'x2' ? 13 : 0), colour, 'center', true, 2);   // under it, clear of the strand
  const i = mile ? +q[1].slice(1) : n.web ? 0 : +q[2], side = mile ? (i % 2 ? 1 : -1) : n.web ? n.side || (n.key === 't2' ? -1 : 1) : q[1] === '1' ? 1 : -1;
  if (n.web && n.named && n.adj.some(a => a.kind === 'bridge' || a.kind === 'stub')) return text(str, 'line', p[0] + dx / len * (r + 12) * .5, p[1] + dy / len * (r + 12), colour, 'center', true, 2);   // outward, clear of its bridge
  const nx = -dy / len * side, ny = dx / len * side;
  if (Math.abs(nx) > .62) text(str, 'line', p[0] + nx * (r + 7), p[1] + ny * (r + 7), colour, nx > 0 ? 'left' : 'right', true, 2);
  else { const d = r + 10 + (!mile && i % 2 ? 13 : 0); text(str, 'line', p[0] + nx * d * .4, p[1] + Math.sign(ny) * d, colour, 'center', true, 2); }
}
function ring2(p, r, notable) { const k = CALM ? 1 : easeOut(clamp((T - st.pickAt) / .12)); g.globalAlpha = k * GA; g.strokeStyle = '#e8cc8c'; g.lineWidth = 2; g.beginPath(); if (notable) { const d = r * 1.06; g.moveTo(p[0], p[1] - d); g.lineTo(p[0] + d, p[1]); g.lineTo(p[0], p[1] + d); g.lineTo(p[0] - d, p[1]); g.closePath(); } else g.arc(p[0], p[1], r, 0, 7); g.stroke(); g.globalAlpha = GA; }
/** What the pointer is on, said beside it: its name, what it does, and how far it is. */
function tip(n) {
  const p = SC(n.at), s = n.skill, state = stateOf(n), w = 190, lines = wrap(n.text, 'line', w - 24), r = n.web ? st.route : null, rz = n.r * st.z;
  let foot, fc; if (n.kind === 'stub') [foot, fc] = ['Later', 'hint']; else if (n.kind === 'mile') [foot, fc] = n.soon ? ['Not designed yet', 'hint'] : state === 'taken' ? ['Lit', 'label'] : ['Lit at ' + s.name + ' ' + n.level, 'hint'];
  else if (state === 'taken') [foot, fc] = ['Taken', 'label']; else if (state === 'dark') [foot, fc] = ['Dark: ' + s.name + ' is under ' + n.level, 'hint']; else if (state === 'open') [foot, fc] = ['1 point · click to read and take', 'blue'];
  else if (r && r.ok) [foot, fc] = [r.cost + ' points away · click for the route', 'blue']; else [foot, fc] = [(r && r.why) || why(n), 'hint'];
  const h = 12 + 22 + 18 + lines.length * 17 + 8 + 16 + 10; let x = p[0] + rz + 16, y = p[1] - h / 2; if (x + w > VIEW[2] - 8 || (st.pick && x + w > 920)) x = p[0] - rz - 16 - w; if (x < VIEW[0] + 8) x = VIEW[0] + 8; y = Math.max(VIEW[1] + 8, Math.min(VIEW[3] - 8 - h, y));
  panelAt(x, y, w, h); if (n.web && n.kind !== 'stub') glyph(n.name, x + w - 22, y + 22, 20, 'rgba(' + FAM[n.fam] + ',.95)');
  text(n.name, 'title', x + 12, y + 11, 'value'); text(n.kind === 'mile' ? 'Material' : KIND[n.kind] + ' · ' + n.path, 'line', x + 12, y + 34, n.web ? 'rgba(' + FAM[n.fam] + ',.95)' : 'label');
  lines.forEach((l, j) => text(l, 'line', x + 12, y + 54 + j * 17, 'value')); text(foot, 'line', x + 12, y + 54 + lines.length * 17 + 6, fc);
}
/** The picked thing, explained at the right: a node, a material milestone or a skill. */
function card(n) {
  const x = 928, w = 200, tx = x + 16, tw = w - 32, rows = []; let button = null;
  const add = (kind, ...a) => rows.push([kind, ...a]);
  if (n.kind) {
    const s = n.skill, state = stateOf(n);
    if (s.later || !n.name) { add('head', s.name); add('pair', 'Later', ''); add('text', 'This skill comes after the first eight. Its nodes are not designed yet.', 'hint'); }
    else if (n.kind === 'mile') {
      add('head', n.name); add('pair', s.name, 'Material'); add('text', n.text, 'value'); add('gap');
      add('kv', 'Costs', 'Nothing'); add('kv', 'Lit at', n.level ? s.name + ' ' + n.level : 'The start');
      if (s.web) add('kv', n.level ? 'Opens' : 'Starts', n.level ? 'The nodes past its ring' : 'Every route');
      add('note', n.soon ? 'Not designed yet' : state === 'taken' ? 'Lit' : 'Not yet', state === 'taken' ? 'label' : 'hint');
    } else if (n.kind === 'stub') { add('head', n.name); add('pair', s.name, 'Later'); add('text', n.text, 'hint'); }
    else if (n.web) {
      const bridge = n.kind === 'bridge', o = n.other;
      add('head', n.name); add('pair', bridge ? n.path : s.name + ' · ' + n.path, bridge ? 'Bridge' : n.kind === 'small' ? 'Small' : n.kind === 'notable' ? 'Notable' : 'Named'); add('text', n.text, 'value'); add('gap');
      add('kv', 'Costs', bridge ? '1 ' + s.name + ' or ' + o.name + ' point' : '1 ' + s.name + ' point');
      add('kv', 'Needs', (n.level ? (bridge ? s.name + ' or ' + o.name : s.name) + ' ' + n.level + ', a' : 'A') + ' taken node beside it' + (n.named ? ', a mark' : ''));
      if (n.named) add('kv', 'Marks', namedTaken(s) + ' of ' + marks(s) + ' used (15, 40, 65, 90)');
      if (bridge) add('note', 'Counts in both skills', 'label');
      if (state === 'dark') add('note', 'Dark: ' + s.name + ' is under ' + n.level, 'hint');
      const rt = state === 'locked' ? routeTo(n) : null; if (rt && rt.cost > 1) add('note', 'The route: ' + rt.path.map(x => x.name).join(', '), rt.ok ? 'label' : 'hint');
      button = state === 'open' ? ['Take', true] : state === 'taken' || state === 'dark' ? ['Taken', false] : rt && rt.ok ? ['Take route · ' + rt.cost, true, 'route'] : [(rt && rt.why) || why(n), false];
    } else {
      add('head', n.name); add('pair', s.name + ' · ' + n.path, 'Passive'); add('text', n.text, 'value'); add('gap');
      add('kv', 'Costs', '1 ' + s.name + ' point'); add('kv', 'Needs', s.name + ' ' + n.level + (n.prev ? ', ' + n.prev.name + (n.via ? ' or the bridge' : '') : '') + (n.mat && !n.mat.soon && n.mat.level ? ', ' + n.mat.name : ''));
      if (n.kind === 'notable') add('note', 'Notable', 'label');
      if (s.status === 'draft') add('note', 'Draft, not reviewed yet', 'hint');
      if (state === 'dark') add('note', 'Dark: ' + s.name + ' is under ' + n.level, 'hint');
      button = state === 'open' ? ['Take', true] : state === 'taken' || state === 'dark' ? ['Taken', false] : [why(n), false];
    }
  } else {
    add('head', n.name);
    if (n.later) { add('pair', 'Later', ''); add('text', 'This skill comes after the first eight.', 'hint'); }
    else if (n.web) { add('pair', 'Skill', level(n) + ' / 100'); add('text', 'Rises as you use it. A point every 5 levels. A mark at 15, 40, 65 and 90: each lets you take one named node.', 'value'); add('gap'); add('kv', 'Points', free(n) + ' to spend, ' + spent(n) + ' spent'); add('kv', 'Marks', namedTaken(n) + ' of ' + marks(n) + ' used'); add('kv', 'Paths', n.pathNames.join(', ')); add('note', n.status === 'draft' ? 'Draft: its named nodes are not reviewed yet' : n.name === 'Swords' ? 'Agreed for v1' : 'New web, to judge', 'hint'); }
    else { add('pair', 'Skill', level(n) + ' / 100'); add('text', 'Rises as you use it. A point at 15, 40, 65 and 90.', 'value'); add('gap'); add('kv', 'Points', free(n) + ' to spend, ' + spent(n) + ' spent'); add('kv', 'Paths', BRANCHES[n.name].paths.map(p => p[0]).join(', ')); if (n.status === 'draft') add('note', 'Draft, not reviewed yet', 'hint'); }
  }
  let h = 16; const lines = rows.map(r => { const y = h; if (r[0] === 'head') { r.lines = wrap(r[1], 'heading', tw); h += r.lines.length * 24 + 4; } else if (r[0] === 'pair') h += 24; else if (r[0] === 'text') { r.lines = wrap(r[1], 'line', tw); h += r.lines.length * 18 + 4; } else if (r[0] === 'gap') h += 6; else if (r[0] === 'kv') { r.lines = wrap(r[2], 'line', tw - 48); h += r.lines.length * 17 + 2; } else { r.lines = wrap(r[1], 'line', tw); h += r.lines.length * 17 + 2; } return y; });
  h += button ? 54 : 12; const y0 = 616 - h;
  const ck = CALM ? 1 : easeOut(clamp((T - st.pickAt) / .12)), keep = GA; g.save(); alpha(keep * ck);   // comes up in place
  panelAt(x, y0, w, h); hits.push({ box: [x, y0, w, h], what: 'panel' });
  rows.forEach((r, i) => { const y = y0 + lines[i];
    if (r[0] === 'head') r.lines.forEach((l, j) => text(l, 'heading', tx, y + j * 24, 'value'));
    if (r[0] === 'pair') { text(r[1], 'line', tx, y + 4, 'label'); text(r[2], 'line', x + w - 16, y + 4, 'hint', 'right'); }
    if (r[0] === 'text') r.lines.forEach((l, j) => text(l, 'line', tx, y + j * 18, r[2]));
    if (r[0] === 'kv') { text(r[1], 'line', tx, y, 'label'); r.lines.forEach((l, j) => text(l, 'line', tx + 48, y + j * 17, 'value')); }
    if (r[0] === 'note') r.lines.forEach((l, j) => text(l, 'line', tx, y + j * 17, r[2]));
  });
  if (button) { const bx = x + 24, by = y0 + h - 46; sprite('take', bx, by, 1, button[1] ? 1 : .45); const big = width(button[0], 'title') <= 136; text(button[0], big ? 'title' : 'line', bx + 76, by + 16, button[1] ? 'value' : 'hint', 'center', true); if (button[1]) hits.push({ box: [bx, by, 152, 32], what: button[2] || 'take' }); }
  g.restore(); alpha(keep);
}
/* ----- the mouse, the wheel, a finger ----- */
const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * TW / r.width, (e.clientY - r.top) * TH / r.height]; };
function hit(x, y) { let best = null, bd = 1e9; for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (h.box) { if (x >= h.box[0] && x < h.box[0] + h.box[2] && y >= h.box[1] && y < h.box[1] + h.box[3]) return best || h.what; continue; } const d = Math.hypot(x - h.x, y - h.y); if (d > h.r || ((x < VIEW[0] || y < VIEW[1] || x > VIEW[2] || y > VIEW[3]) && h.what !== 'close')) continue; if (typeof h.what === 'string') return best || h.what; if (d / h.r < bd) { bd = d / h.r; best = h.what; } } return best; }   // the nearest of the round things under the pointer
function zoomTo(z, x = LOOK[0], y = LOOK[1], atOnce = false) { z = Math.min(2.4, Math.max(.16, z)); const wx = (x - LOOK[0]) / st.z + st.cam[0], wy = (y - LOOK[1]) / st.z + st.cam[1]; if (atOnce || CALM) { st.z = st.zTo = z; st.cam = [wx - (x - LOOK[0]) / z, wy - (y - LOOK[1]) / z]; st.anchor = null; hold(); return; } st.zTo = z; st.anchor = [x, y, wx, wy]; }   // glides to z, the point under the mouse staying put
function hold() { st.cam[0] = Math.min(2020, Math.max(-900, st.cam[0])); st.cam[1] = Math.min(1420, Math.max(-760, st.cam[1])); }
function flyTo(p, z) { const from = { cam: st.cam.slice(), z: st.z }, t0 = performance.now(); st.fly = true; st.anchor = null; st.zTo = z; (function step(t) { const k = Math.min(1, (t - t0) / 320), e = k * k * (3 - 2 * k); st.z = from.z + (z - from.z) * e; st.cam = [from.cam[0] + (p[0] - from.cam[0]) * e, from.cam[1] + (p[1] - from.cam[1]) * e]; draw(); if (k < 1) requestAnimationFrame(step); else st.fly = false; })(t0); }
const middleOf = s => s.web ? fan(s.hub, 104 * K, 2) : outward(s.deg, 90, 0);
function click(what) {
  if (!what || what === 'panel') { if (!what) { st.pick = null; draw(); } return; }
  if (what === 'close') st.pick = null; else if (what === 'in') return zoomTo(st.zTo * 1.25); else if (what === 'out') return zoomTo(st.zTo / 1.25);
  else if (what === 'take') buy(st.pick);
  else if (what === 'route') { const r = routeTo(st.pick); if (r && r.ok) st.queue = r.path.map((x, i) => [x, T + i * .11]); }   // bought one after the other, so the light runs the whole way
  else if (what === 'home') return flyTo(HOME.slice(), HOMEZ);
  else if (typeof what === 'string' && what.startsWith('find ')) { const s = byName[what.slice(5)]; if (st.pick !== s) st.pickAt = T; st.pick = s; st.slider = s.name; sync(); return flyTo(middleOf(s), s.web ? 1 : 2); }
  else { if (st.pick !== what) st.pickAt = T; st.pick = what; const s = what.kind ? what.skill : what; if (!s.later) st.slider = s.name; if (!what.kind && s.web && st.z < .8) { sync(); return flyTo(middleOf(s), 1); } }   // a web's medallion takes you into it
  sync();
}
const fingers = new Map(); let moved = 0, pinch = 0;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); fingers.set(e.pointerId, at(e)); moved = 0; if (fingers.size === 2) { const [a, b] = [...fingers.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener('pointermove', e => {
  const p = at(e), was = fingers.get(e.pointerId);
  if (!was) { const h = hit(...p), hv = h && (h.kind || typeof h === 'string' && h.startsWith('find ')) ? h : null; cv.classList.toggle('point', !!h && h !== 'panel'); if (hv !== st.hover) { st.hover = hv; draw(); } return; }
  fingers.set(e.pointerId, p);
  if (fingers.size === 2) { const [a, b] = [...fingers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomTo(st.z * d / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, true); pinch = d; moved = 99; return; }
  moved += Math.abs(p[0] - was[0]) + Math.abs(p[1] - was[1]);
  if (moved > 5 && hit(...p) !== 'panel') { cv.classList.add('drag'); st.anchor = null; st.zTo = st.z; st.cam[0] -= (p[0] - was[0]) / st.z; st.cam[1] -= (p[1] - was[1]) / st.z; hold(); draw(); }
});
const up = e => { const p = at(e), had = fingers.has(e.pointerId); fingers.delete(e.pointerId); pinch = 0; cv.classList.remove('drag'); if (had && moved <= 5 && e.type === 'pointerup') click(hit(...p)); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); const p = at(e); zoomTo(st.zTo * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p[0], p[1]); }, { passive: false });
/* ----- the test controls ----- */
const who = document.getElementById('who'), slider = document.getElementById('level'), lv = document.getElementById('lv');
function sync() { const s = byName[st.slider]; who.textContent = st.slider; slider.value = st.levels[st.slider] || 0; lv.textContent = slider.value + ' (' + free(s) + ' to spend' + (s.web ? ', ' + (marks(s) - namedTaken(s)) + ' mark' + (marks(s) - namedTaken(s) === 1 ? '' : 's') + ' free' : '') + ')'; document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === st.preset)); draw(); }
slider.addEventListener('input', () => { st.levels[st.slider] = +slider.value; st.preset = ''; tidy(byName[st.slider]); sync(); });
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => usePreset(b.dataset.preset)));
document.getElementById('reset').addEventListener('click', () => { st.taken.clear(); st.order = []; st.paid = {}; st.queue = []; sync(); });
document.getElementById('again').addEventListener('click', () => { st.openAt = T; });
document.getElementById('look').addEventListener('click', () => click('find Swords'));
function fit() { const r = cv.getBoundingClientRect(), k = Math.min(3, Math.max(1, window.devicePixelRatio || 1)); cv.width = Math.round(r.width * k); cv.height = Math.round(r.width * k * TH / TW); draw(); }
window.addEventListener('resize', fit);
let left = Object.keys(P).length; for (const k in P) { const i = new Image(); i.onload = () => { img[k] = i; if (!--left) start(); }; i.src = P[k].u; }
/** Once a frame: the zoom glides, rings fill to their level, a point just earned or a material just reached is noted, hovered nodes swell. */
function step() {
  T = performance.now() / 1000;
  if (st.queue.length && T >= st.queue[0][1]) { if (!buy(st.queue.shift()[0])) st.queue = []; sync(); }
  if (st.anchor) { const [x, y, wx, wy] = st.anchor; st.z += (st.zTo - st.z) * .2; if (Math.abs(st.zTo - st.z) < .002) st.z = st.zTo; st.cam = [wx - (x - LOOK[0]) / st.z, wy - (y - LOOK[1]) / st.z]; hold(); if (st.z === st.zTo) st.anchor = null; }
  for (const s of skills) {
    const lv = level(s), was = s.shown ?? lv; s.shown = CALM || Math.abs(lv - was) < .05 ? lv : was + (lv - was) * .14;
    const e = earned(s); if (s.had !== undefined && e > s.had) s.flashAt = T; s.had = e;
    for (const m of s.miles) { const lit = stateOf(m) === 'taken'; if (m.was === false && lit) m.litAt = T; m.was = lit; m.hv = (m.hv || 0) + ((st.hover === m ? 1 : 0) - (m.hv || 0)) * .25; }
    for (const n of s.nodes) n.hv = (n.hv || 0) + ((st.hover === n ? 1 : 0) - (n.hv || 0)) * .25;
  }
}
function loop() { step(); draw(); requestAnimationFrame(loop); }
window.TEST = { st, skills, byId, byName, stateOf, why, routeTo, click, free, marks, namedTaken, SC, zoomTo, usePreset, tidy, sync, middleOf };   // for checking the page from outside; the game has no use for it
function start() { const go = () => { usePreset('seasoned'); fit(); T = performance.now() / 1000; st.openAt = T; loop(); }; if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(FACE.heading), document.fonts.load(FACE.line)]).then(go, go); else go(); }
</script></body></html>
`;
mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, html);
console.log(`${OUT} (${(html.length / 1024).toFixed(0)} KB, ${Object.keys(P).length} pieces) in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
