# Decisions

Read before planning or building. A decision here wins over any older doc.
When a decision contradicts another doc, fix that doc right away.

<!--
Format:
## D<n> — <decision in a few words> (<YYYY-MM-DD>)
Decision: <what we do, concrete enough to build from>.
Why: <one line>.

Numbers never change or get reused. Superseded? Add a new one and write
"Replaced by D<m>" under the old one.
-->

## D1 — Godot 4.7 with GDScript, one project for client and server (2026-11-12)
Decision:
- **Engine:** Godot 4, pinned to the 4.7 line (4.7.2-stable when this was written). Editor, builds and tests all use the same version. Upgrading is a new decision.
- **Language:** GDScript only. No C#.
- **Targets:** desktop builds for players. The same Godot project, exported headless for Linux, is the dedicated server. No web build. (Widened by D173 and D177: a player can also host from the game, and both the game and the server run on Windows, macOS and Linux.)
- **Network:** server-authoritative. Clients send inputs; the server owns the world state. Godot's built-in high-level multiplayer over ENet (UDP).
- **Tests:** GUT, run headless from `scripts/verify.sh`.
- **Not decided here:** the save format (files or SQLite). It belongs to the server design. (Decided in D182.)

Why: Godot scenes and scripts are plain text that Claude Code can write and review, and the engine already has isometric tilemaps with depth sorting, a map editor, animation, pathfinding and UI.

Rejected:
- **Unity:** the art ships Unity-ready (animations, live gear swap), but its scenes and prefabs are GUID-heavy files an agent can't reliably write or review.
- **Browser (TypeScript):** nothing to install for friends, but we would hand-build everything Godot includes, and 1.2 GB of art is heavy for a browser.

Cost we accept:
- Animations are rebuilt from the PNG grids (the packs' `.anim` and `.controller` files are Unity-only).
- Loot that changes a character's look only works if the Character Creator exports body and gear as separate layers (not checked yet). If it can't, looks come from pre-baked sheets.

## D2 — Players are free to split up; loot is shared world loot (2026-11-12)
Decision:
- **No tether:** nothing keeps players together. No shared camera, no party requirement, no content that needs the group. Each player can go to a different area and play however they want.
- **Loot is world loot, not per-player:** a chest one player empties is empty for everyone. There is no instanced or per-player loot.
- **The answer to "my friend took it" is distance, not protection:** a player who wants their own loot goes and explores somewhere else.
- **Players can affect each other.** This decision does not promise that one player's actions never cost another.

Why: in co-op games like Divinity or Baldur's Gate 3, friends are kept so close together that when one takes the loot the others get nothing and have no other choice. Reference for the freedom to roam: Enshrouded.

Follows from this (not designed yet):
- The world needs enough room and enough loot spread across it for about 10 players to each find their own.
- Whether loot comes back after it is taken is open. (Decided in D54.)

## D3 — Permadeath (2026-11-12)
Decision:
- **Death is final.** A character who dies is gone: level, stats, skills, class and standing end with them.
- **New random life:** the player rejoins with a fresh random birth (race, name, class, everything), exactly as on first joining.
- **The corpse is world loot:** the gear the character carried stays where they died. Anyone can take it: other players, NPCs, or the player's own next life (D2).
- **No exception for powerful characters:** a villain who is killed does not come back.

Why: random birth only pays off if players see it more than once, and hunting down a powerful villain only matters if the kill is final.

Rejected:
- **Heavy penalty, same character:** random birth would happen once per server, a bad roll would be permanent, and a killed villain would return.

Not decided here:
- Whether anything else survives: a stash the character hid, the map the player uncovered.
- How easily a character dies (downed state, PvP rules).
- Whether a player can die on purpose to reroll a bad birth. (Decided in D58.)

## D4 — NPCs and players are the same kind of character (2026-11-12)
Decision:
- **One character model for both:** same stats, inventory, gear, XP and levels. The only difference is who drives the character: a human or the AI.
- **Every rule applies to both:**
  - NPCs take world loot (D2), equip it and get stronger.
  - NPCs earn XP from kills, including killing a player.
  - NPCs die for good and leave a lootable corpse (D3).
  - NPCs have a reputation, like players.
  - NPCs are born random, like players.
- **No "players only" or "NPCs only" rule** without a new decision.

Why: everything built for players then works for NPCs, which is what makes living NPCs affordable. It is cheap to choose now and expensive to change later.

Cost we accept:
- Balance is harder: an NPC can snowball the same way a player can.

Not decided here:
- Jobs (shopkeeper, hunter, quest-taker) and how an NPC picks one.
- The extra rank or name an NPC gets for killing a player.
- How the world is simulated where no player is near.
- Where new NPCs come from, since dead ones stay dead.

## D5 — A deed needs a witness to become known (2026-11-13)
Decision:
- **No witness, no reputation.** A deed, good or bad, only changes reputation if a character sees it, or, for a killing, the body is found.
- **A witness is any character within sight**, player or NPC (D4).
- **The news has to travel.** A witness must survive and reach a town. Kill every witness first and nobody knows.
- **From there it spreads town to town** over time and fades with distance.

Why: it fits living NPCs (a witness is a character who has to survive and get somewhere), and it allows secret murders, framing and chasing down a fleeing witness.

Rejected:
- **Automatic:** the nearest town knows instantly, whoever was watching. Simpler to build, but an unseen murder in the woods would still make a character known.

First version (proposed, not built): anyone within sight is a witness; the nearest town learns after a delay unless the witness dies first.

Not decided here:
- What reputation changes (prices, guards, quests, bounties).
- Whether it is tracked per town or per faction.
- How a witness knows who they saw (name, face, disguise).
- How far a big deed travels compared with a small one.

## D6 — NPCs are simulated at three levels of detail (2026-11-13)
Decision:
- **Every NPC stays a real character (D4)** at every level. Stats, gear and history are kept when it changes level.
- **The level depends on distance from the nearest player:**
  - **Full:** near a player. Real movement, pathfinding, combat and sight.
  - **Coarse:** same region, no player near. Moves along roads from point to point; fights are resolved by a roll on stats.
  - **Abstract:** far away. Updated about once a minute with outcomes ("the hunter gained XP", "the merchant reached the next town").
- **Same rules, lower resolution:** at every level an NPC can still loot, gain XP and die. The levels change how precisely things are simulated, not what is allowed to happen.
- **"AI" means rule-based game AI:** an NPC picks its next goal from a few rules. Not a language model.
- **Measure before sizing:** one of the first build tasks spawns N NPCs on the headless server and prints the tick time. The NPC budget comes from that number.

Why: Michael wants a lot of NPCs. With about 10 players, at most 10 zones need full detail, so the world can hold far more NPCs than the server could run in full. A player's deeds always happen in a full-detail zone, so witness checks (D5) stay cheap.

Cost we accept:
- The same behaviour exists at up to three resolutions, and they must agree.
- Switching level mid-action (an NPC on the road when a player arrives) is a likely source of bugs.

Not decided here:
- The distances, the tick rates and the number of NPCs (unknown until measured). (Full-detail budget: D217, 500 for now.)
- How witnesses work for deeds between NPCs at the coarse and abstract levels.
- Whether monsters and animals are characters under D4 or something simpler.

## D7 — Reputation is traits, standing and memory (2026-11-13)
Decision:
- **Traits: how a character is perceived.** A list such as "good", "evil", "dread". They say who the character is in other people's eyes. Several hold at once: a very good character who shows no mercy is feared and still respected for how good they are.
- **Standing: a separate reputation with each faction, and with people in general.**
  - Traits set how readily a faction accepts a character: an evil character is more accepted by an evil faction.
  - Deeds then move it: an evil character who kills that faction's people loses reputation with them.
- **Two memories:**
  - **Personal memory:** what an individual character remembers about another.
  - **World memory:** how the world as a whole sees a character.
- **Legends:** a character can become so powerful and so evil, or so good, that they are a kind of boss others set out to kill. Becoming one is a valid ultimate goal for a player.

Fits with: only witnessed deeds feed any of this (D5), and it applies to NPCs as well as players (D4).

Why: a single good-to-evil scale can't say "evil, but loyal to us" or "good, but frightening". A score per faction alone loses the sense of who the character is.

Rejected:
- **One good-to-evil scale**, the same wherever the deed is known.
- **Faction judgement alone**, with no traits.

Cost we accept:
- Memory for many NPCs has to be bounded (for example, each keeps only its few strongest memories).

Not decided here:
- Which traits exist in the first version, and which deeds feed each one.
- What traits and standing change (prices, guards, quests, bounties).
- What makes a character a legend, and what the world does about one.
- How much an individual NPC remembers, and for how long.

## D8 — The first version has three traits: Morality, Mercy, Fame (2026-11-13)
Decision:
- **Three traits, each a scale.** A character has a position on all three at once.
  - **Morality:** good ↔ evil. Fed by helping or harming people who did nothing to the character.
  - **Mercy:** merciful ↔ dreaded. Fed by how the character treats the beaten: spare or finish, let a witness flee or hunt them down.
  - **Fame:** unknown → legendary. It only grows. It measures how far and how loudly the character's name has travelled.
- **Fame is separate from good and evil.** It is what makes a legend (D7), whichever way the character leans.
- **A fourth trait is a new decision.**

Fits with: D7's example, "very good but shows no mercy", is good on Morality and dreaded on Mercy. Only witnessed deeds move a trait (D5), and NPCs have the same three (D4).

Why: the three cover Michael's own words (good, evil, dread) and are few enough to build and test in the first slice. Adding a trait later is cheap; removing one is not.

Left out for now:
- **Honour** (keeps their word, fights fair) and **Greed** (loots everything, hoards). Both need systems that don't exist yet, such as promises and trade.

Not decided here:
- The exact list of deeds, and how far each one moves a trait.
- The size of each scale and the words players see on it.
- Whether Morality and Mercy drift back toward the middle over time.
- What traits and standing change (prices, guards, quests, bounties).

## D9 — In the first version, reputation changes guards, prices, fear and bounties (2026-11-13)
Decision:
- **Standing decides what a faction lets a character do:**
  - **Guards:** a faction whose standing with the character is low enough attacks on sight in its towns.
  - **Prices:** better standing, better prices. At the bottom, its shops refuse to serve.
- **Traits decide how individuals react to a character:**
  - **Fear (Mercy):** weaker NPCs flee a dreaded character instead of fighting. Enemies yield sooner to a merciful one, because they expect to be spared.
  - **Bounties (Morality + Fame):** a faction posts a bounty on a famous character of the opposite leaning. Anyone can collect it, player or NPC (D4).
- **Quests are not affected yet.** There is no quest system.

Fits with: D7's split between standing (a faction's judgement) and traits (who the character is in people's eyes). An effect only applies where the character's deeds are known (D5).

Why: each effect uses a different lever, so standing and all three traits (D8) do something a player can see. Bounties are the first step toward a legend others set out to kill: Fame is what gets a character hunted.

Cost we accept:
- Yielding needs a "beaten but alive" state, which is not designed yet.

Not decided here:
- The thresholds: how low before guards attack, how famous before a bounty is posted.
- What yielding looks like, and what a character can do with someone who yielded.
- Who pays a bounty, how it is claimed, and how big it gets.
- What the world does about a legend beyond bounties.
- How reputation affects quests.

## D10 — Human, Orc and Goblin are playable first; a race is never good or evil (2026-11-13)
Decision:
- **Playable first:** Human, Orc, Goblin. A random birth (D3) picks among these three.
- **A race has no moral leaning.** In the spirit of WoW: orcs are not evil, and humans are not good. Good and evil belong to factions and sub-factions. Any race, humans included, can have sub-factions of both kinds.
- **Not playable yet:** skeletons, demons and zombies. They are in the world, but a player cannot be born as one. Making one playable is a new decision.

Why: three races give a random birth real spread (the noble human, the strong low-intellect monster) and are enough for the first slice.

Cost we accept:
- **Humans are thin:** 4 looks (1 fighter, 3 villagers) against 12 orcs and 17 goblins, until the Character Creator is opened.

To confirm before building:
- That orcs and goblins have the full animation set (block, dodge). Zombies don't, which is why they are not candidates.

Not decided here:
- Which factions and sub-factions exist, which races are in each, and which of them are good or evil.
- What a race changes (stat ranges, classes, size).
- Whether skeletons, demons and zombies are full characters under D4 or something simpler (open since D6).

## D11 — The first playable slice (2026-11-13)
See D136: the slice's region is generated from a seed, not hand-built.

Decision: the slice is the first thing Michael and a friend can play together. It contains:
- **Multiplayer from the start:** a headless server and at least two clients (D1).
- **World:** one hand-built region, two towns, wilderness between them.
- **Factions:** two, one town each.
- **Birth:** on joining, a random Human, Orc or Goblin (D10).
- **Core loop:** move, fight, loot, die. Death is final, the corpse stays as world loot, and the player gets a new random life (D2, D3).
- **NPCs:** townsfolk, guards and a few roamers. All follow player rules (D4) and all run at full detail.
- **Reputation:** a witnessed deed reaches the nearest town, then the other (D5). Guards and prices react (D9).

Left for after the slice:
- Fear and bounties (D9), quests, more regions.
- NPC jobs. In the slice, shopkeeper and guard are fixed roles, not jobs an NPC picks.
  - Changed by D47: the town moves a townsperson into an empty guard or shopkeeper role. An NPC still doesn't pick a job.
- The coarse and abstract levels of detail (D6). The tick-time measurement stays an early task.

Why: it proves the three riskiest ideas together: random birth with permadeath, NPCs under player rules, and reputation that travels. Everything left out can be added on top without redoing it.

Not decided here:
- Which two factions, and which races are in each.
- The size of the region and the number of NPCs. (Size decided in D34, number in D64.)
- Combat rules, stats, classes and what gear exists.
- Whether the three traits (D8) are tracked in the slice, or only standing.
- Whether the world is saved between server restarts in the slice.

## D12 — The slice has a human faction and an orc-and-goblin faction that dislike each other by default (2026-11-13)
Decision (for now; the split can be revisited after the slice):
- **Two factions, each with its own town:** a human faction, and an orc-and-goblin faction.
- **Rivals, not good against evil** (D10). Neither side is the villain.
- **Born into your race's faction:** a new character is at home in its own faction's town.
- **Mutual dislike by default:** the orc-and-goblin faction doesn't like humans, and the human faction doesn't like orcs and goblins. A new character starts with low standing with the other faction.
- **It can change:** what a character does moves their standing with each faction, up or down (D7). An orc can win the humans over; a human can lose their own town.
- Partly replaced by D14: for now the two factions are at war, so a character cannot win the other faction over. Losing your own town still applies.

Why: random birth then decides where a life starts and who distrusts it, and the default dislike gives a character something to overcome or to lean into. It uses the art as it is: one town of humans, one of orcs and goblins.

Left for after the slice:
- Evil sub-factions (bandits or a cult, of any race).
- Mixed-race factions.

Not decided here:
- How deep the default dislike goes: worse prices and suspicion, or guards attacking on sight. (Decided in D13.)
- The names of the factions and the towns (Michael names them).
- Whether NPCs of the two factions fight each other when they meet in the wilderness.

## D13 — By default the other faction dislikes a character but is not hostile (2026-11-13)
Replaced by D14.

Decision (for now, like D12):
- **Can enter:** a new character can walk into the other faction's town.
- **Pays more:** its shops serve them, at worse prices (D9).
- **Watched:** its guards keep an eye on them and attack at the first crime, not on sight.
- **Starting standing is low, but above the attack-on-sight level (D9).** Deeds can push it down to attack on sight, or raise it (D12).

Why: if guards attacked on sight, a character could never get close enough to do the deeds that change that faction's mind.

Rejected:
- **Hostile by default:** guards attack on sight and the other town is closed until standing rises some other way.

Cost we accept:
- The rivalry is softer at the start. The tension has to come from prices, being watched and the wilderness.

Not decided here:
- What counts as a crime.
- What "watched" means in play (a guard follows, or nothing visible).
- How much more they pay.
- Whether a first crime is treated the same in a character's own faction's town.

## D14 — For now the two slice factions are at war (2026-11-13)
Replaces D13, and the "win the other faction over" part of D12.

Decision (for now; Michael expects to soften it later):
- **At war:** the human faction and the orc-and-goblin faction hate each other.
- **The other town is closed:** its guards attack a character of the enemy faction on sight.
- **Enemies in the wilderness too:** an NPC of one faction attacks a character of the other on sight, player or NPC (D4). A player decides for themselves whether to attack.
- **No friendship across the war:** a character's deeds cannot win the enemy faction over. The war overrides standing.
- **Reputation still works inside your own faction:** a character who harms their own people can lose their own town (D12).

Why: Michael wants an open war for now: the two sides hate each other and can't really be friends. It is also simpler to build, because hostility comes from the faction and needs no thresholds.

Rejected:
- **Disliked, not hostile (D13):** the other town stays open at worse prices, and the two sides pass each other in the wilderness.

Cost we accept:
- **Half the towns are closed** to every character.
- **Friends born on opposite sides** cannot share a town, and each is attacked by the other's NPCs.
- **Reputation shows less in the slice:** its visible effects are inside a character's own faction. The enemy town hears of a deed but cannot react more than it already does.
- **NPCs kill each other and stay dead (D3, D4):** the world empties unless new NPCs arrive. This has to be decided before building.

Not decided here:
- Where new NPCs come from.
- How and when the war softens (a truce, deeds counting again).
- Whether a character cast out by their own faction has anywhere to go. (Decided in D59.)
- Whether NPCs go looking for the enemy (patrols, raids on the other town) or only fight when they meet. (Decided for the slice in D53.)
- What a weaker NPC does when it meets an enemy (fight or run).

## D15 — Each town replaces its dead NPCs (2026-11-13)
Decision:
- **A town replaces its dead:** when one of a faction's NPCs dies, a new NPC appears in that faction's town after a delay.
- **A new random birth, like a player's new life (D3, D4):** the newcomer is a new character. Nothing carries over from the dead one.
- **Never above the town's starting population.**

Why: with the war (D14) NPCs kill each other and stay dead, so without replacement the slice's world empties. It reuses the player's birth, so it adds no NPC-only rule (D4).

Rejected:
- **No replacement in the slice:** the world runs down and the server is restarted to reset it. Simplest, but a session dies fast.
- **Reinforcements walk in by road:** better fiction, more to build.

Cost we accept:
- The war cannot be won by killing everyone.
- The enemy town is a steady source of XP.
- Each newcomer brings gear into the world, so loot never runs out.

Not decided here:
- The delay, and where in town the newcomer appears.
- Which role the newcomer takes (the dead one's, or any empty one). (Decided in D47.)
- What a newcomer starts with (level, gear).
- Whether a town that has been emptied or overrun still gets newcomers.
- Whether monsters are replaced, and how.
- Whether this stays after the slice, or something richer replaces it.

## D16 — Click to move and click to attack, like RuneScape and Ultima Online (2026-11-13)
Decision:
- **Click to move:** the player clicks a spot and the character walks there. The server finds the path.
- **Click to attack:** the player clicks a target and the character goes to it and attacks.
- **No hand-timed block or dodge:** blocking and dodging come from the character's stats, not from the player's reflexes. The block and dodge animations show the result.
- **References for control:** RuneScape and Ultima Online. V Rising stays a reference for the world, not for the controls.

Why: Michael prefers click-to-move. It also fits the rest: the client only sends a destination or a target, which is simple with a server that owns the world (D1); players and NPCs share the same pathfinding (D4); and a fight decided by stats is the same maths as the coarse level's roll on stats (D6).

Rejected:
- **Direct control like V Rising:** WASD, mouse aim, attack, block and dodge by hand. Harder netcode and harder NPC AI.

Cost we accept:
- **Stats decide more of a fight,** so a weak random birth is harder to overcome. Survival comes from choices (when to fight, when to run, what to carry, who to travel with), not reflexes.

Not decided here:
- How a fight plays out once a target is clicked (attacks repeat on their own, or one click per attack).
- Whether the world runs on fixed ticks like RuneScape.
- Which stats exist, and how a hit, a block and a dodge are rolled.
- Abilities, classes and gear.

## D17 — Attacks repeat on their own once a target is clicked (2026-11-13)
Decision:
- **One click starts the fight:** the character goes to the target and keeps attacking until the target is dead or out of reach, or the player gives another order.
- **The weapon's speed sets the pace.**
- **Each hit is a roll on stats,** and so are block and dodge (D16).
- **The player's part is decisions:** which target, when to run, when to heal, what to wield.
- **NPCs fight the same way (D4).**

Why: it is how RuneScape and Ultima Online fight (D16). NPC combat AI stays simple, and the roll is the same one the coarse level uses (D6).

Rejected:
- **One click or key per attack, with cooldowns, like Diablo:** more to do with the hands, but it drifts back toward action combat.

Cost we accept:
- A fight can feel passive. The depth has to come from preparation and choices, and later from abilities.

Not decided here:
- Whether there are abilities or spells the player triggers by hand.
- Whether a character moves tile by tile or freely, and whether the world runs on fixed ticks.
- Which stats exist, and how a hit, a block and a dodge are rolled.
- Whether running from a fight has a cost.
- Healing during a fight, ranged weapons and magic.

## D18 — Characters move on a tile grid (2026-11-13)
Decision:
- **On a grid:** a character stands on one tile and walks tile to tile in 8 directions.
- **Drawn smoothly:** the walk between two tiles is animated, so a character does not jump.
- **Distances are counted in tiles:** next to, in reach and in sight are exact.
- **One grid for everyone:** players and NPCs use the same pathfinding (D4).

Why: RuneScape and Ultima Online work this way (D16). The art is a tileset and the characters have 8 facing directions. A hit never depends on a few pixels, and grid pathfinding is cheap, which matters for a lot of NPCs (D6).

Rejected:
- **Free movement:** a character can stand anywhere and walk in any direction. It looks more natural, but reach and pathfinding get harder.

Cost we accept:
- Movement looks a bit more rigid.

Not decided here:
- Whether two characters can share a tile. If they can't, one character can block a doorway. (Decided in D52.)
- Whether the world runs on fixed ticks, and how fast.
- How big creatures fit (beasts, elites): one tile or several.
- Whether a character can cut a corner diagonally.

## D19 — A character has four stats: Strength, Agility, Endurance, Intellect (2026-11-13)
Decision:
- **Strength:** melee damage, how much the character carries.
- **Agility:** hitting, dodging, attack speed.
- **Endurance:** health, blocking.
- **Intellect:** learns faster. Magic later.
- **Stats are not skills.** Michael also wants skills, such as stealth, as a separate thing. What a character is good at doing goes there, not into more stats.
- **A fifth stat is a new decision.**

Why: the four cover Michael's own examples (the noble with high intellect, the monster with low intellect and high strength), each does something in the slice, and four are enough for random births to differ. Adding a stat later is cheap; removing one is not.

Rejected:
- **Six stats in the D&D style** (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma). The two extras, perception and charisma, touch witnesses and reputation, but with the war (D14) they do little in the slice, and they can be skills instead.

Not decided here:
- Skills: which ones exist and how they grow.
- How a random birth rolls the four stats, and what a race changes.
- Whether stats grow during a life.
- The formulas: how a hit, a block and a dodge are rolled (D17).

## D20 — Skills grow by use (2026-11-13)
Decision:
- **A skill rises when the character uses it.** Sneaking raises Stealth; fighting with a sword raises Swords.
- **No points to spend.**
- **Intellect makes skills rise faster (D19).**
- **Same for NPCs (D4):** an NPC gets better at what it does by doing it.
- **Where D3 and D4 say "XP", read skill gains.** A kill makes a character stronger through the skills it used. Death still ends all of it (D3).

Why: RuneScape and Ultima Online work this way (D16). A random birth sets the start and the life decides the rest. An NPC needs no scripted choices to improve.

Rejected:
- **Points at level-up:** deeds give XP and each level gives points to spend. An NPC would need rules for where to spend them.

Cost we accept:
- A skill can be farmed by repeating a safe action. The gain rules have to guard against that.

Not decided here:
- Which skills exist, in the slice and after.
- How fast a skill rises, whether there is a cap, and whether an unused skill fades.
- What a "level" is now (D3 and D4 mention levels).
- Which skills a random birth starts with, and what a class means.

## D21 — There is no character level (2026-11-13)
Decision:
- **No level.** A character is its four stats (D19) and its skills (D20). No number sums them up.
- **A stranger is judged by what can be seen and what is known:** their gear and their reputation.
- **Where D3 and D4 say "level", there is none now.**

Why: Michael's call. It makes reputation the way to read a stranger, which is the point of the game, and it keeps a meeting uncertain.

Rejected:
- **One number computed from the skills,** like RuneScape's combat level. A fair way to judge danger, but it tells everyone exactly how strong a character is.
- **A separate XP level beside the skills:** two growth systems to build and balance.

Cost we accept:
- **Harsher with permadeath:** a player cannot tell for sure who will kill them.
- **Reputation has to be visible enough to judge by,** including in the slice.

Not decided here:
- How an NPC decides to fight or run without a level. Proposed: the same way a player does, from gear and from what it has heard or remembers (D4, D7).
- What a player sees when looking at another character (gear, traits, name).
- Whether gear can hide or fake how strong a character is.

## D22 — The slice tracks standing, Morality and Fame; inspecting shows only what your character knows (2026-11-13)
Decision:
- **Tracked in the slice:** standing (D7), Morality and Fame (D8).
- **Mercy waits.** It is fed by sparing the beaten, and the slice has no "beaten but alive" state.
- **Inspect:** a player can inspect another character.
- **Inspect shows what your character knows, not the truth:**
  - Never heard of them and never saw them do anything: nothing interesting.
  - Heard about them from NPCs, or saw what they did: the information known about them.
- **Knowledge is per character:** two players who inspect the same person can see different things.

Fits with: word travels through witnesses and towns (D5), and each individual has a personal memory (D7). With no level (D21), this is how a stranger is read.

Why: Michael's design. A character's reputation is only worth what others have actually heard, so a famous killer is a stranger to someone who has heard nothing.

Rejected:
- **Standing only:** with the war (D14) it shows almost nothing about a stranger.
- **Traits shown to everyone as words on the character:** simpler, but everyone would know everything at once.
- **All three traits in the slice:** Mercy has too little to feed it yet.

Cost we accept:
- Every character carries its own knowledge of others. It has to be bounded (D7) and saved.

Unchanged: fear and bounties still come after the slice (D11).

Not decided here:
- How a character hears things: by being in a town that knows, by talking to an NPC, or both.
- What inspecting a stranger shows (name, gear, nothing).
- Whether NPCs act on what they personally know in the same way.
- Whether a player's knowledge survives their character's death (D3). (Decided in D50.)
- How Morality and Fame are worded, and which deeds feed them in the slice.
- Whether what is heard can be wrong or out of date.

## D23 — A character hears about others by asking an NPC, or by overhearing NPCs talk (2026-11-13)
Decision:
- **Ask an NPC:** a player clicks an NPC in a town and it tells what that town knows. This is the main way to learn about someone.
- **Overhear (if possible):** sometimes NPCs talk to each other. A player close enough to hear gets that knowledge automatically, without asking.
- **Otherwise a character knows only what they saw themselves (D22).** Being in a town is not enough.

Why: Michael's design. It makes NPCs worth talking to and worth standing near, and it reuses what a town already knows (D5).

Rejected:
- **Automatic:** being in a town that knows is enough. Nothing to do, so nothing to play.

Cost we accept:
- A small talk window to build.
- A player who never asks and never listens stays blind.

Not decided here:
- Whether overhearing is in the slice or comes after. Michael said "if possible". (Decided in D51.)
- How often NPCs talk, what they choose to say, and how close a listener must be.
- Whether an NPC tells everything it knows, or holds back from someone it distrusts.
- Whether players can pass knowledge to each other, or to NPCs, the same way.
- Whether NPCs overhear players and each other (D4).

## D24 — A class is a starting background; talents are born with (2026-11-13)
Decision:
- **A class is a background:** noble, hunter, blacksmith, thief and so on. It sets a character's starting skills and gear.
- **A background locks nothing:** any skill it did not give can still be learned by use (D20).
- **Talents are separate, and a character is born with them.** A talent opens something that cannot be learned without it.
- **Magic needs a talent:** not everyone can cast spells. A character born without the talent never will.
- **A character now has four parts:** stats (D19), skills (D20), a background and talents. All are rolled at birth (D3), for NPCs too (D4).

Why: Michael's design. Skills grow by use, so a background that locked skills would fight that; but some gifts, like magic, should be rare and decided by birth, which makes a random birth matter more.

Rejected:
- **A class that locks things** (only a thief sneaks well): a bad birth becomes a cage.
- **No class:** birth rolls stats and skills with no name on it, and loses the story ("a noble human").

Cost we accept:
- Some lives can never do some things. That is intended.

Not decided here:
- Which backgrounds exist, and what each one gives.
- Which talents exist besides magic, and how rare each one is.
- Whether a talent is rolled apart from the background, and whether a race changes the odds.
- Whether any talent is in the slice. The slice has no magic.
- Whether a talent shows when a character is inspected (D22).

## D25 — The game has six talents (2026-11-13)
Decision (for now):
- **A talent opens skills that a character born without it can never learn** (D24).
- **The six talents:**
  - **Gifted:** magic.
  - **Mighty** (born strong): heavy weapons and feats of strength, such as breaking a door or carrying a body.
  - **Voice** (singer): songs that calm or rally, and tales that spread someone's fame.
  - **Keen senses:** tracking someone by their trail, and seeing further at night.
  - **Beast-kin:** taming and riding beasts.
  - **Silver tongue:** persuading, haggling hard, and planting a false rumour.
- **Most characters are born with none or one.** Two is rare.
- **Stealth is not a talent.** It stays a normal skill anyone can learn.
- **A seventh talent is a new decision.**

Why: Michael's idea, with his two examples (born strong, singer) and four proposed ones. Each talent opens a different way to live, and two of them (Voice, Silver tongue) act on reputation itself.

Cost we accept:
- Most talents need systems that don't exist yet (magic, taming, songs, rumours). A talent does nothing until its skills are built.

Not decided here:
- Which talents the slice uses, if any.
- The exact odds, and whether a stat, a background or a race changes them (is a strong birth more likely Mighty?).
- The skills each talent opens, in detail.
- Whether a false rumour means what a character hears can be wrong (open since D22).

## D26 — In the slice a character dies at zero health; the fallen state comes right after (2026-11-13)
Decision:
- **In the slice:** a character at zero health dies at once (D3). Running away is how a character survives.
- **First thing after the slice:** a fallen state. At zero health the character falls, and the winner chooses to finish or spare them.
- **The fallen state is what brings in Mercy and yielding** (D8, D9), which the slice leaves out (D22).

Why: the simple rule is enough to prove the slice, and the fallen state's main payoff (Mercy) is not in the slice yet.

Rejected:
- **The fallen state in the slice:** it softens permadeath, but it needs a new state, a choice for the winner and rules for NPCs who win.

Cost we accept:
- Death in the slice is abrupt: one lost fight is one lost life.

Not decided here:
- Whether running from a fight has a cost (open since D17).
- The fallen state's rules: how long it lasts, what a spared character keeps, what an NPC winner does.

## D27 — The slice saves the world between server restarts (2026-11-13)
Decision:
- **The world is saved.** The server writes the whole world to disk now and then, and on shutdown.
- **It is loaded on start:** characters (players and NPCs), corpses, loot, and what each town and each character knows.
- **Saveable from the first task:** every feature that adds state also saves and loads it.

Why: skills grown by use (D20), a reputation (D22) and what a character knows (D23) only matter if they last more than one evening. Making the state saveable from the start is cheaper than adding it later.

Rejected:
- **Not saved:** every server start is a fresh world. Simplest, but a restart wipes every life.

Cost we accept:
- A little more work in each task: new state has to be saved, loaded and tested.

Not decided here:
- The format: files or SQLite. It belongs to the server design (D1).
- How often the world is saved, and what is lost if the server crashes between two saves.
- What happens to a player's character while that player is offline. (Decided in D49.)
- How an old save is handled when the game's data changes.

## D28 — An NPC judges an enemy the way a player does (2026-11-13)
Decision:
- **An NPC reads what it can see and what it knows:** the other character's gear, and what it has heard or remembers about them (D22). It never reads their true stats or skills.
- **Guards and roamers** fight an enemy unless it looks clearly stronger.
- **Townsfolk** do not fight. They run to the guards, which also carries the news (D5).
- **An NPC can be wrong:** a stranger in rags can be deadly, and a famous name in good armour can be a bluff.

Fits with: no level (D21), one rule for players and NPCs (D4), and the war, where an NPC attacks an enemy on sight (D14) unless this rule tells it to back off.

Why: it keeps one rule for everyone, and it makes gear and fame work as a warning or a bluff.

Rejected:
- **The AI reads the true stats and skills:** simpler and never wrong, but an NPC would know what no player can.

Cost we accept:
- NPCs sometimes pick fights they lose.
- "Looks clearly stronger" needs tuning.

Not decided here:
- How gear and fame are weighed into "looks stronger".
- What a fighter does when it backs off (keeps its distance, fetches help, goes home). (Decided in D56.)
- Whether numbers count (three weak NPCs against one strong enemy).
- Whether an NPC that loses and survives remembers it (D7).

## D29 — A stranger's name is hidden until your character learns it; race shows unless an item hides it (2026-11-13)
Decision:
- **The name is hidden** until your character learns it.
- **Race shows,** unless the character wears an item that hides it, such as clothes that cover the body or the face.
- **Visible gear shows.**
- **Reputation shows only if your character knows it (D22).**

Why: Michael's call. A stranger stays a stranger, which suits a game about what people know of each other, and it opens the door to disguise.

Rejected:
- **Name, race and gear always show:** a witness always knows who they saw. Simpler for word-of-mouth, but there is no anonymity.

Cost we accept:
- A witness cannot simply name who they saw. How a deed gets attached to the right character has to be designed (D5).

Not decided here:
- How a deed is attached to a character whose name the witness does not know.
- How a character learns a name (told by the person, heard with a tale, read somewhere). (Decided in D31.)
- Which items hide race or face, and whether any are in the slice.
- How others react to a character whose face is hidden. (Decided in D40.)
- Whether NPCs follow the same rule for names (D4).

## D30 — A deed is attached to a character by their face, not their name (2026-11-13)
Decision:
- **A witness remembers what the character looks like.** The tale travels with that look, with or without a name (D5).
- **Recognised on sight:** when your character sees someone they have heard about or seen act, and that person's face is showing, inspect says so: "You recognise them: the one who killed the miller." The name still shows only if it is known (D29).
- **Covered face, no match.** A character whose face is hidden is not recognised. A disguise needs no extra rule.
- **How it is built:** what is known about a character is stored against that character and shown only while their face is visible.

Why: reputation keeps working without names, and it fits Michael's idea that an item can hide who a character is (D29).

Rejected:
- **By name only:** a deed by an unnamed character spreads as "an unknown orc did it" and sticks to nobody until someone learns the name.

Cost we accept:
- A covered face is very strong. Towns will need a reaction to hidden faces later.

Not decided here:
- What happens to a deed done with the face covered: does it attach to nobody, or to "the masked one" until the face is seen? (Decided in D33.)
- How towns and guards react to a hidden face. (Decided in D40.)
- Whether a look can be changed without covering it.
- How a character learns a name (open since D29). (Decided in D31.)

<!--
D31 to D40 were written from the handoff on 2026-11-13: the session that made them could not push.
They hold what the handoff kept. The rejected options from that chat were not kept.
-->

## D31 — A name is learned only by being told (2026-11-13)
Decision:
- **Told, never picked up:** a character learns a name only when someone tells it. Standing near a person is not enough.
- **Introduce yourself:** the first conversation with an NPC you have never met can open with "introduce yourself".
- **Player to player:** a player shares their name with another player by hand (right-click on them).
- **With a tale:** an NPC can give you someone's name when it tells you about them (D23).
- **NPCs ask too:** an NPC may ask your name during a conversation. You can refuse, and it reacts to that (D38).

Fits with: a stranger's name is hidden until your character learns it (D29), and a deed travels with a face, with or without a name (D30).

Not decided here:
- Whether a character can give a false name.
- Whether "introduce yourself" always gets the NPC's name in return.
- Whether an NPC that knows your name passes it on to its town. (Decided in D44.)

## D32 — In the slice a crime is a deed against your own faction (2026-11-13)
Decision:
- **A crime is one of two things:**
  - Attacking or killing one of your own people.
  - Taking what belongs to someone: shop stock, goods in a home.
- **Hitting back is not a crime:** a character who was struck first can defend themselves.
- **It counts only with a witness or a found body (D5).**
- **Ownership is needed:** theft only works if the game knows what belongs to whom. How is in D35.
- **Not in the slice:** lesser offences, such as trespass or looting your own dead.

Fits with: the war (D14). Harming the enemy faction is not a crime, and harming your own people can lose you your own town (D12).

Not decided here:
- How far each crime moves standing and a trait.
- How a theft is noticed when nobody saw it. (Decided in D45.)

## D33 — A deed done with the face covered spreads but attaches to no one (2026-11-13)
Decision:
- **The tale still travels:** the deed spreads from town to town like any other (D5).
- **It attaches to nobody:** the doer's standing and traits don't move.
- **One look is enough:** if a witness saw the face at any point, the deed counts as normal.

Fits with: a covered face is not recognised (D30), so there is no face for the tale to travel with.

Cost we accept:
- A covered face is a way to commit crimes without paying for them. The answer is how guards treat a covered face (D40).

## D34 — The slice's region is small: about 2 minutes' walk between the two towns (2026-11-13)
Note (D226, D228): the 2 minutes is at the run; with run energy the trip takes about 3 minutes.
See D136: the slice's region is generated from a seed, not hand-built.

Decision (for now):
- **About 2 minutes' walk** from one town to the other.
- **Wilderness between and around them.**

Why: it is just to test. Michael means to expand it.

Not decided here:
- How many NPCs the region holds. (Decided in D64.)
- When the region grows.

## D35 — A place owns what is inside it (2026-11-13)
Decision:
- **Inside a shop or a home:** everything belongs to whoever works or lives there.
- **Outdoors on the ground, or on a corpse:** free world loot (D2).
- **Theft is taking from inside a building that isn't yours (D32).**
- **No owner tag on items.** Ownership comes from where the item is.

Not decided here:
- Who owns a dead NPC's home or shop, and what is in it. (Decided in D46.)
- How a theft is noticed when nobody saw it (open since D32). (Decided in D45.)

## D36 — A player can buy a ready-made house or shop (2026-11-13)
Decision:
- **No building.** A player buys a ready-made house or shop in a town.
- **Selling:** the owner puts items up for sale. Players and NPCs both buy (D4).
- **When the owner dies** the property goes back on sale, and what was inside comes with it, in a chest.
- **After the slice:** it is built alongside NPC jobs, because both need the same NPC economy.

Reference: a bit like The Guild.

Not decided here:
- Whether a reborn player can buy back their old house to get its chest (a paid stash across death, D3).
- Who sells while the owner is away or offline (a hired NPC shopkeeper?).
- How NPCs earn money and choose what to buy, and whether NPCs can buy property too (D4).
- What a building costs, and who is paid.

## D37 — Every item has a value (2026-11-13)
Decision:
- **Every item has a value.**
- **A reference, not a price:** a bit like RuneScape. It is not what a player has to pay, and players can pay more between themselves.
- **Property price:** the price of a house or shop on sale goes up with the value of what is in its chest (D36).

Not decided here:
- Whether NPC shop prices start from an item's value.

## D38 — An NPC holds back from a character whose name it doesn't have (2026-11-13)
Decision:
- **A stranger until named:** an NPC that doesn't have your name treats you as a stranger and holds back.
- **How far depends on its role:** some won't talk until you introduce yourself, a guard might not let you pass, a shopkeeper cares less.
- **It also depends on how you are perceived:** people who dread you are too scared to oppose you (D39).
- **The NPC goes by what it knows of you, never true stats (D28).**

Not decided here:
- The exact reaction of each role to a refusal, and how much of it is in the slice. Fear comes after the slice (D11). (The slice's part is decided in D42.)

## D39 — Dread is the low end of Mercy, not a fourth trait (2026-11-13)
Decision:
- **Not a new trait (D8).** Dread is the low end of Mercy, as each NPC knows it.
- **An NPC dreads a character it knows never spares anyone.**
- **A good character can be dreaded:** Morality and Mercy are separate scales (D7, D8).
- **After the slice:** it arrives with Mercy and the fallen state (D26).

## D40 — Only guards care about a covered face (2026-11-13)
Decision:
- **Guards only:** townsfolk and shopkeepers don't react to a covered face.
- **A guard always challenges a covered face,** crime or no crime, unless it is scared of the character (D39).
- **What counts as covered:** the item worn has the property "covers face". An ordinary helmet does not.

Fits with: a covered face is not recognised (D30), and a deed done with one attaches to no one (D33).

Not decided here:
- What a guard does when the character refuses to show their face. (Decided in D41.)
- Which items have "covers face", and whether any are in the slice (open since D29).

## D41 — A guard orders a covered face out of town, then attacks (2026-11-13)
Decision:
- **Refuse to uncover, and the guard orders you out of town.**
- **Stay or push past, and the guard attacks.**
- **No standing is lost.** A covered face attaches to no one (D33), so the refusal and the fight move nothing.
- **The player has three ways out:** uncover, leave or fight.

Fits with: a guard always challenges a covered face unless it is scared of the character (D40). Fear comes after the slice (D11), so in the slice every guard challenges.

Why: it gives the player a choice, and it needs no new rule for standing.

Rejected:
- **Attacked at once:** refusing counts as hostile. No choice for the player.
- **Let in, but followed:** the guard shadows the character and attacks at the first crime. More guard behaviour to build.

Not decided here:
- How long the character has to leave before the guard attacks.
- Whether other guards join the fight.

## D42 — In the slice a nameless character gets no information (2026-11-13)
Decision (the slice's part of D38):
- **Townsfolk and guards hold back what the town knows:** they won't tell it (D23) to a character whose name they don't have. Introduce yourself (D31) and they answer.
- **Shopkeepers serve anyway.**
- **Nobody blocks the way.** A nameless character walks around their own town freely.
- **After the slice:** the harder reactions in D38 (a guard that won't let you pass) and fear (D39).

Why: a name becomes the price of information. That is a real trade, because once a town has your name your deeds travel with it. It is one rule to build, and it can't lock a newborn character out of their own town.

Rejected:
- **Full:** guards also keep a nameless character out of town, and shopkeepers charge more. More to build, and a newborn could be shut out of their own town.
- **Nothing yet:** names are tracked, but no one holds back until after the slice. Names would do nothing in the slice.

Not decided here:
- Whether a town already knows the name of a character born in it. (Decided in D43.)
- Whether a shopkeeper also holds back what the town knows.
- Whether an NPC that knows your name passes it on to its town (open since D31). (Decided in D44.)

## D43 — A newborn character is a stranger even in their own town (2026-11-13)
Decision:
- **Nobody has a newborn's name,** not even the NPCs of the town they are born in.
- **The newborn has nobody's name either.**
- **Same for NPCs (D4):** an NPC that replaces a dead one (D15) arrives as a newcomer.
- **Home is still home:** the character belongs to their faction's town (D12). Only their name is unknown.

Why: if the home town already knew a newborn, D42 would do nothing in the slice, because the only other town is closed by the war (D14). It keeps one rule for players and NPCs, and it gives a new life a first thing to do: decide who gets your name.

Rejected:
- **Known at home:** the NPCs of the birth town have the name from the start.
- **Known both ways:** the same, and the newborn also starts with the townsfolk's names.

Cost we accept:
- A newborn can commit a crime in their own town before anyone has their name. The deed still attaches to their face (D30).

Not decided here:
- Whether the NPCs that are in a town when the world is created know each other's names.

## D44 — A name given to one NPC is known to its town (2026-11-13)
Decision:
- **The town learns it:** a name given to an NPC joins what its town knows, the same way a deed does (D5).
- **One introduction opens the whole town (D42).**
- **The name travels with tales:** from then on, any tale about the character carries the name, town to town (D5, D30).
- **It can't be taken back.**

Why: it reuses the town knowledge that deeds already need, so a name is one more fact in the same place. It makes giving your name a real commitment.

Rejected:
- **Each NPC separately:** only the NPC you told has the name. More personal, but a memory per NPC and an introduction per conversation.
- **Only with a tale:** the NPC keeps the name to itself until it has something to tell about you.

Cost we accept:
- It is less personal. One introduction per life opens the town, so D42 is a small gate, not a lasting one.

Not decided here:
- Whether a name with no tale attached spreads to other towns.
- Whether a name given to an NPC in the wilderness reaches the town only when that NPC gets there (D5).

## D45 — A theft nobody saw is not a crime (2026-11-13)
Decision:
- **No witness, no crime (D5).** Goods taken from a shop or a home with nobody watching are just gone.
- **Nothing follows:** the owner raises no alarm, no tale spreads, and nothing attaches to anyone.
- **In front of the owner it is still a crime:** the shopkeeper or the resident is the witness (D32, D35).

Why: D5 already says it, so the slice needs no new rule.

Rejected:
- **The owner notices the loss:** a tale of the theft spreads but attaches to no one, like a deed done with a covered face (D33). A good addition later, once towns react to unsolved crimes.
- **The owner suspects whoever was seen inside:** the theft attaches to any character seen in the building around that time. It can blame the wrong character, and it needs a memory of who came and went.

Cost we accept:
- An empty home is free loot.

Not decided here:
- Whether shopkeepers and townsfolk ever leave their shop or home in the slice.
- Who owns a dead NPC's home or shop, and what is in it (open since D35). (Decided in D46.)

## D46 — A dead NPC's shop or home belongs to nobody (2026-11-13)
Decision:
- **No owner, no theft:** when the NPC who works or lives in a place dies, everything inside is free world loot, like a corpse's gear (D3).
- **Owned again** when another NPC takes the place over (D15).
- **The killing is judged on its own:** killing one of your own people is a crime if it is seen (D32). Killing an enemy is not (D14).
- **Player-bought property is different:** it follows D36.

Why: D35 says a place's contents belong to whoever works or lives there, so no owner means no owner. No new rule.

Rejected:
- **The town owns it:** taking from it is still theft when someone sees it.
- **Locked:** the place closes and nothing can be taken until a new owner arrives.

Cost we accept:
- Raiding the enemy town pays well: kill the shopkeeper, empty the shop. That fits a war.

Not decided here:
- Which role and which place a newcomer takes (open since D15). (Decided in D47.)
- Whether a shop gets new stock, and from where.
- What happens when a place has several residents and one of them dies.

## D47 — A newcomer is always a townsperson; empty roles are filled from the townsfolk (2026-11-13)
Decision:
- **A dead guard or shopkeeper is replaced from inside:** one of the town's townsfolk takes the role, and the shop with it (D46).
- **The newcomer is always a townsperson (D15):** it takes the townsperson's spot that opened.
- **A dead townsperson** is simply replaced by the newcomer.
- **The town assigns the role.** An NPC does not pick a job; that still comes after the slice (D11).

Changes D11: shopkeeper and guard are no longer fixed for the whole life of an NPC.

Why: Michael's call. It is the better fiction: a town fills its posts with its own people, and a stranger starts at the bottom.

Rejected:
- **The dead one's role:** a dead guard is replaced by a new guard. Simplest, but the town never changes shape.
- **Any empty role, at random.**

Follows from this:
- A town that keeps losing guards ends up with weaker ones, because skills grow by use (D20). Killing guards wears a town down.

Cost we accept:
- It is the first step of NPC jobs, inside the slice: a townsperson has to change role, gear and place.

Not decided here:
- Which townsperson is chosen. (Decided in D48.)
- How soon the role is filled, and what gear the new guard or shopkeeper gets.
- What happens when no townsperson is left. (Decided in D63.)
- Who replaces a dead roamer. (Decided in D57.)

## D48 — The best-suited townsperson takes an empty role (2026-11-13)
Decision:
- **Guard:** the townsperson with the best fighting skills.
- **Shopkeeper:** a random townsperson, because no trade skill exists yet.

Fits with: this is a town choosing among its own people, so it uses their real skills. D28 (never read true stats) is about judging an enemy.

Why: a birth background then matters for NPCs too (a hunter-born townsperson becomes the guard), and it is as cheap to build as a random pick. Townsfolk don't fight (D28), so their fighting skills come from birth alone.

Rejected:
- **A random townsperson for both roles.**
- **The one who has lived in the town longest.**

Not decided here:
- Which skills count as fighting skills. It depends on the slice's skill list, which waits for the art check.
- How the shopkeeper is chosen once a trade skill exists.

## D49 — A character leaves the world 30 seconds after its player logs off (2026-11-13)
Decision:
- **30 seconds:** when a player logs off, their character stays in the world for 30 seconds, then disappears.
- **It comes back at the same spot** when the player returns.
- **While it is gone, nothing can happen to it.** It can't be robbed or killed.

Why: with permadeath (D3), nobody should lose a life while they are away from the game. The 30 seconds stop a player from logging off to escape a fight. The length is Michael's call.

Rejected:
- **It stays, asleep:** the character lies where the player left it and can be robbed or killed.
- **It leaves only from a safe place:** it disappears in its own town and stays asleep anywhere else.

Cost we accept:
- A hunted character can hide by staying offline. Their reputation waits for them, but they can't be reached.

Not decided here:
- What the character does during the 30 seconds (stands still, defends itself), and whether being attacked restarts the count.
- Whether a lost connection or a crash is treated like logging off.
- What happens if the spot is taken or unsafe when the player returns.
- What happens to a house or shop while its owner is offline (D36).

## D50 — What a character knows dies with it (2026-11-13)
Decision:
- **A new life knows nothing and nobody:** no names, no deeds, no faces from the life before.
- **Inspecting the old life's killer shows a stranger.**
- **What a town knows stays with the town (D5).** A new character can ask for it again (D23), once they have introduced themselves (D42).
- **Same for NPCs (D4).**

Why: knowledge belongs to the character (D22), a newborn is already a stranger to everyone (D43), and death ends everything (D3). Nothing extra to build.

Rejected:
- **Everything carries over** to the new character.
- **Only the old life's death:** the new character knows who killed the last one, and nothing else.

Cost we accept:
- The player still remembers. They can recognise a killer's gear or look on their own, even though the game shows nothing. It can't be prevented, and it rewards paying attention.

Not decided here:
- Whether the uncovered map or a hidden stash survives (open since D3).

## D51 — Overhearing comes right after the slice (2026-11-13)
Decision:
- **Not in the slice.** A character learns about others by seeing a deed or by asking an NPC (D22, D23).
- **Right after the slice:** NPCs talk to each other, and a character close enough learns what is said without asking.

Why: asking an NPC already proves that knowledge travels. Overhearing needs NPC conversations, a hearing range and a timer.

Rejected:
- **A simple version in the slice:** now and then two NPCs in a town talk, and a character standing close learns one thing the town knows.
- **The same, and NPCs overhear too (D4).**

Cost we accept:
- In the slice there is no way to learn what a town knows without giving your name (D42). Lurking and listening comes later.

## D52 — A character can walk through others but can't stop on a taken tile (2026-11-13)
Decision:
- **One character per tile at rest.**
- **Walking through is allowed:** a path can cross a tile another character stands on.
- **A move must end on a free tile.**
- **Same for everyone:** players and NPCs, friends and enemies (D4).

Why: each character keeps their own tile, so clicking a target stays clean and reach stays exact (D18). Nobody can wall a player into a shop, and NPCs never jam each other in a doorway, which matters with a lot of them (D6).

Rejected:
- **Solid:** one character per tile and nobody walks through anybody. A doorway can be held, but it also allows griefing and stuck NPCs.
- **Stacking:** any number of characters on one tile.

Cost we accept:
- No body-blocking. A doorway can't be held against the enemy, and someone who runs can't be cornered.

Not decided here:
- Where a character stops when its destination tile gets taken on the way.
- How big creatures fit (open since D18).

## D53 — In the slice NPCs fight the enemy only when they meet (2026-11-13)
Decision:
- **Guards stay in their town.**
- **Roamers wander the wilderness.**
- **Whoever sees an enemy attacks,** unless it looks clearly stronger (D14, D28).
- **Nobody goes looking:** no patrols, no raids.

Why: the region is about 2 minutes across (D34), so roamers from both sides meet often enough without any planning. It needs no group behaviour.

Rejected (good next steps once the region grows):
- **Patrols:** roamers walk set routes, some of them close to the enemy town.
- **Raids:** now and then a group leaves one town to attack the other.

Cost we accept:
- The war is skirmishes, not battles. A town is never attacked by NPCs, only by players.

## D54 — Loot comes back as new chests, and the world keeps changing (2026-11-13)
Decision:
- **The world has to be alive.** It does not run down as players loot it.
- **New chests, not refills:** loot comes back as new chests that appear in the world. The same chest filling up again is not the plan (Michael: "maybe not").
- **The world changes, if possible:** new places appear over time, such as a new bandit camp or a new goblin camp. This is not necessarily in the first version.

Why: Michael's call. A world that only empties is dead after the first evening, and one that refills in the same spots never surprises anyone.

Rejected:
- **No new loot:** an emptied chest stays empty, and gear enters the world only with newcomers (D15) and newborn players.
- **The same chest refills** after a delay.
- **Shops only:** shops restock and the wilderness never does.

Cost we accept:
- Gear keeps entering the world and nothing takes it out yet. How often a chest appears is the dial.
- Things have to appear in the world without a player seeing them pop in.

Not decided here:
- Whether new camps are in the slice, or only new chests. (Decided in D55.)
- Where and how often a new chest appears, and what is in it. (Where: decided in D62.)
- What happens to an emptied chest (it stays, or it goes). (Decided in D61.)
- Who lives in a camp, and which faction or sub-faction it belongs to. A race is never good or evil (D10), and evil sub-factions were left for after the slice (D12). (D55: a camp can belong to a sub-faction or to a faction itself.)
- Whether a camp can be destroyed, and whether it grows if left alone.

## D55 — The slice has new chests only; camps come later and are planned for (2026-11-13)
Decision:
- **In the slice:** now and then a new chest appears somewhere in the wilderness, out of sight of any player (D54).
- **Camps come after the slice.** They are the first world change to add.
- **Plan for camps now:** nothing built for the slice should make them hard to add.
- **Who owns a camp:** it can be a sub-faction, or simply a faction itself. Both must be possible.

Why: new chests keep the wilderness worth exploring with one small rule. A camp needs its own group, its own spawn rules and an answer on replacing its dead, which is a lot to add to a slice that already has a war.

Rejected:
- **New chests and one kind of camp in the slice:** a bandit camp appears now and then, hostile to both factions, guarding a chest.
- **Camps only:** every new chest comes with a camp around it.

Follows from this (for the build):
- The thing that makes chests appear is built as a general "something appears in the world" system, so a camp is a new kind of thing for it, not a new system.
- Factions are data, not two hard-coded sides. A faction or a sub-faction can hold a place that is not a town.

Cost we accept:
- In the slice new loot is free to whoever finds it first. Nothing guards it but the enemy's roamers.

Not decided here:
- Where and how often a new chest appears, and what is in it (open since D54). (Where: decided in D62.)
- What happens to an emptied chest (open since D54). (Decided in D61.)

## D56 — An NPC that backs off runs home (2026-11-13)
Note (D229): a guard doesn't chase out of town either; roamers chase about 30 tiles.
Decision:
- **A roamer runs to its town.**
- **A guard falls back to the other guards** and fights alongside them. It never leaves the town.
- **One flee behaviour for all three roles:** townsfolk already run to the guards (D28).
- **A fleeing NPC carries the news** of what it saw (D5).

Refines D28: a guard that judges an enemy clearly stronger still fights, but next to the other guards. A town is never left undefended.

Why: it reuses what townsfolk already do, and the news travels with the one who runs.

Rejected:
- **Keep its distance and watch:** follow from afar and attack if the enemy gets hurt.
- **Count heads:** fight anyway with allies near, and run only when alone.

Cost we accept:
- NPCs don't use numbers yet. Three roamers each judge a strong enemy alone, and all three run.

Not decided here:
- Whether numbers count (open since D28).
- What a roamer does once it is home, and when it goes back out.
- What a guard does when it is the last one left.

## D57 — A dead roamer is replaced by a townsperson; guard posts are filled first (2026-11-13)
Decision:
- **Same rule as a guard (D47):** a townsperson becomes the roamer, and the newcomer takes the townsperson's spot.
- **The best fighter left** among the townsfolk is chosen (D48).
- **Guards first:** when a guard post and a roamer spot are both empty, the guard post is filled first.

Why: it keeps D47 as one rule with no exception, and a town under pressure protects itself before it sends anyone out.

Rejected:
- **The newcomer arrives as a roamer:** an exception to D47.
- **Roamers are not replaced:** the wilderness gets quieter until the server restarts.

Cost we accept:
- Guards and roamers draw on the same few townsfolk who can fight. After heavy losses both are filled by people who can barely fight. That is the town being worn down (D47).

## D58 — Nothing stops a player from dying on purpose (2026-11-13)
Decision (for now):
- **No reroll button.**
- **No wait before a rebirth.** A dead player is reborn right away (D3).
- **A player who wants a new life has to get the character killed.**
- **Maybe later:** a wait before every rebirth.

Why: it can't be prevented anyway, since anyone can walk into the enemy town. With no button, a reroll costs a walk and hands the starting gear to the enemy. Permadeath is already the price of a death.

Rejected:
- **A wait before every rebirth** (a minute, for example). Kept as a candidate for later.
- **A "give up this life" button:** the character dies on the spot and leaves its corpse and gear.

Cost we accept:
- A player can cycle births until they roll a talent or strong stats. Each try feeds the other side gear and skill, so it isn't free, but it is possible.

## D59 — A character cast out by their own faction can earn their way back (2026-11-13)
Decision:
- **Cast out is not for life.** A character whose own town attacks them on sight (D9, D12) can get their standing back.
- **Standing with your own faction recovers.**
- **Until it does, they are an outlaw:** both sides attack them, and they live in the wilderness.
- **The enemy town stays closed (D14).** Being cast out by one side does not open the other.

Why: Michael's call. One witnessed mistake should not ruin a whole life with no way back.

Rejected:
- **Nowhere to go:** an outlaw stays one until they die and are reborn.
- **The enemy takes them in.**

Not decided here:
- How standing recovers: through good deeds that are seen, with time, or both. (Decided in D60.)
- What counts as a good deed in the slice. There are no quests (D9). (Decided in D60.)
- How an outlaw gets a good deed seen when their own guards attack on sight.
- Whether Morality recovers the same way (open since D8).

## D60 — An outcast's standing recovers only through good deeds that are seen (2026-11-13)
Decision:
- **Good deeds in the slice:** killing an enemy, or defending one of your own people, in front of your own people.
- **Seen, then carried:** the witness takes it to town like any other deed (D5).
- **Not with time.** Standing does not drift back on its own.
- **A covered face doesn't help:** a deed done with one attaches to no one (D33).

Why: it gives the outlaw something to do, and the way back becomes a story: fight for your side in the wilderness until word reaches town. It reuses witnesses with no new rule. With time, the easy path would be to wait it out, and time spent offline would have to be ruled on (D49).

Rejected:
- **Time only:** standing drifts back slowly and the town forgets.
- **Both:** deeds bring it back fast, time brings it back slowly.

Cost we accept:
- It is a hard road. The outlaw's own roamers attack on sight, so the deed has to be seen by someone the outlaw then survives or outruns.

Not decided here:
- How much each good deed brings back, and how many it takes.
- Whether a witness who is busy attacking the outlaw still reports the good deed.

## D61 — An emptied chest disappears after a while (2026-11-13)
Decision:
- **An empty chest stays for a while,** then disappears.
- **It disappears out of sight of any player.**

Why: new chests keep appearing (D55) and the world is saved (D27), so chests that stayed would slowly fill the wilderness. While it is still there, an empty chest tells a passer-by that someone was here recently.

Rejected:
- **It stays, empty, for good.**
- **It disappears the moment it is emptied.**

Not decided here:
- How long an empty chest stays.
- Whether a chest that still holds something ever disappears.

## D62 — A new chest appears on a random wilderness tile (2026-11-13)
Decision:
- **Anywhere in the wilderness:** a random free tile.
- **Out of sight of any player.**
- **Off the roads.**
- **Up to a maximum number of chests in the region.** At the maximum, no new chest appears until one is gone (D61).

Why: Michael asked for new chests, not the same chest again (D54). In a small region, a list of fixed spots soon feels like the same few places refilling. The maximum keeps gear from piling up.

Rejected:
- **Spots placed by hand:** the region has a list of possible spots and a chest appears at a random empty one.
- **Better loot further from the towns:** worth adding when the region grows. At about 2 minutes across (D34) there is no real "further out".

Cost we accept:
- A chest can land somewhere odd. The map can mark zones where no chest appears.

Not decided here:
- How often a chest appears, the maximum, and what is in it.
- Whether NPCs go looking for chests, or only take what they come across (D4).

## D63 — With no townsperson left, the newcomer takes the empty post directly (2026-11-13)
Decision:
- **Only when a town has an empty post and no townsperson to fill it:** the next newcomer (D15) takes the post directly.
- **Order:** guards first, then roamers (D57), then the shopkeeper.
- **Once the posts are full,** newcomers arrive as townsfolk again (D47).

Why: a gutted town needs defenders before anything else. Making the newcomer arrive as a townsperson and then moving it into the post is an extra step that ends in the same place.

Rejected:
- **The post waits:** the newcomer arrives as a townsperson first, then is moved into the post.
- **The post stays empty for good.**

Cost we accept:
- It is an exception to "a newcomer is always a townsperson" (D47), but only for a town with nobody left.

## D64 — Each slice town starts with 16 NPCs (2026-11-13)
Decision (for now):
- **16 per town, 32 in the region.**
- **Per town:** 8 townsfolk, 4 guards, 3 roamers, 1 shopkeeper.
- **This is the starting population** that a town is never refilled above (D15).
- **The numbers live in data,** not in code.

Why: the region is about 2 minutes across (D34), so 6 roamers already meet often. Townsfolk outnumber the fighting posts, which D47 needs, since guards and roamers are replaced from them.

Rejected:
- **About 30 per town, 60 in the region.**
- **No number until the tick-time measurement (D6).**

Cost we accept:
- It is not yet "a lot of NPCs". That comes when the region grows and the coarse and abstract levels exist (D6).

Not decided here:
- The real budget. It comes from the measurement (D6). (D217: 500 in full detail; 32 fit.)

## D65 — The world is endless, and nobody knows where it came from (2026-11-13)
Decision:
- **Endless:** the world never ends. Nobody has found an edge.
- **Called "the world" or "the land", never a planet.**
- **Little is known:** nobody knows how long the world has existed. Some have theories (D67).
- **Possibly endless races:** there may be no end to the races that live in it.

Why: Michael's lore. It leaves room to grow: new regions, new places (D54) and new races need no excuse.

Not decided here:
- Whether the playable world is itself endless (made as players go further) or a set of built regions inside an endless land. The slice is one hand-built region (D11, D34).
- Whether skeletons, demons, zombies and spirits (D10) are simply other races from further out.

## D66 — Everyone arrives; nobody is born in this world (2026-11-13)
Decision:
- **Everyone arrives as an adult, with no memory of anything before.**
- **Nobody is born here.** There are no children.
- **A "birth" is an arrival:** a player's random birth (D3) and a town's newcomer (D15) are, in the fiction, someone arriving.
- **Nobody knows what happens to those who die in this world.**

Fits with: a newborn is a stranger even in their own town (D43), and a new life knows nothing from the life before (D50).

Why: it matches random birth and the art (no children), and it makes "where do we come from?" the question every creed answers differently (D67).

Rejected:
- **Some people are born here too:** families and children. It needs art and rules the game doesn't have, and arriving stops being a mystery everyone shares.

Not decided here:
- What a background means for someone who arrives with no memory (D24): how is a newcomer a noble or a hunter? (Decided in D70.)
- Where a newcomer appears, and what the townsfolk make of it (open since D15).
- Whether anyone ages or dies of old age.

## D67 — Gods, creeds and the afterlife theory (2026-11-13)
Decision:
- **There are gods.**
- **Some believe in the "one true god".**
- **Some gods are closer to some races,** which makes people think that god is the one who brought that race to the world.
- **The afterlife theory:** some believe this world is the afterlife. An orc died in its own world and came to live in this one. That would be why the world is endless: room for an endless number of people.
- **Gods never show up in person (for now).** People only see signs.

Why: Michael's lore. Belief gives sub-factions that can be good or evil without a race being either (D10).

Not decided here:
- Which gods and creeds exist, their names, and which race each god is close to. (Which gods: decided in D74.)
- Whether a creed is a faction, a sub-faction or neither.
- Whether the war (D14) is a clash of creeds. (Decided in D69: it is not.)
- What a sign is, and whether gods do anything in play (magic and the Gifted talent, D25).
- Whether the modern zombies in the art (cop, fireman) are used as a hint for the afterlife theory.

## D68 — Lore is belief, never fact (2026-11-13)
Decision:
- **The game never confirms a theory.** Nothing in the game says which creed is right.
- **Lore comes from what NPCs say,** and towns disagree.
- **Same spirit as what a character knows about people:** only what they have seen or been told (D22), and it can be wrong (D28).

Why: the mystery is the lore. A confirmed answer would end every theory but one.

Not decided here:
- How a character hears lore (the same talk window as D23?), and how much of it the slice shows.

## D69 — The two slice factions fight because their peoples are too different (2026-11-13)
Decision:
- **The reason for the war (D14):** humans and orcs-and-goblins are so different that they just don't agree.
- **Not about creed:** belief is not what divides the two towns (D67).
- **Not about land.**
- **Neither side is good or evil (D10).** Being different is not being wrong.

Why: Michael's call.

Rejected:
- **A clash of creeds:** the human town follows the one true god, the orc-and-goblin town follows its own god, and each calls the other's belief a lie.
- **Land and survival:** the war is over territory.

Follows from this:
- A creed can be found on both sides of the war.

Not decided here:
- What "so different" looks like in play (ways of living, what each side says about the other). (What they say: D76.)
- Whether orcs and goblins agree with each other on everything. (Decided in D75.)
- How and when the war softens (open since D14).

## D70 — Arriving is called waking (2026-11-13)
Decision:
- **"Waking"** is the world's word for arriving (D66).
- **You wake with gear and skills but no memory:** clothes on your back and hands that know a trade you never learned. This is what a background is (D24).
- **You wake near your own kind.** Believers read it as a god's doing (D67).
- **Lore is written in plain townsfolk voices** (for now), not as myth or scripture.
- **The first draft is in `docs/lore.md`.** Michael read it and said it makes sense.

Why: it explains how a newcomer with no memory can be a noble or a hunter, and it keeps lore in the mouths of NPCs (D68).

Not decided here:
- How a waking happens, and where. (Decided in D71.)
- The names of the gods; the draft leaves them out.

## D71 — Each town has a waking place, and nobody has ever seen a waking (2026-11-13)
Decision:
- **A waking place in each town:** an old ring of standing stones, older than anything else there. The town grew around it, because that is where its people kept turning up.
- **Nobody has ever seen a waking.** The ring is empty, someone looks away, and a newcomer is lying there asleep.
- **You wake on the stones,** dressed, with your gear beside you (D70). Nobody knows you (D43).
- **In the build:** one spawn point per town. A newcomer (D15) or a reborn player (D3) appears there only while no player has it in sight, the same rule as a new chest (D62).
- **What people say:** believers call the ring their god's hand; afterlife believers call it a door that opens one way; some say one dies and one wakes, and maybe it is the same one. None of it is confirmed (D68).

Proposed on 2026-11-13. Michael answered the camping risk (D72), not the place itself; taken as a yes.

Why: it gives a town a reason to be where it is, explains waking near your own kind (D70), and is one spawn point to build.

Rejected:
- **Waking alone in the wilderness and walking in:** more dangerous, and more to build (D15 already rejected newcomers walking in by road).

Cost we accept:
- An enemy can wait at the waking place for whoever wakes. Answered by D72.

Not decided here:
- What happens when a player keeps the waking place in sight the whole time.
- Whether a camp or another race has a waking place too (D55).

## D72 — A newly woken player can't be harmed for a few minutes (2026-11-13)
Decision:
- **Protection on waking:** a player who has just woken can't be harmed for a few minutes.
- **It is the answer to camping** the waking place (D71).

Why: Michael's call. With permadeath (D3) and a war (D14), a new life should not end on the stones.

Not decided here:
- How long, exactly.
- (Decided in D73.) Whether it ends early: on attacking, stealing or leaving the town. The region is about 2 minutes across (D34), so an untouchable newcomer could reach the enemy town.
- Whether NPC newcomers get it too. D4 says no "players only" rule without a decision; Michael said "a new player".
- What the protected character can and can't do, and how others see that someone is protected.
- What the world says about it (a sign of the gods, D67?).

## D73 — The waking protection ends when the character attacks, steals or leaves town (2026-11-13)
Decision (for now; a first version):
- **The protection (D72) ends early** the moment the character:
  - attacks anyone,
  - steals (D32, D35),
  - or leaves their town.
- **Otherwise it runs out on its own** after a few minutes.

Why: the region is about 2 minutes across (D34), so an untouchable newcomer could walk into the enemy town and kill or steal. With these three ends it protects a new life without becoming a weapon.

Not decided here:
- Where "the town" ends for this rule.
- How long the protection lasts, and whether NPC newcomers get it too (open since D72).

## D74 — Three gods, one close to each race, and the "one true god" as a creed (2026-11-13)
Decision (for now):
- **One god per race:** one close to humans, one to orcs, one to goblins (D67).
- **The "one true god" is a creed, not a fourth god.** Its believers say there is only one, and that the others are false or just faces of it.
- **The creed is found in every race and in both towns.** Belief is not what divides the towns (D69).
- **More gods can come with more races (D65).**

Why: it is the simplest set that matches Michael's lore: gods close to races, and some who believe in one true god.

Follows from this:
- The orc-and-goblin town holds two gods under one roof.

Not decided here:
- The gods' names and stories. (Decided in D76.)
- Whether a creed is a faction, a sub-faction or neither (open since D67).

## D75 — Orcs and goblins work together, but orcs think little of goblins (2026-11-13)
Decision:
- **They work together:** one faction, one town (D12).
- **Orcs think little of goblins.**
- **Neither is good or evil (D10).**

Why: Michael's lore.

Not decided here:
- Whether it changes anything in play (roles, prices, how NPCs talk), or is only said.
- What goblins think of orcs. Decided in D95.

## D76 — The gods: Halvar, Gorrath, Skerra, and the One Hand (2026-11-13)
Decision:
- **Humans: Halvar, the Keeper.** God of thresholds, promises and what is yours. Humans say he sets each person down where they belong. Sign: a door found open at dawn.
- **Orcs: Gorrath, the Scarred.** You are what you have done, not what you own. Orcs wake with scars they can't explain and say he put them there as a debt to live up to. Sign: an old scar that aches before a fight.
- **Goblins: Skerra, the Finder.** Goddess of luck and quick wits. Goblins say she hides things in the world for the clever to find, which is why new chests keep appearing (D54).
- **The creed: the One Hand.** "One hand sets us all down." Its believers live in both towns, and neither town fully trusts them.
- **Why humans and orcs are "so different" (D69):** one people measures a person by what they keep and promise, the other by what they have done.
  - Changed by D114: orcs measure a person by strength. Deeds and scars are how it is proven.
- **All of it is what people say (D68).** It is written in `docs/lore.md`.

Why: drafted on 2026-11-13; Michael read it and said it makes sense. Each god gives its people a way to see the world, and Skerra gives new chests a story.

Not decided here:
- Whether following a god changes anything in play.
- Skerra's sign. Decided in D87.
- What goblins think of orcs beyond the one line in `docs/lore.md` (D75).

## D77 — The Keeping in Dawndoor, the Tally in Oldscar (2026-11-13)
Decision:
- **Human faction: the Keeping.** Its town is **Dawndoor**.
- **Orc-and-goblin faction: the Tally.** Its town is **Oldscar**.
- **No race in a name.**
- **The Keeping:** humans measure a person by what they keep and promise (D76).
- **The Tally:** orcs hear a tally of deeds, goblins a tally of trade. One name covers both peoples and keeps the friction of D75.
- **Each town is named for its god's sign (D76):** Dawndoor for Halvar's door found open at dawn, Oldscar for Gorrath's old scar.
- These are the names D12 was waiting for.

Why: Michael chose this set on 2026-11-13. The names say the disagreement of D69 out loud, and each town points to its god without naming one, so the war doesn't read as a war of creeds.

Rejected:
- **Named for the gods** (Halvar's Sworn, Keepersgate / Gorrath's Host, Debtstone): reads like a war of creeds, against D69, and leaves out the goblins and the One Hand believers.
- **Named for the waking place** (the Swept Ring, Sweptstone / the Standing Ring, Standfast): two "Ring" factions are easy to mix up.
- **The three sets from before the lore** (the Vale Compact, Aldermere / the Stonehand League, Karrow; the Merrow Kin, Merrowford / the Brakkan Kin, Brakkahold; the Eastbank Wardens, Ferrow / the Westbank Oath, Gorrim's Ford): they use none of the lore.

Not decided here:
- What each side calls the other. Decided in D78.
- Whether Oldscar stands by a real crag ("scar" is also an old word for one).
- Names for the two rings, or for anything else inside the towns.

## D78 — What each side calls the other: "the Scarred" and "the Hoarders" (2026-11-13)
Decision:
- **Dawndoor says "the Scarred"** for everyone in Oldscar, goblins included. The word comes from the orcs' god, Gorrath the Scarred (D76).
- **Goblins dislike it:** the scars and the god are the orcs', not theirs (D75).
- **Oldscar says "the Hoarders"** for the humans, because humans measure a person by what they keep (D76).
- **These are nicknames, not faction names.** The factions are still the Keeping and the Tally (D77).
- Neither word makes a side good or evil (D10).

Why: proposed on 2026-11-13; Michael said it makes sense. Each nickname is the other side's way of measuring a person, said as an insult, which is the disagreement of D69.

Not decided here:
- Whether goblins have their own word for humans, or for orcs.
- Whether the nicknames show up anywhere in play besides what NPCs say.

## D79 — In the slice, a One Hand believer is just a townsperson (2026-11-13)
Decision:
- **No separate group.** A One Hand believer is a normal member of its own town's faction: the Keeping in Dawndoor, the Tally in Oldscar (D77).
- **No standing of its own.** Helping or harming a believer counts with the town's faction like any other townsperson (D7 to D9, D32).
- **The creed is only said.** A believer talks about it when you speak to them. "Neither town fully trusts them" (D76) is also only said in the slice; it changes no rule.

Why: Michael chose it on 2026-11-13. It costs nothing to build, and the creed can become a sub-faction later.

Rejected:
- **Believers as their own group now:** a standing of their own, apart from the town's, so that helping or harming one changes how all believers see you. More to build, and the slice doesn't need it.

Not decided here:
- Whether the One Hand becomes a sub-faction with its own standing after the slice.
- How many of a town's 16 NPCs are believers (D64), and how a newcomer gets a creed.

## D80 — Skeletons, demons and zombies are peoples like the others (2026-11-13)
Decision:
- **They are peoples, not monsters.** Skeletons, demons and zombies wake like everyone else (D66, D70), around rings of their own (D71), somewhere further out.
- **None of them is good or evil in itself (D10).** Their factions and sub-factions can be.
- **They are characters (D4),** not a simpler kind of enemy.
- **Not in the slice.** The slice keeps humans, orcs and goblins (D10, D11).

Why: Michael chose it on 2026-11-13. It fits "there may be no end to its races" (D65) and "a race is never good or evil" (D10), and it gives the demon and zombie art a place in the world.

Rejected:
- **Monsters:** not people; they don't wake, have no towns, and are only things you fight. It would put a race on the evil side by nature, against D10.

Not decided here:
- What these peoples call themselves, which gods are close to them, and their factions and towns.
- Whether they are playable, and when they arrive.
- Whether spirits (in the Character Creator) are a people too.
- Whether the beasts in the art packs are people or animals, and whether animals are characters (D4). Decided in D98: animals, and not characters.
- What the modern zombies (cop, fireman, soldier) mean for the afterlife belief (D67). Decided in D81: they are not used.

## D81 — The modern zombie art is not used (2026-11-13)
Decision:
- **Left out:** the modern zombies in "2D Zombie pack 2" (cop, fireman, soldier, worker, radioactive) are not used in the game.
- **Kept:** the zombies that look like they belong in a fantasy world. Zombies are still a people (D80).
- **No hint for the afterlife belief** comes from modern clothes. The belief stays as something people say (D67, D68).

Why: Michael's call on 2026-11-13: "forget the modern assets".

Rejected:
- **Kept as a hint:** some zombies wake in clothes nobody recognises, supporting the afterlife belief without explaining it. Michael doesn't want the modern art in the game.

Not decided here:
- Which of the 42 zombie sheets count as modern (the art check lists them).

## D82 — Oldscar starts with orc guards and roamers; the shopkeeper can be either (2026-11-13)
Decision:
- **Guards and roamers:** in Oldscar's starting population (D64) the 4 guards and 3 roamers are orcs.
- **Shopkeeper:** an orc or a goblin. Orcs can keep a shop too.
- **Townsfolk:** the 8 townsfolk are a mix of orcs and goblins.
- **Starting population only.** Replacement is unchanged (D47, D48, D57, D63): a goblin townsperson who is the best fighter left can still become a guard or a roamer.
- **Dawndoor is not affected:** it has one people.

Why: Michael chose it on 2026-11-13, and added that orcs can also be shopkeepers. It shows the lore the moment you walk into the town ("Gorrath made us to stand and fight", D75, D76) and costs nothing to build.

Rejected:
- **No link:** any role can be an orc or a goblin at random. Nothing of D75 would show in the town.
- **The shopkeeper is always a goblin:** Michael wants orcs to be able to keep a shop.

Not decided here:
- How many of the 8 townsfolk are orcs and how many goblins.
- How the starting shopkeeper's people is picked (at random is the default until decided).
- Whether a newcomer to Oldscar (D15) is an orc or a goblin, and at what odds.

## D83 — In the slice, a god's sign is only a story (2026-11-13)
Decision:
- **Signs are only told.** NPCs talk about their god's sign (D76); a player never sees one happen.
- **Nothing is built for signs in the slice:** no event, no day and night cycle for them.
- Gods still never show up in person (D67), and nothing is confirmed (D68).

Why: proposed on 2026-11-13; Michael said it makes sense. Seeing a sign needs a day and night cycle and a small event system, which the slice doesn't have.

Rejected:
- **Signs you can see:** now and then a small thing really happens in the world with no effect on play, such as a door in Dawndoor standing open at dawn. A candidate for after the slice.

Not decided here:
- Whether signs become visible after the slice, and whether one ever changes anything in play.
- Whether gods do anything in play at all (magic, D25).
- Skerra's sign (D76). Decided in D87.

## D84 — The world is hand-built regions, added over time like WoW (2026-11-13)
The "hand-built" part is replaced by D136: the land is generated from a seed. Regions added over time still stands.

Decision:
- **Hand-built regions.** The playable world is built by hand, region by region. The slice is the first one (D11, D34).
- **New regions are added over time, "WoW style":** new islands and other lands are unlocked as the game grows.
- **Nothing is generated without end.**
- **The lore still calls the land endless (D65).** The map stops where nothing is built yet, and the game never says that is the edge (D68).

Why: Michael chose it on 2026-11-13: "a bit WoW style, we unlock new islands". Towns and waking places (D71) have to be placed by hand anyway, and endless generation is a large system on its own.

Rejected:
- **Generated without end:** the game creates new land by itself as players walk further. Too large to build, and it can't place towns and rings well.

Not decided here:
- Whether the first region is itself an island, and what a player sees at the end of the map. Decided in D85: an island, and the sea.
- How a new region opens: it is simply there after an update, or players unlock it in play.
- How characters travel between regions (by sea, or the tileset's portals).
- Whether the wilderness between hand-built places is ever generated.
- `docs/lore.md` says "walk in any direction for as long as you like: the land goes on". It may need rewording if regions are islands.

## D85 — The first region is an island (2026-11-13)
Decision:
- **An island.** The first region, with Dawndoor and Oldscar (D77), is an island.
- **The sea is the end of the map.** No invisible wall on land.
- **Later regions are across the water:** other islands and lands (D84).
- **The lore changes one line:** nobody has found an edge by sea either. `docs/lore.md` now says "sail in any direction" where it said "walk in any direction". The world is still endless and is never called a planet (D65).

Why: Michael chose it on 2026-11-13. It fits "we unlock new islands" (D84), the sea needs no invisible wall, and the tileset already has water.

Rejected:
- **Part of a bigger land:** the map ends on land, at mountains or a forest that can't be crossed yet. It needs a wall the player can see is fake.

Not decided here:
- The island's name. Decided in D86: Twinring.
- Whether characters can sail or swim, and how they reach another region (D84). For the slice, decided in D102: neither.
- Whether both towns touch the coast.

## D86 — The first island is called Twinring (2026-11-13)
Decision:
- **Name:** the first island (D85) is **Twinring**.
- **Why that name, in the world:** it has two rings of standing stones (D71), one in Dawndoor and one in Oldscar (D77).
- Both towns use the name.

Why: Michael chose it on 2026-11-13. It comes straight from the lore, and two rings on one small island is why two peoples who can't agree (D69) live so close together.

Rejected:
- **The Wake:** the place where both peoples wake. Less clear as a place name.
- **Firstshore:** plain, and leaves room for later islands, but uses none of the lore.

Not decided here:
- Names for the two rings themselves, the sea, or anything else on the island. The sea is decided in D99, the rings in D100.

## D87 — Skerra's sign: something found where you had already searched (2026-11-13)
Decision:
- **Skerra's sign:** you find something in a place you had already searched.
- It completes the three signs (D76): Halvar's door found open at dawn, Gorrath's old scar that aches before a fight, and this one.
- Like the others, it is only a story NPCs tell in the slice (D83).

Why: proposed on 2026-11-13; Michael said it makes sense. She is the Finder, and goblins already say she hides things for the clever to find (D76), which is their story for new chests (D54).

Not decided here:
- Whether the One Hand has a sign. Decided in D101: none of its own.
- Whether a new chest appearing where a player already looked counts as her sign in play (it already happens, D62).

## D88 — NPC newcomers get the same waking protection as players (2026-11-13)
Decision:
- **Same rule for everyone.** An NPC newcomer (D15) that wakes at the ring can't be harmed for the same few minutes as a newly woken player (D72).
- **It ends the same way (D73):** early, the moment the character attacks, steals or leaves its town.
- This keeps one character model (D4): waking protection is not a players-only rule.

Why: Michael chose it on 2026-11-13. An NPC is the same kind of character as a player (D4), and without it an enemy could wait at the ring and kill every newcomer as it wakes, which would empty a town.

Rejected:
- **Players only:** an NPC newcomer can be attacked the moment it appears. It breaks D4 and lets a town be emptied at its ring.

Not decided here:
- How long the protection lasts. Decided in D90: 3 minutes to start.
- How others see that a character is protected. Decided in D89: a visible glow or marker.
- Whether a protected NPC that is attacked reacts (flees, calls the guards).

## D89 — Waking protection is visible to everyone (2026-11-13)
Decision:
- **Visible.** A newly woken character shows a soft glow or a small marker while it can't be harmed (D72, D88).
- **Everyone sees it:** players of both sides, on a player or an NPC alike.
- **It disappears the moment the protection ends,** by time or early (D73).

Why: Michael chose it on 2026-11-13. Nobody wastes a fight on someone they can't hurt, and it matches the lore: everyone already knows the newly woken can't be harmed for a short while (`docs/lore.md`).

Rejected:
- **Hidden:** nothing shows, and an attacker only finds out when the hits do nothing. Confusing, and it reads as a bug.

Not decided here:
- Glow or marker, and what it looks like (the tileset has effects; the art check will say).
- How long the protection lasts. Decided in D90: 3 minutes to start.
- Whether an NPC that sees the glow holds back from attacking (D28). Decided in D94: it ignores the character.

## D90 — Waking protection lasts 3 minutes to start (2026-11-13)
Decision:
- **Length:** 3 minutes from waking, for players and NPC newcomers alike (D72, D88).
- **Stored as a setting,** one number, so it can be changed after playing.
- **Still ends early** the moment the character attacks, steals or leaves its town (D73).

Why: proposed on 2026-11-13; Michael said it makes sense. Long enough to look around the town and talk to someone. "A few minutes" in D72 needed a number to build from.

Not decided here:
- The final length, once it has been played.

## D91 — In the slice, a player hears the lore by asking an NPC (2026-11-13)
Decision:
- **One more conversation choice:** "What do people say here?"
- **The answer is one line of lore** from `docs/lore.md` that fits the NPC's town and people. An orc gives an orc's view, a goblin a goblin's, a One Hand believer theirs (D79).
- **Towns and peoples disagree,** and the game never says who is right (D68).
- **The lines are data:** each is tagged with who can say it (town, people, creed), so lore is added without code.

Why: Michael chose it on 2026-11-13. Conversations with NPCs already exist in the slice (D31, D42), so this is one extra choice and a list of lines, and it shows that towns disagree, which is the point of the lore.

Rejected:
- **No lore in the slice:** the lore stays in the doc and reaches the game later. The slice would have names and gods that nobody in the world talks about.

Not decided here:
- Whether an NPC answers a stranger, or only someone who has introduced themselves (D42). Decided in D92: it answers anyone.
- Whether the same NPC repeats itself or works through its lines.
- Books, signs or other written lore.

## D92 — Anyone can ask an NPC for lore, even a stranger (2026-11-13)
Decision:
- **No introduction needed.** An NPC answers "What do people say here?" (D91) even when it doesn't have your name.
- **Town knowledge is unchanged (D42):** townsfolk and guards still won't say what the town knows about people and deeds until you introduce yourself.
- The split: lore is talk and is free; what the town knows about people is guarded.

Why: Michael chose it on 2026-11-13. A newly woken character knows nothing and nobody (D43, D50), so that is when the lore is most useful.

Rejected:
- **Same as town knowledge:** townsfolk and guards share lore only after an introduction. It would hide the lore from the newly woken, who need it most.

Not decided here:
- Whether an enemy NPC ever talks at all (D14).
- Whether an NPC that dreads or distrusts you still answers (D38, D39).

## D93 — Waking protection covers only harm from players and AI (2026-11-13)
Decision:
- **What it stops:** harm done by another player or by anything driven by AI (an NPC, and any AI-driven creature).
- **What it does not stop:** any other kind of harm. It is not general invulnerability.
- This narrows D72, which said a newly woken character "can't be harmed". Length, early end, NPC newcomers and the glow are unchanged (D73, D88 to D90).
- `docs/lore.md` now says "no one can harm" where it said "nothing can harm".

Why: Michael's rule on 2026-11-13: "it protects only against other players/AI". The protection exists to stop an enemy waiting at the ring (D72), and that enemy is always a player or an AI.

Not decided here:
- Which other kinds of harm exist (hazards, drowning, hunger). None is in the slice yet.
- Whether an enemy NPC that sees the glow holds back or attacks for no damage (asked on 2026-11-13; this decision was Michael's reply and does not settle it).

## D94 — An enemy NPC ignores a character under waking protection (2026-11-13)
Decision:
- **Ignored.** An enemy NPC that sees a character under waking protection (the glow, D89) ignores them: it does not attack, chase or wait for them. It goes on with what it was doing.
- **When the glow ends,** the NPC treats the character as it normally would (D14, D28).
- A protected character that attacks loses its protection at once (D73), and is then a normal target.

Why: Michael's answer on 2026-11-13: "it just ignores it". An NPC judges a fight as a player would (D28), and a player who sees the glow wouldn't bother.

Rejected:
- **Attack anyway:** the NPC swings and does no damage. It looks like a bug.
- **Wait nearby until the glow ends:** not what Michael asked for; the NPC simply ignores the character.

Not decided here:
- Whether the reading is right: "it" was taken as the protected character. If Michael meant the NPC ignores the glow and attacks, this decision is replaced.
- Whether a protected NPC reacts when a player tries to attack it.

## D95 — Goblins are smarter than orcs, and call them "dolts" (2026-11-13)
Decision:
- **Goblins are smarter than orcs.** This is Michael's lore, and it says nothing about good or evil (D10).
- **Goblins call orcs "dolts".** It is a real word, and it means stupid people.
- **Orcs don't really understand the word.** Goblins use it among themselves, and in front of orcs.
- It sits beside the other nicknames (D78): Dawndoor says "the Scarred", Oldscar says "the Hoarders".

Why: Michael's direction on 2026-11-13: "the goblins are smarter than the orcs, so make it like they have some word that the orcs don't really understand but it means stupid", then "something that really exists", then "let's go with dolts". It answers D75's open point on what goblins think of orcs.

Rejected:
- **Words about size or habits:** the Tall, the Mouths, the Stones, the Loud. Michael wanted a word that means stupid.
- **Invented goblin words:** Gorrim, Thunk, Brom. Michael wanted a word that really exists.
- **Other real words:** the Obtuse, the Dense, Lummoxes, Ignoramus, Stulti (Latin), Tarlas (Québec slang).

Not decided here:
- What orcs think "dolts" means, if anything.
- Whether goblins being smarter changes anything in play (Intellect at a random birth, D19). Decided in D96: goblins lean to Intellect.
- Whether goblins have their own word for humans.

## D96 — At a random birth, goblins lean to Intellect and orcs to Strength (2026-11-13)
Decision:
- **Goblins tend to roll higher Intellect** (they learn skills faster, D19).
- **Orcs tend to roll higher Strength.**
- **The ranges overlap.** A clever orc or a strong goblin is possible, just less common. No single character is decided by its people.
- It applies to every random birth: players and NPC newcomers alike (D3, D4, D15).
- A lean is about stats only. It never makes a people good or evil (D10).

Why: Michael said yes on 2026-11-13. It makes "goblins are smarter" (D95) true in play, and it matches his own example of a birth: "some kind of monster with low intellect and high strength".

Rejected:
- **Only said:** every people rolls the same ranges and "smarter" is just what goblins say. The lore would not show in play.

Not decided here:
- The numbers: the ranges and how far they overlap.
- Whether humans lean to any stat. Decided in D97: they roll evenly.
- Whether a people leans in Agility or Endurance.
- Whether a people changes the odds of a background (D24) or a talent (D25).

## D97 — Humans roll evenly, with no lean (2026-11-13)
Decision:
- **No lean.** At a random birth a human rolls every stat from the same range. Any kind of human is equally likely.
- With D96 this gives each people a feel: goblins lean clever, orcs lean strong, humans are the wide mix.
- Same for players and NPC newcomers (D4).

Why: Michael chose it on 2026-11-13. It keeps the three peoples easy to tell apart, and it leaves room for his example of a "noble human with high intellect" next to any other kind of human.

Rejected:
- **A human lean to one stat,** like goblins and orcs. Three leans are harder to tell apart, and humans are the only people in their town.

Not decided here:
- The numbers: the ranges for each people and how far they overlap (D96).
- Whether a background (noble, hunter, thief) shifts the stats (D24).

## D98 — The beasts are animals, not peoples (2026-11-13)
Decision:
- **Animals.** The beasts in the art packs (2 in the orc pack, 5 in the demon pack) are wild creatures.
- **They are not a people (D80):** they don't wake at a ring, have no towns, no names and no faction.
- **They are not characters (D4).** An animal uses a much simpler model and a simpler AI than a character. This is the new decision D4 asks for.
- A character can meet them, hunt them or be hunted by them.
- Waking protection covers them too: it stops harm from anything driven by AI (D93).

Why: Michael chose it on 2026-11-13. It gives the wilderness something that isn't at war with anyone, and a simple AI for animals helps the server (D6).

Rejected:
- **Peoples,** like skeletons, demons and zombies: they wake, think and belong to a faction. Not every creature needs a town and a god.

Not decided here:
- Whether any animal is in the slice (D11 lists none). Decided in D103: none.
- Which beast is which animal, what each drops, and whether animals come back after being killed.
- Whether an animal can witness a deed (D5); the default is no.
- Whether Beast-kin (D25) lets a character do anything with them.

## D99 — The sea around Twinring is the Long Water (2026-11-13)
Decision:
- **Name:** the sea around Twinring (D85, D86) is **the Long Water**.
- Both towns use the name. It is how a townsperson says it: nobody who sailed it found an end (D65).

Why: proposed on 2026-11-13 as the pick of three; Michael said it makes sense. The lore is written in plain townsfolk voices (D70), and this sounds like something people would actually say.

Rejected:
- **The Unending:** the same idea said like a legend. Too grand for townsfolk.
- **The Grey:** short and about how it looks, but it says nothing about the world.

Not decided here:
- Whether characters can sail or swim on it (D85). For the slice, decided in D102: neither.
- Names for the two rings. Decided in D100.

## D100 — The two rings are the Threshold and the Debt (2026-11-13)
Decision:
- **Dawndoor's ring is "the Threshold".** Halvar is the god of thresholds, and humans say he sets each person down where they belong (D76).
- **Oldscar's ring is "the Debt".** Orcs say the scars they wake with are a debt to live up to (D76), so the place you wake is where the debt begins.
- Each name is that town's own belief about waking, in one word. The game confirms neither (D68).
- Together the two rings give the island its name, Twinring (D86).

Why: proposed on 2026-11-13; Michael said it makes sense. A waking place is where every player starts each life (D71), so it should have a name people say.

Not decided here:
- Whether goblins use "the Debt" or have their own word for the ring in Oldscar.
- What each town calls the other town's ring.

## D101 — The One Hand has no sign of its own (2026-11-13)
Decision:
- **No fourth sign.** The One Hand has no sign of its own.
- **Its believers claim all three:** the door found open at dawn, the old scar that aches before a fight, and the thing found where you had already searched (D76, D87) are, to them, the same hand at work.
- Like every sign, this is only said in the slice (D83), and the game confirms nothing (D68).

Why: Michael chose it on 2026-11-13. It is what a one-god believer would argue ("the others are false, or just faces of it", D76), it gives believers something to say in both towns, and it needs no new sign.

Rejected:
- **Its own sign,** a fourth one apart from the three. It would make the One Hand look like a fourth god, against D74.

Not decided here:
- What followers of the three gods answer to that claim.

## D102 — In the slice, the shore is the limit (2026-11-13)
Decision:
- **No swimming and no sailing in the slice.** A character can walk along the shore of Twinring and no further (D85).
- **The Long Water is the edge of the map (D99).** Water tiles can't be walked on.
- The lore still talks about sailing (D85); that is what people say, not something a player does yet (D68).

Why: Michael chose it on 2026-11-13. It is the simplest edge to build, it needs no swimming animation, and sailing can arrive later as the way to reach a new island (D84).

Rejected:
- **Swimming** some distance out. It needs art and rules (how far, drowning) for no gain in the slice.

Not decided here:
- Whether characters ever swim.
- How sailing works when a second region exists, and who can sail (D84).
- Whether rivers or ponds inside the island can be crossed.

## D103 — The slice has no animals (2026-11-13)
Decision:
- **No animals in the slice.** It keeps the scope of D11: two towns, their people, and chests.
- **Animals arrive right after the slice,** once the core loop works (D98).

Why: Michael chose it on 2026-11-13. The slice is there to prove the hard parts (random birth, witnesses, reputation, permadeath). Animals need their own AI, drops and respawn rules, and they are a clean addition afterwards.

Rejected:
- **The two beasts from the orc pack roaming Twinring's wilderness,** so a player has something to fight that isn't at war with anyone. Useful, but not needed to prove the slice.

Not decided here:
- Which animals come first after the slice, and where they sit in the build order.

## D104 — Each people has a custom for its dead, and it is only said (2026-11-13)
Decision:
- **Humans** bury their dead under a doorstone, with one thing that was theirs.
- **Orcs** burn theirs and tell the deeds aloud.
- **Goblins** trade away what the dead owned and keep one coin for Skerra.
- **Only said in the slice (D91).** Nothing is built: no graves, pyres or doorstones in the world, and a corpse's gear stays world loot (D3).
- No custom says where the dead go (D66, D68).

Why: decided with Michael on 2026-11-13 (afternoon). Written from the handoff, like D105 to D110, so these have no "Rejected" section.

Not decided here:
- Whether graves, pyres or doorstones ever show in the world after the slice.
- What is done with a dead outcast. Decided in D112.

## D105 — What each people answers the One Hand (2026-11-13)
Decision:
- The One Hand's believers say all three signs are the One Hand's (D101). Each people has an answer:
- **Humans shrug:** "Believe what you like, as long as you keep your word."
- **Orcs:** a hand with no scars has done nothing.
- **Goblins joke** that Skerra has already been through the One Hand's pockets.
- **Nobody fights over it.** The war is not about creed (D69).
- Only things NPCs say (D91).

Why: decided with Michael on 2026-11-13 (afternoon). It answers the question left open in D101.

## D106 — Orcs think "dolts" is a word of respect (2026-11-13)
Decision:
- Orcs think "dolts" (D95) means **"the big ones"**, a word of respect.
- Some use it with pride: "the biggest dolt in Oldscar".
- **No goblin corrects them.** It is the goblins' private joke.
- Only something NPCs say (D91).

Why: decided with Michael on 2026-11-13 (afternoon). D95 left open what orcs make of the word.

## D107 — Oldscar stands under a cliff with one long crack (2026-11-13)
See D136 and D137: the map is generated from a seed, and this stays the same on every seed.

Decision:
- **Oldscar stands under a cliff** with one long old crack down it.
- **Orcs** say it is Gorrath's scar, and that the town was put there because of it.
- **Goblins** say it is just a crack, but not in front of orcs.
- **Scenery on the hand-built map.** It does nothing in play, and the game never says who is right (D68).

Why: decided with Michael on 2026-11-13 (afternoon). It gives the town's name (D77) something a player can see.

## D108 — A lone stone doorway stands on Dawndoor's east side (2026-11-13)
See D136 and D137: the map is generated from a seed, and this stays the same on every seed.

Decision:
- **An old stone doorway stands alone on the east side of Dawndoor,** with no wall around it.
- **Humans** say it is Halvar's door and that the town grew beside it. By custom nobody walks through it at night, only at dawn.
- **Oldscar** says it is a ruin: what is left of a house.
- **Scenery on the hand-built map.** It does nothing in play. The custom is only said: no rule stops a player walking through it. The game never says who is right (D68).

Why: decided with Michael on 2026-11-13 (afternoon). It gives the town's name (D77) something a player can see, like the cliff in Oldscar (D107).

## D109 — Goblins call Oldscar's ring "the Find" (2026-11-13)
Decision:
- **Goblins call Oldscar's ring "the Find".** Orcs call it "the Debt" (D100).
- To a goblin, each newcomer is something Skerra found and left there, like a chest (D76).
- Orcs think the goblin name is childish.
- **In play only the lore lines differ (D91):** a goblin NPC says "the Find", an orc NPC "the Debt".

Why: decided with Michael on 2026-11-13 (afternoon). It answers the question left open in D100.

Not decided here:
- What each town calls the other town's ring.

## D110 — One Hand believers leave the dead's right hand open (2026-11-13)
Decision:
- A believer gets **their own people's custom** for the dead (D104).
- Other believers add **one gesture:** the dead's right hand is left open, palm up. "The Hand takes back what it gave."
- Non-believers let them (D105).
- Only said in the slice (D91).

Why: decided with Michael on 2026-11-13 (afternoon). The creed has believers of every people (D74), so it adds to each custom and replaces none.

## D111 — What each people does with a dead enemy (2026-11-13)
Decision:
- **Humans** leave an enemy's body where it fell. "Not ours to keep."
- **Orcs** tell the deeds of an enemy who fought well, like one of their own. A coward gets nothing.
- **Goblins** take what is on it and say Skerra left it.
- **Only things NPCs say (D91).** Nothing is built, and the gear is world loot either way (D3).

Why: proposed on 2026-11-13; Michael said yes. Each line is the people's own measure (D76) applied to the enemy. The line about cowards was added to the handoff the same evening, outside the chat that proposed the rest.

## D112 — What each people does with a dead outcast (2026-11-13)
Decision:
- Each people keeps its custom for the dead (D104) with **one part taken away or turned**.
- **Humans** bury an outcast (D59) outside the town, with no doorstone and nothing of theirs. "Kept no promise, so nothing is kept for them."
- **Orcs** burn them like anyone and tell every deed, the bad ones too. "The Tally leaves nothing out."
- **Goblins** trade their goods as usual but keep no coin for Skerra. "A bad find."
- **Only things NPCs say (D91).** Nothing is built.

Why: proposed on 2026-11-13; Michael said it makes sense. It follows from D104 and from who an outcast is (D59).

Not decided here:
- Anything about an outcast who earned their way back before dying (D60). They are no longer an outcast.

## D113 — Dawndoor is on the east shore, Oldscar inland in the west (2026-11-13)
See D136 and D137: the map is generated from a seed, and this stays the same on every seed.

Decision:
- **Dawndoor is on Twinring's east shore.** Its lone doorway (D108) faces the Long Water and the sunrise.
- **Oldscar is inland in the west,** under its cliff (D107), away from the water.
- **What each people says about the sea (D91):** humans are the ones who talk of sailing; orcs say nothing across the water is worth a scar; goblins say Skerra's best finds wash up on the shore.
- **Nothing changes in play.** The shore is still the limit (D102).

Why: proposed on 2026-11-13; Michael said it makes sense. It answers "do both towns touch the coast?", and it gives the door on the east side (D108) a reason: it looks at the dawn over the water.

Rejected:
- **Oldscar on the coast too.** Offered as the alternative; Michael kept Oldscar inland.

Not decided here:
- The exact layout of the island. The towns are still about 2 minutes' walk apart (D34).

## D114 — Orcs judge by strength, and by what they see (2026-11-13)
Decision:
- **Michael's lore, in his words:** "Orcs judge by strength (or power), they are influenced easily by appearance. Someone big = strong for them. Big weapon = strong, small weapon = weak."
- **Strength is the orc measure.** Deeds and scars are how strength is proven, so Gorrath the Scarred and the Tally keep their names (D76, D77), and the earlier orc lines stand (D104, D105, D111, D112).
- **Looks come first.** A big stranger with a big weapon is respected before doing anything. A small one with a small weapon has to prove it.
- **An orc can be fooled by looks,** in both directions.
- **This changes D76:** humans measure a person by what they keep and promise, orcs by strength. That is the "so different" of D69.
- **Lore only for now.** No rule in play changes.

Why: Michael's own lore, given on 2026-11-13. The reading above (deeds as proof of strength, looks first) was put to him and he confirmed it.

Rejected:
- **An orc line built only on a record of deeds** ("no tale has come back, so nobody over there has done anything yet"). Michael answered it with this rule.

Not decided here:
- Whether an orc NPC weighs body size and weapon size more than others when it judges an enemy (D28), and so gets fooled more often.

## D115 — What each people says lies across the Long Water (2026-11-13)
Decision:
- **Nobody on Twinring has crossed and come back,** so each people guesses.
- **Humans:** other rings and other peoples. "Every shore has a threshold."
- **Orcs:** anyone big over there would have come and taken Twinring by now, so they must be small (D114).
- **Goblins:** it is where Skerra keeps what she hasn't left yet.
- **Only things NPCs say (D91).** The game never says who is right (D68), even though other peoples do wake further out (D80).

Why: proposed on 2026-11-13; Michael said it makes sense once the orc line was rewritten from D114. Each guess is the people's own measure: thresholds, strength, finds.

Rejected:
- **The first orc line,** built on deeds. See D114.

## D116 — Orcs think little of goblins because goblins are small (2026-11-13)
Decision:
- **Why orcs think little of goblins (D75):** goblins are small, and for an orc small means weak (D114).
- **A goblin saying:** "Talk to a dolt with something big in your hand."
- **A goblin habit:** some carry a weapon too big to use, just for show.
- **Orcs know the trick and still half believe it.**
- **Only things NPCs say (D91).** No rule in play.

Why: proposed on 2026-11-13; Michael said yes. It gives D75 a reason that comes straight from D114, and it fits goblins being the clever ones (D95, D96, D106).

Not decided here:
- Whether orcs thinking little of goblins changes anything in play beyond the starting roles (D82).

## D117 — What each people says of the enemy (2026-11-13)
Decision:
- Each people turns **its own measure** on the other side.
- **Orcs on humans:** "You can't read a Hoarder." Humans come in every size (D97), and a small one can hit like a big one.
- **Humans on orcs:** "A Scarred keeps its word to someone bigger and forgets it with someone smaller." To a human that is no promise at all.
- **Goblins on humans:** "Hoarders lock everything up, which only tells you where the good things are."
- **Only things NPCs say (D91).** The war is unchanged (D14), and neither side is good or evil (D10).

Why: proposed on 2026-11-13; Michael said yes. It shows the "so different" of D69 in the peoples' own words.

Not decided here:
- Whether goblins have their own word for humans (D78).

## D118 — Who raised the standing stones (2026-11-13)
Decision:
- **Humans:** Halvar set them as the first threshold, before there was a town.
- **Orcs:** someone very big did, because nobody alive could lift one (D114).
- **Goblins:** nobody did. The stones were just found there, like everything else of Skerra's.
- **One Hand believers:** they are the Hand's fingers.
- **Only things NPCs say (D91).** The rings do nothing new in play, and the game never says who is right (D68).

Why: proposed on 2026-11-13; Michael said yes. Same pattern as the ring names: the Threshold, the Debt, the Find (D100, D109).

## D119 — What each people says its god looks like (2026-11-13)
Decision:
- No god ever shows up (D67), so these are only pictures in people's heads.
- **Humans:** nobody has seen Halvar, only his door. They don't guess.
- **Orcs:** Gorrath is the biggest orc there ever was, with more scars than skin (D114).
- **Goblins:** Skerra is smaller than any goblin, which is why nobody ever catches her leaving things.
- **One Hand believers:** there is only a hand.
- **Only things NPCs say (D91).** The game never says who is right (D68).

Why: proposed on 2026-11-13; Michael said yes. Orcs picture their god big and goblins picture theirs small, which answers "small means weak" (D116) from the goblin side.

## D120 — Why each people says you wake with no memory (2026-11-13)
Decision:
- **Humans:** Halvar keeps it for you behind his door, because it is yours.
- **Orcs:** whatever you were before proves nothing here. You wake owing (the Debt, D100) and start again from what people can see (D114).
- **Goblins:** Skerra kept it as her coin for finding you (D104, D109).
- **Only things NPCs say (D91).** The game never says who is right (D68).

Why: proposed on 2026-11-13; Michael said yes. It gives each people an answer to the first thing a newcomer asks (D66, D70). After this one Michael asked whether the lore was enough for now, and the lore was paused.

## D121 — All three races are drawn from the Character Creator (2026-11-13)
Decision (for now):
- **One source for characters:** humans, orcs and goblins are all drawn from the Character Creator's human body and its parts. The parts are plain PNG files in `Fantasy Character Creator_Data/StreamingAssets/Spritesheets/`, one folder per part, 30 animations each. Godot stacks them. The Creator program is not needed.
- **Orc:** the body tinted green and scaled up. **Goblin:** tinted green and scaled down.
- **Sizes tested, not chosen:** orc at 125%, at 140% wide by 120% tall, and at 150% wide by 115% tall; goblin at 75% and 82%. Measured: the pack orcs are about 115% of the Creator body's height and the pack goblins about 82%. (Chosen in D205: orc 140% by 120%, goblin 75%.)
- **Race reads from size and skin colour only.** No big ears, no hunch. Armour that covers the skin hides it (D29).
- **Same parts, same 30 animations, same code for all three races (D4).** Loot shows on everyone. Weapons scale with the body, so an orc's weapon is drawn bigger (D114).
- **Parts are drawn in grey** and get a colour each.
- **The orc and goblin pack sheets are not used for characters.** Its two wolves are still usable as animals (D98).

Why: Michael chose it on 2026-11-13 after the scaling test: "looks good I think, let's go with creator". It gives one character model and gear that shows piece by piece. Detail of the art is in `docs/art-check.md`.

Rejected:
- **The orc and goblin pack sheets:** they look more like orcs and goblins and have a block animation, but each is one fixed drawing with its weapon painted in, so loot can't change the look. The Creator's gear does not line up with them (tested: the poses and animations differ).
- **Both side by side:** the sizes can be matched, but with no armour a pack orc and a Creator orc look like different creatures (they blend only in full plate), and a pack sheet can't show loot. Michael: "the orc pack looks more high quality, for now let's keep creator pack".

Cost we accept:
- The Creator has no block animation, so how any character blocks is open (answered by D207: a white flash and a sound). Dodge is covered (Rolling, Slide).
- The unarmoured Creator orc is a plain green figure with no ears or face.

## D122 — A character carries a base number of slots; a backpack adds more (2026-11-14)
Decision:
- **Base slots:** every character carries a base number of item slots.
- **Backpack:** a backpack worn on the back adds more. It is a Creator back part, so others can see it. A pack tells a stranger you may be carrying a lot (D21).
- **Equipment slots follow the Creator's parts:** head, chest, legs, shoes, hands, belt, back, main hand, off hand.
- The numbers are in D124.

Why: Michael chose it on 2026-11-14. It uses the Creator's backpacks and fits "a stranger is judged by gear" (D21).

Rejected:
- **The same fixed number of slots for everyone** (RuneScape).
- **A weight limit set by Strength** (Ultima Online).

## D123 — Coins are an item (2026-11-14)
Decision:
- **Money is a stack of coins in a pack slot,** like any other item.
- **On death the coins stay on the corpse** and anyone can loot them (D3). A rich character is worth killing.

Why: Michael chose it on 2026-11-14. Everything a character owns is world loot (D2, D3); money is no exception.

Rejected:
- **Money as a number beside the inventory:** a special case, and it needs its own rule on death.
- **No coins, item-for-item barter:** makes buying a house awkward (D36).

## D124 — Inventory numbers to start (2026-11-14)
Decision (for now):
- **12 pack slots** with no backpack. **A backpack adds 8.**
- **Coins stack in one slot with no limit. So do arrows.**
- **Worn items don't use pack slots.**
- All stored as settings.
- Every backpack adds the same amount to start. Different backpacks adding different amounts is a candidate for later.

Why: Michael agreed on 2026-11-14. 12 is enough for a weapon swap, some loot and coins, and small enough that a backpack matters.

## D125 — The character sheet shows your own stats and skills as exact numbers (2026-11-14)
Decision:
- **Exact numbers** for your own character: "Strength 14, Swords 37".
- **Only your own.** Other people's true stats stay hidden (D21, D28).

Why: Michael chose it on 2026-11-14. Watching a skill number go up is much of the fun in RuneScape and Ultima Online (D16).

Rejected:
- **Words only** ("strong, a skilled swordsman"): a player can't tell if practice did anything.
- **Words with a bar that fills.**

## D126 — The character sheet shows only what you've been told about your reputation (2026-11-14)
Decision:
- **Blank at first.** The sheet holds nothing about how you are perceived until your character learns it.
- **You ask an NPC** what people say about you (D127). The sheet keeps the answer, with the town and when you heard it.
- Same rule as for everyone else: you know only what your character has learned (D22).

Why: Michael chose it on 2026-11-14. Reputation lives in other people's heads, and towns can know different things about you (D5).

Rejected:
- **The true standing and traits shown live:** it tells you things your character can't know, such as a witness reaching town.
- **No reputation on the sheet at all:** a new player may not understand why a guard attacks them.

## D127 — "Tell me more about this person..." opens a list of the people you know of (2026-11-14)
Decision:
- **A conversation choice:** "Tell me more about this person...".
- **It opens a list** of the people your character knows of (D128). You pick one, and the NPC says what its town knows about them.
- **Asking about yourself** (D126) is the same choice, with you as the person.
- This is how "asking an NPC what its town knows" (D22) works for people.

Why: Michael's idea on 2026-11-14: "we can ask npcs about people we know about ... then a list of choices of people that we know of".

## D128 — The list holds everyone you know of: by name, by face, or by a tale (2026-11-14)
Decision:
- **By name:** "Brannoc".
- **By face, no name:** "the orc in plate you saw at the Dawndoor gate".
- **By a tale only, never seen:** "whoever killed the Dawndoor shopkeeper".
- An entry with no name is shown by a description written from what your character knows.

Why: Michael chose it on 2026-11-14. A name is learned only by being told (D31) and a deed is attached to a face (D30), so a character can know of someone in all three ways. Tales in the list let a character be sent after someone nobody has named (D129).

Rejected:
- **Names only:** you couldn't ask about the stranger who just attacked you.
- **Names and faces only.**

## D129 — Quests are generated from the world, never written in advance (2026-11-14)
Decision:
- **No quest is written in advance.** A quest is a request that an NPC or a faction makes because of the state of the world: what they know about people (D5, D22), how they feel about someone, and what they need.
- **Three kinds to start from** (Michael's examples):
  - A faction's officials or a guild ask for the death of someone very bad for the faction.
  - A person who hates another asks for their death.
  - A shop owner who needs a resource asks someone to fetch it.
- **Timing:** quests still come after the slice (D11). The slice's data (standing, what a town knows, what each NPC remembers) is built so that requests can come from it later.

Why: Michael on 2026-11-14: "My goal is that all this generates quests without us predefining quests."

## D130 — The more private a request, the more you do to hear it (2026-11-14)
Decision:
- **A faction's request is public.** It is on a notice board in town, and guards mention it when spoken to.
- **A shop owner brings their need up themselves** in conversation.
- **A personal request** (someone wants a person dead) is heard only by asking "Do you need anything?", and only if the NPC trusts you: it has your name (D42) and what its town knows of you isn't bad (D22).
- **"Do you need anything?"** is a conversation choice that works on anyone.
- **The notice board** is a new object in each town. It can also show the faction's wanted people by name, face or description (D128).

Why: Michael wanted "a mix of all" three ways of learning of a request (asking, being told, a board) and agreed to this version on 2026-11-14. A bounty is public; a grudge is private and risky to say out loud.

## D131 — Inspect lists what a character wears and holds, by item name (2026-11-14)
Decision:
- **Item names:** inspecting a character lists everything they wear and hold: "iron sword, leather vest, backpack".
- **Never what is inside the pack.**
- **No verdict.** The player judges from the list (D21).
- Name, race, reputation and true stats follow D21, D22, D28 and D29.

Why: Michael chose it on 2026-11-14. Gear is how a stranger is judged; the game gives the facts and leaves the judging to the player.

Rejected:
- **The list plus a line such as "looks stronger than you":** the judgement an NPC makes (D28).
- **A description in words with no item names:** it mostly repeats what is on screen.

## D132 — Items work the Ultima Online way (2026-11-14)
Decision:
- **Ordinary and replaceable.** Two items with the same name are the same: a steel sword is a steel sword.
- **Material makes an item better,** and the material shows as the item's colour (the Creator's parts are grey and tinted, D121).
- **A few fixed magic grades** can come later, to make chests exciting.
- **No level is needed to use anything (D21).** Everything is lootable (D3).
- **An item's name tells how good it is.** Inspect (D131) and judging a stranger by gear (D21) need that.

Why: Michael chose it on 2026-11-14, after asking how Ultima Online handles items. Permadeath and full loot fit items nobody gets attached to.

Rejected:
- **RuneScape's way:** close, but with level requirements and no magic grades.
- **Diablo's way** (random bonuses on each drop): the name doesn't tell the power, and losing a perfect item to permadeath hurts too much.

## D133 — Materials to start: Bronze, Iron, Steel; Cloth, Leather; Wood (2026-11-14)
Decision (for now):
- **Metal weapons, metal armour, shields:** Bronze, Iron, Steel, weakest to strongest. On screen: brown-gold, dark grey, pale blue-grey.
- **Light armour and clothes:** Cloth (any dye), Leather (brown).
- **Clubs, bows, spear shafts:** Wood.
- **The name carries the material:** "bronze sword".
- **Value follows the material (D37).**
- More materials can be added later.

Why: Michael agreed on 2026-11-14. Three metals is enough for a stranger's gear to read at a glance.

## D134 — A character can grow overpowered, and it is hard to get there (2026-11-14)
Decision:
- **Strong enough to need a group:** a character can grow so strong that others have to team up to bring them down. Getting there is hard.
- **Eventually** the ways include enchanting your own items and gaining powerful, rare spells. Not in the slice.
- **Enchanting** is how the later magic grades of D132 can come from a player.
- **Everything such a character carried stays on the corpse (D3).** An NPC can get there too (D4).
- **Not the goal of the game.** Michael: "the goal of each player is not necessarily to be the 'boss'. You do whatever you want, but some people might want to be evil."

Why: Michael on 2026-11-14: "I want players to feel like they can become overpowered in some way that players need to team to take them down. But it's hard to get there. I would say eventually a player could start to enchant its items, gain powerful rare spells, etc."

## D135 — About 5 ordinary characters to bring down one at the top (2026-11-14)
Decision (for now):
- **The gap:** it takes about 5 ordinary characters to bring down one at the top.
- **"Ordinary"** means someone who has played a while with normal gear, not a newborn.
- **Later maybe about 10,** on one condition from Michael: "as long as we can recruit AIs in our party". Recruiting NPCs into a party is therefore wanted, after the slice.
- Every later number (skill caps, enchant strength, spell power) follows from this one.

Why: Michael chose it on 2026-11-14.

Rejected:
- **About 3.**
- **About 10 from the start:** that is most of a server.

## D136 — The land is generated from a seed (2026-11-14)
Replaces the "hand-built" part of D84.

Decision:
- **The game makes the land itself:** terrain, towns and roads.
- **From a seed:** every server gets a different Twinring, and the same seed gives the same world again.
- **The slice's region is generated too.** Read "hand-built" in D11, D34, D107, D108 and D113 as "generated".
- **Still standing:** regions unlocked over time (D84), and the first island being Twinring (D85, D86).
- What stays the same on every seed is in D137.

Why: Michael on 2026-11-14: "My vision is that the world is generated, including the quests, environments, npcs/players (waking), economy, etc." Asked what "environments" meant, he chose "B, with seed".

Rejected:
- **A hand-built map with things appearing on it** (chests and camps, D54, D55).
- **A hand-built Twinring for the slice, with only later islands generated.**

Cost we accept:
- The slice gets bigger: it needs a land generator before anyone can walk around.

## D137 — Whatever the lore describes is the same on every seed (2026-11-14)
Decision:
- **The lore's world stays; the rest is generated.**
- **On every seed:**
  - Twinring is an island in the Long Water with two rings of standing stones (D85, D86, D99, D100).
  - Dawndoor is on the east shore, with its lone doorway facing the water and the sunrise (D108, D113).
  - Oldscar is inland in the west, under a cliff with one long crack (D107, D113).
  - The names, factions and gods are unchanged.
- **The generator treats these as fixed rules** and makes the rest: the island's shape, the town layouts, roads, wilderness.
- Every line in `docs/lore.md` stays true. A new lore fact about a place becomes a rule the generator must follow.

Why: Michael on 2026-11-14: "The world described in the lore stays, the rest is generated".

Rejected:
- **Landmarks that move from seed to seed.**
- **Generated names and lore.**

## D138 — Items wear out and shops repair them (2026-11-14)
Decision:
- **Wear:** items lose condition with use.
- **Repair:** a shop repairs them for coins and material.

Why: Michael chose it on 2026-11-14. It keeps the world needing material: a smith who repairs gear needs metal, which is the kind of need that produces a fetch request (D129).

Rejected:
- **No wear:** gear piles up in the world.
- **Wear with no repair:** items break, which works against slowly growing overpowered (D134).

## D139 — Gear too heavy for your Strength can be equipped but works badly (2026-11-14)
Decision:
- **Heavy gear has a Strength it needs.**
- **Anyone can equip anything,** "Dark Souls like".
- **Below the needed Strength the item works badly.** Proposed: a weapon swings slower and hits less often; armour slows movement and makes dodging worse. The exact penalties are not chosen.
- **The goblin trick of D116 works in play:** a weak character holding a great axe looks dangerous, to an orc above all (D114) and to any NPC judging by gear (D28), and fights badly with it.
- **Loot is never useless** to whoever finds it.

Why: Michael first picked the hard limit, then changed the same minute on 2026-11-14: "Lets try C, dark souls like". With random birth (D3) a hard limit makes found gear useless to a weak newborn.

Rejected:
- **No limit at all:** Strength would only affect damage.
- **A hard limit:** can't equip without the Strength.

## D140 — Skills are capped per skill and in total (2026-11-14)
Decision:
- **Each skill has a maximum, and the total of all skills has a maximum too,** as in Ultima Online.
- **A character can max a few skills, not all.** A character at the top is a specialist with weak spots that a group can use (D135).
- **Nothing is locked (D24).** Proposed: at the total cap, raising a skill lowers the one used least, so a character can change what they are.
- **Two kinds of power:** skills up to the caps are ordinary strength, reached by steady play (faster with Intellect, D19). Being at the top comes from the rare things of D134.
- The numbers are not chosen.

Why: Michael asked for a suggestion and chose it on 2026-11-14. It keeps the gap of D135 bounded and makes a top character someone specific.

Rejected:
- **No cap:** a long-lived character passes the gap of D135 and becomes unkillable.
- **A cap per skill only** (RuneScape): with time every veteran maxes everything and they are all the same.

## D141 — Shops and chests supply items in the slice; crafting by any character comes after (2026-11-14)
Decision:
- **The slice:** shops hold stock that slowly refills, and chests appear with items in them (D54). No crafting.
- **After the slice:** characters make items from materials gathered in the world. Any character can, NPC or player (D4).
- **Crafting skills** then join the skill list and count against the total cap (D140), so a master smith is a weaker fighter.
- **This later stage is the generated economy:** a smith needs metal to make and repair gear (D138), a shortage becomes a fetch request (D129), and a town that loses its smith has scarcer, dearer gear.

Why: Michael agreed on 2026-11-14. The slice already gained a land generator (D136); NPC jobs and crafting were always after it (D11).

## D142 — Looting is instant in the slice; a wait per item comes after (2026-11-14)
Decision:
- **Opening a corpse or a chest shows what is in it.** A corpse holds everything the character wore and carried, coins included (D3, D123).
- **In the slice:** clicking an item moves it to your pack at once. "Take all" moves everything that fits (D124); the rest stays.
- **After the slice:** a wait per item, longer for heavy gear such as armour than for coins, so stripping a corpse in the open is a risk.
- **The wait is a setting from the start,** zero in the slice.

Why: Michael chose it on 2026-11-14: "A + C then B after slice".

Rejected:
- **The wait per item in the slice:** more to build before the slice proves anything.

## D143 — Shops buy through buy orders (2026-11-14)
Decision:
- **A shop buys only what its owner has asked for.** A buy order is an item, how many, and the price for each. Michael's example: "2 bronze sword at 100".
- **Once the count is reached the order closes.**
- **An owner refuses an item by not ordering it.**
- **The shop pays from its own coins.** A shop short of coins can't fill its orders. A player's shop keeps buying while its owner is offline only with the coins left in it.
- **An NPC shopkeeper's orders come from data,** same code (D4).

Why: Michael's idea, 2026-11-14. A player who owns a shop (D36) may not want certain items.

Rejected:
- **Every shop buys anything.**
- **A fixed buy list with no count.**

## D144 — Slice NPC shops: a standing order for every item at about half value (2026-11-14)
Decision ("for now"):
- **Each NPC shop has a standing buy order for every item,** at about half its value (D37), a few of each.
- **The count refills slowly over time,** so nobody can dump a pile of one item at once.
- **The shop's coins come back as it sells stock.** A shop nobody buys from slowly runs out of money for buying.
- The numbers are settings.

Why: Michael agreed on 2026-11-14. It gives the slice a working shop with the buy orders of D143 and no hand-written lists.

## D145 — Shops sell through sell orders (2026-11-14)
Decision:
- **The mirror of D143.** The owner keeps a sell list: which items are for sale and at what price.
- **An item the shop buys goes on sale at once if its kind is on the sell list.** If not, the shop keeps it in its stock room, not for sale.
- **Player owners set their own lists** (D36).
- **An NPC shop's list comes from data.** In the slice: every item at about full value (D37), moved up or down by the buyer's standing with the shop's faction (D9).

Why: Michael's idea, 2026-11-14: "they can auto sell it back or keep it depending on if they configured that item for sale".

## D146 — The map shows only what your character has seen (2026-11-14)
Decision:
- **The map fills in as the character walks.**
- **It is knowledge, so it is lost on death** (D50). Every life explores the generated island again (D136).

Why: Michael chose it on 2026-11-14. He then asked for rewards for exploring: "something that makes some people think hey i'll be an explorer" (D147).

Rejected:
- **The whole island shown from the start.**
- **The map as an item:** kept as the way to share maps (D147).

## D147 — Exploring is a path: drawn maps, first finds, scouting requests (2026-11-14)
Decision (after the slice):
- **Drawn maps:** a Cartography skill copies part of your own map onto a map item. Reading one adds that area to your map. Maps sell to players and shops (D143), worth more for a bigger and fresher area, since chests and camps change (D54).
- **Cartography counts against the total cap** (D140), so an explorer is a specialist. Permadeath keeps maps in demand.
- **First finds:** finding a notable place first (a camp, a ruin) and telling it in a town is a deed that raises Fame (D7) and spreads like any deed (D5).
- **Scouting:** factions ask for it through generated requests (D129).

Why: Michael chose all three on 2026-11-14 ("Yes all 3"). It is cheap to build: the explored area is already stored per character for D146, and a map item carries a copy of it.

## D148 — On death: a summary of the life, then "Wake" (2026-11-14)
Decision:
- **The player sees a summary of the life that ended:** name, race, background, how long it lasted, its deeds, and how it ended as the character saw it ("killed by an orc in steel plate", D128).
- **Then a "Wake" button** reveals the new random birth (D3, D58).

Why: Michael chose it on 2026-11-14. His influence is Dwarf Fortress, where the dead become part of the world's legends: "it tells what legend was created from the person that died".

Rejected:
- **Straight to the new character.**
- **The summary plus watching your own corpse.**

## D149 — The death screen shows what the world really remembers (2026-11-14)
Decision:
- **Legacy, town by town:** "In Dawndoor they say you killed the shopkeeper. In Oldscar nobody has heard of you."
- **It is what each town really knows** (D5), not only what the character had been told (D126). A deed nobody witnessed is not in it.
- **It is the one moment the game shows the truth, and only to the player.** The new life still knows nothing (D50) and has to ask in town about the old one (D127).

Why: Michael, 2026-11-14: "Basically what legacy you left in the world. What the world remembers from you."

Rejected:
- **Only what the character knew.**

## D150 — Chat is local speech in the slice (2026-11-14)
Decision:
- **Local speech only:** the text shows over the speaker's head and in a log for characters nearby.
- **The speaker is shown by name only if your character has it** (D29, D31), otherwise by a description ("an orc in plate", D128).
- **To talk to someone you have to find them.**
- **Later:** a global chat is added beside the local one.

Why: Michael, 2026-11-14: "B but eventually we could have global + local".

Rejected for the slice:
- **A server-wide chat.**
- **Whispers at any distance.**

## D151 — Slice skills: 8, all for fighting (2026-11-14)
Decision ("for now"):
- **Swords, Axes, Maces, Spears, Bows, Unarmed, Shield, Dodge.**
- **After the slice:** magic, stealth, trade, crafting, Cartography (D147).
- The weapon list may shift once the Creator's weapon parts are named.

Why: Michael agreed on 2026-11-14. The slice only needs fighting to prove move, fight, loot, die (D11).

## D152 — Slice backgrounds: 7, each a row of data (2026-11-14)
Decision ("for now"):
- **Soldier** (Swords, Shield), **Hunter** (Bows, Dodge), **Woodcutter** (Axes), **Herder** (Spears), **Labourer** (Maces), **Brawler** (Unarmed, Dodge), **Noble** (Swords, better clothes, more coins). Noble is renamed Well-woken by D158.
- **A background sets starting skills and gear and locks nothing** (D24). The same list for both towns and for NPCs (D4).
- **Starting gear** is wood, cloth, leather or bronze at most (D133).
- **A background is a row of data:** name, starting skills, starting gear, starting coins. No rule in code names one.
- **Later backgrounds are added as rows when their skills arrive:** Thief (stealth), Merchant (trade, more coins), a crafter such as Smith (D141), Acolyte or Sage (magic), Mapmaker (Cartography, D147).
- The starting skill values are D166. The starting gear is not chosen.

Why: Michael, 2026-11-14, after asking what D&D uses for backgrounds: "Just plan so that it will still make sense to add for merchant, stealth, etc." Read as a yes to the 7; he was told this reading and did not object.

Rejected:
- **Guard and Sailor:** they fit the slice already and were offered; not taken.

## D153 — No talents in the slice (2026-11-14)
Decision:
- **Nobody is born with a talent in the slice,** and nothing rolls for one.
- **Every character has a place for a talent in its data from the start,** empty in the slice, so talents arrive later without changing the character or the save (D27).
- **The six talents of D25 stand for after the slice.**

Why: Michael chose it on 2026-11-14 ("A"), on Claude's suggestion. Most talents open things the slice doesn't have: magic, animals, trade, voice.

Rejected:
- **Rolled at birth and shown on the sheet but doing nothing yet.**
- **Mighty and Keen senses working in the slice,** with the other four waiting.

## D154 — Stats are rolled the D&D way (2026-11-14)
Decision:
- **Each of the four stats is rolled on its own:** four six-sided dice, drop the lowest. A stat runs from 3 to 18, about 12 on average.
- **Some lives are luckier than others.**
- **Same roll for NPC newcomers** (D4).
- **Known cost:** nothing stops a player dying on purpose to roll again (D58). The wait before a rebirth named in D58 is the lever if that becomes a problem.

Why: Michael, 2026-11-14: "I'd do similar as dnd for this". Read as D&D's classic dice roll; he was told this reading. It fits the sheet's exact numbers (D125).

Rejected:
- **The same total for everyone, split at random.**
- **A total that varies a little** (Claude's suggestion).
- **D&D's other ways:** a fixed set of numbers, or buying points.

## D155 — Every race gets +2 after the roll (2026-11-14)
Decision:
- **Orc:** +2 Strength. **Goblin:** +2 Intellect.
- **Human:** +1 to two different stats, picked at random for each life. Humans keep no fixed lean (D97) and stay hard to read (D117).
- **A stat can reach 20.**
- **These are the numbers for the leans of D96.** The ranges still overlap, so a clever orc or a strong goblin stays possible.

Why: Michael chose it on 2026-11-14 ("A"), after asking of a version with no human bonus: "Arent humans disadvantaged then?"

Rejected:
- **Humans with no bonus.**
- **A bonus paired with a penalty** (orc +2 Strength and −2 Intellect, goblin the reverse, human nothing): it makes a clever orc rarer.
- **D&D's own +1 to every stat for humans:** too much with four stats.

## D156 — Race odds: half human, a quarter orc, a quarter goblin (2026-11-14)
Decision ("for now"):
- **A player's random birth** is half human, a quarter orc, a quarter goblin, so Dawndoor and Oldscar get about the same number of players (D12, D14).
- **Stored as settings.**
- **An NPC newcomer's race follows its town** as before (D15, D82).

Why: Michael chose it on 2026-11-14 ("B"), on Claude's suggestion.

Rejected:
- **One in three each:** about two players in three would wake in Oldscar.
- **A roll that leans toward the side with fewer living players:** more to build.

## D157 — Background odds are weighted (2026-11-14)
Decision ("for now"):
- **The same weights for every race and town.** Out of 100: Labourer 20, Woodcutter 20, Herder 20, Hunter 20, Soldier 8, Brawler 8, Noble 4 (Well-woken, D158). The weights were told to Michael and not questioned.
- **A weight is one more field on the background's row of data** (D152), so weights by town or race can come later without a rewrite.

Why: Michael chose it on 2026-11-14 ("B"), on Claude's suggestion. The one that wakes with more coins and better clothes should be rare.

Rejected:
- **All 7 equally likely:** one life in seven would be a Noble.
- **Different weights for each town or race now.**

## D158 — A background is what you wake with; Noble becomes Well-woken (2026-11-14)
Decision:
- **A background is not a past.** It is the clothes on you, what you carry and what your hands already know (D70). Nobody remembers earning any of it.
- **The towns name what they see:** someone wakes in a leather vest and handles a sword well, so people call them a soldier. No army ever had them.
- **Noble (D152, D157) is renamed Well-woken:** someone who woke in fine clothes with a full purse. No title, no land, no family (D66), and nobody has their name (D43), so the town owes them nothing.
- **In play it shows only as gear:** strangers judge by it (D21), and a full purse is worth robbing (D123).
- **Why some wake with more is only theory** (D68). The lines are in `docs/lore.md`: humans say Halvar keeps your memory but lets you keep what was yours (D120); orcs say fine cloth proves nothing here, though looks still sway them (D114); goblins say Skerra left coins in your pockets, a good find (D109); One Hand believers say the Hand gives what it gives.

Why: Michael's question, 2026-11-14: "What makes people 'noble'? What this background come from?" He chose "Well woken" over keeping "Noble".

## D159 — Each stat has one clear job (2026-11-14)
Decision:
- **Strength:** melee damage, and what heavy gear needs to be used well (D139).
- **Agility:** the chance to hit and the chance to dodge.
- **Endurance:** health.
- **Intellect:** skills grow faster (D19).
- **Skills (D151) still decide most** of how good a character is with a weapon; stats tilt the result.
- So an orc (+2 Strength, D155) hits harder, and a goblin (+2 Intellect) learns faster: it starts weaker and catches up.

Why: proposed by Claude, agreed by Michael on 2026-11-14. One job per stat is easy to read on the sheet (D125).

## D160 — A stat gives a bonus the D&D way (2026-11-14)
Decision ("for now"):
- **Every 2 points above 10 give +1, and below 10 takes away:** 6 is −2, 8 is −1, 10 is 0, 12 is +1, 14 is +2, 18 is +4, 20 is +5.
- **Each +1 is worth:** Agility, 5% more chance to hit and to dodge; Strength, 1 more melee damage; Endurance, a step more health (the size is not chosen); Intellect, skills grow 10% faster.
- **All settings.**
- So an orc's +2 Strength (D155) is +1 damage on every hit, and an 18 Agility hits and dodges 20% more often than an average character.

Why: proposed by Claude, agreed by Michael on 2026-11-14. It follows the D&D roll of D154.

## D161 — The attack rolls, close to classic Ultima Online (2026-11-14)
Decision ("for now"):
- **Skills run 0 to 100.**
- **One roll to hit:** 50% when the attacker's weapon skill equals the defender's Dodge skill, moved 5% by every 10 points of difference and by each side's Agility bonus (D160), never below 5% or above 95%.
- **A block roll, only if the defender holds a shield:** at half their Shield skill. A block stops all the damage.
- **Damage:** the weapon's damage (by material, D133) plus the Strength bonus, minus armour, at least 1.
- **Skills grow by use** (D19): the weapon skill on attacking, Dodge on being attacked, Shield on blocking.
- **The one difference from UO:** defence is the Dodge skill (D151), where UO uses the defender's weapon skill.

Why: Michael asked how UO and RuneScape do it, then agreed on 2026-11-14 ("We can"). It is the "roll on stats" of D18 with numbers.

## D162 — The player never times a dodge or a block (2026-11-14)
Decision:
- **Dodging and blocking are rolls** (D161): no moving out of the way, no clicking to dodge or block in time.
- **The player can time other things:** healing themselves, triggering a skill, casting a spell.
- **Combat stays as simple as RuneScape or UO.** This sharpens D16 to D18.

Why: Michael, 2026-11-14: "I don't want to react by moving, clicking to dodge or block on time ... You can heal yourself on time, trigger a skill on time / a spell on time".

## D163 — Combat must work with the art already owned (2026-11-14)
Decision:
- **No combat or gear idea that needs new art.** Check each one against `docs/art-check.md` first.
- **D161 needs none:** a hit is an attack animation plus `TakeDamage`; a dodge can use `Slide` or `Rolling`, or just a "miss" over the head; the Creator has 7 shields.
- **A block has no animation,** so it is shown with a reused animation or a flash and a sound (D207: the flash).
- **Not yet checked by eye:** whether one of the Creator's attack animations is a bow shot, what an arrow in flight is drawn with (nothing in the Creator flies to a target; a plain drawn line or a tileset effect would do), and whether the Creator has an attack-while-running animation (D170).

Why: Michael, 2026-11-14: "make sure it works with the assets, I don't want to spend too much on assets".

## D164 — Healing in the slice: slow regeneration and a bandage (2026-11-14)
Decision:
- **Health comes back slowly on its own,** only out of a fight.
- **A bandage item:** the player uses it at the moment they choose (D162), and shops and chests hold it (D141). Its rules are D168 and D169.
- **After the slice:** a Healing skill, as in UO. It counts against the total cap (D140).

Why: Michael chose it on 2026-11-14: "B and C after slice".

Rejected for the slice:
- **Regeneration only.**
- **The Healing skill now.**

## D165 — A fight between two equal newborns lasts about 30 seconds (2026-11-14)
Decision ("for now"):
- **About 30 seconds,** which is 7 to 8 hits to kill. (Kept after playing the test game: D206.)
- **Starting numbers, all settings, to tune:** newborn health about 40; a bronze sword about 5 damage after armour; one swing every 2 seconds; half of them hitting between equals (D161).
- **Candidate for later, from UO:** fast weak weapons against slow heavy ones. Started by D171.

Why: Michael asked how UO and RuneScape do it and what Claude recommends, then agreed on 2026-11-14 ("Yes"). With permadeath (D3) a life should end because of a choice, not three bad rolls; it is about what melee takes in UO and RuneScape; and five on one (D135) lasts long enough to be a battle.

Rejected:
- **About 10 seconds** (2 to 3 hits): luck decides, and a bandage is useless.
- **About a minute:** slow to watch, and nearly everyone escapes.

## D166 — A newborn wakes with 30 in its background's skills and 0 in the rest (2026-11-14)
Decision ("for now"):
- **30 in each of the background's skills, 0 in every other skill** (skills run 0 to 100, D161).
- **Nothing is locked:** the 0s grow by use (D24).
- **Same for NPC newcomers** (D4).
- **The number is a setting** on the background's row of data (D152).
- **Known cost, told to Michael:** a new life starts weak, so dying stings more. Waking protection covers the first minutes (D72).
- **Only Hunter and Brawler wake with Dodge** (D152), so most newborns are hit more than half the time. Health is tuned so a fight still lasts about 30 seconds (D165).

Why: Michael chose it on 2026-11-14 ("A"), on Claude's suggestion. The background matters from the first minute (a Soldier with a sword hits 15% more often than a Woodcutter who picks one up), the road to 100 is long (D134), and a veteran at 80 hits a newborn about 9 times in 10 and is hit about 1 time in 4 (D135).

Rejected:
- **50 in the background's skills** (how UO starts a character): half the road is done at birth.
- **Every skill low and about equal, 10 to 15:** a background would be mostly gear.

## D167 — No timed skills in the slice; the bandage is the only one (2026-11-14)
Decision:
- **The bandage (D164) is the only thing a player triggers at a chosen moment in the slice.**
- **Combat is auto-attack (D17) plus one decision:** fight on, bandage or run.
- **"Use it now, then wait before using it again" is built as a general system,** with the bandage as its first user. Abilities are added later as rows of data, and NPCs use the same system (D4).
- **After the slice:** abilities. The Creator has `Attack1` to `Attack6`, `Special1` and `Kick` to draw them with (D163).

Why: Michael chose it on 2026-11-14 ("A"), on Claude's suggestion. The slice is there to prove the living world (witnesses, reputation, towns reacting), and that needs no abilities.

Rejected for the slice:
- **One ability everyone has:** a kick that interrupts a bandage, or a sprint.
- **One ability per weapon skill.**

## D168 — A hit interrupts a bandage (2026-11-14)
Decision:
- **Bandaging is stopped by any hit taken.** A character has to get away from the fight first and bandage afterwards.
- **A fight is "win or run".** The bandage is for between fights or after an escape.
- **Consequence:** whether a character who runs can still be hit decides how often a bandage gets used. That is D170.

Why: Michael chose it on 2026-11-14 ("A").

Rejected:
- **Hits don't interrupt it, but the character stops attacking while bandaging** (Claude's suggestion).
- **UO's way:** it finishes, but each hit taken makes it heal less.

## D169 — Bandage numbers: 4 seconds, about 15 health (2026-11-14)
Decision ("for now"):
- **A bandage takes 4 seconds standing still.** Moving cancels it.
- **It heals about 15** of a newborn's 40 health (D165).
- **A bandage that is interrupted (D168) or cancelled is not used up:** the character keeps it and loses only the time.
- **Health still comes back slowly on its own out of a fight** (D164); the bandage is the fast way.
- All settings.

Why: proposed by Claude, agreed by Michael on 2026-11-14 ("Yes"). Losing an item to a hit you couldn't prevent would feel unfair.

## D170 — A chaser can hit a runner (2026-11-14)
Changed by D228: running now costs run energy, a walker never catches a runner, and between two runners the one whose bar runs out first loses the chase.
Decision:
- **An attacker next to a character who is running away keeps swinging as normal,** at the same speed and with the same chance to hit (D161). Close to RuneScape and later UO.
- **Everyone moves at the same speed and nobody blocks the way** (D52), so a chaser stays right behind.
- **Running from an equal or stronger enemy doesn't save a character unless help is near** (their own guards, D56). The bandage is mostly for between fights (D168).
- **The decision that matters is made before the fight:** judging a stranger from gear and reputation (D21, D131) and choosing whether to get close.
- **A group can run down a character at the top** (D135).
- **Same rule for NPCs** (D4): a roamer that backs off (D56) can be cut down on its way home.
- **Not checked:** whether the Creator has an attack-while-running animation. If not, the normal attack is reused on the move (D163).

Why: Michael chose it on 2026-11-14 ("B").

Rejected:
- **A swing needs the attacker to stand still:** running would always work, and a top character could walk away from five attackers.
- **A moving character hits half as often** (Claude's suggestion).

## D171 — Four weapon classes set speed and damage in the slice (2026-11-14)
Decision ("for now"):
- **Unarmed:** fast and weak, about 1.5 seconds and 2 damage.
- **One-handed:** the baseline, can hold a shield, 2 seconds and 5.
- **Two-handed:** slow and heavy, no shield, 3 seconds and 8.
- **Bows:** at range, 2.5 seconds and 4.
- **The material moves the damage** (D133). The skill used still follows the weapon's kind (D151).
- **Speed and damage are fields on every weapon's row of data,** so each weapon kind can get its own numbers later, as in UO.
- **Armour takes a fixed amount off each hit** (D161), so heavy hits are better against armour and fast weak ones worse. A big weapon also impresses orcs (D114) and needs Strength (D139).
- Which Creator melee parts are two-handed waits for the parts to be named.

Why: Michael, 2026-11-14: "Start with B, maybe later C".

Rejected for now:
- **Every weapon the same:** a weapon's kind would only decide which skill it uses.
- **Every weapon kind with its own numbers** (UO): the most to balance, and it needs the Creator's parts named first.

## D172 — Starting numbers for materials, armour and health; damage is a range (2026-11-14)
Decision ("for now"):
- **Damage is rolled in a range on every hit,** as in UO and RuneScape.
- **One-handed:** wood 2 to 6, bronze 3 to 7, iron 5 to 9, steel 7 to 11.
- **Two-handed:** wood 3 to 9, bronze 5 to 11, iron 8 to 14, steel 11 to 17.
- **Bow** 2 to 6. **Unarmed** 1 to 3.
- **The averages are the classes of D171** (one-handed bronze 5, two-handed bronze 8, bow 4, unarmed 2). Each material step adds about 40%.
- **Armour takes a fixed amount off every hit,** for a full set: cloth 0, leather 1, bronze 2, iron 3, steel 4. A hit always does at least 1 (D161).
- **Health is 40 plus 4 for each Endurance bonus** (D160), so most newborns have 36 to 52.
- **Health does not grow with play.** A veteran is harder to hit and better armoured, not a bigger health bar. Closest to UO.
- **Two equal newborns still fight for about 30 seconds** (D165, D166).
- **All settings, and expected to change to balance.**

Why: Michael asked how it compares with UO and RuneScape, then, 2026-11-14: "We'll go with what you suggest but keep in mind that we might need to change to balance". The range is taken from both games and softens fixed armour.

Rejected:
- **A fixed damage number:** bronze against steel would always do 1; with the range it does 1 to 3.

## D173 — Two ways to host: a dedicated server, or a game hosted by a player (2026-11-14)
Decision:
- **The same game runs either way:** as a dedicated server (headless, D1), or hosted by a player from the game's menu, "like normal games" (Valheim, Enshrouded).
- **A player-hosted game starts the same server code on the host's machine,** and the host's own character connects to it like any other client. One set of rules.
- **The host sees no more on screen than anyone else** (D22, D29).
- **The world save is the same file in both,** so a world can move from a player's machine to a dedicated server and back.
- This widens D1 ("desktop clients plus a headless Linux server").

Why: Michael, 2026-11-14: "Do you think it's possible to do either dedicated server or hosted by a player like normal games." Claude's answer: yes, Godot does both from one project.

Not decided here:
- Whether hosting from the game's menu is in the slice or right after it (D11 says a headless server and two clients). Claude's assumption, told to Michael: dedicated first, the menu right after, same code.
- How friends reach a game hosted at Michael's home from outside it. His network is behind two routers and its public address changes, so a plain port forward is awkward; a private network tool such as Tailscale, or a relay, are the usual answers (told to Michael, not decided).
- Whether a player-hosted game runs the server inside the game or as a second program beside it.

## D174 — A hosted world stops when the host leaves; a dedicated server always runs (2026-11-14)
Decision:
- **A player-hosted world runs while the host has the game open** and stops when the host leaves: everyone is disconnected and the world is saved (D27).
- **A dedicated server's world always runs,** with or without players.
- **A dedicated server gets a "pause when empty" setting,** off by default (Claude's addition, told to Michael: it costs almost nothing).

Why: Michael, 2026-11-14: "It pauses only when the host left, always run if dedicated run(or however it works normally)".

Rejected:
- **Always pausing when no player is connected** (Claude's pick for the slice).
- **Pausing, then skipping ahead at login.**

Follows from this:
- On a dedicated server the slice's 32 NPCs (D64) run at full detail with nobody near.
- Stopping the world collapsing matters more (settled by D183).

## D175 — The server runs 10 ticks a second (2026-11-14)
Decision ("for now"):
- **The server advances the world 10 times a second:** one tick is 0.1 seconds. Stored as a setting.
- **Each tick** it moves characters, rolls attacks, runs the NPC brains and sends each client what changed.
- **Clients draw at their own frame rate** and slide characters smoothly between two ticks.
- **Every slice timing is a whole number of ticks:** swings are 15, 20, 25 and 30 ticks (D171) and a bandage is 40 (D169).
- **Timings stay written in seconds in the data** and are turned into ticks when loaded, so changing the rate doesn't change the game (Claude's addition).
- Whether an NPC thinks on every tick is settled by D181.

Why: Michael first asked "You mean like how many updates to the server every second?" (yes), then chose on 2026-11-14 ("B").

Rejected:
- **RuneScape's 0.6 seconds a tick:** the lightest, but movement looks steppy and the 2 and 2.5 second swings don't fit the beat.
- **20 to 30 ticks a second:** not needed with no timed dodging (D162), and it cuts how many NPCs the server can run (D6).

## D176 — A client is told only what its character sees and knows (2026-11-14)
Decision:
- **The server sends each client** the characters and things its character has in sight (D179), a name only if the character has it (D29, D31), and never true stats or what is in a pack (D21, D131).
- **The client can't show what it was never sent,** so nothing hidden can be read out of a client. It is also the least data to send.
- **Everything a character knows lives on the server:** names, faces, tales, the map (D128, D146).

Why: Michael chose it on 2026-11-14 ("A").

Rejected:
- **Sending everything nearby and letting the client hide it:** a memory tool would show names and stats.
- **Sending the whole world to everyone.**

Cost we accept:
- On a player-hosted game the host's machine holds the whole world, so the host could still peek (told to Michael). A dedicated server has no such gap (D173).

## D177 — The game and the server run on Windows, macOS and Linux (2026-11-14)
Decision:
- **Both the game and the server run on all three.** Godot builds each from the one project, and the server runs headless on any of them.
- This widens D1's "headless Linux server".

Why: Michael, 2026-11-14: "Also will it run on linux / mac / windows?"

Cost we accept:
- A Mac build that isn't signed with a paid Apple developer account makes each Mac friend approve the app once in their security settings (told to Michael).

## D178 — The server must run comfortably on Michael's own PCs (2026-11-14)
Decision:
- **The server has to run comfortably on one of his two desktops with a few players.**
- **Desktop 1** is a Ryzen 7 2700 with 16 GB. **Desktop 2** is a Ryzen 5 7600 with 32 GB.
- **The early measurement (D6) is run on his machines,** and the NPC budget is set from the slower one, so the game is sized to the hardware he has.

Why: Michael, 2026-11-14: "just make sure my PC#1 or 2 is fast enough to run the server with few people".

Claude's estimate, not measured: both are far above what the slice needs (32 NPCs and a few players at 10 ticks a second, D64, D175). The server's work is mostly on one core, so desktop 2 is the faster host.

## D179 — In sight: within a set distance, with no wall in between (2026-11-14)
Decision:
- **A character sees what is within a set distance with no wall in between,** worked out on the tile grid.
- **Which way the character faces doesn't count.**
- **This one rule decides three things:** what a client is sent (D176), who witnesses a deed (D5), and what an NPC notices (D4, D28).
- So a deed indoors has no witness outside (D45), and a client outside a building is not sent who is inside.
- **The distance is a setting.** Claude's starting point, told to Michael: a little past the edge of the screen, so nobody pops into view on screen.

Why: Claude's pick, taken by Michael on 2026-11-14 ("Your pick").

Rejected:
- **Distance only:** someone outside a house would witness a murder inside it.
- **Adding facing:** nobody sees behind their back. A candidate for when stealth arrives.

Not decided here:
- The distance. The first measurement uses 16 tiles as a stand-in (D184).
- What blocks the view besides walls (closed doors, trees, the cliff).

## D180 — The server's world is plain data (2026-11-14)
Decision:
- **On the server, tiles, characters and items are data and rules in GDScript:** no scene nodes and no physics.
- **Walking uses Godot's grid pathfinding class,** which needs no nodes.
- **Only the client has sprites and scenes,** and it draws what the server sends (D176).

Why:
- More NPCs per tick (D6, D178).
- Saving is writing the data out (D27).
- Every rule can be tested with GUT without a window (D1).
- The coarse and abstract levels are the same data stepped less often (D6).
- The same code runs in a dedicated server or inside a host's game (D173).
- Michael, 2026-11-14: "If you think A scales well yes". Claude's answer: it scales better than nodes.

Rejected:
- **Godot nodes on the server too** (a body and a navigation agent per character): quicker to start, heavier per NPC, harder to save, test and scale down.

Limits, told to Michael:
- The ceiling is GDScript's own speed, which the measurement gives (D6).
- The levers past it: the levels of detail, NPCs that don't think on every tick, and moving a hot rule to faster code later, which plain data makes easy. That last one would change D1's "GDScript only", so it is a new decision if ever needed.

## D181 — The NPC brain: needs and scores (2026-11-14)
Decision:
- **Each NPC has a few needs:** stay alive, do its duty, get richer or stronger, settle a grudge.
- **About once a second it scores a short list of possible actions** against those needs and does the best one. Between two thoughts it keeps doing what it chose (walking, swinging) on every tick (D175).
- **A role is a row of data that weights the needs** (guard, shopkeeper, roamer, townsperson), so changing role (D47, D57) or adding a job later is data, not code.
- **An NPC that sees loot and takes it falls out of the scoring** (Vision), and an unmet need is where a generated request comes from later (D129).
- **The brain reads only what the NPC knows and sees** (D28, D179), never true stats.
- **NPCs take turns thinking, spread across the ticks,** so the cost per tick stays flat (D6, D178).
- Still rule-based AI, as D6 says.

Why: Michael chose it on 2026-11-14 ("B").

Rejected:
- **A fixed script per role:** the simplest, but every new role or job is new code and NPCs of one role behave alike.
- **A planner that works out several steps ahead:** the most lifelike, costly per NPC, hard to debug.

Not decided here:
- The slice's action list. Claude's proposal, not shown to Michael one by one: stand at a post, wander, serve the shop, talk, fight, back off (D56), run to the guards and tell (D5, D28), pick up loot, use a bandage.
- The needs' numbers.

## D182 — The world is saved as snapshot files (2026-11-14)
Decision:
- **A world is one folder with two files.**
- **The land** is generated once from the seed when the world is created, and saved. A later change to the generator never moves the ground under a world in play.
- **The living state** (characters, players' included, items, what each town knows) is written whole at an interval and on shutdown (D27).
- **Safe writes:** the new file is written beside the old one and swapped in, so a crash can't leave half a file. The last few are kept as backups, and each has a version number.
- **Starting numbers** (Claude's, all settings): every 2 minutes, 10 backups kept.
- **Copying the folder moves a world** between a player's machine and a dedicated server (D173).
- **The seed is random by default** and the host can type one.
- **Characters live in the world file,** not on the player's PC (D3, D176). Unlike Enshrouded.
- The format inside the files is left to the build.
- This settles "files or SQLite" (D1) and "saved, or rebuilt from the seed" (D27, D136).

Why: Michael, 2026-11-14: "Whatever is your recommendation". He asked how Enshrouded, UO, RuneScape and V Rising do it: V Rising and Enshrouded keep whole-world save files with autosaves; UO wrote the whole shard to disk in a "world save" (from Claude's memory); RuneScape keeps accounts in databases and doesn't save its world (from Claude's memory).

Rejected:
- **A SQLite database:** needs an add-on outside GDScript (D1).
- **The seed plus a list of changes:** a new game version could generate a different land.

Cost we accept, told to Michael:
- A crash loses the time since the last save, which can undo a death.
- A large save can make the server stutter (V Rising hosts report it). The write can move off the main loop if it shows.

## D183 — Soft guard rails keep the world from collapsing (2026-11-14)
Decision:
- **The world corrects itself quietly and nothing is forbidden.**
- **Loot nobody takes disappears after a while,** out of sight of any player, like an empty chest (D61): items on the ground, and bodies with what is on them.
- **A town low on people gets its newcomers faster** (D15, D63).
- **Nothing stops an NPC growing strong** (Vision, D134). The skill caps (D140) are the only ceiling.
- **A fast-forward test:** run the world headless at many times real speed for several game days and check that town populations, the number of items and the strongest character stay inside limits. Cheap because the world is plain data (D180).
- **The server logs those numbers** now and then.

Why: every dead character leaves its gear and every newcomer wakes with new gear, so items would pile up for ever on a server that always runs (D174). Michael chose it on 2026-11-14 ("B").

Rejected:
- **No extra rules:** a town can stay crushed and the save grows for ever.
- **Hard limits** (a cap on NPC power, towns that can't fall): safe, but it kills the living world.

Not decided here:
- How long loot and a body stay. A body has to stay long enough to be found (D5).
- How much faster newcomers come.
- The limits the fast-forward test checks.

## D184 — The first measurement, and how the NPC budget is read from it (2026-11-14)
Changed by D186: the map's blocked tiles come in clumps, town density is fixed, and the counts go up to 8000.

Decision ("for now"):
- **What is measured:** the plain-data world (D180) run headless, with stand-in NPCs that think about once a second in turns (D181), wander by path-finding, and work out who they have in sight (D179). Those are the likely costs. No combat yet.
- **The test map:** 512 by 512 tiles with about 15% blocked by scattered walls and rocks, made from a fixed seed inside the measurement. It is not the land generator (D136).
- **Half the NPCs are packed into two "towns"** and the rest are spread out, so sight checks are as dense as in play.
- **Sight distance in the measurement:** 16 tiles, a stand-in until the client shows what a screen holds (D179).
- **What it prints:** one line per NPC count (32, 100, 250, 500, 1000, 2000) with the average tick and the worst tick in milliseconds, over one game minute after a warm-up. Then the budget.
- **The NPC budget is the largest count whose worst tick stays under 20 ms on the slower PC** (D178): a fifth of the 100 ms tick (D175). The rest is kept for what isn't built yet: combat, sending to clients, saving.
- **Same seed, same work:** every PC runs exactly the same world, so the numbers compare.
- **Run it when nothing heavy is going** on the PC (no other build, no stream, no game), or the tick times come out worse than they are.
- **Both PCs:** desktop 1 from the repo; desktop 2 by hand on Windows, which also proves the server runs there (D177). (Desktop 1 measured, budget in D217; desktop 2 deferred until a client runs there.)
- The 20 ms is a setting. The budget is measured again as real rules arrive; it will go down.

Why: Michael left the technical calls to Claude on 2026-11-14 ("Go whatever makes the most sense"). The budget is for NPCs at full detail (D6); the coarse and abstract levels come later and cost less.

Rejected:
- **Reading the average tick:** a world that stutters once a second still has a fine average.
- **Letting a tick use the whole 100 ms:** nothing would be left for the rules that aren't built yet.
- **Desktop 1 only for now:** desktop 2 is the likelier host, and a Windows run is cheapest to fix while there is almost no code.

## D185 — Walk speed: one tile every 3 ticks (2026-11-14)
Decision ("for now"):
- **A character walks one tile every 3 ticks:** 0.3 seconds a tile, about 3.3 tiles a second (D175). Written in seconds in the data, like every timing.
- **Everyone walks at the same speed** (D170).
- **A diagonal step takes the same time as a straight one.** A diagonal step between two blocked tiles is not allowed (no cutting corners). Claude's call, not shown to Michael. (Corner rule replaced by D204: both side tiles free. Speed kept after playing: D205.)
- **With D34's about 2 minutes' walk between the towns,** Dawndoor and Oldscar are about 400 tiles apart.
- A setting, to tune once the client shows it.

Why: the movement task needs a number before anyone can see a character walk. Michael left the technical calls to Claude on 2026-11-14.

Not decided here:
- Whether heavy armour slows a walker, and whether anything is ever faster than walking (a mount, a sprint, D167).

## D186 — The first measurement, corrected after a probe (2026-11-14)
Decision ("for now"; changes three points of D184, the rest of D184 stands):
- **Blocked tiles come in clumps,** not single scattered tiles: rectangles 3 to 9 tiles a side, stand-ins for buildings and rocks, until about 15% of the map is blocked. Scattered single tiles hide almost everyone from everyone, which makes sight look cheaper than it is.
- **Town density is fixed, not town size:** inside the two towns there is one NPC per 100 tiles (16 NPCs in a 40 by 40 town, D64), and the town's area grows with the count. A quarter of the NPCs are in each town and half are spread over the map.
- **Counts go up to 8000:** 32, 100, 250, 500, 1000, 2000, 4000, 8000, so the run finds where the worst tick crosses 20 ms instead of ending under it.
- **Each line also prints the state hash,** so the outputs of two PCs can be compared.

Why: Michael asked "Are you sure we're done planning?" on 2026-11-14, so Claude ran a throwaway probe instead of answering from the plan. Godot 4.7.2 headless, plain GDScript arrays, the stand-in NPCs of D184, in Claude's cloud sandbox (a 2.1 GHz Xeon; not compared with Michael's PCs).
- With clumps and the check of D187: 1000 NPCs averaged about 2.5 ms a tick (worst 4 to 8 ms), and 2000 about 7 ms (worst about 12 ms). The list of D184 stopped at 2000 and never reached 20 ms.
- With scattered tiles each NPC had 0 to 2 others in sight; with clumps about 7 at 2000 NPCs.

Not a result:
- The probe is not the measurement, and it was not kept in the repo. The stand-in NPCs do far less than real ones will, so the real budget will be lower.

## D187 — A path search never floods the map (2026-11-14)
Decision:
- **Areas are labelled when the map is made:** every free tile gets the number of the connected area it is in. Two tiles with different numbers can't reach each other.
- **A walk to a tile in another area is refused at once, with no search.** Same for a blocked target.
- **The labels are redone when a tile changes** between blocked and free. Nothing changes the map in wave 1.
- **Same for every character** (D4): an NPC's wander and a player's click (D16).
- Characters are not obstacles (D52), so they never change the labels.

Why: in the probe of D186, one search for a target that can't be reached visited the whole 512 by 512 map and took 50 to 85 ms, most of a tick (D175), whatever the NPC count. With D184's rule (the worst tick) the budget would have read zero. With the check, the worst single search in the same runs was about 2 ms. A player clicking an enclosed spot would stall the server the same way.

Not decided here:
- **Long walks.** In the probe a search across about 400 tiles (town to town, D185) took about 10 ms on average and up to 21 ms; 100 tiles took about 1 ms. Candidates for when characters walk far (roamers, players crossing the island): a limit on searches per tick with the rest waiting a tick, or walking in legs along roads. Wave 1's NPCs wander within 20 tiles, so it doesn't come up yet. (Decided in D192.)

## D188 — What a tile holds (2026-11-14)
Decision:
- **Ground kind:** grass, road, sand, water and so on. Roads are a ground kind, used by D62 (chests off the roads) and by long walks (D192).
- **Blocks walking and blocks sight are two separate flags.** A fence can block walking and not sight; a tree blocks both (D190). (Changed by D203: walls and doors sit on the edges between tiles, with the same two flags; whole-tile blockers stay on tiles.)
- **A place, or none:** the building or room the tile belongs to. A place is a record: its kind (shop, home, guard post), its town and its owner. Indoors and "whose place" (D35) come from the tile's place, never from a tag on items.
- **The area number** of D187.

Why: the open question of what a tile holds would force a rework of the world task (SIM-002) if answered late. Claude's call, told to Michael on 2026-11-14 and not questioned.

## D189 — How a town is built: hand-made buildings, generated layout (2026-11-14)
Decision:
- **A small set of buildings** (houses, shops, a guard post) is drawn once by hand from tileset pieces.
- **The generator places them** along roads around the town's ring, so every seed gives a different town from the same buildings (D136).
- **The lore landmarks are fixed pieces too:** Dawndoor's doorway, Oldscar's cliff with its crack, the two rings (D107, D108, D137).
- More buildings are added later as data.

Why: the cheapest way to towns that look good. Chosen by Michael on 2026-11-14 ("A").

Rejected:
- Fully generated walls and rooms: much more work, and buildings often come out odd-looking.
- A few whole hand-made towns: the same Dawndoor on every seed, against D136.

## D190 — What blocks sight (2026-11-14)
Decision:
- **Walls, closed doors (D191), cliffs, big rocks and trees block sight.** Bushes and tall grass don't.
- **"Blocks sight" is a flag on each tileset piece** (a wall's or a door's flags go on its edge, D203), so any piece can move between groups later; bushes may block once stealth exists.

Why: forests and broken ground become places where an ambush or a robbery can go unseen (D5, D45), while roads and town squares stay open. Chosen by Michael on 2026-11-14 ("B").

Rejected:
- Walls and closed doors only: almost nothing outdoors could happen unseen.
- Bushes and tall grass too: hiding spots mostly matter with a stealth skill, after the slice.

Not decided here:
- The sight distance (16 tiles is still a stand-in, D179).

## D191 — Doors (2026-11-14)
Decision:
- **In the slice any character can open and close any door.** A closed door blocks sight (D190) but never blocks a walk, so it doesn't split areas (D187). A robbery behind a shut door goes unseen unless someone opens it.
- **Locks come after the slice:** a lock is a field on the place (D188) that refuses characters without the owner's key. Lock-picking waits for stealth.
- **Art:** the tileset has doors in 4 rotations. Whether it has an open state was not recorded by the art check; if not, an open door is drawn as an empty doorway (the door piece isn't drawn). (It has none: D209. A door is an edge: D203.) Nothing to buy (D163). Keys need an item icon, which every item lacks today. Checked in the test game (D201).

Why: chosen by Michael on 2026-11-14 ("B + C later"), after asking whether the art allows it.

Rejected:
- No doors: nothing indoors would ever be private.

## D192 — Long walks go in legs along the roads (2026-11-14)
Decision:
- **A long trip** (across the island, town to town) **is walked in legs along the roads.** The generator stores the road network as a small graph, and a path search runs for one leg at a time.
- **The server caps the number of path searches per tick** and queues the rest; a wait of a tick or two is invisible.

Why: answers the open question of D187 (one search across about 400 tiles took 10 to 21 ms in the probe). Claude's call; Michael leaves technical calls to Claude.

## D193 — Two kinds of memory: the town's and the NPC's own (2026-11-14)
Decision:
- **Each town keeps what it knows:** deeds, names, reputation (D5, D44). Every NPC of the town answers from it.
- **Each NPC also keeps a small personal memory** of what happened to it and near it: who hurt it, who helped it, faces it saw, what it was told.
- **Personal memory is capped and fades,** and dies with the NPC (D50). The town's stays.
- **A witness carries a deed in its personal memory until it reaches town** (D5).
- Personal memory is what lets a personal request (one NPC wants another dead, D129) come out of the world.

Why: chosen by Michael on 2026-11-14 ("B").

Rejected:
- Town knowledge only: no grudges, so no personal requests.
- Personal memory only, with news spread by NPCs talking: the richest, and the heaviest to run and save.

Not decided here:
- The caps and the fade rate (settings).

## D194 — What a town knows is a list of tales (2026-11-14)
Decision:
- **Stored as tales:** who did what, to whom, where, when, and who told it. Not one score per person.
- **Standing and traits are worked out from the tales.**

Why: one structure gives "whoever killed the shopkeeper" (D128), the legacy screen (D149), quests (D129) and fading (D5). Claude's call, told to Michael.

## D195 — Tales are true (2026-11-14)
Decision ("for now"):
- **A tale is only what a witness really saw.** It can be out of date or incomplete, never false.
- **Honest mistakes and lies are candidates for later:** blaming the wrong look-alike (D30), misreading who struck first (D32), slander, framing, an NPC with a grudge (D193) lying. The tale already records who told it, so they need no change of structure.

Why: simplest, and easiest to test. Suggested by Claude; Michael, 2026-11-14: "I'll go with your pick".

## D196 — Personal memory comes first (2026-11-14)
Decision:
- **When an NPC's own memory and its town's tales disagree, the NPC acts on its own.** A shopkeeper you robbed in secret distrusts you even if the town calls you a hero; someone you saved trusts you even if the town calls you a murderer.
- **For anyone it has no memory of, it goes by the town** (D28).

Why: Claude's call, told to Michael.

## D197 — A hosted game runs the server as a second program (2026-11-14)
Decision:
- **"Host game" starts the same game headless, as a second process** on the host's machine, then connects to it like any client (D173).
- **The host leaving saves and stops the server process** (D174).

Why: the same code path as a dedicated server; the server never competes with the host's drawing for time; a client crash doesn't take the world down. Cost: a few seconds to start and a little more memory. Claude's call, told to Michael.

Rejected:
- The server running inside the game's own process.

## D198 — "Host game" comes right after the slice (2026-11-14)
Decision:
- **The slice stays a dedicated server and two clients** (D11). The menu's "Host game" is the first thing after it, on the same code (D197).

Why: keeps the slice from growing. Suggested by Claude; Michael, 2026-11-14: "your pick".

## D199 — Home network first, port forwarding later (2026-11-14)
Decision:
- **Michael plays on his home network only, with his son, to start.**
- **If it works well, friends from outside connect through port forwarding.**
- Nothing in the game changes either way: a client is given an address.

Why: Michael, 2026-11-14: "on my local only (with my son) ... eventually if it works well, then port forwarding".

Known risk, told to Michael: his network is behind two routers and its public address changes, so forwarding needs both routers set and a dynamic address name, and fails if the provider shares one public address between customers. Fallbacks: Tailscale (free Personal plan up to 6 users since April 2026; a machine can be shared to friends' own free accounts) or a rented server.

## D200 — Claude Code works with a Godot 4.7 skill (2026-11-14)
Decision:
- **A published Godot 4.7 skill is installed for Claude Code,** because 4.7 is newer than what Claude knows well. Which one: D202.

Why: Michael's idea, 2026-11-14: "we can get a skill for that", and he wanted an existing one found online rather than one written from scratch.

## D201 — A throwaway test game before the real build (2026-11-14)
Decision:
- **Before wave 1 and the real build, a quick test game** in its own `prototype/` folder, deleted afterwards. Its code follows none of `game/sim/`'s rules.
- **Look:** a small generated patch with one building and a door that opens; one stacked, tinted Creator character walking in 8 directions, plus an orc and a goblin at their scales (D121); drawing order behind walls and trees; how a block looks.
- **Feel:** click to move and auto-attack against one dummy NPC. Is 3.3 tiles a second right (D185)? Does a 30-second fight work (D165)?
- **Out:** network, saving, tales, memory.
- **It unpacks only the art it uses** from `~/Downloads/Assets`.
- **Lessons come back as decisions,** then wave 1 and the real build.

Why: Michael, 2026-11-14: "start a 'test game' to see if it makes sense (before really starting the real development)". Claude's honest view the same evening: the biggest risk is 199 decisions and nothing on screen. Chosen by Michael ("A").

Rejected:
- Making the test game the start of the real game: slower, and nothing learned sooner.

## D202 — Which Godot skill: xlanstar/godot-skills (2026-11-14)
Decision:
- **`xlanstar/godot-skills` v0.2.0** (commit 65f8d8b, last change 2026-09-02), installed as a Claude Code plugin with project scope, the way its author ships it:
  `claude plugin marketplace add xlanstar/godot-skills` then `claude plugin install godot-skills@godot-skills --scope project`.
- **What we use from it:** `godot-gdscript` (static typing, 4.5's abstract and variadic functions, callback order), `godot-docs-lookup` (check a signature against the official 4.7 docs instead of memory), `godot-tilemap-2d` (TileMapLayer, isometric neighbours, Y-sorting), `godot-input`, `godot-tween`, `godot-ui`. Its 3D skills never come up.

Why: Claude read all three candidates on 2026-11-14. This one is 15 short skills (2 to 5 KB each), no hooks, no MCP server, no code that runs, and what was spot-checked is accurate. Its repo has no licence file, so it is installed as a plugin, not copied into this repo. Claude's call, at Michael's request.

Rejected:
- `thedivergentai/gd-agentic-skills`: one 51 KB hub routing to 92 skills, built around scenes and 3D, LGPL-3.0.
- `vl4dt/godot-skills`: its 4.7 guide reads as made up (a `tween_await()` its own example never uses, Steam settings that don't look real).

## D203 — Walls live on the edges between tiles (2026-11-15)
Decision (changes D188; the rest of D188 stands):
- **A wall sits on the edge between two tiles, not on a whole tile.** Each edge can block walking and block sight, the same two flags as a tile (D188). Each tile stores two of its four edges, so every edge is stored once; the map's outer border needs none (outside the grid is refused).
- **The tiles on both sides of a wall stay free.** A building's floor is its whole footprint, and a character walks right up to the wall. The floor tiles carry the building's place (D188).
- **The tileset already draws walls this way:** a wall piece's 4 rotations are the 4 edges of its tile.
- **Whole-tile blockers stay on tiles:** trees, big rocks, cliffs, water (D102, D190).
- **A door is an edge with a door on it.** Closed, it blocks sight and never walking (D191).
- **Areas (D187):** the labelling never crosses an edge that blocks walking.
- **Sight (D179, D190):** a line between two characters is blocked by any edge it crosses that blocks sight, as well as by tiles. A line that passes exactly through a tile corner is blocked only when both ways around that corner are blocked, so an L-shaped wall corner hides and the free end of a wall doesn't.
- **Path search:** Godot's `AStarGrid2D` can only make whole tiles solid. Before writing a search by hand, SIM-004 tries both of these on the same tests and the same map, and keeps the fastest that passes every test:
  - **`AStar2D`:** one point per free tile, linked to its 8 neighbours, with the link removed wherever an edge blocks walking or D204 forbids the diagonal.
  - **`AStarGrid2D` at double resolution:** tiles on the even cells, edges and corners on the cells between; a walled edge or a blocked tile is a solid cell, and a corner cell is solid where D204 forbids crossing it. The path is turned back into tile steps.
  - Measured on the D186 map: the average and worst time of a search across about 100 and about 400 tiles, and the time to build the map and to change one edge. Both need no nodes (D180).
  - **A search written by hand only if neither passes the tests,** or neither stays near the probe's numbers (D186, D187). The numbers and the pick go in SIM-004's report and back into this decision.
- **Picked by SIM-004 (2026-11-15): `AStar2D`, as `SimPathing` (`game/sim/pathing.gd`).** Both passed every test. Timed by `tools/pathing_compare.gd` on the 512 by 512 map of walled clumps, 20 searches a distance, on desktop 1 (Ryzen 7 2700), `SimPathing` itself with its area labels:

  | | `AStar2D` (`SimPathing`) | `AStarGrid2D`, double resolution |
  |---|---|---|
  | Build the map | 18.9 s | 8.2 s |
  | A wall up or down | 4.7 s (the whole map labelled again) | 0.04 ms |
  | Open or close a door | 0.6 ms (no relabel) | 0.03 ms |
  | Search, about 100 tiles: average, worst | 1.0 ms, 1.5 ms | 11 ms, 19 ms |
  | Search, about 400 tiles: average, worst | 18 ms, 28 ms | 190 ms, 257 ms |

  - **Against the probe (D186, D187):** about 100 tiles is the same (about 1 ms); about 400 tiles is about twice as slow (10 to 21 ms then). Long walks go in legs with a cap on searches per tick (D192), so a 400-tile search shouldn't happen in one tick.
  - **The areas are labelled again only when a straight link changes;** a door changes only diagonals, so it never relabels (D191).

Why: in the test game (D201) whole-tile walls left the 5 by 4 building a 3 by 2 walkable middle, and a character stopped a full tile short of every wall. Michael: the building is too cramped. Claude proposed edges; Michael chose it on 2026-11-15 ("Yes, walls on tile edges") and asked for the two ready-made searches to be compared first.

Rejected:
- **Walls on whole tiles (D188 as written):** cramped rooms, and a wall reads as a tile thick.
- **Shrinking the wall art onto the tile:** the art can't be redrawn (D163).

Cost we accept:
- A search on edges may be slower than the `AStarGrid2D` the probe timed (D186). SIM-004 measures by how much. (Measured above: twice as slow across about 400 tiles.)
- **Putting a wall up or taking one down takes about 4.7 s** on a 512 by 512 map, because the whole map is labelled again (D187), and building the map about 19 s. Nothing changes walls in the slice so far; before anything does (building, breaking a wall), the labels need a cheaper update.

## D204 — A diagonal step needs both side tiles free (2026-11-15)
Decision (replaces D185's corner rule; the rest of D185 stands):
- **A diagonal step is allowed only when both tiles beside it are free** (the stricter of the two rules the test game tried), **and none of the four edges meeting at the corner it crosses blocks walking.** No cutting the corner of a tree, a rock or a wall, and no slipping round the end of a wall.
- **A door edge counts as blocking here:** a character goes through a door straight, never diagonally.
- Same for every character (D4).

Why: Michael played both rules in the test game (key G) and left the pick to Claude on 2026-11-15 ("your pick"). The stricter one looks right on screen: with the looser one a character's sprite clips the corner it passes.

Rejected:
- **D185's "not between two blocked tiles":** a step past a single blocked tile cuts its corner.

## D205 — Walk speed and race sizes kept after playing (2026-11-15)
Decision ("for now", all settings):
- **Walk speed stays at 0.30 seconds a tile** (D185). Michael: "the default walkspeed is good".
- **Race sizes (closes D121's "not chosen"):** the human's sprite at 2.5 times (about 1.8 tiles tall, about a door's height), the orc at 1.4 wide by 1.2 tall, the goblin at 0.75. Michael: "all good by default, 75% for goblin".
- **A grid step takes the same time in every direction,** so on a 2:1 isometric screen a walk east or west looks about twice as fast as north or south. Kept: nobody noticed it in play.
- **The walk animation's speed follows the direction** so the feet don't slide: about 30 frames a second on the screen diagonals, 40 north or south, 52 east or west at 3.3 tiles a second (computed from the sheets in the test game). One setting per direction group.

Why: Michael played the test game on his Mac on 2026-11-15 and kept the defaults.

## D206 — Fight numbers kept after playing (2026-11-15)
Decision ("for now"):
- **D165's numbers stay:** health 40, damage 5, half the swings hit, a swing every 2 seconds. Michael: "the fight is good for now".
- **Measured in the test game:** 20 fights averaged 28.9 seconds and 1000 fights about 26.3 seconds. Eight hits kill, and the first side to land them wins. Under "about 30 seconds", and kept.

Why: Michael played it on 2026-11-15.

Not decided here:
- **Two killing blows landing in the same tick.** The test game kept them apart by having the dummy swing 1 second after the human, which a real fight won't do. Open for the combat task.

## D207 — A block is a white flash and a sound (2026-11-15)
Decision ("for now"; closes the open point in D163 and D121's cost):
- **A blocked swing shows as a short white flash on the defender, with a sound,** candidate 3 of the five in the test game. No animation.
- **Sounds are made in code** (thud, clank, whoosh) until real sound files are picked; no sound files are bought for it (D163).

Why: Michael watched all five candidates on 2026-11-15 and chose this one "for now".

Rejected:
- **CrouchIdle, Special1, Taunt:** reused animations that don't read as a block.
- **The first frames of TakeDamage:** read as a lunge or a lean.

## D208 — You see inside the building your character is in (2026-11-15)
Decision:
- **When your own character stands on a tile with a building's place (D188), that building's roof is hidden and the walls on the near side (toward the camera) fade,** so you see the room. Outside, every building looks whole.
- **Drawing only, on your own screen.** It changes nothing about who can see whom (D190) and nothing the server sends (D176).
- It also fixes the odd look the test game found: the wall piece in front hid the lower half of a character in the doorway.

Why: Michael, 2026-11-15, "influenced by many games", and he confirmed the rule ("yes").

## D209 — An open door is drawn as an empty doorway (2026-11-15) (changed by D230)
Decision (answers D191's art question):
- **The tileset has no open-door piece and no wall-with-doorway piece,** checked in the test game. A closed door is the door piece on its edge (D203); an open door draws nothing there.
- Nothing to buy (D163).

Why: seen in the test game (D201), 2026-11-14; Michael raised nothing about it after playing on 2026-11-15.

## D210 — The measurement on Michael's two PCs is skipped (2026-11-15)
Changed by D217: the budget is read from the implementer's run on desktop 1, 500 NPCs; the numbers are in D217.

Decision:
- **Michael does not run SIM-007's UAT** (`scripts/measure.sh` on desktop 1, the Windows steps on desktop 2). He said so in a Claude Code session, and again in the planning chat on 2026-11-15: "I said we'd skip this already in another session because I was satisfied with the results already."
- **D64's 32 NPCs stand for the slice.** No NPC budget is read from his PCs for now (D184); `scripts/measure.sh` stays in the repo for the day a number is needed.

Why: Michael's call.

Not known:
- **The numbers he saw and where they were run.** They are not in the repo.
- **Whether the server runs on Windows (D177).** The Windows run would have been the first proof; it waits for the first Windows player or host.

## D211 — The client wave shows two players and the stand-in NPCs (2026-11-15)
Decision:
- **Two game windows connect to one headless server.** Each player gets a character and clicks to walk.
- **Each sees the other only while in sight** (D176, D179).
- **The stand-in NPCs of wave 1 wander on the map** and are sent to clients by the same code as players (D4).

Why: an NPC is the same character as a player, so sending NPCs costs almost nothing more, and it is the first time the world looks alive on screen. Suggested by Claude, chosen by Michael on 2026-11-15 ("C").

Rejected:
- **One client only:** proves drawing and clicking, not multiplayer.
- **Two clients with no NPCs:** an empty map with two people on it.

## D212 — The client wave is tested on Linux and macOS (2026-11-15)
Decision:
- **The server and one game run on desktop 1 (CachyOS, where the code is built); the second game runs on Michael's Mac** over the home network. Both start Godot through `scripts/godot.sh`.
- **No Windows start script in this wave.** It rides with the wave that first needs a Windows player (D177).

Why: Michael, 2026-11-15: "desktop 1 is coding using linux, can we do linux + macos". Two machines over the network is the risky part, and both already run the pinned Godot.

## D213 — Nothing is critical in the client wave (2026-11-15)
Decision:
- **Every task of the client wave is merged after QA,** as in wave 1. Michael's one test is playing it on the two machines (NET-005).

Why: chosen by Michael on 2026-11-15 ("A"). The task that decides what a client is sent matters once names and true stats exist (D176); this wave sends only where characters are and what they look like.

Rejected:
- **Michael merging the "what a client is sent" task himself.** Still a candidate for the wave that adds names or stats.

## D214 — The stand-in world of the client wave (2026-11-15)
Decision ("for now", all numbers are settings):
- **A fixed kind of map made in code from the seed:** 64 by 64 tiles of grass, one 5 by 4 building with walls on its edges and one door (D203), trees and rocks on about 8% of the tiles, one waking spot outside near the door.
- **32 NPCs with the stand-in brain** (D64's number), each with a look.
- **A tile also holds a prop kind** (nothing, a tree, a rock). The prop's "blocks walking" and "blocks sight" flags come from a data table (D190).
- **A look is a race and a part with a colour for each slot worn** (D122's slots). Players and NPCs roll a race with D156's odds; everyone wears the same starting outfit, the parts the test game used. No item, material or stat yet.
- **No roof.** The wall family picked in the test game has none, so D208 shows as the faded near walls only. Roofs come with the hand-drawn buildings of D189.
- **A new player appears on the free tile nearest the waking spot.** D71's rule (only while no player has it in sight) is not applied yet.

Why: the land generator (D136) and random birth (D154 to D157) are waves of their own; the client needs something to stand on and something to draw. Claude's calls. Michael was told the map, the random race with fixed gear and the 32 NPCs, and did not question them.

## D215 — What a client is sent, and what it can ask for (2026-11-15)
Decision ("for now"):
- **At the welcome:** the character's own id, the tick rate, the walk time per tile, and the whole stand-in land (ground, props, walls and doors). Sending land by area waits for the generator and the map (D146).
- **Every tick (10 a second, D175):** each character in sight with its tile, the tile it is stepping onto, its race and its worn parts; and open or closed for each door in sight. Nothing about anything out of sight (D176).
- **The client slides characters from tile to tile** between two ticks. No prediction: your own character moves when the server says so.
- **A client can ask for two things:** walk to a tile, or use a door. An order carries no character id, so it can only move the sender's own character. The server drops anything malformed or too frequent.
- **Doors:** a character uses a door from one of its two tiles, and walks there first when ordered from farther. Walking across a closed door opens it, and it stays open (the test game opened a door the same way). Same for NPCs (D4).
- **Message shapes live in `game/net/`,** plain dictionaries shared by server and client, sent as RPCs over Godot's high-level multiplayer (D1). `game/client/` never names a class from `game/sim/`; it reads the drawing tables in `game/data/`.
- **Connecting:** a screen with an address field, a port field and a Connect button. The port is a setting.
- **Your own screen shows inside the building you are in** (D208) and F3 shows frames a second.

Why: closes the gap in `docs/architecture/layout.md` (how client and server share message shapes). Claude's calls; Michael was told the network shape, the connect screen and the doors, and did not question them.

Not decided here:
- Whether a door can be closed on a character standing in it (nobody blocks a tile, D52).
- How far ahead the client may draw its own character once play is over the internet (D199).

## D216 — Leaving and coming back in the client wave (2026-11-15)
Decision ("for now"):
- **D49 as written:** a leaver's character stays 30 seconds (a setting), then leaves the world. A lost connection counts as leaving.
- **The client keeps a random player id in a local file** and sends it when it connects. The server gives that id its character back: where it stands if it is still there, else on the free tile nearest where it left. `--player=NAME` replaces the id, so two games can run on one machine.
- **Only while the server runs.** There is no saving yet (D182), so a server restart is a new world and a new character.
- A player id that is already connected is refused.

Why: D49 needs a way to tell who came back, and there are no accounts. Claude's calls; Michael was told the 30 seconds and the restart, and did not question them.

Cost we accept:
- Anyone who copies a player id file plays that character. Fine among friends on a home network (D199); a real sign-in is a later decision.

## D217 — The NPC budget: 500 NPCs in full detail (2026-11-15)
Decision ("for now"; changes D210, which had no budget and no numbers):
- **The server runs up to 500 NPCs in full detail (D6) at once,** read the D184 way: the largest count whose worst tick stays under 20 ms.
- **Measured by SIM-007 on desktop 1** (Ryzen 7 2700, Linux, Godot 4.7.2), seed 186, one game minute after a warm-up: worst tick **18.8 ms at 500 NPCs** and **41.9 ms at 1000**. The hash at 32 NPCs is 1256863383, for comparing another PC's run.
- **It is not the world's population (D6).** It was measured with stand-in NPCs that only wander and look around, and no players: no combat, no sending to clients, no saving. Those will cost more, so the budget goes down as real rules arrive, and it is measured again then (D184). The coarse and abstract levels (D6) hold the NPCs beyond it.
- **D64's 32 NPCs fit,** far under the budget.
- **Desktop 2 (Windows) is not measured yet.** D184 wants the slower of the two PCs; until desktop 2 runs it, this number comes from desktop 1 alone, and a slower desktop 2 would lower it. Deferred until a client runs there, and still open for D177 (the server running on Windows).

Why: Michael accepted the UAT of SIM-007 on 2026-11-15 from the implementer's full run on desktop 1, and deferred desktop 2. He still doesn't run the UAT himself (D210); these are the numbers D210 said were not in the repo.

## D218 — An item's picture is the item lying in the world (2026-11-16)
Decision ("for now"):
- **One picture per item,** drawn like the code-made props: the tileset's camera, light and colours, a ground shadow, no outline. It shows the item lying or propped in the world.
- **The same picture is used everywhere the item shows:** on the ground (D2, D3), in the pack (D124), in the loot window (D142) and in a shop (D143 to D145). There is no separate set of icons.
- **A material (D133) is a swap of the metal's colours** on that one picture. Wood, cord and leather keep their own colour.
- **An item's shape follows the Creator part a character holds for it (D121).** Look at the part from all 8 sides before drawing. Matched so far: a long sword with `Melee2`, a broad sword with `Melee5`, a cleaver with `Melee4`; a round shield with `Shield1`, a plain pointed shield with `Shield5`, a plank shield with `Shield7`.
- **Coins:** two stacks and loose coins, drawn bigger than life so each coin reads.

Why: the first draft was a set of classic icons (64 px, seen straight on, a dark outline, grey tinted by material). Michael: "It's not bad but it looks unoriginal", and he asked how Ultima Online, RuneScape and similar games do it. In Ultima Online and Tibia the item in a bag is the same small picture as the item on the ground, and a material is a recolour of one drawing. On the second draft, drawn that way: "Much better". On three designs each: "They all look very good, I'd take the coins from A". After the pictures were set beside the real character and corrected three times: "I think it's good now".

Rejected: classic icons, as above.

Cost we accept:
- No screen shows items yet: this is art ahead of need (Michael was told).
- Drafts only, on the branch `art/item-icons`: no sprite is written and nothing is in the game.
- The bronze, steel and coin colours are Claude's picks; no decision names them.
- With no outline, a dark item is hard to see on a dark pack slot.

## D219 — Held weapons and shields are repainted to match their item pictures (2026-11-16)
Decision ("for now"):
- **The Creator's part keeps its shape and its place in every frame; only its pixels are repainted,** in the item picture's colours (wood, iron, a metal's shades). A held sword or shield is no longer one flat tint: a sword has a metal blade and a brown grip, a wooden shield has an iron boss or studs.
- **Shape comes from the part, colour and surface from the item picture.** A mark that cannot be kept steady over the animations (a crease down a shield) is left off both.

Why: Michael, on the pictures beside the real character: "They still look a bit different, update the ones on the character to look like the one you made". After the repaint and two more fixes: "I think it's good now".

Cost we accept:
- Tried on the `Idle` sheets of six parts only. The other 29 animations, the other metals and every other part are not done.
- A repainted sheet is bought art repainted: it is not committed while the repo is public.
- A repainted part is already coloured, so the client must draw it with no tint, where today every part is tinted. How a material then reaches a held part (one sheet per metal, or a grey metal layer with a fixed wood layer) is not decided.
- The character's pixels stay 2.5 times bigger than the items' (D205), so the grain differs.

## D220 — The round and the plank shield are wood (2026-11-16; changes D133)
Decision ("for now"):
- **D133 listed shields as metal only.** Two shields are now wood: the round one (`Shield1`: a wooden face, a darker rim, an iron boss) and the plank one (`Shield7`: rough planks with iron studs). The plain pointed one (`Shield5`) is the metal shield, in bronze, iron and steel.
- **A wooden shield has one material, wood.** Its boss and studs stay iron.
- How good a wooden shield is next to a bronze one is not chosen.

Why: seen from all 8 sides the two parts read as a plain disc and as planks, and one tint made them all steel or all iron. Asked whether the plank shield looked right "wood colour included", Michael answered "same for the first column", which is the round shield: read as a yes to wood for both. He was told this reading and then said "I think it's good now". It also fits D152: starting gear is wood, cloth, leather or bronze at most.

## D221 — The axe, the mace and the spear: a wooden haft and a metal head (2026-11-16; adds to D133)
Decision ("for now"):
- **Three more items have a picture and a held part:** the axe (`Melee10`), the mace (`Melee12`) and the spear (`Melee24`). With the long sword and the round shield, every melee skill of the slice (D151) has one item.
- **Each is a wooden haft with a metal head.** The metal is the item's material: it names the item ("bronze mace") and colours the head (D132, D133). The haft is always wood. D133 named wood for spear shafts only; the axe and the mace now follow the spear.
- **On the ground each is as long as in the hand,** the same ratio as the swords: axe 54 px, mace 67 px, spear 126 px.
- **In the hand the head is found by shape.** The Creator draws haft and head in one grey, so the repaint (D219) takes the part's long axis and its thicker end: wood for the haft, the metal for the head, a dark socket between.

Why: Michael asked for the three "to match Melee10, Melee12 and Melee24", each part looked at from all 8 sides first, then shown beside the real character. Shown the picture and told the hafts were Claude's call, he answered "makes sense to me".

Not decided:
- How the spear, longer than a pack slot of the first draft (116 px), sits in a slot.
- Whether the mace's or the axe's metal sets anything but the head's colour.
- The repaint is checked on the 120 `Idle` frames of each part only, not on the other 29 animations.

## D222 — A weapon or a shield lies on the ground at 80% of its length in the hand (2026-11-16; changes D221)
Decision ("for now"):
- **On the ground a weapon or a shield is drawn at 80% of the held part's length,** the length taken from the side the part is longest from. D221 said "as long as in the hand"; the swords followed the same rule.
- **One setting sizes them all** (`GROUND` in `scripts/art/items.mjs`): swords, hafted weapons and shields, the ones still in draft included. Coins keep their own size (bigger than life, so they read).
- **Hafts keep their thickness** at any size: thinner than about 2 px a haft reads as a dark line, not as wood. Claude's call.
- **The held parts do not change.** They cannot be reshaped (D219).
- The five agreed items are sprites at this size: long sword 61 x 33 px, axe 49 x 23, mace 52 x 36, spear 92 x 48, round shield 36 x 36. The character is about 100 px tall.

Why: shown the five sprites at full size beside the character with empty hands, Michael said "they're too big compared to the character though". Measured on the `Idle` sheets, the sword part is 34 to 36 px seen from the side but 20 to 25 px from the front, where it points at the viewer; a picture sized to the longest view is bigger than the weapon looks in most views. Shown 100%, 80% and 65% beside the character holding the sword and the shield, he chose "the middle one".

Rejected:
- **100%:** matches the part's longest view and looks oversized beside the views seen most.
- **65%:** nearest the sword seen from the front, but the axe's head gets hard to read.

Not decided:
- How a long item sits in a pack slot. At 80% the spear's sprite fits the 116 px slot of the first draft.

## D223 — The head of a held axe, mace or spear is found from signs at each end, and a hidden head is not painted (2026-11-16; changes D221)
Decision ("for now"), Claude's call:
- **D221 found the head as the part's thicker end, frame by frame.** That holds on `Idle` only. The Creator's sheets have the part already cut where the body or a hand hides it, so seen from behind the head is often half hidden or gone, and the rule painted metal on the butt.
- **Now each end is scored for signs of a head:** a thick clump, pixels standing off the haft's line, for the spear pixels thicker than a shaft, and for the mace the Creator's dark butt tip, which counts for the other end. The 15 frames of one animation seen from one side are settled together, so an unsure frame follows the frames beside it.
- **A head with no sign is hidden: the frame is painted as haft only.** A head half hidden through a whole row is painted the same on every frame.
- **The repaint runs on every animation** of a matched part (`scripts/art/reskin.mjs`, `<Part>-<metal>/<Animation>.png`) and checks every frame for a thick clump at the butt's half painted as haft.

Why: the run on all 30 animations of the five agreed parts (D221's open check) showed metal on the butt in `Idle2`, `Idle3`, `Walk` and `CrouchRun` seen from behind.

Checked: no pixel lost on any of the 150 sheets; a second run is byte-identical; the script's check finds 0 of 3600 frames for the axe, 0 for the mace, 1 for the spear (looked at: right). By eye: the least sure rows, the axe in 15 animations from 8 sides, some spear rows, and the five parts in the hand in `Idle`, `Run`, `Attack1`, `TakeDamage` and `Die`.

Not checked: every frame by eye; the ride animations with a mount; anything in the game.

Not decided:
- How a material reaches a held part: one sheet per metal, or a grey metal layer over a fixed wood layer. The repaint writes one metal per part today. (Settled by D225.)

## D224 — Each weapon names its own attack animation; the spear thrusts with `Attack6` (2026-11-16)
Decision ("for now"):
- **The attack animation is a field on the weapon's row of data,** beside its speed and damage (D171). No rule in code names an animation for a weapon kind.
- **The spear uses `Attack6`:** a wind-up, then a forward lunge with the point leading. The long sword, the axe and the mace keep `Attack1`, a full swing.
- The Creator plays the same six attacks for every weapon, so this needs no new art (D163).

Why: watching the held parts play, Michael said of the spear in `Attack1`: "I don't think the spear is right it shouldn't be a 'slash' attack". Measured on all 8 sides, the spear's direction turns about 470 degrees in `Attack1` and about 80 in `Attack6`. Shown the spear in `Attack6` in the player (`scripts/art/play.mjs`), he said "really good now".

What the six attacks are, for the spear: `Attack1` about 470 degrees and `Attack2` about 390 (full swings), `Attack4` about 270 (a swing), `Attack3` about 130 (held forward, then raised overhead), `Attack6` about 80 (the lunge), `Attack5` about 50 (a wide stance, the weapon barely moves: not a strike). `Attack3`, `Attack5` and `Attack6` were looked at from one side in stills; `Attack2` and `Attack4` were only measured.

Not decided:
- How fast `Attack6` plays: the settings give a rate to `Attack1` only (15 frames a second); the player ran it at 12.
- Which frame of each attack is the hit.
- What `Attack2` to `Attack5` are used for. `Attack5` is a candidate for the bow shot D163 asks about (the weapon hand stays still); not looked at with a bow.

## D225 — A held part is painted in iron's colours, and its metal is swapped in when it is drawn (2026-11-16; adds to D219)
Decision ("for now"):
- **One sheet per animation for a held part that comes in metals** (a sword, a hafted weapon, the metal shield). The repaint (D219) paints its metal in iron's six colours. Whoever draws the sheet swaps those six for the six of the item's metal (D133): bronze, steel, or iron left as it is.
- **In the game the swap is a small shader on the held part's sprite** (`scripts/art/swap_check/swap.gdshader`): six colours in, six colours out, every other colour (the wood) left alone, the sprite's own tint kept. A held part is drawn with no tint of its own; the other Creator parts are tinted as before (D121).
- **One colour table for the ground and the hand:** the six colours of each metal are `METAL` in `scripts/art/items.mjs`, the same ones the item pictures use (D218), so an item has the same colours lying on the ground and held. A new metal is six colours in that table.
- The wooden shields (D220) have no metal: their iron fittings are painted in and never swapped.
- `scripts/art/reskin.mjs` writes `<Part>/<Animation>.png`, laid out like the Creator's own folder. `--metal` paints one metal in instead (the same pixels), for a check or a place where no swap can be done.

Why: Michael asked to see the options. Three ways were built on the real parts (long sword, axe, mace, spear; 30 animations each) and shown side by side, in stills and in a page that plays them:
- A, a sheet per metal: 360 sheets, 5.0 MB on disk.
- B, a wood layer and a grey metal layer the client tints like any other part: 240 sheets, 2.6 MB, two pictures drawn per weapon. A tint has one colour per metal, so its tones are near the metal's but not the same: at most 16 of 255 off on one channel for bronze, 10 for steel, 5 for iron.
- C, the swap: 120 sheets, 1.7 MB, and the same pixels as A.
One sheet is 1920 x 1024, 7.5 MB of memory once loaded whatever its file size (worked out, not measured in Godot), so the number of sheets counts more than the size on disk. Michael: "I really don't see any difference to be honest, but i'll go with your recommendation". Claude recommended C: the fewest sheets to load, the exact colours of the item pictures, one colour table, and A can still be made from the same repaint with one flag.

Rejected:
- A sheet per metal: three times the sheets for the same picture, and every new metal adds a sheet per animation per part.
- A grey metal layer tinted by the client: no new client code, but two layers per weapon and colours that are near, not equal, to the item pictures'.

Checked: the swap done by the scripts against the metal painted in, 0 of 360 sheets differ. The shader in Godot 4.7.2 (`node scripts/art/swap_check.mjs`, software OpenGL in Claude's sandbox): 0 drawn pixels differ on 240 sheets (4 weapons, bronze and steel, 30 animations); given the wrong colours on purpose the check fails.

Not checked: the shader on a real graphics card; a held item drawn by the game (no client code draws one yet).

Not decided:
- Where the client reads the six colours per metal from (a file under `game/data/`, written from `METAL` or by hand), and where `swap.gdshader` lives under `game/`: the task that first draws a held item.
- Metal armour: the Creator's chest and head parts are one material each, so the plain tint may be enough.

## D226 — Walk and run are two choices; the speed played in the test game is the run (2026-11-16; changes D185 and D205)
Decision:
- **A character can walk or run, and chooses which** (a toggle, like RuneScape). Same for players and NPCs (D4): a brain picks walk or run like a player does.
- **Running is the speed of D185 and D205:** a tile every 0.30 s (3 ticks), as played in the test game. It plays the Creator's `Run` animation.
- **Walking takes 0.60 s a tile** (6 ticks, half the run, as in RuneScape) and plays `Walk`. Chosen by Michael ("yes" to Claude's suggestion). A setting, like every speed.
- Both animation rates keep the planted foot still on the ground, as D205 does for Walk today (the rate follows the speed, the foot travel in the art and the body's size).

Why: in the player page `Walk` played at 30 to 53 frames a second. That is the rate D205 needs at 0.30 s a tile, which is about 4 m/s for a character 1.4 tiles tall: a jog. Michael: "we could walk and run depending on what we choose. So it's normal that walk walks slowly."

Rejected (offered by Claude the same minute): `Run` for all moving at the one speed, a single slower speed for everyone, and keeping `Walk` at the fast rate.

Not decided (running's cost, a chase and the defaults are settled by D228):
- Whether running costs something (stamina, noise heard by NPCs) or is free. Settled by D228.
- What a chase means now (D170 assumed one speed for everyone): a runner outpaces a walker. Settled by D228.
- The foot travel of `Run` per side: the player page uses a rough estimate (Run's stride is 1.0 to 1.26 times Walk's by side, `scripts/art/play.mjs`), to measure properly before the client plays `Run`.

In the player page (PR #29): `Walk` now plays at 15 to 27 frames a second (was 30 to 53), `Run` at 28 to 42.
- Which one a click gives by default, and what NPCs do by default (guards and townsfolk walk?). Settled by D228.

## D227 — One leg pace on every side; a diagonal grid step still takes as long as a straight one (2026-11-16; changes D205)
Decision:
- **`Walk` and `Run` each play at one rate on every side:** the rate that keeps the foot on the ground on a straight grid step (SE). The test game's `fps_follows_direction` set to false does this.
- **Movement is unchanged (D185):** a diagonal grid step takes as long as a straight one, as in RuneScape and Ultima Online. On screen, left, right, up and down are grid diagonals, so a character moving that way covers about 1.4 times the ground and its feet slide a little.

Why: Michael saw in the player page that walking left, right, up or down played faster than walking diagonally on screen. D205 matched the leg rate to the ground speed on each side, and the ground speed differs because a grid diagonal step covers more ground in the same time. Claude checked RuneScape and UO: Old School RuneScape walks one square a tick and runs two, diagonally or not (oldschool.runescape.wiki, "Game square"); UO the same from memory, not confirmed by a source. Michael: "1" (one leg pace, keep the movement).

Rejected:
- A diagonal grid step taking about 1.4 times longer (Dwarf Fortress uses 362/256): even speed and legs in every direction, but unlike the two games Renown follows.
- Keeping a leg rate per side (D205): the legs visibly speed up and slow down as the character turns.

In the player page: `Walk` plays at about 15 frames a second on every side, `Run` at about 28. CLI-003's walk line follows this.

## D228 — Running costs run energy; NPCs walk unless fleeing, chasing or raising the alarm; a chase is won by the one with energy left (2026-11-16; settles D226's open points, changes D170)
Decision:
- **Run energy, as in RuneScape:** every character has a run-energy bar. It drains while running and refills while walking or standing still; at zero the character walks. Same bar size for everyone, so Endurance keeps its one job (health, D159).
- **Metal armour drains it twice as fast** (a full bronze, iron or steel set; cloth and leather drain at the normal rate). This answers part of "does heavy armour slow a runner" (D139's open penalties): it doesn't slow the stride, it shortens the run.
- **Starting numbers, all settings:** a full bar lasts about 40 s of running in cloth or leather (about 130 tiles at 0.30 s a tile, D226) and about 20 s in metal; it refills from empty in about 60 s walking and about 30 s standing still. How a partial metal set counts is not chosen (same question as D172's armour).
- **No noise cost in the slice:** nothing can hear a runner yet (no stealth skill, D151). A candidate once stealth or hearing arrives (D51).
- **Players:** a Run toggle that remembers its state and starts on. It switches off when the bar is empty, and the player turns it back on, as in RuneScape.
- **NPCs, the same rules (D4):** they walk by default (at a post, wandering, going about the town) and run only to flee (D56: a roamer backing off, townsfolk running to the guards), to chase an enemy, or to raise the alarm, and only while they have energy. A running NPC is a sign that something is wrong.
- **A chase (changes D170):** a melee attacker swings only while next to its target (D170 still holds while it is). A walker never catches a runner. Between two runners the chaser stays behind and keeps hitting, as D170 says, until one bar runs out: whoever empties first loses the chase. So a lighter runner can escape a chaser in metal, and five chasers still bring down a top character in plate (D135). "Fight on, bandage or run" (D167) becomes three real choices.
- **Travel:** with the bar, the trip between the two towns (D34, about 400 tiles) takes about 3 minutes rather than 2. Tune the bar if that feels slow.

Why: with free running, everyone runs everywhere, walking is only for looks, and running from an equal never works (D170), so "run" in D167 was not a real choice. Run energy makes escape possible but paid for, and ties armour weight to it without a new stat. Proposed by Claude, Michael: "yes all that makes sense".

Rejected:
- **Running is free:** simplest, and D170 stays as it was, but nobody can escape an equal and walking means nothing.
- **A stamina pool set by Endurance:** gives Endurance a second job (D159 keeps one job per stat).
- **Noise heard by NPCs now:** nothing in the slice listens for it.

Not decided:
- How far an NPC chases before giving up (D56), and whether a guard leaves town to chase (D56 says it never leaves).
- Whether an archer can shoot while running, and how far a bow reaches (D170's open questions).
- Whether a bar shows for other characters (probably not: a character sees only what it sees, D176).

## D229 — Guards don't chase out of town; roamers chase about 30 tiles (2026-11-16; adds to D56 and D228)
Decision:
- **Guards stop at the town's edge (D56 holds in a chase):** a guard chases a target only while both are inside the town, and turns back at the edge. A runner who leaves town is safe from the guards. They still remember the deed and the face (D5, D196).
- **Roamers chase about 30 tiles** from where the chase started, then give up and go back to wandering. Run energy (D228) can end a chase sooner. A roamer backing off (D56) never turns to chase.
- **Townsfolk never chase.** They run to the guards (D28).
- The same rules apply whether the target is a player or an NPC (D4), and the distances are settings.

Why: guards that never leave keep a town defended and give a runner a clear goal (get out of town). Roamers that give up stop a fight from turning into a hunt across the island. Proposed by Claude, Michael: "yes".

Not decided: whether a chase lasts longer for a hated target (a known murderer, D129), and how "the town's edge" is marked on the generated land (D136, D189).

## D230 — An open door is a doorway in its wall (2026-11-16; changes D209)
Decision:
- **An open door is a doorway in its wall.** The tileset's door is drawn to sit on Wall A1, so a door edge draws Wall A1 with the door's shape cut out: closed = wall + door, open = the arched hole.
- **Made in code, no new art** (D163).

Why: Michael, 2026-11-16: the lone door "looks like it's just standing there without support".

---

# Known issues
Each one becomes a task (or a decision to leave it).

- [ ] <issue> — <where> — found by <discovery / UAT / review>
- [ ] verify.sh fails an expected engine error (`assert_engine_error`) raised in a deferred call or after an `await`: its backtrace has no `test_*` frame. Fails loudly, never a false PASS. Matters once a task expects an engine error from async code (network) — `scripts/verify.sh:71-75` — found by review of OPS-001
- [ ] verify.sh gives a false PASS when a setup hook calls a game function named `test_*` that errors: any `test_*` frame counts, not only those in files under `res://test/`. One-line fix — `scripts/verify.sh:71-75` — found by review of OPS-001
