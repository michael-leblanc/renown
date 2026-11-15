#!/usr/bin/env bash
# measure.sh — the tick-time measurement (D6, D184, D186) on this PC.
# Usage: scripts/measure.sh [--count=N] [--budget-ms=MS]
#   no arguments: one line for each of 32, 100, 250, 500, 1000, 2000, 4000, 8000 NPCs,
#                 then the NPC budget, the CPU name, the OS and the Godot version
#   --count=N:    only that count, only its line
# Run it with nothing heavy going on the PC. Portable: bash 3.2.

set -eu
cd "$(dirname "$0")/.." || exit 1

# Import first on a fresh checkout (builds the git-ignored game/.godot/ cache).
if [ ! -d game/.godot ]; then
  scripts/godot.sh --headless --path game --import >/dev/null 2>&1 || true
fi

exec scripts/godot.sh --headless --path game -s tools/measure.gd -- "$@"
