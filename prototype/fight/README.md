# Fight (PRO-006, test game D201)

Click the dummy (an orc standing in the patch): the human walks next to it and both swing every 2 seconds until one dies. Run it with the play scene:

```
scripts/godot.sh --path prototype res://play/play.tscn
```

- **Click the dummy** (its body or its tile): the human walks to the nearest free tile beside it (never onto the dummy's tile, characters are not obstacles, D187) and the fight starts there. A click on the ground walks away and stops the fight, health as it is. **R** puts both back at full health on the tiles they started on.
- **Each hit** plays TakeDamage on the target (first 8 frames, `hit_anim_to_frame`; Die on the killing blow). **Each miss** plays the block candidate chosen with **1 to 5** (PRO-004, `block/block_player.gd`) on the one who was missed. Health bars float over both; the fight timer, both healths, the numbers and the last events print top left.
- **Timing:** the human swings at 0, 2, 4 s..., the dummy 1 s later (1, 3, 5 s...), so the two never land on the same instant and there is never a draw. A blow lands 0.5 s after its swing starts (the swing animation is 1 s) and is rolled then; a character that died before its blow lands never lands it.

## Numbers

All in `fight_data.json` (D165: health 40, 5 damage, 50% to hit, a swing every 2 s). The keys change them live (they are not saved back to the file), and the screen prints the value and its keys:

| Z / X | health | C / V | damage | B / N | chance to hit | K / L | swing every |
|---|---|---|---|---|---|---|---|
| U / I | blow lands after | J / M | dummy swings later by | | | | |

A health change moves both maximums and both current healths by the same amount (a living one keeps at least 1). Other numbers (bar sizes and colours, the dummy's hit box, how far from the start the dummy stands, the check's fight count) are in the same file.

## Length, measured

`scripts/godot.sh --headless --path prototype --script res://fight/check.gd` runs 20 fights with no window (the rules are in `fight.gd`, plain data and a clock, no node) and prints each length and the average, then `ALL OK`. At the starting numbers: **the 20 on seeds 1 to 20 average 28.9 s, but the true mean is about 26 s** (1000 other fights: 26.3 s). Eight hits are needed and the first side to get them wins, so a fight is shorter than 16 swings. That is inside the 25 to 35 band but under D165's "about 30" (a lesson for D165).

## Files

`fight.gd` (the rules, headless), `fight_data.json` (every number), `check.gd` (the proof, headless), and the screen part is in `../play/play.gd`.
