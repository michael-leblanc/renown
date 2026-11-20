---
name: renown-prop
description: Make a code-made prop or scenery sprite for Renown (a chest, a stone, a crate, a ruin) with the kit in scripts/art/. Use when asked to make, draw or generate a prop, a scenery piece or a tileset-format sprite for the game. Not for characters, animals or trees.
---

# Making a prop for Renown

A prop here is **code-made art**: its shape is written as maths in a script, and the kit (`scripts/art/kit.mjs`) draws it as PNG sprites the test game takes unchanged. No image model, no 3D program, no package.

## Before you start
- Read `docs/art-experiments.md`: Michael's verdicts and what already exists.
- **Something that moves** (fire, water, an effect, a door that opens) is `.claude/skills/renown-anim/SKILL.md`, which builds on this one. So is trying props together in a place (the scene page).
- **Not for characters, animals or trees.** They come out stiff this way. Michael rejected code-made characters; characters are the Creator (D121).
- **No carvings, symbols or writing on old stone** (D68: the game never confirms a theory). Scenery says nothing.
- **Agree the prop first:** what it is, how many tiles it covers, how tall beside a character, and which tileset piece it should sit next to. If Michael is there, ask one question; if not, state your reading at the top.
- **Show a rough draft before adding detail.** Detail at the pixel level barely shows at game size (Michael saw no difference between two versions of the doorway).

## The format (the kit does this for you)
- 256 x 256 PNG, hard edges, tile middle at pixel 128,208. One tile is 128 x 64 px.
- 4 sides: `<Name>_S`, `_E`, `_N`, `_W`. A separate black ground shadow per side, which the game draws at 0.3 alpha.
- Names follow the tileset: `Chest A1`, `Chest A1 Open`, shadow `Chest Shadow A1`. Spaces are kept.
- Sprites go in `game/client/art/made/`. The bought tileset is in `game/client/art/tiles/`; never write there.

## The space a prop is written in
- x is across, **y is up**, z comes towards the viewer. The ground is y = 0 and the tile's middle is x = z = 0.
- **One tile is 1 x 1.** A Creator character is about 1.4 tall. The chest is 0.56 wide and 0.39 tall; the tall standing stone is 1.95.
- To stay inside the picture: at most about 1.3 from the middle across, and 2.6 tall.
- **A prop longer than one tile:** on the ground, half its length plus half its width must stay under about 1.45 (the tent is 0.82 + 0.58; its guy ropes run along the middle, where there is room). A ground point lands on pixel row 208 + 32 × (x + z), so past 1.5 the corner nearest the viewer is cut off at the bottom of the picture, in whichever side puts it in front. Pegs and grass at the foot count.

## Writing one
A prop is an object with `sdf(x, y, z)`, the distance from a point to its surface, built from the kit's shapes. `scripts/art/props.mjs` holds the real ones. A whole crate, in its simplest form (the one in `props.mjs` adds a brace and a thicker frame):

```js
import { clamp, h3, sdBox, chBox, hit, WOOD, gaps, run } from './kit.mjs';

const S = .22, H = .4;                                  // half its side, its height
const crate = {
  H, bound: [S + .1, H / 2 + .05, S + .1],              // a box that holds all of it
  sdf(x, y, z) {
    const ax = Math.abs(x), az = Math.abs(z), cy = y - H / 2;
    let d = chBox(x, cy, z, S, H / 2, S, .008); hit.mat = WOOD; hit.grv = 1;
    // boards: upright on the four sides, lying on the top
    const top = y > H - .01, [fj, board] = gaps(top || ax > az ? z : x, .11);
    hit.var = h3(board, top ? 0 : ax > az ? 1 : 2, 7);
    d += .006 * clamp(1 - fj / .08, 0, 1); if (fj < .07) hit.grv = 0;
    // a frame of thicker boards round every face: a slightly bigger box with the middle of each face cut out
    const cut = Math.min(sdBox(x, cy, z, S + .1, H / 2 - .05, S - .05, 0), sdBox(x, cy, z, S - .05, H / 2 - .05, S + .1, 0), sdBox(x, cy, z, S - .05, H / 2 + .1, S - .05, 0));
    const frame = Math.max(chBox(x, cy, z, S + .014, H / 2 + .006, S + .014, .008), -cut);
    if (frame < d) { d = frame; hit.grv = 1; hit.var = .5; }
    return d;
  },
};

run({ 'Crate A1': { shadow: 'Crate Shadow A1', ...crate } });
```

- **Joining shapes:** `Math.min(a, b)` is both, `Math.max(a, -b)` is a with b cut out, `Math.max(a, b)` is where they overlap.
- **`hit` must be right for the point when `sdf` returns:** `mat` (ROCK, WOOD, IRON, CANVAS, GRASS, FIRE), `grv` (0 in a gap, drawn dark), `var` (a number per board or face, so the odd one is a tone off; -1 inside a box). Set it again after calling another shape that changes it.
- **`bound`** is `[half x, half height, half z]` of a box standing on the ground that holds everything, grass included. Too small cuts the prop off; `boundZ` moves its middle along z.
- **Canvas and fire:** CANVAS takes `var` -1 for the dark inside of a tent and -2 for its floor. FIRE gives its own light: `var` is its heat, 0 (red tip) to 1 (yellow heart), and sun and shade don't change it.
- **Options on the prop itself:** `noMoss: true` (stone that stays bare, like a fire ring), `cast(x, y, z)` (the shape that throws the shadow, when part of the prop throws none: flames), `glow: [x, y, z, reach]` (bare stone turned to that point, within reach, is drawn in firelight). `scripts/art/camp.mjs` uses all three.
- **Ready parts:** `cutStone` and `cutSdf` (stone in flat faces, like the tileset's boulders), `gaps` (boards and courses), `tufts` and `tuftSdf` (grass at the foot), `chBox` (cut edges), `sdBox`, `sdCap`. Moss, rain streaks and edge highlights come with ROCK.
- **Keep bumps small** (a few thousandths): adding noise or grooves to a distance makes it slightly wrong, and big ones leave holes.
- **A new material:** list a tileset piece's colours with `node scripts/art/colours.mjs "Door A1_S"`, add a ramp to `RAMP` in `kit.mjs` (dark to pale, 5 to 7 tones) and a branch where the material picks its tone. Put a new ramp's name in `EXTRA` in `kit.mjs`: a sprite then snaps to it only if the prop uses it, so the older sprites cannot change. Then draw every existing prop again (`props.mjs` and `camp.mjs`, no flags) and check `git status` shows no changed PNG.

## The loop: draw, look, fix
1. **Draft** (about a second; writes no sprite):
   ```
   node scripts/art/props.mjs "Crate A1" --draft --beside "Chest A1_S"
   ```
   Add `--with-character` to get the first side again with a human standing on the next tile. Use it for the rough draft: size beside a person is the first thing Michael judges.
2. **Look** at `scripts/art/out/art-draft.png` with the Read tool: all 4 sides on grass with their shadows, then the human if asked for, and the piece named by `--beside` at the end.
3. **Read the two numbers** it prints. Brightness should be close to the tileset piece's. A much lower spread means the prop is flat: give it more faces or stronger light and dark.
4. **Fix and repeat.** After about 4 rounds, stop and show Michael what you have.
5. **Write the sprites:** the same command without `--draft`.

## Finishing
- Import it in Godot, so it writes the `.import` files and shows the PNG loads:
  ```
  scripts/godot.sh --headless --path game --import
  ```
- Commit the PNGs **and** the `.import` files Godot wrote beside them.
- List the prop in `docs/art-experiments.md`, with what was checked and what was not.
- Putting a prop in the seeded world (blocking, pathfinding) is a task of its own, not part of making it.

## Files
- `scripts/art/kit.mjs`: shapes, parts, colours, camera, light, the command line.
- `scripts/art/props.mjs`: standing stones, chests, a crate and a barrel. Add small props here, or start a new script for a family.
- `scripts/art/camp.mjs`: a lit campfire and a canvas tent. The family for camp gear.
- `scripts/art/doorway.mjs`: the doorway, written before the kit. It does not use it and takes about 22 seconds a side. Its sprites are the ones Michael liked: redraw them only if asked.
- `scripts/art/colours.mjs`, `scripts/art/png.mjs`: helpers.
