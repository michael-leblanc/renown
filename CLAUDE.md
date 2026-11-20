# Renown

A small self-hosted multiplayer isometric roleplay sandbox: friends share one world and each lives their own random life. For Michael and his friends.

## Start of every session
- Read `docs/HANDOFF.md`. It's the current state. Don't rely on earlier chats.
- Read `docs/decisions.md` before planning or building. Decisions win over older docs.
- Running the build? Follow `docs/plan/ORCHESTRATOR.md`.

## Stack and commands
- **Engine:** Godot 4.7, pinned (see D1). GDScript only, no C#.
- **One Godot project** in `game/` for client and server, on Windows, macOS and Linux (D177). The same server code runs headless as a dedicated server, or as a second program a host's game starts (D173, D197). No web build.
- **Layout and pinned versions:** `docs/architecture/layout.md`. Godot 4.7.2-stable through `scripts/godot.sh`, GUT 9.7.1.
- **Network:** server-authoritative over Godot's high-level multiplayer (ENet). Clients send inputs; the server owns the world state.
- **Tests:** GUT, run headless.
- **Godot skills:** the `godot-skills` plugin (D202). Check any Godot API you're not sure of against the 4.7 docs (`godot-docs-lookup`); 4.7 is newer than what Claude knows well.
- Run (opens the project in the pinned editor): `scripts/godot.sh --editor --path game`. The first run downloads Godot 4.7.2 into the per-user cache.
- Verify (import + parse check of every `.gd` + GUT tests): `scripts/verify.sh` → prints `PASS` or the failures (file:line, test name).
- Plan: `node scripts/plan.mjs` (status) · `validate` · `graph` · `show <id>` · `set <id> <status>`

## Writing to the user
- Short and scannable: bullets, **bold keywords**, ~15 lines max per message.
- Minimum info that keeps what matters: straight to the point, step by step if needed. Write for someone with ADHD (Michael, 2026-11-16).
- Actions first: what needs me, what's done, then details.
- Step by step when I ask for steps: one step, wait, next step.
- Commands and prompts I should run go in code blocks, ready to paste.
- Every prompt for Claude Desktop or Claude Code: state the recommended model and effort on the line under it (e.g. `Model: Opus · Effort: high`).
- One question at a time, at the end. Give your recommendation in **bold**.

## Sessions
- One goal per session. If this session drifts from its goal, or gets long enough that a fresh start would help, say so in one line.
- Offer to run `/handoff` first if something worth keeping happened, then give the opener for the new session in a code block.

## How to work
- **State lives in files, never in chat.** Plan in `docs/plan/`, decisions in `docs/decisions.md`, status in `tasks.yaml`.
- **Scripts over repeated work.** If you'd do something twice, or read long output, write a script in `scripts/` with short output, and list it in `scripts/README.md`.
- **Read before you assume.** Check code and config before saying what the stack is.
- Use the tools already in the repo. Ask before adding a dependency.
- Unknown = say it's unknown. Don't guess.
- Can't reproduce a bug? Write a failing test first, or park it under Known issues. No blind fixes.
- API response shape ≠ database schema. Personal data lives in one place.

## Domain rules
- **The server's world is plain data.** Nothing under `game/sim/` extends `Node`, touches the scene tree or uses physics (D180).
- **One character model.** A player's character and an NPC follow the same rules; an NPC is a character with a brain attached. No "players only" or "NPCs only" branch without a new decision (D4).
- **Every number is a setting.** Speeds, distances, timings and limits live in `game/data/`, timings in seconds (D175). Never present one as final.
- **Same seed, same world.** Randomness in `game/sim/` comes only from the world's seeded generator, and nothing there reads the clock.
- **A character knows only what it sees and was told.** Rules that decide for a character, and anything sent to a client, never use another character's true stats (D28, D176).
- Where a file belongs and how to run Godot: `docs/architecture/layout.md`.

**Critical** (human merges, reviewer runs): nothing in wave 1 (Michael, 2026-11-14) and nothing in the client wave (D213, Michael, 2026-11-15). Candidates for later waves, not agreed: the shared character rules (D4), the save format (D182), what a client is sent once names or stats exist (D176).

## Tasks and agents
- One task = one reviewable claim. Agents read `node scripts/plan.mjs show <id>`, nothing more by default.
- Implementers edit only the task's `touches`.
  - Build/config file outside `touches`: OK if listed in the report.
  - App code outside `touches`: stop and ask.
- Tasks that add packages run one at a time, each from an up-to-date `main` (lockfile conflicts).

## Git
- Each task: branch `task/<id>` in its own worktree under `.worktrees/<id>`.
- Non-critical: PR → squash-merge after QA passes. Critical: PR stays open for me.
- Docs and plan files (`docs/`) go straight to `main`.
- Tag `wave-<n>-done` at the end of each wave. Rollback = `git revert`, never force push.
- Never remove a worktree before its commit is on `main`.
- Never force push. Never rewrite pushed history.

## Safety
- Never create, edit, move, delete or read `.env` files. Only `.env.example`.
- Tests that need "no credentials" use env vars or temp dirs, never the real files.
- Never print secrets or tokens in output.
