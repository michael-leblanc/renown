#!/usr/bin/env bash
# play.sh — opens the game (D173, D212).
# Usage: scripts/play.sh [--address=IP] [--port=N] [--player=NAME] [--dry-run]
#   With --address the game connects at once; without it, it shows the connect screen.
#   --player=NAME lets two games on one machine be two players. --dry-run only prints
#   the command. Portable: bash 3.2.

set -eu
cd "$(dirname "$0")/.." || exit 1

dry=0
args=()
connect=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry=1 ;;
    --address=*) connect=1; args+=("$arg") ;;
    *) args+=("$arg") ;;
  esac
done
[ "$connect" -eq 1 ] && args+=("--connect")

if [ "$dry" -eq 1 ]; then
  echo "scripts/godot.sh --path game -- ${args[@]+"${args[*]}"}"
  exit 0
fi

# Import first on a fresh checkout (builds the git-ignored game/.godot/ cache).
if [ ! -d game/.godot ]; then
  scripts/godot.sh --headless --path game --import >/dev/null 2>&1 || true
fi

exec scripts/godot.sh --path game -- ${args[@]+"${args[@]}"}
