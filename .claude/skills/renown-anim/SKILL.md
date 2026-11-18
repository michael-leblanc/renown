---
name: renown-anim
description: Make an animated piece for Renown with scripts/art/anim.mjs (fire, water, an effect on a character, something that opens, turns or flaps, weather, the night light), and try pieces together in a place with the scene page (scripts/art/scene.mjs). Use when asked to animate something, make an effect or weather, or show how a place or a set of pieces looks. A still prop is renown-prop.
---

# Animated pieces, and trying a place

An animated piece is **code-made art that moves**: a loop of frames written as maths in `scripts/art/anim.mjs`, drawn by the kit into one strip of pictures per side. The **scene page** (`scripts/art/scene.mjs`) puts every piece on a 14 by 14 patch of land with characters, night and weather, so a place can be tried on a phone.

## Before you start
- **A piece that stands in the world is a prop that moves.** Read `.claude/skills/renown-prop/SKILL.md` first: the space, `sdf`, `hit`, `bound`, materials and ready parts are the same here. This skill only adds time.
- Read `docs/art-experiments.md` ("Animated and more camp and shore things"): what exists and Michael's verdicts. He sent back lights that were "just circles", weather that only lay over the screen, mills "too small" and water that was too regular.
- **Look up how the real thing moves first** (how 2D games light a night, how big a real mill is) and write what you found in a comment above the piece, as `anim.mjs` does. Michael asked for realism each time.
- **Not characters** (D121). Effects for a character are sized to a human's chest (`CHEST_Y`); on an orc or a goblin they are not checked.
- The tileset may already have it (`docs/art-check.md`: boats, a well, a notice board). Its `.anim` files are Unity-only.
- Agree the piece first, and show a rough draft before detail, as for a prop.

## The kinds (one entry in `ANIMS` each)
| Kind | Written as | What the scene page does with it |
|---|---|---|
| A prop that moves (pennant, stall, mill) | `at: t => prop`, `shadow: '<Name with Shadow>'`, 4 sides | Animated tab |
| Fire | the body, then `flame(x, y, z, bx, by, bz, h, w, t, seed, d, n)` on top; `cast: body` (flames throw no shadow), `noMoss`, `glow` for stone it lights | Animated tab; gives light at night only if its name matches `LIT` (Lit, Torch, Brazier, Lantern, Cooking, Candle, Hearth, Forge) |
| Played once (chest, door) | `loop: false`, `ease(t * F / (F - 1))` so the last of F frames is fully open | the last frame is held, replayed after a pause |
| Ground tile (water) | `tile: (t, side) => rgba`: 256 x 256 drawn in 2D inside the diamond (rows 176 to 240, columns 64 to 192) | Ground tab; a name with `Water` is water to the page |
| Effect (smoke, block flash, bandage) | `effect: true, sides: ['S'], tile: t => ...` with `canvas2d()`; on a character, centred on `CHEST_Y` | Effects tab, laid on a tile |
| Weather | `overlay: true`, a whole square that repeats (`size: 512` if 256 is too small) | named by its first word (Rain, Fog, Leaves) or Splash; a new kind needs code in the page |
| Open water's surface | `overlay: true, surface: true` | `Water Base`, `Water Glints` |
| The night light | `light: true`, one frame | the falloff round every lit piece |
| Bigger than 256 px | `canvas: [w, h, ax, ay]` (the tile's middle at ax, ay) | read from `anim.json` |
| A part drawn on its own | `under: '<piece>'` (below the water), `foamOf: '<piece>'` with `post` (a mask) | see the water wheel |

## A loop with no jump
- Frame f is drawn at `t = f / frames`: from 0 up to, never at, 1. Whatever moves must come back: `Math.sin(TAU * k * t)` with a whole k.
- **A turning thing turns one repeat of its own shape per loop**: the water wheel an eighth of a turn (8 spokes), the windmill a quarter (4 sails).
- **A tile joins its neighbours**: every wave a whole number of times across the tile, as well as over the loop.
- Frames and speed so far: fire 8 at 10 a second, water 8 at 6, played once 5 to 6 at 12 to 15, the wheel 32 (the page blends frames). More frames, slower to draw.
- Anything random: `h3(k, n, seed)`, never `Math.random`. The same command draws the same picture.
- Pixel art: 3D pieces snap to the kit's tones; 2D ones pick from a few fixed colours (`hexc`) and fade in hard steps (`step`, `dither`), never smooth alpha.

## The loop: draw, look, fix
1. **Draft** (seconds; writes no sprite):
   ```
   node scripts/art/anim.mjs "Brazier A1" --draft
   ```
   Look at `prototype/shots/anim-draft.png` with Read: every frame of the first side in a row on grass, with the shadow. `--views E` for another side; names joined with commas for several of one picture size. **The last frame must lead into the first.**
2. **In a place** (about 20 s): write a place file (below) with the piece, a human beside it for size, then
   ```
   node scripts/art/scene.mjs --place place.json --on Near --shot
   ```
   Look at `prototype/shots/scene.png`. `--on Night`, `--on Rain,Wet` (everything already wet), `--scale 2` for detail. Rain takes about 45 s.
3. **Fix and repeat.** After about 4 rounds, show Michael. A still can't show motion: send him `prototype/shots/scene.html` to open on his phone (built with the same `--place`, so it opens on the piece).
4. **Write the sprites:** the same `anim.mjs` command without `--draft`. Only the names given are drawn; `anim.json` keeps the others. All of them takes about 10 minutes.

## A place file
JSON, every key optional. Tiles are `i, j` from 0 to 13: 0,0 is the top corner, i runs down to the right, j down to the left.
```json
{ "from": "blank",
  "ground": [["Ground A1", 4, 4, 9, 9], ["Water A1", 11, 0, 13, 13]],
  "put": [["Forge A1", 6, 6], ["Tent A1", 3, 6, 1]],
  "fx": [["Smoke A1", 4, 9]],
  "chars": [["human", 7, 6, 2], ["orc", 5, 5, 1]] }
```
- `from`: `"start"` is the page's own starting place (the shore, the mill, the camp); `"blank"` plain grass.
- `ground`: a piece over a block of tiles, then a side 0 to 3 (S, E, N, W) for shore tiles. `erase`: `[[i, j]]` clears a tile. `put`: a piece, then its side. `fx`: an effect. `chars`: a race, then a facing 0 to 7 (E, SE, S, SW, W, NW, N, NE).
- A wrong name stops the script and lists the right ones. `--on` presses the page's buttons by their text: Night, Rain, Fog, Leaves, Grid, Near, All, Current (each press: calm, steady, strong).

## What the page does by itself
- It lists every 4-sided sprite in `prototype/art/made/`, every item, and everything in `anim.json`: a new piece appears with no change to the page.
- **The page goes by names.** `LIT` gives light at night. `LAND` (Tent, Stall, Table, Crate, Jetty...) catches rain and drips. A tree's leaves fall from `Tree...`. A new piece that should do one of these needs its name in the list in `scene.mjs`.
- Night, wetness, puddles, rain that lands, reflections, the shore, the current and the wheel's spray live in the page, not in the sprites. In Godot they become shaders and particles (`docs/art-experiments.md`); none is built there yet.
- **It holds bought art** (the tileset, the Creator): never commit it. It is about 5 MB.

## Finishing
- Draw one older piece again (`node scripts/art/anim.mjs "Brazier A1"`; the campfire takes about 100 s): `git status` should show no changed PNG but yours. Its entry in `anim.json` may gain fields an older run did not write; that changes nothing.
- Import in Godot so it writes the `.import` files (`scripts/godot.sh --headless --path prototype --import`), and commit them with the PNGs, `anim.json` and the script.
- List the piece in the `anim.mjs` line of `scripts/README.md`, and in `docs/art-experiments.md` with what was checked and what was not.
- CLI-005 (#37) moves `prototype/art/made/anim/` to `game/client/art/made/`: after it merges, the paths here change.

## Files
- `scripts/art/anim.mjs`: every animated piece, family by family, and its command line (`main`). Shared helpers in it: `flame`, `torchHead`, `canvas2d`, `step`, `dither`, `hexc`, `WATER`, `FOAM`.
- `scripts/art/scene.mjs`: the page; the place file format is in a comment near the end of the Node part.
- `scripts/art/camp.mjs` (`campfireAt(t)`, `fireAt`), `props.mjs` (`chest(open)`), `furniture.mjs` (`table`): props that `anim.mjs` animates.
