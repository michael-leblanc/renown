# Handoff — Renown

Updated: 2026-11-18

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
- **Quests come out of the world, not from a list we write (Michael, 2026-11-14):** "My goal is that all this generates quests without us predefining quests." His examples: if someone is very bad for a faction, officials or guilds might ask to have that person killed; if a person hates another personally, they might ask to have them killed; if a person owns a store and needs a certain resource, they might ask you to fetch some.
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
- **Overpowered, but hard to reach (Michael, 2026-11-14):** "I want players to feel like they can become overpowered in some way that players need to team to take them down. But it's hard to get there. I would say eventually a player could start to enchant its items, gain powerful rare spells, etc."
- **Being the boss is one path, not the goal (Michael, 2026-11-14):** "the goal of each player is not necessarily to be the 'boss'. You do whatever you want, but some people might want to be evil."
- **A generated world (Michael, 2026-11-14):** "My vision is that the world is generated, including the quests, environments, npcs/players (waking), economy, etc." For environments he chose a land generated from a seed (D136).
- **Death:** permadeath (D3).
- **References:** V Rising is the closest he knows, but not really the same. Enshrouded for the freedom to roam apart. Shadow of Mordor for NPCs that grow. RuneScape and Ultima Online for click-to-move control (D16). No MMOs.

## Where we are
- **Repo `michael-leblanc/renown` is still public** (cloned with no login on 2026-11-17). Michael decided on 2026-11-15 to make it private: paid-pack PNGs are in `prototype/art/` and in the history.
- **Wave 1 is built** (#1, #8 to #15): `game/sim/` (plain-data world, ticks, movement, pathing, sight, stand-in NPC brain), `game/server/`, `game/tools/` (the measurement). NPC budget 500 (D217).
- **Client wave, checked on GitHub 2026-11-17:** SIM-008 to SIM-011, NET-001 to NET-004, CLI-001 to CLI-004 merged (#16, #18, #20, #21, #23, #27, #31 to #36). **Open: CLI-005 (#37, not reviewed). Then NET-005** (its UAT: two machines). `tasks.yaml` on `main` lags: it still says `pr_open` for NET-004, CLI-002, CLI-003 and `todo` for CLI-004. The door trap of the earlier reviews is fixed (D232).
- **Code-made art merged:** props and the lone doorway (#17), camp (#19), items and the colour-swap shader (#22), the player page (#24 to #26, #28 to #30), 30 slice items with pack pictures (#38, #39), belts, the arrow in flight and furniture (#40), the waking glow (#41). Sprites sit in `prototype/art/made/` until CLI-005 moves them to `game/client/art/made/`. **Oldscar's cliff** is on branch `art/oldscar-cliff`, not merged (D234). **Jetty** and the **scene page** (`scripts/art/scene.mjs`: place pieces and characters, walk, on a phone) merged (#42). **Animated art** (`scripts/art/anim.mjs`: fire, water, opening chest and door, combat effects, mills, night light, weather) and more props (`village.mjs`) merged (#43). The scene page's weather, wet look, water and water wheel merged (#44). **Skill `renown-anim`** (how to make an animated piece with `anim.mjs`, and try a place) and scene page flags `--place`, `--on`, `--shot` (a place from a file, a phone-sized picture with headless Chrome): merged (#45); not yet used on a new piece.
- **Character screen built in Godot: merged (#48, 2026-11-18)**. `game/client/screens/character_screen.gd` draws it from the pieces and `character_screen.json`; it shows a sheet (a plain dictionary), not opened from the game yet. Alegreya is in `game/client/art/fonts/`, checked at 10 and 12 px: the import defaults match the draft. Shot page `res://client/screens/character_screen_shot.tscn` lands on the draft's pixels (it renders headless under `xvfb-run` on Linux). `prototype/art/made/ui/` and `items/` moved to `game/client/art/made/` and repoints the scripts. Look agreed in D239 to D241; pieces from `node scripts/art/ui/character_screen.mjs` (#46). Detail in `docs/art-experiments.md`.
- **Steel slot colour and six Skills screen drafts: PR #47, open** (2026-11-18). Steel is a deeper, colder blue than Iron (Claude's call). Clash with #48 fixed; #48 merged. `node scripts/art/ui/skills_screen.mjs` draws a ledger (rows with bars), b rack (cards on a rod, the picked one explained), c stage (character left, skills as filling rings), d graph (one skill's graph), e tree (D242 as one big tree from a rosette root, 1152 x 648, drawn through a camera; the current one), f the same at 200%. Made-up numbers and node names; a total cap of 500 as a placeholder (D140 has none).
- **Docs:** `docs/decisions.md` D1 to D242 (D13 replaced by D14; "hand-built" in D84 by D136). `docs/open-questions.md` holds every open question (D233). `docs/lore.md` (D65 to D120, D158, D234). `docs/art-check.md` (packs, Creator parts, tileset props). `docs/art-experiments.md` (code-made art). `docs/architecture/layout.md` (where code goes; Godot 4.7.2, GUT 9.7.1).
- **Art source:** about 2.7 GB of zips in `~/Downloads/Assets` on the Mac (contact sheets and tests in `_art-check/`), also in the clone on desktop 1, git-ignored (`*.zip`, `art-source/`).
- **Detail in project docs:** reviews `claude/pr12` to `pr36-review.md`; art `claude/oldscar-cliff.md`, `ground-edge.md`, `desert-tileset.md`, `slice-items.md`, `item-icons.md`, `creator-parts.md`, `camp-props.md`.

## Next steps
- [ ] **Next: Michael makes the repo private** in GitHub's settings.
- [ ] **Skills screen: Michael checks drafts e and f (the tree with a rosette root, at 100% and 200%, D242)** (pictures in the chat of 2026-11-18; PR #47, `--layout e`, `f`). Then: the open parts of D242 (when points come, nodes kept if a skill drops, reset), the nodes themselves, the pieces and json like the character screen's, merge #47.
- [ ] **CLI-005 (#37) must still move** the jetty, the village and the anim PNGs (`prototype/art/made/anim/`, with `anim.json`), and repoint the paths in both art skills (`renown-prop`, `renown-anim`): update it before merging. It must drop its items move: #48 did items and ui.
- [ ] **Look and feel to carry into the game** (all tried in the scene page, `node scripts/art/scene.mjs`, Michael: "it's perfect"; not built in Godot, not planned as tasks; how each is done is in `docs/art-experiments.md`): night light, rain and leaves that land, things getting wet, puddles, open water as one surface with reflections and a soft shore, one current that turns the water wheel. The page is slow on a phone (about 44 frames a second); in Godot these are shaders and particles, not measured yet.
- [ ] **Finish the client wave on desktop 1** (orchestrator, `docs/plan/ORCHESTRATOR.md`; not while a BookIt wave runs): review and merge CLI-005 (#37), then NET-005. Push the plan's status and QA commits (`docs/plan/log.md` and `qa/` on `main` stop at SIM-002).
- [ ] **Then Michael plays it on two machines** (NET-005's UAT): server and one game on desktop 1, a second game on his Mac. Expect everyone in the human's test colours (D214).
- [ ] **Then saving → random birth → combat → land generator (D231).** Plan the next wave's build tasks first.
- [ ] Character screen: open it from the game (a key; what the server sends for it, D176) and settle its size on screen: 620 x 760 doesn't fit the 1152 x 648 window at 1x. Then the Reputation screen with the same kit. Not planned as build tasks.
- [ ] Art: the full-size cliff proofs on desktop 1 (commands in `claude/oldscar-cliff.md`), then merge the branch; then check the green tileset for interior floors, then a jetty and a boat for Dawndoor's shore (B49, B50).
- [ ] Small fixes from the reviews, none blocking (lists in the review docs). The ones to schedule: a world that has walked or thought is never freed (fix before the fast-forward run, D183); character ids come from `NetServer`, not the world (clash once D15 adds characters); a mixed wall corner draws over a character inside (#36).
- [ ] Agree which later tasks are critical (Michael merges them). Claude's candidates in `CLAUDE.md`: shared character rules (D4), the save format (D182), what a client is sent once names or stats exist (D176).

## Open questions (next; the rest in `docs/open-questions.md`)
- Saving (D182, next after the client wave): the format inside the files; is 2 minutes too long when a crash can undo a death?
- Starting gear per background (D152): needs Michael's yes on the Creator part names first.
- When a door is open, does a click in the doorway walk through it or close it (#36)?

## Decided (one line each; the detail is in `docs/decisions.md`)
- Name: Renown, for the reputation that spreads from town to town. Playbook full mode, one repo. Not Crown of the Tomb. Personal use: keep the art in a private repo.

### Scope and process
- D1 Godot 4.7 pinned, GDScript only; one project for clients and a headless server
- D2 nothing keeps players together; loot is shared world loot
- D3 permadeath; the corpse's gear stays as world loot
- D4 an NPC is a character with a brain; no players-only or NPCs-only rule
- D6 three levels of detail: full, coarse, abstract
- D11 the first slice: two towns, two factions, move, fight, loot, die, reborn, deeds travel
- D34 slice region small: about 2 min between the towns ("for now")
- D64 16 NPCs per town: 8 townsfolk, 4 guards, 3 roamers, 1 shopkeeper
- D200 Claude Code works with a Godot 4.7 skill
- D201 a throwaway test game came before the real build
- D202 the skill is `xlanstar/godot-skills` v0.2.0
- D210 the measurement on Michael's PCs is skipped (changed by D217)
- D211 client wave: two players plus the stand-in NPCs
- D212 tested on Linux and macOS, not Windows
- D213 nothing critical in the client wave
- D231 after the client wave: saving → random birth → combat → land generator
- D233 short handoff; open questions in `docs/open-questions.md`

### Character
- D10 Human, Orc, Goblin playable first; a race is never good or evil
- D19 four stats: Strength, Agility, Endurance, Intellect
- D20 skills grow by use
- D242 one big skill tree from an art root node (not the character), a branch per skill, zooms and pans; nodes bought with that skill's own points (points at set levels of the skill)
- D21 no level; a stranger is judged by gear and reputation
- D24 a class is a starting background; it locks nothing
- D25 six talents for later: Gifted, Mighty, Voice, Keen senses, Beast-kin, Silver tongue
- D96 goblins lean Intellect, orcs Strength; ranges overlap
- D97 humans roll evenly
- D121 all three races drawn from the Character Creator: tinted and scaled ("for now")
- D125 your own sheet shows exact numbers
- D151 slice skills: Swords, Axes, Maces, Spears, Bows, Unarmed, Shield, Dodge
- D152 slice backgrounds: Soldier, Hunter, Woodcutter, Herder, Labourer, Brawler, Well-woken; rows of data
- D153 no talents in the slice; the slot exists
- D154 stats rolled 4d6 drop the lowest
- D155 +2 per race after the roll: orc Str, goblin Int, human +1 to two random stats
- D156 race odds: half human, a quarter orc, a quarter goblin
- D157 background weights: four working ones 20 each, Soldier 8, Brawler 8, Well-woken 4
- D158 a background is what you wake with; Noble renamed Well-woken
- D159 one job per stat: Str damage, Agi hit and dodge, End health, Int learning
- D160 bonus +1 per 2 points above 10, the D&D way
- D166 newborn: 30 in its background's skills, 0 in the rest

### Combat and movement
- D16 click to move, click to attack
- D17 attacks repeat on their own
- D18 tile grid, 8 directions
- D26 zero health kills at once in the slice; the fallen state after
- D52 one character per tile at rest; walk through others
- D58 nothing stops dying on purpose ("for now")
- D161 attack rolls close to classic UO; defence is the Dodge skill
- D162 the player never times a dodge or block; heals and spells can be timed
- D163 combat must work with the art already owned
- D164 slow regeneration out of a fight plus a bandage
- D165 two equal newborns fight about 30 s
- D167 no timed skills in the slice but the bandage
- D168 a hit interrupts a bandage
- D169 bandage: 4 s standing, about 15 health, kept if interrupted
- D170 a chaser next to a runner keeps hitting (changed by D228)
- D171 four weapon classes: unarmed, one-handed, two-handed, bow
- D172 damage ranges by material; armour 0 to 4 off each hit; health 40 + 4 per End bonus
- D185 run speed one tile per 3 ticks (changed by D226)
- D204 a diagonal step needs both side tiles free
- D205 test game kept: 0.30 s a tile; human 2.5x, orc 1.4 by 1.2, goblin 0.75
- D206 fight numbers kept after playing
- D207 a block is a white flash and a sound
- D226 walk 0.60 s a tile or run 0.30 s
- D227 one leg pace on every side
- D228 run energy: about 40 s in cloth, 20 s in metal; NPCs run only to flee, chase or alarm
- D229 guards stop at the town's edge; roamers chase about 30 tiles; townsfolk never chase

### Knowledge, names and reputation
- D5 a deed counts only with a witness or a found body
- D7 reputation is traits, standing and memory
- D8 traits: Morality, Mercy, Fame
- D9 standing sets guards and prices; traits set fear and bounties
- D22 the slice tracks standing, Morality, Fame; you see only what you know
- D23 you learn by asking an NPC, later by overhearing
- D28 an NPC judges by gear and what it knows, never true stats
- D29 a name is hidden until learned; race shows unless an item hides it
- D30 a deed attaches to a face, not a name
- D31 a name is learned only by being told
- D33 a deed done with the face covered attaches to no one
- D38 an NPC holds back from someone whose name it lacks
- D39 dread is the low end of Mercy
- D40 only guards care about a covered face
- D41 a guard orders a covered face out, then attacks
- D42 nameless in the slice: no town knowledge; shops still serve
- D43 a newborn is a stranger even at home
- D44 a name given to one NPC is known to its town
- D50 what a character knows dies with it
- D51 overhearing comes right after the slice
- D126 your sheet shows only what you were told about yourself
- D127 "Tell me more about this person..." lists people you know of
- D128 known by name, by face, or by a tale
- D131 inspect lists worn and held items by name
- D146 the map shows only what you have seen; lost on death
- D150 local speech only in the slice; global chat later
- D193 two memories: the town's tales and the NPC's own
- D194 a town knows a list of tales
- D195 tales are true for now
- D196 an NPC's own memory comes first

### Factions, towns and NPCs
- D12 slice factions: human, and orc-and-goblin; rivals
- D13 dislike but not hostile (replaced by D14)
- D14 at war: enemy guards and NPCs attack on sight ("for now")
- D15 towns replace their dead NPCs
- D32 a crime is a deed against your own faction
- D35 a place owns what is inside it
- D45 a theft nobody saw is not a crime
- D46 a dead NPC's place belongs to nobody
- D47 newcomers are townsfolk; empty roles filled from townsfolk
- D48 best fighter becomes guard; a random one shopkeeper
- D53 NPCs fight the enemy only when they meet
- D56 an NPC that backs off runs home; guards fall back together
- D57 a dead roamer is replaced like a guard; guards first
- D59 cast out by your own: an outlaw who can earn the way back
- D60 the way back is good deeds that are seen
- D63 gutted town: the newcomer takes the post directly
- D82 Oldscar: orc guards and roamers; shopkeeper either
- D129 quests are generated from the world
- D130 the more private a request, the more you do to hear it
- D181 NPC brain: needs and scores, about once a second
- D217 NPC budget 500 in full detail (desktop 1)

### Items, shops and property
- D36 a player can buy a ready-made house or shop; after the slice
- D37 every item has a reference value
- D122 base pack slots; a backpack adds more
- D123 coins are an item
- D124 12 slots, a backpack adds 8; coins and arrows stack
- D132 items the UO way: same name, same item
- D133 materials: Bronze, Iron, Steel; Cloth, Leather; Wood
- D134 a character can grow overpowered; hard to get there
- D135 about 5 ordinary characters to bring down one at the top
- D138 items wear; shops repair
- D139 too heavy for your Strength: usable but bad
- D140 skill caps per skill and in total
- D141 slice items come from shops and chests; crafting after
- D142 looting is instant in the slice; a wait per item after
- D143 shops buy through buy orders
- D144 slice NPC shops buy every item at about half value
- D145 shops sell through sell orders
- D218 an item's picture is the item lying in the world (changed by D237)
- D219 held weapons and shields repainted to match
- D220 round and plank shields are wood
- D221 axe, mace, spear: wooden haft, metal head
- D222 on the ground at 80% of the held length
- D223 a held head found from both ends; a hidden head not painted
- D224 each weapon names its attack animation; spear `Attack6`
- D225 held parts painted in iron; the metal swapped by a shader
- D237 two pictures: flat on the ground, turned to face you in the pack
- D238 the sack is never in a pack

### Screens
- D239 one character screen, the satchel layout: character on a stage, gear in a row on a strap, pack as a satchel
- D240 the look: dark slate, worn steel trim, a lit stage, slots tinted by material, bronze stat medallions
- D241 text in Alegreya; a label gold, its value pale

### World, land and the living world
- D54 loot comes back as new chests; places may appear later
- D55 slice: new chests only; camps planned for
- D61 an emptied chest disappears after a while
- D62 a new chest appears on a random wilderness tile, out of sight
- D84 regions unlocked over time ("hand-built" replaced by D136)
- D85 the first region is an island
- D86 it is called Twinring
- D102 the shore is the limit in the slice
- D103 no animals in the slice
- D136 the land is generated from a seed
- D137 whatever the lore describes is the same on every seed
- D147 exploring is a path: maps, first finds, scouting
- D183 soft guard rails; a fast-forward test checks them
- D188 what a tile holds
- D189 towns: hand-made buildings, generated layout
- D190 walls, closed doors, cliffs, big rocks and trees block sight
- D191 anyone uses any door; locks later
- D192 long walks go in legs along the roads
- D203 walls and doors on the edges between tiles
- D208 you see inside the building you are in
- D209 an open door draws nothing (changed by D230)
- D214 stand-in world: 64 by 64, one building, 32 NPCs
- D230 an open door is a doorway in its wall
- D232 a character beside a door uses it at once
- D234 Oldscar's cliff: 60 to 80 tiles, a 40° crack nobody enters
- D235 Oldscar's west is desert, Dawndoor's east green, on every seed
- D236 Oldscar built from the desert set, Dawndoor from the green one

### Waking, death and legacy
- D49 a leaver's character stays 30 s
- D66 everyone arrives as an adult with no memory
- D70 arriving is called waking
- D71 each town wakes its people at a ring of stones, out of sight
- D72 a newly woken player can't be harmed for a few minutes
- D73 protection ends on an attack, a theft or leaving town
- D88 NPC newcomers get the same protection
- D89 protection shows as a glow
- D90 it lasts 3 minutes to start
- D93 it covers only harm from players and AI
- D94 enemy NPCs ignore a protected character
- D148 on death: a summary of the life, then "Wake"
- D149 the death screen shows what the world really remembers

### Lore
- D65 the world is endless; never a planet
- D67 gods, creeds and the afterlife theory
- D68 lore is belief, never fact
- D69 the factions fight because their peoples are too different
- D74 three gods, one per race; the one true god is a creed
- D75 orcs and goblins work together; orcs think little of goblins
- D76 Halvar, Gorrath, Skerra, and the One Hand
- D77 the Keeping in Dawndoor, the Tally in Oldscar
- D78 nicknames: "the Scarred" and "the Hoarders"
- D79 a One Hand believer is just a townsperson
- D80 skeletons, demons and zombies are peoples, further out
- D81 no modern zombie art
- D83 a god's sign is only a story in the slice
- D87 Skerra's sign: found where you already searched
- D91 "What do people say here?" gives a lore line
- D92 anyone can ask for lore
- D95 goblins call orcs "dolts"
- D98 beasts are animals, not peoples
- D99 the sea is the Long Water
- D100 the rings: the Threshold and the Debt
- D101 the One Hand has no sign of its own
- D104 customs for the dead: buried, burned, traded
- D105 what each people answers the One Hand
- D106 orcs think "dolts" means "the big ones"
- D107 Oldscar under a cliff with one long crack (added to by D234)
- D108 a lone stone doorway on Dawndoor's east side
- D109 goblins call Oldscar's ring "the Find"
- D110 One Hand believers leave the right hand open
- D111 what each people does with a dead enemy
- D112 what each people does with a dead outcast
- D113 Dawndoor on the east shore, Oldscar inland west
- D114 orcs judge by strength and looks
- D115 what lies across the Long Water
- D116 orcs think goblins weak because small
- D117 what each people says of the enemy
- D118 who raised the stones
- D119 what the gods look like
- D120 why you wake with no memory

### Server, network and hosting
- D27 the slice saves the world
- D173 dedicated server or hosted by a player
- D174 a hosted world stops when the host leaves
- D175 10 ticks a second
- D176 a client is told only what its character sees and knows
- D177 Windows, macOS and Linux
- D178 runs on Michael's own PCs
- D179 in sight: a set distance, no wall between
- D180 the server's world is plain data
- D182 saved as snapshot files every 2 min
- D184 the first measurement (corrected by D186)
- D186 the measurement, corrected after a probe
- D187 a path search never floods the map
- D197 "Host game" runs the server as a second program
- D198 "Host game" right after the slice
- D199 home network first, port forwarding later
- D215 what a client is sent and can ask for
- D216 a leaver's character comes back while the server runs

## Gotchas
- Never call a race "evil-leaning" or "good-leaning" (D10). Michael corrected this: only factions and sub-factions are good or evil.
- "Players shouldn't cost each other" was a misreading. Stolen loot was only an example of friends being forced to stay together. Don't design per-player loot or other protections from it.
- Don't design cross-faction friendship for the slice. Michael first chose "disliked, not hostile" (D13), then replaced it with open war (D14).
- Never state a lore theory as fact (D68), and never call the world a planet (D65).
- V Rising is a reference for the world, not for the controls. Michael prefers click-to-move (D16); don't propose WASD or hand-timed block and dodge. Timed heals, skills and spells are fine (D162).
- Check any combat or gear idea against the art already owned before proposing it (D163). Michael doesn't want to buy more art.
- The Character Creator program is Unity and Windows only, but it is not needed: its part files are plain PNGs in `Fantasy Character Creator_Data/StreamingAssets/Spritesheets/`. Stack them in Godot and give each part a colour (they are drawn in grey).
- Don't propose the orc and goblin pack sheets for characters (D121). The Creator's gear does not line up with them: the poses and animations differ. Michael finds the pack higher quality and chose the Creator "for now", so he may reopen it himself; don't reopen it for him.
- "The Tally" is the faction, not the art. Michael asked "what is tally?" when it was used to mean the orc and goblin sheets. Say "orcs and goblins" for the art and the races.
- The art is heavy: about 2.7 GB of zips in `~/Downloads/Assets`, still zipped. Too big to upload to a chat. Read it through the link to Michael's computer (the folder needs a grant each chat), and write nothing there but `_art-check/`.
- The pre-baked packs (demons, zombies, undead, orcs and goblins) name their animations differently from sheet to sheet and some sheets are shorter than 15 frames. Any importer for them needs a name table per sheet and must read the frame count from the image width. The Creator's parts all use the same 30 names.
- The tileset's `.anim` and `.controller` files are Unity-only. Rebuild animations from the PNG grids.
- This handoff exists twice: `docs/HANDOFF.md` in the repo and the `HANDOFF` doc in the Claude project. Update both together (write the repo file, then the project doc from it). The project's own instructions call it `claude/handoff.md`; no doc has that name, `HANDOFF` is the one.
- Keep this handoff short (D233): one line per decision under Decided, open questions in `docs/open-questions.md`, done work in the PRs and review docs. In a chat with no repo write, keep new decisions in a small project doc and fold them in at the next push, then delete it.
- GitHub connector down in a Claude chat (on 2026-11-15 it failed with "missing Mcp-Param-owner header")? Add the repo to the session and push with git instead; `gh api repos/...` also works there for reading and merging a PR. That worked on 2026-11-13 and twice on 2026-11-14. Reading files through the connector needs no repo write (in the planning chat only listing the root folder failed; `docs` and single files worked). Adding the repo, even read-only, has been refused until Michael asked for a repo write in that chat; a plain "yes" to "push to the repo now?" is enough, and then adding it with push access and cloning works first time. Docs go straight to `main` (`CLAUDE.md`). `npm install` for `scripts/plan.mjs` leaves a `package-lock.json`: don't commit it.
- Don't lay a screen out like Diablo IV's (D239). Michael liked that look and then said "it looks too much of a copy". Its look is the model, not its shape.
- Show Michael a new screen layout already in the agreed look (D240). Plain drafts are judged on their looks, not their idea.
- The art scripts are Node with no package, the screens' too (`scripts/art/ui/`). Drafts made in a chat with Python get ported before they are kept: don't write art in Python without asking Michael.
- Oldscar is desert, Dawndoor is green (D235): don't draw Oldscar's land or cliff in the green tileset's colours.
- Nobody goes inside Oldscar's scar (D234): don't draw it as a cave or a doorway.
- Don't propose the modern zombie art for anything (D81). Michael: "forget the modern assets".
- When Michael says "something else", widen the kind of option; don't give three more of the same kind. The goblins' word for orcs took five rounds (D95): he wanted a real word that means stupid.
- Write orc lines from strength and looks first (D114). A line built only on "a record of deeds" was not taken: deeds matter to orcs as proof of strength.
- Ask Michael one plain question. "Which set, or a mix?" after three sets of names was not understood; a table and "do any of these work for you?" was.
- Don't call the map hand-built or plan a hand-drawn Twinring (D136). The land comes from a seed. This makes the slice bigger: it now needs a land generator, and Michael was told so.
- Don't present becoming the "boss" as the game's goal. Michael corrected this: each player does whatever they want; being overpowered, or evil, is one path among others.
- Test before answering an art question. Michael's "can't you scale them?" was right, and a first answer given without the scaling test was wrong.
- Design for player-owned shops (D36) even when the slice has only NPC shops: Michael checks shop rules against what a player owner would want.
- Don't write a background as a past life or a rank (D158). Nobody is born here and nobody remembers anything: a background is what a character woke with. Say "Well-woken", not "Noble".
- Combat numbers are a starting point (D165, D169, D171, D172): Michael expects to change them to balance. Keep every one a setting and never present one as final.
- Keep slice lists small and built as data (D152, D153). Michael doesn't want the slice widened; he wants it planned so later additions (merchant, stealth, talents and so on) still make sense.
- When Michael asks "how is it in UO / RuneScape" and then "what do you recommend", give the comparison short, then one clear pick with the numbers it implies (D161, D165).
- Michael thinks of hosting the way ordinary games do it (D173): a "Host game" choice in the menu as well as a dedicated server. Don't design for a dedicated server only.
- "Go whatever makes the most sense" and "Whatever is your recommendation" mean Michael leaves the technical call to Claude: make it, tell him in one line, and record it as Claude's call. Keep questions for what only he can answer.
- In a planning chat, don't run code or probes unasked. Michael's "Are you sure we're done planning?" (2026-11-14) was about the whole game, not wave 1. Claude answered by running a Godot probe, and he called it coding for no reason. Answer on paper. By "plan" and "planning" Michael means the decisions made about the game (the D-numbers), not build tasks or waves: he said so the same evening ("by plan i'm talking about the decisions we made"). Call the build side "build tasks".
- Only wave 1 (built) and the client wave have build tasks. The waves after and the design the slice still needs (gear, art, generator, reputation numbers, the NPC action list) are not planned: never tell Michael that planning is done without saying done for what.
- Michael also runs BookIt with Claude Code on desktop 1, and both projects share his Max plan usage. One wave at a time, never both.
- Desktop 2 is Windows with Plex and Sunshine on it. Anything Michael runs there is by hand, from a page of steps; `scripts/*.sh` don't run there.
- Desktop 1 is the Linux machine the code is built on, and Michael tests a second machine from his Mac (D212). Don't plan a test step on Windows unless he asks for one.
- Don't ask Michael to run the measurement (D210). He skipped it in a Claude Code session and was asked again in a chat that didn't know.
- A decision Michael makes in a Claude Code session on desktop 1 reaches a Claude chat only if that session pushes it. Check `main` first; when it is silent and he says it was settled, take his word and record it.
- Don't propose live gaussian splats as Renown's renderer. Michael, 2026-11-15, after two browser demos: "it looks good, but I wouldn't use that for the game."
- In `plan.mjs` output, "[critical]" beside a task means it is on the critical path, not `critical: true`. The orchestrator also sends critical-path tasks to the reviewer, so most of wave 1 gets a review even though Michael merges none of it.

<!--
Rules for whoever updates this:
- Replace stale lines, don't append history. Keep it about 30 KB (D233): one line per decision, open questions in `docs/open-questions.md`, no done items.
- "Where we are" = facts you checked, not plans.
- Move settled questions to "Decided".
- Vision = Michael's own requirements. Don't add to it without him.
-->
