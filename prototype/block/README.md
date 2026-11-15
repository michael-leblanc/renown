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
