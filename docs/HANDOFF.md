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
- **Factions and races:** several of each. A race is not good or evil in itself (think WoW: orcs aren't really evil). Some sub-factions can be evil, and that is true for humans too.
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
- `docs/decisions.md` holds D1 to D13 (list under Decided). Stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
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
- **Three traits (D8):** Morality (good ↔ evil), Mercy (merciful ↔ dreaded), Fame (unknown → legendary, only grows). Fame is separate from good and evil and is what makes a legend. Honour and Greed are left out for now. A fourth trait is a new decision.
- **What reputation changes (D9):** standing sets guards (attack on sight when low) and prices (shops refuse at the bottom). Traits set fear (weaker NPCs flee the dreaded, enemies yield sooner to the merciful) and bounties (a faction posts one on a famous character of the opposite leaning; players and NPCs can collect). Quests are not affected yet.
- **Races (D10):** Human, Orc and Goblin are playable first. A race is never good or evil; factions and sub-factions are, and any race can have both kinds. Skeletons, demons and zombies are not playable yet.
- **First slice (D11):** a headless server and at least two clients; one hand-built region with two towns and wilderness between; two factions, one town each; random birth as Human, Orc or Goblin; move, fight, loot, die, then a new random life with the corpse left as loot; townsfolk, guards and a few roamers at full detail; a witnessed deed reaches the nearest town, then the other; guards and prices react. After the slice: fear, bounties, quests, NPC jobs, the coarse and abstract levels, more regions.
- **Slice factions (D12, "for now"):** a human faction and an orc-and-goblin faction, one town each. Rivals, not good against evil. A character is born into their race's faction. The two dislike each other by default, so a new character starts with low standing with the other one, and deeds can change that either way. Michael names the factions and towns. Evil sub-factions and mixed-race factions come after the slice.
- **Disliked, not hostile (D13, "for now"):** a new character can enter the other faction's town, pays more, and is watched. Guards attack at the first crime, not on sight. Starting standing is low but above the attack-on-sight level.

## Next steps
- [ ] **Next: do characters of the two factions fight on sight in the wilderness (D14)? The question is asked, waiting for Michael:** proposed: no. One rule everywhere: a character is attacked for their standing, not their faction, so by default the two sides pass each other warily. Reasons: under D4 an on-sight rule would also hit a newborn player, and dead NPCs stay dead with no source of new ones yet, so the roamers would wipe each other out. Wilderness danger then comes from monsters (skeletons, zombies, demons). Recommended: no.
- [ ] Then the other slice details, one at a time: combat and stats, whether traits are tracked in the slice, whether the world is saved between restarts.
- [ ] Check in the art files that orcs and goblins have the full animation set (block, dodge) before building them as playable.
- [ ] Measure early (D6): one of the first build tasks spawns N NPCs on the headless server and prints the tick time.
- [ ] Living NPCs, proposed build order: shared character rules (D4) → NPCs loot, equip and level, and one who kills a player gets a name and a rank → a small fixed set of jobs → the coarse and abstract levels (the hard part).
- [ ] Open the Character Creator: can it export body and gear as separate layers? This decides whether loot can change how a character looks. (Michael chose to define the game first.)
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined). D4 is a candidate domain rule.
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- How many NPCs is "a lot"? Unknown how many the server can run; needs the measurement.
- Reputation: what counts as a crime, and what "watched" means in play (D13)? The exact deeds and how far each moves a trait? Do Morality and Mercy drift back toward the middle? The thresholds for guards and bounties? What does yielding look like (needs a "beaten but alive" state)? Who pays a bounty and how is it claimed? What makes a legend, and what does the world do about one beyond bounties? How does a witness know who they saw? How much does one NPC remember?
- Death extras: does a hidden stash or the uncovered map survive? Can a player die on purpose to reroll? How easily does a character die (downed state, PvP rules)?
- Living NPCs: which jobs, and how does an NPC pick one? What extra rank does an NPC get for killing a player? Where do new NPCs come from, since dead ones stay dead? Are monsters and animals characters under D4, or something simpler?
- World simulation: how do we stop it collapsing (everyone dead, or one NPC far too strong)?
- Factions: beyond the slice's two (D12), which factions and sub-factions exist, which races are in each, and which are good or evil? What are the slice's factions and towns called? What does a race change (stat ranges, classes)?
- Slice: how big is the region and how many NPCs? Combat rules, stats, classes, gear? Are the three traits tracked in the slice, or only standing?
- Does loot come back after it is taken? How much world do about 10 players need to each find their own?
- Save format: files or SQLite? Decide in the server design.
- Missing art: dungeon and interior tiles, item and UI icons, other biomes. The human side is thin without the Character Creator.

## Gotchas
- Never call a race "evil-leaning" or "good-leaning" (D10). Michael corrected this: only factions and sub-factions are good or evil.
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
