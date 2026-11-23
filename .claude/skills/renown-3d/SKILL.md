---
name: renown-3d
description: Turn a 3D model (glb, gltf, fbx, obj; free, bought or AI-generated) into Renown sprites in the tileset's format with scripts/art/bake3d.mjs. Use when asked to bake, render or use a 3D model as a prop or scenery sprite. Code-made props are renown-prop; characters are not baked yet.
---

# Baking a 3D model for Renown

`scripts/art/bake3d.mjs` renders a 3D model through Blender and turns it into the same sprites the kit makes: 256 x 256, tile middle at 128,208, 4 sides `_S/_E/_N/_W`, a black ground shadow per side, the kit's colours. Read `.claude/skills/renown-prop/SKILL.md` first: the format, the size rules, the draft loop and Michael's verdict before detail all apply here.

## Before you start
- **Props and scenery only for now.** Characters (8 directions, animation frames, gear in layers) are not baked yet, and D121 still makes them from the Creator.
- **Agree the prop first**, as for a code-made one: what it is, its size beside a human, which tileset piece it sits next to.
- **Licence:** write it in `models.json`. CC0 is free to use. A free AI tier (Meshy, Tripo) is CC BY 4.0 at best: credit it. No paid-pack model file is ever committed.

## Adding a model
1. Put the file in `art-source/models/` (git-ignored). If it can be downloaded, give its `url` instead: it is fetched the first time.
2. Add it to `scripts/art/models.json`:
   ```json
   "Street Lantern A1": { "model": "art-source/models/Lantern.glb", "url": "https://…", "source": "who made it", "licence": "CC0-1.0", "height": 1.9 }
   ```
   - `height` in units (a tile is 1 x 1, a human 1.4); without it, `scale` (default 1.4 / 1.8: a model in metres, a 1.8 m person = 1.4).
   - `yaw` turns it before the 4 sides; `origin: "model"` keeps the model's own middle on the tile (default: the middle of its footprint).
   - `palette`: the kit's ramps it may use (default rock, moss, grass, wood, iron; add `canvas`, `leather`, `straw` and so on by name, or `"all"`). Each pixel takes the ramp nearest its colour in hue, then the one most of its neighbours took.
   - `tone` (-1 darker, +1 paler), `detail` (how much the model's own light and dark shows, default 0.5).
3. Draft, look, fix (the same loop as renown-prop):
   ```
   node scripts/art/bake3d.mjs "Street Lantern A1" --draft --beside "Misc B52_S" --with-character
   ```
   It prints the model's size in units and warns when it is too tall (over 2.6) or too long for the picture.
4. Write the sprites: the same command without `--draft`. Then import in Godot and commit the PNGs and `.import` files (renown-prop, Finishing).

## What it does
- `scripts/art/bake3d/blender.py` (run by `bake3d.mjs`, never by hand) renders the passes with Cycles: plain colour, the sun's light with shadows, ambient occlusion, normals, depth, and a white ground with the model hidden for the shadow. Camera, sun and sides come from `kit.mjs` (`VIEW`, `SUN`, `PPU`, `AX`, `AY`), so a baked model lines up with the code-made props (checked: same outline to the pixel on all 4 sides).
- `bake3d.mjs` reads the EXR files (`scripts/art/exr.mjs`), lights each pixel the kit's way, picks the ramp and tone, adds the kit's top-edge light, drops stray pixels, and hands the result to the kit's `run()`.
- Same machine, same Blender: a rerun is byte-identical. Another Blender version may move a few pixels: say which one wrote the sprites.

## Gotchas
- A model with lighting painted into its texture still works: only its colour's hue picks the ramp, and the light is the kit's.
- A colourful model (a red banner) has no ramp to go to: the kit has no red. Add a ramp to `RAMP` in `kit.mjs` (renown-prop, "A new material") and name it in `palette`.
- Thin parts (chains, ropes) under a pixel wide vanish or break up. That is the game's size, not a bug.
