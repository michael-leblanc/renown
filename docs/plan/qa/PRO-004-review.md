# PRO-004 review (re-check after fix round 2, 9353df0)

Checked: diff `main...task/PRO-004` and `9353df0`, `check.gd` run headless (all ok, `check: PASS`, exit 0), `verify.sh` PASS. Worktree clean apart from the ignored `prototype/character/*.gd.uid` files.

Round 2 point (a play during candidate 3's hold stays frozen) is **fixed**. `block_player.gd:124` now ends the hold as soon as the character's `anim` or `frame` differs from the held one, and line 129 drops the flash with it. `play()` always resets `frame` to `range_from`, so any new play is caught, including `Idle` (held frame is 4, a new Idle starts at 0).
- The new `check.gd` line is a real test: in a scratch copy with the old time-only condition it prints `FAIL ... frame advances (0 to 0)` and `check: FAIL`.
- Scratch probe on a goblin made outside the block scene: candidate 3, then `TakeDamage`, `Die`, `Idle` or `Attack1`, either in the same frame or 0.05 s later. Every case is un-frozen, un-flashed and not holding within two frames, and its frame moves on.

Earlier fixes still hold:
- Round 1 point 1 (checker hangs): 9353df0 only adds lines to `check.gd`. The 25 s watchdog and the missing-script early exit are unchanged.
- Round 1 point 2 (reuse from PRO-006): `preload` + `BlockPlayer.play_candidate(c, i)` still works on any character with no block data passed, and the block scene still plays all five through the helper.

## Review: PASS
