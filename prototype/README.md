# Test game (D201)

A throwaway Godot project, deleted once its lessons are written down as decisions. It follows none of `game/sim/`'s rules and has no GUT tests: each task is checked by running it or by a screenshot. Run Godot only through `scripts/godot.sh`, from the repo root.

## Art

The art the test game uses is **committed** in `prototype/art/` (about 12 MB), so a fresh worktree has it. `prototype/art.txt` lists every file: the Character Creator's human body and one head, chest, legs, shoes, hands, belt, sword and shield (8 animations each), and from the green tileset some ground, one stone wall family and a door (4 rotations), three trees, two rocks and their shadows.

Unpack again only when `art.txt` changes. It reads the two sources at the main checkout's root (`Fantasy tileset - 2D Isometric V1.1.zip`, never the Desert zip, and `Stand-alone Character creator - 2D Fantasy V1.3/`), or the folder in `RENOWN_ART_SRC`, and copies only the listed files:

```
prototype/unpack.sh
RENOWN_ART_SRC=/path/to/folder/with/both prototype/unpack.sh
```

## Code-made art

`prototype/art/made/` holds art that is **not** from the two packs: it is drawn by scripts in `scripts/art/` (shapes written as maths, rendered to PNG in the tileset's own format, so `_piece` takes them unchanged: 256 x 256, tile middle at 128,208, 4 rotations, a separate ground shadow). `unpack.sh` and `art.txt` leave this folder alone.

- **Doorway** (D108): `Doorway A1_S/_E/_N/_W`, shadows `Doorway Shadow_S` and so on. About 2 tiles long by 1 deep.
- **Standing stones** (D71): `Standing Stone A1` (tall), `A2` (leaning), `A3` (broken stump), shadows `Standing Stone Shadow A1_S` and so on. One tile each.
- **Chest** (D54, D142): `Chest A1` and `Chest A1 Open`, shadows `Chest Shadow A1_S` and `Chest Shadow A1 Open_S` and so on.
- **Crate and barrel:** `Crate A1` (boards in a thicker frame, a diagonal brace on two sides; about knee height on a human) and `Barrel A1` (staves, three iron hoops, a bung in the lid; about hip height), shadows `Crate Shadow A1_S` and `Barrel Shadow A1_S` and so on. One tile each. Scenery only: nothing opens them.
- **Furniture** (insides of shops and homes, D35, D208): `Table A1` (a plank table about a tile across, about hip height), `Stool A1` (three legs, knee height), `Bed A1` (a wooden frame with a straw mattress, a hide thrown over it and a pillow; about 1.5 tiles long by 0.7 wide, centred on its tile like the tent), `Counter A1` (a shop counter, planked, a thick top, two iron straps), `Shelf A1` (1.3 tall, standing toward the back of its tile against a wall, with rolls of cloth, small boxes, sacks and iron pots on it). Shadows `Table Shadow A1_S` and so on. Scenery only.
- **Items** (D218): `items/` (each item lying in the world, one per metal or dye, and its shadow) and `items/pack/` (the same names: the pack picture). Drawn by `scripts/art/items.mjs`; see `scripts/README.md`.
- **Effects:** `effects/Arrow Flight.png`, one arrow in the air pointing right, its middle at 128,128; the client turns it toward the target (D163). `effects/Waking Glow.png` and `Waking Glow Front.png` (D89): 8 frames of 256 px side by side, 8 a second, the tile's middle at 128,208 in each frame; the ring goes under the character, the rising motes over it.
- **Camp:** `Campfire A1` (lit: a ring of eight stones about a tile across, four logs, flames to about knee height, firelight on the stones' inner faces) and `Tent A1` (a plain canvas ridge tent for one sleeper, about 2 tiles long by 1 deep, ridge at about head height; the way in is at one end, with a pole in it, guy ropes and pegs), shadows `Campfire Shadow A1_S` and `Tent Shadow A1_S` and so on. Plain camp gear: no emblem, colour or writing. Scenery only.
- **Shore** (D113): `Jetty A1` (one tile of plank deck on four posts, about knee height above the water; tiles join in a row) `Jetty End A1` (the last tile, with a mooring post and rope) and `Rowboat A1` (a clinker rowboat pulled up on the sand, about 1.5 tiles long, two seats and a pair of oars inside). Made by `scripts/art/shore.mjs`.
- **Camp and town** (`scripts/art/village.mjs`): `Fence A1`, `Bedroll A1`, `Log Seat A1`, `Chopping Block A1`, `Fish Rack A1`, `Net Poles A1`, `Campfire A1 Out`.
- **Animated** (`scripts/art/anim.mjs`, in `art/made/anim/`, strips of frames listed in `anim.json`): fire (campfire, torch, wall torch, brazier, lantern post, cooking fire, candle, hearth, forge), a pennant, a water wheel, a windmill, a market stall, water tiles with shore edges, a chest and a door opening, combat and bandage effects, smoke, steam, ripples, a light pool for night, and rain, fog and leaves.

Draw them again (only needed when a script changes):

```
node scripts/art/props.mjs      # stones, chests, crate and barrel, about 30 seconds
node scripts/art/camp.mjs       # campfire and tent, about 15 seconds
node scripts/art/furniture.mjs  # table, stool, bed, counter, shelf, about 15 seconds
node scripts/art/items.mjs      # the items, about 25 seconds
node scripts/art/effects.mjs    # the arrow in flight, about a second
node scripts/art/doorway.mjs    # the doorway, about 90 seconds
```

A new prop is written with the kit `scripts/art/kit.mjs`; the steps are in `.claude/skills/renown-prop/SKILL.md`. A draft to look at, without writing any sprite:

```
node scripts/art/props.mjs "Chest A1" --draft --beside "Stone A1_S"
node scripts/art/camp.mjs "Tent A1" --draft --with-character      # with a human on the next tile, for size
```

See them in Godot. They are in a showcase scene only, not in the seeded test patch (`world/`):

```
scripts/godot.sh --path prototype res://props/props.tscn
```

Arrows or WASD pan. Zoom with the mouse wheel, a trackpad pinch or two-finger scroll, or the + and - keys. A left click on a chest opens or closes it.

## Run

First time in a checkout, build the import cache (git-ignored `prototype/.godot/`):

```
scripts/godot.sh --headless --path prototype --import
```

Then run a scene (replace the path with the scene):

```
scripts/godot.sh --path prototype res://world/world.tscn
```

## Shot

Runs a scene, waits 10 frames (`SHOT_FRAMES` in `prototype/shot.gd`), saves the window as a PNG in `prototype/shots/` (git-ignored) and quits. Exit code 0 when the picture is saved; 1 when the scene did not load, any script or parse error was printed, or there is no window (`--headless` has none).

```
scripts/godot.sh --path prototype res://world/world.tscn --shot world.png
```

- A bare name goes to `prototype/shots/`. A `res://` or absolute path is used as given.
- Needs a real display. If the window is hidden (another workspace), the shot still works: it forces one draw.
- Without `--shot` nothing changes: the scene just runs.
