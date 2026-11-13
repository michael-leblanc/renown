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

---

# Known issues
Each one becomes a task (or a decision to leave it).

- [ ] <issue> — <where> — found by <discovery / UAT / review>
