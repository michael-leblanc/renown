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
- Whether loot comes back after it is taken is open.

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
- Whether a player can die on purpose to reroll a bad birth.

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
- The coarse and abstract levels of detail (D6). The tick-time measurement stays an early task.

Why: it proves the three riskiest ideas together: random birth with permadeath, NPCs under player rules, and reputation that travels. Everything left out can be added on top without redoing it.

Not decided here:
- Which two factions, and which races are in each.
- The size of the region and the number of NPCs.
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
- Whether a character cast out by their own faction has anywhere to go.
- Whether NPCs go looking for the enemy (patrols, raids on the other town) or only fight when they meet.
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
- Which role the newcomer takes (the dead one's, or any empty one).
- What a newcomer starts with (level, gear).
- Whether a town that has been emptied or overrun still gets newcomers.
- Whether monsters are replaced, and how.
- Whether this stays after the slice, or something richer replaces it.

---

# Known issues
Each one becomes a task (or a decision to leave it).

- [ ] <issue> — <where> — found by <discovery / UAT / review>
