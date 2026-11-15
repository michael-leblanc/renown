# Test game (D201)

A throwaway Godot project, deleted once its lessons are written down as decisions. It follows none of `game/sim/`'s rules and has no GUT tests: each task is checked by running it or by a screenshot. Run Godot only through `scripts/godot.sh`, from the repo root.

## Art

The art the test game uses is **committed** in `prototype/art/` (about 12 MB), so a fresh worktree has it. `prototype/art.txt` lists every file: the Character Creator's human body and one head, chest, legs, shoes, hands, belt, sword and shield (8 animations each), and from the green tileset some ground, one stone wall family and a door (4 rotations), three trees, two rocks and their shadows.

Unpack again only when `art.txt` changes. It reads the two sources at the main checkout's root (`Fantasy tileset - 2D Isometric V1.1.zip`, never the Desert zip, and `Stand-alone Character creator - 2D Fantasy V1.3/`), or the folder in `RENOWN_ART_SRC`, and copies only the listed files:

```
prototype/unpack.sh
RENOWN_ART_SRC=/path/to/folder/with/both prototype/unpack.sh
```

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
