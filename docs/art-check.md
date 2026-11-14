# Art check: Renown

Checked: 2026-11-13, from the files in `~/Downloads/Assets`.

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
- The parts were counted exactly but not named one by one.

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
| How does a character block? | Open. After D121 it covers all three races. Candidates to render: `CrouchIdle`, the first frames of `TakeDamage`, a frozen `Idle` frame with a flash and a sound, `Special1`, `Taunt` |
| What does an orc or goblin look like when its gear changes? | Answered by D121: it wears Creator parts like a human |
| Are Zombie 01 to 10 modern? | Open |
| Are the goblin wolf riders used? | Not as pack sheets (D121). The Creator has a wolf mount if riders are wanted later |
| Do the Creator's ranged parts include guns? | Open. Look at the `Ranged` sheets at full size |
| What are the 25 melee and 69 wearable Creator parts, one by one? | Open. Render each larger and name it |

The short version: all slice characters come from the Character Creator (D121), dodge is covered, and how a character blocks is still to decide.
