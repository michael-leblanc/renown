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
- Other races and builds are sized from this one (a goblin shorter, an orc taller): not decided yet.
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

- `RAMP` in `style.mjs`: 16 ramps, dark to pale. The props' 12 (rock, moss, grass, wood, iron, canvas, fire, lit, leather, boards, earth, straw), taken from the tileset or chosen to sit beside it, and the characters' 4 (cloth, skin, hair, hide; below).
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
- Before and after, by House 1's door next to the pots: `/mnt/project-files/characters/peasant/peasant-colours.png` (holds bought art, so not in the repo).

## Shadows

- **Props:** the shadow is its own black sprite; the game draws it at 0.3 alpha. A ground point is in shadow when a walk from it toward the sun hits the prop (`sunShadow`, `groundInShadow`).
- **Characters:** the shadow is its own black sprite with a hard edge, drawn at the pack's measured alpha, 184 of 255 (Michael, 2026-11-21: "match the pack's measured shadow (alpha 184), same as the pots"). The pots' own shadow (`Misc A3`) is black with a hard edge too, 190 at the pots and paling to 120 at its far end; the character's is 184 all over.
- **Houses:** the footprint pushed along `LIGHT.shadow`, longer for a taller building, black at alpha 84 of 255 (`inRectShadow`, `rectShadowTile`; a ring for round homes, `inRoundShadow`).

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
