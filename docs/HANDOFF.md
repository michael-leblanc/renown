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
- `docs/decisions.md` holds D1 to D25 (list under Decided). D13 is replaced by D14. Stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
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
- **Slice factions (D12, "for now"):** a human faction and an orc-and-goblin faction, one town each. Rivals, not good against evil. A character is born into their race's faction. A character who harms their own people can lose their own town. Michael names the factions and towns. Evil sub-factions and mixed-race factions come after the slice.
- **At war (D14, "for now"; replaces D13):** the two factions hate each other. The other town's guards attack on sight, and NPCs of one side attack characters of the other on sight in the wilderness, player or NPC. Deeds cannot win the enemy faction over; the war overrides standing. Michael expects to soften this later.
- **Towns replace their dead (D15):** when a faction's NPC dies, a new random-birth NPC appears in its town after a delay, never above the town's starting population. The war can't be won by killing everyone, and loot never runs out.
- **Click to move, click to attack (D16):** like RuneScape and Ultima Online. The server finds the path. Block and dodge come from stats, not reflexes, so stats decide more of a fight.
- **Attacks repeat on their own (D17):** one click on a target starts the fight; the character attacks at its weapon's speed and each hit is a roll on stats. The player decides the target, when to run, when to heal and what to wield. NPCs fight the same way.
- **Tile grid (D18):** a character stands on one tile and walks tile to tile in 8 directions, drawn smoothly. Distances are counted in tiles. Players and NPCs share the pathfinding.
- **Four stats (D19):** Strength (melee damage, carrying), Agility (hitting, dodging, attack speed), Endurance (health, blocking), Intellect (learns faster; magic later). Skills such as stealth are a separate thing from stats. A fifth stat is a new decision.
- **Skills grow by use (D20):** sneaking raises Stealth, fighting with a sword raises Swords. No points to spend. Intellect makes skills rise faster. "XP" in D3 and D4 now means skill gains.
- **No level (D21):** a character is its stats and skills, with no number summing them up. A stranger is judged by gear and reputation. Harsher with permadeath, and reputation has to be visible enough to judge by.
- **Slice traits and inspect (D22):** the slice tracks standing, Morality and Fame; Mercy waits for a "beaten but alive" state. A player can inspect a character and sees only what their own character knows: nothing interesting about someone never heard of, the known information about someone heard of from NPCs or seen in the act. Knowledge is per character.
- **Hearing about others (D23):** a player asks an NPC in a town and it tells what the town knows. If possible, NPCs also talk to each other now and then, and a player close enough gets that knowledge automatically. Being in a town is not enough.
- **Backgrounds and talents (D24):** a class is a background (noble, hunter, thief) that sets starting skills and gear and locks nothing. Talents are separate and born with: a talent opens something that can't be learned without it. Magic needs a talent. A character is stats, skills, a background and talents, all rolled at birth.
- **Six talents (D25, "for now"):** Gifted (magic), Mighty (heavy weapons, feats of strength), Voice (songs that calm or rally, tales that spread fame), Keen senses (tracking, night sight), Beast-kin (taming and riding), Silver tongue (persuading, haggling, false rumours). Most characters are born with none or one. Stealth is a normal skill, not a talent. A seventh is a new decision.

## Next steps
- [ ] **Next: what happens at zero health in the slice (D26). The question is asked, waiting for Michael:** A, the character dies at once: simplest, and running away is the way to survive. B, the character falls and the winner chooses to finish or spare them: this is the "beaten but alive" state that Mercy and yielding need (D9, D22), and it softens permadeath, but it is more to build. Recommended: A for the slice, B right after it, because the slice already leaves Mercy out (D22).
- [ ] Then, one at a time: which skills, backgrounds and talents exist in the slice, how a random birth rolls them, gear, abilities, how an NPC decides to fight or run (D21), then: whether the world is saved between restarts.
- [ ] Check in the art files that orcs and goblins have the full animation set (block, dodge) before building them as playable.
- [ ] Measure early (D6): one of the first build tasks spawns N NPCs on the headless server and prints the tick time.
- [ ] Living NPCs, proposed build order: shared character rules (D4) → NPCs loot, equip and level, and one who kills a player gets a name and a rank → a small fixed set of jobs → the coarse and abstract levels (the hard part).
- [ ] Open the Character Creator: can it export body and gear as separate layers? This decides whether loot can change how a character looks. (Michael chose to define the game first.)
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined). D4 is a candidate domain rule.
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- How many NPCs is "a lot"? Unknown how many the server can run; needs the measurement.
- War (D14): how and when does it soften? Does a character cast out by their own faction have anywhere to go? Do NPCs go looking for the enemy (patrols, raids) or only fight when they meet? Does a weaker NPC fight or run?
- Reputation: what counts as a crime? The exact deeds and how far each moves a trait? Do Morality and Mercy drift back toward the middle? The thresholds for guards and bounties? What does yielding look like (needs a "beaten but alive" state)? Who pays a bounty and how is it claimed? What makes a legend, and what does the world do about one beyond bounties? How does a witness know who they saw? How much does one NPC remember?
- Death extras: does a hidden stash or the uncovered map survive? Can a player die on purpose to reroll? How easily does a character die (downed state, PvP rules)?
- Living NPCs: which jobs, and how does an NPC pick one? What extra rank does an NPC get for killing a player? Replacement (D15): the delay, the newcomer's role and starting gear, and are monsters replaced? Are monsters and animals characters under D4, or something simpler?
- World simulation: how do we stop it collapsing (everyone dead, or one NPC far too strong)?
- Factions: beyond the slice's two (D12), which factions and sub-factions exist, which races are in each, and which are good or evil? What are the slice's factions and towns called? What does a race change (stat ranges, classes)?
- Slice: how big is the region and how many NPCs? Which skills, backgrounds and gear? Which talents does the slice use, if any, and do a stat, a background or a race change the odds (D25)? The hit, block and dodge formulas?
- Hearing (D23): is overhearing in the slice? How often do NPCs talk and how close must a listener be? Does an NPC hold back from someone it distrusts? Can players pass knowledge on?
- Inspect (D22): what does a stranger show (name, gear)? Does a player's knowledge survive death? Can what is heard be wrong or out of date? Do NPCs act on what they personally know?
- Does loot come back after it is taken? How much world do about 10 players need to each find their own?
- Save format: files or SQLite? Decide in the server design.
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
