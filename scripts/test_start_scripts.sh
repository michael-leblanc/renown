#!/usr/bin/env bash
# test_start_scripts.sh — checks scripts/server.sh, scripts/play.sh and that prototype/
# is gone (NET-005). A verify.sh step. Prints the failures, exits 1 on any.
# Portable: bash 3.2.
set -u
cd "$(dirname "$0")/.." || exit 1

fail=0
bad() { echo "test_start_scripts: $1"; fail=1; }

# server.sh: starts the headless server on the stand-in world, prints the
# addresses and the port, takes --port=N and --seed=N (--tick-limit=N passes through).
PORT=$((26000 + $$ % 3000))
out=$(scripts/server.sh --port=$PORT --seed=7 --tick-limit=5 2>&1) || bad "server.sh failed: $(echo "$out" | tail -n 3)"
echo "$out" | grep -q "port $PORT" || bad "server.sh does not print the port $PORT"
echo "$out" | grep -Eq '([0-9]{1,3}\.){3}[0-9]{1,3}' || bad "server.sh prints no address"
echo "$out" | grep -q "ticks: 5" || bad "server.sh did not run the server (no 'ticks: 5')"
echo "$out" | grep -q "listening on port $PORT" || bad "server.sh: the server did not listen on $PORT"

# play.sh: opens the game with --address, --port and --player (--dry-run prints the command).
out=$(scripts/play.sh --dry-run --address=192.168.1.20 --port=24611 --player=ann 2>&1) || bad "play.sh --dry-run failed"
for want in "--address=192.168.1.20" "--port=24611" "--player=ann"; do
  echo "$out" | grep -q -- "$want" || bad "play.sh does not pass $want"
done
head -n 1 scripts/play.sh | grep -q bash || bad "play.sh is not a bash script"

# prototype/ is gone and nothing outside docs/ names it (the two tests that
# guard against its return are the only exception).
[ -e prototype ] && bad "prototype/ still exists"
names=$(grep -rIl "prototype" . --exclude-dir=.git --exclude-dir=docs --exclude-dir=node_modules --exclude-dir=.godot --exclude-dir=.worktrees --exclude-dir=addons \
  --exclude=test_land.gd --exclude=test_character.gd --exclude=test_start_scripts.sh --exclude=package-lock.json 2>/dev/null)
[ -n "$names" ] && bad "prototype is named in: $(echo $names)"

# CLAUDE.md and scripts/README.md give the commands.
for f in CLAUDE.md scripts/README.md; do
  grep -q "scripts/server.sh" "$f" || bad "$f does not give scripts/server.sh"
  grep -q "scripts/play.sh" "$f" || bad "$f does not give scripts/play.sh"
done

[ "$fail" -eq 0 ] && echo "ok"
exit "$fail"
