#!/usr/bin/env bash
# godot.sh — runs the pinned Godot (D1). Usage: scripts/godot.sh <godot args>
# Downloads Godot once into a per-user cache shared by every worktree:
#   Linux/macOS: ${XDG_CACHE_HOME:-~/.cache}/renown/godot/<version>/
# Override the cache folder with RENOWN_GODOT_CACHE (tests use a temp dir).
# Progress goes to stderr, so Godot's own output on stdout stays clean.
# Portable: bash 3.2, no GNU-only flags.

set -eu

VERSION="4.7.2-stable"
BASE="https://github.com/godotengine/godot/releases/download/$VERSION"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  ZIP="Godot_v${VERSION}_linux.x86_64.zip"; BIN="Godot_v${VERSION}_linux.x86_64" ;;
  Linux-aarch64|Linux-arm64) ZIP="Godot_v${VERSION}_linux.arm64.zip"; BIN="Godot_v${VERSION}_linux.arm64" ;;
  Darwin-*)      ZIP="Godot_v${VERSION}_macos.universal.zip"; BIN="Godot.app/Contents/MacOS/Godot" ;;
  *) echo "godot.sh: unsupported system $(uname -s)-$(uname -m). On Windows, see the UAT page of SIM-007." >&2; exit 1 ;;
esac

if [ -n "${RENOWN_GODOT_CACHE:-}" ]; then
  CACHE="$RENOWN_GODOT_CACHE"
elif [ "$(uname -s)" = "Darwin" ]; then
  CACHE="$HOME/Library/Caches/renown/godot/$VERSION"
else
  CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/renown/godot/$VERSION"
fi
EXE="$CACHE/$BIN"

if [ ! -x "$EXE" ]; then
  echo "godot.sh: downloading Godot $VERSION into $CACHE (once)..." >&2
  mkdir -p "$(dirname "$CACHE")"
  TMP=$(mktemp -d "$(dirname "$CACHE")/.download.XXXXXX")
  trap 'rm -rf "$TMP"' EXIT
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$TMP/godot.zip" "$BASE/$ZIP" >&2
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$TMP/godot.zip" "$BASE/$ZIP" >&2
  else
    echo "godot.sh: needs curl or wget to download Godot." >&2; exit 1
  fi
  mkdir "$TMP/out"
  unzip -q "$TMP/godot.zip" -d "$TMP/out" >&2
  chmod +x "$TMP/out/$BIN"
  # Swap in whole, so a half-finished download never looks installed.
  rm -rf "$CACHE"
  mv "$TMP/out" "$CACHE"
fi

exec "$EXE" "$@"
