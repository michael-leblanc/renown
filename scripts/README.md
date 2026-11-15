# Scripts

One line per script: what it does and how to run it.
Agents read this list before doing repeated work by hand.

| Script | What it does |
|---|---|
| `scripts/godot.sh <args>` | Runs the pinned Godot 4.7.2 (D1). Downloads it once into the per-user cache (`~/.cache/renown/godot/4.7.2-stable/`, override with `RENOWN_GODOT_CACHE`); every worktree shares it. Editor: `scripts/godot.sh --editor --path game`. |
| `scripts/verify.sh` | The gate: imports the project, parse-checks every `.gd` under `game/`, runs the GUT tests. Prints `PASS`, or `FAIL: <step>` with `file:line` and the test name. Exit 0 / 1. |
| `scripts/check_parse.sh` | Used by `verify.sh`: `--check-only` on each `.gd` outside `addons/`, because import and GUT miss a parse error in a script no test loads. |
| `node scripts/plan.mjs` | Plan status, `validate`, `graph`, `show <id>`, `set <id> <status>`. |
