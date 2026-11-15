# Review PRO-001 (commit c01d1b3)

Checked in scratch copies under `/tmp/opsrev.c4l8Bu/` (`proto/`, `up/`). The worktree was not changed (`git status` clean after a re-run of `unpack.sh` there).

## What was run
- **unpack.sh** from a copy outside git with `RENOWN_ART_SRC=<main root>`: `80 Creator files, 32 tiles`, exit 0, PNGs byte-identical to the committed ones. In the worktree (git-common-dir path, no env var): same count, tree stays clean. Tiles come only from `Fantasy tileset - 2D Isometric V1.1.zip`; the Desert zip is never named.
- **shot.gd** on a copy of the project, real display: plain scene gives `shot: saved .../shots/ok.png`, exit 0. Scene whose script has a parse error: exit 1. Scene that `load()`s a broken script at runtime: exit 1.
- **verify.sh** in the worktree: `PASS` (`check_parse.sh` only scans `game/`, so `prototype/` does not affect it).
- Art is 13 MB, under the 50 MB limit. `.godot/` and `shots/` are git-ignored on main.

## Review: PASS

1. **unpack.sh never removes art that is no longer listed** — prototype/unpack.sh:52-75. It only copies, so when a later task drops or renames a line in `art.txt`, the old PNG and its `.import` stay in `prototype/art/` and get committed again. The acceptance says only listed files end up there. Fix: at the start, delete `prototype/art/creator` and `prototype/art/tiles` PNGs not in the list (or copy into `$TMP` and swap the folder in, keeping `.import` files of names still listed). Not blocking for this task, since the current tree matches `art.txt` exactly.
