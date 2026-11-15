# Scripts

One line per script: what it does and how to run it.
Agents read this list before doing repeated work by hand.

| Script | What it does |
|---|---|
| `scripts/godot.sh <args>` | Runs the pinned Godot 4.7.2 (D1). Downloads it once into the per-user cache (`~/.cache/renown/godot/4.7.2-stable/`, `RENOWN_GODOT_CACHE` replaces the `~/.cache/renown/godot` part); every worktree shares it. Editor: `scripts/godot.sh --editor --path game`. |
| `scripts/verify.sh` | The gate: imports the project, parse-checks every `.gd` under `game/`, runs the GUT tests (a runtime error in a test or zero tests run is FAIL). Prints `PASS`, or `FAIL: <step>` with `file:line` and the test name. Exit 0 / 1. |
| `scripts/check_parse.sh` | Used by `verify.sh`: loads every `.gd` outside `addons/` in one Godot process (`check_parse.gd`), because import and GUT miss a parse error in a script no test loads. |
| `scripts/check_test_names.sh` | Used by `verify.sh`: fails on a file under `game/test/` not named `test_*.gd` (GUT would skip it). Helpers go in `game/test/helpers/`. |
| `node scripts/plan.mjs` | Plan status, `validate`, `graph`, `show <id>`, `set <id> <status>`. |
