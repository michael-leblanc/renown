// The signs of the skill webs' nodes (D252), one source for the tree page (skills_tree_page.mjs) and the Skills screen's pieces (skills_tree.mjs).
// A sign is drawn in a 24 by 24 box as SVG path data: s is stroked (2.5 wide, round ends and joins), f is filled. The page draws them on a canvas;
// the pieces are rasterised by skills_tree.mjs. Placeholders, like the small nodes they mark.
// A sign for every web node, by its name, in a 24 by 24 box: s is drawn as a line, f is filled. Drawn by the page for now; pieces once the look is agreed.
const OWN = {
  'Keen': { f: 'M12 3L13.8 10.2 21 12 13.8 13.8 12 21 10.2 13.8 3 12 10.2 10.2Z' },
  'Bleed': { f: 'M12 3C12 3 5.5 11 5.5 15A6.5 6.5 0 0 0 18.5 15C18.5 11 12 3 12 3Z' },
  'Quick blade': { f: 'M19 3.5L20.5 5 10.5 15 9 13.5Z', s: 'M6.5 11.5L12.5 17.5M3.5 9.5L8 5M14.5 20.5L19 16M5.5 18.5L8 16' },
  'Finisher': { f: 'M12 21.5L9 9H15Z', s: 'M6.5 8.5H17.5M12 8V3' },
  'Parry': { s: 'M5 5L19 19M19 5L5 19M4 15.5L8.5 20M15.5 20L20 15.5' },
  'Steady guard': { s: 'M12 3L19 6V12C19 16.5 15.5 19.5 12 21C8.5 19.5 5 16.5 5 12V6ZM12 7.5V16.5' },
  'Riposte': { s: 'M5 8H14A5 5 0 0 1 14 18H8M11 14.5L7.5 18 11 21.5' },
  'Blade wall': { f: 'M6 20L4.4 9 6 4 7.6 9ZM12 20L10.4 9 12 4 13.6 9ZM18 20L16.4 9 18 4 19.6 9Z' },
  'Aim': { s: 'M12 6.5A5.5 5.5 0 1 0 12 17.5A5.5 5.5 0 1 0 12 6.5M12 2.5V8M12 16V21.5M2.5 12H8M16 12H21.5' },
  'Feint': { s: 'M3.5 16L9 8 13.5 16 19.5 7.5M15 7.5H19.5V12' },
  'Harry': { s: 'M5 6L11 12 5 18M13 6L19 12 13 18' },
  'Nick': { f: 'M12 6C12 6 8 11.5 8 14A4 4 0 0 0 16 14C16 11.5 12 6 12 6Z' },
  'Slow to mend': { s: 'M12 4V9.5M12 14.5V20M4 12H9.5M14.5 12H20' },
  'Recover': { s: 'M18.5 12A6.5 6.5 0 1 1 15.5 6.5M15.5 2.5V6.8H19.8' },
  'Scent of blood': { s: 'M12 4C12 4 6.5 11 6.5 14.5A5.5 5.5 0 0 0 17.5 14.5C17.5 11 12 4 12 4Z', f: 'M12 12.5A2 2 0 1 0 12 16.5A2 2 0 1 0 12 12.5Z' },
  'Opening': { s: 'M12 3V8M12 16V21M3 12H8M16 12H21M5.6 5.6L9 9M15 15L18.4 18.4M18.4 5.6L15 9M9 15L5.6 18.4' },
  'Ward': { f: 'M12 4L18 6.5V12C18 15.5 15 18 12 20C9 18 6 15.5 6 12V6.5Z' },
  'Sure feet': { s: 'M5 8L12 14 19 8M5 14L12 20 19 14' },
  'Fighting retreat': { s: 'M20 12H5M10.5 6.5L5 12 10.5 17.5' },
  'Punish': { f: 'M10 4H14V10H20V14H14V20H10V14H4V10H10Z' },
  'Sharp answer': { f: 'M14 2L5 13H11L9 22 19 10H13Z' },
  'Arrow ward': { s: 'M5 19L18.5 5.5M11.5 5.5H18.5V12.5M5 19V14.5M5 19H9.5' },
  'Borrowed steel': { s: 'M7.5 8H16.5L21 17H3Z' },
  'Whetstone': { s: 'M4 14L14 6 20 10 10 18Z' },
  'Heft': { f: 'M8 10H16L19.5 20.5H4.5Z', s: 'M9.3 10A2.8 2.8 0 1 1 14.7 10' },
  'Blade work': { s: 'M6 6L18 18M18 6L6 18', f: 'M12 9.5A2.5 2.5 0 1 0 12 14.5A2.5 2.5 0 1 0 12 9.5Z' },
  'Edge care': { s: 'M12 3.5C12 3.5 7 10 7 13A5 5 0 0 0 17 13C17 10 12 3.5 12 3.5ZM6 21H18' },
};
// Signs for the other seven webs (2026-11-19): a sign of its own for each named node; small nodes share a sign by what they do.
const SHARED = {
  axe: { s: 'M9 3V21', f: 'M10 4C15.5 4 20 7 20 11.5C17 10.3 13.5 10.3 10 11.5Z' },
  tooth: { f: 'M4 5H20L16 13 12 7.5 8 13Z' },
  sickle: { s: 'M5 21L13 9M13 9C15 4 20.5 4.5 21 9.5C18.5 8 15.5 8.5 13 11' },
  chevrons: { s: 'M3 17L8 12 3 7M9.5 17L14.5 12 9.5 7M16 17L21 12 16 7' },
  flame: { f: 'M12 2C14 7 19 9 19 14.5A7 7 0 0 1 5 14.5C5 10.5 8.5 9.5 9 5.5C10.8 7.3 11 9.3 11.8 10.5C13 8.5 13 5 12 2Z' },
  grip: { s: 'M5 9H19M5 13H19M5 17H19', f: 'M10.5 2H13.5V22H10.5Z' },
  cleave: { s: 'M4 17A9 9 0 0 1 19 11', f: 'M20.5 9L15 10.5 19.5 14Z' },
  broken: { s: 'M12 3L19 6V12C19 16.5 15.5 19.5 12 21C8.5 19.5 5 16.5 5 12V6ZM13 3.5L10 10 14 13 11 20.5' },
  whirl: { s: 'M19 12A7 7 0 1 1 12 5M12 5L9 2.5M12 5L9 7.5M15 12A3 3 0 1 1 12 9' },
  anvil: { f: 'M3 7H19C19 10 16.5 11.5 14 11.5V14.5H17V18.5H6V14.5H9V11.5C6 11.5 3 10 3 7Z' },
  dent: { s: 'M3 8H21M3 13C8 13 9 19 12 19S16 13 21 13' },
  burst: { f: 'M12 2L14 9 21 7 16 12 21 17 14 15 12 22 10 15 3 17 8 12 3 7 10 9Z' },
  crack: { s: 'M4 3L10 9 7 12 13 21M15 3L13 8 19 11' },
  zigzag: { s: 'M3 12H7.5L10 6 14 18 16.5 12H21' },
  waves: { s: 'M8 7A6 6 0 0 0 8 17M16 7A6 6 0 0 1 16 17M4.5 4A10 10 0 0 0 4.5 20M19.5 4A10 10 0 0 1 19.5 20', f: 'M12 10A2 2 0 1 0 12 14A2 2 0 1 0 12 10Z' },
  stars: { s: 'M3 16A9 4 0 1 0 21 16A9 4 0 1 0 3 16', f: 'M12 3L13.2 6.5 17 6.6 14 8.9 15.1 12.5 12 10.4 8.9 12.5 10 8.9 7 6.6 10.8 6.5Z' },
  rings: { s: 'M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8', f: 'M12 10.5A1.5 1.5 0 1 0 12 13.5A1.5 1.5 0 1 0 12 10.5Z' },
  measure: { s: 'M3 12H21M3 8V16M21 8V16M8 10V14M12 10V14M16 10V14' },
  setspear: { s: 'M3 21H21M12 21V9', f: 'M12 2.5L15.5 9.5H8.5Z' },
  pushback: { s: 'M15 12H3M7 8L3 12 7 16M19 4V20' },
  palisade: { s: 'M2 20H22M5 20V9M10 20V7M15 20V7M20 20V9', f: 'M5 5L6.5 9H3.5ZM10 3L11.5 7H8.5ZM15 3L16.5 7H13.5ZM20 5L21.5 9H18.5Z' },
  point: { f: 'M12 2L16 12 12 22 8 12Z' },
  speedthrust: { s: 'M3 12H17M3 8H9M3 16H9', f: 'M22 12L15 8V16Z' },
  pin: { s: 'M6 18L19 5M3 21H10', f: 'M6 16A2.5 2.5 0 1 0 6 21A2.5 2.5 0 1 0 6 16Z' },
  skewer: { s: 'M2 12H22', f: 'M8.5 9A3 3 0 1 0 8.5 15A3 3 0 1 0 8.5 9ZM16 9.5A2.5 2.5 0 1 0 16 14.5A2.5 2.5 0 1 0 16 9.5Z' },
  target: { s: 'M12 3.5A8.5 8.5 0 1 0 12 20.5A8.5 8.5 0 1 0 12 3.5M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8', f: 'M12 10.5A1.5 1.5 0 1 0 12 13.5A1.5 1.5 0 1 0 12 10.5Z' },
  longarrow: { s: 'M2 19L19 6M2 19V15M2 19H6', f: 'M22 3.5L15.5 5 20 10Z' },
  eye: { s: 'M2 12C6 5.5 18 5.5 22 12C18 18.5 6 18.5 2 12Z', f: 'M12 9A3 3 0 1 0 12 15A3 3 0 1 0 12 9Z' },
  pierce: { s: 'M2 12H20M10 4V20', f: 'M22.5 12L16 8.5V15.5Z' },
  hobble: { s: 'M3 12A3 3 0 0 1 9 12A3 3 0 0 1 3 12M15 12A3 3 0 0 1 21 12A3 3 0 0 1 15 12M9 12H15' },
  pickup: { s: 'M3 21H21M6 17L16 7M16 7H11M16 7V12' },
  volley: { s: 'M3 15L14 4M9 21L20 10', f: 'M16 2L11.5 3.2 14.8 6.5ZM22 8L17.5 9.2 20.8 12.5Z' },
  bow: { s: 'M7 3C15.5 7 15.5 17 7 21M7 3V21M7 12H19', f: 'M21 12L17 10V14Z' },
  fist: { f: 'M6 9H18V16C18 19 15.5 20.5 12 20.5S6 19 6 16Z', s: 'M10 6V9M14 6V9M6 13H18' },
  hands: { s: 'M7 21V11M10 11V4M13 11V3M16 11V5M19 12V8M7 13L4 9' },
  disarm: { s: 'M4 4L13 13M3 15L7 19M17 4V12M14 9L17 12 20 9M12 21H22' },
  trip: { s: 'M3 19H21M6 19C6 13 12 9 17 10M14 7L17 10 14 13' },
  dots: { f: 'M5 10.5A1.5 1.5 0 1 0 5 13.5A1.5 1.5 0 1 0 5 10.5ZM11.5 9.8A2.2 2.2 0 1 0 11.5 14.2A2.2 2.2 0 1 0 11.5 9.8ZM19 9A3 3 0 1 0 19 15A3 3 0 1 0 19 9Z' },
  boot: { f: 'M7 3H13V12.5L20 14.5V20H5V14Z' },
  body: { s: 'M6 4H18V20H6ZM6 10H18M12 4V20' },
  tower: { s: 'M5 21V5H8V8H11V5H13V8H16V5H19V21ZM10 21V16H14V21' },
  shieldArrow: { s: 'M12 3L19 6V12C19 16.5 15.5 19.5 12 21C8.5 19.5 5 16.5 5 12V6ZM2 20L9 13M2 20V17M2 20H5' },
  shieldPlus: { s: 'M12 3L19 6V12C19 16.5 15.5 19.5 12 21C8.5 19.5 5 16.5 5 12V6ZM9 12H15M12 9V15' },
  shieldBurst: { s: 'M10 6L15 8V12C15 15 13 17 10 18C7 17 5 15 5 12V8ZM18 5L21 3M19 10H22M18 15L21 17' },
  pair: { s: 'M3 20C3 14.5 11 14.5 11 20M13 20C13 14.5 21 14.5 21 20', f: 'M7 7A3 3 0 1 0 7 13A3 3 0 1 0 7 7ZM17 7A3 3 0 1 0 17 13A3 3 0 1 0 17 7Z' },
  guardian: { s: 'M3 21C3 16 9 16 9 21', f: 'M6 11A2.5 2.5 0 1 0 6 16A2.5 2.5 0 1 0 6 11ZM12 4L20 7V12.5C20 16.5 17 19.5 14.5 21C14 20 13 18 12 17Z' },
  wall: { f: 'M3 8H8V14L5.5 17 3 14ZM9.5 8H14.5V14L12 17 9.5 14ZM16 8H21V14L18.5 17 16 14Z' },
  feather: { s: 'M19 3C10.5 4 5 11 6 21M6 21C10.5 18.5 16.5 13 19 3M9.5 14.5L14.5 13.5M8.5 10.5L13.5 9.5' },
  step: { s: 'M3 15H10M10 15L7 12M10 15L7 18', f: 'M14 4H19V12H14ZM14 14H19V20H14Z' },
  ghost: { s: 'M5 20V10A7 7 0 0 1 19 10V20L16.5 18 14 20 12 18 10 20 7.5 18Z', f: 'M9.5 9A1.2 1.2 0 1 0 9.5 11.4A1.2 1.2 0 1 0 9.5 9ZM14.5 9A1.2 1.2 0 1 0 14.5 11.4A1.2 1.2 0 1 0 14.5 9Z' },
  bent: { s: 'M3 18L10 11 14 14 21 7M16 7H21V12' },
  wind: { s: 'M3 8H14A3 3 0 1 0 11 5M3 12H18A3 3 0 1 1 15 15M3 16H9' },
  away: { s: 'M20 12H8M13 7L8 12 13 17M4 5V19' },
  roll: { s: 'M19 12A7 7 0 1 1 12 5M12 5L15 2M12 5L15 8', f: 'M12 10A2 2 0 1 0 12 14A2 2 0 1 0 12 10Z' },
  flag: { s: 'M6 21V3M6 4H18L15 8 18 12H6' },
  string: { s: 'M7 3C15.5 7 15.5 17 7 21M7 3V21', f: 'M4 10H10V14H4Z' },
  pack: { s: 'M6 8H18V21H6ZM9 8V5H15V8M6 13H18' },
  hourglass: { s: 'M6 3H18M6 21H18M7 3C7 9 17 15 17 21M17 3C17 9 7 15 7 21' },
  bandage: { s: 'M4 14L14 4 20 10 10 20ZM9 9L15 15M12 7L13 8M7 12L8 13' },
};
const SIGN_OF = {
  // Axes
  Bite: 'tooth', Reap: 'sickle', Momentum: 'chevrons', Fury: 'flame', 'Strong grip': 'grip', Cleave: 'cleave', Shieldbreaker: 'broken', Whirl: 'whirl',
  Splitter: 'broken', Chop: 'Aim', 'Taste of it': 'Bleed', Grim: 'sickle', 'Wade in': 'Fighting retreat', 'Keep the rhythm': 'chevrons', 'Red mist': 'flame', 'Last breath': 'bandage',
  Hook: 'Feint', Sweep: 'cleave', Splinter: 'crack', 'Crowd work': 'pair', 'Haft work': 'Blade work', 'Heavy hands': 'Heft',
  // Maces
  Weight: 'anvil', Dent: 'dent', 'Crushing blow': 'burst', Ruin: 'crack', Jolt: 'zigzag', Rattle: 'waves', Stun: 'stars', Concussion: 'rings',
  "Smith's bane": 'anvil', Knock: 'Feint', 'Plod on': 'wind', 'Lasting dent': 'hourglass', Crack: 'burst', 'Heavy head': 'Aim', 'Wear down': 'wind', Breathless: 'wind',
  Thud: 'zigzag', 'Ringing ears': 'waves', 'Long ring': 'hourglass', Daze: 'stars', 'Haft and shaft': 'Blade work', 'Braced grip': 'Sure feet',
  // Spears
  'Long arm': 'measure', Set: 'setspear', 'Keep back': 'pushback', Hedge: 'palisade', Point: 'point', 'Quick thrust': 'speedthrust', Pin: 'pin', Skewer: 'skewer',
  Measure: 'Aim', 'Hold ground': 'Ward', Ready: 'hourglass', Shove: 'pushback', 'Keep distance': 'measure', Bristle: 'palisade', 'Line up': 'Aim', Lunge: 'Feint',
  'Draw back': 'Recover', Snap: 'speedthrust', Nail: 'pin', Gut: 'Nick', 'Run through': 'skewer', 'Keen eye': 'eye', "Fletcher's care": 'Edge care',
  // Bows
  'Steady aim': 'target', 'Long shot': 'longarrow', 'Aimed shot': 'eye', 'Piercing arrow': 'pierce', 'Quick draw': 'bow', Hobble: 'hobble', Retrieval: 'pickup', Volley: 'volley',
  'Waxed string': 'string', 'Sure nock': 'hourglass', Breathe: 'Aim', 'Read the wind': 'wind', Patience: 'hourglass', 'First blood': 'Bleed', Bodkin: 'pierce',
  Loose: 'speedthrust', 'Light step': 'feather', 'Back off': 'Fighting retreat', Sting: 'hobble', Scavenge: 'pickup', 'Spare shafts': 'volley', 'Double nock': 'volley', Nimble: 'feather', 'Light kit': 'Sure feet',
  // Unarmed
  'Quick hands': 'speedthrust', Disarm: 'disarm', Trip: 'trip', 'Open hand': 'hands', 'Hard fists': 'fist', Combo: 'dots', Kick: 'boot', 'Iron body': 'body',
  Calloused: 'fist', "Brawler's wind": 'wind', Grit: 'bandage', 'Quick fists': 'speedthrust', 'Sure grip': 'Aim', 'Close in': 'Harry', Wrench: 'disarm', 'Hook a leg': 'trip', Slip: 'feather',
  Knuckle: 'Aim', 'Thick skin': 'Sure feet', Taunt: 'Opening', 'Keep it going': 'dots', Heel: 'boot', 'Shrug it off': 'body', 'Shoulder in': 'pair', 'Square up': 'Sure feet',
  // Shield
  Brace: 'Steady guard', 'Arrow guard': 'shieldArrow', Bash: 'shieldBurst', Stalwart: 'tower', Cover: 'pair', Rooted: 'shieldPlus', Guardian: 'guardian', 'Shield wall': 'wall',
  'Strap care': 'Edge care', 'Set firm': 'Ward', 'Arrow brace': 'shieldArrow', Turtle: 'Ward', 'Ring the shield': 'waves', 'Shoulder to shoulder': 'pair', 'Steady feet': 'Sure feet',
  'Field dressing': 'bandage', 'Close ranks': 'pair', 'Hold the line': 'wall', Footwork: 'step', Balance: 'Sure feet',
  // Dodge
  'Light feet': 'feather', Sidestep: 'step', Untouchable: 'ghost', 'Arrow dodge': 'bent', 'Second wind': 'wind', 'Slip away': 'away', Roll: 'roll', 'Last stand': 'flag',
  'Light pack': 'pack', Wary: 'eye', Tumble: 'roll', Weave: 'feather', 'Read the swing': 'eye', Duck: 'bent', 'Off balance': 'step', Flow: 'Recover', Wind: 'wind', Tuck: 'roll', Cornered: 'flag',
};
/** A node's sign, by the node's name: the key of its shape, its own name in OWN or the shape it shares (SIGN_OF), an OWN or SHARED key. */
export const signKey = name => OWN[name] ? name : SIGN_OF[name] && (OWN[SIGN_OF[name]] || SHARED[SIGN_OF[name]]) ? SIGN_OF[name] : null;
/** Every shape, by key: { s, f }. */
export const SHAPES = { ...SHARED, ...OWN };
/** The sign's piece name: "Sign " and its key in words ("shieldArrow" is "Sign Shield Arrow"). */
export const signPiece = key => 'Sign ' + key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
/** By node name, as the page uses them: { name: { s, f } }. */
export const GLYPHS = { ...OWN }; for (const name of Object.keys(SIGN_OF)) GLYPHS[name] ||= SHAPES[signKey(name)];
