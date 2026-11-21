#!/usr/bin/env bash
# Installs Blender for the art scripts: Blender 4.2.0 as a Python module (bpy), which runs with no screen.
# A Claude cloud session has no `blender` program and starts empty each time, so run this once a session
# (about 1 minute, a 300 MB download from PyPI). A Blender script is then run with Python, not with `blender -b -P`:
#   scripts/art/setup_blender.sh
#   python3.11 scripts/art/blender_style.py --check scripts/art/out/blender-check.png
# Renders use Cycles on the processor; EEVEE needs a graphics card and crashes without one.
# bpy 4.2.0 needs Python 3.11 exactly. PYTHON=<program> picks another Python 3.11.
set -euo pipefail

PY="${PYTHON:-python3.11}"
VERSION="4.2.0"

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "FAIL: $PY not found. bpy $VERSION needs Python 3.11 (set PYTHON=<path to it>)." >&2
  exit 1
fi
if ! "$PY" -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 11) else 1)'; then
  echo "FAIL: $PY is not Python 3.11, which bpy $VERSION needs." >&2
  exit 1
fi

have="$("$PY" -c 'import bpy; print(bpy.app.version_string)' 2>/dev/null | tail -n 1 || true)"
if [ "${have%% *}" = "$VERSION" ]; then
  echo "Blender $have is already installed for $PY"
  exit 0
fi

"$PY" -m pip install --quiet "bpy==$VERSION"
echo "Blender $("$PY" -c 'import bpy; print(bpy.app.version_string)' | tail -n 1) installed for $PY"
