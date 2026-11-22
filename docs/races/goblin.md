# The goblin

Written 2026-11-21 from Michael's spec of that day. The second race of the layered characters (`docs/art-layered-characters.md`), after the human.

- **Nothing here is a decision (D##).** The spec is Michael's, in his words. The skin ramps and the model list are findings and proposals.
- **The model is chosen** (Michael, 2026-11-21, 7:57 PM): "I like Goblin Simple, we build on it." See "Building on Goblin Simple" at the end. Picked at 8:30 PM: darker shade end, 1 px outline, 48 px. Open and his to pick: the main skin colour ("The greener skins" at the end).
- Lore this sits on: goblins are playable (D10), share Oldscar with the orcs (D12, D75), and follow Skerra the Finder, goddess of luck and quick wits (D76).

## The spec (Michael, 2026-11-21)

| What | His words |
|---|---|
| Size and build | "Height: half a human (48 px), skinny, big hands and feet, long fingers with claws, slightly hunched." |
| Head | "Very long ears pointing sideways (main silhouette feature), long hooked nose, small fangs in an underbite, heavy brow, narrow eyes, bald (topknot as a hair option)." |
| Personality | "smart and cunning" |
| Clothing set | "shirt with rolled sleeves, waistcoat, trousers. Later: leather/fur armour pieces." |
| Rig | "Same humanoid rig as the human, so animations and layers work unchanged." |
| Note | "exaggerate ears, nose and hands; at 48 px small details vanish." |

What follows from it:

- **48 px is half the official character scale** (a grown man stands 96 px, `docs/art-style.md`): 0.6124 tiles of height.
- **The ears are the silhouette.** At 48 px the head is about 14 px across; ears that reach 8 to 10 px to each side make the goblin as wide as it is tall at the head. That is what tells it from a child-sized human at game size.
- **Parts, in the human's slots** (the wardrobe, `scripts/art/wardrobe.json`): `head` (bald), `bare` (chest and arms), `shirt` and `waistcoat` (top), `trousers` (legs), feet, `topknot` (hair). Clothes, armour and hair are per race; weapons and shields are shared models, rendered once more on the goblin's hands.

Not said yet, to settle before the first render:

- **Where the 48 px is measured:** standing as it stands (hunched), feet to the top of the bald head, ears not counted? The test shapes below assume that.
- **The head's size.** The human's head is 1.15 times its model's. A goblin head at the human's share of the body would be about 7 px tall at 48 px: too small for a nose, a brow and fangs. The test shapes use a head about a third of the height.
- **Waistcoat over the shirt, or in its place.** The human has one `top` slot. A waistcoat worn over a shirt needs either a second slot or three tops (shirt, waistcoat, shirt with waistcoat).
- **Shared weapons in small hands.** The stand-in sword is about as long as the goblin is tall. Same sword at the same size, or scaled to the hand?
- **Feet or shoes** (the spec names big feet; the clothing set names no shoes).
- **The walk.** Half the leg, same tile speed: the open walk-speed question of the Peasant (`docs/art-style.md`) is twice as sharp here.

## Skin: three ramps tried against the grass

Asked: 3 ramps "from the tileset palette (pale sage, yellow-olive, grey-teal)", contrast against the grass measured, shown as flat-shaded shapes at 48 px beside the Peasant.

### The finding: the tileset has none of the three colours

- The 732 pictures of the tileset hold 38,063 colours. **At the lightness of skin (the human ramp's), every one of them is warm:** stone grey-beige, khaki, sand, wood, brick.
- **Its only greens that pale are leaves and grass** (`#698d38`, `#6f943c`) and cactus (`#46803a`). Sage exists only dark (`#41543b` to `#4b6045`, a desert tree), too dark for skin.
- **Teal: none.** The nearest is a slate blue on one small desert piece.

So each name got two ramps: **the nearest the tileset really holds** (A, B, C), and **the colour as named, made new** at the human skin's lightness (a, b, c).

| | Ramp, dark to pale | From |
|---|---|---|
| **A** nearest "pale sage" | `#7c796b #837f70 #898676 #928f81 #9f9c8e` | Tileset: desert stone (Misc A1, D1, D3, D4). A grey-green stone |
| **B** nearest "yellow-olive" | `#8a774e #91825f #948562 #9c8a66 #ab9974` | Tileset: desert ground and walls (Ground B2, Wall B2, B3, B5, D2). A khaki |
| **C** nearest "grey-teal" | `#577f97 #64869c #6a8a9f #7490a4` | Tileset: one small desert piece (Misc B42). A slate blue, only 4 tones |
| **a** pale sage | `#6c7f61 #74886a #798d6f #819576 #8ea283` | New colours |
| **b** yellow-olive | `#7d7c3d #868546 #8b8a4b #939253 #a09f5f` | New colours |
| **c** grey-teal | `#5c807f #658989 #6a8e8d #729695 #7ea3a2` | New colours |

For comparison, the human `skin`: `#9d6c3f #a77546 #ac7a4a #b48250 #c0905c`.

### The measures

The middle tone of each ramp against three grounds. Three numbers each:

- **Light-dark:** the usual contrast ratio (WCAG), 1 = none.
- **Lightness apart:** how much paler than the ground, on a scale of 100 (OKLab).
- **Colour apart:** how far the colour itself is from the ground's, lightness left out, same scale. This is what tells a goblin from a pale patch of grass.

| | Grass in sun `#3f5824` | Grass in a house's shadow `#2a3b18` | Barren earth `#4c3814` |
|---|---|---|---|
| Human skin | 2.14 · 19 · **9.5** | 3.24 · 29 · 8.6 | 2.99 · 26 · 3.7 |
| A stone | 2.18 · 19 · **6.4** | 3.30 · 29 · 4.2 | 3.05 · 26 · 3.7 |
| B khaki | 2.20 · 19 · **5.7** | 3.33 · 29 · 4.2 | 3.08 · 27 · **1.0** |
| C slate blue | 2.18 · 19 · **10.8** | 3.31 · 29 · 8.8 | 3.05 · 26 · 10.5 |
| a pale sage | 2.22 · 19 · **3.4** | 3.37 · 29 · **1.2** | 3.11 · 26 · 5.1 |
| b yellow-olive | 2.22 · 19 · **3.3** | 3.36 · 29 · 3.7 | 3.10 · 26 · 4.3 |
| c grey-teal | 2.23 · 19 · **7.5** | 3.38 · 29 · 5.6 | 3.12 · 26 · 8.3 |

- **Light-dark is the same for all seven** (2.1 to 2.2 on grass). That is by design: each ramp sits at the human skin's lightness, so a face in shade still reads. Any of them is as readable as the Peasant by light and dark alone.
- **They differ only in colour.** Sage and olive are the grass's own hue made pale (3.4 and 3.3; sage drops to 1.2 on shaded grass). Khaki is the barren earth's hue (1.0), and Oldscar stands on barren land.
- **Grey-teal and slate blue keep their distance on every ground** (5.6 or more).

### The picture

`/mnt/project-files/characters/goblin/skin-test.png` (it holds bought art, so it is not in the repo): the Peasant and the six ramps as box goblins 48 px tall on House 1's grass, at 3 times and at game size, each with its swatches and numbers. The shapes are boxes shaded by the official sun with the three face tones: a body, a head, long ears. They are not a goblin design.

Made by `/mnt/project-files/characters/goblin/palette.py` (lists every tileset colour and the pieces that hold it) and `skin_test.py` (picks the ramps, measures, draws).

### Proposal

1. **Recommended: c, grey-teal, as 5 new colours.** It is the only one of the three named colours that separates from grass, shaded grass and barren earth alike, and it is far from human skin and from linen. It needs Michael to allow 5 colours outside the tileset (his rule for the human's ramps was "no new colours outside it").
2. **If the rule stays: C, slate blue.** The only tileset ramp that separates everywhere. It reads blue, not green, and has 4 tones, not 5.
3. **Not recommended:** A reads as stone and is nearly the linen `cloth` ramp, so a goblin's skin and shirt would merge. B is close to human skin and vanishes on barren earth. a (true sage) looks the most "goblin" but is the closest to grass.

**Michael, 2026-11-21, 7:40 PM:** the bake-off below is rendered with the "grey-teal skin ramp". Read as **c**, the five new colours. It is in `scripts/art/style.mjs` as `skin_teal`, on trial: the one ramp that is not the tileset's. No D## yet.

## Existing models: none fits

Asked: rigged goblin models, humanoid rig or Mixamo-compatible, licence fine for a commercial game, style close to Quaternius; the best 5.

**Verdict: no model found fits the spec.** Three reasons, true of every one below:

- **None is on the human's rig** (Quaternius' Universal Base Characters and its animation library). Each would have to be bound to our skeleton again or its animations retargeted, and then "animations and layers work unchanged" is no longer true.
- **None has the clothing set** (shirt with rolled sleeves, waistcoat, trousers). They come with armour and rags.
- **None states the spec's shape** (half height, very long sideways ears, big hands and feet). This was judged from the pages' text; the store pictures were not looked at.

Quaternius itself has no goblin on this rig (its base pack page names six human bodies and no other race).

The best five, nearest first. "Not stated" means the page read did not say.

| # | Model | Price | Licence | Rig | How close |
|---|---|---|---|---|---|
| 1 | [Goblin Fighters, Sidekick Modular Characters](https://syntystore.com/products/goblin-fighters-sidekick-modular-characters) (Synty) | $100 on sale ($199.99) | Synty's own agreement, 5 seats; commercial terms not on the page, to be read before buying | Unity Humanoid, "Unreal Engine Mannequin compatible". Animations sold apart | **Nearest in build:** 427 parts, a bare body can be put together, ears, nose and teeth are swappable, a skinny body shape. Flat-colour low poly. But Unity and Unreal packages only, fighter gear only |
| 2 | [Lowpoly Goblin Modular Armors](https://forums.unrealengine.com/t/polytope-studio-lowpoly-goblin-modular-armors-medieval-fantasy-series/2833423) (Polytope Studio, on Fab; [the bundle on Unity](https://assetstore.unity.com/packages/3d/characters/low-poly-goblins-modular-armors-bundle-lowpoly-medieval-fantasy--407068)) | Not stated on Fab; the bundle of three packs is $129.99 on Unity | Fab's or Unity's standard store licence (not read in full) | UE5 mannequin. No animations | Low poly, 2,090 to 9,490 triangles, two undressed bodies, cloth, leather and plate sets. A goblin edition of a human armour pack, so likely human proportions |
| 3 | [RPG, Goblin pack](https://www.fab.com/listings/496aeea4-7416-41f4-9d66-8126a9d56bdf) (Fab) | Not stated | Not stated | "Rigged with Epic Skeleton". No animations listed | Stylized low poly, 7 torsos, 7 legs, 6 headwear, 5 hairs, 11 shape sliders. Whether a bare body is included is not stated |
| 4 | [LOWPO: Goblin Assets](https://standout7.itch.io/goblin-lowpoly-assets) (Standout 7) | Free | CC0; "Do not resell or redistribute the files directly" | "Fully rigged", skeleton not stated | Nearest in style and licence to Quaternius (.blend, one shared texture). Three fixed characters (basic, warrior, archer), not in parts |
| 5 | [Low Poly Goblin (Rigged)](https://opengameart.org/content/low-poly-goblin-rigged) (tbbk) | Free | CC0 | Rigged, not animated, skeleton not stated | One palette-coloured low-poly goblin, .blend. Not in parts, no clothes apart |

Looked at and left out:

- [Stylized Modular Goblin Rogue](https://forums.unrealengine.com/t/unicornway-stylized-modular-goblin-rogue/2841995) (UnicornWay): in parts with a bare body, but its own 112-bone skeleton and 4K painted textures.
- [Modular Goblin Characters Male & Female](https://superhivemarket.com/products/modular-goblin-characters-male--female) (Kilutica3D, $79.99, royalty free): "handsomely rugged and muscular", about 25,000 triangles. The opposite of skinny and hunched.
- Two free "Factex@Lab" packs on itch.io: bases made by AI generators, photoreal textures, no licence stated.
- OpenGameArt "Goblin Model (Free Monsters)": not rigged. "Free Goblin" by AU_pixel: 2D pixel art.
- Unreadable from here (the pages came back empty): five CGTrader listings, one Fab listing, one itch.io page. Two Unity listings ("Lowpoly Goblin Warrior Asset Pack", $4.99; "Goblin Mechanic", $34.99) loaded without their descriptions.

On the store licences: a user on Epic's forum quotes Epic's answer that Fab assets may be used in other engines when they hold no Unreal code and are not Epic's own "UE-Only" content. That is a forum post, not the licence; it would have to be read before buying for a Godot game.

**Next, in Michael's words:** "If none fit, say so. Then we'll generate an original model." An original goblin can be built straight onto the human's skeleton, which is what keeps the animations and the layers unchanged.

## The bake-off: models tried on our skeleton

Michael, 2026-11-21, 7:40 PM: each candidate is put on our skeleton, sized to 48 px, given the grey-teal skin and the standard finishing, and shown as one idle frame facing south-east by House 1 beside the Peasant, at the game's size and 4 times. Reported for each: did the skeleton fit cleanly, are the clothes separate, which spec points it misses.

How a candidate is run: `/mnt/project-files/characters/goblin/bakeoff/<name>/how-it-was-made.txt`. The pictures and the model files are there too (never in the repo).

### 1. "Goblin Simple" by marianofer1996

[Sketchfab](https://sketchfab.com/3d-models/goblin-simple-b4916554ec4441d6bd363c2176a6bb6c), CC BY 4.0, free. Credit is required and is in `CREDITS.md`. 7,126 triangles in two meshes, two materials with 1,024 px painted textures (colour, bumps, shine), five animations of its own (attack, dance, two idles, walk).

Pictures: `/mnt/project-files/characters/goblin/bakeoff/goblin-simple/goblin-simple-by-house1.png` (the frame asked for) and `goblin-simple-model.png` (the model as it comes, without its clothes, and on our skeleton).

**The skeleton: it fits cleanly.**

- It comes on a **Mixamo skeleton**: 65 bones and a root. **64 of them have a partner among our 65 by name** (hips, three spine bones, neck, head, and for each side shoulder, arm, forearm, hand, five fingers of four, thigh, calf, foot, toe, toe end). Without a partner: its `HeadTop_End` (no point follows it) and the two roots.
- Both skeletons rest in a T, facing the same way. So nothing had to be re-posed: `scripts/art/onto_our_rig.py` copies our skeleton, moves each joint to the model's own, and keeps every point's weights under our names. No point of the mesh moves.
- **The arms, fixed 2026-11-22.** Its forearms rested 16 to 18 degrees off our forearm bones and its hands about 30 degrees turned and drooping (measured from the joints: wrist to knuckles, little finger's knuckle to the first's). Our bones keep their own rest, so every animation turned its hands the same 30 degrees otherwise than a human's, and its sword pointed up to 29 degrees otherwise on the screen (19 on average over the swing). Neither skeleton has forearm twist bones. Now `onto_our_rig.py` first turns the model's forearms and hands, posing its own skeleton, to lie as ours do, and makes that its rest: 1,071 of the skin's 2,866 points move (the arms), the clothes' none. The last few degrees (up to 8 in the combo) came from its knuckle line, which slants 74 to 75 degrees from its fingers against a man's 68.5: `held_gear.py` now gives every race a man's slant, and its weapons point as the human's, 0.0 degrees apart in every picture. The intake now checks both for every race body: the arms at rest (within 1 degree of ours) and the weapon angle (within 5 of the human's).
- `character.py` then loads it like a Quaternius model, and **the library's `Idle_Loop` and `Walk_Loop` play on it unchanged**. The masks and the gear hang on the same bone names.
- Idle: clean. The lowest point over the loop is 0.5 px under the ground at 48 px (the Peasant: 0.2).
- **Walk: plays, but the boots dip up to 3.5 px into the ground** at 48 px and pass close to each other. The boots are 2.3 times as long as our skeleton's foot. A walk would need the feet planted (as `--stand` does for an idle). **Fixed since:** `character.py --ground`, below.
- Where its rest differs from ours: the fingers rest curled (55 to 119 degrees from ours, which rest straight), so the library's fists curl further than they should; it does not show at 48 px. Forearms 16 to 18 degrees, feet 16. The lower leg is 0.59 times ours for the same hip height.

**The clothes: separate, but nothing is under them.**

- Skin and clothes are **two materials and two meshes**: everything green (`G_MatUp`), and shorts with a rope belt, a sheath, a pouch and laced boots (`G_MatDown`, 41 loose pieces).
- **Under the shorts and inside the boots there is no body:** no hips, no thighs, no feet. The same way the Quaternius outfits work (clothes take the body's place), but here there is no full body to go back to. Shorts off, or trousers in their place, means modelling the missing body.
- The chest, arms and head are one bare, whole piece: a shirt and a waistcoat could be made to go over it.
- **Eyes, fangs and claws are painted into the skin's texture**, not their own materials. The standard finishing gives a material one ramp, so they come out skin-coloured. Keeping them needs a small mask, which is extra work this model asks for.

**Against the spec:**

| Spec point | This model |
|---|---|
| Half a human, 48 px | Yes (we size it) |
| Skinny | **No.** Stocky and muscular: a broad chest with abs, upper arms a tenth of its height thick |
| Big hands and feet | **Yes.** A hand is 19 % of its height (ours: 11 %), a boot 29 % |
| Long fingers with claws | Partly. Four thick fingers and a thumb, small claws |
| Slightly hunched | **No** at rest: it stands upright. The hunch is in its own idle animation only (ours can lean it with `--add`) |
| Very long ears pointing sideways | **Yes.** Tip to tip they span 51 % of its height (25 px at 48 px), out and a little up. They are what is left of the face at game size |
| Long hooked nose | Yes on the model. About 2 px at 48 px: barely there |
| Small fangs in an underbite | Yes on the model. Gone at 48 px (and skin-coloured, see above) |
| Heavy brow, narrow eyes | Yes on the model (yellow eyes). Gone at 48 px |
| Bald, topknot as an option | Bald: yes. No topknot |
| Smart and cunning | **No**, in my reading: a scowl, bared fangs and a bare muscled chest read as a brute. Its own idle, wringing its hands, is the cunning part, and that is its animation, not ours |
| Shirt with rolled sleeves, waistcoat, trousers | **None of the three.** Shorts, a rope belt and boots |
| Same skeleton as the human | Yes, after the step above |
| Ears, nose and hands exaggerated for 48 px | Ears and hands: yes. Nose: not enough |

**What the finishing showed (about the ramp, not the model):**

- On a bare chest the grey-teal ramp reads **pale and flat**: its five tones span little lightness (it was made at the human skin's lightness, whose shade end is kept light for a face). Muscles, brow and nose do not show. A human is mostly clothes; this goblin is mostly skin.
- The tones are picked from the model's own lightness (`TONE_FROM.skin_teal` in `style.mjs`), measured on this model. Another model with a paler or darker skin texture needs its own two numbers.
- The standard finishing first put the clothes' brown on the ear tips. Cause: the picture that says which material is where is smoothed at the figure's edge, and with only two materials an edge pixel can be read as the wrong one. `character.py --exact-ids` writes that picture unsmoothed; off by default, so no earlier picture changes.

Proof that the new ramp changed nothing else: 8 Peasant pictures, 150 layer pictures and 56 prop pictures finished again, 0 pixels differ (`pixdiff.mjs`).

## Building on Goblin Simple

Michael, 2026-11-21, 7:57 PM: "I like Goblin Simple, we build on it. Main issue: it's hard to see on the grass." Three asks; what was done for each. Pictures and model files: `/mnt/project-files/characters/goblin/bakeoff/goblin-simple/` (never in the repo); every command: `how-it-was-made.txt` there.

### 1. The body layer, and the boots in the walk

"Treat shorts, rope belt and boots as part of the goblin body layer (its "underwear"); all other goblin clothes will layer on top."

- **The goblin's rules** (first `scripts/art/paperdoll/goblin.json`; since 2026-11-22 in the wardrobe, `scripts/art/wardrobe.json`, under `races.goblin`), in the shape of the human's. One body part, `goblin`, always worn: the skin mesh and the clothes mesh together.
- **Clothes lie on the body; they do not replace it.** A human top takes the bare chest's place. A goblin shirt is its own layer over the body, and the depth in each layer pixel decides what shows. So trousers have to be cut wide enough to cover the shorts, and they end at the boots.
- The rope belt carries a small sheath and a pouch. They are in the body layer with it (the same mesh).
- A new slot, `over`, is proposed for the waistcoat, which goes over the shirt. Not decided.
- **Tried end to end:** the body layer's idle and walk (15 pictures each, facing south-east, trial quality) rendered as a layer, made into layer pictures and drawn with both skins by `paperdoll.mjs --rules scripts/art/paperdoll/goblin.json`.
- The goblin names 8 colour channels. The Godot check (`paperdoll_check`) holds 6 today; it has to grow before a goblin with gear is checked there. Not done.

"Fix the boots dipping into the ground in the walk."

- **Cause:** both feet were under the ground in 14 of the walk's 15 pictures, by 0.2 to 3.5 px at 48 px. The library's walk was made for a human foot; these boots are 2.3 times as long, and the model's foot rests 16 degrees off ours.
- **Fix: `character.py --ground`.** In each picture, a foot whose lowest point is under the ground has its ankle lifted by just that much. The leg bends at the knee and hip; the foot keeps the turn the animation gave it; the hips and everything above stay where they were. No mesh is changed.
- **Result:** the lowest point is on the ground in all 15 pictures of the walk and of the idle (was 3.5 px and 0.5 px under). Before and after, picture by picture: `goblin-walk-ground-fix.png`.
- It is asked for per render, so nothing rendered before changes. The goblin's renders take it always.

### 2. Eyes, fangs and claws keep their own colours

"Paint masks for eyes, fangs and claws so they get their own ramps (eyes bright yellow, fangs and claws pale bone). They must not turn skin-coloured."

- **The mask** is a picture laid over the skin's texture, black where the skin is skin, one flat colour for the eyes and one for fangs and claws (`masks/G_MatUp_mask.png`, `.json`; made by `make_masks.py` and `claw_uvs.py` there). Eyes and fangs are found by their painted colour; the claws are not painted apart from the fingers, so they are the outer half of each finger's last piece (13 pieces). The model and its texture are not changed.
- **`character.py --mask "G_MatUp=<mask.png>"`** writes them into the material picture as `G_MatUp:eyes` and `G_MatUp:bone`, and writes that picture 4 times as fine as well.
- **The finishing** (`smallThings` in `finish_sprite.mjs`, used by `paperdoll.mjs` too) gives a pixel to a small thing that covers a quarter of it, and at least one pixel wherever an eighth of one is seen. Without the second rule the eye blinked: seen from the south-east it covers 3 to 7 sixteenths of a pixel, under the brow.
- **Result at 48 px, facing south-east:** the eye is 1 bright yellow pixel in all 30 pictures of idle and walk; fangs and claws are 3 to 5 pale bone pixels. None is skin-coloured.
- **Two new ramps** in `style.mjs`: `eye_yellow` (`#d9a81e #efc22c #f8dc4f`; new colours, the tileset holds no bright yellow) and `bone` (`#a29e90 #b0ad9f #c1b8a6`; the tileset's own stone colours).

### 3. The readability grid

"Readability grid, idle SE by House 1 next to the peasant, 1x and 4x: skin: current grey-teal vs darkened shade end; outline: none vs 1 px dark outline (characters only); height: 48 px vs 54 px. Label each. Recommend one, but I'll pick."

Picture: `goblin-readability-grid.png` (made by `/mnt/project-files/characters/goblin/readability_grid.py`). Eight cells, each at 4 times and at the game's size.

- **Darker shade end:** `skin_teal_deep`, `#3a6363 #4e7676 #608787 #709696 #7ea3a2`. The palest tone is the same; the darkest goes from lightness 0.57 to 0.47 (OKLab).
- **Outline:** 1 px outside the figure's edge, `#262521` (the iron ramp's darkest), over the shadow, on characters only. So the Peasant has it too in those cells. In the game it would be one more step in the shader that draws a composed character. Not built.
- **54 px:** the same model at 0.6889 tiles.
- **Edge step:** how far the figure's border pixels are from the grass pixels just outside them, on average (OKLab distance, times 100). Higher is easier to see.

| Cell | Skin | Outline | Height | Edge step |
|---|---|---|---|---|
| 1 | grey-teal as now | none | 48 px | 17.6 |
| 2 | grey-teal as now | 1 px | 48 px | 26.1 |
| 3 | darker shade end | none | 48 px | 14.7 |
| 4 | darker shade end | 1 px | 48 px | 22.7 |
| 5 | grey-teal as now | none | 54 px | 17.6 |
| 6 | grey-teal as now | 1 px | 54 px | 26.7 |
| 7 | darker shade end | none | 54 px | 14.6 |
| 8 | darker shade end | 1 px | 54 px | 23.3 |

What the eight show:

- **The outline does the work:** it raises the edge step by half (17.6 to 26.1). Nothing else comes near.
- **The darker shade end alone makes it harder to see against the grass** (17.6 to 14.7): the shaded side comes nearer to the grass's own lightness (0.43). What it gives is form inside the figure: arm, belly and brow separate.
- **54 px does not change the edge** (17.6 both). It gives the face and ears a few more pixels, and the goblin is then 56 % of a human, not half.

**Recommendation: cell 4** (darker shade end, 1 px outline, 48 px). The outline answers "hard to see on the grass"; with it holding the edge, the darker shade end can be spent on form. Cell 2 has the strongest edge by the number, with the flat pale body as before. **Michael picks.**

What an outline brings with it: it would go on every character (his rule of 5:35 PM: whatever look is picked "must be applied identically to every character"), and it is a new shader step.

**Michael, 8:30 PM: "Go with cell 4's setup: darker shade end, 1 px outline, 48 px. Outline on all characters: build the shader step for it."** The outline step: `docs/art-layered-characters.md`, "The outline".

### 4. The greener skins

Michael, 8:30 PM: "But grey-teal doesn't look like a goblin. Now that the outline does the readability work, try greener skins. Same frame, by House 1 next to the peasant, 1x and 4x, all with outline and darker shade end: a. lighter yellow-green / lime-olive (warmer and brighter than the grass); b. jade / blue-green (clearly green, cooler than the grass); c. the model's original green. Give each one's edge step. Keep grey-teal as a variant ramp."

Picture: `goblin-skin-greens.png` (made by `/mnt/project-files/characters/goblin/skin_grid.py`). No new render: the same 48 px frame, finished once with each ramp.

| Skin | Ramp in `style.mjs` | Colours, dark to pale | Hue | Edge step, with the outline | Against the grass, as if no outline |
|---|---|---|---|---|---|
| a. lime-olive | `skin_lime` | `#4e6026 #657734 #7e8f42 #95a550 #adba5f` | 124 to 116 | **24.8** | 14.9 |
| b. jade | `skin_jade` | `#275f44 #377552 #478b61 #599e6f #6bb17d` | 160 to 151 | 22.6 | 13.1 |
| c. the model's own green | `skin_own` | `#243511 #2d4217 #374f1e #415c24 #4b692c` | 131 | 12.8 | 8.2 |
| c+. the same, lifted | `skin_own_lifted` | `#4c6335 #5c7742 #6a894d #779858 #85a865` | 131 | 23.2 | 13.3 |
| grey-teal (cell 4) | `skin_teal_deep` | `#3a6363 #4e7676 #608787 #709696 #7ea3a2` | 196 to 194 | 22.7 | 14.7 |

- **The model's own green is the grass.** Its paint has hue 131; the grass by House 1 has hue 131. Lit by the official sun (which is behind the scene, so the front is in shade) its lightness runs 0.31 to 0.48; the grass is 0.43. c is those colours as they render, in five tones. Without the outline it would be the hardest of all to see (8.2).
- **c+ was not asked for:** the model's hue at the lightness of the other skins, so that its green gets a fair try. It still has the grass's hue; lightness alone separates it.
- **a** is the only one both warmer and brighter than the grass, and has the strongest edge.
- With the outline the edge step measures skin against the dark line, so it mostly rewards a paler skin; the last column says what the colour itself does.
- All of these are new colours, not the tileset's, as grey-teal is. Hue and lightness are OKLCH.

**Recommended: a, lime-olive. Michael picks.**

**Variants ("Keep grey-teal as a variant ramp"):** a goblin's skin is a colour filled in when it is drawn (`scripts/art/wardrobe.json`, `races.goblin.colours.skin`), so a variant needs no render. One thing to settle when the main skin is picked: a layer pixel holds the tone's place in the ramp it was finished with, and two ramps whose five tones are not equally light pick a neighbouring tone for about a quarter of the skin pixels. So the variants' lightness steps will be matched to the main skin's (a change of a few hundredths), or a variant will be a tone off here and there. Not done yet.

### Proof that nothing else changed

- Finishing (`finish_sprite.mjs`, `paperdoll.mjs`, the three new ramps): 8 Peasant pictures, 330 human layer pictures and 56 prop pictures made again, 0 pixels differ (`pixdiff.mjs`). The same again after the four trial greens and the outline (2026-11-21, 8:50 PM): 0 differ; and `paperdoll.mjs wear --no-outline` against the script as it was, 30 pictures, 0 differ.
- Rendering (`character.py`): the same 40 pictures rendered with the script as it was and as it is now (a whole figure, and parts in views with `--point --quick`), 0 pixels differ.
