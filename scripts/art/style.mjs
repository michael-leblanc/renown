// The look every code-made picture shares: the tileset's camera, where the light is, the tileset's colours and how a pixel
// snaps to them, and how a shadow is thrown on the ground. kit.mjs (props), round.mjs (round homes) and buildings.mjs (houses)
// take these from here, so that another way of drawing (Blender, for the characters) can use the very same numbers.
//   node scripts/art/style.mjs                  # the camera and the light as numbers, and a check that they agree with the vectors below
//   node scripts/art/style.mjs --json           # the same as JSON, for a Blender script to read (scripts/art/blender_style.py does)
//   node scripts/art/style.mjs --match <png>    # compares a Blender picture of the test block (blender_style.py --check) with the kit's own
// Nothing here may change a pixel of what the scripts draw: the numbers are the ones the scripts were written with, kept as they
// were typed (DV is 0.612372, not cos 30 x sin 45 worked out again). No package needed.

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

/* ---------- the camera: the tileset's 2:1 view ---------- */
// Every piece is SIZE x SIZE with the middle of its tile at AX, AY. The camera has no perspective (orthographic), looks down 30
// degrees from level, and is turned 45 degrees, so a square tile shows as a diamond 128 px wide and 64 px tall.
export const SIZE = 256, AX = 128, AY = 208;
export const HW = 64, HH = 32;                 // half a tile's diamond, in pixels: one step along a tile's edge is HW across and HH down
export const PPU = 90.5097;                    // pixels per unit across the screen; one tile is 1 x 1 units (HW * sqrt 2)
export const UP_PX = 78.384;                   // pixels a unit of height climbs on the screen (PPU * cos 30); round.mjs and buildings.mjs count heights in pixels
// kit space: x runs down to the right on the screen (the tile grid's i), z down to the left (its j), y is up; the ground is y = 0
export const DV = [-.612372, -.5, -.612372];   // the way the camera looks
export const RV = [.707107, 0, -.707107];      // the screen's right
export const UV = [-.353553, .866025, -.353553];   // the screen's up
/** A prop is drawn from four sides by turning it a quarter at a time under the same camera and the same sun: [a, b, c, d] turns (X, Z) to (a X + b Z, c X + d Z). */
export const ROT = { S: [1, 0, 0, 1], E: [0, -1, 1, 0], N: [-1, 0, 0, -1], W: [0, 1, -1, 0] };
/** The camera and the sun as one side sees them: turn (X, Z) turns a ground point, sun is the way to the sun, dir the way the camera looks. */
export function sideView(side, sun = SUN) {
  const [ra, rb, rc, rd] = ROT[side];
  return { turn: (X, Z) => [ra * X + rb * Z, rc * X + rd * Z], sun: [ra * sun[0] + rb * sun[2], sun[1], rc * sun[0] + rd * sun[2]], dir: [ra * DV[0] + rb * DV[2], DV[1], rc * DV[0] + rd * DV[2]] };
}
/** The point of the camera's plane behind the pixel point X, Y (the tile's middle at ax, ay), in kit space. The line of sight runs through it along DV. */
export function screenToWorld(X, Y, ax = AX, ay = AY) {
  const u = (X - ax) / PPU, v = (ay - Y) / PPU;
  return [u * RV[0] + v * UV[0], v * UV[1], u * RV[2] + v * UV[2]];
}
/** Where the line of sight through W (from screenToWorld) meets the ground: [x, z]. */
export function groundUnder(W) { const tg = -W[1] / DV[1]; return [W[0] + DV[0] * tg, W[2] + DV[2] * tg]; }
/** A point in kit space to its pixel point (the tile's middle at ax, ay). */
export function worldToScreen(x, y, z, ax = AX, ay = AY) {
  return [ax + (x * RV[0] + y * RV[1] + z * RV[2]) * PPU, ay - (x * UV[0] + y * UV[1] + z * UV[2]) * PPU];
}
// tile space (round.mjs, buildings.mjs, the scene page): u runs down to the right, v down to the left, in tiles, tile i, j
// reaching from (i, j) to (i + 1, j + 1); heights in pixels. Screen points are counted from the middle of tile 0, 0.
/** The middle of tile i, j on the screen. */
export const tileToScreen = (i, j) => [(i - j) * HW, (i + j) * HH];
/** A ground point u, v at height z (pixels) on the screen. */
export const groundToScreen = (u, v, z = 0) => [(u - v) * HW, (u + v - 1) * HH - z];
/** The ground point under the screen point X, Y: [u, v]. The line of sight through it is (u + t, v + t) at height 64 t. */
export function screenToGround(X, Y) { const sum = Y / HH + 1, dif = X / HW; return [(sum + dif) / 2, (sum - dif) / 2]; }

/* ---------- the characters' size ---------- */
/** The official character scale (Michael, 2026-11-21, picked from a grid of six by House 1's door): a grown man stands
 *  heightPx tall on the screen, feet to the top of his hair, with his head `head` times the model's own. The head is made
 *  bigger first and the whole is sized after, so the height is always the whole figure's. height: the same in tiles.
 *  door: what it was measured against, the houses' door piece (pixels: at its arch, at its sides, across). */
export const CHARACTER = { heightPx: 96, height: 96 / UP_PX, head: 1.15, door: { piece: 'Door A1', archPx: 96, sidePx: 83, widePx: 55 } };

/* ---------- the light ---------- */
// Two lights are in use, and they do not agree (found 2026-11-21, kept as they are so no picture changes):
// - the props (kit.mjs): the sun stands in front of the scene, to the right. A prop's shadow falls back and to the left.
// - the houses (buildings.mjs, round.mjs): the pieces are bought, lit the same on every side. LIGHT darkens the faces turned to
//   the viewer's left and throws the shadow to the left and a little forward: a sun behind the scene, to the right.
// The official sun is a third: the bought pack's own (OFFICIAL_SUN, below). The characters take it. The props and the houses
// are not moved to it (Michael, 2026-11-21: "Don't change the props or houses yet").
let LW = [.55, .80, .25]; { const l = Math.hypot(...LW); LW = LW.map(v => v / l); }
/** The way to the sun, in kit space, for the props. */
export const SUN = LW;
/** The half-way direction used for a prop's edge highlights: between the sun and straight up. */
export const highlightDir = L => { const v = [L[0] * .6, L[1] * .6 + .8, L[2] * .6], l = Math.hypot(...v); return v.map(c => c / l); };
/** How bright a point of a prop is, 0 to 1: ao (1 in the open, less in a nook), ny (how far its face looks up), ndl (how far it is turned to the sun), s (0 in shadow to 1). */
export const brightness = (ao, ny, ndl, s) => .48 * ao * (.74 + .26 * ny) + .52 * ndl * Math.min(1, s);
/** The houses' light: how much each wall side (S the south-west, E the south-east) and roof slope keeps of its colour, how far
 *  down from the eaves the roof shades a wall (pixels) and how dark, and the ground shadow: its push in tiles (u, v) for a
 *  building one storey high, and its alpha (0 to 255). */
export const LIGHT = { S: 0.85, E: 1, N: 1, W: 1, roofS: 0.9, roofE: 1.06, eave: 26, eaveDark: 0.62, shadow: [-0.35, 0.8], shadowAlpha: 84 };
/** The way to a sun in kit space. turn: degrees from straight behind the scene (the sun over the tile's north-east edge, a
 *  shadow running along +v, down the screen to the left) toward the east (+u). up: degrees above the ground. */
export const sunFrom = (turn, up) => { const t = turn * Math.PI / 180, e = up * Math.PI / 180; return [Math.cos(e) * Math.sin(t), Math.sin(e), -Math.cos(e) * Math.cos(t)]; };
/** The official sun (Michael, 2026-11-21): the bought pack's own, measured on 8 of its pieces (docs/art-style.md has the table).
 *  It is fixed to the camera: a piece's four sides are the piece turned under the same sun.
 *  - turn, up: where it stands (see sunFrom). The 6 tall pieces gave turn 0.6 (spread 3.5, from -5.3 to +4.7) and up 75.1
 *    (spread 1.5), so it is kept as the round numbers the measure points at: straight behind, 75 up.
 *  - shadow: how far a point's shadow lies from the ground under it, in tiles (u, v), for each unit of height.
 *  - shadowAlpha: how dark the pack bakes a shadow on the ground, 0 to 255 (the average of the big pieces: 178 to 192).
 *  - shadowFade: a character's shadow pales toward its tip as the pack's pots' does (Misc A3): this alpha at the feet, this at the
 *    shadow of the top of its head. The sprite carries the alpha itself, so the game draws it as it is.
 *  - faces: how bright a side is beside the top of the same thing, as the picture's own values (0 to 255): E the side turned
 *    down the screen to the right, S the one turned down to the left. facesLinear: the same in linear light.
 *  - blender: the three lights that give facesLinear on a plain block: the sun, an even light from everywhere (the world),
 *    and a fill from the east that throws no shadow. A matt face then shows colour * (world + sun * cos / pi + fill * cos / pi). */
const OFF_FACES = { top: 1, E: 0.71, S: 0.51 };
export const OFFICIAL_SUN = {
  turn: 0, up: 75, toSun: sunFrom(0, 75),
  measured: { pieces: 6, turn: 0.6, turnSpread: 3.5, turnRange: [-5.3, 4.7], up: 75.1, upSpread: 1.5, upRange: [73.1, 77.2] },
  shadow: [0, 1 / Math.tan(75 * Math.PI / 180)], shadowAlpha: 184, shadowFade: [190, 120],
  faces: { top: 1, E: 0.84, S: 0.72 }, facesLinear: OFF_FACES,
  blender: { world: OFF_FACES.S, sun: Math.PI * (1 - OFF_FACES.S) / Math.sin(75 * Math.PI / 180), fill: Math.PI * (OFF_FACES.E - OFF_FACES.S), fillToLight: [1, 0, 0] },
};
/** A round wall or roof's shade where it is turned by ang (0 = along u): in steps of 0.03, as the pack shades, the brightest turned to the right. */
export const stepLight = (ang, base, amp) => Math.round((base + amp * Math.cos(ang + Math.PI / 4)) / 0.03) * 0.03;
/** How much a wall keeps of its colour h pixels up, under eaves at height eave. */
export const eaveShade = (h, eave, light = LIGHT) => light.eaveDark + (1 - light.eaveDark) * Math.max(0, Math.min(1, (eave - h) / light.eave));

/* ---------- the colours, and snapping a pixel to them ---------- */
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** The colours, dark to pale. Taken from the tileset so a prop sits beside it. */
export const RAMP = {
  rock: ['#3a3a35', '#45453f', '#57574f', '#6d6d65', '#7c7c73', '#84847c', '#93938c'].map(hex),     // the tileset's boulders
  moss: ['#22330f', '#2c4416', '#3c5421', '#455f27', '#587430'].map(hex),
  grass: ['#2b4315', '#35501c', '#3f5824', '#4f6c2c', '#668537'].map(hex),
  wood: ['#2b190a', '#39220f', '#422912', '#4c3015', '#5c3d1c', '#6e4c26'].map(hex),                // from the tileset's door, two paler tones added
  iron: ['#262521', '#35332f', '#3d3d38', '#4d4d46', '#62625b', '#7c7c73'].map(hex),
  canvas: ['#35301f', '#474029', '#5b5237', '#6f6546', '#837856', '#958a67', '#a59a77'].map(hex),   // undyed, weathered cloth; no tileset piece has it, so it is chosen to sit between the wall stone and the ground
  fire: ['#7c2a12', '#a63c16', '#c9591b', '#e07d24', '#eca436', '#f2c95a'].map(hex),                // the one bright thing; still a small ramp with hard edges
  lit: ['#6e5745', '#8b6c4f', '#a9835a', '#c39a66'].map(hex),                                       // stone in firelight
  leather: ['#2a170d', '#3d2214', '#53301c', '#6a3f25', '#7f5030', '#94633e'].map(hex),              // tanned hide: warmer and redder than the wood, no grain
  boards: ['#3a2c14', '#4c3c20', '#58482c', '#62502f', '#6c5838', '#7a6642'].map(hex),              // floor boards: the tileset's plank floor (Ground F1), greyer and paler than the door
  earth: ['#2e2008', '#3c2c10', '#402c10', '#4c3814', '#5c481c', '#604c28', '#6c5630'].map(hex),    // trodden earth: the tileset's bare ground (Ground A1, C3)
  straw: ['#4c3c00', '#5c4808', '#6c5414', '#786018', '#86701f', '#94802a'].map(hex),               // dry straw: the tileset's yellow grass (Ground J1)
  // The four below are for characters. Every tone is a colour the tileset's own pieces hold, to the digit (docs/art-style.md names the pieces).
  cloth: ['#4e4937', '#5c5641', '#6e634d', '#807960', '#8f886d', '#9e977c'].map(hex),               // undyed linen
  skin: ['#9d6c3f', '#a77546', '#ac7a4a', '#b48250', '#c0905c'].map(hex),                            // its shade end is kept light, so a face in the shade still reads as a face
  hair: ['#2b2013', '#3a2d1f', '#463426', '#544030', '#634b38', '#735943', '#876b53'].map(hex),     // brown hair, brows
  hide: ['#201105', '#321c0b', '#38220c', '#412711', '#4d2f16', '#5f3c1d', '#67451e', '#765125'].map(hex), // worn leather and dark wool: boots, belts, trousers (`leather` above is the props' and is not the tileset's)
  // Goblin skin, on trial (docs/races/goblin.md). NOT the tileset's: it holds no grey-teal, so these five are new, at the human skin's lightness.
  skin_teal: ['#5c807f', '#658989', '#6a8e8d', '#729695', '#7ea3a2'].map(hex),
  skin_teal_deep: ['#3a6363', '#4e7676', '#608787', '#709696', '#7ea3a2'].map(hex),                  // the same with a darker shade end, on trial beside it: a bare chest reads flat on skin_teal
  eye_yellow: ['#d9a81e', '#efc22c', '#f8dc4f'].map(hex),                                             // goblin eyes, "bright yellow" (Michael): new colours, the tileset has no bright yellow
  bone: ['#a29e90', '#b0ad9f', '#c1b8a6'].map(hex),                                                   // fangs and claws, "pale bone": the tileset's own (desert Misc D7, D8, Stone B5), its palest warm greys
  // Greener goblin skins, on trial (Michael, 2026-11-21: "grey-teal doesn't look like a goblin"), each with the darker shade end. New colours.
  skin_lime: ['#4e6026', '#657734', '#7e8f42', '#95a550', '#adba5f'].map(hex),                        // a: yellow-green, warmer and brighter than the grass (hue 124 to 116; the grass is 131)
  skin_jade: ['#275f44', '#377552', '#478b61', '#599e6f', '#6bb17d'].map(hex),                        // b: blue-green, clearly green but cooler than the grass (hue 160 to 151)
  skin_own: ['#243511', '#2d4217', '#374f1e', '#415c24', '#4b692c'].map(hex),                         // c: the model's own green as the official sun lights it. It is the grass's hue (131) and lightness
  skin_own_lifted: ['#4c6335', '#5c7742', '#6a894d', '#779858', '#85a865'].map(hex),                  // c+: that hue at the other skins' lightness
  // Orc skins, on trial (Michael, 2026-11-24: "grey-green default, plus 2 other options that read well on the grass (not grass green)"). New colours.
  eye_red: ['#c42a1c', '#ec3f28', '#ff6a4a'].map(hex),                                               // orc eyes (Michael, 2026-11-24: "red for orcs. Make it a bit brighter"): new colours
  skin_orc: ['#3a4434', '#4b5744', '#5d6a54', '#707d66', '#86927a'].map(hex),                         // grey-green: the grass's hue family, but little colour, so it reads as grey against it
  skin_orc_umber: ['#4a3826', '#5f4931', '#755c3e', '#8b704d', '#a2865f'].map(hex),                   // umber: warm brown, far from the grass's hue
  skin_orc_slate: ['#373e47', '#48505b', '#5b6470', '#6f7985', '#86909c'].map(hex),                   // slate: cool blue-grey
  // The goblin waistcoat's own dye (Michael, 2026-11-24: "the brown waistcoat merges with the brown shorts at 1x. Show the
  // waistcoat in 3 default dyes (dark green, burgundy, deep blue) next to the current brown"). waistcoat is the default dye.
  // The three dyes are new colours (the tileset has none of them), on trial; lightness step for step as hide's.
  waistcoat: ['#220a0e', '#341016', '#3e131b', '#481720', '#561c27', '#672330', '#742a37', '#843343'].map(hex),   // burgundy, the default (Michael picked it, 2026-11-24)
  vest_brown: ['#201105', '#321c0b', '#38220c', '#412711', '#4d2f16', '#5f3c1d', '#67451e', '#765125'].map(hex),  // hide's tones, as it was
  vest_green: ['#0f1f12', '#16291a', '#1b3220', '#213b26', '#28472d', '#315536', '#3a613d', '#466e46'].map(hex),
  vest_blue: ['#0c1426', '#121d35', '#16233f', '#1b2a4a', '#213358', '#293e69', '#304876', '#3a5586'].map(hex),
  brass: ['#4a3510', '#6b4e18', '#8f6c25', '#b08a35', '#cdab52'].map(hex),                         // brass buttons and buckles (2026-11-22, on trial: new colours, the tileset has no yellow metal)
  // The metals (Michael, 2026-11-23: "bronze, iron, steel, gold (and maybe silver, dark iron)"): six tones each, their own hue,
  // the same tone numbers for every metal, so a metal part is drawn in any of them by swapping tone for tone (the race's
  // "metal" colours in wardrobe.json; METAL in items.mjs is this table). iron is the tileset's, above. New colours, on trial.
  bronze: ['#3b2410', '#5c3a17', '#7d5420', '#9d702c', '#bb8d3d', '#d8ae5c'].map(hex),                // warm brown-orange (the items' bronze since D218)
  steel: ['#353e49', '#4c5865', '#667381', '#8592a0', '#a7b3bf', '#cdd7e0'].map(hex),                 // cool light grey (the items' steel since D218)
  gold: ['#59400f', '#7c5b14', '#a27a1c', '#c4992a', '#dfb743', '#f1d46e'].map(hex),                  // yellow (the coins' colours since D218)
  silver: ['#44484c', '#606468', '#7f8488', '#a1a5aa', '#c3c8cd', '#e4e8ed'].map(hex),                // paler and more neutral than steel ("maybe")
  dark_iron: ['#181a20', '#22242a', '#2b2e34', '#383a41', '#45474e', '#585b62'].map(hex),             // blue-black, darker than iron ("maybe"); its darkest stays clear of the outline
};
/** Ramps added after the first props: a picture's pixels snap to them only if it uses them, so the older sprites never change. */
export const EXTRA = new Set(['canvas', 'fire', 'lit', 'leather', 'boards', 'earth', 'straw', 'cloth', 'skin', 'hair', 'hide', 'skin_teal', 'skin_teal_deep', 'eye_yellow', 'bone', 'brass', 'bronze', 'steel', 'gold', 'silver', 'dark_iron', 'skin_lime', 'skin_jade', 'skin_own', 'skin_own_lifted', 'skin_orc', 'skin_orc_umber', 'skin_orc_slate', 'eye_red', 'waistcoat', 'vest_brown', 'vest_green', 'vest_blue']);
/** Where a character's ramp does not start at the lit colour's own lightness: [a, b] are the lit lightnesses (OKLab L)
 *  that take the ramp's darkest and its palest tone, the tones between spread evenly. Only skin has one: the official
 *  sun is behind the scene, so a face is in the shade, and its shade lands on the ramp's dark end, which is kept light.
 *  No light is added; a ramp not named here takes the tone nearest in lightness.
 *  skin_teal's is measured on the one goblin model tried so far, whose own green is darker than the human model's skin:
 *  the same two places in its lit lightnesses as skin's are in the Peasant's (the darkest fiftieth, and 1.08 times the palest). */
const GOBLIN_LIT = [0.31, 0.52];
// steel: a metal's lit grey spans little lightness (0.47 to 0.60 on the mail shirt, measured 2026-11-23), so it is spread over the ramp's tones but its palest (that one is TOP_TONE's).
// The orc (orc_model_1, 2026-11-24): its skin is a plain light grey (the model came with no picture), lit 0.727 (the
// darkest fiftieth) to 0.96 in the idle facing SE; the same rule: [that, 1.08 times the palest].
const ORC_LIT = [0.73, 1.04];
export const TONE_FROM = { steel: [0.40, 0.66], skin: [0.45, 0.66], skin_teal: GOBLIN_LIT, skin_teal_deep: GOBLIN_LIT, skin_lime: GOBLIN_LIT, skin_jade: GOBLIN_LIT, skin_own: GOBLIN_LIT, skin_own_lifted: GOBLIN_LIT, skin_orc: ORC_LIT, skin_orc_umber: ORC_LIT, skin_orc_slate: ORC_LIT };
/** A ramp whose palest tone is kept for the surfaces lit most (Michael, 2026-11-23: "the near-white tone only on top-facing
 *  surfaces (shoulders, upper chest); the rest in the mid tones. No scattered white pixels"): the other tones are spread over
 *  the rest, and a pixel takes the palest only where its lit lightness is at least `lit` and so is that of `clump` of its 8
 *  neighbours of the same ramp. A zone named in `except` stops a tone below. */
export const TOP_TONE = { steel: { lit: 0.585, clump: 3, except: ['Edge'], always: ['Rivet'], shine: ['Shine'], shineLit: 0.62, rim: 60 } };   // except: zones (fit_armour.py --zones, fit_rigid.py --detail) that never take it; always: zones that take it alone (a rivet is a pixel or two); shine: zones that take it wherever lit shineLit or more, alone or not (a plate's top edge, fit_rigid.py --detail shine=1); rim: on pieces with a Shine zone, the pixel with nothing above it or the piece above more than rim depth steps (1/8192 tile) farther takes it too (the plate's upper edge)
/** The plate's metal (Michael, 2026-11-25: "large improvement", his pick B, after the chest quality audit): the official sun is
 *  behind the figure, so a plain grey plate came out nearly one light (60% of the chest within 0.05 of lightness) and one
 *  tone. These materials also show a made-up sky in them, by the way the view reflects off them: `stops` along the
 *  reflection's height (0 straight down, 1 straight up) to a grey, added as light at `strength` (`by`: another strength for
 *  the materials starting so, the helm's dome came out too white). Curved plate then reads as curved. Their lit lightness
 *  then spans more, so it is spread over the ramp from `tone_from` (not TONE_FROM's), and TOP_TONE's `lit` and `shineLit`
 *  are these. `super`: their pictures' light is rendered that many times as fine each way and each pixel takes the mean of
 *  its own material's small pixels (character.py --super, paperdoll.mjs), so thin rims and rivets stop coming out as specks. */
export const METAL_SKY = { materials: '^(PC|PPR|PPL|PH|PL)_(Metal|Seam|Shine|Rivet)$', strength: 1.0, by: { PH_: 0.7 },
  stops: [[0, 0], [0.42, 0.03], [0.5, 0.55], [0.62, 0.3], [1, 0.22]], tone_from: [0.46, 0.80], lit: 0.74, shineLit: 0.76, super: 4, super_samples: 32 };
/** The outline every character is drawn with (Michael, 2026-11-21: "Outline on all characters"): px pixels of this colour
 *  outside the figure's edge (up, down, left, right), over its ground shadow. It is not in the sprites: the shader that
 *  draws a character adds it (paperdoll_check/doll.gdshader), as paperdoll.mjs `outline` does here. The iron ramp's darkest. */
export const OUTLINE = { colour: hex('#262521'), px: 1 };
/** The part line (Michael, 2026-11-24, his pick B: the helm "merges" with the armour): where a part in one of these slots
 *  lies in front of another part, the pixel of the part behind, next to it (up, down, left, right), takes OUTLINE's colour,
 *  when the part behind is more than gap depth steps (1/8192 tile) farther. Added when the character is drawn, like the
 *  outline: paperdoll.mjs `partLine`, doll.gdshader (lined, line_gap), preview.mjs --part-lines. */
/** The tuck (Michael, 2026-11-25: "still has holes in it"): where a garment worn under (a slot in `pairs`) lies in front of
 *  one worn over it (the slots listed for it) by less than `gap` depth steps (1/8192 tile), the one over it shows: a tunic
 *  that pokes a little through a breastplate as the body bends stays under it. An arm or sleeve truly in front is nearer
 *  than that and still shows. Trousers go under the chest armour too (Michael, 2026-11-25: "why we don't see the
 *  triangle"): as the hips shift, their belt poked through the breastplate's point. What paperdoll.mjs `lay` and
 *  doll.gdshader (tucks, tuck_gap) do. */
export const TUCK = { gap: 400, pairs: { top: ['over', 'shoulders', 'waist'], legs: ['over', 'leg_armour', 'waist'] } };
export const PART_LINE = { slots: ['head', 'over', 'shoulders'], gap: 4 };
/** Every colour of every ramp in one list, and for each its [ramp name, place in the ramp]. */
export const PALETTE = Object.values(RAMP).flat();
export const PAL_AT = Object.entries(RAMP).flatMap(([n, r]) => r.map((_, i) => [n, i]));
/** A colour (0 to 255 a channel) in OKLab, where equal steps look equal. */
export function oklab([R, G, B]) {
  const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }, r = f(R), g = f(G), b = f(B);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const PAL_LAB = PALETTE.map(oklab);
/** Makes the snap for one picture: used is the set of EXTRA ramp names the picture draws with. The snap takes a colour
 *  [r, g, b] and gives the place in PALETTE of the nearest allowed colour (nearest in OKLab). */
export function snapper(used = new Set()) {
  const okPal = PAL_AT.map(([rn]) => !EXTRA.has(rn) || used.has(rn));
  return rgb => { let best = 1e9, bi = 0; const q = oklab(rgb); PAL_LAB.forEach((p, k) => { if (!okPal[k]) return; const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < best) { best = d; bi = k; } }); return bi; };
}
/** One tone paler in the same ramp, for an edge highlight: the place in PALETTE after k, or k at the ramp's pale end (moss and grass stay). */
export function paler(k) { const [rn, ri] = PAL_AT[k]; return rn !== 'moss' && rn !== 'grass' && ri + 1 < RAMP[rn].length ? k + 1 : k; }

/* ---------- shadows ---------- */
/** How much sun reaches the point (x, y, z) of a shape, 0 (in shadow) to 1: walks from the point toward the sun L through
 *  cast(x, y, z), the distance to whatever throws the shadow. Soft at the edge of a shadow. */
export function sunShadow(cast, L, x, y, z) {
  let res = 1, t = .03;
  for (let i = 0; i < 48 && t < 3.6; i++) { const d = cast(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (d < .002) return 0; res = Math.min(res, 14 * d / t); t += clamp(d, .012, .15); }
  return res;
}
/** Is the ground point gx, gz in a prop's shadow? The shadow sprite is black where it is; the game draws it at SHADOW_ALPHA. */
export const groundInShadow = (cast, L, gx, gz) => Math.abs(gx) < 2.6 && Math.abs(gz) < 2.6 && sunShadow(cast, L, gx, .012, gz) < .5;
export const SHADOW_ALPHA = .3;
/** Is the ground point u, v in the shadow of a w by d building (its footprint pushed along sv, in tiles)? The footprint itself
 *  counts as shadow here. sv[0] < 0, sv[1] > 0: the shadow falls to the left. */
export const inRectShadow = (u, v, w, d, [vx, vy]) => Math.max(0, u / vx, (v - d) / vy) <= Math.min(1, (u - w) / vx, v / vy);
/** Is the point a, b (tiles from a round building's middle) in the shadow of its outline, a ring of radius r pushed along sv? */
export function inRoundShadow(a, b, r, sv) { const t = clamp((a * sv[0] + b * sv[1]) / (sv[0] * sv[0] + sv[1] * sv[1]), 0, 1); return Math.hypot(a - t * sv[0], b - t * sv[1]) < r; }
/** A building's ground shadow over tile i, j as a 256 x 256 picture: black at the given alpha wherever inRectShadow, less the footprint itself
 *  (a floor inside is not in shadow once the roof is off). */
export function rectShadowTile(i, j, w, d, sv, alpha = LIGHT.shadowAlpha) {
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = AY - HH; y <= AY + HH; y++) for (let x = AX - HW; x <= AX + HW; x++) {
    const X = (x + 0.5 - AX) / HW, Y = (y + 0.5 - AY) / HH, du = (X + Y) / 2 + 0.5, dv = (Y - X) / 2 + 0.5;
    if (du < 0 || du >= 1 || dv < 0 || dv >= 1) continue;
    const u = i + du, v = j + dv;
    if (u >= 0 && u < w && v >= 0 && v < d) continue;
    if (inRectShadow(u, v, w, d, sv)) out[(y * SIZE + x) * 4 + 3] = alpha;
  }
  return { width: SIZE, height: SIZE, data: out };
}

/* ---------- the camera and the light as numbers ---------- */
const deg = r => r * 180 / Math.PI;
/** The camera and the props' sun as plain numbers, and as what Blender needs (Z up: Blender X = kit x, Y = -kit z, Z = kit y;
 *  one tile = one Blender unit). Worked out from the vectors above, so they cannot drift apart. */
export function numbers() {
  const pitch = deg(Math.asin(-DV[1])), yaw = deg(Math.atan2(-DV[0], -DV[2]));           // down from level; turned from looking along -z
  const sunUp = deg(Math.asin(SUN[1])), sunTurn = deg(Math.atan2(SUN[2], SUN[0]));       // above the ground; from +x toward +z
  const bl = v => [v[0], -v[2], v[1]];
  const sunEuler = v => [0, 90 - deg(Math.asin(v[1])), -deg(Math.atan2(v[2], v[0]))];     // a Blender sun lamp's rotation_euler for the way to it in kit space
  const O = OFFICIAL_SUN;
  return {
    camera: {
      projection: 'orthographic', pitch_down_deg: pitch, yaw_deg: yaw,
      pixels_per_unit: PPU, pixels_per_unit_of_height: PPU * Math.cos(Math.asin(-DV[1])), tile_px: [2 * HW, 2 * HH],
      frame_px: [SIZE, SIZE], tile_middle_px: [AX, AY], look: DV, right: RV, up: UV,
    },
    sun: { to_sun: SUN, above_ground_deg: sunUp, turn_deg: sunTurn, note: 'the props\' sun (kit.mjs); the houses use LIGHT' },
    house_light: LIGHT,
    character: { height_px: CHARACTER.heightPx, height_tiles: CHARACTER.height, head_scale: CHARACTER.head, door: CHARACTER.door,
      note: 'a grown man, feet to the top of his hair; the head is made bigger first, then the whole is sized' },
    official_sun: { to_sun: O.toSun, above_ground_deg: O.up, turn_deg: O.turn, measured: O.measured, shadow_tiles_per_unit_of_height: O.shadow, shadow_alpha: O.shadowAlpha, shadow_fade: O.shadowFade, faces: O.faces, faces_linear: O.facesLinear,
      note: 'the bought pack\'s sun, for the characters; turn is from straight behind the scene toward the east (+u)' },
    blender: {
      axes: 'Blender X = tile i (down to the right on screen), Y = minus tile j (up to the right), Z = up; 1 unit = 1 tile',
      camera_type: 'ORTHO', camera_rotation_euler_deg: [90 - pitch, 0, yaw],
      camera_look: bl(DV), camera_from_target: bl(DV).map(v => -v),
      ortho_scale_per_256px: SIZE / PPU, ortho_scale_rule: 'the frame\'s longer side in pixels / pixels_per_unit',
      shift_rule: 'shift_x = (frame_width / 2 - middle_x) / longer_side, shift_y = (middle_y - frame_height / 2) / longer_side, with the camera aimed at the tile\'s middle on the ground',
      shift_for_256px: [(SIZE / 2 - AX) / SIZE, (AY - SIZE / 2) / SIZE],
      sun_to: bl(SUN), sun_rotation_euler_deg: [0, 90 - sunUp, -sunTurn],
      official: { sun_to: bl(O.toSun), sun_rotation_euler_deg: sunEuler(O.toSun), sun_strength: O.blender.sun, world_strength: O.blender.world,
        fill_to: bl(O.blender.fillToLight), fill_rotation_euler_deg: sunEuler(O.blender.fillToLight), fill_strength: O.blender.fill, shadow_alpha: O.shadowAlpha / 255, shadow_fade: O.shadowFade,
        view_transform: 'Standard' },
      filter: 'for hard pixels like the tiles: film filter 0.01 px, then cut alpha at 0.5',
      metal_sky: METAL_SKY,
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('style.mjs')) {
  const N = numbers(), argv = process.argv.slice(2), f = (v, n = 4) => Array.isArray(v) ? `[${v.map(x => f(x, n)).join(', ')}]` : typeof v === 'number' ? String(+v.toFixed(n)) : v;
  if (argv.includes('--json')) console.log(JSON.stringify(N, null, 2));
  else if (argv.includes('--match')) Promise.all([import('./kit.mjs'), import('./png.mjs')]).then(([{ render, sdBox }, { readPng }]) => {   // loaded late: kit.mjs itself loads this file
    // a Blender picture of the test block against the kit's own: the same block (0.8 x 0.6 x 0.5 on the tile's middle) through both cameras
    const file = argv[argv.indexOf('--match') + 1], b = readPng(file);
    const k = render({ H: .6, bound: [.5, .4, .4], noMoss: true, sdf: (x, y, z) => sdBox(x, y - .3, z, .4, .3, .25, 0) }, 'S', 3);
    if (b.width !== SIZE || b.height !== SIZE) { console.error(`${file} is not ${SIZE} x ${SIZE}`); process.exit(1); }
    let both = 0, kit = 0, ble = 0, sb = 0, sk = 0, sboth = 0; const box = m => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < SIZE * SIZE; i++) if (m(i)) { const x = i % SIZE, y = (i / SIZE) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
    const inK = i => k.out[i * 4 + 3] >= 128, inB = i => b.data[i * 4 + 3] >= 128 && b.data[i * 4] + b.data[i * 4 + 1] + b.data[i * 4 + 2] > 60;   // the block glows; a shadow is black
    const shK = i => !inK(i) && k.so[i * 4 + 3] >= 128, shB = i => !inB(i) && b.data[i * 4 + 3] >= 128;
    for (let i = 0; i < SIZE * SIZE; i++) { const a = inK(i), c = inB(i); if (a && c) both++; else if (a) kit++; else if (c) ble++; const s = shK(i), t = shB(i); if (s && t) sboth++; else if (s) sk++; else if (t) sb++; }
    console.log(`block: ${both} px in both, ${kit} only in the kit's, ${ble} only in Blender's (${(100 * both / (both + kit + ble)).toFixed(2)}% the same)`);
    console.log(`  the kit's reaches ${f(box(inK))}, Blender's ${f(box(inB))} (left, top, right, bottom)`);
    console.log(`shadow on the ground: ${sboth} px in both, ${sk} only in the kit's, ${sb} only in Blender's; the kit's reaches ${f(box(shK))}, Blender's ${f(box(shB))}`);
    process.exit(kit + ble > .02 * both ? 1 : 0);
  });
  else {
    const c = N.camera, s = N.sun, b = N.blender;
    console.log(`camera: ${c.projection}, looks down ${f(c.pitch_down_deg, 3)} deg from level, turned ${f(c.yaw_deg, 3)} deg`);
    console.log(`  ${f(c.pixels_per_unit)} px per unit across (1 tile = 1 unit = ${c.tile_px[0]} x ${c.tile_px[1]} px diamond), ${f(c.pixels_per_unit_of_height, 3)} px per unit of height`);
    console.log(`  frame ${c.frame_px.join(' x ')}, the tile's middle at ${c.tile_middle_px.join(', ')}`);
    console.log(`sun (props): ${f(s.above_ground_deg, 2)} deg above the ground, ${f(s.turn_deg, 2)} deg from +x toward +z; to the sun ${f(s.to_sun)}`);
    console.log(`house light: sides S ${LIGHT.S}, E ${LIGHT.E}; shadow pushed ${f(LIGHT.shadow)} tiles a storey, alpha ${LIGHT.shadowAlpha}`);
    console.log(`character: a grown man stands ${N.character.height_px} px (${f(N.character.height_tiles)} tiles), head ${N.character.head_scale} times the model's; the door (${N.character.door.piece}) is ${N.character.door.archPx} px at its arch`);
    const o = N.official_sun, ob = b.official;
    console.log(`official sun (the bought pack's, for the characters): ${f(o.above_ground_deg, 2)} deg above the ground, straight behind the scene (turned ${f(o.turn_deg, 2)} deg); to the sun ${f(o.to_sun)}`);
    console.log(`  measured on ${o.measured.pieces} pieces: turn ${o.measured.turn} +/- ${o.measured.turnSpread} deg, up ${o.measured.up} +/- ${o.measured.upSpread} deg`);
    console.log(`  a shadow lies ${f(o.shadow_tiles_per_unit_of_height)} tiles from its point per unit of height, alpha ${o.shadow_alpha}; sides beside the top: E ${o.faces.E}, S ${o.faces.S} (linear ${o.faces_linear.E}, ${o.faces_linear.S})`);
    console.log(`Blender: ORTHO, rotation_euler ${f(b.camera_rotation_euler_deg, 3)} deg, ortho_scale ${f(b.ortho_scale_per_256px, 5)} for 256 px, shift ${f(b.shift_for_256px)}`);
    console.log(`  sun rotation_euler ${f(b.sun_rotation_euler_deg, 2)} deg (the props')`);
    console.log(`  official sun rotation_euler ${f(ob.sun_rotation_euler_deg, 2)} deg, strength ${f(ob.sun_strength, 3)}; world ${f(ob.world_strength, 3)}; fill ${f(ob.fill_rotation_euler_deg, 2)} deg, strength ${f(ob.fill_strength, 3)}, no shadow`);
    // the check: the typed vectors against the angles
    const p = Math.PI / 6, y = Math.PI / 4, want = { look: [-Math.cos(p) * Math.sin(y), -Math.sin(p), -Math.cos(p) * Math.cos(y)], right: [Math.cos(y), 0, -Math.sin(y)], up: [-Math.sin(p) * Math.sin(y), Math.cos(p), -Math.sin(p) * Math.cos(y)] };
    const off = Math.max(...Object.keys(want).flatMap(n => want[n].map((v, i) => Math.abs(v - c[n][i])))), tile = Math.abs(PPU * Math.SQRT2 - 2 * HW), [gx, gy] = groundToScreen(1, 1), [wx, wy] = worldToScreen(.5, 0, .5, 0, 0);
    const ok = off < 1e-5 && tile < 1e-3 && Math.abs(gx - wx) < 1e-3 && Math.abs(gy - wy) < 1e-3;
    console.log(`${ok ? 'OK' : 'FAIL'}: vectors within ${off.toExponential(1)} of 30 and 45 deg; a tile is ${f(PPU * Math.SQRT2, 4)} px wide; kit and tile projections ${Math.abs(gy - wy) < 1e-3 ? 'agree' : 'differ'}`);
    process.exit(ok ? 0 : 1);
  }
}
