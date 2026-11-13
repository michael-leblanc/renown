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
- **References:** V Rising is the closest he knows, but not really the same. Enshrouded for the freedom to roam apart. Shadow of Mordor for NPCs that grow. RuneScape and Ultima Online for click-to-move control (D16). No MMOs.

## Where we are
- Created from the playbook (full mode): repo `michael-leblanc/renown`, private. No game code yet, no Godot project yet. Unrelated to Crown of the Tomb.
- `docs/decisions.md` holds D1 to D30 (short list under Decided; the detail is in the file). D13 is replaced by D14. Stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
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
- **Stack (D1):** Godot 4.7 pinned, GDScript only. One project: desktop clients plus a headless Linux server. Server-authoritative over ENet. GUT tests from `scripts/verify.sh`.
- **Free to split up (D2):** nothing keeps players together. Loot is shared world loot, never per-player.
- **Permadeath (D3):** death is final, then a fresh random birth. The corpse's gear stays as world loot.
- **One character model (D4):** an NPC is a player character driven by AI. No "players only" or "NPCs only" rule without a new decision.
- **Witnesses (D5):** a deed counts only if a character sees it or the body is found. The witness must reach a town; word then spreads town to town and fades.
- **Three levels of detail (D6):** full near a player, coarse in the region, abstract far away. Rule-based AI. The NPC budget comes from a measurement.
- **Reputation (D7 to D9):** traits say how a character is perceived: Morality, Mercy, Fame (only grows). Each faction keeps its own standing. Standing sets guards and prices; traits set fear and bounties. A fourth trait is a new decision.
- **Races (D10):** Human, Orc and Goblin are playable first. A race is never good or evil; factions and sub-factions are.
- **First slice (D11):** a headless server and two clients; one hand-built region, two towns, two factions; random birth; move, fight, loot, die, reborn; townsfolk, guards and roamers at full detail; a witnessed deed travels town to town; guards and prices react. After the slice: fear, bounties, quests, NPC jobs, the coarse and abstract levels, more regions.
- **Slice factions (D12, "for now"):** a human faction and an orc-and-goblin faction, one town each. Rivals, not good against evil. Born into your race's faction; harming your own people can lose you your own town. Michael names the factions and towns.
- **At war (D14, "for now"; replaces D13):** the other town's guards attack on sight, and NPCs of one side attack characters of the other on sight in the wilderness, player or NPC. Deeds cannot win the enemy faction over. Michael expects to soften this later.
- **Towns replace their dead (D15):** a new random-birth NPC appears in its faction's town after a delay, never above the starting population.
- **Combat (D16 to D18):** click to move and click to attack, like RuneScape and Ultima Online. Attacks repeat on their own at the weapon's speed; each hit, block and dodge is a roll on stats. Characters stand on a tile grid and walk in 8 directions.
- **Character (D19 to D21, D24):** four stats: Strength, Agility, Endurance, Intellect (learns faster). Skills grow by use. No level: a stranger is judged by gear and reputation. A class is a background (noble, hunter, thief) that sets starting skills and gear and locks nothing.
- **Six talents (D25, "for now"):** born with; a talent opens skills others can never learn. Gifted (magic), Mighty, Voice, Keen senses, Beast-kin, Silver tongue. Most characters have none or one. Stealth is a normal skill.
- **Knowledge (D22, D23):** the slice tracks standing, Morality and Fame; Mercy waits. Inspecting a character shows only what your own character knows. You learn by seeing a deed, by asking an NPC what its town knows, or (if possible) by overhearing NPCs talk.
- **Zero health (D26):** in the slice the character dies at once. The fallen state (winner finishes or spares) is the first thing after the slice and brings in Mercy.
- **Saved world (D27):** the slice saves the whole world to disk now and then and on shutdown, and loads it on start. Every feature that adds state also saves and loads it. The format stays with the server design.
- **NPC judgement (D28):** an NPC judges an enemy as a player does, from gear and from what it has heard or remembers, never from true stats. Guards and roamers fight unless the enemy looks clearly stronger; townsfolk run to the guards. An NPC can be wrong.
- **Strangers (D29, D30):** a character's name is hidden until your character learns it. Race shows unless an item hides it (clothes covering the body or face). A deed is attached to a face, not a name: you recognise someone you heard about or saw act when their face is showing; a covered face is not recognised.

## Next steps
- [ ] **Next: the art check.** The slice's skills, backgrounds and gear depend on it. From the art files (on Michael's computer, not in the repo; ask him for the folder): for each character sheet, which weapon it holds and which animations it has. Confirm that orcs and goblins have the full set (block, dodge) before building them as playable. Note any sprite with a covered face or body (D29).
- [ ] Then, one at a time: which skills, backgrounds and talents exist in the slice, how a random birth rolls them, gear, abilities.
- [ ] Design questions that don't need the art, one at a time: how a character learns a name (D29), what counts as a crime, what happens to a deed done with the face covered (D30), how big the region is.
- [ ] Measure early (D6): one of the first build tasks spawns N NPCs on the headless server and prints the tick time.
- [ ] Living NPCs, proposed build order: shared character rules (D4) → NPCs loot, equip and gain skills, and one who kills a player gets a name and a rank → a small fixed set of jobs → the coarse and abstract levels (the hard part).
- [ ] Open the Character Creator: can it export body and gear as separate layers? This decides whether loot can change how a character looks. (Michael chose to define the game first.)
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined). D4 is a candidate domain rule.
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- How many NPCs is "a lot"? Unknown how many the server can run; needs the measurement.
- War (D14): how and when does it soften? Does a character cast out by their own faction have anywhere to go? Do NPCs go looking for the enemy (patrols, raids) or only fight when they meet?
- NPC judgement (D28): how are gear and fame weighed into "looks stronger"? What does a fighter do when it backs off? Do numbers count?
- Reputation: what counts as a crime? The exact deeds and how far each moves a trait? Do Morality and Mercy drift back toward the middle? The thresholds for guards and bounties? What does yielding look like (needs a "beaten but alive" state)? Who pays a bounty and how is it claimed? What makes a legend, and what does the world do about one beyond bounties? How much does one NPC remember?
- Death extras: does a hidden stash or the uncovered map survive? Can a player die on purpose to reroll? Does running from a fight cost anything? PvP rules? The fallen state's rules (after the slice, D26)?
- Living NPCs: which jobs, and how does an NPC pick one? What extra rank does an NPC get for killing a player? Replacement (D15): the delay, the newcomer's role and starting gear, and are monsters replaced? Are monsters and animals characters under D4, or something simpler?
- World simulation: how do we stop it collapsing (everyone dead, or one NPC far too strong)?
- Factions: beyond the slice's two (D12), which factions and sub-factions exist, which races are in each, and which are good or evil? What are the slice's factions and towns called? What does a race change (stat ranges, classes)?
- Slice: how big is the region and how many NPCs? Which skills, backgrounds and gear? Which talents does the slice use, if any, and do a stat, a background or a race change the odds (D25)? The hit, block and dodge formulas?
- Hearing (D23): is overhearing in the slice? How often do NPCs talk and how close must a listener be? Does an NPC hold back from someone it distrusts? Can players pass knowledge on?
- Inspect, names and faces (D22, D29, D30): how does a character learn a name? Which items hide race or face, and are any in the slice? How do towns react to a hidden face? What happens to a deed done with the face covered? Does a player's knowledge survive death? Can what is heard be wrong or out of date? Do NPCs act on what they personally know?
- Does loot come back after it is taken? How much world do about 10 players need to each find their own?
- Saving (D27): files or SQLite (decide in the server design)? How often? What happens to a character while its player is offline?
- Missing art: dungeon and interior tiles, item and UI icons, other biomes. The human side is thin without the Character Creator.

## Gotchas
- Never call a race "evil-leaning" or "good-leaning" (D10). Michael corrected this: only factions and sub-factions are good or evil.
- "Players shouldn't cost each other" was a misreading. Stolen loot was only an example of friends being forced to stay together. Don't design per-player loot or other protections from it.
- Don't design cross-faction friendship for the slice. Michael first chose "disliked, not hostile" (D13), then replaced it with open war (D14).
- V Rising is a reference for the world, not for the controls. Michael prefers click-to-move (D16); don't propose WASD or hand-timed block and dodge.
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
