# Character scene (PRO-003, test game D201)

Three characters (human 100%, orc, goblin) stacked from the same Creator parts by the same code, each part with its own tint. All numbers and colours are in `character_data.json`.

```
scripts/godot.sh --path prototype res://character/character.tscn
```

Keys: Left/Right turn all three (they walk), Space stand/walk, O orc size, G goblin size, [ ] walk frame rate, F frame rate follows direction or stays flat.

Proof, no GUT here:
- `scripts/godot.sh --headless --path prototype -s res://character/check.gd` prints one line per acceptance and `check: PASS`.
- Shots (`--shot name.png -- dir=3 walk=1 frame=4 grid=1 big=1 orc=1 goblin=1`): `grid=1 frame=3` shows all 8 directions for the three races; `big=1 frame=3` shows the human only, large, to check which side each part is on.
