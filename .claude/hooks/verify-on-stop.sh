#!/usr/bin/env bash
# SubagentStop hook: blocks the implementer from finishing while verify.sh fails
# in its worktree. Other agents pass through.
#
# Finds the worktree from the agent's transcript (last ".worktrees/<id>" mentioned).
# Blocks once (exit 2, failures go back to the agent). If the agent stops again
# while still failing, lets it finish: its report will say "verify: FAIL" and
# the orchestrator handles it.

set -u
input=$(cat)
root=${CLAUDE_PROJECT_DIR:-$(pwd)}

field() {
  printf '%s' "$input" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try { const v = JSON.parse(s)[process.argv[1]]; process.stdout.write(v == null ? "" : String(v)); }
      catch { process.stdout.write(""); }
    });' "$1"
}

warn() { # shown to the user, doesn't block
  node -e 'process.stdout.write(JSON.stringify({ systemMessage: process.argv[1] }))' "verify-on-stop: $1"
  exit 0
}

agent=$(field agent_type)
[ -n "$agent" ] && [ "$agent" != "implementer" ] && exit 0

transcript=$(field agent_transcript_path)
[ -z "$transcript" ] && transcript=$(field transcript_path)
[ -f "$transcript" ] || warn "no transcript found, verify.sh not checked"

wt=$(grep -oE '\.worktrees/[A-Za-z0-9._-]+' "$transcript" | tail -n 1)
[ -n "$wt" ] || warn "no .worktrees/<id> in the transcript, verify.sh not checked"
dir="$root/$wt"
[ -d "$dir" ] || warn "$dir does not exist, verify.sh not checked"
[ -f "$dir/scripts/verify.sh" ] || warn "$dir/scripts/verify.sh missing"

if out=$(bash "$dir/scripts/verify.sh" 2>&1); then
  exit 0
fi

if [ "$(field stop_hook_active)" = "true" ]; then
  warn "$wt still fails verify.sh after one retry; letting the implementer report FAIL"
fi

printf 'verify.sh fails in %s. Fix it before finishing:\n%s\n' "$wt" "$out" >&2
exit 2
