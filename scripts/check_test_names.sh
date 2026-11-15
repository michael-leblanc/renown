#!/usr/bin/env bash
# check_test_names.sh — every .gd under game/test/ must be named test_*.gd, or GUT
# silently skips it. Helpers go in a folder named helpers/ (GUT only loads test_*.gd).
set -u
cd "$(dirname "$0")/.." || exit 1
[ -d game/test ] || exit 0
bad=$(find game/test -name '*.gd' ! -name 'test_*.gd' ! -path '*/helpers/*' | sort)
if [ -n "$bad" ]; then
  printf '%s\n' "$bad" | sed 's/$/: test files must be named test_*.gd (helpers go in game\/test\/helpers\/)/'
  exit 1
fi
exit 0
