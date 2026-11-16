# Scripts

One line per script: what it does and how to run it.
Agents read this list before doing repeated work by hand.

| Script | What it does |
|---|---|
| `scripts/godot.sh <args>` | Runs the pinned Godot 4.7.2 (D1). Downloads it once into the per-user cache (`~/.cache/renown/godot/4.7.2-stable/`, `RENOWN_GODOT_CACHE` replaces the `~/.cache/renown/godot` part); every worktree shares it. Editor: `scripts/godot.sh --editor --path game`. |
| `scripts/verify.sh` | The gate: imports the project, parse-checks every `.gd` under `game/`, runs the GUT tests (a runtime error in a test or a fixture hook, or zero tests run, is FAIL). Prints `PASS`, or `FAIL: <step>` with `file:line` and the test name. Exit 0 / 1. |
| `scripts/measure.sh [--count=N]` | The tick-time measurement (D184, D186): one line per NPC count (32 to 8000) with the average tick, the worst tick and the state hash, then the NPC budget (largest count with a worst tick under 20 ms), the CPU, the OS and the Godot version. `--count=N` measures only that count. Run it with nothing heavy going. Takes several minutes. |
| `scripts/check_parse.sh` | Used by `verify.sh`: loads every `.gd` outside `addons/` in one Godot process (`check_parse.gd`), because import and GUT miss a parse error in a script no test loads. |
| `scripts/check_test_names.sh` | Used by `verify.sh`: fails on a file under `game/test/` not named `test_*.gd` (GUT would skip it). Helpers go in `game/test/helpers/`. |
| `scripts/test_verify_on_stop.sh` | Proves `.claude/hooks/verify-on-stop.sh` on a fake project: a failing implementer is blocked (exit 2, failures shown), other agents and a passing implementer exit 0. Prints `PASS`. |
| `node scripts/art/props.mjs [names\|all] [--draft] [--beside "<piece>"] [--views S,E,N,W] [--ss N] [--out dir]` | Draws the test game's code-made standing stones (D71), chests (D54), crate and barrel into `prototype/art/made/`: 256 x 256 PNGs in the tileset's format, 4 sides, plus ground shadows. Under 2 seconds a sprite. `--draft` writes no sprite: it saves one picture to look at, `prototype/shots/art-draft.png`, and with `--beside` adds a tileset piece and prints both pictures' brightness. Shapes are maths in the script, drawn by the kit `scripts/art/kit.mjs`; how to write a new prop is in `.claude/skills/renown-prop/SKILL.md`. No package needed. |
| `node scripts/art/doorway.mjs [outdir] [S,E,N,W] [supersample]` | Same for the lone stone doorway (D108). Written before the kit: about 22 seconds a side. |
| `node scripts/art/colours.mjs "<piece>" [how many]` | Lists the colours a tileset piece uses most, dark to pale: the start of a new colour ramp for the kit. `scripts/art/png.mjs` reads and writes the PNGs. |
| `node scripts/plan.mjs` | Plan status, `validate`, `graph`, `show <id>`, `set <id> <status>`. |
