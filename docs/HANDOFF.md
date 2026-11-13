# Handoff — Renown

Updated: 2026-11-12

## Goal
- A small, self-hosted multiplayer isometric roleplay sandbox: friends share one world, but each player lives their own life and grows as strong as they want, on their own path.
- Why: in most co-op games one player's actions directly cost the others (one loots all the chests, the rest get nothing). Here they shouldn't.
- Mostly for Michael and his friends. Not planned for sale.

## Vision (Michael's requirements)
- **Multiplayer, not an MMO:** players host their own server, about 10 players (could be fewer or more).
- **Isometric.**
- **Roleplay.**
- **Own life:** a player can play without interacting with the others, but can if they want to, or when they run into them.
- **PvP and PvE.**
- **Quests, NPCs, a living world.**
- **Factions and races:** several of each, some "good", some "evil".
- **Random birth:** on joining a server the player chooses nothing. Race, name, class and everything else are random. One player joins as a noble human with "high" intellect (high for a new player); another as some kind of monster with low intellect and high strength.
- **World shaped by each player's actions:**
  - Murdering NPCs or players makes the towns nearest the murder see that player as evil. The fame can spread to the whole world.
  - Good deeds are recognised and spread the same way.
  - Helping one faction more can win it territory, or simply make it stronger than the other factions.
  - A player can become so evil and so powerful that other players decide to train until they can kill them.
- **Death:** permadeath, or a huge penalty.
- **References:** V Rising is the closest he knows, but not really the same. No MMOs.

## Where we are
- Created from the playbook (full mode): repo `michael-leblanc/renown`, private. No game code yet, no Godot project yet. Unrelated to Crown of the Tomb.
- Stack recorded as D1 in `docs/decisions.md`; stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
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

## Next steps
- [ ] **Next: open the Character Creator.** Can it export body and gear as separate layers? This decides whether loot can change how a character looks.
- [ ] Define the smallest playable slice. Proposal: one region, two factions, random character on join, reputation spreading town to town, death leading to a new random life.
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined).
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- Death: permadeath or a heavy penalty?
- Which races are playable first? Zombies look NPC-only (no block or dodge animations).
- How do players avoid hurting each other's progress (for example, per-player loot)?
- How does reputation spread (distance, witnesses, time) and what does it change?
- Save format: files or SQLite? Decide in the server design.
- Missing art: dungeon and interior tiles, item and UI icons, other biomes. The human side is thin without the Character Creator.

## Gotchas
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
