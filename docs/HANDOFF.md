# Handoff — Renown

Updated: 2026-11-13

## Goal
- A small, self-hosted multiplayer isometric roleplay sandbox: friends share one world, but each player lives their own life and grows as strong as they want, on their own path.
- Why: in co-op games like Divinity or Baldur's Gate 3, friends are kept so close together that when one takes the loot the others get nothing and have no other choice. Here each player can go their own way.
- Mostly for Michael and his friends. Not planned for sale.

## Vision (Michael's requirements)
- **Multiplayer, not an MMO:** players host their own server, about 10 players (could be fewer or more).
- **Isometric.**
- **Roleplay.**
- **Own life:** a player can play without interacting with the others, but can if they want to, or when they run into them. They can go explore and loot a different area, a bit like Enshrouded.
- **PvP and PvE.**
- **Quests, NPCs, a living world.**
- **Living NPCs, and a lot of them:** NPCs live their own lives. One sees loot a player left, takes it and gets stronger. One who kills a player rises in rank (in the spirit of Shadow of Mordor, not a copy). Some keep a shop, some hunt, some take quests and kill monsters. If performance is a problem, not all of them have to be full AIs.
- **Factions and races:** several of each, some "good", some "evil".
- **Random birth:** on joining a server the player chooses nothing. Race, name, class and everything else are random. One player joins as a noble human with "high" intellect (high for a new player); another as some kind of monster with low intellect and high strength.
- **World shaped by each player's actions:**
  - Murdering NPCs or players makes the towns nearest the murder see that player as evil. The fame can spread to the whole world.
  - Good deeds are recognised and spread the same way.
  - Helping one faction more can win it territory, or simply make it stronger than the other factions.
- **Perception:** people build a memory of you, personal and shared. Traits like "dread", "evil", "good" say how you are perceived, and each faction also has its own opinion of you.
- **Ultimate goal:** a player can aim to become a kind of boss that others try to kill, for being too powerful and too evil, or too good.
- **Death:** permadeath (D3).
- **References:** V Rising is the closest he knows, but not really the same. Enshrouded for the freedom to roam apart. Shadow of Mordor for NPCs that grow. No MMOs.

## Where we are
- Created from the playbook (full mode): repo `michael-leblanc/renown`, private. No game code yet, no Godot project yet. Unrelated to Crown of the Tomb.
- `docs/decisions.md` holds D1 to D7 (list under Decided). Stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
- Art audited from the files. Four packs share one format (8 direction rows, 128 px frames):
  - **Fantasy tileset - 2D Isometric V1.1:** about 470 environment pieces, each in 4 rotations (113 ground, 104 wall, 57 roof, 99 props, plus trees, stones, doors, chests). 7 characters (1 fighter, 3 villagers, 3 skeletons) with 24 animations each, riding included. Effects, destructible tiles, portals, water.
  - **2D Orcs and Goblins V1.0:** 12 orcs, 17 goblins, 2 beasts.
  - **2D Demons V1.1:** 10 imps, 13 spawn, 5 beasts, 6 elites.
  - **2D Zombie pack 2 V1.1:** 42 zombies. About half are modern (cop, fireman, soldier, worker, radioactive).
- **Character Creator - Fantasy 2D** (SmallScaleInt): owned, not inspected. Per its store page: modular Human, Undead and Spirit characters, gear parts, mounts, PNG export in the same format.
- Not usable in the world: the 12 side-view pixel packs from Crown of the Tomb (one facing only). Possible use: portraits.

## Decided
- Name: Renown — after the reputation that spreads from town to town.
- Playbook full mode, one repo.
- Separate project from Crown of the Tomb — different game, different art.
- Personal use — licence terms are not a blocker; keep the art in a private repo.
- **Stack (D1):** Godot 4.7 pinned, GDScript only. Desktop builds for players; the same project exported headless for Linux is the dedicated server. No web build. Server-authoritative over Godot multiplayer (ENet). Tests with GUT from `scripts/verify.sh`.
- **Free to split up (D2):** nothing keeps players together. Loot is shared world loot, never per-player; a player who wants their own goes somewhere else. Players can still affect each other.
- **Permadeath (D3):** death is final, then a fresh random birth. The corpse's gear stays where the character died, as world loot. A killed villain does not come back.
- **One character model (D4):** an NPC is a player character driven by AI. Same stats, loot, XP, permadeath, reputation and random birth. No "players only" or "NPCs only" rule without a new decision.
- **Witnesses (D5):** a deed only changes reputation if a character sees it or the body is found. The witness must survive and reach a town; word then spreads town to town and fades with distance.
- **Three levels of detail (D6):** every NPC is a real character, simulated in full near a player, coarsely in the same region, abstractly far away. Rule-based AI, not a language model. The NPC budget comes from a measurement, not a guess.
- **Traits, standing, memory (D7):** traits say how a character is perceived, and several hold at once (good but feared). Each faction also keeps its own standing with the character: traits set how readily it accepts them, deeds against its people lower it. Individuals remember personally; the world remembers as a whole. A character can become a legend others set out to kill.

## Next steps
- [ ] **Next: which traits exist in the first version (D8). The question is asked, waiting for Michael:** proposed three: Morality (good to evil), Mercy (merciful to dreaded), Fame (unknown to legendary). Recommended: start with these three.
- [ ] Then, one question at a time, each recorded in `docs/decisions.md`: what traits and standing change (prices, guards, quests, bounties) → first playable races → the smallest playable slice (proposal: one region, two factions, random character on join, reputation spreading town to town, death leading to a new random life).
- [ ] Measure early (D6): one of the first build tasks spawns N NPCs on the headless server and prints the tick time.
- [ ] Living NPCs, proposed build order: shared character rules (D4) → NPCs loot, equip and level, and one who kills a player gets a name and a rank → a small fixed set of jobs → the coarse and abstract levels (the hard part).
- [ ] Open the Character Creator: can it export body and gear as separate layers? This decides whether loot can change how a character looks. (Michael chose to define the game first.)
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined). D4 is a candidate domain rule.
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- How many NPCs is "a lot"? Unknown how many the server can run; needs the measurement.
- Reputation: which deeds feed which trait? What do traits and standing change? What makes a legend, and what does the world do about one? How does a witness know who they saw? How much does one NPC remember?
- Death extras: does a hidden stash or the uncovered map survive? Can a player die on purpose to reroll? How easily does a character die (downed state, PvP rules)?
- Living NPCs: which jobs, and how does an NPC pick one? What extra rank does an NPC get for killing a player? Where do new NPCs come from, since dead ones stay dead? Are monsters and animals characters under D4, or something simpler?
- World simulation: how do we stop it collapsing (everyone dead, or one NPC far too strong)?
- Which races are playable first? Zombies look NPC-only (no block or dodge animations).
- Does loot come back after it is taken? How much world do about 10 players need to each find their own?
- Save format: files or SQLite? Decide in the server design.
- Missing art: dungeon and interior tiles, item and UI icons, other biomes. The human side is thin without the Character Creator.

## Gotchas
- "Players shouldn't cost each other" was a misreading. Stolen loot was only an example of friends being forced to stay together. Don't design per-player loot or other protections from it.
- The Character Creator's live gear swapping is Unity-only. In Godot, characters are pre-baked sheets unless the Creator exports separate layers.
- The art is heavy: about 1.2 GB unpacked across the four packs. Too big to upload to a chat; keep it in the repo or a local folder.
- The tileset's `.anim` and `.controller` files are Unity-only. Rebuild animations from the PNG grids.
- This handoff exists twice: `docs/HANDOFF.md` in the repo and the `HANDOFF` doc in the Claude project. Update both together.

<!--
Rules for whoever updates this:
- Replace stale lines, don't append history. Aim for ~60 lines; the Vision section is the reason this one is longer.
- "Where we are" = facts you checked, not plans.
- Move settled questions to "Decided".
- Vision = Michael's own requirements. Don't add to it without him.
-->
