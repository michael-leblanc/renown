# Stable decisions: what build tasks can be planned on

Written 2026-11-20 from `docs/decisions.md` (D1 to D252), `docs/HANDOFF.md` and `docs/open-questions.md`.
A planning input for the orchestrator. It decides nothing: `docs/decisions.md` wins wherever the two differ.
Re-run the sort when new D-numbers land.

## How to read it

Every decision appears once, under the system it mostly belongs to, with a tag:

| Tag | Meaning | Plan on it? |
|---|---|---|
| **F** | Firm. Michael agreed it and nothing says "for now". | Yes. Its numbers are still settings in `game/data/` (D175), never final. |
| **P** | Provisional. Michael said "for now", "first version", "v1", or it is a stand-in or placeholder. | Yes, but as data and settings. Build nothing that depends on it staying. |
| **L** | Later. Firm direction, but after the slice. | Not in the next waves. Leave room for it (an empty slot, a data field). |
| **X** | Superseded, fully or in part. | Read the decision it points to instead. |

Next waves, in order (D231): **saving → random birth → combat → land generator.** Blocking open questions for each are at the end.

## Counts

| Group | F | P | L | X | Total |
|---|---|---|---|---|---|
| 1. Scope, process, build | 10 | 0 | 0 | 2 | 12 |
| 2. Server, network, hosting, saving | 9 | 5 | 1 | 1 | 16 |
| 3. World model, map, movement | 15 | 2 | 0 | 2 | 19 |
| 4. Land generator and places | 11 | 2 | 0 | 1 | 14 |
| 5. Characters, birth, death | 20 | 7 | 1 | 0 | 28 |
| 6. Waking protection | 6 | 2 | 0 | 0 | 8 |
| 7. Skills and the skill tree | 3 | 2 | 0 | 1 | 6 |
| 8. Combat, healing, running | 11 | 9 | 0 | 1 | 21 |
| 9. Knowledge, names, reputation | 27 | 1 | 2 | 0 | 30 |
| 10. Factions, towns, NPCs, living world | 22 | 2 | 4 | 2 | 30 |
| 11. Items, loot, shops, property | 12 | 8 | 1 | 2 | 23 |
| 12. Screens | 9 | 2 | 0 | 0 | 11 |
| 13. Lore (data only) | 34 | 0 | 0 | 0 | 34 |
| **All** | **189** | **42** | **9** | **12** | **252** |

Only D13 is fully replaced. The other X entries are partly changed: the rest of them still holds. A few F and P lines were also narrowed by a later decision; their line names it.
Lore (group 13) needs one build piece only: lore lines as tagged data (D91, D92).

## 1. Scope, process, build
- **D1** F — Godot 4.7 pinned, GDScript only, one project for client and headless server, ENet, server-authoritative, GUT. (Targets widened by D173 and D177; save format by D182.)
- **D11** X — the first slice: two towns, two factions, move, fight, loot, die, reborn, deeds travel. "Hand-built region" → generated (D136); fixed roles → town assigns them (D47).
- **D178** F — the server runs comfortably on desktop 1 or 2.
- **D200** F — Claude Code uses a Godot 4.7 skill.
- **D201** F — the throwaway test game (done).
- **D202** F — the skill is `xlanstar/godot-skills` v0.2.0.
- **D210** X — measurement skipped; replaced by D217.
- **D211** F — client wave: two players plus stand-in NPCs (built).
- **D212** F — tested on Linux and macOS; no Windows script yet.
- **D213** F — nothing critical in the client wave.
- **D231** F — order after the client wave: saving → random birth → combat → land generator.
- **D233** F — short handoff; open questions in `docs/open-questions.md`.

## 2. Server, network, hosting, saving
- **D27** F — the world is saved; every feature that adds state saves and loads it.
- **D173** F — dedicated server or hosted by a player; same server code, same save file.
- **D174** F — hosted world stops when the host leaves; dedicated always runs ("pause when empty" setting, off).
- **D175** P — 10 ticks a second; timings written in seconds in data, turned into ticks on load.
- **D176** F — a client is told only what its character sees and knows. (Critical candidate once names or stats are sent.)
- **D177** F — game and server on Windows, macOS, Linux.
- **D180** F — the server's world is plain data: no nodes, no physics.
- **D182** F — a world is a folder with two files (land once from the seed, living state as a snapshot); safe writes, backups, version number. Numbers (every 2 min, 10 backups) are settings. Format inside the files: open.
- **D184** X — first measurement; three points changed by D186, the rest stands.
- **D186** P — the measurement as corrected (clumps, fixed town density, counts to 8000).
- **D197** F — "Host game" runs the server as a second process.
- **D198** L — "Host game" in the menu comes right after the slice.
- **D199** F — home network first, port forwarding later; the client is given an address.
- **D215** P — what a client is sent and can ask for (client-wave shape, built): welcome, per-tick sight, walk and use-door orders, shapes in `game/net/`.
- **D216** P — leaving and coming back: 30 s, a local player id file (built). No real sign-in yet.
- **D217** P — NPC budget 500 in full detail (desktop 1, stand-in NPCs). Goes down as real rules arrive.

## 3. World model, map, movement
- **D18** F — tile grid, 8 directions, drawn smoothly (built).
- **D52** F — one character per tile at rest; walk through others (built).
- **D179** F — in sight = within a distance, no blocker between; decides client data, witnesses, NPC notice (built). The distance (16) is a stand-in.
- **D185** X — walk speed; the speed is now the run (D226), the corner rule is D204.
- **D187** F — area labels; a walk to another area is refused without a search (built).
- **D188** F — what a tile holds: ground kind, two flags, place record, area number. Walls part → D203.
- **D190** F — walls, closed doors, cliffs, big rocks, trees block sight; a flag per piece.
- **D191** F — anyone opens any door; closed blocks sight, never walking; locks later.
- **D192** F — long walks in legs along the road graph; cap on path searches per tick.
- **D203** F — walls and doors on tile edges; `AStar2D` as `SimPathing` (built).
- **D204** F — a diagonal step needs both side tiles free and no blocking edge at the corner.
- **D205** P — race sizes: human 2.5x, orc 1.4 by 1.2, goblin 0.75. Leg rate per side → D227; speed → D226.
- **D208** F — your own screen shows inside the building you are in (built).
- **D209** X — open door drew nothing; replaced by D230.
- **D214** P — the client wave's stand-in world (64 by 64, one building, 32 NPCs).
- **D226** F — walk 0.60 s or run 0.30 s a tile; each a setting.
- **D227** F — one leg pace on every side; a diagonal step takes as long as a straight one.
- **D230** F — an open door is a doorway cut in its wall.
- **D232** F — a character beside a door uses it at once (built).

## 4. Land generator and places
- **D34** P — about 2 minutes (3 with run energy) between the towns; Michael means to expand it.
- **D84** X — regions unlocked over time stands; "hand-built" → D136.
- **D85** F — the first region is an island; the sea is the edge.
- **D86** F — it is called Twinring.
- **D102** F — no swimming or sailing in the slice; water can't be walked.
- **D107** F — Oldscar under a cliff with one long crack (lore fixture on every seed).
- **D108** F — a lone stone doorway on Dawndoor's east side.
- **D113** F — Dawndoor on the east shore, Oldscar inland west.
- **D136** F — the land is generated from a seed (terrain, towns, roads).
- **D137** F — what the lore describes is the same on every seed; the generator treats it as fixed rules.
- **D189** F — hand-made buildings placed by the generator along roads round each ring.
- **D234** P — Oldscar's cliff 60 to 80 tiles, blocks walking, nobody enters the scar. Open: the tall cliff as default, and its angle (the accepted tall cliff leans about 28°, not 40°: see the handoff's gotchas).
- **D235** F — Oldscar's west is desert, Dawndoor's east green, on every seed.
- **D236** F — Oldscar built from the desert set, Dawndoor from the green one.

## 5. Characters, birth, death
- **D3** F — permadeath; corpse is world loot; new random life.
- **D4** F — one character model; no players-only or NPCs-only rule. (Critical candidate.)
- **D10** F — Human, Orc, Goblin playable; a race is never good or evil.
- **D19** F — four stats: Strength, Agility, Endurance, Intellect.
- **D21** F — no character level.
- **D24** F — a background sets starting skills and gear, locks nothing; talents are born with.
- **D25** L — six talents, after the slice.
- **D26** F — at zero health a character dies at once in the slice; the fallen state comes after.
- **D49** F — a leaver's character stays 30 s, then leaves; nothing can happen to it while gone.
- **D50** F — what a character knows dies with it.
- **D58** P — no reroll button and no wait before rebirth, "for now".
- **D66** F — everyone arrives as an adult with no memory.
- **D70** F — arriving is called waking; a background is what you wake with.
- **D96** F — goblins lean Intellect, orcs Strength; ranges overlap.
- **D97** F — humans roll evenly.
- **D121** P — all three races from the Character Creator, tinted and scaled, "for now".
- **D125** F — your own sheet shows exact numbers.
- **D148** F — on death: a summary of the life, then "Wake".
- **D152** P — 7 backgrounds as rows of data. Starting gear not chosen.
- **D153** F — no talents in the slice; the data slot exists from the start.
- **D154** F — stats 4d6 drop the lowest.
- **D155** F — +2 per race after the roll (orc Str, goblin Int, human +1 to two random stats).
- **D156** P — race odds half human, a quarter orc, a quarter goblin.
- **D157** P — background weights (20/20/20/20/8/8/4).
- **D158** F — a background is not a past; Noble renamed Well-woken.
- **D159** F — one job per stat.
- **D160** P — +1 per 2 points above 10; what each +1 is worth.
- **D166** P — a newborn has 30 in its background's skills, 0 in the rest.

## 6. Waking protection
- **D71** F — one waking spot per town (a ring); a newcomer appears there only while no player has it in sight.
- **D72** F — a newly woken character can't be harmed for a while (narrowed by D93).
- **D73** P — it ends early on attacking, stealing or leaving town ("first version").
- **D88** F — NPC newcomers get it too.
- **D89** F — it shows to everyone as a glow.
- **D90** P — 3 minutes to start.
- **D93** F — it stops harm from players and AI only.
- **D94** F — an enemy NPC ignores a protected character.

## 7. Skills and the skill tree
- **D20** X — skills grow by use stands; "no points to spend" changed by D242 (nodes are bought).
- **D140** F — a cap per skill and a total cap. Numbers not chosen (500 is a placeholder).
- **D151** P — slice skills: Swords, Axes, Maces, Spears, Bows, Unarmed, Shield, Dodge.
- **D242** F — each skill has its own graph of nodes bought with that skill's own points; one big tree from an art root; zoom and pan. Its 2026-11-19 additions are folded in (2026-11-20), with D252's numbers: marks at 15/40/65/90, free material beads (below one: usable but worse), a dark node below its mark, no reset for now, the six balance rules, secrets and the spell book.
- **D243** F — the Skills screen is the tree, draft e (built in Godot, #61 pending merge).
- **D252** P — every skill a web of Swords' shape; a point every 5 levels (20 a skill); 4 named nodes at most, **v1 only**; bridges between neighbours; small nodes are placeholders; Bows unchecked.

## 8. Combat, healing, running
- **D16** F — click to move, click to attack.
- **D17** F — attacks repeat on their own.
- **D134** F — a character can grow overpowered; hard to get there; not the goal.
- **D135** P — 5 to 6 ordinary characters bring down one at the top (was about 5; D252).
- **D139** F — gear too heavy for your Strength works badly. The penalties are not chosen.
- **D161** P — the attack rolls (to hit 50% ±5% per 10 skill and Agility bonus, 5 to 95%; block at half Shield; damage − armour, at least 1).
- **D162** F — the player never times a dodge or a block.
- **D163** F — combat must work with the art already owned.
- **D164** F — slow regeneration out of a fight, plus a bandage.
- **D165** P — two equal newborns fight about 30 s.
- **D167** F — the bandage is the only timed action; built as a general "use now, wait" system.
- **D168** F — a hit interrupts a bandage.
- **D169** P — bandage 4 s standing, about 15 health, kept if interrupted.
- **D170** X — a chaser hits a runner; changed by D228.
- **D171** P — four weapon classes set speed and damage.
- **D172** P — damage ranges by material, armour 0 to 4 off each hit, health 40 + 4 per Endurance bonus.
- **D206** P — fight numbers kept after playing.
- **D207** P — a block is a white flash and a sound.
- **D224** P — each weapon names its attack animation; spear `Attack6`.
- **D228** F — run energy; metal drains twice as fast; NPCs walk unless fleeing, chasing or raising the alarm; a chase is won by whoever keeps energy.
- **D229** F — guards stop at the town's edge; roamers chase about 30 tiles; townsfolk never chase.

## 9. Knowledge, names, reputation
- **D5** F — a deed counts only with a witness or a found body; the witness must reach a town.
- **D7** F — reputation is traits, standing and memory.
- **D8** F — three traits: Morality, Mercy, Fame.
- **D9** F — standing sets guards and prices; traits set fear and bounties (fear and bounties after the slice).
- **D22** F — the slice tracks standing, Morality, Fame; inspect shows only what you know.
- **D23** F — you learn by asking an NPC (overhearing later).
- **D28** F — an NPC judges by gear and what it knows, never true stats.
- **D29** F — a name is hidden until learned; race shows unless an item hides it.
- **D30** F — a deed attaches to a face, not a name.
- **D31** F — a name is learned only by being told.
- **D33** F — a deed done with the face covered attaches to no one.
- **D38** F — an NPC holds back from someone whose name it lacks.
- **D39** L — dread is the low end of Mercy; arrives with Mercy.
- **D40** F — only guards care about a covered face.
- **D41** F — a guard orders a covered face out, then attacks.
- **D42** F — nameless in the slice: no town knowledge; shops still serve.
- **D43** F — a newborn is a stranger even at home.
- **D44** F — a name given to one NPC is known to its town.
- **D51** L — overhearing comes right after the slice.
- **D126** F — your sheet shows only what you were told about yourself.
- **D127** F — "Tell me more about this person..." lists people you know of.
- **D128** F — known by name, by face, or by a tale.
- **D131** F — inspect lists worn and held items by name, never the pack.
- **D146** F — the map shows only what you have seen; lost on death.
- **D149** F — the death screen shows what each town really knows.
- **D150** F — local speech only in the slice; global chat later.
- **D193** F — two memories: the town's tales and the NPC's own (capped, fading).
- **D194** F — what a town knows is a list of tales; standing and traits are worked out from them.
- **D195** P — tales are true, "for now".
- **D196** F — an NPC's own memory comes first.

## 10. Factions, towns, NPCs, living world
- **D6** F — three levels of detail (full, coarse, abstract); the slice runs full only.
- **D12** X — human faction and orc-and-goblin faction, born into your race's; "win the other side over" replaced by D14.
- **D13** X — fully replaced by D14.
- **D14** P — at war: enemies attack on sight, "for now"; Michael expects to soften it.
- **D15** F — towns replace their dead with newcomers, never above the starting population.
- **D32** F — a crime is a deed against your own faction (attack, theft), seen.
- **D35** F — a place owns what is inside it; no owner tag on items.
- **D45** F — a theft nobody saw is not a crime.
- **D46** F — a dead NPC's place belongs to nobody until taken over.
- **D47** F — newcomers are townsfolk; empty roles filled from the townsfolk.
- **D48** F — best fighter becomes guard; a random townsperson the shopkeeper.
- **D53** F — NPCs fight the enemy only when they meet; no patrols or raids.
- **D54** F — loot comes back as new chests; the world keeps changing.
- **D55** F — slice: new chests only; camps planned for (a general "something appears" system; factions are data).
- **D56** F — an NPC that backs off runs home; guards fall back together.
- **D57** F — a dead roamer replaced like a guard; guard posts first.
- **D59** F — cast out by your own: an outlaw who can earn the way back.
- **D60** F — the way back is good deeds that are seen; not time.
- **D61** F — an emptied chest disappears after a while, out of sight.
- **D62** F — a new chest on a random free wilderness tile, off roads, out of sight, up to a maximum.
- **D63** F — a gutted town: the newcomer takes the post directly (guards, roamers, shopkeeper).
- **D64** P — 16 NPCs a town: 8 townsfolk, 4 guards, 3 roamers, 1 shopkeeper (data).
- **D82** F — Oldscar's starting guards and roamers are orcs; shopkeeper either.
- **D98** L — beasts are animals, not characters, with a simpler AI.
- **D103** F — no animals in the slice.
- **D129** L — quests are generated from the world; the slice's data is built so requests can come from it.
- **D130** L — the more private a request, the more you do to hear it; notice board.
- **D147** L — exploring: drawn maps, first finds, scouting requests.
- **D181** F — NPC brain: needs and scores, about once a second, roles as rows of data, reads only what it knows.
- **D183** F — soft guard rails; a fast-forward test; logged numbers.

## 11. Items, loot, shops, property
- **D2** F — nothing keeps players together; loot is shared world loot.
- **D36** L — a player can buy a ready-made house or shop; after the slice, with NPC jobs.
- **D37** F — every item has a reference value.
- **D122** F — base pack slots, a backpack adds more; nine equipment slots from the Creator parts.
- **D123** F — coins are an item.
- **D124** P — 12 slots, a backpack adds 8; coins and arrows stack without limit.
- **D132** F — items the UO way: same name, same item; material shows as colour.
- **D133** X — materials Bronze, Iron, Steel; Cloth, Leather; Wood. Shields changed by D220, hafts by D221.
- **D138** F — items wear; shops repair.
- **D141** F — slice items from shops and chests; crafting after.
- **D142** F — looting is instant in the slice; the per-item wait is a setting (0).
- **D143** F — shops buy through buy orders, paid from the shop's coins.
- **D144** P — slice NPC shops: a standing order for every item at about half value.
- **D145** F — shops sell through sell orders; NPC prices about full value, moved by standing.
- **D218** X — one picture per item; changed by D237.
- **D219** P — held weapons and shields repainted to match their item pictures.
- **D220** P — the round and plank shields are wood.
- **D221** P — axe, mace, spear: wooden haft, metal head.
- **D222** P — a weapon lies on the ground at 80% of its held length.
- **D223** P — a held head found from signs at each end; a hidden head not painted.
- **D225** P — held parts painted in iron, metal swapped by a shader. Where the client reads the colours: the first task that draws a held item.
- **D237** F — two pictures per item: flat on the ground, turned in the pack.
- **D238** F — the sack is never in a pack.

## 12. Screens
All built in Godot from their pieces, none wired to the game yet (handoff, "Where we are").
- **D239** F — one character screen, the satchel layout.
- **D240** F — the look: dark slate, worn steel, lit stage, slots tinted by material.
- **D241** F — Alegreya; label gold, value pale.
- **D244** F — HUD "corners".
- **D245** P — HUD top left: your town's landmark, "for now".
- **D246** F — the HUD keeps a small round map of what you have seen.
- **D247** F — the death screen: the life, what the world remembers, your town, Wake.
- **D248** F — the loot window: the chest over your pack (a body's version: pieces #62).
- **D249** F — Reputation: a card per town, the tales told of you.
- **D250** F — the main menu: the door at dawn, moving; Join, Host game, Settings, Quit.
- **D251** P — Oldscar's painting follows the tall cliff, "for now".

## 13. Lore (data only)
All F. In play they are lines NPCs say, tagged by town, people and creed (D91, D92), and names the generator and screens use. The game never confirms a theory (D68) and never calls the world a planet (D65).
- **World and gods:** D65, D67, D68, D74, D76, D80, D81, D83, D87, D101, D119, D120.
- **Peoples and the war:** D69, D75, D78, D95, D105, D106, D114, D116, D117.
- **Factions and places:** D77, D79, D99, D100, D109, D115, D118.
- **The dead:** D104, D110, D111, D112.
- **How lore reaches the player:** D91 ("What do people say here?", lines as data), D92 (anyone can ask, even a stranger).

## Open questions that block planning
Not decided anywhere. Plan around them or ask Michael first. Full list: `docs/open-questions.md`.

**Before the skills logic is planned**
- D242's 2026-11-19 additions are folded into `docs/decisions.md` with D252's 20 points (done 2026-11-20).
- Skill cap numbers (D140); whether more than 4 named nodes after v1 (D252); whether small nodes past a ring need the material (D252); NPCs picking nodes by role (proposed, not agreed).

**Saving (next)**
- The format inside the two files (D182).
- Whether 2 minutes is too long when a crash can undo a death (D182).
- How an old save is read after the game's data changes (D27).

**Random birth**
- Starting gear per background (D152): waits for Michael's yes on the Creator part names.
- Whether an Oldscar newcomer is an orc or a goblin, and at what odds (D82).
- Whether an NPC's starting role follows its background; whether starting skills count against the total cap.

**Combat**
- Two killing blows in the same tick (D206).
- How far a bow reaches, and whether an archer shoots while running (D228, D252).
- How a partial armour set counts, for armour and for run energy (D172, D228).
- The below-Strength penalties (D139).
- Which frame of an attack is the hit; `Attack6`'s rate (D224).
- Regeneration rate and what "out of a fight" means; whether NPCs use bandages (D164).
- Whether you see a target's health (D244).

**Land generator**
- The sight distance (16 tiles is a stand-in, D179).
- How a town's edge is marked (D73, D229); where the dry land starts (D235); which buildings the slice needs (D189).
- Chest rate, maximum and contents (D62); how long loot and bodies stay (D183); the fast-forward test's limits (D183).
- A cheaper area relabel before anything changes walls in play (D203).

**NPCs and reputation**
- The slice's NPC action list and the needs' numbers (D181): proposed, never shown to Michael one by one.
- How gear and fame weigh into "looks clearly stronger", and whether numbers count (D28).
- Replacement delay and a newcomer's gear (D15, D47).
- How far each deed moves standing and a trait; the guard and price thresholds (D9, D32, D60).
- Shop stock refill rate and contents (D141).

**Network and process**
- What a client is sent once names and stats exist (D176), and which later tasks are critical (Michael merges): candidates D4, D182, D176.
- A door clicked in its doorway: walk through or close (#36); a door closed on a character in it (D215).
