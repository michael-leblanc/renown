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

---

# Known issues
Each one becomes a task (or a decision to leave it).

- [ ] <issue> — <where> — found by <discovery / UAT / review>
