# Characters in production: the plan and the tools

**Status (2026-11-22): the tools are built and tried. Nothing here is a decision (D##); the open points are at the end.**

Follows `docs/art-layered-characters.md` (how a layered character works), `docs/art-style.md` (camera, sun, ramps, outline) and `docs/races/goblin.md`.

Michael, 2026-11-21, 8:43 PM:

> "We're moving to production: many animations, armours, clothes, weapons, races. Before adding assets, build the tooling and the plan:
> 1. Intake tool: one command per new asset (body, clothing piece, weapon, animation) that imports it, fits it to each race it applies to, renders, finishes, runs the pixel checks, and makes a contact sheet for my approval.
> 2. Wardrobe catalogue (one data file): every part with its slot, races, colour ramps, source, licence and credit line. CREDITS.md generated from it.
> 3. Animation list: from the game's code/design, list what animations the game needs (per weapon family too), and for each one the source (Universal Animation Library 1/2, or Mixamo for what they lack).
> 4. Render budget: a running estimate of total render time per race as the catalogue grows, so I can see the cost of each addition."
>
> "Show me the plan and the tool on ONE weapon (a Quaternius sword) end to end."

Also his: "Keep every skin colour as a variant ramp (grey-teal, the greens, all of them); I'll choose defaults later." Done: the goblin's `colours.skin` in the wardrobe lists all five.

## What is built

| What he asked | Where | The command |
|---|---|---|
| 1. Intake tool | `scripts/art/intake.mjs` | `node scripts/art/intake.mjs <part or animation>` |
| 2. Wardrobe catalogue | `scripts/art/wardrobe.json` | `node scripts/art/wardrobe.mjs check` · `credits` |
| 3. Animation list | in the wardrobe, under `animations` | `node scripts/art/wardrobe.mjs animations` |
| 4. Render budget | counted from the wardrobe | `node scripts/art/wardrobe.mjs budget` |

Under them: `scripts/art/held_gear.py` (a weapon from its own model file into a hand), `scripts/art/sheet.mjs` (the contact sheet), and `paperdoll.mjs`, which now reads a race's rules from the wardrobe (`--race human|goblin`; the two files in `scripts/art/paperdoll/` are gone).

**No picture changed by this:** the 660 human and 60 goblin layer pictures made before come out the same, pixel for pixel, with the rules read from the wardrobe (`pixdiff.mjs`).

## 1. The intake: one command per asset

```
node scripts/art/intake.mjs --new arming_sword --kind weapon --family one_handed --source quaternius_weapons --file Sword.gltf
node scripts/art/intake.mjs arming_sword                    # again later: a new race, a new animation, a fix
node scripts/art/intake.mjs swing                           # an animation: every part of every race that is in it
node scripts/art/intake.mjs arming_sword --status approved  # Michael's verdict, written into the wardrobe
```

`--new` writes the part's line in the wardrobe, then goes on. Seven steps, each printed as it is done:

| Step | What happens | It stops when |
|---|---|---|
| 1 import | The wardrobe is checked. The model file is found. For a held thing its length, width, handle end and grip are measured. | A material has no ramps in the wardrobe; the file is not there. |
| 2 fit | A race whose model came on another skeleton is put on ours, once (`onto_our_rig.py`). A held thing is put in that race's hand and sized for that race. | The fitted model cannot be made. |
| 3 render | `character.py`, with the race's own settings from the wardrobe, 256 samples, 15 pictures: the part lit on the race's dressed body, and one render of the whole for the proof. | A picture is missing. |
| 4 finish | Layer pictures and their shadows (`paperdoll.mjs`). | A pixel's ramp is not one of the race's. |
| 5 check | See below. | |
| 6 sheet | One PNG to approve: worn (enlarged, with outline and shadow), the layer alone, every picture at the game's size, the checks, the cost. | |
| 7 budget | What the race costs to render now. | |

It ends with `PASS` or `FAIL` (exit code 1).

**The checks:**

| Check | Passes when |
|---|---|
| In the frame | No pixel within 2 px of the 256 px picture's edge (room for the outline). |
| Seen | The part has pixels in at least one picture. |
| Layers against one render | The layers laid over each other show the same surface as ONE render of the same things, at every pixel (0 wrong). |
| A tone off (a note, not a pass or fail) | The share of pixels with the right surface and a neighbouring tone: the light parts throw on each other. A held thing shades the body; Michael accepted that ("Shield shadow on the body: accept, no fix"; 8 to 17 % measured then). |
| Drawn by Godot | Godot's own shader (`doll.gdshader`) draws the 15 pictures the same as `paperdoll.mjs`, pixel for pixel. |
| Against the last intake (a note) | Says if a part taken in again came out the same. |

**What each kind of asset needs:**

| Asset | Its line in the wardrobe says | The intake does |
|---|---|---|
| Body (a new race) | The race block (slots, ramps, its render settings, a `fit` if its skeleton is not ours) and one or more body parts. | Fits the model to our skeleton, renders the body in the animations asked. |
| Clothing, armour, hair | `meshes` (the objects of the race's loaded files), `slot`, `races`, `materials`. Its model file is added to the race's `render.models`. | Renders it lit on the dressed body, minus what sits in its own slot and what it hides. |
| Weapon, shield | `file`, `family`, `bone`; `hold` if the handle is not found right. `races: "all"`. | Measures it, puts it in each race's hand at that race's `gear_scale`, renders it in the animations of its family. |
| Animation | `action`, `source`, `for` (weapon families, or everyone). | Renders every part of the race in it, then writes the side under `made`. |

**A weapon in the hand** (`held_gear.py`). Nobody tells a model file which end is the handle, so it is measured: the longest side is the length; the widest place along it is a sword's guard or an axe's head. A sword is held midway between its near end and the guard (`"handle": "near_widest"`); an axe, mace or spear a quarter up from the far end (`"far_from_widest"`, `"grip": 0.25`). It sits in the fist as the stand-in sword does. The model is not changed: moved, turned and sized as one piece.

**Not built:**
- **Mixamo animations.** A Mixamo animation has Mixamo's skeleton; ours is Quaternius's. A model is moved over by `onto_our_rig.py`, an animation is not yet. Needed only for what both libraries lack.
- **Shields, two-handed weapons and bows from a model file.** The shield's hold ("strap") is written and not tried on a real file. The off hand on a two-handed grip and a bow held upright are not written.
- **The other seven sides.** Everything so far faces south-east. `--sides all` renders the eight; the turns are in the wardrobe.
- **Sheets for the game.** The game's own character view does not use the layers yet (`character_view.gd`), and nothing packs layer pictures into sheets.

## 2. The wardrobe: one data file

`scripts/art/wardrobe.json`. Five blocks:

| Block | Holds |
|---|---|
| `render` | What every render shares: 8 sides and their turns, 15 pictures, 256 samples, the measured seconds a part and picture. |
| `sources` | Every pack: title, author, licence, link, **credit required or not, the credit line**, whether we have it, its folder. |
| `races` | Slots, the bare body, the outfit a new part is tried on, ramps, which colours swap (the goblin's five skins), render settings, `gear_scale`. |
| `animations` | The animation list (below). |
| `parts` | Every part: kind, slot, races, source, meshes or file, **which ramps each material may take**, status (trial, approved, stand-in, rejected). |

- **`CREDITS.md` is written from it:** `node scripts/art/wardrobe.mjs credits`. Only sources something is made from today are listed. Never edit `CREDITS.md` by hand.
- **`node scripts/art/wardrobe.mjs check`** reads the file against itself and against `style.mjs`, and says if `CREDITS.md` is stale. A source whose licence asks for credit and has no credit line fails the check, and so fails every intake.
- A part's licence and credit are its source's: one place.

## 3. The animation list

Read from `docs/decisions.md` and the game's code. **The game plays `Idle` and `Walk` today**; the rest comes from the decisions named in each row.

| Animation | For | Needed | From | Why | Made |
|---|---|---|---|---|---|
| idle | everyone | first game | Universal Animation Library: Idle_Loop | Standing (the game's Idle). Approved for the Peasant as idle_alert; a relaxed idle is still to be found. | human SE, goblin SE |
| walk | everyone | first game | Universal Animation Library: Walk_Loop | Walking (D226). Open: the game walks a tile in 0.60 s, this walk in 1.57 s. | human SE, goblin SE |
| run | everyone | first game | Universal Animation Library: Jog_Fwd_Loop | Running, a tile in 0.30 s (D226, D228). Sprint_Loop is the other candidate. | no |
| hit | everyone | first game | Universal Animation Library: Hit_Chest | Taking a hit (D161, D163: TakeDamage). Hit_Head is a second one. | no |
| dodge | everyone | first game | Universal Animation Library: Roll | A dodged attack (D162, D163: Rolling or Slide). | no |
| death | everyone | first game | Universal Animation Library: Death01 | Dying; its last picture is the corpse, which stays in the world (D3). | no |
| use | everyone | first game | Universal Animation Library: Interact | Opening a chest or a door, taking from a corpse (D2, D232). PickUp_Table is a second one. | no |
| bandage | everyone | first game | Universal Animation Library: Fixing_Kneeling | The bandage, 4 seconds (D164, D169). A stand-in: the library has no bandaging. | no |
| talk | everyone | first game | Universal Animation Library: Idle_Talking_Loop | Asking an NPC, NPCs talking to each other (D23). | no |
| punch | unarmed | first game | Universal Animation Library: Punch_Jab | Unarmed attack (D171). Punch_Cross is a second one. | no |
| guard | one-handed | first game | Universal Animation Library: Sword_Idle | Standing with a weapon drawn, in a fight (D17: attacks repeat on their own, so a fighter waits between them). | human SE, goblin SE |
| swing | one-handed | first game | Universal Animation Library: Sword_Attack | A full swing: sword, axe, mace (D224: Attack1). | human SE, goblin SE |
| swing_run | one-handed | later | none found | A chaser hits a runner (D170). Not needed if the normal swing is played on the move, which D170 allows; legs that run under a swing would be a new animation, mixed from two. | no |
| thrust | spear | first game | Universal Animation Library 2 (which action: not known yet); if it has none, Mixamo animations | The spear's lunge, point leading (D224: Attack6). The first library has no thrust. | no |
| swing_two | two-handed | first game | Universal Animation Library 2 (which action: not known yet); if it has none, Mixamo animations | A slow, heavy two-handed swing (D171). The first library has none. | no |
| shoot | bow | first game | Universal Animation Library 2 (which action: not known yet); if it has none, Mixamo animations | Drawing and loosing a bow (D171). The first library only has a pistol. | no |
| asleep | everyone | later | Universal Animation Library 2 (which action: not known yet); if it has none, Mixamo animations | Lying asleep: a newcomer in the waking place (D71). Not for a player who has left: that character leaves the world (D49). The first library has no lying pose but Death01's end. | no |
| sneak | everyone | later | Universal Animation Library: Crouch_Fwd_Loop | Stealth, after the slice (D151). With Crouch_Idle_Loop. | no |
| sit | everyone | later | Universal Animation Library: Sitting_Idle_Loop | Sitting, with Sitting_Enter, Sitting_Exit and Sitting_Talking_Loop. | no |
| cast | everyone | later | Universal Animation Library: Spell_Simple_Shoot | Magic, after the slice (D24, D151). With Spell_Simple_Enter, _Idle_Loop and _Exit. | no |
| torch | everyone | later | Universal Animation Library: Idle_Torch_Loop | Holding a light at night. | no |
| swim | everyone | later | Universal Animation Library: Swim_Fwd_Loop | No swimming in the first game (D102). | no |
| work | everyone | later | Universal Animation Library 2 (which action: not known yet); if it has none, Mixamo animations | Trades, once crafting is in (D141): chopping, hammering, farming, fishing. The second library's pages name farming and fishing. | no |
| ride | everyone | later | none found | Riding a mount. Neither library says it has it; not looked for yet. | no |
| block | everyone | never | none found | A block is a white flash and a sound, no animation (D207). | no |

**Per weapon family** (D171: unarmed, one-handed, two-handed, bows; D224: the spear thrusts):

| Family | Skills (D151) | Its animations | Source |
|---|---|---|---|
| unarmed | Unarmed | punch | Library 1 |
| one-handed | Swords, Axes, Maces | guard, swing | Library 1 |
| spear | Spears | thrust | Library 2, not known yet |
| two-handed | Swords, Axes, Maces | swing_two | Library 2, not known yet |
| bow | Bows | shoot | Library 2, not known yet |
| shield | Shield | none of its own: it is carried in the one-handed ones. A block is a flash, no animation (D207). | |

- **Library 2's action names are not known.** Its page names groups (melee combos, farming, fishing), not actions. When the file is here, `character.py --list` prints them and the four rows get their action.
- **Mixamo** only for what both libraries lack. Likely: the bow shot, the two-handed swing, lying asleep.
- **Stand-ins to judge by eye:** the bandage is "Fixing_Kneeling"; the run is "Jog_Fwd_Loop" ("Sprint_Loop" is the other).

## 4. The render budget

```
node scripts/art/wardrobe.mjs budget
node scripts/art/wardrobe.mjs budget --plus "clothing=20,weapon.one_handed=6,animation=4"   # what an addition would cost
```

**One part in one animation = 8 sides x 15 pictures x the measured seconds.** A part is rendered in every animation made for everyone, and a held thing also in its own family's.

As the wardrobe stands today (`budget`):

| Race | Parts | Animations (first game / all) | First game | Everything listed |
|---|---|---|---|---|
| human | 11 | 15 / 24 | 1.9 h | 3.2 h |
| goblin | 1 | 15 / 24 | 0.2 h | 0.3 h |

| One more... | costs, per race (first game / everything listed) |
|---|---|
| piece of clothing, hair or body | 11 min / 18 min |
| weapon, one-handed | 8.1 min / 15 min |
| weapon, spear | 7.4 min / 13 min |
| weapon, two-handed | 7.4 min / 13 min |
| weapon, bow | 7.4 min / 13 min |
| shield | 8.1 min / 15 min |
| animation for everyone | human 8.1 min, goblin 0.7 min |

An example of a what-if (`--plus`; the numbers of parts are an example, not a plan):

```
with 20 more clothing, 4 more hair, 6 more weapon one_handed, 2 more weapon spear, 3 more weapon two_handed, 2 more weapon bow, 3 more shield for each race:
  human: first game 8.4 h (now 1.9 h), everything listed 14 h (now 3.2 h)
  goblin: first game 6.6 h (now 0.2 h), everything listed 11 h (now 0.3 h)
all races, first game: 15 h
```

- **The cost of an addition is printed by every intake** and written on its contact sheet.
- The seconds are measured by each intake (step 3 prints them) and kept in `render.seconds_per_part_picture`.
- Not counted: the one extra render of the whole that each intake makes for its proof (about one more part).

## Sources to plan for

| Source | Licence | Have it | For |
|---|---|---|---|
| Quaternius Universal Base Characters | CC0 | yes | The human body, hair. |
| Quaternius Modular Character Outfits - Fantasy | CC0 | yes | The humans' clothes and armour. |
| Quaternius Universal Animation Library 1 | CC0 | yes | 43 actions; 17 of the list's animations. |
| Quaternius Universal Animation Library 2 | CC0 | **no** | Thrust, two-handed swing, bow shot, lying, trades (to check). |
| Quaternius Medieval Weapons | CC0 | **no** | Weapons and shields, shared by every race. |
| Quaternius Fantasy Props MEGAKIT | CC0 | **no** | Things in the hand that are not weapons (torch, tools). |
| Mixamo | Adobe's terms: free for games; the animation files may not be passed on | not used yet | Animations both libraries lack. Only rendered sprites ship. |
| "Goblin Simple" by marianofer1996 | CC BY 4.0, **credit required** | yes | The goblin's body. |

## Where the files are

| What | Where | In the repo |
|---|---|---|
| Model files, one folder per source | `/mnt/project-files/characters/models/` (`--assets`) | never |
| Renders and layer pictures, working copy | `scripts/art/out/wardrobe/` (`--store`) | no (git does not see it) |
| The lasting copy: one .tar per race, animation and side, and the sheets | `/mnt/project-files/characters/store/` (`--keep`) | never |
| The wardrobe, the tools, this plan | `scripts/art/`, `docs/` | yes |

- **The raw renders are kept** (Michael: "Keep the raw renders (before finishing)"): the .tar files hold them, so the look can be changed without a new render.
- The intake fetches from the lasting copy what the working copy lacks, and puts away what it made when its checks pass. One intake at a time for a race.

## The order proposed

1. **Michael settles the look** (point-sampled against the approved Peasant; open since 2026-11-21). Everything is rendered `--point` today; his answer may mean one re-finish.
2. **The first game's animations from Library 1**, south-east only, human and goblin: 12 intakes, about 2 minutes each.
3. **One weapon per family from the weapons pack** (sword, axe, mace, spear), then the rest.
4. **Library 2**: name its actions, fill the four rows, take them in.
5. **Clothes and armour**, set by set, each approved on its sheet.
6. **The other seven sides**, once 1 to 5 are approved on one side: this is where the hours of the budget are spent.
7. **The game**: its character view draws from layers (not built; a task for the Playbook Console).

## Shown end to end

**The Quaternius sword could not be run: the weapons pack is not in `~/Downloads/Assets` yet** (asked 2026-11-21, 8:46 PM; the cloud cannot reach quaternius.com or itch.io). In its place, a plain sword saved as a model file (`models/made_here/test_sword.glb`, lying on its side, three materials) went through the same command. It is not in the wardrobe.

```
node scripts/art/intake.mjs --new test_sword --kind weapon --family one_handed --source made_here --file test_sword.glb
```

| Step | Result |
|---|---|
| 1 import | 400 points, 1.06 long; guard found at 0.23 of its length, hand placed at 0.11; 3 materials, each given iron, wood, hide. |
| 2 fit | Human: in the right hand, 53.9 px long. Goblin: in its right hand at 0.5, 26.9 px long. |
| 3 render | 4 animations x 2 races, 15 pictures each, 256 samples: 10 to 26 s each, 2 minutes 20 in all. |
| 4 finish | 120 layer pictures and their shadows. |
| 5 check | All 8 pass. 0 pixels show another surface (of 12,009 to 32,024 a set). 0.4 to 2.9 % a tone off. Godot's shader: 0 pixels differ in 120 pictures. |
| 6 sheet | `/mnt/project-files/characters/pipeline/test-sword-contact-sheet.png` |
| 7 budget | A one-handed weapon adds about 8 min a race for the first game's animations. |

Before it, the eight animation intakes it stands on (idle, walk, guard, swing; human and goblin; south-east; 256 samples): all PASS, 13 to 72 s of rendering each. They are the first real use: `guard` and `swing` are new.

- **Proof against yesterday:** the nine human parts rendered at 256 samples on 2026-11-21 came out of the intake's idle the same, pixel for pixel (270 pictures, `pixdiff.mjs`). The Ranger's top and hood differ, as they should: they were made at 128 samples then.
- Also tried, at trial quality: a new piece of clothing by `--new ... --kind clothing` (the Ranger's trousers): PASS.
- **When the pack is here:** copy it to `models/quaternius_weapons/`, then the one command above with `--source quaternius_weapons --file <its sword>`.


## Open, for Michael

1. **The look** (as above).
2. **The goblin's weapon size:** `gear_scale` 0.5, from "Weapons scale with the body" (D121) and its height (48 px against 96). Its hand is as big on the screen as a man's, so 0.5 looks thin in its fist. To judge on the sheet.
3. **The goblin's default skin** and the others' tone steps (his: "I'll choose defaults later").
4. **Run:** jog or sprint. **Bandage:** the kneeling stand-in, or a Mixamo one.
5. **Which first-game animations a held thing is drawn in.** Today: all the ones made for everyone, and its family's. A sword in a roll or a death costs render time and may look wrong; the sheet of each will show.
