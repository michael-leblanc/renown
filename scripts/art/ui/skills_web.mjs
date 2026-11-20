// The eight skill webs as data: one source for the balance check (scripts/sim/web-check.mjs) and for the page (skills_tree_page.mjs).
// Every web has Swords' shape (agreed for v1, 2026-11-19): a stem with the material beads and 3 small nodes, a left and a right side,
// each a rib of 2 small nodes to each of its 4 named nodes, a rim node between ribs, and a bridge of 2 nodes from the right side's
// 40 node to the left side's 40 node of the next skill round the wheel. Only the names, the texts and the effects change.
// A node: [id, kind, name, text, level, rho, theta, fx]. kind: small | node (a named node, round) | notable (a named node, diamond) | bridge | stub.
// rho/theta: where it sits on the fan (px past the hub's ring, degrees off the stem; + is the right side, towards the next skill).
// fx: what the fight calculator counts (scripts/sim/sim.mjs); {} = not felt in a plain duel. All numbers are placeholders and settings (D175).

/* ---------- the shape: where each node sits, its level and its kind ---------- */
const SPOTS = {
  t1: [0, 59.5, 0], t2: [25, 95, 0], t3: [50, 128.5, 0],
  k1: [0, 50, 4.8], k2: [0, 57, 9.4], K: [15, 67, 14], x1: [0, 71.5, 7.4],
  b1: [25, 88, 5.4], b2: [25, 93, 9.8], B: [40, 102, 13.8], x2: [25, 107, 7.6],
  q1: [50, 121, 5.4], q2: [50, 126, 9.8], Q: [65, 129, 14.5], x3: [50, 139, 7.6],
  f1: [75, 151, 5.4], f2: [75, 155, 9.6], F: [90, 156, 14.3],
};
const NAMED = { K: 'node', B: 'node', Q: 'notable', F: 'notable' };
const ORDER = ['k1', 'k2', 'K', 'x1', 'b1', 'b2', 'B', 'x2', 'q1', 'q2', 'Q', 'x3', 'f1', 'f2', 'F'];
// A bridge sits in the gap between two webs, on the 40 ring: from the right side's 40 node across to the next skill's left 40 node.
const BRIDGE = [[25, 102, 18.1], [25, 102, 21.9]], STUB = [25, 93, 19.5];
// A bead: [label, level, rho, what it says]. A weapon's material works at full from its bead; below it, usable but worse.
const WORSE = 'Below this they are usable but worse: −10% to hit and a slower swing.';
const WEAPON_BEADS = (w, first = 'Bronze', firstWord = 'Bronze', worse = WORSE) => [[first, 0, 41, `${firstWord} ${w} work at full from the start.`], ['Iron', 25, 78, `Iron ${w} work at full. ${worse}`], ['Steel', 50, 112, `Steel ${w} work at full. ${worse}`], ['A later material', 75, 145], ['A later material', 100, 174]];
// A skill with no materials still has its rings: nodes past them need the level.
const LEVEL_BEADS = first => [[first, 0, 41], ['Level', 25, 78], ['Level', 50, 112], ['Level', 75, 145], ['Level', 100, 174]];

/** Build a web from its spec: stem [3], e and g (left and right) as { k1, k2, K, x1, ... F }, each [name, text, fx]. */
function make(s) {
  const nodes = [];
  s.stem.forEach(([name, text, fx], i) => { const [lv, rho, th] = SPOTS['t' + (i + 1)]; nodes.push(['t' + (i + 1), 'small', name, text, lv, rho, th, fx || {}]); });
  for (const [side, sign] of [['e', -1], ['g', 1]]) for (const k of ORDER) {
    const [name, text, fx] = s[side][k], [lv, rho, th] = SPOTS[k];
    nodes.push([side + k, NAMED[k] || 'small', name, text, lv, rho, th * sign, fx || {}]);
  }
  const links = [['m0', 't1'], ['t1', 't2'], ['t2', 't3'], ...['e', 'g'].flatMap(x => [
    ['m0', x + 'k1'], [x + 'k1', x + 'k2'], [x + 'k2', x + 'K'], [x + 'k2', x + 'x1'], [x + 'x1', x + 'b1'],
    ['t1', x + 'b1'], [x + 'b1', x + 'b2'], [x + 'b2', x + 'B'], [x + 'b2', x + 'x2'], [x + 'x2', x + 'q1'],
    ['t2', x + 'q1'], [x + 'q1', x + 'q2'], [x + 'q2', x + 'Q'], [x + 'q2', x + 'x3'], [x + 'x3', x + 'f1'],
    ['t3', x + 'f1'], [x + 'f1', x + 'f2'], [x + 'f2', x + 'F'],
    // more ways round (Michael, 2026-11-19): each rim node also joins the first node of the rib below it. No choice of named nodes gets cheaper.
    [x + 'k1', x + 'x1'], [x + 'b1', x + 'x2'], [x + 'q1', x + 'x3'],
  ])];
  const cross = [];
  if (s.bridge) {                                                          // to the next skill: counts for both, either skill's points, opens its left 40 node
    s.bridge.forEach(([name, text, fx], i) => { const [lv, rho, th] = BRIDGE[i]; nodes.push(['x' + (i + 1) + 'b', 'bridge', name, text, lv, rho, th, fx || {}]); });
    links.push(['gB', 'x1b'], ['x1b', 'x2b']); cross.push(['x2b', s.next + '/eB']);
  }
  for (const [side, name] of s.stubs || []) {                              // a place kept for a bridge to a later skill: shown, never open
    const [lv, rho, th] = STUB, id = 'c' + side;
    nodes.push([id, 'stub', 'A bridge to ' + name, 'Comes with ' + name + '. Its place is kept here.', lv, rho, side === 'e' ? -th : th, {}]);
    links.push([side + 'B', id]);
  }
  return { root: 'm0', nodes, links, beads: s.beads, cross, other: s.next || null, paths: { e: s.paths[0], g: s.paths[1], t: 'Stem', x: s.next ? 'Bridge to ' + s.next : '', c: 'Bridge to a later skill' }, status: s.status };
}

/* ---------- small nodes used by more than one web ---------- */
const AIM = ['Aim', '+1% chance to hit.', { hit: .01 }];
const FEET = w => ['Sure feet', `With ${w} in hand, you are pushed back or tripped 10% less often.`, {}];
const BORROWED = w => ['Borrowed steel', `${w} of a material you have not reached yet is only half as much worse.`, {}];
const WHET = w => ['Whetstone', `Your ${w} wears 15% slower.`, {}];
const HEFT = w => ['Heft', `${w} too heavy for you is a third less hard to use.`, {}];
const OPENING = ['Opening', '+1 damage to a target that is stunned, pinned or tripped.', {}];
const RUN_DOWN = ['Harry', '+3% chance to hit a target that is running away.', {}];

/* ---------- the eight webs ---------- */
export const WEBS = {
  // Swords: agreed for v1 (2026-11-19). Unchanged but for the bridge's place in the gap (the wheel grew).
  Swords: make({
    status: 'agreed', paths: ['Edge', 'Guard'], beads: WEAPON_BEADS('swords'), next: 'Axes', stubs: [['e', 'Crafting']],
    stem: [['Borrowed steel', 'A sword of a material you have not reached yet is only half as much worse.'], WHET('sword'), ['Heft', 'A sword too heavy for you is a third less hard to use.']],
    e: {
      k1: ['Feint', 'Shields block your hits 2% less often.', { feint: .02 }], k2: AIM, K: ['Keen', '+5% chance to hit.', { hit: .05 }], x1: RUN_DOWN,
      b1: ['Nick', '1% of your hits make the target bleed: 1 damage a second for 4 seconds.', { bleed: .01 }], b2: ['Slow to mend', 'A target you have made bleed heals 2 less from its next bandage.'],
      B: ['Bleed', '15% of your hits make the target bleed: 1 damage a second for 4 seconds.', { bleed: .15 }], x2: ['Feint', 'Shields block your hits 2% less often.', { feint: .02 }],
      q1: AIM, q2: ['Recover', 'After your swing is parried or blocked, your next one comes 0.3 seconds sooner.'], Q: ['Quick blade', 'You swing 15% faster.', { speed: .15 }], x3: RUN_DOWN,
      f1: ['Scent of blood', '+2% chance to hit a target under half its health.', { finHit: .02 }], f2: ['Opening', '+1 damage to a target that is stunned, pinned or tripped.'],
      F: ['Finisher', '+40% damage against a target under half its health.', { finisher: .4, finAt: .5 }],
    },
    g: {
      k1: FEET('a sword'), k2: ['Ward', 'With no shield, you parry 1% more melee hits.', { parry: .01 }], K: ['Parry', 'With no shield, you parry 10% of melee hits.', { parry: .10 }], x1: ['Fighting retreat', 'While you run away, attacks on you have 3% less chance to hit.'],
      b1: FEET('a sword'), b2: ['Ward', 'With no shield, you parry 1% more melee hits.', { parry: .01 }], B: ['Steady guard', 'You parry 20% of melee hits.', { parry: .10 }], x2: ['Fighting retreat', 'While you run away, attacks on you have 3% less chance to hit.'],
      q1: ['Punish', 'Your first hit after a parry does +1 damage.', { punish: 1 }], q2: ['Sharp answer', '+5% chance to hit for 3 seconds after a parry.', { answer: .05 }], Q: ['Riposte', 'After a parry, your next swing comes at once and cannot miss.', { riposte: true }], x3: FEET('a sword'),
      f1: ['Arrow ward', 'With no shield, you parry 3% of arrows.'], f2: ['Arrow ward', 'With no shield, you parry 3% of arrows.'], F: ['Blade wall', 'With no shield, you parry 4% more melee hits, and you can parry arrows too.', { parry: .04 }],
    },
    bridge: [['Blade work', '+1% chance to hit with a sword or an axe.', { hit: .01 }], ['Edge care', 'Your swords and axes wear 10% slower.']],
  }),

  // Axes: heavy hits, many foes. Reaver on the left (Reap takes Swords' bridge), Brute on the right.
  Axes: make({
    status: 'agreed', paths: ['Reaver', 'Brute'], beads: WEAPON_BEADS('axes'), next: 'Maces',
    stem: [BORROWED('An axe'), WHET('axe'), ['Splitter', 'A shield that blocks your axe wears 20% faster.']],
    e: {
      k1: ['Chop', '+1% chance to hit.', { hit: .01 }], k2: ['Taste of it', 'After a kill, you heal 2.'], K: ['Bite', '+1 damage.', { flat: 1 }], x1: RUN_DOWN,
      b1: ['Chop', '+1% chance to hit.', { hit: .01 }], b2: ['Grim', 'For 5 seconds after a kill, +5% chance to hit.'], B: ['Reap', 'After a kill, your next swing comes at once.'], x2: ['Wade in', 'While two or more enemies are next to you, their attacks have 2% less chance to hit.'],
      q1: AIM, q2: ['Keep the rhythm', 'A parried or blocked hit no longer resets Momentum.', { keepMom: true }], Q: ['Momentum', 'Each hit in a row adds +1 damage, up to +3. A miss resets it.', { momentum: 3 }], x3: RUN_DOWN,
      f1: ['Red mist', '+2% chance to hit while you are under half health.', { furyHit: .02 }], f2: ['Last breath', 'Under a quarter health, your bandage heals 2 more.'],
      F: ['Fury', 'Under half health, you swing 20% faster.', { fury: .2 }],
    },
    g: {
      k1: FEET('an axe'), k2: ['Hook', 'Shields block your hits 2% less often.', { feint: .02 }], K: ['Strong grip', 'An axe too heavy for you is only half as hard to use.'], x1: ['Wade in', 'While two or more enemies are next to you, their attacks have 2% less chance to hit.'],
      b1: ['Sweep', 'Cleave and Whirl do 10% more damage.'], b2: ['Hook', 'Shields block your hits 2% less often.', { feint: .02 }], B: ['Cleave', 'Your hit also strikes one enemy beside your target, for half damage.'], x2: FEET('an axe'),
      q1: ['Splinter', 'A shield that blocks your hit wears twice as fast.'], q2: AIM, Q: ['Shieldbreaker', 'Your target blocks half as often.', { breaker: .5 }], x3: ['Wade in', 'While two or more enemies are next to you, their attacks have 2% less chance to hit.'],
      f1: ['Crowd work', '+2% chance to hit while two or more enemies are next to you.'], f2: ['Crowd work', '+2% chance to hit while two or more enemies are next to you.'],
      F: ['Whirl', 'Cleave strikes two enemies beside your target.'],
    },
    bridge: [['Haft work', '+1% chance to hit with an axe or a mace.', { hit: .01 }], ['Heavy hands', 'An axe or a mace too heavy for you is 10% less hard to use.']],
  }),

  // Maces: beat armour, daze. Crush on the left (Dent takes Axes' bridge), Daze on the right.
  Maces: make({
    status: 'agreed', paths: ['Crush', 'Daze'], beads: WEAPON_BEADS('maces'), next: 'Spears',
    stem: [BORROWED('A mace'), WHET('mace'), ['Smith\'s bane', 'Your hits wear the target\'s armour 20% faster.']],
    e: {
      k1: ['Knock', 'Shields block your hits 2% less often.', { feint: .02 }], k2: AIM, K: ['Weight', 'Your hits ignore 1 armour.', { pierce: 1 }], x1: ['Plod on', 'In metal armour, you lose 10% less run energy.'],
      b1: AIM, b2: ['Lasting dent', 'Your dents last 5 seconds longer.', { dentLen: 50 }], B: ['Dent', 'Each hit takes 1 off the target\'s armour for 10 seconds, up to 2. Everyone hitting it gains.', { dent: 2 }], x2: ['Plod on', 'In metal armour, you lose 10% less run energy.'],
      q1: ['Crack', '+2% chance of a crushing blow.', { crush: .02 }], q2: ['Heavy head', '+1% chance to hit.', { hit: .01 }], Q: ['Crushing blow', '20% of your hits do +50% damage.', { crush: .2 }], x3: ['Plod on', 'In metal armour, you lose 10% less run energy.'],
      f1: ['Wear down', 'A target you hit loses 5% more run energy for 5 seconds.'], f2: ['Breathless', '+2% chance to hit a target with no run energy left.'],
      F: ['Ruin', 'A crushing blow also takes a quarter of the target\'s run energy.'],
    },
    g: {
      k1: FEET('a mace'), k2: ['Thud', '2% of your hits delay the target\'s next swing by 1 second.', { jolt: .02 }], K: ['Jolt', '25% of your hits delay the target\'s next swing by 1 second.', { jolt: .25 }], x1: ['Ringing ears', 'A target you jolt can\'t run for 1 second.'],
      b1: ['Thud', '2% of your hits delay the target\'s next swing by 1 second.', { jolt: .02 }], b2: ['Long ring', 'Rattle lasts 2 seconds longer.', { rattleLen: 20 }], B: ['Rattle', 'A jolted or stunned target has −20% to hit for 5 seconds.', { rattle: .2 }], x2: ['Ringing ears', 'A target you jolt can\'t run for 1 second.'],
      q1: ['Heavy head', '+1% chance to hit.', { hit: .01 }], q2: ['Daze', '+2% chance to stun.', { stun: .02 }], Q: ['Stun', '15% of your hits stun for 2 seconds. The target can\'t be stunned again for 10 seconds.', { stun: .15 }], x3: FEET('a mace'),
      f1: OPENING, f2: ['Daze', '+2% chance to stun.', { stun: .02 }], F: ['Concussion', 'A stunned target takes +50% damage from everyone.', { concussion: .5 }],
    },
    bridge: [['Haft and shaft', '+1% chance to hit with a mace or a spear.', { hit: .01 }], ['Braced grip', 'With a mace or a spear, you are pushed back 10% less often.']],
  }),

  // Spears: reach, hold the line. Reach on the left (Set takes Maces' bridge), Thrust on the right.
  Spears: make({
    status: 'agreed', paths: ['Reach', 'Thrust'], beads: WEAPON_BEADS('spears'), next: 'Bows',
    stem: [BORROWED('A spear'), WHET('spear'), HEFT('A spear')],
    e: {
      k1: FEET('a spear'), k2: ['Measure', '+1% chance to hit.', { hit: .01 }], K: ['Long arm', 'You attack from 2 tiles away, but never through a wall or a closed door.'], x1: ['Hold ground', 'For 2 seconds after someone steps next to you, its attacks have 3% less chance to hit.'],
      b1: ['Ready', 'Your first swing in a fight comes 0.3 seconds sooner.'], b2: ['Measure', '+1% chance to hit.', { hit: .01 }], B: ['Set', 'Your first hit on someone who walks up to you does +50% damage.', { setHit: .5 }], x2: ['Hold ground', 'For 2 seconds after someone steps next to you, its attacks have 3% less chance to hit.'],
      q1: ['Shove', '+2% chance to push back.'], q2: ['Keep distance', 'A target you push back takes 1 second longer to reach you.'], Q: ['Keep back', '15% of your hits push the target back a tile. It can\'t be pushed again for 10 seconds.'], x3: FEET('a spear'),
      f1: ['Bristle', 'Hedge\'s free hit has +5% chance to hit.'], f2: ['Measure', '+1% chance to hit.', { hit: .01 }], F: ['Hedge', 'An enemy who steps next to you takes a free hit, once every 10 seconds.'],
    },
    g: {
      k1: ['Line up', '+1% chance to hit.', { hit: .01 }], k2: ['Lunge', 'Shields block your thrusts 2% less often.', { feint: .02 }], K: ['Point', '+5% chance to hit.', { hit: .05 }], x1: ['Draw back', 'After your thrust is parried or blocked, your next one comes 0.3 seconds sooner.'],
      b1: ['Snap', 'You thrust 2% faster.', { speed: .02 }], b2: ['Line up', '+1% chance to hit.', { hit: .01 }], B: ['Quick thrust', 'You thrust 15% faster.', { speed: .15 }], x2: ['Draw back', 'After your thrust is parried or blocked, your next one comes 0.3 seconds sooner.'],
      q1: ['Nail', '+2% chance to pin.'], q2: ['Gut', '1% of your hits make the target bleed: 1 damage a second for 4 seconds.', { bleed: .01 }], Q: ['Pin', '10% of your hits stop the target from walking for 2 seconds. It can\'t be pinned again for 10 seconds.'], x3: ['Draw back', 'After your thrust is parried or blocked, your next one comes 0.3 seconds sooner.'],
      f1: ['Run through', '+2% chance to hit a pinned target.'], f2: OPENING, F: ['Skewer', 'Your hit also strikes one enemy behind your target.'],
    },
    bridge: [['Keen eye', '+1% chance to hit with a spear or a bow.', { hit: .01 }], ['Fletcher\'s care', 'Your spears and bows wear 10% slower.']],
  }),

  // Bows: range, the first shot. Marksman on the left (Long shot takes Spears' bridge), Skirmisher on the right. Not checked with numbers: a bow's range is not decided.
  Bows: make({
    status: 'agreed', paths: ['Marksman', 'Skirmisher'], beads: LEVEL_BEADS('Wood'), next: 'Unarmed',
    stem: [['Waxed string', 'Your bowstring wears 15% slower.'], ['Sure nock', 'Your first arrow in a fight comes 0.3 seconds sooner.'], HEFT('A bow')],
    e: {
      k1: ['Breathe', '+1% chance to hit.', { hit: .01 }], k2: ['Read the wind', '+2% chance to hit at the far end of your range.'], K: ['Steady aim', '+5% chance to hit.', { hit: .05 }], x1: ['Patience', '+3% chance to hit a target that is standing still.'],
      b1: ['Read the wind', '+2% chance to hit at the far end of your range.'], b2: ['Breathe', '+1% chance to hit.', { hit: .01 }], B: ['Long shot', '+2 tiles of range.'], x2: ['Patience', '+3% chance to hit a target that is standing still.'],
      q1: ['Breathe', '+1% chance to hit.', { hit: .01 }], q2: ['First blood', '+2% chance to hit with your first arrow at someone.'], Q: ['Aimed shot', 'Your first arrow at someone who isn\'t fighting you yet does double damage.'], x3: ['Patience', '+3% chance to hit a target that is standing still.'],
      f1: ['Bodkin', '1 arrow in 10 ignores 1 armour.'], f2: ['Breathe', '+1% chance to hit.', { hit: .01 }], F: ['Piercing arrow', 'Your arrows ignore 2 armour.', { pierce: 2 }],
    },
    g: {
      k1: ['Loose', 'You shoot 2% faster.', { speed: .02 }], k2: ['Light step', 'After you stop walking, you can shoot 0.2 seconds sooner.'], K: ['Quick draw', 'You shoot 10% faster.', { speed: .10 }], x1: ['Back off', 'While you walk away from someone in melee, its attacks have 3% less chance to hit.'],
      b1: ['Sting', '+2% chance to hobble.'], b2: ['Loose', 'You shoot 2% faster.', { speed: .02 }], B: ['Hobble', '15% of your hits halve the target\'s walking speed for 3 seconds. It can\'t be hobbled again for 10 seconds.'], x2: ['Back off', 'While you walk away from someone in melee, its attacks have 3% less chance to hit.'],
      q1: ['Scavenge', 'You pick up arrows twice as fast.'], q2: ['Spare shafts', '1 arrow in 10 is not used up.'], Q: ['Retrieval', 'Half your spent arrows lie where they landed, to pick up.'], x3: ['Back off', 'While you walk away from someone in melee, its attacks have 3% less chance to hit.'],
      f1: ['Loose', 'You shoot 2% faster.', { speed: .02 }], f2: ['Double nock', '2% of your shots loose 2 arrows.'], F: ['Volley', 'Every 4th shot looses 2 arrows.'],
    },
    bridge: [['Nimble', '+1% chance to hit with a bow or with bare hands.', { hit: .01 }], ['Light kit', 'With a bow or bare hands and no metal armour, you are tripped 10% less often.']],
  }),

  // Unarmed (named nodes agreed 2026-11-19): fast, dirty. Grappler on the left (Disarm takes Bows' bridge), Brawler on the right.
  Unarmed: make({
    status: 'agreed', paths: ['Grappler', 'Brawler'], beads: LEVEL_BEADS('Bare hands'), next: 'Shield',
    stem: [['Calloused', 'Punching someone in metal armour no longer hurts your hands.'], ['Brawler\'s wind', 'In a fight, your run energy comes back 10% faster.'], ['Grit', 'With no weapon in hand, your bandage heals 1 more.']],
    e: {
      k1: ['Quick fists', 'You strike 2% faster.', { speed: .02 }], k2: ['Sure grip', '+1% chance to hit.', { hit: .01 }], K: ['Quick hands', 'You strike 10% faster.', { speed: .10 }], x1: ['Close in', '+3% chance to hit a target that is running away.'],
      b1: ['Wrench', '+1% chance to disarm.', { disarm: .01 }], b2: ['Sure grip', '+1% chance to hit.', { hit: .01 }], B: ['Disarm', '5% of your hits knock the target\'s weapon aside: it can\'t use it for 3 seconds, then can\'t be disarmed again for 10 seconds.', { disarm: .05 }], x2: ['Close in', '+3% chance to hit a target that is running away.'],
      q1: ['Hook a leg', '+2% chance to trip.', { trip: .02 }], q2: ['Sure grip', '+1% chance to hit.', { hit: .01 }], Q: ['Trip', '10% of your hits stagger the target for 1.5 seconds. It can\'t be tripped again for 10 seconds.', { trip: .10 }], x3: ['Close in', '+3% chance to hit a target that is running away.'],
      f1: ['Slip', 'With nothing in your hands and no metal armour, +1% dodge.', { evade: .01 }], f2: OPENING, F: ['Open hand', 'With nothing in your hands, +10% dodge.', { evade: .10 }],
    },
    g: {
      k1: ['Knuckle', '+1% chance to hit.', { hit: .01 }], k2: ['Thick skin', 'With no metal armour, you are pushed back or tripped 10% less often.'], K: ['Hard fists', 'Your fists hit up to 1 harder (2 to 6, not 2 to 5).', { dmgTop: 1 }], x1: ['Taunt', 'Someone you hit picks you over others to attack 10% more often.'],
      b1: ['Knuckle', '+1% chance to hit.', { hit: .01 }], b2: ['Keep it going', 'Once a fight, a miss doesn\'t break your hits in a row.'], B: ['Combo', 'Every third hit in a row does +2 damage.', { combo: true, comboAdd: 2 }], x2: ['Taunt', 'Someone you hit picks you over others to attack 10% more often.'],
      q1: ['Heel', '+1% chance to kick.', { kick: .01 }], q2: ['Knuckle', '+1% chance to hit.', { hit: .01 }], Q: ['Kick', '10% of your hits are a kick: +3 damage, and the target is pushed back a tile. It can\'t be pushed again for 10 seconds.', { kick: .10 }], x3: ['Thick skin', 'With no metal armour, you are pushed back or tripped 10% less often.'],
      f1: ['Shrug it off', 'With no metal armour, a stun on you lasts half a second less.'], f2: ['Shrug it off', 'With no metal armour, a stun on you lasts half a second less.'], F: ['Iron body', 'With no weapon and no metal armour, a quarter of the hits on you do 1 less damage.', { toughP: .25 }],
    },
    bridge: [['Shoulder in', '+1% chance to hit with bare hands, or to block with a shield.', { hit: .01 }], ['Square up', 'With bare hands or a shield, you are pushed back 10% less often.']],
  }),

  // Shield (named nodes agreed 2026-11-19): block, cover others. Bulwark on the left (Arrow guard takes Unarmed's bridge), Protector on the right.
  Shield: make({
    status: 'agreed', paths: ['Bulwark', 'Protector'], beads: WEAPON_BEADS('shields', 'Wood', 'Wooden', 'Below this they are usable but worse.'), next: 'Dodge',
    stem: [BORROWED('A shield'), ['Strap care', 'Your shield wears 15% slower.'], HEFT('A shield')],
    e: {
      k1: ['Set firm', '+1% chance to block.', { blockB: .01 }], k2: ['Arrow brace', '+2% chance to block arrows.'], K: ['Brace', '+3% chance to block.', { blockB: .03 }], x1: ['Turtle', 'While you stand still, +2% chance to block arrows.'],
      b1: ['Turtle', 'While you stand still, +2% chance to block arrows.'], b2: ['Arrow brace', '+2% chance to block arrows.'], B: ['Arrow guard', '+10% chance to block arrows.'], x2: ['Turtle', 'While you stand still, +2% chance to block arrows.'],
      q1: ['Shove', '+2% chance to bash.', { bash: .02 }], q2: ['Ring the shield', 'An attacker you bash has 3% less chance to hit for 2 seconds.'], Q: ['Bash', 'After a block, 20% chance to stagger the attacker for 1 second.', { bash: .2 }], x3: ['Turtle', 'While you stand still, +2% chance to block arrows.'],
      f1: ['Ring the shield', 'An attacker you bash has 3% less chance to hit for 2 seconds.'], f2: ['Arrow brace', '+2% chance to block arrows.'], F: ['Stalwart', '+5% chance to block, and you can\'t be pushed back while you block.', { blockB: .05 }],
    },
    g: {
      k1: ['Shoulder to shoulder', 'An ally beside you is pushed back 10% less often.'], k2: ['Set firm', '+1% chance to block.', { blockB: .01 }], K: ['Cover', 'You can block a hit on an ally beside you, at half your chance.'], x1: ['Steady feet', 'With a shield, you are pushed back or tripped 10% less often.'],
      b1: ['Shoulder to shoulder', 'An ally beside you is pushed back 10% less often.'], b2: ['Field dressing', 'A bandage you put on an ally heals 1 more.'], B: ['Rooted', 'While you hold a shield, you can\'t be pushed, tripped or staggered. A stun still works.'], x2: ['Steady feet', 'With a shield, you are pushed back or tripped 10% less often.'],
      q1: ['Close ranks', '+2% chance to block for an ally.'], q2: ['Close ranks', '+2% chance to block for an ally.'], Q: ['Guardian', 'Cover works at your full chance.'], x3: ['Steady feet', 'With a shield, you are pushed back or tripped 10% less often.'],
      f1: ['Hold the line', 'While an ally is beside you, +1% chance to block.'], f2: ['Hold the line', 'While an ally is beside you, +1% chance to block.'], F: ['Shield wall', 'Those of your faction beside you take 1 less damage from each hit. It doesn\'t add up from several shields.'],
    },
    bridge: [['Footwork', '+1% chance to block with a shield, or +1% dodge without one.', { blockB: .01 }], ['Balance', 'With a shield or none, you are tripped 10% less often.']],
  }),

  // Dodge (named nodes agreed 2026-11-19): evade, get away. Evasion on the left (Sidestep takes Shield's bridge), Escape on the right. Dodge nodes work only without metal armour (rule 6).
  Dodge: make({
    status: 'agreed', paths: ['Evasion', 'Escape'], beads: LEVEL_BEADS('Light armour'), stubs: [['g', 'Magic']],
    stem: [['Light pack', 'A full pack slows you 10% less.'], ['Wary', '+2% dodge against the first attack of a fight.'], ['Tumble', 'A push-back or a trip on you lasts half a second less.']],
    e: {
      k1: ['Weave', '+1% dodge.', { evade: .01 }], k2: ['Read the swing', '+2% dodge against the first attack of a fight.'], K: ['Light feet', '+5% dodge in cloth or leather.', { evade: .05 }], x1: ['Duck', '+3% dodge against arrows.'],
      b1: ['Duck', '+3% dodge against arrows.'], b2: ['Off balance', 'Sidestep delays the attacker 0.1 seconds more.', { sidestep: 1 }], B: ['Sidestep', 'A dodge delays the attacker\'s next swing by half a second.', { sidestep: 5 }], x2: ['Duck', '+3% dodge against arrows.'],
      q1: ['Light step', 'Your run energy lasts 5% longer.'], q2: ['Flow', 'After you dodge, +2% dodge for 2 seconds.'], Q: ['Untouchable', 'After 2 dodges in a row, the next attack on you misses. That miss doesn\'t count towards the next two.', { untouch: true }], x3: ['Duck', '+3% dodge against arrows.'],
      f1: ['Duck', '+3% dodge against arrows.'], f2: ['Duck', '+3% dodge against arrows.'], F: ['Arrow dodge', '+15% dodge against arrows.'],
    },
    g: {
      k1: ['Wind', 'Your run energy lasts 5% longer.'], k2: ['Weave', '+1% dodge.', { evade: .01 }], K: ['Second wind', 'Your run energy lasts 20% longer.'], x1: ['Slip', '+3% dodge while running away.'],
      b1: ['Wind', 'Your run energy lasts 5% longer.'], b2: ['Slip', '+3% dodge while running away.'], B: ['Slip away', '+15% dodge while running away.'], x2: ['Slip', '+3% dodge while running away.'],
      q1: ['Tuck', 'Roll takes you 2 tiles, not 1.'], q2: ['Cornered', '+2% dodge under a quarter health.', { lastStand: .02 }], Q: ['Roll', 'Under a quarter health, you roll a tile away from your attacker. Once every 60 seconds.', { roll: true }], x3: ['Slip', '+3% dodge while running away.'],
      f1: ['Cornered', '+2% dodge under a quarter health.', { lastStand: .02 }], f2: ['Wind', 'Your run energy lasts 5% longer.'], F: ['Last stand', '+15% dodge under a quarter health.', { lastStand: .15 }],
    },
  }),
};
export const SWORDS_WEB = WEBS.Swords;
export const MARKS = [15, 40, 65, 90];
export const isNamed = k => k === 'node' || k === 'notable';
