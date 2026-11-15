#!/usr/bin/env bash
# godot.sh — runs the pinned Godot (D1). Usage: scripts/godot.sh <godot args>
# Downloads Godot once into a per-user cache shared by every worktree:
#   Linux: ${XDG_CACHE_HOME:-~/.cache}/renown/godot/<version>/   macOS: ~/Library/Caches/renown/godot/<version>/
# Override the folder that holds the version folders with RENOWN_GODOT_CACHE.
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

# ROOT holds one folder per Godot version. RENOWN_GODOT_CACHE replaces ROOT
# (tests point it at a temp dir); only ROOT/<version> is ever written or removed.
if [ -n "${RENOWN_GODOT_CACHE:-}" ]; then
  ROOT="$RENOWN_GODOT_CACHE"
elif [ "$(uname -s)" = "Darwin" ]; then
  ROOT="$HOME/Library/Caches/renown/godot"
else
  ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/renown/godot"
fi
CACHE="$ROOT/$VERSION"
EXE="$CACHE/$BIN"

if [ ! -x "$EXE" ]; then
  echo "godot.sh: downloading Godot $VERSION into $CACHE (once)..." >&2
  mkdir -p "$ROOT"
  TMP=$(mktemp -d "$ROOT/.download.XXXXXX")
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
  # Two worktrees can start at once on a fresh PC. Swap in whole, and if
  # another run installed first, keep theirs and drop our copy.
  if [ ! -x "$EXE" ]; then
    [ -e "$CACHE" ] && rm -rf "$CACHE"   # a broken, half-made install of ours
    mv "$TMP/out" "$CACHE" 2>/dev/null || [ -x "$EXE" ] || { echo "godot.sh: could not install into $CACHE" >&2; exit 1; }
  fi
  # exec below skips the EXIT trap, so clean up now.
  rm -rf "$TMP"
  trap - EXIT
fi

exec "$EXE" "$@"
