#!/usr/bin/env bash
# check_parse.sh — parse-checks every .gd file under game/ (outside addons/ and .godot/).
# Prints "game/<file>: <message>" per bad file and exits 1; prints nothing and exits 0 if all parse.
# Needed because --import and GUT both exit 0 on a parse error in a script no test loads.

set -u
cd "$(dirname "$0")/.." || exit 1

bad=0
while IFS= read -r f; do
  rel=${f#game/}
  out=$(scripts/godot.sh --headless --path game --check-only -s "res://$rel" 2>&1)
  rc=$?
  if [ "$rc" -ne 0 ] || printf '%s' "$out" | grep -q 'Parse Error'; then
    bad=1
    msg=$(printf '%s\n' "$out" | grep -m1 -E 'Parse Error|ERROR' | sed 's/^SCRIPT ERROR: //')
    line=$(printf '%s\n' "$out" | grep -m1 -oE "res://$rel:[0-9]+" | sed 's/^res:\/\//game\//')
    echo "${line:-game/$rel}: ${msg:-parse failed (exit $rc)}"
  fi
done < <(find game -name '*.gd' -not -path 'game/addons/*' -not -path 'game/.godot/*' | sort)
exit "$bad"
