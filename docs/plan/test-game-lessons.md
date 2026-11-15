# Test game (D201): findings for PRO-007

Collected while the PRO tasks are built. Michael adds what he sees when he plays; PRO-007 turns them into decisions.

## From the build (not yet seen by Michael)
- **Walk speed on screen is uneven (D185):** a diagonal grid step costs the same time as a straight one, so in this 2:1 isometric view a character walking screen-east/west covers 128 px a step, screen-north/south 64 px, and the screen diagonals about 72 px. E/W looks about twice as fast as N/S. PRO-003, 2026-11-14.
- **Walk animation speed has to follow the direction:** for the feet not to slide at 3.3 tiles/s the Walk sheet runs at about 30 fps (SE), 40 (N/S) and 52 (E/W). Computed from the sheets, not watched. Key F in the character scene turns it off. PRO-003.
- **Sprite scale 2.5** makes a human about 1.8 tiles tall. A guess, a setting. PRO-003.
- **Creator `Melee2` is a spear, not a sword;** `Melee1` looks like a dagger. Which melee part is a sword is still unknown (handoff: name the Creator's parts). PRO-001, PRO-003.
- **Creator `Hands1` is one sheet for both hands,** so it can't go behind the body on the far side. Always drawn in front. PRO-003.
- **The building reads as a small fort** (crenellated stone walls, windows, no roof), from the one wall family picked. PRO-002.
- **Walls drawn on a tile's edge don't fit "blocks walking" per tile (D188):** the tileset draws a wall along a tile's outer edge, but the whole tile blocks. The 5 by 4 building has only a 3 by 2 walkable middle, and a character stops a full tile short of each wall. Matters before SIM-002 builds the per-tile model: walls may need to live on edges between tiles. PRO-002 review.
- **An open door is an empty gap:** the tileset has no open-door piece and no wall-with-doorway piece (D191). PRO-002.
