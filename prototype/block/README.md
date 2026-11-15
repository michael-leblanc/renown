# Block candidates (PRO-004, test game D201)

The Creator has no block animation (D163), so five stand-ins are played side by side on five armed humans (same stacked parts as `character/`, sword and shield, same code, D4). Each is labelled and loops: play, wait `gap_seconds`, play again. Every play comes with a short sound made in code (a thud, a clank or a whoosh: no file, nothing bought). All numbers are in `block_data.json`, the look in `character/character_data.json`.

1. `CrouchIdle`
2. the first frames of `TakeDamage` (frames `from` to `to` in the data)
3. one frozen `Idle` frame with a white flash (`flash_seconds`)
4. `Special1`
5. `Taunt`

```
scripts/godot.sh --path prototype res://block/block.tscn
```

Keys: Left/Right turn all five together through the 8 directions, 1 to 5 replay one candidate (and its sound) now, M mute.

Proof, no GUT here:
- `scripts/godot.sh --headless --path prototype -s res://block/check.gd` prints one line per acceptance and `check: PASS`.
- Shots (`--shot name.png -- dir=3 flash=1 grid=1`): `dir=N` picks the facing; `flash=1` keeps the white flash on so a still picture shows it; `grid=1` draws one row per candidate and one column per direction, all 8 at once.

## Play a candidate on any character (for PRO-006)

`block_player.gd` is the one piece that plays a candidate, used by this scene and meant for a miss in the fight:

```
const BlockPlayer := preload("res://block/block_player.gd")
BlockPlayer.play_candidate(character, 2)   # index 0 to 4 = candidates 1 to 5
```

`character` is any `character/character.gd` node. The first call adds a `BlockPlayer` child (flash material on every part but the shadow, an audio player). The character is un-frozen and un-flashed afterwards: an animation candidate plays once and holds its last frame; the flash candidate holds one Idle frame for `flash_hold_seconds` (flash on for `flash_seconds`), then un-freezes. `h.length_of(i)` is how long a play lasts.

`check.gd` stops itself after 25 s (`WATCHDOG_SECONDS`) with `check: FAIL` and exit 1, so a broken run never hangs.
