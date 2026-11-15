#!/usr/bin/env bash
# check_parse.sh — parse-checks every .gd file under game/ (outside addons/ and .godot/)
# in ONE Godot process (check_parse.gd loads each one).
# Prints "game/<file>:<line>: <message>" per bad file and exits 1; prints nothing and exits 0 if all load.
# Needed because --import and GUT both exit 0 on a parse error in a script no test loads.

set -u
cd "$(dirname "$0")/.." || exit 1

out=$(scripts/godot.sh --headless --path game -s ../scripts/check_parse.gd 2>&1 </dev/null)
rc=$?
printf '%s\n' "$out" | sed "s/$(printf '\033')\\[[0-9;]*m//g" | awk '
  /^SCRIPT ERROR: Parse Error:/ { msg = $0; sub(/^SCRIPT ERROR: Parse Error: */, "", msg) }
  /^ *at: GDScript::reload \(res:\/\// {
    loc = $0; sub(/^.*\(res:\/\//, "", loc); sub(/\)$/, "", loc)
    f = loc; sub(/:[0-9]+$/, "", f)
    if (!(f in seen)) { seen[f] = 1; where[f] = "game/" loc; why[f] = msg }
  }
  /^BAD res:\/\// { p = $2; sub(/^res:\/\//, "", p); bad[p] = 1; order[++n] = p }
  END {
    for (i = 1; i <= n; i++) {
      p = order[i]
      if (p in seen) print where[p] ": " why[p]
      else print "game/" p ": failed to load"
    }
  }' > "${TMPDIR:-/tmp}/check_parse.$$"
cat "${TMPDIR:-/tmp}/check_parse.$$"
bad=0
[ -s "${TMPDIR:-/tmp}/check_parse.$$" ] && bad=1
rm -f "${TMPDIR:-/tmp}/check_parse.$$"
if [ "$rc" -ne 0 ] && [ "$bad" -eq 0 ]; then
  echo "game: check_parse.gd failed to run (exit $rc)"
  printf '%s\n' "$out" | tail -n 5
  bad=1
fi
exit "$bad"
