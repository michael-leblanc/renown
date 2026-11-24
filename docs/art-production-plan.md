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

Under them: `scripts/art/held_gear.py` (a weapon or shield from its own model file into a hand or onto a forearm), `scripts/art/sheet.mjs` (the contact sheet), `scripts/art/lineup.mjs` (every weapon and shield on one numbered sheet, to approve or drop), and `paperdoll.mjs`, which now reads a race's rules from the wardrobe (`--race human|goblin`; the two files in `scripts/art/paperdoll/` are gone).

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
| 2 fit | A race whose model came on another skeleton is put on ours, once (`onto_our_rig.py`, which also turns its forearms and hands to lie as ours at rest). A held thing is put in that race's hand and sized for that race. **For every race body** (a body part, or a fit just made): the arms check. | The fitted model cannot be made; the arms check fails. |
| 3 render | `character.py`, with the race's own settings from the wardrobe, 256 samples, 15 pictures: the part lit on the race's dressed body, and one render of the whole for the proof. **A shield** is rendered as its arm carries it (the wardrobe's `shield_arm`), with the first weapon in the other hand, into the animation's variant `<anim>+shield`, and with it the parts that cover that arm (`"arms": true`). | A picture is missing. |
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
| **Arms at rest** (every race body) | Its forearms (elbow to wrist) and hands (wrist to knuckles, the knuckle line) lie within `arms_at_rest_deg` (1) of our skeleton's at rest (`onto_our_rig.py --check`). Goblin Simple as it came: 16 to 32 degrees off; as fitted now: 0. |
| **Clipping** (every shield) | In every picture, the shield's mesh crosses no face of anything seen with it: the body, the head, the clothes, the weapon in the other hand (`character.py` tests it with Blender's BVH trees and writes it in `anim.json`; the arm through its straps counts too, as the shield lies a hair off it). Michael, 2026-11-22: "in every frame, test whether the shield's mesh intersects the body's (and the head's, and other worn parts), and fail the frame if it does." |
| **Weapon angle** (every race but the human) | Each held thing points within `held_angle_deg` (5) of the way it points in the human's hand, in every picture of the same animation and side, measured in the figure's own space (`character.py` writes it in the render's `anim.json`). A race body is tried with the first weapon of its family in a weapon's animation, so it has this check too. |

**What each kind of asset needs:**

| Asset | Its line in the wardrobe says | The intake does |
|---|---|---|
| Body (a new race) | The race block (slots, ramps, its render settings, a `fit` if its skeleton is not ours) and one or more body parts. | Fits the model to our skeleton (arms aligned at rest), checks the arms, renders the body in the animations asked, with the first weapon in the weapons' animations, and checks its angle against the human's. |
| Clothing, armour, hair | `meshes` (the objects of the race's loaded files), `slot`, `races`, `materials`; `hides` (optional): the slots it covers, a list, or one list per race (`{"goblin": ["top"]}`: the mail shirt hides the goblin's shirt, not the human's tunic). Its model file is added to the race's `render.models`. | Renders it lit on the dressed body, minus what sits in its own slot and what it hides. |
| Weapon, shield | `file`, `family`, `bone`; `hold` if the handle is not found right. `races: "all"`. | Measures it, puts it in each race's hand at that race's `gear_scale`, renders it in the animations of its family. |
| Animation | `action`, `source`, `for` (weapon families, or everyone). | Renders every part of the race in it, then writes the side under `made`. |

**A weapon in the hand** (`held_gear.py`). Nobody tells a model file which end is the handle, so it is measured: the longest side is the length; the widest place along it is a sword's guard or an axe's head. A sword is held midway between its near end and the guard (`"handle": "near_widest"`); an axe, mace or spear a quarter up from the far end (`"far_from_widest"`, `"grip": 0.25`). It sits in the fist as the stand-in sword does, the same in every race's hand: the grip is made on a man's hand, and a hand whose knuckle line slants otherwise (the goblin's: 74 and 75 degrees against a man's 68.5) is given a man's slant. A shield (`"how": "strap"`) is worn as a real one: the forearm through a strap near the elbow (`"strap"`: 0.3 of the way to the wrist), the fist round a handle, its back along the forearm, its face outward (the way the back of the hand looks), its middle midway between strap and handle; once the figure is posed, its back is laid on the arm (`lay()`: 0.004 off the nearest point of the arm, hand and fingers, sleeves included); it follows the forearm alone. `"spin"` turns it about its face (the heater: -90, point down), `"flip"` when it would show its back. The model is not changed: moved, turned and sized as one piece.

**Not built:**
- **Mixamo animations.** A Mixamo animation has Mixamo's skeleton; ours is Quaternius's. A model is moved over by `onto_our_rig.py`, an animation is not yet. Needed only for what both libraries lack.
- **Two-handed weapons and bows from a model file.** The off hand on a two-handed grip and a bow held upright are not written. (Shields from a model file: built 2026-11-22, below.)
- **The shield arm everywhere.** Built for a shield's own intake (2026-11-22, below). Not yet: an animation's intake leaves shields out (it says so: each is taken in on its own); a new top or armour (`"arms": true`) is not yet rendered in the `+shield` variants by its own intake.
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
| guard | one-handed | first game | Universal Animation Library: Idle_Loop | Standing with a weapon drawn, in a fight (D17: attacks repeat on their own, so a fighter waits between them). Michael, 2026-11-22: "angle the blade slightly up and forward (ready stance, not pointing at the ground)". The library's Sword_Idle holds the sword hand back behind the hip (a sideways stance), so a blade raised forward from it passes into the body or hides behind the arm; and the second library's strikes start from, and end in, the plain idle's pose, not Sword_Idle's. So the guard is the plain idle with the wrist cocked 53 degrees (--add): the blade points forward and 55 degrees up, in front of the body, and the swing follows on from it. Michael, 2026-11-22, 1:18 AM: "keep the idle-based guard instead of Sword_Idle. Base it on idle_alert (the combat idle), not idle_relaxed." It is: idle_alert is the library's Idle_Loop as it is (docs/art-style.md), the action above. | goblin SE, human SE |
| swing | one-handed | first game | Universal Animation Library 2: Sword_Regular_A+Sword_Regular_A_Rec | A full swing: sword, axe, mace (D224: Attack1). Michael, 2026-11-22: "Pick: attack 1 (UAL2 Sword_Regular_A + A_Rec) as the one-handed swing", in place of the first library's Sword_Attack (a hop and a deep lunge: "The attack looks weird"). The strike (0.43 s) and its recovery (0.97 s) played one after the other, from the sword stance back to it. | goblin SE, human SE |
| swing_run | one-handed | later | none found | A chaser hits a runner (D170). Not needed if the normal swing is played on the move, which D170 allows; legs that run under a swing would be a new animation, mixed from two. | no |
| dash | one-handed | later | Universal Animation Library 2: Sword_Dash | A lunging strike, 1.57 s, from the sword stance back to it. Michael, 2026-11-22: "Keep Combo, Dash and Block in the animation list for later mechanics". | goblin SE, human SE |
| combo | one-handed | later | Universal Animation Library 2: Sword_Regular_Combo | Three strikes in a row (A, B, C), 3.0 s, from the sword stance back to it. B starts where A ends and C where B ends, so B and C cannot be played alone. Kept for later mechanics (Michael, 2026-11-22). | goblin SE, human SE |
| sword_block | one-handed | later | Universal Animation Library 2: Sword_Block | Raising the sword to block, 1.23 s, from the stance back to it. Michael, 2026-11-22: kept for later mechanics, "render Block too". Not the block of D207 (a white flash and a sound, no animation): that row stays as it is. | goblin SE, human SE |
| thrust | spear | first game | Mixamo animations (which action: not known yet) | The spear's lunge, point leading (D224: Attack6). Michael, 2026-11-22: "no thrust or two-handed attacks in UAL1/UAL2; plan Mixamo for spear and greatsword later." | no |
| swing_two | two-handed | first game | Mixamo animations (which action: not known yet) | A slow, heavy two-handed swing (D171), the greatsword's. Neither library has one (Sword_Heavy_Combo of the second is one-handed): Mixamo, later (Michael, 2026-11-22). | no |
| shoot | bow | first game | Mixamo animations (which action: not known yet) | Drawing and loosing a bow (D171). Neither library has one (the first has a pistol). | no |
| asleep | everyone | later | Universal Animation Library 2: LayToIdle | Lying asleep: a newcomer in the waking place (D71). Not for a player who has left: that character leaves the world (D49). LayToIdle of the second library starts lying and gets up: its first picture is the sleeper, the rest the waking. | no |
| sneak | everyone | later | Universal Animation Library: Crouch_Fwd_Loop | Stealth, after the slice (D151). With Crouch_Idle_Loop. | no |
| sit | everyone | later | Universal Animation Library: Sitting_Idle_Loop | Sitting, with Sitting_Enter, Sitting_Exit and Sitting_Talking_Loop. | no |
| cast | everyone | later | Universal Animation Library: Spell_Simple_Shoot | Magic, after the slice (D24, D151). With Spell_Simple_Enter, _Idle_Loop and _Exit. | no |
| torch | everyone | later | Universal Animation Library: Idle_Torch_Loop | Holding a light at night. | no |
| swim | everyone | later | Universal Animation Library: Swim_Fwd_Loop | No swimming in the first game (D102). | no |
| work | everyone | later | Universal Animation Library 2: TreeChopping_Loop | Trades, once crafting is in (D141). The second library has TreeChopping_Loop, Farm_Harvest, Farm_PlantSeed, Farm_Watering; no hammering, no fishing. | no |
| ride | everyone | later | none found | Riding a mount. Neither library says it has it; not looked for yet. | no |
| block | everyone | never | none found | A block is a white flash and a sound, no animation (D207). | no |

**Per weapon family** (D171: unarmed, one-handed, two-handed, bows; D224: the spear thrusts):

| Family | Skills (D151) | Its animations | Source |
|---|---|---|---|
| unarmed | Unarmed | punch | Library 1 |
| one-handed | Swords, Axes, Maces | guard, swing; later: dash, combo, sword_block | guard: Library 1; the rest: Library 2 |
| spear | Spears | thrust | Mixamo, later |
| two-handed | Swords, Axes, Maces (the greatsword) | swing_two | Mixamo, later |
| bow | Bows | shoot | Mixamo |
| shield | Shield | none of its own: it is carried in the one-handed ones. A block is a flash, no animation (D207). | |

- **Library 2 (`UAL2_Standard.glb`, 43 actions)**, its fighting ones: Sword_Regular_A, _B, _C, Sword_Regular_A_Rec and _B_Rec (the recoveries), Sword_Regular_Combo, Sword_Heavy_Combo, Sword_Dash, Sword_Block, Melee_Hook (a punch), Shield_Dash, Shield_OneShot, Idle_Shield_Break, Idle_Shield_Loop. Also: LayToIdle, Farm_Harvest, Farm_PlantSeed, Farm_Watering, TreeChopping_Loop, OverhandThrow, Hit_Knockback, Consume, Chest_Open, ClimbUp_1m, Walk_Carry_Loop. **No thrust, no two-handed swing, no bow** in either library.
- **Library 1's fighting ones:** Sword_Attack (its only sword attack: a hop and a deep lunge), Sword_Idle, Punch_Jab, Punch_Cross.
- **How Library 2's strikes join** (measured, the hands and feet at the first and last frame): A starts in the sword stance and A_Rec starts where A ends; B starts where A ends and B_Rec where B ends; C starts where B ends and has no recovery. Combo, Heavy_Combo, Dash and Block start and end in the stance. So a strike on its own is A + A_Rec, Dash, Combo or Heavy_Combo; B and C only follow. `character.py --action "A+B"` plays two actions as one.
- **Mixamo** only for what both libraries lack: the bow shot, the two-handed swing, the thrust.
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
| human | 26 | 15 / 27 | 4.0 h | 7.8 h |
| goblin | 17 | 15 / 27 | 2.4 h | 4.9 h |

| One more... | costs, per race (first game / everything listed) |
|---|---|
| piece of clothing, hair or body | 11 min / 20 min |
| weapon, one-handed | 8.1 min / 17 min |
| weapon, spear | 7.4 min / 13 min |
| weapon, two-handed | 7.4 min / 13 min |
| weapon, bow | 7.4 min / 13 min |
| shield | 8.1 min / 17 min |
| animation for everyone | human 19 min, goblin 13 min |

Since 2026-11-22: the swing is Library 2's Regular A with its recovery; dash, combo and sword_block are kept for later mechanics; the goblin's sword is 0.65 of a human's. With the weapons batch (10 one-handed weapons and 6 model shields on trial, below), all races' first game went from 2.8 h to 6.3 h; each one Michael drops takes about 8 min off each race. The batch itself was rendered in the guard and the swing only (SE; shields also SW): the rest of their animations come after his verdict.

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
| Quaternius Universal Animation Library 2 | CC0 | yes (2026-11-21) | 43 actions: sword strikes and combos, a dash, a block, lying, farming, chopping. No thrust, two-handed swing or bow. |
| Quaternius Medieval Weapons | CC0 | yes (2026-11-21) | 24 models (FBX, OBJ): weapons and shields, shared by every race. Its files are about 5.7 times a metre: each part says its `length`. |
| Quaternius Fantasy Props MEGAKIT | CC0 | yes (2026-11-21), the free Standard part | Things in the hand that are not weapons (torch, tools). Not looked through yet. |
| Mixamo | Adobe's terms: free for games; the animation files may not be passed on | not used yet | Animations both libraries lack. Only rendered sprites ship. |
| "Goblin Simple" by marianofer1996 | CC BY 4.0, **credit required** | yes | The goblin's body. |
| Michael's AI-made models (TRELLIS, Tripo3D) | AI-generated, credited as such; Tripo3D's free-plan terms to be checked | yes | Armour on trial, and the goblin scrap armour (approved). |

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
3. **Weapons:** the one-handed ones and the shields are in as a batch (2026-11-22), each waiting for Michael's verdict; the approved ones then get idle, walk and the later strikes. The spear, two-handed weapons and bows wait for Mixamo and their holds.
4. **Library 2**: its actions are named (above). The swing is picked (Michael, 2026-11-22: Regular A + its recovery); Dash, Combo and Block are rendered and kept for later mechanics.
5. **Clothes and armour**, set by set, each approved on its sheet.
6. **The other seven sides**, once 1 to 5 are approved on one side: this is where the hours of the budget are spent.
7. **The game**: its character view draws from layers (not built; a task for the Playbook Console).

## Shown end to end

### The orc, a new race (2026-11-24, on trial)

Michael's brief: his Tripo body `orc_model_1` (bare, shorts), through the intake like the goblin. It came with no skeleton, so `scripts/art/rig_static.py` rigs it first from landmarks (`scripts/art/rigs/orc_model_1.json`), then `onto_our_rig.py --upper` puts it on ours (upper arms, forearms and hands turned to ours: 14 to 19 degrees off; arms check 0.0). Zones as materials: skin, eyes, tusks and teeth (bone), nails (rock), shorts (hide, part of the body layer). Skins `skin_orc` (grey-green, default), `skin_orc_umber`, `skin_orc_slate` in `style.mjs`. 110 px and `gear_scale` 1.15 until he picks (105, 115, 1.0 and 1.3 shown). Idle, walk and swing facing SE: every check passes; the plain sword points within 0.2 degrees of the human's. AI-generated: noted in CREDITS.md's new Steam AI section (`ai_generated` on a source). Pictures and the recipe: project files `characters/orc/`.

### The goblin scrap armour (approved 2026-11-24)

Michael, 2026-11-24: "Approved: goblin scrap armour, chest at 0.9, both shoulder variants (matching set and scrap pauldron), iron and dark iron. Lock it in the catalogue."

- **One model, four pieces.** His AI-made `goblin_armor.glb` (source `trellis_pauldron`, credited as AI-made in `CREDITS.md`) is one fused piece. `scripts/art/fit_rigid.py` splits it by where its loose bits lie and hangs each piece on one bone, weighted 1, so it moves as a held thing does and never bends:

| Part | Slot | Bone | What |
|---|---|---|---|
| `scrap_chest` | over | spine_03 | the chest plate, at 0.9 of the size first tried, four rivets |
| `scrap_shoulders` | shoulders | upperarm_l, upperarm_r | the model's own two shoulder plates, a strap round each arm, two rivets each |
| `scrap_pauldron` | shoulders | upperarm_r (its chest strap: spine_03) | the other shoulder variant: one plate, its spike made longer, a strap round the arm and one across the chest |
| `scrap_flap` | waist | pelvis | the pointed front flap, hanging from the goblin's own belt, two rivets |

- **New goblin slots:** `waist` and `shoulders`.
- **What the model needed:** it faces +y (turned 180°; its flap first hung behind the goblin); the shoulder plates were made for arms hanging down (turned 72° about the shoulder into our T); the chest made wider and deeper than the model to go over the belly (`--scale 1.26,1.404,1.125` for the approved 0.9), and pushed out of the body with `--clear 0.04 --clear-bend 0.12` (the push spread over every point nearby: pushed point by point, its ~580 loose plates tore apart). Recipe: `/mnt/project-files/characters/armour/goblin-chest-fit.sh`; the four model files are in `characters/models/trellis_pauldron/`.
- **Clipping** (face crossings a picture, idle / walk / swing): chest against the body about 500 to 950 (up to 1,700 with the arms raised: a rigid plate over a belly that moves), plates against the chest about 250 (up to 1,670 in the swing, where they rest on it), the scrap pauldron's chest strap under the chest plate about 1,400. None of it shows at 1x or 4x.
- **Shown:** `/mnt/project-files/characters/armour/goblin-armour-full-grid.png`, `goblin-armour-pauldron-grid.png`, `goblin-armour-closeup.png` (with the outline, beside the human in mail).

### Armour hides what it covers (2026-11-23, 2026-11-24)

Michael: "Make this armour hide the shirt (at least sleeves and collar), like the mail rule." A part's `hides` can be one list per race (`{"goblin": ["top"]}`): the mail hides the goblin's shirt, not the human's tunic, and every piece of the goblin scrap armour hides the goblin's shirt. Where the armour leaves a gap, the skin shows, not a pale shirt.

### Rigid plates show their edges and rivets (2026-11-24)

Michael: "Plates read as one dark mass: stronger highlight on top-facing plate edges and 1–2 bright rivet pixels per plate, in both iron and dark iron." Pieces made with `fit_rigid.py --detail "seam=60;edge=45;shine=1"` get a `_Shine` zone, and only they get the rule (`TOP_TONE.steel` `rim`, `shine` in `style.mjs`, the finishing in `finish_sprite.mjs`): each plate's top rim, one pixel thick, takes the ramp's palest tone, and each rivet takes it however lit, with a dark pixel under it. The mail and the scrap pauldron came out the same, pixel for pixel. Detail in `docs/art-style.md`.

### The metals (2026-11-23)

Michael: "bronze, iron, steel, gold (and maybe silver, dark iron) ... chosen at runtime like skin and dye." Six metal ramps in one table (`RAMP` in `style.mjs`, `METAL` in `items.mjs`); a part is finished in a base ramp (iron for weapons, shields and buckles; steel for the mail and the plates) that the race ties to the channel `metal`, and the metal is picked per item when the character is drawn (`paperdoll.mjs wear --colours "metal=bronze"` or `"main_hand.metal=gold"`). No new render per metal. The gold sword, bronze sword and bronze axe came back as the plain sword and the axe in gold and bronze (`"instead"` in the wardrobe). Which of silver and dark iron stay is his pick. Detail in `docs/art-style.md`, "The metals".

### The Quaternius sword (2026-11-21, late)

Michael: "Use the Quaternius sword instead of the test sword from now on." It is `plain_sword` in the wardrobe (`FBX/Sword.fbx`); the test sword is `retired` (not rendered, not counted).

| Step | Result |
|---|---|
| 1 import | 5.45 long in its file; guard found at 0.325 of its length from the handle's end, hand placed at 0.163. Six materials: Steel, LightSteel, DarkSteel take iron; LightWood, DarkWood take wood; Gold takes straw (the tileset's yellow: there is no gold ramp). |
| 2 fit | `"length": 0.95` in a man's hand (a setting). Human: 48.5 px long. Goblin: 24.3 px at `gear_scale` 0.5, 31.5 px at 0.65 (tried, not set). |
| 3 to 5 | idle, walk, guard, swing and the three trial swings, human and goblin, south-east: all PASS, 0 pixels show another surface, Godot's shader 0 pixels differ. |
| grip | `grip_check.mjs`: in every picture the grip is in the fist, the blade leaves on the thumb's side, and the recorded blade lies on the drawn one. In the stance the blade points at the ground (its angle in the fist is `lean`, 35°). The goblin's wrist turns otherwise than the human's in a few pictures (frame 2 of Sword_Attack: down, not left); why is not checked yet. |

- **Proof that nothing earlier changed:** the human idle rendered again with the new scripts and the wardrobe as it was before the sword came (`git show 8cc0c9f:scripts/art/wardrobe.json`): 330 layer pictures the same pixel for pixel (`pixdiff.mjs`).

Shown to Michael (`/mnt/project-files/characters/pipeline/`): `grip-check-sword-attack.png`, and `gifs/attack-0` to `attack-3` (human, goblin at 0.5, goblin at 0.65): Library 1's Sword_Attack, Regular A + its recovery, Dash, Regular Combo. At 0.5 the goblin's thin blade breaks into dots when it points at the camera.

### The weapons batch (2026-11-22)

Michael: "every one-handed weapon from Quaternius Medieval Weapons and the MEGAKIT that fits the one-handed swing (swords, axes, maces, clubs, daggers), plus the shields, for human and goblin. Contact sheet of all of them in the guard and mid-swing, so I can approve or drop each one." Each was taken in with the intake, human and goblin, in the guard and the swing (south-east; a shield also south-west, where its face shows). All 16 PASS; every goblin weapon points within 0.3 degrees of the human's, picture by picture. The sheets: `lineup-weapons.png` (1 to 10) and `lineup-shields.png` (11 to 16) in the project's files under `characters/pipeline/` (`scripts/art/lineup.mjs`).

| # | Part | Model | In a man's hand |
|---|---|---|---|
| 1 | plain_sword | Sword.fbx | 0.95 |
| 2 | curved_sword | Sword_2.fbx | 0.93 |
| 3 | golden_sword | Sword_Golden.fbx | 1.04 |
| 4 | curved_dagger | Dagger.fbx | 0.45 |
| 5 | gold_dagger | Dagger_2.fbx | 0.54 |
| 6 | axe | Axe.fbx | 0.92 |
| 7 | hatchet | Axe_Small.fbx | 0.52 |
| 8 | war_hammer | Hammer_Small.fbx (the batch's mace; the pack has no club) | 0.75 |
| 9 | bronze_sword | MEGAKIT Sword_Bronze.gltf | 1.13 |
| 10 | bronze_axe | MEGAKIT Axe_Bronze.gltf | 0.83 |
| 11 | round_shield | Shield_Round.fbx | 0.66 across |
| 12 | painted_round | Shield_Round_2.fbx | 0.66 across |
| 13 | heater_shield | Shield_Heater.fbx | 0.75 tall |
| 14 | plain_heater | Shield_Heater_2.fbx | 0.75 tall |
| 15 | celtic_shield | Shield_Celtic_Golden.fbx | 0.95 tall |
| 16 | wooden_shield | MEGAKIT Shield_Wooden.gltf | 0.62 across |

**His verdicts (Michael, 2026-11-22, 4:34 AM):** approved 1, 2, 4, 6, 7, 8, 11, 12, 13, 16; rejected 3, 5, 9, 10, 14, 15. A rejected part keeps its line in the wardrobe with `"status": "rejected"`: it is not rendered and not in the budget. His words: "gold/bronze items can come back later if we add gold and bronze ramps". So the golden sword, the gold dagger and the Celtic shield (gold) and the bronze sword and axe (bronze) come back if gold and bronze ramps are added; the tileset has neither today (gold is drawn with straw, bronze came out brown). Then: "Shields are broken, human and goblin" (attachment, clipping, arm pose), below.

Sizes: the pack's own against the plain sword (its units times 0.1743), the MEGAKIT's own metres; the pack's shields would be 0.35 to 0.45 at that scale (bucklers), so they are sized as the stand-in shield (0.66 across). All settings. Left out: Axe_Double, Hammer_Double, Sword_Big and Claymore (two-handed, for Mixamo's two-handed swing), the spear, scythe, bows and arrow, and the MEGAKIT's pickaxe (a tool). The MEGAKIT is the free part of the Fantasy Props MegaKit (CC0); its three models are unpacked beside `props.tar`.

Made standard for every race body (his words: "Make the rest-pose alignment ... and the "weapon angle within 5° of the human" check standard steps of the intake tool for every new race body"): the arms check and the weapon angle check (in the step tables above).

Found and fixed on the way:
- **The last degrees between goblin and human blades**: the knuckle line (above). Now 0.0.
- **The pack's weapons were drawn unlit.** Its FBX files say their materials are fully see-through; Blender read alpha 0, so the lit render had none of their pixels and the finish gave each a flat tone. `held_gear.py` makes them solid. The plain sword was taken in again in all seven of its animations; it now has light and shade.
- **A model shield floated 0.3 off the arm** (its thickness counted in the file's units). Its back now lies on the forearm.
- **Facing:** which side of a model shield is its face is not in the file; `"flip"` is set per shield from the pictures (the two round ones showed their straps at first).

To look at on the sheets: the bronze came out brown (each pixel takes the nearest ramp; there is no bronze); a heater lies on its side while the arm hangs (its straps run across it, as on a real one); in the guard and the swing the shield arm hangs down (Library 2's shield actions would raise it, not looked at); from SE the shield arm is the far one, so its back shows.

### The shields fixed (2026-11-22)

Michael, 4:34 AM: "Shields are broken, human and goblin". His three asks and what was done:

1. **Attachment** ("Attach it to the forearm like a real shield: strap along the lower arm, handle at the hand, face pointing outward, not hanging from the hand like a sword"). `held_gear.py`: the forearm goes through a strap 0.3 of the way from the elbow to the wrist, the fist is round a handle where a sword's grip is, the shield's middle is midway between the two, its face outward (the way the back of the hand looks). Once the figure is posed, `lay()` lays its back on the arm: rays go outward from every point of the arm, hand and fingers (sleeves included, skinned as posed), and the shield is moved until the nearest lies 0.004 off (in proportion to the hand). Measured before: the goblin's shield stood up to 3 px off its arm. The heater is turned point down (`spin` -90). It follows the forearm alone.
2. **Clipping** ("in every frame, test whether the shield's mesh intersects the body's (and the head's, and other worn parts), and fail the frame if it does"). A standard intake check for every shield: `character.py` builds Blender BVH trees of the shield and of every part seen with it (body, head, clothes, the weapon in the other hand), as posed in each picture, counts the faces that cross, and writes them in `anim.json`; the intake fails each picture that is not clean and names the parts. It caught the first tries: the sword's blade through the shield in 4 guard pictures; the chest and head running into a shield held still while the swing turns the body.
3. **Arm pose** ("Propose a shield-carrying arm pose (check UAL2 Sword_Block / Shield_OneShot first), knowing it changes the body layer"). Library 2 looked at: `Sword_Block` raises the sword arm and swings the left arm back (no use); `Shield_OneShot` is a bash that starts from the plain idle and ends in `Idle_Shield_Loop`'s pose; `Idle_Shield_Break` is a guard knocked aside; `Shield_Dash` a charge. **Proposed: `Idle_Shield_Loop`'s left arm**, forearm across the chest, the shield up in front. In every picture of an animation a shield is drawn in, the arm from the shoulder down is taken from that action (`character.py --borrow`); it turns with the chest about the up axis and stays upright (`--borrow-follow heading`: the swing turns the body about 120 degrees in its follow-through; an arm held still ran into the chest, an arm following the chest wholly went over the head); and the whole arm is turned 15 degrees up and 25 out at the shoulder (`--borrow-turn`; 20 at first), which clears the sword and the forward thigh. The collarbone stays the animation's (it moves the neck, which is the head's layer). Settings: the wardrobe's `render.shield_arm`.

**The body layer.** The arm pose changes what covers that arm, so each animation a shield is drawn in gets a variant, `<anim>+shield`: the shield's layers and those of the parts marked `"arms": true` (the human's bare chest, peasant and ranger tops; the goblin's body). Every other part (head, legs, feet, hair, the weapon) is the plain animation's, unchanged (`paperdoll.mjs layerFile`): the layers still stack exactly against one render of the whole. A shield is drawn only in the animations of `shield_arm.in` (idle, walk, run, hit, guard, swing and the later one-handed ones), not in a roll, a fall, kneeling, using things or talking: open, for Michael.

**Shown on 11 and 13** (round_shield, heater_shield; human and goblin; SE and SW; guard and swing, the strike is picture 2; 256 samples, wearing plain_sword): all 16 intakes PASS. Sheet `/mnt/project-files/characters/pipeline/shields-fixed-11-13.png`, moving `shields-fixed-11-13.gif`.

- **Clipping:** the shield goes into nothing in any of the 240 pictures (its mesh against head, legs, feet, clothes, body and the sword, every face).
- **Stacking:** 0 pixels show another surface in every set (13,919 to 37,409 a set); 4.4 to 15.9 % a tone off (a shield shades the chest). Godot's shader: 0 pixels differ.
- **Tried and dropped:** the arm turned toward SE (`--borrow-turn` -15,0,-15 and -15,0,-30) shows more of the face from SE, but the shield then goes into the sword in 15 of 15 goblin guard pictures and into the peasant top in the swing.
- **To look at:** from SE, the guard's shield is seen nearly edge-on (its face turned 84 degrees from the camera; from SW, 14); in the follow-through of the swing SE sees a little of its back. SE is the far side for a left arm; a shield arm held further forward would show more and is the next thing to try if it reads badly.

**Render cost.** The budget (`wardrobe.mjs`, 8 sides x 15 pictures x 0.37 s): a shield adds 4.4 min a race; the shield arm (the `+shield` body layers, counted once a race) adds 13 min for the human (3 parts covering the arm, 6 first-game animations) and 4.4 min for the goblin. First game: human 3.1 h, goblin 1.4 h, all races 4.4 h. Measured here: an intake run of one shield, one animation, one side took 54 to 74 s for the human and 16 to 24 s for the goblin, rendering included.

### The heater off the arm (2026-11-22, 8:28 AM)

Michael: "Heater_shield is not attached to the man and goblin arm".

- **Cause.** The Quaternius shields carry their own two straps on the back, standing 0.27 of the file's units out from the back plate (about 6 px on a man). `lay()` laid the shield on the arm by those strap tips, so the plate stood off the arm; and the shield's middle, not its straps, was put on the forearm, so the fist hung beside the heater (seen big from behind: the forearm passed under both straps, through neither).
- **Fix.** `"straps": "DarkWood"` in the hold (`held_gear.py`): the two loose pieces made of that material alone are the straps. The line through them lies along the forearm, the one nearer the hand goes round the fist (a sword's grip place), the other round the forearm, and the back plate, not the straps, is laid on the arm. The heater's `spin` -90 is gone (its straps set the way); its point is down. Set for 11, 12 and 13; the wooden shield (16) holds by a grip behind its boss, no straps: unchanged.
- **Clipping check.** The straps cross the forearm and fist that carry them, as on a real shield: those crossings are counted apart (`"strapped"` in `anim.json`, about 140 faces a picture) and allowed; anything else the shield touches still fails the picture.
- **Arm turn.** With the shield nearer the arm, the goblin's sword met the heater in picture 8 of the swing (12 faces; the check failed it). The shield arm now turns 25 degrees out at the shoulder (was 20): every combination clean. From SE the guard's shield is now seen edge-on (its face 88 degrees from the camera; SW sees it nearly full).

**Re-made on 11 and 13** (human and goblin, SE and SW, guard and swing, 256 samples): all 16 PASS. The shield goes into nothing in any of the 240 pictures; stacking exact (0 pixels in every set); 4.4 to 15.8 % a tone off; a run took 66 to 97 s for the human, 21 to 35 s for the goblin. The arm-covering layers (`peasant`, `goblin` in `+shield`) were made again at the new turn. Same sheet and GIF names in `/mnt/project-files/characters/pipeline/`. The budget is unchanged.

### Idle and walk for the approved items (2026-11-22)

Michael, 9:39 AM: "Yes" (the shield fix approved). Rendered, human and goblin, 256 samples: idle and walk for the six approved weapons (1, 2, 4, 6, 7, 8; SE) and the four approved shields (11, 12, 13, 16; SE and SW, with the shield arm), and guard and swing again for 12 and 16 (their straps and the arm changed). 72 intake runs, 51 minutes of rendering: all PASS (stacking exact, Godot's shader 0 pixels differ, every shield clean in every picture). Sheets in `/mnt/project-files/characters/store/sheets/<name>.png`, layers packed in `/mnt/project-files/characters/store/<race>/`.

### The goblin's shirt and waistcoat (2026-11-22, 11:01 AM)

Michael: "Make shirt and waistcoat here" (trousers later: the model has no legs under its shorts). `scripts/art/goblin_clothes.py` makes both over the goblin's own skin, without changing the body: each is a copy of some of the skin's faces, pushed out along the skin's normals, with the skin's bone weights, so it moves with the body in every animation. Written to `goblin_simple/goblin_clothes.glb` (with a copy of the skeleton), loaded after the body (`races.goblin.render.models`).

- **Shirt** (`goblin_shirt`, slot `top`, ramp `cloth`): chest, back, shoulders and upper arms, tucked into the shorts; the sleeves rolled to 0.4 of the way down the forearm with a thicker cuff. 604 points.
- **Waistcoat** (`goblin_waistcoat`, slot `over`, ramp `hide`): chest and back, no arms, open down the front, ends at the belt; lies further out than the shirt. 335 points.
- Both `trial`. Intake: idle, walk, guard, swing, dash, combo, sword_block facing SE, and the shirt's idle, walk, guard and swing facing SW: all PASS. About 11 minutes of rendering per piece and side.
- The goblin's own pictures with the clothes file loaded: the same, pixel for pixel (idle, SE).
- The character page starts the goblin in both; each can be taken off there.
- Not done: trousers (need hips and legs modelled under the shorts), the topknot, the waistcoat facing SW.

### His picks and two fixes (2026-11-22)

Michael: "Pick: attack 1 (UAL2 Sword_Regular_A + A_Rec) as the one-handed swing, goblin sword at 0.65. Keep Combo, Dash and Block in the animation list for later mechanics (render Block too)." Rows: `swing` (Regular A + its recovery), `dash`, `combo`, `sword_block` (later; not the block of D207); goblin `gear_scale` 0.65.

1. **The stance** ("angle the blade slightly up and forward (ready stance, not pointing at the ground)"). As the library has it, Sword_Idle's blade points out to the figure's right, level, which the camera shows going down. Sword_Idle holds the sword hand back behind the hip (a sideways stance): a blade turned forward from there passes into the body or hides behind the arm (tried at 30, 45 and 60 degrees up). The second library's strikes start from, and end in, the plain idle's pose (hand at the hip, measured). So `guard` is now the plain idle (`Idle_Loop`) with the wrist cocked 53 degrees (`character.py --add`, the row's `args`): the blade points forward and 55 degrees up, in front of the body, 30 to 40 degrees up on the screen, and the swing follows on from it.
2. **The goblin's wrist.** Cause: not twist bones (neither skeleton has any). The goblin's forearms rested 16 to 18 degrees off our forearm bones and its hands about 30 degrees turned and drooping; `onto_our_rig.py` keeps our bones' rest, so every animation showed its hands that much otherwise than a human's. Fix: `onto_our_rig.py` now turns the model's forearms and hands to lie as ours do and makes that its rest (`--no-align` leaves them). The sword's direction on the screen, human against goblin, over the swing: was 19 degrees apart on average, up to 29; now 3.4 on average, up to 4.9 (dash, combo, block: up to 8.4). With `--no-align` the script makes the old file again, point for point. The last degrees (1:18 AM batch): `held_gear.py` set the blade by the line across the knuckles, which slants 68.5 degrees from the fingers on a man's hand and 74 to 75 on the goblin's; every race now takes a man's slant. Now 0.0 degrees apart in every picture of all five weapon animations; the human's pictures are the same, pixel for pixel (60 compared).

All of idle, walk, guard, swing, dash, combo and sword_block for the goblin, and guard, swing, dash, combo and sword_block for the human: PASS (0 pixels show another surface, Godot's shader 0 pixels differ).

### The test sword (2026-11-21, before the pack came)

The weapons pack was not here yet. In its place, a plain sword saved as a model file (`models/made_here/test_sword.glb`, lying on its side, three materials) went through the same command. It is retired in the wardrobe.

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


## Open, for Michael

1. **The look** (as above).
2. ~~The goblin's weapon size~~: settled, 0.65 (Michael, 2026-11-22).
3. **The goblin's default skin** and the others' tone steps (his: "I'll choose defaults later").
4. **Run:** jog or sprint. **Bandage:** the kneeling stand-in, or a Mixamo one.
5. **Which first-game animations a held thing is drawn in.** Today: all the ones made for everyone, and its family's. A sword in a roll or a death costs render time and may look wrong; the sheet of each will show.
6. ~~Which attack is the one-handed swing~~: settled, Library 2's Regular A + its recovery (Michael, 2026-11-22).
7. ~~The weapons batch~~: verdicts given (Michael, 2026-11-22).
8. ~~Gold and bronze ramps~~: made with the six metals (2026-11-23); the gold sword, bronze sword and bronze axe came back as metals of the plain sword and axe. **Still his:** whether silver and dark iron stay.
9. ~~The shields' fixes~~: approved (Michael, 2026-11-22, 9:39 AM); idle and walk rendered for the approved items.
10. **Which animations show a shield:** today only those of `shield_arm.in`. In a roll, a death, kneeling, using things or talking: hidden, or on the back?
11. **The goblin's trousers:** the model has no hips or legs under its shorts, so trousers need them modelled first. And `over`, the new slot for the waistcoat: keep it?
12. **The other armour on trial:** the code-made drafts, Free Male Armor 3, Medivel_Armor, the "sample" chest plate, the long piece as mail or gambeson (`/mnt/project-files/characters/armour/`, trial wardrobe `wardrobe-armour-trial.json`). Only the goblin scrap armour is approved.
13. **The goblin's clothes look** (a to e, 2026-11-22): not picked.
14. **The orc** (2026-11-24): its height (105, 110 or 115 px), its sword scale (1.0, 1.15 or 1.3), its default skin and whether the body is approved. Nothing more is rendered for it until then.
