# Characters in layers: design and first prototype

**A design with a prototype that was measured.** Michael chose on 2026-11-21 (see "Decided" below); the choices have no
D## number yet. Asked by Michael on 2026-11-21:
characters must be customizable (clothes, hair, helmets, weapons, shields), not one sprite per character type; each race
has its own body model on the same skeleton; weapons and shields are shared across races, clothes, armour and hair are
per race.

The prototype is small on purpose: **a human, one direction (SE), idle and walk, 15 frames each**. The pictures hold
bought art and are not in the repo: `/mnt/project-files/characters/layers/`.

## Decided

Michael, 2026-11-21, 5:35 PM, in his words:

1. "Stacking: \"the nearer pixel wins\"."
2. "Shield shadow on the body: accept, no fix."
3. "Render time is the blocker. Get a race under ~5 hours." "Don't mirror directions (the sun isn't symmetric)."
   Done: about 3 hours here, with the same pixels (see "Render time").
4. The look (point-sampled): **open**, he will say. "Whatever I pick must be applied identically to every character."

Michael, 6:28 PM:

5. "Rendering stays here in the cloud, CPU, 256 samples, for every character, so all sprites come from the same kind of
   machine." Written into `docs/art-style.md`.
6. "Keep the raw renders (before finishing) so the look can be changed later without re-rendering." What they can and
   cannot change: `docs/art-style.md`, "Where characters are rendered, and what is kept".

Michael, 8:30 PM (after the goblin's readability grid, `docs/races/goblin.md`):

7. "Outline on all characters: build the shader step for it." A 1 px dark outline round every character. Built: see
   "The outline" under "What the game's renderer needs".


## In short

| Asked | What the prototype shows |
|---|---|
| Colours swapped when drawn, no new render | **Works.** A layer pixel holds no colour, only "which ramp, which tone". Three colour sets were drawn from the same layer pictures. |
| Layers per slot | **Works.** Body (head), top, legs, feet, hair, head (hood), main hand, off hand. 11 parts rendered. |
| "Body as holdout" + draw order (not chosen) | **Works only while everything worn has the dressed body's shape** (0 wrong pixels). A bulkier part goes wrong: about 20 pixels a frame with the Ranger's hood, up to 345 with the bare chest and a shield. Laying layers by **"the nearer pixel wins"** is right every time (0 wrong in every outfit tried). |
| Draw order per frame | **Not needed so far**: in SE, idle and walk, one order was right in every frame. Other sides and an attack are not rendered yet, so this is not known for them. |
| Rules ("helmet hides hair") | In a rules file per race (`scripts/art/paperdoll/human.json`). The Ranger's hood hides the hair. |
| Layers = one full render (pixel diff) | **Default outfit: yes** (3 pixels differ out of about 30,000 over 15 frames, and never a wrong part). **With a sword and shield: the right part shows at every pixel, but 8 to 17 % of pixels are a tone off, mostly one tone paler**: the shield's shadow on the body is not there. |

## What the game does today

Read from `game/client/character/character_view.gd`, `character_look.gd` and `game/data/client.json` (`character`):

- One `Sprite2D` per slot, stacked. Slots: shadow, back, off_hand, body, legs, shoes, chest, belt, head, main_hand, hands.
- One PNG per part and animation (`creator/<Part>/<Anim>.png`): 15 frames across, 8 directions down, 128 px cells
  (1920 x 1024), drawn at 2.5 times. 10 parts x 8 animations = 80 files, 10 MB.
- **Colour:** the parts are grey; `modulate` multiplies them by one tint. One tint cannot give a ramp (a ramp's dark
  tones have another hue than its pale ones).
- **Order:** `layer_order`, one list of slots per direction, the same for every frame.
- The shadow is one more part, drawn at alpha 0.35.

## What the model pack imposes

The Quaternius outfits **replace** the body, they are not worn over it: an outfit is a Body mesh, an Arms mesh (sleeves
and the hands' skin), Legs and Feet, and the base character gives only the head. So:

- There is no naked body under the clothes to hide things with.
- A slot left empty shows **the race's own body there** (no top: the bare chest and arms). Each race needs its body cut
  into the same regions as the clothes: head, chest and arms, legs, feet.
- The free base pack has only the "Superhero" build, which is bulkier than the outfits' "Regular" build. The bare chest
  in the prototype is that bulkier body; it is the test case for "a part bulkier than the body".

## A layer picture

One picture per part and frame, made by `scripts/art/character.py --view` and finished by `scripts/art/paperdoll.mjs layers`.
A pixel holds:

- **red:** which ramp ("channel": skin, hair, cloth, hide, iron, wood) and which tone of it;
- **green, blue:** how far the surface is from the camera (65,536 steps over 8 tiles);
- **alpha:** there or not (no soft edge).

Its ground shadow is a second picture (black, carrying its own alpha, paling toward the tip as before). The shadows of
what is worn are joined by taking the darkest at each pixel.

Three rules make a part come out the same whatever it is worn with (`character.py --point`):

1. **A pixel is one point of one surface.** Light, material and distance are all read at the pixel's middle.
2. **No smoothing by Blender** (its denoiser mixes a pixel with its neighbours), and the same number of looks for every pixel.
3. **A part is lit as it is on the dressed body** (the race's default outfit stands around it, unseen, and shades it),
   not as if it hung in the air. Rendered alone, a part was 10 to 30 % of its pixels a tone off.

This changes the look a little against the first Peasant sprites (crisper: the lacing and belt show; about a quarter of
the pixels a tone different). Shown side by side in `look-point-sampled.png`; **not approved yet**.

## Colours when drawn

- The rules name, for each channel, which of the character's own colours fills it: `skin`, `hair`, or the `dye` of what
  it wears. Iron, hide and wood stay as they are.
- A swap is tone for tone. If the new ramp has another number of tones, they are spread evenly.
- Tried: A = the approved colours; B = grey hair (`rock`), ochre tunic (`straw`); C = straw hair, green tunic (`moss`).
  These are ramps that exist today, as examples. **Which colours people, hair and cloth come in is not decided.**
- The brows follow the hair colour (same channel).

## Laying the layers over each other: three ways, measured

Wrong pixels over 15 frames (a wrong pixel = a part shows that should be hidden, or a hole). Truth = the nearer surface.

| Outfit | Plain stack, whole parts, best order | Parts cut by the dressed body, one order | The nearer pixel wins |
|---|---|---|---|
| Default (tunic, parted hair) | idle 144 · walk 116 | 0 · 0 | 0 · 0 |
| Tunic, sword, shield | 226 · 201 | 0 · 0 | 0 · 0 |
| No top (bulkier chest) | 410 · 412 | 0 · 0 | 0 · 0 |
| No top, shield | 412 · 412 | 1,252 · 3,561 | 0 · 0 |
| No top, sword, shield | 421 · 458 | 1,458 · 3,763 | 0 · 0 |
| Ranger top, parted hair | 222 · 208 | 0 · 0 | 0 · 0 |
| Ranger top, hood, sword, shield | 1,216 · 1,104 | 283 · 199 | 0 · 0 |

- **Plain stack** is what the game does today with whole parts: about 10 to 30 wrong pixels a frame.
- **Cut by the dressed body** is "body as holdout": each part loses beforehand what the dressed body (default outfit)
  hides. Perfect while what is worn has that body's shape (the Ranger top alone: 0). When a part is bulkier, the cut is
  wrong and no order repairs it: the Ranger's hood and shoulder piece with a sword and shield, 13 to 19 wrong pixels a
  frame (22 at worst); the bare chest's arm in front of the shield, up to 345 in one frame.
- **The nearer pixel wins** needs no cut and no order table, and is right for any mix. It needs the distance in the
  layer picture, and the game must look at all worn layers at once for each pixel.
- **Order per frame:** the best order was the same in all 15 frames of both animations
  (body, legs, feet, top, hair, main hand, off hand). Only SE was rendered: where a sword passes behind the body in
  other directions or in an attack, this is not known yet.

## The proof against one full render

`node scripts/art/paperdoll.mjs check`: the layers laid over each other (nearer pixel wins) against **one render of the
same things together**, both finished the same way. 15 frames each.

| Outfit | Pixels | A wrong part shows | Right part, other tone | Shadow pixels that differ |
|---|---|---|---|---|
| Idle, default outfit | 31,062 | **0** | **3** | 49 |
| Walk, default outfit | 27,420 | **0** | **3** | 33 |
| Idle, tunic + buzzed hair + sword + shield | 34,455 | **0** | 4,676 (13.6 %) | 69 |
| Walk, same | 33,794 | **0** | 2,759 (8.2 %) | 61 |
| Idle, no top + sword + shield | 34,364 | **0** | 5,941 (17.3 %) | 68 |
| Walk, same | 33,955 | **0** | 4,310 (12.7 %) | 67 |
| Idle, Ranger top + hood + sword + shield | 36,657 | **0** | 6,255 (17.1 %) | 79 |
| Walk, same | 35,757 | **0** | 4,679 (13.1 %) | 74 |

- **Default outfit: the same picture.** The 3 pixels sit exactly on an edge between two parts.
- **With gear: the tones differ where the shield and sword shade the body.** In one render the shield throws a shadow
  down the tunic and the leg; a layer cannot know what will be held. About 8 in 10 of those pixels are one tone paler.
  Pictures: `proof-idle.png`, `proof-walk.png`.
- **With another top:** the legs still carry the shade of the default tunic's hem (a dark band under a bare chest).
- The shadow's few pixels are on its edge (3 or 4 a frame).
- Possible later, not built: a held item could bring a second small picture, "the shade I throw on the body".

## Slots and rules per race

`scripts/art/paperdoll/human.json` (prototype):

- `slots`: body, legs, feet, top, hair, head, main_hand, off_hand.
- `body`: what an empty slot shows (the race's own body there).
- `parts`: each part's slot; `hides` (the hood: `["hair"]`); `shared` for gear whose model is the same for every race.
- `materials`: which ramps each model material may take; `channels` and `colours`: what may be swapped.

**Shared gear is shared as a model, not as pictures.** A sword is drawn in a hand; if a goblin's arms are not a human's,
its sword pictures are not either. One sword model is rendered once per race (by script, no extra work by hand).

## What the game's renderer needs

**The game does not use WebGL.** It has no web build (D177): it is a desktop program on Godot 4.7, and `game/project.godot`
names no renderer, so it runs Godot's own choice (Forward+, on Vulkan, Direct3D 12 or Metal). The depth shader is an
ordinary 2D shader (`canvas_item`), which every Godot renderer takes.

**Tried in Godot 4.7.2 itself** (`node scripts/art/paperdoll.mjs godot`, the small project `scripts/art/paperdoll_check/`):
`doll.gdshader` reads up to 10 layer pictures, keeps the nearest pixel and fills the colour in; `shadow.gdshader` joins the
shadows. Against what `paperdoll.mjs` makes of the same layers, 15 frames each:

| Outfit | Pixels | Differ | Shadow pixels | Differ |
|---|---|---|---|---|
| Idle, Ranger top + hood + sword + shield, colours A | 36,657 | **0** | 11,283 | **0** |
| Walk, no top + sword + shield, colours C | 33,662 | **0** | 10,712 | **0** |
| Walk, tunic + sword + shield, colours B | 34,087 | **0** | 10,836 | **0** |

It ran on Godot's OpenGL renderer ("Compatibility"), the only one this cloud machine has (no Vulkan here). **Forward+ itself
was not run here**; the shader language is the same.

**To run it on a PC, with Godot's default renderer:** `node scripts/art/paperdoll.mjs pack <layers> <folder> --outfits "..."`
makes a folder that runs on its own: the same Godot project, the layers of three outfits and the pictures they must
give. `scripts/godot.sh --path <folder>` prints the renderer in use and PASS or FAIL, and shows the outfits side by
side, moving, with the count under each. The prototype's: `/mnt/project-files/characters/layers/godot-shader-test.zip`.
**Result on Michael's PC: awaited.**

Not built yet: the game's own `character_view.gd` using the shader.

- **Either way:** a small shader in place of `modulate`: read the pixel's channel and tone, look the colour up in a
  table of ramps, with the character's choices (skin, hair, dye) as parameters. The game already uses `ShaderMaterial`.
- **Either way:** sheets keep today's layout (15 frames across, 8 directions down, one PNG per part and animation),
  but each part's cells are **trimmed to the part's own size**, with the cell size and its offset from the feet in a
  small index file. The shadow is a second sheet.
- **Plain stack (cut by the body):** today's `Sprite2D` per slot stays. Smallest files. Wrong when a part is bulkier
  than the body it was cut by.
- **Nearer pixel wins:** one drawn rectangle per character with a shader that reads every worn layer (8 to 10 textures)
  and keeps the nearest; a second pass for the shadow (the darkest). `layer_order` is no longer needed.
- The masters hold the distance in both cases, so the choice can be made later without rendering again.

### The outline

Michael, 2026-11-21, 8:30 PM: "Outline on all characters: build the shader step for it."

- **What it is:** every empty pixel that touches the figure (up, down, left or right) takes one dark colour, `#262521`
  (the iron ramp's darkest). 1 px. `OUTLINE` in `scripts/art/style.mjs`. It lies over the character's ground shadow.
- **Where it is made:** in `doll.gdshader`, after the layers are laid over each other, so it goes round the whole character
  and follows whatever is worn. **No sprite and no layer picture holds it**: nothing is rendered or finished again, and it
  can be changed or dropped later without touching a picture. `outlined` (on unless turned off) and `outline_colour` are
  the shader's settings.
- **Cost:** for an empty pixel, 4 more looks at each worn layer. A drawn pixel costs what it did.
- **The same outside Godot:** `outline` in `paperdoll.mjs`; `wear`, `godot` and `pack` draw with it (`--no-outline`
  leaves it out, which gives the pictures as before, pixel for pixel).
- **Tried in Godot 4.7.2** (OpenGL, the only renderer the cloud has), against `paperdoll.mjs`, 15 frames each:

| Outfit | Pixels, outline counted | Differ |
|---|---|---|
| Human, idle, Ranger top + hood + sword + shield | 43,046 | **0** |
| Human, idle, tunic, no outline (`--no-outline`) | 31,062 | **0** |
| Goblin body, walk, grey-teal | 14,167 | **0** |

- The shader now holds 16 colour channels (256 colours; it held 6). The goblin names 8.
- **For Michael's PC:** `/mnt/project-files/characters/layers/godot-shader-test-outline.zip` takes the place of
  `godot-shader-test.zip`: one run checks the depth step and the outline step on the default renderer.
- **Not built:** the game's own character view. The game still draws its old character sprites, without this shader.

## Sheets and the estimate

Measured on the prototype (SE; the other 7 directions are assumed alike):

| Part | Cell (px), idle · walk | Bytes for 15 frames, with distance |
|---|---|---|
| Top (tunic) | 41 x 42 · 45 x 48 | 38,617 · 37,202 |
| Legs | 39 x 39 · 40 x 45 | 24,555 · 24,334 |
| Feet | 47 x 30 · 52 x 42 | 15,853 · 21,059 |
| Head | 16 x 19 · 19 x 21 | 6,442 · 6,958 |
| Hair | 15 x 14 · 17 x 15 | 4,278 · 4,412 |
| Sword | 45 x 33 · 64 x 47 | 7,173 · 8,168 |
| Shield | 20 x 38 · 42 x 39 | 11,059 · 25,128 |

- **Average per part, animation and direction:** 17 KB with the distance, **2.7 KB without** (the distance is 5/6 of
  the file), plus 1.5 KB of shadow.
- **Per part and animation, 8 directions:** about 150 KB with the distance, about 33 KB without. Today: 128 KB.
- **Video memory:** about 0.6 MB per part and animation (trimmed cells), against 7.9 MB for one of today's sheets.

Files = races x parts x animations x 2 (layer sheet + shadow sheet). Parts and animations per race are guesses:

| Case | Part-animations | Files | Disk, with distance | Disk, without |
|---|---|---|---|---|
| Today's game (Creator) | 80 | 80 | 10 MB | |
| 1 race, 20 parts, 8 animations | 160 | 320 | 24 MB | 5 MB |
| 4 races, 40 parts each, 8 animations | 1,280 | 2,560 | 192 MB | 42 MB |

## Render time

The first prototype took about 2 minutes for one part, one animation, one direction (15 frames) at 256 looks a pixel:
**about 85 hours for a race** of 40 parts, 8 animations, 8 directions, on this machine (4 processors, no graphics card).

**Now about 3 hours for the same race, and every picture is the same pixel for pixel** (`character.py --quick`):

| | Seconds per part and frame | A race (38,400 part-frames) |
|---|---|---|
| First prototype, 256 looks | 8 to 9 | about 85 h |
| The scene kept loaded between pictures | 7.3 | 78 h |
| + only the box round each part rendered, 4 at once | **0.29** | **3.1 h** |
| the same at 64 looks (5 % of pixels a tone off) | 0.17 | 1.8 h |

- **Where the time went:** each part and frame is 5 pictures (light, shadow, colour, material, distance), and Blender
  loaded the scene and its 4,096 px textures again for each one. And it looked 256 times through all 65,536 pixels of a
  frame of which a part fills 200 to 2,000.
- **Proof:** all 11 parts of the idle rendered the quick way and finished: 330 pictures (layers and shadows), **0 pixels
  differ** from the layers of the first prototype (`pixdiff.mjs`). The approved Peasant's idle and walk, rendered the old
  way again: 28 pictures, 0 differ.
- **Fewer looks do not give the same sprite.** Against the current layers (4 parts, 5 frames, 10,508 pixels), pixels a
  tone off: 128 looks 3.3 %, 64 looks 5.0 %, 32 looks 7.9 %, 16 looks 11.6 %, 8 looks 20 %, 1 look 50 %. **And 256 looks
  with other dice: 2.4 %.** So part of every sprite is chance already (the soft light from the sky is found by throwing
  dice), and no lower count is "the same"; 256 is kept. With the box, the looks are about half of what is left.
- **Estimated, not measured:** the 0.29 s comes from 9 parts of the prototype; a race's 40 parts in one scene, and
  heavier armour, may be slower or faster per part. Directions are not mirrored.
- **Decided since: rendering stays in the cloud, on the processor, at 256** (see "Decided"). The guess below is kept for the record.
- **On a PC with a graphics card (a guess):** half of what is left is Blender getting each picture ready, which runs on
  the processor, one core a process; the other half is the looks, which a card can take. A desktop with 8 fast cores
  and a card: perhaps 30 to 60 minutes a race. **A card's pictures are not the same to the last pixel as a processor's**,
  so one race, and every character, must be rendered on the same kind of machine.

## Not done, not known

- One direction only. No attack, no run. The order-per-frame question is open until those exist.
- The sword and shield are plain stand-ins made in code (`scripts/art/standin_gear.py`): no weapon models are in the
  packs on the Mac.
- No Regular-build naked body (the free pack has only the Superhero build), so no bare legs or feet.
- The shader is tried in Godot (above); the game's own character drawing does not use it yet.
- The point-sampled look and the ramps used for colours B and C are not approved.
- Seen three times: Blender (the `bpy` module) crashed as it closed, after every picture was written. The pictures were
  whole and the same as before; the cause was not looked for.
- **No older picture changed:** two frames each of the approved idle and walk, rendered and finished again the old way
  with the changed scripts, are the same pixel for pixel (`pixdiff.mjs`, 28 pictures).

## How it was made

```
# every part, lit on the dressed body (after the bar: unseen parts that shade it), and whole outfits in one render
python3.11 scripts/art/character.py --model <base> --model <base> --model <outfit> --model <hair> ... \
  --keep "SuperHero_Male=Head+neck_01@0.5;SuperHero_Male.001=spine_*+clavicle_*+upperarm_*+lowerarm_*+hand_*+index_*+middle_*+ring_*+pinky_*+thumb_*+neck_01@0.5" \
  --part "head=SuperHero_Male+Eyes+Eyebrows" --part "bare=SuperHero_Male.001" --part "peasant=Male_Peasant_Body+Male_Peasant_Arms" ... \
  --gear "sword=hand_r;shield=lowerarm_l" --sized-by 0.6515691720198784 --turn 45 --point --samples 256 \
  --anim UAL1_Standard.glb --action Idle_Loop --frames 15 \
  --view "peasant=peasant|head+legs+feet+parted" --view "sword=sword|head+peasant+legs+feet+parted" ... \
  --view "whole1=head+peasant+legs+feet+parted" --out <renders>/idle/SE
node scripts/art/paperdoll.mjs layers <renders> <layers>
node scripts/art/paperdoll.mjs wear <layers> <out> --anim idle --wear "hair=parted,top=peasant,legs=legs,feet=feet,main_hand=sword" --colours "hair=rock,dye=straw"
node scripts/art/paperdoll.mjs check <renders> <layers> --anim idle --whole whole1 --wear "hair=parted,top=peasant,legs=legs,feet=feet"
node scripts/art/paperdoll.mjs orders <layers> --anim idle --wear "..."
node scripts/art/paperdoll.mjs godot <layers> <work> --anim idle --wear "..." [--colours "hair=rock,dye=straw"]    # drawn by Godot: PASS or FAIL
```

Add `--quick` to `character.py` for the same pictures about 30 times sooner, and run a loop in four goes at once with
`--take 0-3`, `4-7`, `8-11`, `12-14`.

The exact commands of the prototype, its helper scripts, the finished layers and the renders they came from:
`/mnt/project-files/characters/layers/` (`how-it-was-made.txt`).
