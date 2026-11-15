# Review PRO-003 (re-check after fix round 1, commit 0751c77)

Read `git diff b52beef..0751c77` and the whole `character.gd`. In the worktree, `scripts/godot.sh --headless --path prototype -s res://character/check.gd` prints `check: PASS` (35 lines ok) and `scripts/verify.sh` prints `PASS`. I also ran a probe from outside `prototype/character` (in /tmp, so nothing was left in the worktree). It used the character the way PRO-004, PRO-005 and PRO-006 will: `CharacterScript.new()`, `setup(race, data)`, then only public calls.

Round 1 point 1 (walk frame rate ignored speed and scale) is **fixed**. `_needed_fps` is now `ground px/s / (foot px a frame * along * sprite_scale)`, and the setting is `walk_fps_multiplier` (1.0 = no slide). `_process` reads `tile_seconds` and `sprite_scale` from the shared data dict every frame. Probe: with the human walking E, setting `data["tile_seconds"]` from 0.3 to 0.5 while it walks drops the rate from 53.3 to 32.0 fps, and slide_ratio stays 1.00. PRO-005 only has to pass the same dict and change `tile_seconds`. check.gd now measures the orc and goblin against the foot speed read from the sheet (worst error 0.02), so the old side note (a check that could only pass) no longer applies.

Round 1 point 2 (animation API too thin) is **fixed**. The new API is `play(anim, loop, from, to)`, `finished(anim)`, `set_frame(n)`, which redraws, and `anim_fps` per animation in the data. Probe results:
- Attack1 played once, with `finished` calling `play("Idle")`, chains cleanly. PRO-006's swing goes back to idle.
- TakeDamage interrupting an Attack1 that is still playing is fine, and finished fires for TakeDamage.
- Die played once holds frame 14, and turning afterwards keeps the held frame (sprite 74 = row 4, frame 14).
- `play("Idle"); frozen = true; set_frame(7)` shows frame 7 and holds it. Setting `modulate` on the character node reaches every part, so PRO-004 can add its white flash without editing the character.
- The scene's `frame=N` shot now sets the frame after `_apply_walking`, so it is no longer lost.

PRO-004 (frozen frame, frame ranges), PRO-005 (live walk speed) and PRO-006 (play-once attack, TakeDamage, Die with finished) can all use the character without editing `prototype/character`.

## Review: PASS
