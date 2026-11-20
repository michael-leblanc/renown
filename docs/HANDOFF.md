# Handoff — Renown

Updated: 2026-11-20

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
- **Steel slot colour and the Skills screen drafts: merged (#47, 2026-11-18).** Steel is a deeper, colder blue than Iron (Claude's call). `node scripts/art/ui/skills_screen.mjs` draws drafts a to f; e is the agreed tree (D243). Made-up numbers and node names; a total cap of 500 as a placeholder (D140 has none).
- **HUD, death, loot, Reputation and menu drafts: merged (#49, 2026-11-18)**, all agreed (D244 to D251): the HUD "corners" with the door at dawn top left; the death screen with the town's landmark in the middle and deeds that scroll; the loot window; Reputation; the menu with a big door at dawn that moves. Pictures only, nothing in Godot. Scripts in `scripts/art/ui/` (listed in `scripts/README.md`); detail in `docs/art-experiments.md`.
- **HUD pieces: merged (#50, 2026-11-19).** `node scripts/art/ui/hud.mjs --pieces`: 37 pieces + `hud.json` in `game/client/art/made/ui/hud/` (bars and the bandage ring as empty + fill, the map's land left to the game, the target plate a nine-patch). `--check` rebuilds the HUD from them: no visible difference from the draft.
- **HUD in Godot: merged (#51, 2026-11-19).** `game/client/screens/hud.gd` draws it from `hud.json`; it shows a state dictionary, not wired to the game. Shot page `res://client/screens/hud_shot.tscn` (`-- --town Oldscar`) matches the draft. `verify.sh` PASS.
- **Death screen pieces: merged (#52); in Godot: merged (#53) (2026-11-19).** `node scripts/art/ui/death_screen.mjs --pieces`: 13 pieces + `death_screen.json` in `game/client/art/made/ui/death/` (rules as one long piece each way, cut to length by the game; the scroll thumb a nine-patch; the world behind dimmed by a shader, the json's `veil`). `--check`: no visible difference from the draft. `game/client/screens/death_screen.gd` draws it from the json; shows a life dictionary, not wired to the game; deeds scroll with the wheel; Wake (click or Enter) sends `woke`. Shot page `res://client/screens/death_shot.tscn` (`-- --town Oldscar`, `-- --scroll n`) matches the draft. `verify.sh` PASS on both. `bake`/`cut` moved to `pieces.mjs`.
- **Loot window pieces: merged (#54); in Godot: merged (#55) (2026-11-19).** `node scripts/art/ui/loot_window.mjs --pieces`: 14 pieces + `loot.json` in `game/client/art/made/ui/loot/` (boards, satchel, `Slot <material>`, the pointed slot's glow, the note's plate, Take all, Close). `--check`: no visible difference from the draft. `game/client/screens/loot_window.gd` draws it from the json; shows a state, not wired to the game; the mouse lights a slot and shows its note; `took(slot)`, `took_all` (Space), `closed` (Esc); catches the mouse only over its parts. Shot page `res://client/screens/loot_shot.tscn` (`-- --point n`) matches the draft. `verify.sh` PASS on both.
- **Reputation pieces: merged (#56); in Godot: merged (#57) (2026-11-19).** `node scripts/art/ui/reputation_screen.mjs --pieces`: 18 pieces + `reputation.json` in `game/client/art/made/ui/reputation/` (frame, a long rule cut by the game, lit and dim cards, each town known and greyed, row signs, `Scale` + `Scale Mark`, Fame's bar empty + fill, tales' stage, bullet, Close; the death screen's veil). `--check`: about 3,400 px differ, none visible. `game/client/screens/reputation_screen.gd` draws it from the json; shows a state, not wired; a town with no rows is dim and "Not known" (D126); 2 cards and 4 tales fit, no scrolling; `closed` (Close, Esc). Shot page `res://client/screens/reputation_shot.tscn` (`-- --blank`) matches the draft. `verify.sh` PASS.
- **Body's loot window pieces: merged (#62, 2026-11-20).** `node scripts/art/ui/body_loot.mjs --pieces`: 15 pieces + `body.json` in `game/client/art/made/ui/body/`. The loot window opened on a body (D248): titled "Loot" (Michael: the D128 description was too much), "Free to take" (D3, words not decided), what it wore in the character screen's gear order, what it carried (20), Take all, your pack. `--check`: 348 px off at the lit slot's edge, same as the loot window's. Not in Godot yet.
- **Shop window pieces: PR #67 open (2026-11-20).** `node scripts/art/ui/shop_window.mjs --pieces`: 20 pieces + `shop.json` in `game/client/art/made/ui/shop/`. RuneScape-style (Michael: "more like runescape, and more fun"), Renown's own look: the shopkeeper's face, "Shop", a line they say, the shop's coins (D143); 30 stock slots with count (top left) and price; sold out greyed with 0; click buys 1, right-click menu Value / Buy 1 / 5 / 10 / X (Sell on your pack); a bought item flashes in your pack and coins pop at your purse. Every price, count and word made up. `--check`: same as the draft. Not in Godot yet.
- **Main menu pieces: merged (#58); in Godot: merged (#59) (2026-11-19).** `node scripts/art/ui/main_menu.mjs --pieces`: 13 pieces + `menu.json` in `game/client/art/made/ui/menu/`. The painting moves, so the pieces are what does not move (`Door`, `Steps`, `Light`, `Noise`) and the game moves it: `menu_scene.gdshader` (a port of `doorFrames` in `scenes.mjs`: change one, change the other) and `main_menu_sparks.gd` (stars, dust). `--check`: about 8,000 px differ, worst 16, none visible. `game/client/screens/main_menu.gd` shows a state, not wired; pointed button lit; `picked(what)`, Host game opens its panel, `hosted(values)`, Esc. Shot page `res://client/screens/main_menu_shot.tscn` (`-- --at t`, `-- --plain`) matches the pieces. `verify.sh` PASS on both.
- **Join game and Settings panels: pieces merged (#63, 2026-11-20).** `node scripts/art/ui/main_menu.mjs --panel join|settings`; `--pieces` adds 4 (`Panel Rules Join`, `Panel Rules Settings`, `Bar`, `Bar Fill`), 17 in all; `menu.json` gains `panels.join` and `panels.settings`, `panel` (Host) unchanged so `main_menu.gd` still reads it. Join: address, port, hint, Join, last joined. Settings: Master, Music, Effects as bars, Window (Windowed / Full screen), Motion (Full / Reduced), "Changes apply at once", Done. Same plate and place as Host. Every value made up. `--check`: only a bar's bright tip is lost where the game cuts the fill. Drawn in Godot (2026-11-20, merged #72): `main_menu.gd` opens them from Join game and Settings and sends `joined(values)` and `setting_changed(name, value)` only (a click on a bar sets its volume, a click on a choice's left or right half steps it); shot page `-- --panel join|settings` matches the drafts.
- **In-world markers: merged (#66, 2026-11-20).** `node scripts/art/anim.mjs "Move Spot A1,Target Ring A1,Miss Word A1"`, strips in `prototype/art/made/anim/` (moved by CLI-005 with the rest). Move spot (D16, played once), target ring under who you attack (D17, loops), "Miss" over the head (D161, played once). Not in Godot yet.
- **Talk window pieces (2026-11-20, merged #70, approved "good for now"), the RuneScape way (Michael).** `node scripts/art/ui/talk_window.mjs --pieces`: 6 pieces + `talk.json` in `game/client/art/made/ui/talk/`. A box in the bottom left (where local speech is, D244, clear of the HUD slots), one line at a time, no history scroll: the speaker's head on the left (yours on the right when you speak), name above the line, "Click here to continue" (click or Space); choices as "Select an option" with numbered lines (click or 1 to 5), the pointed one lit; the people list of D127 (yourself, by name, seen, heard of, Back). Drafts `--state npc|you|options|people`. Every line and reply made up. `--check`: same as the drafts in all 4 states. Not in Godot yet.
- **Skill webs agreed for v1 (D252, 2026-11-20):** the bigger wheel (a circle, 30° apart) and all eight skills as webs of Swords' shape, small nodes placeholders. Swords: 4 named nodes at most for v1 only, a bridge to each neighbour, Finisher and Blade wall made stronger. Shield, Dodge and Unarmed named nodes agreed 2026-11-19. D135 is now "5 to 6". Bows unchecked until its range is decided. Page: `node scripts/art/ui/skills_tree_page.mjs`; balance: `node scripts/sim/web-check.mjs <Skill>|stack`. Notes: `claude/skill-webs.md`, `claude/swords-web.md`.
- **Docs:** `docs/plan/stable-decisions.md` (every decision tagged firm, provisional, later or superseded, for planning; #64). `docs/decisions.md` D1 to D252 (D13 replaced by D14; "hand-built" in D84 by D136). `docs/open-questions.md` holds every open question (D233). `docs/lore.md` (D65 to D120, D158, D234). `docs/art-check.md` (packs, Creator parts, tileset props). `docs/art-experiments.md` (code-made art). `docs/architecture/layout.md` (where code goes; Godot 4.7.2, GUT 9.7.1).
- **Art source:** about 2.7 GB of zips in `~/Downloads/Assets` on the Mac (contact sheets and tests in `_art-check/`), also in the clone on desktop 1, git-ignored (`*.zip`, `art-source/`).
- **Detail in project docs:** reviews `claude/pr12` to `pr36-review.md`; art `claude/oldscar-cliff.md`, `ground-edge.md`, `desert-tileset.md`, `slice-items.md`, `item-icons.md`, `creator-parts.md`, `camp-props.md`.

## Next steps
- [ ] **Next: Michael merges the Godot Skills screen (#61).** Pieces and `skills.json` merged (#60, `node scripts/art/ui/skills_tree.mjs --pieces`). `game/client/screens/skills_screen.gd` + `skills_layout.gd`, shot page `skills_shot.tscn`, 17 tests, `verify.sh` PASS. What is left is for the Console (below). Secrets are designed (Michael, 2026-11-19): in D242.
- [ ] **Next: NET-005 runs** (started 2026-11-20), then Michael does its two-machine UAT. HUM-001 done 2026-11-20 (art skills point at `game/client/art`; committed on local `main`, which was 23 plan commits ahead of origin, not pushed). Michael still closes CLI-005's PR #37 unmerged. CLI-006 (#73, merged 2026-11-20) moved all code-made art to `game/client/art/made` and `character_data.json` to `scripts/art/`; the test scenes in `prototype/` no longer find it (NET-005 deletes `prototype/`). CLI-007 (Skills motion) started 2026-11-20.
- [ ] **Look and feel to carry into the game** (all tried in the scene page, `node scripts/art/scene.mjs`, Michael: "it's perfect"; not built in Godot, not planned as tasks; how each is done is in `docs/art-experiments.md`): night light, rain and leaves that land, things getting wet, puddles, open water as one surface with reflections and a soft shore, one current that turns the water wheel. The page is slow on a phone (about 44 frames a second); in Godot these are shaders and particles, not measured yet.
- [ ] **Finish the client wave on desktop 1** (orchestrator, `docs/plan/ORCHESTRATOR.md`; not while a BookIt wave runs): review and merge CLI-005 (#37), then NET-005. Push the plan's status and QA commits (`docs/plan/log.md` and `qa/` on `main` stop at SIM-002).
- [ ] **Then Michael plays it on two machines** (NET-005's UAT): server and one game on desktop 1, a second game on his Mac. Expect everyone in the human's test colours (D214).
- [ ] **Then saving → random birth → combat → land generator (D231).** Plan the next wave's build tasks first.
- [ ] Michael makes the repo private in GitHub's settings (paid-pack art is in it). Not now, by his choice (2026-11-18): remind him, don't push.
- [ ] Character screen: open it from the game (a key; what the server sends for it, D176) and settle its size on screen: 620 x 760 doesn't fit the 1152 x 648 window at 1x. HUD (`hud.gd`, #51): next, wire it to the game (what the server sends, D176), other window sizes, the map's land. Death screen (`death_screen.gd`, #53): next, wire it to the game (what the server sends, D176), other window sizes, scrolling the towns. Loot window (`loot_window.gd`, #55): next, wire it to the game, a note for pack items, a body's loot (D128). Reputation (`reputation_screen.gd`, #57): next, wire it to the game (D176), open it from a key, scroll the tales, the level words (not decided). Main menu (`main_menu.gd`, #59): next, wire it (Join's address, Host runs the server D197, Settings), typing in the fields, other window sizes; measure the shader on a slow machine. Not planned as build tasks.
- [ ] Art: the full-size cliff proofs on desktop 1 (commands in `claude/oldscar-cliff.md`), then merge the branch; then check the green tileset for interior floors, then a jetty and a boat for Dawndoor's shore (B49, B50). Jetty merged (#42); code-made `Rowboat A1` merged (#74, in `game/client/art/made/`).
- [ ] Small fixes from the reviews, none blocking (lists in the review docs). The ones to schedule: a world that has walked or thought is never freed (fix before the fast-forward run, D183); character ids come from `NetServer`, not the world (clash once D15 adds characters); a mixed wall corner draws over a character inside (#36).
- [ ] Agree which later tasks are critical (Michael merges them). Claude's candidates in `CLAUDE.md`: shared character rules (D4), the save format (D182), what a client is sent once names or stats exist (D176).

## For the Console (suggested tasks; the orchestrator plans them, chats never edit `tasks.yaml`)
This project's chats do decisions and assets; logic and planning run in Playbook Console (Michael, 2026-11-20).
- **FE: Skills screen motion.** Inputs: `skills_screen.gd` (#61), the page's movement in `scripts/art/ui/skills_tree_page.mjs` (`intro`, `step`, `burst`, the strand light). Add the opening fade (0.3 s), the ring easing to a new level, the blue ring when a point is earned, the flash and thin ring on a node just taken, the light along its strand (0.18 s), Take route buying one node after another (0.11 s apart), the zoom glide on the wheel. Short, eased out, nothing loops (Michael, 2026-11-19); off under reduced motion. Accept: timings read from `skills.json` (add them in `skills_tree.mjs`), tests on the state at a given time, shot page `-- --at t`.
- **FE: open the Skills screen from the game.** Inputs: `skills_screen.gd`, the HUD's Skills button (`hud.gd`), D176. A key and the HUD button open and close it over the game; the character comes from what the server sends (levels, taken, paid: shape to settle, D176, critical candidate); `took(ids)` goes to the server, which decides (no node is taken on the client); the screen shows the answer. Accept: opens and closes by key, button and Esc; a took round-trip test with a stand-in server; nothing sent uses another character's true stats (D28, D176).
- **FE (later, with the server's skills): node rules on the server.** Inputs: `skills_layout.gd` (state, points, marks, routes), `game/data/` (D175). Move the rules' numbers to `game/data/` and the take check to `game/sim/` (plain data, D180); the screen keeps only display. Accept: the same tests pass against the sim's check; one character model (D4).

- **FE: the body's loot window in Godot, opened on a body.** Inputs: `body.json` and pieces (#62), `loot_window.gd` (#55) as the model, D3, D123, D128, D176. Draw it from the json; open it by clicking a corpse; worn and carried slots; `took(slot)`, `took_all` (Space), `closed` (Esc) go to the server, which decides. Accept: shot page matches `body_loot.mjs`'s draft; a took round-trip test with a stand-in server; nothing sent uses another character's true stats (D28, D176).

- **FE: the shop window, opened on a shopkeeper.** Inputs: `shop.json` and pieces (#67), `loot_window.gd` (#55) as the model, D64, D123, D143 to D145, D176. Draw it from the json; open it by clicking a shopkeeper, close by Close, Esc or walking away; the shopkeeper's face drawn from their character (json `face`), their line from their lines. Click a shop item: buy 1. Right-click: the menu (Value, Buy 1 / 5 / 10 / X; on a pack item Sell 1 / 5 / 10 / X, coins never; X asks how many); Value shows the price in the note. Each buy or sell goes to the server, which decides (price, the shop's coins, its buy orders and stock); the window shows the answer: counts tick, sold out greys with 0, Slot New flashes on what you got, Coin Pop and the amount at your purse; a refusal says why (short of coins, not buying that now). Accept: shot page matches `shop_window.mjs`'s draft; a buy and a sell round-trip test with a stand-in server, including a refusal; nothing sent uses another character's true stats (D28, D176); prices and counts come from the server, the words and timings from the json.

- **FE: the sand-to-grass edge in the land.** Inputs: `scripts/art/ground_edge.mjs` (`makePieces`, `piecesFor`, `D0`, `BAND_D0`), `land_tiles.gd`, `land.gd`, the desert pack's `Ground A1_S`, `A18_S`, `A8`, `A9`, `A21` (bought art, to add to `game/client/art/tiles/`). LandTiles cuts the 28 pieces and their shades at load from the grass and band pieces (port the masks; never commit cut pieces); Land draws, after each sand tile, all its shades, then the band's pieces, then the grass's, and the dry tufts on sand 1 to 3 steps from grass. Accept: a land preview shot with every case (edge, corner, inner, lone tiles) matches `ground_edge.mjs`'s picture made from the same pieces; same tile, same variant; every depth and share a setting in `game/data/` (D175).
- **FE: wire the Join game and Settings panels.** Drawn already (`main_menu.gd`, #72): the panels open, Join sends `joined({"Address", "Port"})`, Settings sends `setting_changed(name, value)` on a bar click or a choice step, Done and Esc close. Left to do: typing in the fields (address, port, and Host's fields too); dragging a bar; on `joined` the client connects (a wrong address says so, no crash) and `last` becomes the address joined; on `setting_changed` the change applies at once (audio buses, window mode, reduced motion turns off the Skills screen's movement) and is kept in a user settings file between runs, read back into the menu's `settings` at start. Inputs: `main_menu.gd`, `menu.json`, D197, D199. Accept: a connect test with a stand-in server; settings survive a restart; the shot pages `-- --panel join|settings` still match the drafts; every default a setting in `game/data/` (D175).

- **FE: the in-world markers in the game.** Inputs: `anim.json` and the strips `Move Spot A1`, `Target Ring A1`, `Miss Word A1` (and `Hit Spark A1`, `Miss Puff A1`, `Block Flash A1`), D16, D17, D161, D207. A click on the ground plays Move Spot there once; while you attack someone, Target Ring loops under them (under the character, like the waking glow; moved by `anim.json`'s `feet` for their animation and facing times their scale, so it is centred on the feet) and stops when the attack does; each attack result the server sends plays its effect (a hit: Hit Spark; a miss: Miss Word over the head and Miss Puff; a block: Block Flash). The client shows only what the server sent (D176). Accept: tests that each result plays the right effect once; the ring follows its target and goes when the attack ends; frames and speed read from `anim.json`.

- **FE: the talk window, opened on someone.** Inputs: `talk.json` and pieces (talk PR #70), `loot_window.gd` as the model, D23, D31, D126 to D128, D176. Draw it from the json as a box in the bottom left; open it by clicking a character who is not hostile (the key or click: not decided). One line at a time: the speaker's head and name on the left, yours on the right when you speak (named "You" unless told otherwise, D31), name only if you were told it, else what you see; a click on the box or Space goes on. Then "Select an option": replies from what the server sends, picked by click or 1 to 5, Esc closes; "Tell me more about this person..." lists the people you know of (D127, D128), from your own knowledge only (D28, D176). Accept: shot pages match `talk_window.mjs`'s 4 drafts; a pick round-trip test with a stand-in server; nothing sent uses another character's true stats or a name you were not told.

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
- D242 one big skill tree from an art root node (not the character), a branch per skill, zooms and pans; nodes bought with that skill's own points
- D242 (2026-11-19) a point at skill 25, 50, 75, 100, once each; a newborn has 1; a node needs its level and goes dark below it; no reset for now (death is the reset)
- D242 (2026-11-19) a branch = two paths of 4 nodes (one per level mark) + free material milestones (Iron 25, Steel 50; below it usable but worse); secret nodes and branches found in the world, trained, can be written in a book
- D252 (2026-11-20) every skill a web (Swords' shape); 20 points a skill, 4 named nodes at most for v1; bridges to neighbours; the wheel a circle
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
- D135 5 to 6 ordinary characters to bring down one at the top (was about 5; D252)
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
- D243 Skills screen = the tree (draft e): rosette root, skills as filling rings, points to spend in blue, zoom; no search for now
- D244 HUD "corners": bars top left, small map and buttons top right, slots bottom middle
- D245 HUD top left: your town's landmark painted (door at dawn), "for now"
- D246 HUD keeps a small round map of what you have seen
- D247 death screen: the life with deeds that scroll, what the world remembers, your town's landmark, Wake
- D248 loot window: the chest's boards over your pack, Take all, item note
- D249 Reputation: a card per town (Standing, Morality, Fame as told), tales told of you
- D250 main menu: the door at dawn the size of the window, moving; Join, Host game, Settings, Quit
- D251 Oldscar's painting follows the tall cliff (seen from the ground), "for now"

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
- A PR stacked on another that gets squash-merged conflicts once retargeted to `main`: merge `main` into the stacked branch (no force push), keep both sides' additions, push, then merge. Done for #49 on 2026-11-18, #53, #55 and #57 on 2026-11-19; #59 merged clean (keep the stacked branch's side: it holds both).
- Before drawing Oldscar's cliff in any form, look at branch `art/oldscar-cliff` and `claude/oldscar-cliff.md`: its look took two days of Michael's verdicts. A picture drawn from D234's one line was sent back (D251). The accepted tall cliff's cleft leans about 28° and reaches the ground; "40°" is the older 7-unit cliff's.
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
- Merging a PR (`gh api .../merge`) or pushing to `main` from a Claude chat is refused by the session's safety check until Michael asks for it in that chat: on 2026-11-19 "merge them" was enough. Open the PR, run `verify.sh`, then ask.
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
