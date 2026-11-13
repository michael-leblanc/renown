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
- **Targets:** desktop builds for players. The same Godot project, exported headless for Linux, is the dedicated server. No web build.
- **Network:** server-authoritative. Clients send inputs; the server owns the world state. Godot's built-in high-level multiplayer over ENet (UDP).
- **Tests:** GUT, run headless from `scripts/verify.sh`.
- **Not decided here:** the save format (files or SQLite). It belongs to the server design.

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
- The distances, the tick rates and the number of NPCs (unknown until measured).
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
- The real budget. It comes from the measurement (D6).

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
- What goblins think of orcs.

## D76 — The gods: Halvar, Gorrath, Skerra, and the One Hand (2026-11-13)
Decision:
- **Humans: Halvar, the Keeper.** God of thresholds, promises and what is yours. Humans say he sets each person down where they belong. Sign: a door found open at dawn.
- **Orcs: Gorrath, the Scarred.** You are what you have done, not what you own. Orcs wake with scars they can't explain and say he put them there as a debt to live up to. Sign: an old scar that aches before a fight.
- **Goblins: Skerra, the Finder.** Goddess of luck and quick wits. Goblins say she hides things in the world for the clever to find, which is why new chests keep appearing (D54).
- **The creed: the One Hand.** "One hand sets us all down." Its believers live in both towns, and neither town fully trusts them.
- **Why humans and orcs are "so different" (D69):** one people measures a person by what they keep and promise, the other by what they have done.
- **All of it is what people say (D68).** It is written in `docs/lore.md`.

Why: drafted on 2026-11-13; Michael read it and said it makes sense. Each god gives its people a way to see the world, and Skerra gives new chests a story.

Not decided here:
- Whether following a god changes anything in play.
- Skerra's sign.
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
- Whether the beasts in the art packs are people or animals, and whether animals are characters (D4).
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

---

# Known issues
Each one becomes a task (or a decision to leave it).

- [ ] <issue> — <where> — found by <discovery / UAT / review>
