# Review OPS-001 (re-check after fix round 3, commit 3ee3377)

Run in the scratch clone `/tmp/opsrev.c4l8Bu/r` at 3ee3377. The clone was reset clean afterwards, and the worktree was not touched.

## Previous point
- Review 2 (GUT's expected-engine-error asserts always FAIL): **fixed.** `_div(1, 0)` + `assert_engine_error('Division by zero')` in a test now gives `PASS`, exit 0. The backtrace has the `test_expected_engine_error` frame, so the error is skipped.

## Earlier fixes still hold
- Clean clone: `PASS`, exit 0.
- Hook errors still fail: `before_each` gives `game/test/test_hook.gd:4 before_each -- Invalid call. ...`; `before_all` gives `game/test/test_ba.gd:4 before_all -- ...`; a helper called from `after_all` gives `game/test/test_hook2.gd:4 _mk -- ...`. All exit 1, also with the expected-error test in the same run.
- Failing assert: `game/test/test_rt.gd:3 test_bad_thing -- [2] expected to equal [3]`. Runtime error in a test: `game/test/test_rt.gd:6 test_rt -- Unexpected Errors:`. Exit 1.
- A test file renamed to `smoke.gd` gives `FAIL: testnames` with the file and `FAIL: test` with `no tests ran`, exit 1.
- A parse error in an unloaded `game/sim/broken.gd` gives `FAIL: parse` + `game/sim/broken.gd:2: Expected parameter name.`, exit 1.
- `godot.sh` is unchanged since round 1.

## Review: PASS

## Notes (not blocking)
- **Expected errors with no `test_*` frame still FAIL.** See scripts/verify.sh:71-75. GUT passes these, but verify fails them: an error raised in a deferred call (`_cb.call_deferred()`, then `assert_engine_error`), or in a helper resumed after an `await`. Their backtrace starts at the awaiter or the message queue, not at the test. It fails loudly, never a false PASS. Revisit if a network task (ENet signals, awaits) needs to expect an engine error.
- **Any `test_*` function outside addons counts as a test frame.** See scripts/verify.sh:73. A `before_each` that calls a game function named `test_*` (for example `game/sim/world.gd` `test_collision()`) and hits an error there gives a false `PASS`. This was checked. It is a one-line fix: only count frames under `res://test/`.
