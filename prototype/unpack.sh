#!/usr/bin/env bash
# unpack.sh — copies the test game's art (D201) into prototype/art/.
# Only the files listed in prototype/art.txt are copied. The result is
# committed, so a fresh worktree has the art without running this.
#
# Where the art sources are: the main checkout's root (found through git, so it
# works from any worktree), or the folder in RENOWN_ART_SRC. Both are needed there:
#   "Fantasy tileset - 2D Isometric V1.1.zip"   (the green one; never the Desert zip)
#   "Stand-alone Character creator - 2D Fantasy V1.3/"
# Usage: prototype/unpack.sh
# Portable: bash 3.2, no GNU-only flags.

set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
LIST="$HERE/art.txt"
OUT="$HERE/art"
TILE_ZIP="Fantasy tileset - 2D Isometric V1.1.zip"
TILE_DIR="Fantasy tileset - 2D Isometric/Environment"
CREATOR_DIR="Stand-alone Character creator - 2D Fantasy V1.3"
CREATOR_SUB="Fantasy Character Creator_Data/StreamingAssets/Spritesheets"

if [ -n "${RENOWN_ART_SRC:-}" ]; then
  SRC="$RENOWN_ART_SRC"
else
  COMMON=$(git -C "$HERE" rev-parse --git-common-dir) || { echo "unpack.sh: not in a git checkout; set RENOWN_ART_SRC" >&2; exit 1; }
  case "$COMMON" in /*) ;; *) COMMON="$HERE/$COMMON" ;; esac
  SRC=$(cd "$COMMON/.." && pwd)
fi

ZIP="$SRC/$TILE_ZIP"
SHEETS="$SRC/$CREATOR_DIR/$CREATOR_SUB"
[ -f "$ZIP" ] || { echo "unpack.sh: missing $ZIP (set RENOWN_ART_SRC to the folder that holds the art)" >&2; exit 1; }
[ -d "$SHEETS" ] || { echo "unpack.sh: missing $SHEETS (set RENOWN_ART_SRC to the folder that holds the art)" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unpack.sh: needs unzip" >&2; exit 1; }

TMP=$(mktemp -d "${TMPDIR:-/tmp}/renown-art.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# Read the list: creator files are copied straight away, tile names are
# collected so the zip is opened once.
TILES=()
creator=0
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  kind=${line%% *}
  path=${line#* }
  case "$path" in /*|*..*) echo "unpack.sh: bad path in art.txt: $line" >&2; exit 1 ;; esac
  case "$kind" in
    creator)
      [ -f "$SHEETS/$path" ] || { echo "unpack.sh: missing Creator file: $path" >&2; exit 1; }
      mkdir -p "$OUT/creator/$(dirname "$path")"
      cp "$SHEETS/$path" "$OUT/creator/$path"
      creator=$((creator + 1))
      ;;
    tiles) TILES+=("$path") ;;
    *) echo "unpack.sh: unknown source in art.txt: $line" >&2; exit 1 ;;
  esac
done < "$LIST"

tiles=0
if [ "${#TILES[@]}" -gt 0 ]; then
  ARGS=()
  for t in "${TILES[@]}"; do ARGS+=("$TILE_DIR/$t"); done
  # -j: no folders. Names have spaces and no wildcard characters.
  unzip -q -o -j "$ZIP" "${ARGS[@]}" -d "$TMP" >/dev/null || { echo "unpack.sh: a tile in art.txt is not in the zip" >&2; exit 1; }
  mkdir -p "$OUT/tiles"
  for t in "${TILES[@]}"; do
    [ -f "$TMP/$t" ] || { echo "unpack.sh: missing tile after unzip: $t" >&2; exit 1; }
    cp "$TMP/$t" "$OUT/tiles/$t"
    tiles=$((tiles + 1))
  done
fi

echo "unpack.sh: $creator Creator files, $tiles tiles -> prototype/art/"
