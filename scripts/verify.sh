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
# so every .gd file under game/ outside addons/ is loaded (one process).
# test: no -d (the debugger stops on a script error: false PASS or a hang).
#   A run that executes zero tests fails too (see below).
STEPS=(
  "import|scripts/godot.sh --headless --path game --import"
  "parse|scripts/check_parse.sh"
  "testnames|scripts/check_test_names.sh"
  "test|scripts/godot.sh --headless --path game -s addons/gut/gut_cmdln.gd -gexit </dev/null"
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
  ok=1
  bash -c "$cmd" >"$LOG" 2>&1 || ok=0
  clean=$(mktemp)
  sed "s/$(printf '\033')\\[[0-9;]*m//g" "$LOG" >"$clean"
  extra=""
  if [ "$ok" -eq 1 ] && [ "$name" = "test" ] && ! grep -qE '^Tests +[1-9][0-9]*' "$clean"; then
    ok=0
    extra="game/test: no tests ran (check file names: test_*.gd)"
  fi
  if [ "$ok" -eq 0 ]; then
    failed=1
    echo "FAIL: $name"
    useful=""
    if [ "$name" = "test" ]; then
      # GUT prints file, test name and "at line N" on separate lines: join them.
      # A script error in a test says "at line -1"; its real place is on an
      # earlier "at: <test> (res://file.gd:N)" line.
      useful=$(awk '
        /^ *at: [A-Za-z0-9_]+ \(res:\/\// {
          n = $2; loc = $0; sub(/^.*\(res:\/\//, "", loc); sub(/\)$/, "", loc); errat[n] = "game/" loc
        }
        /^= Run Summary/ { s = 1 }
        s && /^res:\/\// { file = $0; sub(/^res:\/\//, "game/", file) }
        s && /^- / { tname = substr($0, 3) }
        s && /\[Failed\]/ { msg = $0; sub(/^ *\[Failed\]: */, "", msg) }
        s && /^ *at line -?[0-9]+/ {
          if ($NF == "-1" && (tname in errat)) where = errat[tname]; else where = file ":" $NF
          print where " " tname " -- " msg
        }
      ' "$clean" | head -n 30)
    fi
    if [ -z "$useful" ]; then
      useful=$(grep -E '[A-Za-z0-9_./-]+:[0-9]+|[Ee]rror|FAIL|[Ff]ailed' "$clean" | head -n 30)
    fi
    [ -n "$extra" ] && useful="$extra"
    if [ -n "$useful" ]; then
      printf '%s\n' "$useful"
    else
      tail -n 20 "$clean"
    fi
  fi
  rm -f "$clean"
done

if [ "$failed" -eq 0 ]; then
  echo "PASS"
fi
exit "$failed"
