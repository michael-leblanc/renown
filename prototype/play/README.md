# Play scene (PRO-005, test game D201)

The seeded patch of PRO-002 with the human of PRO-003 in it. Click the ground and the human walks there.

```
scripts/godot.sh --path prototype res://play/play.tscn [--seed N] [--zoom Z] [--click X,Y] [--advance S]
```

- **Left click** the ground: walk there along the shortest path (yellow tiles, red target). **Right click** the door: open or close it. Wheel zooms. **P** shows or hides the path.
- **[ or -** lower the walk time per tile (faster), **] or =** raise it (slower), in steps of 0.05 s. The time and the tiles a second (and the speed measured over the last second) are printed top left. The time itself lives in `../character/character_data.json` (`tile_seconds`, 0.3), because the walk animation's frame rate follows it. The other settings are in `play_data.json`.
- A click on a wall, tree, rock, the outside of the patch or a walled-in tile does nothing (a red flash and `Last click: blocked / unreachable / outside` on screen). A walk already going carries on.

## Rules it tests

- **8 directions, a diagonal step takes as long as a straight one** (D185), so "shortest" is fewest steps; ties go to straight steps.
- **No cutting corners.** Default (strict): a diagonal step needs both tiles beside it free. D185's text only forbids a step "between two blocked tiles"; that reading is the setting `diagonal_needs_both_sides_free: false`. The strict one is the default because the human's body would clip a tree or a wall's corner otherwise. Worth a look when D185 is revisited.
- **Areas** (D187): the free tiles are numbered once; a click on a tile in another area, or a blocked one, is refused at once, with no search (`pathfinder.last_expanded` is 0).
- **Door** (D191): never blocks a walk. When the human's next step is the door tile the door opens (the piece is hidden: an empty doorway); it stays open until a right click closes it.
- **Inside the building only the 3 by 2 middle is walkable** (every wall-ring tile blocks walking): left as PRO-002 made it, a lesson for D188.
- World input and panning are switched off in play; play makes its own camera current and follows the human (offset `camera_offset`).

## Proof, no GUT here

- `scripts/godot.sh --headless --path prototype --script res://play/check.gd` prints one line per acceptance and `ALL OK` (exit 1 on a failure).
- Shots (`--shot name.png -- --click 18,19 --advance 0.8`, seed 1: the door is at 18,20 and the human starts at 18,23): `play_start` (the human stands in the patch), `play_walk` (a walk with the path drawn), `play_door` (the human in the open doorway), `play_refused` (a click on a wall).

## Files

`play.tscn`, `play.gd` (clicks, walking, camera, screen), `pathfinder.gd` (A*, areas), `play_data.json` (settings), `check.gd`.
