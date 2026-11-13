#!/usr/bin/env bash
# verify.sh — the one gate every task must pass.
#
# Contract (agents and the stop hook rely on it):
#   all steps pass  -> prints "PASS", exits 0
#   any step fails  -> prints "FAIL: <step>" + only the useful lines (file:line), exits 1
# Output is short on purpose: agents read it, so every line costs tokens.
#
# Runs from the repo root it lives in, so it works the same in any worktree.
# Portable: bash 3.2 (macOS default), no GNU-only flags.

set -u
cd "$(dirname "$0")/.." || exit 1

# <adapt> One step per line: "name|command". Warnings must fail the step.
STEPS=(
  # "build|npm run build"
  # "lint|npm run lint -- --max-warnings=0"
  # "test|npm test --silent"
  # "build|dotnet build -warnaserror"
  # "test|dotnet test --nologo -v q"
)

# Keep tools from editing tracked files while they run. <adapt>
export CI=1
export NG_CLI_ANALYTICS=false

if [ "${#STEPS[@]}" -eq 0 ]; then
  echo "FAIL: verify.sh has no steps yet. Fill in STEPS in scripts/verify.sh."
  exit 1
fi

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT
failed=0

for entry in "${STEPS[@]}"; do
  name=${entry%%|*}
  cmd=${entry#*|}
  if ! bash -c "$cmd" >"$LOG" 2>&1; then
    failed=1
    echo "FAIL: $name"
    # Lines that point somewhere (file:line) or say error/fail. Fall back to the tail.
    useful=$(grep -E '[A-Za-z0-9_./-]+:[0-9]+|[Ee]rror|FAIL|[Ff]ailed' "$LOG" | head -n 30)
    if [ -n "$useful" ]; then
      printf '%s\n' "$useful"
    else
      tail -n 20 "$LOG"
    fi
  fi
done

if [ "$failed" -eq 0 ]; then
  echo "PASS"
fi
exit "$failed"
