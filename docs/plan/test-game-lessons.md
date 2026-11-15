# Test game (D201): findings for PRO-007

Collected while the PRO tasks are built. Michael adds what he sees when he plays; PRO-007 turns them into decisions.

**Done (PRO-007, 2026-11-15):** turned into D203 to D209 in `docs/decisions.md`. Left as notes, not decisions: which Creator melee part is a sword, `Hands1` always drawn in front, the building reads as a small fort.

## From the build (not yet seen by Michael)
- **Walk speed on screen is uneven (D185):** a diagonal grid step costs the same time as a straight one, so in this 2:1 isometric view a character walking screen-east/west covers 128 px a step, screen-north/south 64 px, and the screen diagonals about 72 px. E/W looks about twice as fast as N/S. PRO-003, 2026-11-14.
- **Walk animation speed has to follow the direction:** for the feet not to slide at 3.3 tiles/s the Walk sheet runs at about 30 fps (SE), 40 (N/S) and 52 (E/W). Computed from the sheets, not watched. Key F in the character scene turns it off. PRO-003.
- **Sprite scale 2.5** makes a human about 1.8 tiles tall. A guess, a setting. PRO-003.
- **Creator `Melee2` is a spear, not a sword;** `Melee1` looks like a dagger. Which melee part is a sword is still unknown (handoff: name the Creator's parts). PRO-001, PRO-003.
- **Creator `Hands1` is one sheet for both hands,** so it can't go behind the body on the far side. Always drawn in front. PRO-003.
- **The building reads as a small fort** (crenellated stone walls, windows, no roof), from the one wall family picked. PRO-002.
- **Walls drawn on a tile's edge don't fit "blocks walking" per tile (D188):** the tileset draws a wall along a tile's outer edge, but the whole tile blocks. The 5 by 4 building has only a 3 by 2 walkable middle, and a character stops a full tile short of each wall. Matters before SIM-002 builds the per-tile model: walls may need to live on edges between tiles. PRO-002 review.
- **Corner rule (D185):** PRO-005 makes a diagonal step need both side tiles free (stricter than D185's "not between two blocked tiles"). `diagonal_needs_both_sides_free` in prototype/play/play_data.json switches to the literal reading. Pick one by feel. PRO-005.
- **Human size:** measured by QA, the human is about the door's height (1.0 to 1.25 times) and 0.6 to 0.7 of a tree. `sprite_scale` (2.5) is a setting; judge by eye. (An earlier note here said "half the door": wrong, the wall in front hid the legs.) PRO-005 QA.
- **Walls hide a character standing in the doorway** below the chest: the 2-tile-wide wall piece in front is drawn over it. Correct draw order, odd look. PRO-005 QA.
- **Block candidate 2 (TakeDamage, first frames):** TakeDamage is a slow 15-frame flinch, and its first frames read as a lunge or a lean more than a block. PRO-004.
- **Block sounds are made in code** (thud, clank, whoosh); no sound files were added (D163). PRO-004.
- **Fight length (D165) comes out under "about 30 s":** at health 40, damage 5, 50% to hit and a swing every 2 s, 20 fights averaged 28.9 s and 1000 fights about 26.3 s. Eight hits are needed and the first side to land them wins. PRO-006.
- **The dummy swings 1 s after the human** so blows never land at the same instant and a fight never ends in a draw; a blow lands 0.5 s after its swing starts. Both settings. PRO-006.
- **An open door is an empty gap:** the tileset has no open-door piece and no wall-with-doorway piece (D191). PRO-002.

## Michael's answers after playing (2026-11-15, on his Mac)
- **Runs on macOS** through `scripts/godot.sh` (the Mac build of 4.7.2 downloaded on its own).
- **Race sizes:** keep the defaults, orc 1.4 wide by 1.2 tall, goblin 0.75 ("all good by default, 75% for goblin").
- **Walk speed:** keep 0.30 s a tile, about 3.3 tiles a second ("the default walkspeed is good").
- **Fight length:** keep the numbers ("the fight is good for now").
- **Diagonal rule:** the stricter one, a diagonal step needs both side tiles free (no cutting the corner of a wall or tree). Claude's pick after explaining both; Michael: "your pick". Changes D185's corner rule.
- **Block:** candidate 3, the white flash with its sound, "for now".
- **The building is too cramped.** Claude's proposed fix, for the decisions session: walls live on the edges between tiles, not on whole tiles (each edge can block walking and block sight, a door is an edge that opens). This changes D188 and SIM-002 before SIM-002 is built.
- **See inside a building when you're in it,** "influenced by many games" (Michael). Confirmed by Michael ("yes"): when your own character is inside a place (D188), that building's roof is hidden and the walls on the near side fade, so you see the room; outside, the building looks whole. Drawing only, on your own screen; it changes nothing about who can see whom (D190).
- Not asked: whether the trees and walls draw in a believable order (Michael answered about the building and the block instead).
