// The intake: ONE command per new asset of the layered characters. It imports it, fits it to every race it is for,
// renders it, finishes it into layer pictures, runs the pixel checks and makes a contact sheet to approve.
// What an asset is, is written in the wardrobe (scripts/art/wardrobe.json); the plan is docs/art-production-plan.md.
//   node scripts/art/intake.mjs <part>                    a part that is in the wardrobe: a body, a piece of clothing, hair,
//                                                         a weapon or a shield
//   node scripts/art/intake.mjs <animation>               an animation: every part of every race that takes part in it
//   node scripts/art/intake.mjs --new <id> --kind weapon --family one_handed --source quaternius_weapons --file Sword.gltf
//                               [--what "An arming sword."] [--length 0.95] [--handle far_from_widest] [--grip 0.3] [--how strap] [--spin 90] [--flip] [--materials "Steel=iron;Wood=wood+hide"]
//   node scripts/art/intake.mjs --new <id> --kind clothing --slot top --races human --source quaternius_outfits
//                               --meshes "Male_Knight_Body+Male_Knight_Arms" --materials "MI_Knight=cloth+hide+iron"
//                                                         writes the wardrobe's line for a new part, then takes it in
//   node scripts/art/intake.mjs <part> --status approved  writes Michael's verdict into the wardrobe (approved, trial, rejected)
//   options: --race human        only that race (left out: every race the part is for)
//            --anims idle,swing  only those animations (left out: every animation the part takes part in that the race has)
//            --sides SE          the sides (left out: SE; "all" for the eight)
//            --samples 256       left out: the wardrobe's (256, as every character). Fewer is a trial, and the sheet says so
//            --assets <folder>   where the model files are, one sub-folder per source (or RENOWN_ASSETS;
//                                left out: /mnt/project-files/characters/models). Never in the repo
//            --store <folder>    where the renders, the layer pictures and the sheets go and stay (or RENOWN_STORE;
//                                left out: scripts/art/out/wardrobe, which git does not see)
//            --keep <folder>     the lasting copy of the store (or RENOWN_KEEP; left out: /mnt/project-files/characters/store
//                                when that disk is there; "none" for none). The store itself is a working copy on this
//                                machine: a cloud machine is thrown away, and a network disk is too slow and too unsure to
//                                work on. What the store lacks is fetched from the lasting copy first, and what an intake
//                                made is put there when its checks pass, as one .tar per race, animation and side
//            --arm-turn x,y,z    a trial turn of the arm that carries a shield (degrees, about its shoulder); with a trial --store
//            --no-godot          leaves out the draw check in Godot (it needs a screen, or xvfb-run)
//            --no-render         the renders in the store are taken as they are: finish, check and sheet only
// The steps, each printed as it is done:
//   1 import   the wardrobe is sound; the model file is there; for a held thing: where its handle is, and every one of
//              its materials has ramps
//   2 fit      a race whose model came with no skeleton is rigged first (rig_static.py, by the landmarks of its fit's "rig");
//              a race whose model came on another skeleton is put on ours once (onto_our_rig.py, which also turns its
//              forearms and hands, at rest, to lie as ours); a held thing is put in the race's hand and sized for it (held_gear.py).
//              A race body (a body part, or a fit just made) has the arms check: its forearms and hands at rest against our
//              skeleton's, at most the wardrobe's arms_at_rest_deg off, or the intake stops
//   3 render   character.py, at the race's own settings: the part lit on the race's dressed body, and one render of the
//              whole for the proof. Dressed-body parts that have no layers yet for that animation are rendered with it.
//              A shield is carried by its arm (the wardrobe's render.shield_arm, character.py --borrow), with the first
//              weapon in the other hand, in the animation's variant <anim>+shield: the shield and the parts that cover that
//              arm ("arms": true) get layers there; every other part is the plain animation's (paperdoll.mjs layerFile).
//              An animation's own intake leaves shields out (each is taken in on its own)
//   4 finish   paperdoll.mjs: layer pictures and their shadows, in <store>/<race>/layers
//   5 check    in the frame (room for the outline) / seen at all / the layers against the one render, pixel by pixel /
//              drawn by Godot's shader / against the last intake of the same part / for a race other than the grip race
//              (human): each held thing points within held_angle_deg (5) of the way it points in the human's hand, in every
//              picture / for a shield, the clipping check: in every picture its mesh crosses no face of anything seen with
//              it (the body, the head, the clothes, the weapon), or that picture fails. A race body is tried with the first weapon of its family in a weapon's animation, so it has that check
//   6 sheet    <store>/sheets/<id>.png (<id>.<race>.png with --race): worn, alone and at the game's size, with the checks and the cost under them
//   7 budget   what the race costs to render now
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './png.mjs';
import { RAMP } from './style.mjs';
import { FILE, load, real, held, wears, partsOf, live, rules as raceRules, takesPart, problems, budget, budgetText, KINDS } from './wardrobe.mjs';
import { outfit, palette, lay, paint, outline, shade, frameLayers, against, makeLayers, layerFile } from './paperdoll.mjs';
import { canvas, put, write, lines, box, save } from './sheet.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..', '..'), nn = k => String(k).padStart(2, '0');
const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; }, flag = n => { const i = a.indexOf(n); if (i >= 0) a.splice(i, 1); return i >= 0; };
const stop = t => { console.error(t); process.exit(1); };
const assets = resolve(opt('--assets') || process.env.RENOWN_ASSETS || '/mnt/project-files/characters/models');
const store = resolve(opt('--store') || process.env.RENOWN_STORE || join(HERE, 'out', 'wardrobe'));
const keepArg = opt('--keep') || process.env.RENOWN_KEEP || (existsSync('/mnt/project-files/') ? '/mnt/project-files/characters/store' : 'none'), keep = keepArg === 'none' ? null : resolve(keepArg);
const onlyRace = opt('--race'), onlyAnims = opt('--anims'), sidesArg = opt('--sides', 'SE'), noGodot = flag('--no-godot'), noRender = flag('--no-render'), status = opt('--status'), fresh = opt('--new');
let W = load();
const armTurn = opt('--arm-turn'); // a trial turn of the shield arm, "x,y,z" degrees (left out: render.shield_arm.turn_in[anim], else .turn); use it with a trial --store
const samples = +opt('--samples', W.render.samples), FRAMES = W.render.pictures, sides = sidesArg === 'all' ? W.render.sides : sidesArg.split(',');
const step = (n, t) => console.log(`${n} ${t}`);

/** Changes one line of the wardrobe: the line of `id` under `block` ("parts", "animations"), by `change(line)`. The file keeps its shape. */
function rewrite(id, change, block = W.parts[id] ? 'parts' : 'animations') {
  const text = readFileSync(FILE, 'utf8').split('\n'), from = text.findIndex(l => l.startsWith(`\t"${block}": {`)),      // in its own block: a race may share a part's name (the orc)
    at = text.findIndex((l, i) => i > from && l.startsWith(`\t\t"${id}": {`));
  if (at < 0) stop(`the wardrobe has no line for ${id}`);
  text[at] = change(text[at]); writeFileSync(FILE, text.join('\n')); W = load();
}
const oneLine = o => JSON.stringify(o, null, 1).replace(/\n\s*/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']');

// --new: the wardrobe's line for a part that is not in it yet
if (fresh) {
  if (W.parts[fresh] || W.animations[fresh]) stop(`${fresh} is already in the wardrobe`);
  const kind = opt('--kind'), source = opt('--source'), family = opt('--family'), file = opt('--file'), meshes = opt('--meshes'), mats = opt('--materials'), races = opt('--races'), what = opt('--what', '');
  if (!KINDS.includes(kind)) stop(`--kind: one of ${KINDS.join(', ')}`);
  if (!W.sources[source]) stop(`--source: one of ${real(W.sources).map(([k]) => k).join(', ')}`);
  const isHeld = kind === 'weapon' || kind === 'shield', slot = opt('--slot') || (kind === 'weapon' ? 'main_hand' : kind === 'shield' ? 'off_hand' : kind === 'hair' ? 'hair' : kind === 'body' ? 'body' : null);
  if (!slot) stop('--slot: which slot it is worn in');
  if (isHeld && !file) stop('--file: its model file, inside the source\'s folder'); if (!isHeld && !meshes) stop('--meshes "Object+Object": the objects of the race\'s loaded files that make it up');
  if (!isHeld && !races) stop('--races human,goblin: clothes, hair and bodies are per race'); if (!isHeld && !mats) stop('--materials "MI_Name=cloth+hide+iron;...": which ramps each of its materials may take');
  const hold = {}; for (const k of ['handle', 'how']) { const v = opt(`--${k}`); if (v) hold[k] = v; } for (const k of ['length', 'grip', 'lean', 'scale', 'spin']) { const v = opt(`--${k}`); if (v) hold[k] = +v; } if (flag('--flip')) hold.flip = true;
  const entry = { kind, ...(isHeld ? { family: family || (kind === 'shield' ? 'shield' : stop('--family: one of ' + real(W.families).map(([k]) => k).join(', '))) } : {}), slot,
    races: races ? races.split(',') : 'all', source, ...(isHeld ? { file, bone: opt('--bone') || (kind === 'shield' ? 'lowerarm_l' : 'hand_r'), hold: kind === 'shield' ? { how: 'strap', ...hold } : hold } : { meshes }),
    materials: mats ? Object.fromEntries(mats.split(';').filter(Boolean).map(m => { const [k, v] = m.split('='); return [k.trim(), v.split('+').map(s => s.trim())]; })) : {}, status: 'trial', what };
  if (isHeld && !mats) { const found = measured(join(assets, W.sources[source].folder, file), entry.hold);
    for (const m of found.materials) entry.materials[m] = ['iron', 'wood', 'hide']; }       // every pixel takes the nearest of the three, by its own colour
  const text = readFileSync(FILE, 'utf8'), end = text.lastIndexOf('\n\t}\n}');
  writeFileSync(FILE, text.slice(0, end) + `,\n\t\t${JSON.stringify(fresh)}: ${oneLine(entry)}` + text.slice(end)); W = load();
  console.log(`the wardrobe has a new line: ${fresh} (${kind}, ${W.sources[source].title}). Look at it; then it is taken in.`);
  a.unshift(fresh);
}

const id = a.shift();
if (!id) stop('node scripts/art/intake.mjs <part or animation> | --new <id> --kind ... (see the top of the file)');
if (status) { if (!W.parts[id]) stop(`no part named ${id}`); if (!['approved', 'trial', 'rejected'].includes(status)) stop('--status approved, trial or rejected');
  rewrite(id, l => l.replace(/"status": "[^"]*"/, `"status": "${status}"`)); console.log(`${id}: ${status}`); process.exit(0); }
const part = W.parts[id], isAnim = !part && !!W.animations[id];
if (!part && !isAnim) stop(`${id} is neither a part nor an animation of the wardrobe. A new part: --new ${id} --kind ...`);

/** What held_gear.py finds in a held thing's model file. */
function measured(file, hold = {}) {
  if (!existsSync(file)) stop(`the model file is not there: ${file}`);
  const r = spawnSync('python3.11', [join(HERE, 'held_gear.py'), file, JSON.stringify(hold)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = (r.stdout || '').split('\n').find(l => l.startsWith('MEASURED ')); if (!line) stop(`held_gear.py could not read ${file}:\n${(r.stdout + r.stderr).split('\n').filter(l => /Error|error|Exit/.test(l)).slice(-5).join('\n')}`);
  return JSON.parse(line.slice(9));
}
const fileOf = p => join(assets, W.sources[p.source].folder, p.file);
const have = p => !!(p.meshes || p.gear || (p.file && existsSync(fileOf(p))));

// 1 import
{ const bad = problems(W); if (bad.length) stop(`1 import: the wardrobe is not sound:\n  ${bad.join('\n  ')}`);
  if (part) { const src = W.sources[part.source];
    if (part.file) { const m = measured(fileOf(part), part.hold), missing = m.materials.filter(x => !part.materials[x]);
      if (missing.length) stop(`1 import: ${id} has materials the wardrobe gives no ramps: ${missing.join(', ')}. Add them to its "materials".`);
      step(1, `import: ${part.file} (${src.title}, ${src.licence}): ${m.points} points, ${m.length.toFixed(2)} long, ${m.width.toFixed(2)} wide, ${m.thick.toFixed(2)} thick; the hand at ${m.grip_from_handle} of its length from the handle's end; materials ${m.materials.join(', ')}`);
    } else step(1, `import: ${part.gear ? 'made in code' : part.meshes} (${src.title}, ${src.licence})`);
  } else { const A = W.animations[id], src = W.sources[A.source]; if (!A.action || !src) stop(`1 import: ${id} names no action yet (its source: ${src ? src.title : 'none'}). Write "action" and "source" in the wardrobe first.`);
    if (!existsSync(join(assets, src.folder, src.file || ''))) stop(`1 import: ${src.title} is not in ${join(assets, src.folder)}`);
    step(1, `import: ${A.action} of ${src.title} (${src.licence})`); } }

const races = real(W.races).map(([k]) => k).filter(r => (!onlyRace || r === onlyRace) && (isAnim || wears(part, r)));
if (!races.length) stop(`no race to take ${id} in for${onlyRace ? ` (${onlyRace} does not wear it)` : ''}`);
const run = (cmd, args, log) => new Promise(done => { const p = spawn(cmd, args, { cwd: ROOT }); let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => { if (log) writeFileSync(log, out.split('\n').filter(l => !/INFO|^$/.test(l)).slice(-80).join('\n')); done({ code, out }); }); });
const results = [];                                     // one per race, animation and side: what the sheet shows
const tar = (...args) => { const r = spawnSync('tar', args, { encoding: 'utf8' }); if (r.status !== 0) stop(`tar ${args.join(' ')}:\n${r.stderr}`); };
/** From the lasting copy, what the store lacks: a race's layer pictures, and the renders of one animation and side. */
function fetch(race, anim, side) { if (!keep) return;
  const layers = join(store, race, 'layers'), renders = join(store, race, 'renders', anim), L = join(keep, race, 'layers.tar'), Rn = join(keep, race, 'renders', `${anim}.${side}.tar`);
  if (!existsSync(layers) && existsSync(L)) { mkdirSync(join(store, race), { recursive: true }); tar('-xf', L, '-C', join(store, race)); console.log(`  fetched ${race}'s layers from ${keep}`); }
  if (!(existsSync(renders) && readdirSync(renders).some(f => f.startsWith(side + '.') && f.endsWith('.depth.png'))) && existsSync(Rn)) { mkdirSync(renders, { recursive: true }); tar('-xf', Rn, '-C', renders); console.log(`  fetched ${race}'s renders of ${anim} ${side} from ${keep}`); }
}
/** To the lasting copy: a race's layer pictures and the renders of what was just taken in. */
function put_away(race, done) { if (!keep) return; mkdirSync(join(keep, race, 'renders'), { recursive: true });
  tar('-cf', join(keep, race, 'layers.tar'), '-C', join(store, race), 'layers');
  for (const [anim, side] of done) { const dir = join(store, race, 'renders', anim); tar('-cf', join(keep, race, 'renders', `${anim}.${side}.tar`), '-C', dir, ...readdirSync(dir).filter(f => f.startsWith(side + '.'))); }
}

/** The arms check of a race body: its forearms and hands, at rest, against our skeleton's (onto_our_rig.py --check). Stops the
 *  intake when they lie further off than the wardrobe allows: every animation would turn its wrists otherwise than ours. */
function armsAtRest(race, R) {
  const model = R.render.models[0], tol = W.render.arms_at_rest_deg;
  const r = spawnSync('python3.11', [join(HERE, 'onto_our_rig.py'), '--check', join(assets, model), '--ours', join(assets, W.render.skeleton)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = (r.stdout || '').split('\n').find(l => l.startsWith('ARMS '));
  if (!line) stop(`2 fit: the arms check could not read ${model}:\n${(r.stdout + r.stderr).split('\n').filter(l => /Error|error|Exit|no bone/.test(l)).slice(-4).join('\n')}`);
  const g = JSON.parse(line.slice(5)), worst = Math.max(g.l.forearm, g.l.hand, g.r.forearm, g.r.hand);
  const text = `${race}'s arms at rest against our skeleton's: forearms ${g.l.forearm} and ${g.r.forearm} deg off, hands ${g.l.hand} and ${g.r.hand} (left, right; at most ${tol} allowed)`;
  if (worst > tol) stop(`2 fit: FAIL ${text}. Its wrists would turn otherwise than ours in every animation, and it would hold every weapon askew. Make its fit again with scripts/art/onto_our_rig.py, which turns its forearms and hands to lie as ours (delete the wardrobe's fit "to" file and run the intake), and read what it prints.`);
  step(2, `fit: ok   ${text}`); return text;
}
/** The way each held thing points in each picture, from a render's anim.json: in 3D (the figure's own space), or else on the screen. */
const pointing = file => { if (!existsSync(file)) return null; const j = JSON.parse(readFileSync(file, 'utf8')); return { three: j.pointing || {}, screen: j.held || {} }; };
const screenDeg = s => Math.atan2(s[1] - s[3], s[2] - s[0]) * 180 / Math.PI;
/** In every picture, how many degrees `k` points otherwise in `me` than in `ref`; null when either lacks it. */
function apart(me, ref, k) {
  const a3 = me?.three[k], b3 = ref?.three[k], a2 = me?.screen[k], b2 = ref?.screen[k];
  if (a3 && b3 && a3.length === b3.length) return { how: 'in the figure\'s own space', gaps: a3.map((v, i) => Math.acos(Math.max(-1, Math.min(1, v[0] * b3[i][0] + v[1] * b3[i][1] + v[2] * b3[i][2]))) * 180 / Math.PI) };
  if (a2 && b2 && a2.length === b2.length) return { how: 'on the screen (the other render is older than the 3D record)', gaps: a2.map((s, i) => Math.abs(((screenDeg(s) - screenDeg(b2[i])) % 360 + 540) % 360 - 180)) };
  return null;
}

for (const race of races) { const R = W.races[race], rules = raceRules(W, race), mine = Object.fromEntries(partsOf(W, race));
  // 2 fit
  const fitted = R.render.fit && !existsSync(join(assets, R.render.fit.to));
  if (fitted) { const f = R.render.fit; step(2, `fit: ${race}'s model onto our skeleton`);
    if (f.rig && !existsSync(join(assets, f.from))) {              // a model that came with no skeleton: rigged first, by its landmarks
      step(2, `fit: ${race}'s model has no skeleton: rigging it (rig_static.py, ${f.rig.marks})`);
      const r = spawnSync('python3.11', [join(HERE, 'rig_static.py'), '--model', join(assets, f.rig.model), '--ours', join(assets, f.ours), '--marks', join(ROOT, f.rig.marks), '--out', join(assets, f.from)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
      if (!existsSync(join(assets, f.from))) stop(`2 fit: rig_static.py did not make ${f.from}:\n${(r.stdout + r.stderr).split('\n').slice(-6).join('\n')}`); }
    const r = spawnSync('python3.11', [join(HERE, 'onto_our_rig.py'), '--model', join(assets, f.from), '--ours', join(assets, f.ours), '--out', join(assets, f.to), ...(f.drop ? ['--drop', f.drop] : []), ...(f.upper ? ['--upper'] : [])], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (!existsSync(join(assets, f.to))) stop(`2 fit: onto_our_rig.py did not make ${f.to}:\n${(r.stdout + r.stderr).split('\n').slice(-6).join('\n')}`); }
  else step(2, `fit: ${race}${part && held(part) ? `, in its ${part.bone === 'lowerarm_l' ? 'off arm' : 'hand'}, sized ${R.gear_scale ?? 1} of a human's` : ', on our skeleton'}`);
  const arms = (fitted || part?.kind === 'body') ? armsAtRest(race, R) : null;        // a race body: its arms lie as ours at rest
  /** The parts beside `p` on the race's dressed body: its outfit, less what sits in p's own slot and what p hides. */
  const beside = (pid) => R.outfit.filter(o => o !== pid && mine[o].slot !== mine[pid].slot && !(rules.parts[pid].hides || []).includes(mine[o].slot));
  const view = pid => { const o = beside(pid); return `${pid}=${pid}${o.length ? '|' + o.join('+') : ''}`; };
  const anims = (isAnim ? [id] : onlyAnims ? onlyAnims.split(',') : real(W.animations).filter(([, A]) => takesPart(W, part, A) && (A.made?.[race] || []).length).map(([k]) => k));
  if (!anims.length) stop(`${race} has no animation to take ${id} in for. Take an animation in first (node scripts/art/intake.mjs idle --race ${race}), or name some: --anims idle`);
  for (const anim of anims) { const A = W.animations[anim]; if (!A || !A.action) stop(`animation ${anim}: not in the wardrobe, or it names no action`);
    if (part && !takesPart(W, part, A)) stop(`${id} is not rendered in ${anim} (it is for ${A.for.join(', ')})`);
    for (const side of sides) { const renders = join(store, race, 'renders'), layers = join(store, race, 'layers');
      // a shield is carried by its arm, held up (wardrobe render.shield_arm): the animation's variant <anim>+shield
      const armed = !!(part?.kind === 'shield' && W.render.shield_arm), key = armed ? `${anim}+shield` : anim, base = join(renders, key, side);
      fetch(race, key, side);
      // what is worn in the proof, and what has to be rendered
      const want = isAnim ? partsOf(W, race).filter(([, p]) => live(p) && takesPart(W, p, A) && have(p) && !(p.kind === 'shield' && W.render.shield_arm)).map(([k]) => k) : [id];
      if (isAnim && W.render.shield_arm && partsOf(W, race).some(([, p]) => live(p) && p.kind === 'shield' && takesPart(W, p, A))) step(3, `render: ${race}'s shields are left out here: each is taken in on its own, with the arm that carries it (node scripts/art/intake.mjs <shield>)`);
      const firstHeld = (isAnim || part?.kind === 'body' || armed) && A.for ? partsOf(W, race).find(([, p]) => live(p) && held(p) && takesPart(W, p, A) && have(p) && p.kind === 'weapon') : null;
      const wear = Object.fromEntries(R.outfit.map(o => [mine[o].slot, o])); if (part) wear[part.slot] = id; if (firstHeld) wear[firstHeld[1].slot] = firstHeld[0];
      const worn = outfit(rules, wear), whole = `whole_${id}`;
      for (const o of worn) if (!want.includes(o) && !existsSync(join(layers, o, `${anim}.${side}.00.png`))) want.push(o);        // the dressed body has no layers here yet
      // what covers the shield arm, raised: every part of the race that covers that arm, worn now or not (a page may dress
      // the figure in another top; without its raised arm it would show the arm down and the shield floating beside it)
      if (armed) for (const [o, q] of partsOf(W, race)) if (q.arms && live(q) && have(q) && takesPart(W, q, A) && !want.includes(o) && !existsSync(join(layers, o, `${key}.${side}.00.png`))) want.push(o);
      // 3 render
      const args = [join(HERE, 'character.py')]; for (const m of R.render.models) args.push('--model', join(assets, m));
      args.push(...R.render.args.map(s => s.replaceAll('<assets>', assets)), ...(A.args || []), '--turn', String(W.render.turn[side]));
      for (const [k, p] of Object.entries(mine)) if (p.meshes) args.push('--part', `${k}=${p.meshes}`);
      const inPicture = new Set([...want, ...worn, ...want.flatMap(beside)]);
      const gear = [...inPicture].filter(k => mine[k].gear).map(k => mine[k].gear); if (gear.length) args.push('--gear', gear.join(';'));
      for (const k of inPicture) if (mine[k].file) args.push('--hold', JSON.stringify({ name: k, file: fileOf(mine[k]), bone: mine[k].bone || 'hand_r', unit_tiles: W.render.gear_unit_tiles * (R.gear_scale ?? 1), ...(mine[k].hold || {}) }));
      if (armed) { const SA = W.render.shield_arm, S = W.sources[SA.source]; args.push('--borrow', `${join(assets, S.folder, S.file)}|${SA.action}@${SA.at}=${SA.bones}`, '--borrow-follow', SA.follow || 'figure', '--borrow-turn', armTurn || SA.turn_in?.[anim] || SA.turn || '0,0,0'); }
      args.push('--anim', join(assets, W.sources[A.source].folder, W.sources[A.source].file), '--action', A.action, '--frames', String(FRAMES), '--samples', String(samples), '--point', '--quick');
      for (const k of want) args.push('--view', view(k)); args.push('--view', `${whole}=${worn.join('+')}`, '--out', base);
      mkdirSync(join(renders, key), { recursive: true });
      const before = !isAnim && existsSync(join(layers, id, `${key}.${side}.00.png`)) ? [...Array(FRAMES).keys()].map(k => readPng(join(layers, id, `${key}.${side}.${nn(k)}.png`))) : null;
      const jobs = 4, per = Math.ceil(FRAMES / jobs), takes = [...Array(jobs).keys()].map(j => [j * per, Math.min(FRAMES, (j + 1) * per) - 1]).filter(([x, y]) => x <= y), t0 = Date.now();
      const ran = noRender ? [{ out: '' }] : await Promise.all(takes.map(([x, y]) => run('python3.11', [...args, '--take', `${x}-${y}`], `${base}.${id}.${x}-${y}.log`)));
      const secs = (Date.now() - t0) / 1000, lost = []; for (const k of [...want, whole]) for (let f = 0; f < FRAMES; f++) if (!existsSync(`${base}.${k}.${nn(f)}.depth.png`)) lost.push(`${k}.${nn(f)}`);
      if (lost.length) stop(`3 render: ${race} ${anim} ${side}: ${lost.length} pictures were not made (${lost.slice(0, 4).join(', ')}...). The log's last lines:\n${ran.map(r => r.out.split('\n').filter(l => /Error|error|no object|no part|Exit/.test(l)).slice(-3).join('\n')).filter(Boolean)[0] || ran[0].out.split('\n').slice(-6).join('\n')}`);
      const each = secs / ((want.length + 1) * FRAMES), drawn = ran[0].out.split('\n').find(l => l.startsWith(`held ${id}: drawn`));
      if (noRender) step(3, `render: ${race} ${anim} ${side}: left as it is in the store`); else
      step(3, `render: ${race} ${key} ${side}: ${want.join(', ')} and the whole, ${FRAMES} pictures each at ${samples} samples, in ${Math.round(secs)} s (${each.toFixed(2)} s a part and picture; the budget counts ${W.render.seconds_per_part_picture})${drawn ? '; ' + drawn.slice(5) : ''}`);
      // 4 finish
      const made = makeLayers(renders, layers, rules, want, [key], side); step(4, `finish: ${made} layer pictures in ${layers}`);
      // 5 check
      const checks = [], say = (ok, text) => { checks.push({ ok, text }); step(5, `check: ${ok === null ? 'note' : ok ? 'ok  ' : 'FAIL'} ${text}`); };
      if (arms) say(true, arms);
      const ref = W.render.grip_race, tol = W.render.held_angle_deg;
      if (race !== ref) for (const k of worn.filter(k => mine[k].file && held(mine[k]))) {     // a held thing lies in this race's hand as in a man's
        fetch(ref, key, side); const d = apart(pointing(`${base}.anim.json`), pointing(join(store, ref, 'renders', key, `${side}.anim.json`)), k);
        if (!d) { say(null, `no ${ref} render of ${k} in ${anim} ${side} to measure its angle against (take it in for the ${ref} too)`); continue; }
        const worst = Math.max(...d.gaps), at = d.gaps.indexOf(worst), mean = d.gaps.reduce((x, y) => x + y, 0) / d.gaps.length;
        say(worst <= tol, `${k} points as in the ${ref}'s hand: at most ${worst.toFixed(1)} deg apart (picture ${at}; on average ${mean.toFixed(1)}), ${d.how}; ${tol} allowed`); }
      const shown = isAnim ? worn : [id], frames = k => frameLayers(layers, shown, key, side, k); let edge = 0, least = 1e9, most = 0;
      for (let k = 0; k < FRAMES; k++) { let n = 0; for (const L of frames(k)) for (let i = 0; i < L.width * L.height; i++) if (L.data[i * 4 + 3]) { n++; const x = i % L.width, y = (i / L.width) | 0; if (x < 2 || y < 2 || x >= L.width - 2 || y >= L.height - 2) edge++; }
        least = Math.min(least, n); most = Math.max(most, n); }
      say(edge === 0, edge ? `${edge} pixels lie within 2 px of the picture's edge: the frame is too small for it` : 'in the frame, with room for the outline');
      say(most > 0, most ? `seen: ${least} to ${most} pixels a picture${least === 0 ? ' (hidden in some pictures)' : ''}` : 'it has no pixel in any picture');
      const v = against(renders, layers, rules, worn, key, side, whole), share = v.px ? 100 * v.tone / v.px : 0;
      say(v.part === 0, `the layers laid over each other against one render of ${worn.join(' + ')}: ${v.part} of ${v.px} pixels show another surface${v.part ? '' : ' (the stacking is exact)'}`);
      say(null, `${share.toFixed(1)} % of them are a tone off: the light that parts throw on each other (a held thing shades the body; accepted up to about 17 %)`);
      if (armed) { const j = JSON.parse(readFileSync(`${base}.anim.json`, 'utf8')), per = j.clips?.[id];        // the clipping check: in every picture
        if (!per) say(false, `the render holds no clipping record for ${id}`);
        else { const bad = per.map((c, i) => [i, c]).filter(([, c]) => Object.keys(c).length), into = [...new Set(bad.flatMap(([, c]) => Object.keys(c)))];
          say(!bad.length, bad.length ? `the shield goes into ${into.join(', ')} in ${bad.length} of ${per.length} pictures (${bad.map(([i, c]) => `${nn(i)}: ${Object.entries(c).map(([w, n]) => `${w} ${n} faces`).join(', ')}`).join('; ')})`
            : `the shield goes into nothing in any of the ${per.length} pictures (its mesh against ${worn.filter(o => o !== id).join(', ')}, every face${j.strapped?.[id] ? `; its own straps round the forearm and fist not counted: ${j.strapped[id]} faces cross them, as they should` : ''})`); } }
      if (before) { let n = 0, px = 0; for (let k = 0; k < FRAMES; k++) { const now = readPng(join(layers, id, `${key}.${side}.${nn(k)}.png`)); let d = 0; for (let i = 0; i < now.data.length; i++) if (now.data[i] !== before[k].data[i]) { d = 1; px++; } n += d; }
        say(null, n ? `against the last intake: ${n} of ${FRAMES} pictures changed` : 'against the last intake: the same, pixel for pixel'); }
      if (!noGodot) { const noScreen = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
        const g = spawnSync('node', [join(HERE, 'paperdoll.mjs'), 'godot', layers, join(store, race, 'godot', id), '--race', race, '--anim', key, '--side', side, '--wear', Object.entries(wear).map(([s, p]) => `${s}=${p}`).join(','), ...(noScreen ? ['--method', 'gl_compatibility'] : [])], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
        const line = (g.stdout || '').split('\n').find(l => /frames drawn by Godot/.test(l)) || (g.error ? 'Godot did not answer in 3 minutes' : 'Godot did not run');
        say(g.status === 0, `drawn by Godot's shader: ${line.replace(/^.*?: /, '')}`); }
      results.push({ race, anim, key, side, worn, wear, checks, secs, each, layers, rules, drawn });
    } }
  const clean = !results.some(r => r.race === race && r.checks.some(c => c.ok === false));
  if (clean) { put_away(race, results.filter(r => r.race === race).map(r => [r.key, r.side])); if (keep) console.log(`  ${race}: put away in ${keep}`); }
  if (isAnim && clean) rewrite(id, l => { const m = JSON.parse(l.match(/"made": (\{[^}]*\})/)[1]); m[race] = [...new Set([...(m[race] || []), ...sides])];
    return l.replace(/"made": \{[^}]*\}/, `"made": ${oneLine(m)}`); });
}

// 6 sheet
{ const what = part || W.animations[id], src = W.sources[what.source], grass = RAMP.grass[3], dark = [44, 44, 40], pale = [226, 222, 208], dim = [150, 147, 135], good = [150, 200, 110], poor = [235, 120, 90];
  const blocks = results.map(r => { const pal = palette(r.rules), alone = part ? [id] : r.worn, pics = [...Array(FRAMES).keys()].map(k => {
      const L = frameLayers(r.layers, r.worn, r.key, r.side, k), sh = shade(r.worn.map(q => readPng(layerFile(r.layers, q, r.key, r.side, k, '.shadow.png'))));
      return { worn: outline(paint(lay(L), pal)), shadow: sh, alone: outline(paint(lay(frameLayers(r.layers, alone, r.key, r.side, k)), pal)) }; });
    const bb = [1e9, 1e9, -1, -1]; for (const p of pics) for (const q of [p.worn, p.shadow]) for (let i = 0; i < q.width * q.height; i++) if (q.data[i * 4 + 3]) { const x = i % q.width, y = (i / q.width) | 0; bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }
    const crop = [Math.max(0, bb[0] - 5), Math.max(0, bb[1] - 5), 0, 0]; crop[2] = Math.min(pics[0].worn.width, bb[2] + 6) - crop[0]; crop[3] = Math.min(pics[0].worn.height, bb[3] + 6) - crop[1];
    return { ...r, pics, crop }; });
  const k2 = b => b.crop[2] < 60 ? 3 : 2, shownAt = b => { const n = Math.max(3, Math.min(8, Math.floor(1568 / (b.crop[2] * k2(b))))); return [...Array(n).keys()].map(i => Math.round(i * (FRAMES - 1) / (n - 1))); };
  const T = 2, wide = 1600, text = wide - 32, perLine = (b, kk) => Math.max(1, Math.floor(text / (b.crop[2] * kk))), linesOf = (b, n, kk) => Math.ceil(n / perLine(b, kk));     // T: how big the letters are
  const head = [`${id}: ${what.what || what.why}`, part ? `${part.kind}${part.family ? ', ' + part.family.replace('_', '-') : ''}, slot ${part.slot}, for ${part.races === 'all' ? 'every race' : part.races.join(', ')}. Status: ${part.status}${samples < W.render.samples ? `. A TRIAL at ${samples} samples, not the ${W.render.samples} of every character` : ''}`
    : `animation ${what.action}, for ${what.for ? what.for.join(', ') : 'everyone'}; needed: ${what.need === 'slice' ? 'first game' : what.need}${samples < W.render.samples ? `. A TRIAL at ${samples} samples` : ''}`,
    `Source: ${src.title} by ${src.by}. Licence: ${src.licence}. ${src.credit_required ? 'CREDIT REQUIRED: ' + src.credit : 'No credit required.'}`];
  const cost = part ? (() => { const b = budget(W, results[0].race), c = held(part) ? b.more[part.family] : b.more.part; return `Cost: this part adds about ${c.slice < 10 ? c.slice.toFixed(1) : Math.round(c.slice)} min of rendering a race for the first game's animations (${Math.round(c.all)} min with the later ones).`; })()
    : `Cost: this animation is ${results.map(r => `${Math.round(budget(W, r.race).more.animation.slice)} min for ${r.race}`).join(', ')} on all eight sides.`;
  const foot = [cost, ...budgetText(W, [...new Set(results.map(r => r.race))]).split('\n').slice(1), part ? `To approve: node scripts/art/intake.mjs ${id} --status approved` : ''].filter(Boolean);
  const headLines = head.flatMap((t, i) => lines(t, text, i ? T : T + 1).map(l => [l, i ? T : T + 1])), footLines = foot.flatMap(t => lines(t, text, T));
  const blockH = b => 14 * T + 2 * (linesOf(b, shownAt(b).length, k2(b)) * b.crop[3] * k2(b) + 12 * T) + (linesOf(b, FRAMES, 1) * b.crop[3] + 12 * T) + b.checks.flatMap(c => lines(c.text, text - 40 * T, T)).length * 10 * T + 14 * T;
  const H = 16 + headLines.reduce((s, [, k]) => s + 10 * k + 2, 0) + 8 + blocks.reduce((s, b) => s + blockH(b), 0) + footLines.length * 10 * T + 16, c = canvas(wide, H);
  let y = 16; for (const [l, k] of headLines) { write(c, l, 16, y, pale, k); y += 10 * k + 2; } y += 8;
  for (const b of blocks) { const k = k2(b), fr = shownAt(b), [, , cw, ch] = b.crop;
    write(c, `${b.race}, ${b.anim} (${W.animations[b.anim].action}${b.key !== b.anim ? `, the shield arm from ${W.render.shield_arm.action}` : ''}), facing ${b.side}: worn with ${b.worn.filter(p => p !== id).join(', ') || 'nothing'}${b.drawn ? '; ' + b.drawn.replace(/^held [^:]*: /, '') : ''}`, 16, y, pale, T); y += 14 * T;
    const row = (label, draw, kk, list) => { const per = perLine(b, kk), down = linesOf(b, list.length, kk); list.forEach((f, i) => { const x = 16 + (i % per) * cw * kk, yy = y + ((i / per) | 0) * ch * kk; draw(x, yy, b.pics[f], kk); write(c, String(f), x + 2, yy + 2, dim); });
      write(c, label, 16, y + down * ch * kk + 2, dim, T); y += down * ch * kk + 12 * T; };
    row(`worn, ${k} times the game's size, with the outline and the shadow (pictures ${fr.join(', ')} of ${FRAMES})`, (x, yy, p, kk) => { box(c, x, yy, cw * kk - 2, ch * kk, grass); put(c, p.shadow, x, yy, kk, b.crop); put(c, p.worn, x, yy, kk, b.crop); }, k, fr);
    row(part ? `the layer alone: what the game is given for this part` : `the same without the ground`, (x, yy, p, kk) => { box(c, x, yy, cw * kk - 2, ch * kk, dark); put(c, p.alone, x, yy, kk, b.crop); }, k, fr);
    row(`at the game's size, every picture`, (x, yy, p) => { box(c, x, yy, cw - 1, ch - 1, grass); put(c, p.shadow, x, yy, 1, b.crop); put(c, p.worn, x, yy, 1, b.crop); }, 1, [...Array(FRAMES).keys()]);
    for (const ch2 of b.checks) { const mark = ch2.ok === null ? 'note' : ch2.ok ? 'ok' : 'FAIL'; lines(ch2.text, text - 40 * T, T).forEach((l, i) => { if (!i) write(c, mark, 16, y, ch2.ok === null ? dim : ch2.ok ? good : poor, T); write(c, l, 16 + 40 * T, y, pale, T); y += 10 * T; }); } y += 14 * T; }
  for (const l of footLines) { write(c, l, 16, y, dim, T); y += 10 * T; }
  const name = onlyRace ? `${id}.${onlyRace}` : id, out = join(store, 'sheets', `${name}.png`); mkdirSync(dirname(out), { recursive: true }); save(c, out);     // one race asked for: a sheet of its own
  writeFileSync(join(store, 'sheets', `${name}.json`), JSON.stringify({ id, samples, when: new Date().toISOString(), results: results.map(({ race, anim, key, side, worn, checks, secs, each }) => ({ race, anim, key, side, worn, checks, secs, each })) }, null, 1));
  if (keep) { mkdirSync(join(keep, 'sheets'), { recursive: true }); for (const e of ['png', 'json']) copyFileSync(join(store, 'sheets', `${name}.${e}`), join(keep, 'sheets', `${name}.${e}`)); }
  step(6, `sheet: ${out}${keep ? `, and in ${join(keep, 'sheets')}` : ''}`); }

// 7 budget
step(7, 'budget:'); console.log(budgetText(W, races).split('\n').map(l => '  ' + l).join('\n'));
const failed = results.flatMap(r => r.checks.filter(c => c.ok === false).map(c => `${r.race} ${r.key} ${r.side}: ${c.text}`));
console.log(failed.length ? `FAIL\n  ${failed.join('\n  ')}` : `PASS: ${id} is ready to look at`); process.exit(failed.length ? 1 : 0);
