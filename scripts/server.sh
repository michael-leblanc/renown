#!/usr/bin/env bash
# server.sh — starts the headless server on the stand-in world (D173, D214).
# Usage: scripts/server.sh [--port=N] [--seed=N]
#   Prints this machine's addresses on the home network and the port first, then runs
#   the server until Ctrl+C. Other arguments (e.g. --tick-limit=N) go to the server.
#   No saving yet: a restart is a new world (D216).
# Portable: bash 3.2.

set -eu
cd "$(dirname "$0")/.." || exit 1

PORT=$(sed -n 's/.*"net_port"[^0-9]*\([0-9][0-9]*\).*/\1/p' game/data/settings.json | head -n 1)
for arg in "$@"; do
  case "$arg" in --port=*) PORT=${arg#--port=} ;; esac
done

# This machine's IPv4 addresses, loopback left out.
addresses() {
  if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    hostname -I | tr ' ' '\n'
  elif command -v ip >/dev/null 2>&1 && ip -4 -o addr show >/dev/null 2>&1; then
    ip -4 -o addr show | sed -n 's/.* inet \([0-9.]*\).*/\1/p'
  elif command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || true
    ipconfig getifaddr en1 2>/dev/null || true
  elif command -v ifconfig >/dev/null 2>&1; then
    ifconfig | sed -n 's/^[[:space:]]*inet \([0-9.]*\).*/\1/p'
  fi | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | grep -v '^127\.' || true
}

found=$(addresses)
echo "Renown server. Players connect to one of these addresses, on port $PORT:"
if [ -n "$found" ]; then
  echo "$found" | sed 's/^/  /'
else
  echo "  (no network address found: check the connection)"
fi
echo "If another PC cannot connect, open UDP port $PORT in this PC's firewall."

# Import first on a fresh checkout (builds the git-ignored game/.godot/ cache).
if [ ! -d game/.godot ]; then
  scripts/godot.sh --headless --path game --import >/dev/null 2>&1 || true
fi

exec scripts/godot.sh --headless --path game -s server/server_main.gd -- "$@"
