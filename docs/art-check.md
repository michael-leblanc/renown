# Art check: Renown

Checked: 2026-11-13, from the files in `~/Downloads/Assets`. The Creator's weapons and shields were named on 2026-11-16.

> **Read this first.** This check was written before D121. D121 then decided that humans, orcs and goblins are all drawn from the Character Creator, so the orc and goblin pack sheets are not used for characters. The facts below about the files are still true. Where this doc says the orc and goblin look is fixed, D121 replaces that. The status of each question is at the end.

This lists what each character sheet holds and which animations it has. Two findings shaped the decisions that followed. First: **humans are layered, the orc and goblin pack is pre-baked.** A human's body, clothes and weapon are separate image files, so loot can change how a human looks. Each pack orc and goblin is one finished drawing with its weapon painted in, so loot cannot change how it looks. Second: the pack orcs and goblins have a block animation, and the Character Creator does not.

Weapons and faces were read by eye from sprites about 45 pixels tall, with heads about 8 pixels wide. Treat a "?" as a guess. Contact sheets to check by eye are in `~/Downloads/Assets/_art-check/`.

## What is in the folder

The art is still zipped. Nothing is unpacked. The zips total about 2.7 GB.

| Zip | Size | Characters | In the earlier audit? |
|---|---|---|---|
| Fantasy tileset - 2D Isometric V1.1 | 229 MB | 4 humans, 3 skeletons | Yes |
| 2D Orcs and Goblins - TopDown - V1.0 | 332 MB | 12 orcs, 15 goblins on foot, 2 goblin wolf riders, 2 wolves | Yes, counted as 17 goblins |
| 2D Demons - TopDown assetpack v1.1 | 236 MB | 10 imps, 13 spawn, 6 elites, 5 beasts | Yes |
| 2D Zombie pack 2 - Top down v1.1 | 287 MB | 42 zombies | Yes |
| Stand-alone Character creator - 2D Fantasy V1.3 | 801 MB | 3 bodies, 129 gear and effect parts | Owned, not inspected until now |
| 2D HD Undead pack 1 | 727 MB | 9 undead | No, new |
| 2D HD Character Knight | 14 MB | 1 knight | No, new |

Also in the folder and not usable: `Asset Pack` (UI and map pieces from another game style, 3 MB) and `Free demo!` (one picture).

## The format every sheet shares

- One PNG per animation. Each PNG is a grid of 128 px frames with 8 rows, one row per facing direction.
- Most sheets are 15 frames wide. Some are shorter: Block is 6 or 7 frames, and a few attacks are 8 or 10. An importer must read the frame count from the image width (width divided by 128).
- Two undead (Brute, DeathLord) use 192 px frames because they are bigger.
- The orc, goblin, demon and zombie packs ship each character twice: once with shadow and effects painted in, and once with the body, the shadow and the effects as three separate files.
- Animation names are not the same from sheet to sheet in the pre-baked packs. Examples: `Idle`, `Idle 1`, `Idle 1 16bit`; `Run Attack` and `Attack Run`; `Strafe Left` and `Strafe Left 1`; 9 orcs have `Strafe Backwards 3` where the others have `Run Backwards`. An importer for them needs a name table per sheet. The Creator's parts all use the same 30 names.

## Which sheets can block and dodge (D18)

Block means a block animation. Dodge means a roll or slide animation.

| Source | Block | Dodge | Notes |
|---|---|---|---|
| Orcs (12) | All 12 | Roll and Slide on all 12 | Back flip on 9 |
| Goblins on foot (15) | 13. Missing on Goblin 05 and 10 | Roll and Slide on all 15 | The two without Block are the spearmen |
| Goblin wolf riders (Goblin 11, 12) | No | No | They use the wolves' 14 animations |
| Tileset humans and skeletons (7) | No | No | Strafe left and right only. 24 animations, riding included |
| Character Creator bodies | No | Rolling, Slide | 30 animations: the tileset's 24 plus Attack6, Kick, Rolling, Slide and two riding attacks |
| Knight (1) | Yes | Rolling, Slide | 29 animations |
| Undead pack (9) | Yes | Rolling | 29 to 32 animations, with CastSpell and a bow shot |
| Demons (34) | All but Imp 6 | Roll and Slide on all | |
| Zombies (42) | No | No | Bite, crawl, rise from the ground |

After D121 every slice character uses the Character Creator row: no block animation, dodge covered.

## The Character Creator

The Creator is a Windows Unity program, but its art sits beside it as plain PNG files in `Fantasy Character Creator_Data/StreamingAssets/Spritesheets/`. There are 132 folders. Each folder is one part drawn across all 30 animations, in the same 128 px grid as the other packs. Godot can draw a character by stacking these files. The Creator program is not needed.

- The parts are drawn in grey. The program colours them, so Godot has to colour each part too (a tint per part). A few parts have colour already painted in.
- Bodies: `NakedBody` is a human, `NakedBody2` a skeleton, `NakedBody3` a spirit. There is no orc or goblin body. D121 makes an orc or goblin by tinting the human body green and scaling it.
- The parts were counted exactly. The 25 melee parts and the 7 shields are named below (2026-11-16); the 69 wearable parts and the 7 ranged parts are not.
- The 30 animations include `AttackRun` and `AttackRun2` (seen in the zip's file list, not looked at): there is an attack while running (D170).

| Part | Count | What it is |
|---|---|---|
| Head | 23 | Hair, hats, hoods, helmets (Head11 does not exist) |
| Chest | 19 | Shirts, armour, robes, coats |
| Legs | 9 | Trousers, skirts, robes |
| Shoes, Hands, Belt | 5, 4, 2 | |
| Bag | 7 | Backpacks, and 3 pairs of wings (Bag7 does not exist) |
| Melee | 25 | Swords, axes, maces, clubs, spears and polearms |
| Ranged | 7 | Bows and crossbows. Some may be guns: 3 `GunFire` effect folders exist |
| Shield | 7 | |
| Offhand, Magic | 2, 3 | Magic is a coloured spell effect drawn on the caster (purple, yellow, cyan) |
| Mount | 5 | Horse, ram, bear, wolf, spider |
| Effect, Slash, GunFire, Shadow | 5, 2, 3, 1 | `Effect1` to `Effect5` not looked at |

## The Creator's weapons and shields, named (2026-11-16)

Named by Claude by eye, from each part's `Idle` sheet enlarged 8 times, facing east and south-west. A weapon is 1 to 13 px thick on a character about 45 px tall, so treat a "?" as a guess. Michael has not confirmed the names. Sheets to check by eye: `_art-check/cc_melee_1-8.png`, `cc_melee_9-16.png`, `cc_melee_17-25.png`, `cc_shields_1-7.png`; the 32 `Idle` sheets are in `_art-check/creator-parts/`.

Length is the part's width in the east-facing frame, in pixels. Every weapon is held in the same pose, so nothing in the art says one-handed or two-handed: that follows from length and is a decision (D171), not a fact here. The skill is the D151 skill the shape suggests.

| Part | What it is | Length | Skill |
|---|---|---|---|
| Melee1 | Dagger | 16 | Swords |
| Melee2 | Long, thin, straight sword with a cross guard (the test game's sword) | 34 | Swords |
| Melee3 | Thin straight blade, shorter: a short sword | 25 | Swords |
| Melee4 | Broad blade with a square tip: a cleaver | 23 | Swords |
| Melee5 | Broad sword, wide blade | 28 | Swords |
| Melee6 | Two curved blades, one each side of the hand | 40 | Swords ? |
| Melee7 | Curved blade: a sabre | 22 | Swords |
| Melee8 | Big dark sword with a wide guard: a great sword | 34 | Swords |
| Melee9 | Short shaft with a small head: a light hammer or pick ? | 20 | Maces ? |
| Melee10 | Axe, one blade | 22 | Axes |
| Melee11 | Long-shafted axe with a heavy head | 36 | Axes |
| Melee12 | Shaft with a round ball head: a mace | 27 | Maces |
| Melee13 | Scythe | 29 | none fits (a farm tool) |
| Melee14 | Axe with two blades | 28 | Axes |
| Melee15 | Axe with a long, sweeping blade | 23 | Axes |
| Melee16 | Big square striped head: a war hammer or maul | 30 | Maces |
| Melee17 | Short shaft with an L-shaped head: a pick ? | 22 | Maces ? |
| Melee18 | Sickle | 13 | none fits (a farm tool) |
| Melee19 | Long staff with a curled head: a crook | 36 | none fits (a staff) |
| Melee20 | Long shaft with a forked head: a pitchfork or trident | 39 | Spears |
| Melee21 | Long shaft with an ornate pronged head: a staff ? | 35 | none fits ? |
| Melee22 | Shaft with a spiked head: a morning star | 23 | Maces |
| Melee23 | Long shaft with a large spiked head: a halberd ? | 37 | Spears ? |
| Melee24 | Long plain shaft with a small point: a spear | 41 | Spears |
| Melee25 | Long shaft with a broad blade at the end | 37 | Spears |

So by eye: 8 swords, 4 axes, 3 to 5 maces and hammers, 3 to 4 spears and polearms, 2 or 3 staffs, and 2 farm tools (scythe, sickle). Useful for backgrounds (D152): the crook for a Herder, the axe (Melee10) for a Woodcutter, a pick or hammer for a Labourer. No club was seen, though the list above this section says "clubs".

| Part | What it is |
|---|---|
| Shield1 | Round, with a boss in the middle (the test game's shield) |
| Shield2 | Ragged outline with dark jagged marks: hide or bone ? |
| Shield3 | Triangle, plain, with a rim |
| Shield4 | Flat top and pointed foot, with a dark red cross painted on it. The cross is in colour, not grey, so a tint will not remove it |
| Shield5 | Flat top and pointed foot, plain, with a rim |
| Shield6 | Round, with dark swirling marks |
| Shield7 | Tall rectangle of planks, with rivets |

Shield4's cross is an emblem: whether a painted emblem belongs in the world is Michael's call (not asked yet).

**Item pictures that match (2026-11-16):** the code-made item drafts (`docs/art-experiments.md`) line up with these parts: round shield A with Shield1, metal shield B with Shield5, plank shield C with Shield7; sword A with Melee2, sword C (one edge, clipped point) with Melee4, sword B (leaf-shaped) nearest to Melee5. Added the same day (D221): the axe with Melee10, the mace with Melee12, the spear with Melee24. Seen from all 8 sides, Melee24 is about 58 px long (the 41 above is its foreshortened E view), Melee10 about 25 and Melee12 about 31.

## The tileset's props, named (2026-11-16)

Named by eye from the `_S` rotation; **not confirmed by Michael**. Source: `Fantasy tileset - 2D Isometric V1.1.zip`, `Environment/Misc A1` to `Misc E11`, each in 4 rotations (`_N/_E/_S/_W`), 256 px frames. These are the "99 props" above (there is no `Misc B4`). On the Mac: the `_S` of each in `~/Downloads/Assets/_art-check/tileset-misc/`, contact sheets `_art-check/tm_A.png` to `tm_E.png` (name order, no labels; `tm_B` skips B4), rocks in `tm_stones.png`. Bought art: never commit. A `scripts/art/tileset_props.json` like `creator_parts.json` is the natural home once code places props.

- **Misc A, pots and barrels (9):** A1 pile of bones and a skull · A2 clay jar with cork · A3 three clay jars · A4 stack of small jars · A5 big clay pot, stone lid · A6 clay pot, dark lid · A7 straw beehive (skep) · A8 wooden barrel · A9 three barrels
- **Misc B, town and camp (60):**
  - Goods and transport: B1 big crate · B2 crate pile · B3 tall crate stack · B5 empty hay cart · B6 loaded cart (sacks, pots) · B7 water trough · B8 firewood pile · B9 wheelbarrow · B13 plank ramp · B25 plank ramp · B58 log · B59 ladder · B48 wooden crane with winch
  - Market: B10 stall, red awning · B11 vendor cart with canopy · B12 lean-to, pink cloth · B14 stall, blue awning, goods · B17 stall, red, cloth goods · B18 stall, yellow, weapons on a rack · B19 stall, green · B20 tub of greens · B37 canopy, red · B38 canopy, blue (wall canopies: the side in the name is the edge of its own tile it is fixed to, so one over a wall that faces south-west is `_N` on the tile in front of that wall, and `_W` in front of a wall that faces south-east; draw it after a character on its tile) · B39 rug, red · B40 rug, blue
  - Shop signs, hanging: B30 anvil (smith) · B31 tankard (tavern) · B32 crossed swords (weapons) · B33 apple (food) · B34 flask (alchemist) · B35 stacked coins or bricks (unsure) · B36 shield (armour) · B52 empty sign post
  - **Notice board (D130): B54** (a blank board on two posts) · B24 signpost
  - Furniture: B26 bench · B27 wooden settle or crib (unsure; not clearly a bed) · B28 table with tools (workbench) · B51 glass-front cabinet · B60 spinning wheel · B61 alchemist's desk with bottles · B16 grindstone · B21 hide-drying rack
  - Tents: B41 small ridge tent, yellow · B43 pavilion, yellow · B46 pavilion, red · B47 small ridge tent, red
  - Town: B42 well · B44 banner on a leaning pole · B45 banner standard · B55 watchtower · B56 watchtower with banner · B57 archery target · B15 training dummy with sword and shield
  - Shore: B49 small sailboat · B50 rowboat with crates (no jetty)
  - Death and justice: B22 coffin, closed · B23 coffin, open · B29 gallows · B53 stocks
- **Misc C, stone and metal (14):** C1 broken rock pillar · C2 anvil · C3 **cannon** · C4 cannonball pile · C5 cat statue · C6 winged statue · C7 stone pillar · C8 stone brazier with coal · C9 stone sarcophagus or altar · C10 broken stone throne · C11 standing stone · C12 iron cage · C13 iron cage, open · C14 stone ring (a round arch, portal-like)
- **Misc D, banners (5):** D1 to D5 hanging cloth banners on a bar (pale, dark grey, narrow, pale, ragged)
- **Misc E, straw (11):** E1 to E4 hay bales (single, stacked, upright, tumbled) · E5 to E11 dry bushes and straw tufts
- **Stone A, rocks (22, not props):** A1 boulder · A2 mossy boulder · A3 rocks on dirt · A4 broken monolith · A5 stone cross · A6 to A8 round stone pool (water, empty, red) · A9 to A11 rubble, ruined wall (A11 with posts) · A12 rock · A13 gravestone · A14 grave pillar · A15 cross gravestone · A16 blue crystal · **A17 to A20 ore rocks:** copper-brown, coal-black, dark with red flecks (iron?), gold · A21 red crystal · A22 purple crystal

What this means for missing art:
- **Owned, not to draw:** the notice board (B54), shop signs (B30 to B36), market stalls, boats, a well, benches, a workbench, a cabinet, gravestones (humans' doorstone burial, D104), ore rocks for crafting later (D141).
- **Drawn by code since (2026-11-17):** Oldscar's cliff (D234, branch `art/oldscar-cliff`), the sack for ground loot (D238), a bed, a stool, a table, a counter and shelves, the arrow in flight.
- **Still missing:** ~~a jetty~~ (code-made since). **Interior floors checked (2026-11-20):** the set has plank floors (Ground F1 to F4), square stone tiles (H1, H4, H9 to H11), flagstones (D1), cobbles (E1) and earth (A1, C3); Michael chose a full code-made floor set anyway, plus straw on earth, a hearth's flags and a doorstep (`scripts/art/floors.mjs`, `docs/art-experiments.md`).
- **Michael's call:** the cannon and cannonballs (C3, C4) are gunpowder. Not modern like D81's zombies, but maybe off for this world.
- Not checked: the other three rotations, whether props line up on the tile grid at our scale.

## The tileset's buildings: walls, roofs, doors, roads (2026-11-20)

From `Fantasy tileset - 2D Isometric V1.1.zip`, `Environment/`, laid out by `scripts/art/buildings.mjs`. **Not confirmed by Michael.**
- **Roofs: 57 pieces,** so roofs need no drawing (open question on D189 and D208). Families: A thatch, B a bare timber frame, C red tile, D blue slate, E shingle, F planks; G1 a stone chimney.
  - In C, D, E and F the numbers mean: **1** a slope over one tile · 2 its upper half · 3 its lower half · 4 a valley (an inside corner, for an L-shaped roof) · 5 a whole gable roof one tile deep · **6 a hip corner** · 7 a hip end for the one-tile roof · 8 a slope with a small dormer (its sides are named a quarter turn off) · 9, 10 broken (ruins). Thatch (A) is numbered differently: A1 and A8 are full slopes.
  - `_S` and `_E` face the viewer (left and right); `_N` and `_W` are the far slopes, seen edge-on.
  - Each row climbs 64 px and its lower lip lies over the row below. A building 2, 4 or 6 tiles deep gets a ridge 64, 128 or 192 px above its walls.
  - **A hip roof** (four slopes) is the corner piece 6 on each diagonal, lifted 64 px a step, with slope 1 between. A square building gets a pyramid.
- **Walls: 104 pieces in 7 families.** A stone ruins and stairs · B palisade and log fences · C log cabin · D pale stone with dark timber · E bare timber posts, braces and picket fences · F darker stone with orange timber · G planks.
  - D and F share their numbers. **With a stone foot (ground floors):** 1 plain · 2 corner · 3 a post in the middle · 4 a post at each end · 7 window.
  - **On a timber sill, no foot (timber houses, upper storeys, gables):** 8 plain · 9 plain with a post · **10 corner** · 11 corner with braces · 12 a rail across · 13 to 15 braces · 16 window.
  - 5 a flat lintel, 6 an arched one (fits Door A1) · 17 to 19 gable pieces.
  - C (logs) and G (planks) have no gable. G has no arched lintel, so a door doesn't fit in it.
- **Doors:** A1 wood (arched), A2 a narrow one, C1 to C6 iron gates and grilles.
- **How they fit:**
  - A wall stands on one edge of its tile, the side its name ends with (`_S` south-west, `_E` south-east, `_N` north-east, `_W` north-west). A corner piece holds two edges and is named for its corner (`_W` back, `_N` right, `_E` front, `_S` left).
  - A storey is 132 px. **An upper storey** is the timber-sill pieces lifted 132: the sill reads as the beam between floors. A wall with a stone foot up there shows a grey ledge.
  - A doorway is no wall on that edge, the arched lintel on top, and Door A1 in it. So D209's "no doorway piece" is half right: it takes two pieces.
  - **Gable ends:** the plain timber-sill wall (8) stacked a storey at a time and cut along the roof's slope; its sill makes the tie beam. The gable pieces (17 to 19) leave steps. Only the right gable is built: the left one faces away.
  - A banner (Misc D) hangs flat on a wall when turned one side on: `_E` on a south-west wall. Ivy (WallFlora A1 to A14) lies over a wall the same way.
- **Light and shadow (drawn by `buildings.mjs`, not in the pack):** the pieces are lit the same on every side, which reads as flat. The pack's props cast their shadows to the left, so the drafts darken the walls and slopes facing left (15 % and 10 %), shade the top of a wall under the eaves, and lay the building's shadow on the ground to its left front. The numbers are `LIGHT` in the script; in the game this would be a tint per piece and a shadow shape.
- **Shop signs (Misc B30 to B36)** hang from chains, but no piece in the pack holds them (B52 is a post with its own blank board). A bracket would be drawn by code.
- **Size:** walls are on edges, so every tile inside is floor. Ultima Online's smallest house and its small shops are 7 by 7 tiles with walls on tiles, so the drafts are houses 6 by 4, shops 8 by 6, a guard post 6 by 6 and a tower 4 by 4 with two storeys.
- **Ground and roads:** the pack's ground is layers. `Ground A1` is a dirt block; grass (A2), cobbles (E1) and slabs (H4, H9 to H11) lie over it; A3 to A9, E2 to E9 and H3, H5 to H8 are part-covered tiles for edges (A4 covers one edge, A3 two).
  - **I1 to I10 are dirt road blocks with cart ruts** (I1, I4, I5 straight; I2, I3 ends; I6 a pothole). `_S` runs along i, `_E` along j.
  - A22 to A24 are loose white stones with nothing under them: alone they are not a road (the first drafts' mistake).
  - The scene page makes its roads from these (`ROADS` in `scene.mjs`): `Track`, `Track verge` (grass creeping in on one side), `Footpath`, `Dirt`, `Dirt verge`, `Dirt corner`, `Cobbles`, `Cobbles in grass`, `Slabs`.

## The tests behind D121

All in `~/Downloads/Assets/_art-check/`.

| File | What it shows | Result |
|---|---|---|
| `creator_on_orc_test.jpg` | Creator gear drawn on a pack orc | Does not line up. The poses and animations differ |
| `creator_scaled_test.png` | Creator body tinted green at several sizes | Works. Size reads clearly next to a human |
| `both_orcs.png`, `both_goblins.png` | Pack sheets next to Creator orcs and goblins | Sizes can be matched. With no armour they look like different creatures |

Measured: the pack orcs are about 115% of the Creator body's height, and the pack goblins about 82%.

## What each pre-baked sheet holds

### Orcs (not used for characters, D121)

| Sheet | Look | Weapon |
|---|---|---|
| Orc 01 | Heavy spiked plate | Two axes |
| Orc 02 | Leather | Two bone cleavers |
| Orc 03 | Gold shoulder armour | One-handed blade or axe ? |
| Orc 04 | Hide tunic, no armour | Wooden club |
| Orc 05 | Orange cloak | Bow |
| Orc 06 | Bone mantle | Staff, casts magic |
| Orc 07 | Hide cloak over the whole body | None, casts magic |
| Orc 08 | Heavy plate | Sword and round shield |
| Orc 09 | Plate with red trim | Great sword |
| Orc 10 | Light armour | Two flails or maces |
| Orc 11 | Horned helmet, leather | Axe and shield |
| Orc 12 | Heavy spiked plate | Two dark blades |

### Goblins (not used for characters, D121)

| Sheet | Look | Weapon |
|---|---|---|
| Goblin 01 | Brown hat | Axe |
| Goblin 02 | Purple robe | None, casts magic |
| Goblin 03 | Orange hood | Bow |
| Goblin 04 | Brown cap | Sword and round shield |
| Goblin 05 | Red cap | Spear (no Block) |
| Goblin 06 | Plate armour | Sword and large round shield |
| Goblin 07 | Red hood | Two blades |
| Goblin 08 | Red hood, dark robe | Crook staff, casts magic |
| Goblin 09 | Red hood | Bow |
| Goblin 10 | Red hood | Spear (no Block) |
| Goblin 11 | Rider on a tan wolf | Club and shield ? |
| Goblin 12 | Rider on a grey wolf | Bow ? |
| Goblin 13 | Orange hood | Wooden club |
| Goblin 14 | Horned helmet, bone armour | Mace and shield |
| Goblin 15 | Heavy dark plate, large body | Axe or halberd |
| Goblin 16 | Bare chest, large body | Sword |
| Goblin 17 | Brown tunic | Two curved blades |

Goblin 15 and 16 are drawn about as big as an orc. `Animal 1` is a grey wolf and `Animal 2` a tan wolf.

### Tileset humans and skeletons

| Sheet | Look | Weapon |
|---|---|---|
| Player | Red-haired fighter | Spear and round shield |
| NPC1 | Woman, blue hood, dress | None (punches) |
| NPC2 | Dark hooded cloak | None (punches) |
| NPC3 | Bald, bearded man | Hand axe |
| Enemy 1 | Skeleton | Sword |
| Enemy 2 | Skeleton in a purple hooded robe | Staff, casts magic |
| Enemy 3 | Skeleton | Sword and wooden shield |

### Not in the slice

- **Knight:** one armoured knight with sword and shield.
- **Undead pack:** Brute (huge, great sword), DeathLord (winged, flaming sword), DarkKnight (sword and shield), Berserker (two-handed axe), Archer and DarkArcher (bow), Warrior (spear and shield), Necromancer and Wizard (staff, magic).
- **Demons:** imps are small, spawn are human-sized, elites are large. Between them they carry swords, axes, maces, scythes, bows, shields and staffs. The 5 beasts carry nothing.

## Zombies: which are modern (D81)

| Group | Sheets | Verdict |
|---|---|---|
| Cop 01 to 04, Fireman 01 to 02, Soldier 01 to 05, Worker 01 to 03 | 14 | Modern: uniforms, hard hats, guns |
| Radioactive 01 to 04 | 4 | Listed as modern in D81. Glowing green bodies, no modern clothes |
| Zombie 01 to 10 | 10 | Not decided. Plain everyday clothes. 02 (mohawk), 05 and 07 (hooded sweatshirts) and 09 read as modern |
| Decay 01 to 05 | 5 | Fantasy-safe. 01 and 04 are crawling torsos with their own 13 animations |
| Swamp 01 to 09 | 9 | Fantasy-safe. 01 and 09 carry a blade |

So 18 sheets are out by D81, 14 are safe, and 10 need Michael's call.

## Covered faces and bodies (D29)

The art cannot settle this. A head is about 8 pixels wide, so a covered face and a bare one look almost the same. "Covers face" has to stay a property written on the item (D40), not something read from the picture.

Best guesses:

- **Creator heads:** Head12, 13, 14, 15, 19, 20, 21 and 23 look like full helmets, masks or deep hoods.
- **Creator bodies covered:** Chest13 and 14 (long coats or robes).
- **Tileset:** NPC2's hood puts the face in shadow. Enemy 2 wears a hood.
- **Demons and undead:** dark hoods, masks or closed helmets on Demon Spawn 1, 4, 7, 8, 9, 11, 13, Elite 2, 3, 6, Imp 6, 8, DarkKnight and Necromancer.
- **Pack orcs and goblins:** no sheet clearly hides the face.

## Questions this opened, and where each stands

| Question | Status |
|---|---|
| How does a character block? | Answered by D207: a white flash with a sound made in code |
| What does an orc or goblin look like when its gear changes? | Answered by D121: it wears Creator parts like a human |
| Are Zombie 01 to 10 modern? | Open |
| Are the goblin wolf riders used? | Not as pack sheets (D121). The Creator has a wolf mount if riders are wanted later |
| Do the Creator's ranged parts include guns? | Answered 2026-11-16: all 7 are bows (`scripts/art/creator_parts.json`, PR #25) |
| What are the 25 melee and 7 shield Creator parts, one by one? | Named by eye on 2026-11-16 (section above); Michael has not confirmed |
| What are the 69 wearable and 7 ranged Creator parts, one by one? | Named by eye on 2026-11-16 in `scripts/art/creator_parts.json` (PR #25); Michael has not confirmed |
| What are the tileset's 99 props? | Named by eye on 2026-11-16 (section above); Michael has not confirmed |

The short version: all slice characters come from the Character Creator (D121), dodge is covered, and a block is a white flash with a sound (D207).
