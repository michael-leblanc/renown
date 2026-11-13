# Renown

A small self-hosted multiplayer isometric roleplay sandbox: friends share one world and each lives their own random life. For Michael and his friends.

## Start of every session
- Read `docs/HANDOFF.md`. It's the current state. Don't rely on earlier chats.
- Read `docs/decisions.md` before planning or building. Decisions win over older docs.
- Running the build? Follow `docs/plan/ORCHESTRATOR.md`.

## Stack and commands
<adapt: copy the facts from docs/discovery/stack.md once discovery is done.>
- Run: `<adapt>`
- Verify (build + lint + tests): `scripts/verify.sh` → prints `PASS` or the failures
- Plan: `node scripts/plan.mjs` (status) · `validate` · `graph` · `show <id>` · `set <id> <status>`

## Writing to the user
- Short and scannable: bullets, **bold keywords**, ~15 lines max per message.
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
<adapt: the rules every agent must follow. BookIt example:>
- <adapt: "Every query is tenant-scoped. No exceptions.">
- <adapt: "Times are stored in UTC, shown in the location's time zone (America/Toronto by default).">

**Critical** (human merges, reviewer runs): <adapt: e.g. auth, tenant isolation, money, scheduling>.

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
