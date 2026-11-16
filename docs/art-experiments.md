# Art experiments: Renown

Updated: 2026-11-15. Same text as the project doc `claude/art-experiments.md`.

## Where it stands
- **PR #17 is merged** (squash, `0e4db9c`, 2026-11-15): the doorway, the standing stones, the chest, the crate and the barrel as sprites in `prototype/art/made/` (64 PNGs: 32 sprites, 32 shadows), the scripts that draw them in `scripts/art/`, the art kit, the skill `renown-prop`, and a showcase scene `prototype/props/props.tscn`.
- **Michael ran the showcase scene on his Mac and said yes to all of it.** He could not zoom at first: a Mac trackpad sends pinch and scroll gestures and the scene only read the mouse wheel. Fixed (pinch, two-finger scroll, + and - keys); Michael: "yes it works". `world/world.gd` and `play/play.gd` still zoom with the wheel only.
- **What is kept and what is throwaway:** the scripts, the kit and the skill are kept. The sprites and the showcase scene sit in `prototype/`, which NET-005 deletes (D201); the sprites redraw byte-identical at any time. **The plan covers this since 2026-11-15:** task CLI-005 moves `prototype/art/made/` to `game/client/art/made/` and repoints the kit, the scripts and the skill, before NET-005 runs (Michael: "yes"). The showcase scene goes with `prototype/`; a new one in the client is its own task, not planned.
- **Next for the art:** putting the props in the seeded world (blocking, pathfinding, a character beside them) needs its own task.
- No D-number changed.

## Michael's verdicts (2026-11-15)
- **Live gaussian splats: no.** "It looks good, but I wouldn't use that for the game."
- **Code-made scenery sprite (the stone doorway): yes.** "It looks super good", then "The arch is really good".
- **Doorway version 2 (research improvements): no real gain.** "I don't see much difference." Version 1 stays the doorway.
- **Code-made characters: no.** "The characters aren't really good. Animation looks a bit weird and lower quality than what we already had."
- **Code-made still for the lore (the door at dawn): fine.** "The background is fine."
- **Standing stones and chest: yes.** Asked whether "it's good" covered them too, so PR #17 can be merged: "looks good".
- **Crate and barrel: yes.** Rough draft, asked whether the sizes and shapes were right beside a human and the chest: "Yes". Then, after running the showcase scene on his Mac: "it's good".
- Gotchas from this: don't propose live splats as Renown's renderer, and don't propose code-made characters. Characters stay the Creator (D121). Code-made art is for scenery, props and stills. Don't spend time polishing a sprite pixel by pixel: it doesn't show at game size.

## The method
Ray marching over signed distance functions. The object is maths shapes in a Node script; the script draws it straight to PNG and snaps every pixel to a small palette taken from the tileset. No image model, no 3D program, no splats, no package.

## What exists
All sprites are in the tileset's format, so the test game's `_piece` code takes them unchanged: 256 x 256 PNG, hard edges, tile middle at 128,208, 128 x 64 tiles, height 78.4 px a unit, 4 rotations `_S/_E/_N/_W`, and a separate black ground shadow per rotation.

### In the repo (PR #17, merged)
- **Doorway (D108, liked):** `Doorway A1_S` and so on, `Doorway Shadow_S` and so on. Plain old stone, no carvings (D68). About 2 tiles long by 1 deep; the opening is 125 px tall, so a Creator character at 2.5 scale (108 px) passes. `scripts/art/doorway.mjs`, about 22 seconds a rotation.
- **Standing stones (D71), 3 kinds:** `Standing Stone A1` (tall, about 150 px), `A2` (leaning, about 115 px), `A3` (broken stump with two fallen pieces); shadows `Standing Stone Shadow A1_S` and so on. One tile each. Stone cut in flat faces like the tileset's boulders, rain streaks, moss on the side away from the sun, grass at the foot. No carvings (D68). Eight of them on the cells (±2,±1) and (±1,±2) round a middle make a ring a character can stand in.
- **Chest (D54, D142):** `Chest A1` (closed) and `Chest A1 Open` (lid back, empty inside); shadows `Chest Shadow A1_S` and `Chest Shadow A1 Open_S` and so on. Wood with two iron bands, a lock plate and ring handles. About 62 px wide, 30 px tall. `scripts/art/props.mjs` draws the stones and chests, under 2 seconds a sprite.
- **Crate and barrel:** `Crate A1` (0.44 wide, 0.4 tall, 62 x 63 px: upright boards in a thicker frame, a diagonal brace on two opposite sides) and `Barrel A1` (0.6 tall, 46 x 65 px: 12 staves, three iron hoops, a bung in the lid); shadows `Crate Shadow A1_S` and `Barrel Shadow A1_S` and so on. One tile each. Beside a human at 2.5 scale (108 px) the crate is about knee height and the barrel about hip height. Plain scenery: nothing opens them, and no rule says what they hold. Six of them are in the showcase scene.
- Colours: wall stone, moss and grass from the tileset's walls and ground; the standing stones from its boulders; wood from its door (two paler wood tones added); iron greys.
- **Checked:** the scripts' PNGs are pixel-identical to the ones Michael saw in chat; Godot 4.7.2 imports them; `props.tscn --shot` on a virtual display exits 0 with no error, and the picture was looked at; `world.tscn --shot` still exits 0. **Not checked:** a real screen, the click on a chest, anything in the seeded world. **Crate and barrel, checked:** brightness 60 and 59 against the chest's 60 (spread 13 and 15 against 18); the 40 earlier PNGs unchanged after a full redraw; Godot 4.7.2 imports them; `props.tscn --shot` on a virtual display exits 0 and the picture was looked at; `world.tscn --shot` still exits 0. **Not checked:** a real screen.
- **The PR's review (a second Claude chat, at `5157fef`, cloud sandbox, Godot 4.7.2, Node 22):** `scripts/verify.sh` prints PASS (again on `main` after the merge); all 64 PNGs redraw byte-identical (`props.mjs` 56 in 34 s, `doorway.mjs` 8 in about 114 s); the import exits 0 and changes no committed `.import` file; the chest click works (on its tile and up to 30 px above its middle; 40 px above lands on the tile behind; an empty tile does nothing); the draft loop writes only its picture; the PR adds no paid-pack art.
- **Known and left as they are:** the open chest's lid hangs about 0.2 tile over the tile behind it (in the showcase it overlaps the crate at (6,9)), to know when chests go next to walls or props. The standing stones are visibly paler and flatter than the tileset's boulder in the same picture. A two-finger scroll zooms, so a trackpad cannot pan; arrows or WASD do. Godot writes `.gd.uid` files for six older `prototype/` scripts (`block/`, `character/`) that were never committed: they show as untracked after an import.
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

## The kit and the skill (built 2026-11-15, merged with PR #17; Michael asked for them)
- **Kit, `scripts/art/kit.mjs`:** shapes, ready parts (cut stone, boards, grass; moss, rain streaks and edge highlights come with rock), the tileset's colours, camera, light and one command line for every prop script. `props.mjs` now holds only the props' shapes; its 40 PNGs came out byte-identical after the change.
- **Draft loop:** `node scripts/art/props.mjs "<name>" --draft --beside "<tileset piece>"` writes no sprite. It saves one picture to look at (`prototype/shots/art-draft.png`: 4 sides on grass with shadows, the tileset piece at the end) and prints both pictures' brightness and spread.
- **Skill, `.claude/skills/renown-prop/SKILL.md`:** the format, the space a prop is written in, a whole crate as the example, the draw-look-fix loop, the Godot check, and the rules (no characters, no carvings, rough draft first).
- **First real use (2026-11-15, evening):** the crate and the barrel. A rough draft shown to Michael first (one draft round, plus a size picture beside a human made with a scratch script outside the repo), then two more draft rounds for the detail. The skill's own crate example is the simple form; the one in `props.mjs` adds the brace and a thicker frame.
- **Gap found:** the draft picture has no character in it, so size beside a person had to be shown with a scratch script. A `--with-character` flag on the draft is a candidate.
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
- A showcase scene in the client, once `prototype/` is gone (not planned).
- Whether `world` and `play` get the same trackpad zoom fix.
- Michael's verdict on the Gorrath, Halvar and Skerra stills.
- Whether the kit and the skill are worth keeping: Michael asked for a crate and a barrel with the skill and liked both; he has not said so in words.
- Whether to test another technique (image model through ComfyUI).
- More props that could be made the same way: notice board (D130; whether it is in the slice is still open), shop sign or stall, campfire and tents for camps (D54, after the slice), fences, a doorstone grave (D104, only said in the slice), item icons (D133), dungeon and interior tiles, a backdrop for the death screen (D148).
