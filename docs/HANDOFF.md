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
- **A world that is alive and changes:** new chests appear. If possible (maybe not in the first version), new places appear too: bandit camps, goblin camps and so on.
- **Perception:** people build a memory of you, personal and shared. Traits like "dread", "evil", "good" say how you are perceived, and each faction also has its own opinion of you.
- **Ultimate goal:** a player can aim to become a kind of boss that others try to kill, for being too powerful and too evil, or too good.
- **Death:** permadeath (D3).
- **References:** V Rising is the closest he knows, but not really the same. Enshrouded for the freedom to roam apart. Shadow of Mordor for NPCs that grow. RuneScape and Ultima Online for click-to-move control (D16). No MMOs.

## Where we are
- Created from the playbook (full mode): repo `michael-leblanc/renown`, private. No game code yet, no Godot project yet. Unrelated to Crown of the Tomb.
- `docs/decisions.md` holds D1 to D60 (short list under Decided; the detail is in the file). D13 is replaced by D14. D31 to D40 were written from this handoff, so they have no "Rejected" sections. Stack section of `CLAUDE.md` filled. `Run` is unset and `scripts/verify.sh` has no steps until the Godot project exists.
- Repo and Claude project `HANDOFF` doc were in sync on 2026-11-13.
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
- **Names are told (D31):** a name is learned only by being told, never by standing near someone. The first conversation with an NPC you have never met can open with "introduce yourself". A player shares their name with another player by hand (right-click on them). An NPC can give you someone's name when it tells you about them. An NPC may ask your name during a conversation; you can refuse, and it reacts to that.
- **Crimes (D32):** in the slice a crime is a deed against your own faction: attacking or killing one of your own people, or taking what belongs to someone (shop stock, goods in a home). Hitting back at someone who struck first is not a crime. It counts only with a witness or a found body (D5). Lesser offences (trespass, looting your own dead) are not in the slice.
- **Covered face (D33):** a deed done with the face covered still spreads from town to town, but it attaches to no one: the doer's standing and traits don't move. If a witness saw the face at any point, the deed counts as normal.
- **Region size (D34, "for now"):** the slice's region is small, about 2 minutes' walk between the two towns, with wilderness between and around them. Just to test; Michael means to expand it.
- **Places own things (D35):** everything inside a shop or a home belongs to whoever works or lives there. Anything outdoors on the ground, or on a corpse, is free world loot (D2). Taking from inside a building that isn't yours is theft (D32). No owner tag on items.
- **Property (D36):** no building, but a player can buy a ready-made house or shop in a town and put items up for sale; players and NPCs buy. A bit like The Guild. When the owner dies it goes back on sale, and what was inside comes with it, in a chest. Built after the slice, alongside NPC jobs (same NPC economy).
- **Item value (D37):** every item has a value. The price of a house or shop on sale goes up with the value of what is in its chest. Value is a reference, a bit like RuneScape: it is not what a player has to pay, and players can pay more between themselves.
- **Refusing your name (D38):** an NPC that doesn't have your name treats you as a stranger and holds back, and how far depends on its role: some won't talk until you introduce yourself, a guard might not let you pass, a shopkeeper cares less. It also depends on how you are perceived: people who dread you are too scared to oppose you. The NPC goes by what it knows of you (D28), never true stats.
- **Dread (D39):** not a fourth trait. Dread is the low end of Mercy, as each NPC knows it: an NPC dreads a character it knows never spares anyone. A good character can be dreaded. It arrives after the slice, with Mercy and the fallen state (D26).
- **Covered face in town (D40):** only guards care about a covered face; townsfolk and shopkeepers don't. A guard always challenges one, crime or no crime, unless it is scared of the character (D39). A face counts as covered only when the item worn has the property "covers face"; an ordinary helmet does not.
- **Refusing to uncover (D41):** the guard orders the character out of town, and attacks if they stay or push past. No standing is lost (D33). The player can uncover, leave or fight.
- **Nameless in the slice (D42):** townsfolk and guards won't say what the town knows until you introduce yourself. Shopkeepers serve anyway, and nobody blocks the way. The harder reactions in D38 come after the slice.
- **Stranger at home (D43):** nobody has a newborn's name, not even their own town, and the newborn has nobody's. Same for replacement NPCs (D15).
- **Names spread (D44):** a name given to one NPC joins what its town knows, like a deed. One introduction opens the whole town, the name then travels with any tale about the character, and it can't be taken back.
- **Unseen theft (D45):** no witness, no crime (D5). Goods taken with nobody watching are just gone; in front of the owner it is still a crime. "The owner notices the loss" is a candidate for later.
- **Dead owner (D46):** a dead NPC's shop or home belongs to nobody: what is inside is free world loot until another NPC takes the place over (D15). The killing is judged on its own (D32, D14). Player-bought property follows D36.
- **Replacement roles (D47):** a dead guard or shopkeeper is replaced by one of the town's townsfolk, who takes the role and the shop. The newcomer (D15) is always a townsperson and takes the spot that opened. The town assigns the role; NPCs picking jobs still comes after the slice. This changes D11's "fixed roles".
- **Who is chosen (D48):** the townsperson with the best fighting skills becomes the guard; a random one becomes the shopkeeper (no trade skill yet).
- **Offline (D49):** a character stays in the world for 30 seconds after its player logs off, then disappears and can't be touched. It comes back at the same spot.
- **Knowledge dies (D50):** a new life knows nothing and nobody from the life before. What a town knows stays with the town and can be asked for again.
- **Overhearing (D51):** not in the slice; right after it. In the slice a character learns by seeing a deed or by asking an NPC.
- **Tiles (D52):** one character per tile at rest. A character can walk through others but must end on a free tile. No body-blocking.
- **War in the slice (D53):** NPCs fight the enemy only when they meet. Guards stay in town, roamers wander the wilderness. No patrols or raids until the region grows.
- **Living world (D54):** loot comes back as new chests that appear in the world, not as the same chest refilling. If possible, new places appear over time (bandit camps, goblin camps); not necessarily in the first version.
- **Slice spawns (D55):** the slice has new chests only, appearing in the wilderness out of sight of any player. Camps come after the slice but are planned for: build a general "something appears in the world" system, and keep factions as data. A camp can belong to a sub-faction or to a faction itself.
- **Backing off (D56):** a roamer that judges an enemy clearly stronger runs to its town. A guard falls back to the other guards and fights with them; it never leaves the town. NPCs don't count heads yet.
- **Dead roamer (D57):** replaced by a townsperson, the best fighter left, like a guard (D47, D48). Guard posts are filled before roamer spots.
- **Dying on purpose (D58, "for now"):** nothing stops it. No reroll button and no wait before a rebirth. A wait before every rebirth is a candidate for later.
- **Cast out (D59):** a character their own town attacks on sight can earn their way back: standing with their own faction recovers. Until then they are an outlaw, attacked by both sides. The enemy town stays closed.
- **The way back (D60):** an outcast's standing recovers only through good deeds that are seen: killing an enemy or defending one of your own, in front of your own people. Not with time. A covered face doesn't count (D33).

## Next steps
- [ ] **Next: slice questions that don't need the art, one at a time, each answer recorded in `docs/decisions.md`.** Asked on 2026-11-13, waiting for Michael's answer: what happens to an emptied chest (D54)? Proposed: it disappears after a while, out of sight of any player. Left after that: where and how often a new chest appears, what if no townsperson is left (D47), how many NPCs in the region, the names of the factions and towns.
- [ ] The art check (put aside by Michael on 2026-11-13; needs the folder path and the link to his computer). The slice's skills, backgrounds and gear depend on it. For each character sheet: which weapon it holds and which animations it has. Confirm that orcs and goblins have the full set (block, dodge) before building them as playable. Note any sprite with a covered face or body (D29).
- [ ] After the art check, one at a time: which skills, backgrounds and talents exist in the slice, how a random birth rolls them, gear, abilities.
- [ ] Measure early (D6): one of the first build tasks spawns N NPCs on the headless server and prints the tick time.
- [ ] Living NPCs, proposed build order: shared character rules (D4) → NPCs loot, equip and gain skills, and one who kills a player gets a name and a rank → a small fixed set of jobs → the coarse and abstract levels (the hard part).
- [ ] Open the Character Creator: can it export body and gear as separate layers? This decides whether loot can change how a character looks. (Michael chose to define the game first.)
- [ ] Fill the domain-rule and Critical placeholders in `CLAUDE.md` (easier once the slice is defined). D4 is a candidate domain rule.
- [ ] Design the server and the world simulation (the hard part). Includes the save format.
- [ ] First build task: add the Godot project, add GUT, give `scripts/verify.sh` its steps, fill `Run` in `CLAUDE.md`.

## Open questions
- How many NPCs is "a lot"? Unknown how many the server can run; needs the measurement.
- War (D14): how and when does it soften? How much does each good deed bring back (D60)? When do patrols and raids arrive (D53)?
- NPC judgement (D28): how are gear and fame weighed into "looks stronger"? Do numbers count? What does a roamer do once home (D56)?
- Ownership (D32, D35): does a shop get new stock, and from where? What if a place has several residents and one dies? Do shopkeepers and townsfolk ever leave their shop or home in the slice?
- Property (D36, D37): can a reborn player buy back their old house to get its chest (a paid stash across death)? Do NPC shop prices start from an item's value? Who sells while the owner is away or offline (a hired NPC shopkeeper)? How do NPCs earn money and choose what to buy? Can NPCs buy property too (D4)? What does a building cost, and who is paid?
- Reputation: how far does each crime move standing and a trait? Do Morality and Mercy drift back toward the middle? The thresholds for guards and bounties? What does yielding look like (needs a "beaten but alive" state)? Who pays a bounty and how is it claimed? What makes a legend, and what does the world do about one beyond bounties? How much does one NPC remember?
- Death extras: does a hidden stash or the uncovered map survive? Does running from a fight cost anything? PvP rules? The fallen state's rules (after the slice, D26)?
- Living NPCs: which jobs, and how does an NPC pick one? What extra rank does an NPC get for killing a player? Replacement (D15, D47): the delay, the newcomer's starting gear, how soon a role is filled and with what gear, what if no townsperson is left, and are monsters replaced? Are monsters and animals characters under D4, or something simpler?
- World simulation: how do we stop it collapsing (everyone dead, or one NPC far too strong)?
- Factions: beyond the slice's two (D12), which factions and sub-factions exist, which races are in each, and which are good or evil? What are the slice's factions and towns called? What does a race change (stat ranges, classes)?
- Slice: how many NPCs in the region? When does the region grow past D34? Which skills, backgrounds and gear? Which talents does the slice use, if any, and do a stat, a background or a race change the odds (D25)? The hit, block and dodge formulas?
- Hearing (D23, D51; after the slice): how often do NPCs talk and how close must a listener be? Does an NPC hold back from someone it distrusts? Can players pass knowledge on?
- Names (D31, D38, D42): the reactions after the slice (a guard that won't let you pass, fear)? Does a shopkeeper also hold back what the town knows? Can a character give a false name? Does "introduce yourself" always get the NPC's name in return? Does a name with no tale attached spread to other towns?
- Inspect and faces (D22, D29, D30): which items hide race or face, and are any in the slice? Can what is heard be wrong or out of date? Do NPCs act on what they personally know?
- Living world (D54): where and how often does a new chest appear, and what is in it? What happens to an emptied chest? Who lives in a camp (a sub-faction or a faction itself, D55)? Can a camp be destroyed, and does it grow? How much world do about 10 players need to each find their own?
- Saving (D27): files or SQLite (decide in the server design)? How often? Offline (D49): what does the character do during the 30 seconds, and is a lost connection treated like logging off?
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
- GitHub connector down in a Claude chat? Add the repo to the session and push with git instead. That worked on 2026-11-13.

<!--
Rules for whoever updates this:
- Replace stale lines, don't append history. Aim for ~60 lines; the Vision section is the reason this one is longer.
- "Where we are" = facts you checked, not plans.
- Move settled questions to "Decided".
- Vision = Michael's own requirements. Don't add to it without him.
-->
