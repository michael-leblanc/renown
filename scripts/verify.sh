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

# One step per line: "name|command". Warnings must fail the step.
# Godot always runs through scripts/godot.sh, the pinned version (D1).
# parse: --import and GUT both miss a parse error in a script no test loads,
# so every .gd file under game/ outside addons/ is checked on its own.
STEPS=(
  "import|scripts/godot.sh --headless --path game --import"
  "parse|scripts/check_parse.sh"
  "test|scripts/godot.sh --headless --path game -d -s addons/gut/gut_cmdln.gd -gexit"
)

# Keep tools from editing tracked files while they run. <adapt>
export CI=1
export NG_CLI_ANALYTICS=false

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
    clean=$(mktemp)
    sed "s/$(printf '\033')\\[[0-9;]*m//g" "$LOG" >"$clean"
    useful=""
    if [ "$name" = "test" ]; then
      # GUT prints file, test name and "at line N" on separate lines: join them.
      useful=$(awk '
        /^= Run Summary/ { s = 1 }
        s && /^res:\/\// { file = $0; sub(/^res:\/\//, "game/", file) }
        s && /^- / { tname = substr($0, 3) }
        s && /\[Failed\]/ { msg = $0; sub(/^ *\[Failed\]: */, "", msg) }
        s && /^ *at line [0-9]+/ { print file ":" $NF " " tname " -- " msg }
      ' "$clean" | head -n 30)
    fi
    if [ -z "$useful" ]; then
      useful=$(grep -E '[A-Za-z0-9_./-]+:[0-9]+|[Ee]rror|FAIL|[Ff]ailed' "$clean" | head -n 30)
    fi
    rm -f "$clean"
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
