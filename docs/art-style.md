# Art style: the shared camera, light, colours and shadows

Written 2026-11-21. The numbers every code-made picture shares, in one file: `scripts/art/style.mjs`.
`kit.mjs` (props), `round.mjs` (round homes) and `buildings.mjs` (houses) take them from there. Blender will too, for the characters.

- Print them: `node scripts/art/style.mjs` (as JSON: `--json`).
- **Not decided here:** nothing below is a decision (D##). The numbers are the ones the scripts were already written with.

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
- A character standing on a tile is about 1.4 units tall in the props' space (the Creator's human at game size).

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
| Engine | Cycles on the processor (EEVEE crashes in the cloud: no graphics card) |

- `scripts/art/blender_style.py` sets all of this from `style.mjs` (`setup(scene, width, height, middle)`), so the two cannot drift apart.
- **Checked, 2026-11-21:** the same block (0.8 × 0.6 × 0.5 tiles) drawn by the kit and rendered by Blender 4.2.0 with these numbers covers the same pixels: same left, top, right and bottom edge to the pixel, 5,580 px in both, 7 px only in the kit's (99.87 % the same). Its ground shadow ends on the same pixels on the right and at the bottom; the kit's runs 2 px further at the tip.
  - Run it again: `python3.11 scripts/art/blender_style.py --check scripts/art/out/blender-check.png`, then `node scripts/art/style.mjs --match scripts/art/out/blender-check.png`.
- Blender in a cloud session: `scripts/art/setup_blender.sh` (Blender 4.2.0 as a Python module; there is no `blender` program, so a script runs as `python3.11 script.py`).

## The light: three suns, and they do not agree

Found while pulling the numbers together. **Nothing was changed**, so every picture stays as it was.

| Who | Where the sun is | Its shadow on screen |
|---|---|---|
| Props (`kit.mjs`) | In front of the scene, to the right, 53° up (`SUN`) | Up and to the left (about 53° above level) |
| Houses (`buildings.mjs`, `round.mjs`) | Behind the scene, to the right (`LIGHT`: the side facing left 15 % darker, shadow pushed −0.35, +0.8 tiles a storey) | To the left and a little down (about 11° below level) |
| The bought pack's own props | Between the two | To the left and a little up (about 14° above level; measured on one sign post, `Misc B52_S`, so rough) |

- All three have the light **from the right**. They differ in front or behind.
- **Open:** which sun the Blender characters take, and whether the props and the houses should later be brought to one sun. A character's own shadow is short, so the difference shows less on it than on a house.

## The colours

- `RAMP` in `style.mjs`: 12 ramps, dark to pale (rock, moss, grass, wood, iron, canvas, fire, lit, leather, boards, earth, straw), taken from the tileset.
- A prop's pixel is snapped to the nearest of them (nearest in OKLab, `snapper`), with a hard edge: no half-see-through pixels.
- A ramp added later goes in `EXTRA`: a picture snaps to it only if it uses it, so older sprites never change.
- The houses are not snapped: they are the pack's own pieces, toned. `round.mjs` paints with its own colour tables, read from the desert pack.

## Shadows

- **Props:** the shadow is its own black sprite; the game draws it at 0.3 alpha. A ground point is in shadow when a walk from it toward the sun hits the prop (`sunShadow`, `groundInShadow`).
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
| The scene page (`scene.mjs`, 32 MB) | The page built with the scripts before the change | 1 | **Byte for byte the same** |

- Drawing takes as long as before (a prop: 1.4 to 6.6 s for 4 sides).
