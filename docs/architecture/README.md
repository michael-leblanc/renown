# Architecture

Mermaid diagrams built from `docs/discovery/` and `docs/decisions.md`. They render on GitHub.
Skip this folder for plain CRUD.

## Usual files
- `system-overview.md` — all pieces and who calls whom.
- `erd.md` — every table; existing vs planned in different styles; flag tables missing a required key (<adapt: e.g. TenantId>).
- `module-map.md` — which area depends on which. Becomes the task graph's dependencies.
- `sequences.md` — only the tricky flows (<adapt: e.g. auth, booking with a double-booking guard>).

## Rule for every file
1. Starts with: **For:** what this diagram is for. **Catches:** what mistake it catches.
2. The diagram.
3. Ends with **Gaps found**. Each gap gets settled as a decision and marked `→ settled by Dxx`.
