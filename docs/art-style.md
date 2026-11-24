# Art style: the shared camera, light, colours and shadows

Written 2026-11-21. The numbers every code-made picture shares, in one file: `scripts/art/style.mjs`.
`kit.mjs` (props), `round.mjs` (round homes) and `buildings.mjs` (houses) take them from there. Blender will too, for the characters.

- Print them: `node scripts/art/style.mjs` (as JSON: `--json`).
- **Not decided here:** nothing below is a decision (D##). The numbers are the ones the scripts were already written with.
- **The official sun** (Michael, 2026-11-21): the bought pack's own, measured below. The characters take it. The props and the houses keep their suns for now.
- **The official character scale** (Michael, 2026-11-21): a grown man stands 96 px, head 1.15 times the model's. See below.

## The camera, as numbers

| What | Value |
|---|---|
| Projection | **Orthographic** (no perspective) |
| Pitch | Looks **30° down** from level |
| Yaw | Turned **45°**, so a square tile shows as a diamond |
| Pixels per world unit | **90.5097** across the screen (1 tile = 1 unit) |
| Height | **78.384 px** per unit of height (90.5097 × cos 30°) |
| A tile on screen | A diamond **128 × 64 px** (2:1) |
| A piece | **256 × 256 px**, the tile's middle on the ground at **(128, 208)** |
| Sides | Four: S, E, N, W. The camera stays; the thing is turned a quarter each time |

- As vectors (x down to the right on screen, y up, z down to the left): looks along `(-0.612372, -0.5, -0.612372)`, screen right `(0.707107, 0, -0.707107)`, screen up `(-0.353553, 0.866025, -0.353553)`.
- The Creator's human at game size (the earlier characters) is about 1.4 units tall in the props' space: 108 px. The Blender characters are smaller: see the official character scale.

## The official character scale

Michael, 2026-11-21, picked from a grid of six (90, 96, 102 px, each with the model's own head and a head 1.15 times bigger), standing by House 1's door. In `style.mjs`: `CHARACTER`.

| What | Value |
|---|---|
| A grown man's height | **96 px** on screen, feet to the top of his hair (**1.2247 tiles** of height) |
| His head | **1.15 times** the model's own (the head bone made bigger; the hair follows) |
| Measured against | The houses' door, `Door A1`: **96 px** at its arch, 83 px at its sides, 55 px across |

- **The head grows first, then the whole is sized:** 96 px is always the whole figure. With the bigger head, the body is about 2 % smaller than it would be.
- The sprite's own picture is a little taller than 96 px (101 px for the Peasant), because we look down on the feet and the top of the head.
- Other races and builds are sized from this one. **The goblin: 48 px**, half a human (Michael's spec, 2026-11-21, `docs/races/goblin.md`; 54 px is shown beside it in the readability grid, his pick). The orc: not decided yet.
- `scripts/art/character.py` takes both numbers from `style.mjs` unless told otherwise (`--height`, `--grow`).
- The grid he chose from: `/mnt/project-files/characters/peasant/peasant-size-grid.png` (holds bought art, so not in the repo).

## The same camera in Blender

Blender's axes: **X = the tile grid's i** (down to the right on screen), **Y = minus j** (up to the right), **Z = up**. One Blender unit = one tile.

| Setting | Value |
|---|---|
| Camera type | `ORTHO` |
| `rotation_euler` (XYZ) | **(60°, 0°, 45°)** |
| `ortho_scale` | **frame's longer side in px ÷ 90.5097** (2.82843 for 256 px) |
| Aim | At the tile's middle on the ground (0, 0, 0); the distance changes nothing |
| `shift_x` | (frame width ÷ 2 − middle x) ÷ longer side (0 for 256 px) |
| `shift_y` | (middle y − frame height ÷ 2) ÷ longer side (**0.3125** for 256 px, middle at 208) |
| Sun, as the props have it | `rotation_euler` **(0°, 37.06°, −24.44°)**: 52.94° above the ground |
| **The official sun** (characters) | `rotation_euler` **(0°, 15°, 90°)**, strength **1.594**, angle 0 (hard shadow) |
| With it: light from everywhere | World colour white, strength **0.51** |
| With it: a fill from the east | A second sun, `rotation_euler` **(0°, 90°, 0°)**, strength **0.628**, **no shadow** |
| View transform | `Standard` (Blender's own choice, AgX, greys the colours) |
| Engine | Cycles on the processor (EEVEE crashes in the cloud: no graphics card) |

- `scripts/art/blender_style.py` sets all of this from `style.mjs` (`setup(scene, width, height, middle)`), so the two cannot drift apart.
  - For the official sun: `setup(scene, width, height, middle, light="official")`, then `render_with_shadow(scene, "out.png")`: the picture with its ground shadow, black, at the pack's alpha.
- **Checked, 2026-11-21:** the same block (0.8 × 0.6 × 0.5 tiles) drawn by the kit and rendered by Blender 4.2.0 with these numbers covers the same pixels: same left, top, right and bottom edge to the pixel, 5,580 px in both, 7 px only in the kit's (99.87 % the same). Its ground shadow ends on the same pixels on the right and at the bottom; the kit's runs 2 px further at the tip.
  - Run it again: `python3.11 scripts/art/blender_style.py --check scripts/art/out/blender-check.png`, then `node scripts/art/style.mjs --match scripts/art/out/blender-check.png`.
- Blender in a cloud session: `scripts/art/setup_blender.sh` (Blender 4.2.0 as a Python module; there is no `blender` program, so a script runs as `python3.11 script.py`).

## The official sun: the bought pack's, measured

Michael, 2026-11-21: "Use the bought pack's sun for characters." In `style.mjs`: `OFFICIAL_SUN`.

| What | Value |
|---|---|
| Where it stands | **Straight behind the scene, 75° above the ground**: over the tile's north-east edge, up and to the right on screen |
| The way to it | Kit space `(0, 0.9659, −0.2588)`; Blender `(0, 0.2588, 0.9659)` |
| A shadow | Falls **down the screen to the left, along the tile's edge**, 0.268 tile for each tile of height (17 px left and 8.5 px down for 78 px of height) |
| The shadow's darkness | Black at alpha **184** of 255 (the pack bakes it into the piece) |
| The side turned down-right (E) | **0.84** of the top's brightness (0.71 in linear light) |
| The side turned down-left (S) | **0.72** of the top's brightness (0.51 in linear light) |

- The sun is **fixed to the camera**: a piece's four sides are the piece turned under the same sun (the crate's four sides are one picture; the sign post's shadow is the same on all four).
- Neither side we see is turned to the sun: both are lit by the sky only, the right one a little more. The top takes the sun.
- The desert pack has the same sun (its banner pole and one other prop throw the same shadows as the green pack's, 99 % the same pixels).

### How it was measured

Green pack, the S side of each piece. Direction: from the top of a tall thing to the tip of its shadow on the ground. Turn: degrees from straight behind the scene toward the east (+ = the sun more to the right).

| Piece | How | Height | Turn | Up |
|---|---|---|---|---|
| `Misc B52` sign post | post's cap to its shadow | 110 px | +2.6° | 76.2° |
| `Misc B45` banner pole | bar's end to its shadow | 130 px | +4.7° | 77.2° |
| `Misc B54` notice board | post's top to its shadow | 51 px | +2.3° | 73.1° |
| `Misc C7` stone pillar | capital's corners to their shadows | 85 px | −5.3° | 73.7° |
| `Misc B3` crate stack | whole shadow fitted (a box) | 74 px | 0.0° | 75.2° |
| `Misc E3` hay stack | whole shadow fitted (a box) | 88 px | −0.8° | 75.4° |
| **Average** | | | **+0.6°** | **75.1°** |
| **Spread** (standard deviation; lowest to highest) | | | **3.5°** (−5.3° to +4.7°) | **1.5°** (73.1° to 77.2°) |

- One pixel off at a shadow's tip moves the turn by 3° to 5°, so the turn's spread is the ruler's, not the sun's. The sun is so high that 5° of turn moves the light itself by 1.3°.
- Kept as round numbers the measure points at: **turn 0°, up 75°**.
- Low pieces (one crate, a barrel, one bale) were left out for the direction: their shadow is a few pixels long.

Brightness: the same material's top against its two sides (the average of a patch on each).

| Piece | Side down-right (E) | Side down-left (S) | Shadow's alpha |
|---|---|---|---|
| `Misc B3` crate stack | 0.82 | 0.73 | 182 |
| `Misc E3` hay stack | 0.84 | 0.74 | 183 |
| `Misc C7` stone pillar | 0.85 | 0.79 | 178 |
| `Misc B1` crate | 0.82 | 0.70 | (too small) |
| `Misc E1` hay bale | 0.89 | 0.66 | 192 |
| **Average** | **0.84** | **0.72** | **184** |
| **Spread** (lowest to highest) | 0.82 to 0.89 | 0.66 to 0.79 | 178 to 192 |

- The thin posts' shadows are paler (145 to 163): mostly soft edge.
- The houses' `LIGHT` already has the two sides this far apart: S 0.85 beside E 1; the pack: 0.72 beside 0.84 (0.86).

### Checked in Blender, 2026-11-21

- A matt block under the official sun: top its own colour, sides **0.86** and **0.74** of it (0.71 and 0.51 in linear light), shadow alpha 183.
- Three blocks the size and colour of the crate stack, the hay stack and the pillar, beside the pieces: `/mnt/project-files/characters/style/sun-check.png` (holds bought art, so not in the repo).
  - Shadow tips: within 1 to 2 px of the pack's (5 px on the hay, whose edge is ragged). 76 to 78 % of the shadow's pixels are the same; the pack's is the bigger one (soft edge).
- Run it again: `python3.11 scripts/art/blender_style.py --official scripts/art/out/blender-official.png`.

## The other suns: props and houses do not agree with it

Found while pulling the numbers together. **Nothing was changed**, so every picture stays as it was (Michael, 2026-11-21: "Don't change the props or houses yet").

| Who | Where the sun is | Its shadow on screen |
|---|---|---|
| The bought pack (**official**) | Behind the scene, 75° up | Down and to the left along the tile's edge, short |
| Props (`kit.mjs`) | **In front** of the scene, to the right, 53° up (`SUN`) | Up and to the left (about 53° above level), long |
| Houses (`buildings.mjs`, `round.mjs`) | Behind the scene, to the right, about 63° up (`LIGHT`: the side facing left 15 % darker, shadow pushed −0.35, +0.8 tiles a storey) | To the left and a little down: 24° off the pack's, and longer |

- **The props are the odd one out:** their sun is on the other side of the scene. The houses are close to the pack.
- **Corrected:** this page first said the pack's shadow falls "to the left and a little up". That was the sign's arm, not its post.
- **Open (Michael):** whether the props and the houses move to the official sun.

## The colours

- `RAMP` in `style.mjs`: 20 ramps, dark to pale. The last four are the goblin's (`docs/races/goblin.md`): `skin_teal` and `skin_teal_deep` (grey-teal skin, and the same with a darker shade end; which one stays is Michael's pick) and `eye_yellow` are new colours, not the tileset's (the tileset holds no grey-teal at skin lightness and no bright yellow); `bone` (fangs, claws) is three of the tileset's own stone colours. The props' 12 (rock, moss, grass, wood, iron, canvas, fire, lit, leather, boards, earth, straw), taken from the tileset or chosen to sit beside it, and the characters' 4 (cloth, skin, hair, hide; below).
- Four more goblin skins are in `RAMP` on trial since 2026-11-21 (`skin_lime`, `skin_jade`, `skin_own`, `skin_own_lifted`): the greens Michael asked to see. They go once he has picked the main skin; `skin_teal_deep` stays as a variant.
- A prop's pixel is snapped to the nearest of them (nearest in OKLab, `snapper`), with a hard edge: no half-see-through pixels.
- A ramp added later goes in `EXTRA`: a picture snaps to it only if it uses it, so older sprites never change.
- The houses are not snapped: they are the pack's own pieces, toned. `round.mjs` paints with its own colour tables, read from the desert pack.

### The characters' ramps: cloth, skin, hair, hide

Michael, 2026-11-21: ramps for cloth, skin, hair and leather, "built from the tileset's palette (no new colours outside it)". Every tone below is a colour the tileset's own pieces hold, to the digit (the 732 pictures in `game/client/art/tiles/` hold 38,063 colours). All four are in `EXTRA`.

| Ramp | Tones, dark to pale | Where the tileset has them |
|---|---|---|
| `cloth` (undyed linen) | `#4e4937` `#5c5641` `#6e634d` `#807960` `#8f886d` `#9e977c` | The boulders (`Stone A1`, `Stone A12`), a wall (`Wall A5`) |
| `skin` | `#9d6c3f` `#a77546` `#ac7a4a` `#b48250` `#c0905c` | `Misc B41`, `Tree E4`, `Ground A8` |
| `hair` (brown) | `#2b2013` `#3a2d1f` `#463426` `#544030` `#634b38` `#735943` `#876b53` | Roofs (`Roof E1`, `E6`), walls (`Wall B8`, `B11`), `Misc B43`, `B46` |
| `hide` (worn leather, dark wool) | `#201105` `#321c0b` `#38220c` `#412711` `#4d2f16` `#5f3c1d` `#67451e` `#765125` | The door (`Door A1`), `Roof E1`, the pots (`Misc A3`, `A4`), `Wall F10` |

- **The name `hide`:** `leather` was taken by the props' ramp, and that one is not the tileset's (2 of its 6 tones are in a tile at all). It is left alone, so no prop changes.
- **A character is finished part by part** (`finishParts` in `finish_sprite.mjs`, `--materials "material=ramp+ramp;..."`). Before, every pixel went to the nearest colour of any ramp, and a shirt came out part stone, part iron, part canvas.
  - The pixel's material comes from `character.py`'s `<base>.ids.png`. A material takes only the ramps named for it.
  - Where one material holds several things (the Peasant's shirt, trousers, boots, belt and buckle are one texture), the pixel's own unlit colour (`<base>.colour.png`) picks the ramp: by how strong the colour is for its lightness, smoothed over 3 by 3 pixels.
  - The lit colour then picks the tone: the nearest in lightness.
- **Skin's shade end is light** (`TONE_FROM.skin = [0.45, 0.66]` in `style.mjs`). The official sun is behind the scene, so a face is in the shade. A lit lightness (OKLab) of 0.45 takes the ramp's darkest tone, `#9d6c3f` (0.57), and 0.66 its palest. No light is added, in Blender or after.
- The Peasant: `MI_Peasant=cloth+hide+iron; MI_Regular_Male=skin; MI_Superhero_Male=skin; MI_Hair_1=hair; MI_Eyes=hair`. Of 2,099 pixels: hide 851, cloth 770, skin 249, hair 172, iron 57 (the buckle, the upper sleeves).
- **No older picture changed** (2026-11-21, `pixdiff.mjs`): with the four ramps added, props, camp, furniture, floors, shore and village drawn again are the same as the committed PNGs pixel for pixel (304 pictures), and so are the items (89) and the effects (3). The doorway keeps its own colour table, so it was not drawn again.
- Before and after, by House 1's door next to the pots: `/mnt/project-files/characters/peasant/peasant-colours.png` (holds bought art, so not in the repo).

### The metals: one ramp each, picked per item when drawn

Michael, 2026-11-23: "we'll have bronze, iron, steel, gold (and maybe silver, dark iron) ... chosen at runtime like skin and dye. Every metal zone (armour, blades, axe heads, shield rims and bosses, buckles) takes the item's material ramp." On trial: new colours, not the tileset's (except iron).

| Ramp | Tones, dark to pale | What it is |
|---|---|---|
| `iron` | `#262521` `#35332f` `#3d3d38` `#4d4d46` `#62625b` `#7c7c73` | Dark grey, the tileset's own (since the first props) |
| `bronze` | `#3b2410` `#5c3a17` `#7d5420` `#9d702c` `#bb8d3d` `#d8ae5c` | Warm brown-orange (the items' bronze, D218) |
| `steel` | `#353e49` `#4c5865` `#667381` `#8592a0` `#a7b3bf` `#cdd7e0` | Cool light grey (the items' steel, D218) |
| `gold` | `#59400f` `#7c5b14` `#a27a1c` `#c4992a` `#dfb743` `#f1d46e` | Yellow (the coins' colours) |
| `silver` | `#44484c` `#606468` `#7f8488` `#a1a5aa` `#c3c8cd` `#e4e8ed` | Paler and more neutral than steel ("maybe") |
| `dark_iron` | `#181a20` `#22242a` `#2b2e34` `#383a41` `#45474e` `#585b62` | Blue-black ("maybe"); its darkest stays off the outline's colour |

- **One table.** These are `RAMP` in `style.mjs`; `METAL` in `items.mjs` (the ground pictures and the held parts' swap, D225) reads them, so an item has the same colours on the ground, in the hand and on a layered character. The coins are `gold`.
- **Six tones each, the same tone numbers for every metal:** a metal part is finished once, in its base ramp (`iron` for the weapons, shields and buckles; `steel` for the mail), and drawn in any metal by swapping tone for tone.
- **Picked when drawn, per item.** A race's `channels` tie `iron` and `steel` to the channel `metal`, and its `colours.metal` lists the six. `paperdoll.mjs wear --colours "metal=bronze"` paints every metal part in bronze; `"over.metal=steel,main_hand.metal=gold"` gives the part in that slot its own (each pixel painted with the palette of the layer it came from). The Godot check (`paperdoll_check/doll.gdshader`) still holds one palette a character: a palette per layer there is still to build.
- **The gold sword, bronze sword and bronze axe** (3, 9, 10 of the weapons batch, rejected as models) come back as the plain sword in gold and in bronze and the axe in bronze (`"instead"` in `wardrobe.json`).
- **The mail's palest tone is kept for the surfaces lit most** (`TOP_TONE.steel` in `style.mjs`; Michael: "the near-white tone only on top-facing surfaces (shoulders, upper chest); the rest in the mid tones. No scattered white pixels"). The other five tones are spread over the lit range (`TONE_FROM.steel = [0.40, 0.66]`); a pixel takes the palest only where its lit lightness is at least 0.585 and so is that of 3 of its 8 neighbours. The lighter edge bands (`fit_armour.py --zones` Edge) stop a tone below.
- **Rigid plates show their top edges and rivets** (Michael, 2026-11-24: "stronger highlight on top-facing plate edges and 1–2 bright rivet pixels per plate, in both iron and dark iron"). Pieces made by `fit_rigid.py --detail ...;shine=1` have a `_Shine` zone, and only they get this (the mail and the scrap pauldron are unchanged, pixel for pixel): a pixel of the piece with nothing of the piece above it, or the piece above it more than `TOP_TONE.steel.rim` (60) depth steps farther away, takes the palest tone (a plate's upper rim, one pixel thick); `_Shine` faces lit at least `shineLit` (0.62) take it too; each rivet takes it however lit, with tone 1 on the pixel under it so it shows on a pale plate.
- **No older picture changed** (2026-11-23, `pixdiff.mjs`): props (56), items (89) and effects (3) drawn again are the same as the committed PNGs; the human idle layers of every approved part, finished again from their renders, are the same (17 parts, 255 pictures and their shadows); the animated pieces (`anim.mjs`, 160 pictures) too, but for the windmill's 8, which already differ from the committed PNGs with the scripts as they were before (`b96eebb`: drawn again there, the same as now). The metals are in `EXTRA` and appended to `RAMP`, so nothing snaps to them unless it names them.
- Swatches: `/mnt/project-files/characters/armour/metals-grid.png` (the mail shirt and the plain sword in each metal, human and goblin).

## The characters' outline

Michael, 2026-11-21, 8:30 PM: "Outline on all characters". 1 px of `#262521` outside the figure's edge, over its ground shadow. `OUTLINE` in `style.mjs`. It is drawn by the shader, never baked into a sprite: `docs/art-layered-characters.md`, "The outline". Props, houses and tiles have none.

## Shadows

- **Props:** the shadow is its own black sprite; the game draws it at 0.3 alpha. A ground point is in shadow when a walk from it toward the sun hits the prop (`sunShadow`, `groundInShadow`).
- **Characters:** the shadow is its own black sprite with a hard edge, and it **pales toward its tip, as the pots' does** (Michael, 2026-11-21: "Make the character shadow fade toward its tip like the pots' (190 → 120)"). `OFFICIAL_SUN.shadowFade = [190, 120]`.
  - Measured on the pots (`Misc A3`): black, alpha 190 at the pots, about 125 at the far edge, then nothing (no soft edge). The crate stack's shadow (`Misc B3`) also runs from 190 down to 120, most of it 180 to 190.
  - How: each shadow pixel pales by how high the part that shades it is. A walk from the ground point toward the sun, the first thing met, its height over the figure's own: 190 at the ground, 120 at the top of the head (`render_with_shadow(..., fade=, tall=)`). The Peasant's runs 190 at the feet to 123 at the tip.
  - The sprite carries the alpha itself, as the pack's baked shadows do: **the game draws it as it is**, not at one alpha for the whole sprite.
  - `character.py` writes the shadow it casts as `<base>.cast.png` (red holds each pixel's alpha); `finish_sprite.mjs` makes `<base>.shadow.png` from it.
- **Houses:** the footprint pushed along `LIGHT.shadow`, longer for a taller building, black at alpha 84 of 255 (`inRectShadow`, `rectShadowTile`; a ring for round homes, `inRoundShadow`).

## Animated characters: what the game expects, and the first two

2026-11-21. What the client draws today (`game/data/client.json`, `character`; D121, D205, D226, D227), from the Creator's sheets:

| | The game today (the Creator's sheets) | The Peasant's first frames |
|---|---|---|
| Sides | 8: E, SE, S, SW, W, NW, N, NE (screen sides; SE is one tile along +i) | **SE only** (asked: one direction) |
| Frames an animation | 15 | 15 |
| Sheet | 1920 x 1024: 15 frames across, a row a side, 128 px frames, the feet at 66, 86 | 15 loose pictures, 256 px, the feet at 128, 208. **Not packed into a sheet yet** |
| Size on screen | drawn 2.5 times bigger | drawn as it is (1 time) |
| Shadow | its own part, drawn at alpha 0.35 | its own sprite, with its own alpha (190 to 120) |
| Idle's rate | 8 frames a second | 8 (the library's loop is 2.5 s; 15 frames at 8 a second is 1.9 s) |
| Walk's rate | set by the ground speed so the foot stays put: one rate on every side (D227) | see below |

- **From:** the Universal Animation Library (Quaternius, CC0), `Unreal-Godot/UAL1_Standard.glb`: `Idle_Loop` (60 frames at 24 a second) and `Walk_Loop` (32 frames). The same 65 bones as the base, the outfit and the hair, so the action is given to all three skeletons as it is (`character.py --anim <file> --action Walk_Loop --frames 15 --turn 45`). No mesh changed. The head keeps its 1.15.
- **The walk's own stride:** the library's root-motion file moves the figure 1.3 of its units a loop at an even speed. At the Peasant's size that is **0.847 tiles a loop**, 4.04 px a frame along the tile's edge.
- **Feet sliding:** with the figure moved that far each frame, the foot on the ground moves **1 to 2 px on the screen while it is down** (worst 2.2 px; a step is 30 px). Up to 0.7 px of that is the figure being drawn on whole pixels; the rest is in the library's walk (the planted foot goes back about 4 % faster than the body goes forward).
- **The speeds do not fit yet.** At its own pace the walk covers a tile in 1.57 s. The game walks a tile in 0.60 s (D226) and runs one in 0.30 s. For the foot to stay put at 0.60 s a tile, `Walk_Loop` has to play at 29.5 frames a second: legs 2.6 times faster than the library made them. The library's `Jog_Fwd_Loop` covers 3.43 tiles a second at its own pace, beside the run's 3.33. Not decided.
- **The idle is `idle_alert`** (Michael, 2026-11-21: "Keep the current idle, but rename it idle_alert"). The library has no calmer one: its six idles (`Idle`, `Idle_Talking`, `Idle_Torch`, `Sword_Idle`, `Pistol_Idle`, `Spell_Simple_Idle`) share one wide, staggered ready stance, leaning forward, fists closed.
- **`idle_relaxed`, three options shown, none chosen yet.** Each is a library idle with changes laid over it in `character.py`, no mesh and no animation file changed:
  - open fingers with a slight curl in place of the fists (`--curl`, the finger bones; the palm's side is worked out from the skeleton);
  - both feet set flat under the hips in a narrower stance, the legs bent to reach them (`--stand "width=0.22,stagger=0.04,out=8"`; 0.18 between the ankles is the model at rest, the library's idle has 0.36);
  - chest up 12° and head up 3° (`--add "spine_03=-12,0,0;Head=-3,0,0"`), hips 0.03 higher (`--shift`), arms hanging 80° down (`--rest`).
  - A: feet close, arms down. B: weight on one leg (wider, one foot turned out 24°, one elbow more bent). C: the same as A over `Idle_Talking_Loop`, whose body moves more.
- **The walk with relaxed hands** is the same walk with `--curl` only; legs, feet and stride unchanged.
- Pictures (hold bought art, so not in the repo): `/mnt/project-files/characters/peasant/anim/` (`frames-4x.png`, `idle_alert-*.gif`, `walk-*.gif` at the walk's own pace, `walk-game-speed-*.gif` at 0.62 s a tile, `idles-*` the four idles side by side, `walks-*` the two walks). Made by `/mnt/project-files/characters/render3d/house1scene.mjs`, `walkpast.py` and `grids.py`.

## Where characters are rendered, and what is kept

Michael, 2026-11-21, 6:28 PM: **"Rendering stays here in the cloud, CPU, 256 samples, for every character, so all sprites
come from the same kind of machine."**

- **Machine:** a cloud session (x86 processors, no graphics card), Blender 4.2.0 as the `bpy` module
  (`scripts/art/setup_blender.sh`), Cycles on the processor.
- **Samples:** 256 (`character.py --samples 256`), for every part of every character.
- **Why one kind of machine:** a graphics card's picture is not the same to the last pixel as a processor's, and neither
  is one made with another number of samples: a few pixels in a hundred come out one tone off (measured:
  `docs/art-layered-characters.md`, "Render time"). Two characters rendered differently would not match where they share
  a part.
- **Not on a PC, not on a Mac, not with fewer samples to save time.** A race takes about 3 hours this way (`--quick`).

Michael, the same message: **"Keep the raw renders (before finishing) so the look can be changed later without re-rendering."**

- **Raw renders** = what `character.py` writes for each part and frame, before `finish_sprite.mjs` or `paperdoll.mjs`
  touches it: `.things.png` (the light), `.cast.png` (the shadow), `.colour.png`, `.ids.png` with `.ids.json` (the
  materials), `.depth.png` (how far), and the loop's `.anim.json`. They are made from model files, so they are never in
  the repo: they go to `/mnt/project-files/characters/` beside the character (the prototype's: `layers/renders.tar`).
- **Size:** about 95 KB per part and frame as Blender writes them, so about 3.6 GB for a race of 40 parts, 8 animations
  and 8 directions. Packed again without loss they would be smaller; not done.
- **What they let change later, with no new render:** everything the finishing does. Which ramp a material takes, where
  one tone ends and the next begins, the hard edge, any smoothing, the shadow's darkness and how it pales.
- **What they do not:** anything Blender did. The light and the sun, the size (96 px), the pose, the number of samples,
  and **whether a pixel is one point of the surface (`--point`, which layers need) or an average over the pixel** (the
  approved Peasant's softer look). Going back to the average means rendering again.

## The proof that moving the numbers changed no picture

2026-11-21. Everything was drawn again with the changed scripts and compared pixel by pixel (the decoded pixels, `node scripts/art/pixdiff.mjs <new> <old>`).

| What was drawn again | Compared with | Pictures | Result |
|---|---|---|---|
| Props, camp, furniture, floors, shore, village, the doorway (`kit.mjs`, `doorway.mjs`) | The committed PNGs in `game/client/art/made/` | 312 | **All the same** |
| Items (`items.mjs`) | The committed PNGs in `made/items/` | 89 | **All the same** |
| Effects (`effects.mjs`) | The committed PNGs in `made/effects/` | 3 | **All the same** |
| Oldscar's fences and banners (`oldscar.mjs`) | The committed PNGs (written in place) | 40 | **All the same** (git sees no change) |
| Every building draft, square and round, and the 4 sheets (`buildings.mjs`, `round.mjs`) | The same drafts drawn just before the change (they hold bought art, so none is committed) | 28 | **All the same** |
| Ground edges, sand against grass (`ground_edge.mjs`) | The same, drawn with the scripts before the change | 57 | **All the same** |
| The animated pieces (`anim.mjs`) | The same, drawn with the scripts before the change | 128 | **All the same** |
| The scene page (`scene.mjs`, 32 MB) | The page built with the scripts before the change | 1 | **Byte for byte the same** |

- Drawing takes as long as before (a prop: 1.4 to 6.6 s for 4 sides).
- **Found on the way:** the committed water wheel PNGs (`Water Wheel A1`, `Foam`, `Under`, `Shadow`) were older than their script. Drawn again 2026-11-21, so they match it.
