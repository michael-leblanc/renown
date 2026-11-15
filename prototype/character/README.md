# Character scene (PRO-003, test game D201)

Three characters (human 100%, orc, goblin) stacked from the same Creator parts by the same code, each part with its own tint. All numbers and colours are in `character_data.json`.

```
scripts/godot.sh --path prototype res://character/character.tscn
```

Keys: Left/Right turn all three (they walk), Space stand/walk, O orc size, G goblin size, [ ] walk frame rate multiplier (1.0 = no slide; the rate itself comes from the walk speed, foot speed and sprite scale), F frame rate follows direction or stays flat.

Proof, no GUT here:
- `scripts/godot.sh --headless --path prototype -s res://character/check.gd` prints one line per acceptance and `check: PASS`.
- Shots (`--shot name.png -- dir=3 walk=1 frame=4 grid=1 big=1 orc=1 goblin=1`): `grid=1 frame=3` shows all 8 directions for the three races; `big=1 frame=3` shows the human only, large, to check which side each part is on.

## Animation API (for the tasks that build on this scene)

On the character node: `play(anim, loop := true, from_frame := 0, to_frame := -1)` (always restarts; `loop = false` plays once, holds the last frame and emits `finished(anim)`), `set_frame(n)` (redraws; with `frozen = true` it holds a frame), `fps_of(anim)`, `set_direction(d)`. Per-animation rates are `anim_fps` in `character_data.json`. Walk is worked out from `tile_seconds`, `foot_px_per_frame`, `sprite_scale` and the body size, times `walk_fps_multiplier`.
