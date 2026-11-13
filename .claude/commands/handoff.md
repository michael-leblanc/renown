---
description: Update docs/HANDOFF.md with where the project stands, then commit it.
---

Update `docs/HANDOFF.md` so a fresh session can continue from it alone.

1. Read the current `docs/HANDOFF.md`.
2. Check the real state: `git status`, `git log --oneline -15`, and anything this session changed.
3. Rewrite the file following its rules comment:
   - "Where we are": facts you checked this session.
   - "Decided": add what got settled. Move answered questions here.
   - "Next steps": the very next thing first, in bold.
   - "Gotchas": anything that cost time, with the fix.
   - Remove lines that are no longer true. Keep it under ~60 lines.
4. Update the date.
5. Commit only that file: `docs: update handoff`.
6. Reply with the new "Next steps" list and this opener for the next chat, in a code block:
   `Read docs/HANDOFF.md. Today: <next step>.`

$ARGUMENTS
