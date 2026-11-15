# Art experiments: Renown

Updated: 2026-11-15. Same text as the project doc `claude/art-experiments.md`.

## Where it stands
- **PR #17 is open** (`art/code-made-props`): the doorway, the standing stones and the chest as sprites in `prototype/art/made/`, the scripts that draw them in `scripts/art/`, a showcase scene `prototype/props/props.tscn`, and (second commit) the art kit and the skill `renown-prop`. Not merged. Michael has not yet seen it in Godot.
- **Next:** Michael runs the showcase scene and gives a verdict on the stones and the chest. Putting the props in the seeded test patch (blocking, pathfinding, a character beside them) needs its own task.
- No D-number changed.

## Michael's verdicts (2026-11-15)
- **Live gaussian splats: no.** "It looks good, but I wouldn't use that for the game."
- **Code-made scenery sprite (the stone doorway): yes.** "It looks super good", then "The arch is really good".
- **Doorway version 2 (research improvements): no real gain.** "I don't see much difference." Version 1 stays the doorway.
- **Code-made characters: no.** "The characters aren't really good. Animation looks a bit weird and lower quality than what we already had."
- **Code-made still for the lore (the door at dawn): fine.** "The background is fine."
- **Standing stones and chest: verdict open.** He asked for them in a pull request.
- Gotchas from this: don't propose live splats as Renown's renderer, and don't propose code-made characters. Characters stay the Creator (D121). Code-made art is for scenery, props and stills. Don't spend time polishing a sprite pixel by pixel: it doesn't show at game size.

## The method
Ray marching over signed distance functions. The object is maths shapes in a Node script; the script draws it straight to PNG and snaps every pixel to a small palette taken from the tileset. No image model, no 3D program, no splats, no package.

## What exists
All sprites are in the tileset's format, so the test game's `_piece` code takes them unchanged: 256 x 256 PNG, hard edges, tile middle at 128,208, 128 x 64 tiles, height 78.4 px a unit, 4 rotations `_S/_E/_N/_W`, and a separate black ground shadow per rotation.

### In PR #17
- **Doorway (D108, liked):** `Doorway A1_S` and so on, `Doorway Shadow_S` and so on. Plain old stone, no carvings (D68). About 2 tiles long by 1 deep; the opening is 125 px tall, so a Creator character at 2.5 scale (108 px) passes. `scripts/art/doorway.mjs`, about 22 seconds a rotation.
- **Standing stones (D71), 3 kinds:** `Standing Stone A1` (tall, about 150 px), `A2` (leaning, about 115 px), `A3` (broken stump with two fallen pieces); shadows `Standing Stone Shadow A1_S` and so on. One tile each. Stone cut in flat faces like the tileset's boulders, rain streaks, moss on the side away from the sun, grass at the foot. No carvings (D68). Eight of them on the cells (±2,±1) and (±1,±2) round a middle make a ring a character can stand in.
- **Chest (D54, D142):** `Chest A1` (closed) and `Chest A1 Open` (lid back, empty inside); shadows `Chest Shadow A1_S` and `Chest Shadow A1 Open_S` and so on. Wood with two iron bands, a lock plate and ring handles. About 62 px wide, 30 px tall. `scripts/art/props.mjs` draws the stones and chests, under 2 seconds a sprite.
- Colours: wall stone, moss and grass from the tileset's walls and ground; the standing stones from its boulders; wood from its door (two paler wood tones added); iron greys.
- **Checked:** the scripts' PNGs are pixel-identical to the ones Michael saw in chat; Godot 4.7.2 imports them; `props.tscn --shot` on a virtual display exits 0 with no error, and the picture was looked at; `world.tscn --shot` still exits 0. **Not checked:** a real screen, the click on a chest, anything in the seeded world.
- Claude's read: the chest is the stronger of the two; the stones are a little smooth. The kit's check corrected an earlier guess: the tall stone is as bright as the tileset's boulder (102 against 103) but flatter (spread 25 against 35), so it wants more contrast, not darker stone.

### Only in the chat of 2026-11-15 (zips), not in the repo
- **Doorway version 2** (`doorway-sprites-v2.zip`, `render2.mjs`): true stone edges, cut edges on the dressed stone, edge highlights, colour snap in OKLab. Adds little.
- **Stills**, 640 x 360 drawn, delivered at 1920 x 1080. One rule in all the god pictures: the place is drawn solid, and what people tell is drawn see-through or left out, so the game confirms nothing (D68).
  - **The door at dawn (fine):** the lone doorway on Dawndoor's east shore, the sun rising over the Long Water through the arch. Nobody in it (D76, D77, D137).
  - **Gorrath as orcs see him (verdict open):** Oldscar at dusk under its cracked cliff, and behind it a huge orc's head and shoulders in the haze (D119, D114). Claude's design choice: the long scar on his face follows the line of the cliff's crack (D107).
  - **Halvar's door as humans tell it (verdict open):** no figure (D119). The doorway before dawn, found open, warm light behind it, many small lights through the arch for what he keeps (Claude's reading of D120).
  - **Skerra as goblins tell it (verdict open):** she is not in the picture (D119). From a goblin's eye height at night: a chest against a mossy rock (D54, D76), tiny footprints leading away, a small light going off through the grass.
  - Not made: the One Hand.
- **Character sheets (rejected):** a human in the Creator's format. Not to be taken further.

## The kit and the skill (built 2026-11-15, in PR #17; Michael asked for them)
- **Kit, `scripts/art/kit.mjs`:** shapes, ready parts (cut stone, boards, grass; moss, rain streaks and edge highlights come with rock), the tileset's colours, camera, light and one command line for every prop script. `props.mjs` now holds only the props' shapes; its 40 PNGs came out byte-identical after the change.
- **Draft loop:** `node scripts/art/props.mjs "<name>" --draft --beside "<tileset piece>"` writes no sprite. It saves one picture to look at (`prototype/shots/art-draft.png`: 4 sides on grass with shadows, the tileset piece at the end) and prints both pictures' brightness and spread.
- **Skill, `.claude/skills/renown-prop/SKILL.md`:** the format, the space a prop is written in, a whole crate as the example, the draw-look-fix loop, the Godot check, and the rules (no characters, no carvings, rough draft first).
- **Tried:** a crate written with the kit is 15 lines and draws its 4 sides in about 1 second. It is the skill's example only; no crate sprite is in the repo.
- `scripts/art/colours.mjs` lists a tileset piece's colours for a new material.
- **Not done:** the doorway still uses its own older script (about 22 seconds a side), kept as it is so the liked sprites don't change. Masonry is not a ready part of the kit yet.

## Further proposals (Claude's, none agreed)
- Run prop making in Claude Code on Michael's computer, so a draft is looked at in Godot on a real screen.
- Variants from one seed number: many stones, rocks and ruins for the cost of one.
- A reference picture or a named tileset piece before modelling, and Michael's verdict on a rough draft before the detail (the skill asks for this).
- **Limits that stay:** organic and living things (trees, animals, characters) come out stiff this way. For those, the bought packs or an image model are the better route.

## Other ways a text model can make 2D art (looked up online, 2026-11-15)
None tried for Renown except the first.
- **The model writes code that draws:** ray marching over maths shapes (used here); scripting Blender through a connector and rendering sprites with an orthographic camera; drawing pixel by pixel in Aseprite through a connector; a palette plus a grid of colour numbers as text (tiny images only); vector code (SVG).
- **The model directs a tool that draws:** PixelLab's connector (seamless terrain tilesets, isometric tiles, map objects matched to a style; paid); an image model through ComfyUI's connector, free on one's own machine (ComfyUI folders exist on Michael's Mac). Image-model output is a picture of pixel art, so it still needs a locked palette and a clean downscale.

## Open
- Michael's verdict on the standing stones and the chest, and on PR #17.
- Michael's verdict on the Gorrath, Halvar and Skerra stills.
- Whether the kit and the skill are worth keeping, once Michael has made or asked for a prop with them.
- Whether to test another technique (image model through ComfyUI).
- More props that could be made the same way: notice board (D130; whether it is in the slice is still open), shop sign or stall, campfire and tents for camps (D54, after the slice), fences, crates and barrels, a doorstone grave (D104, only said in the slice), item icons (D133), dungeon and interior tiles, a backdrop for the death screen (D148).
