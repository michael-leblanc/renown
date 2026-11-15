#!/usr/bin/env bash
# Proves the verify-on-stop hook (.claude/hooks/verify-on-stop.sh) with a fake project:
# a worktree whose verify.sh fails, and one whose verify.sh passes.
# Prints "PASS" or the failed checks. Exit 0 / 1.

set -u
cd "$(dirname "$0")/.." || exit 1
hook="$PWD/.claude/hooks/verify-on-stop.sh"

root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
for t in bad good; do
  mkdir -p "$root/.worktrees/$t/scripts"
done
printf '#!/usr/bin/env bash\necho "FAIL: test"\necho "game/test/test_x.gd:7 test_boom -- nope"\nexit 1\n' >"$root/.worktrees/bad/scripts/verify.sh"
printf '#!/usr/bin/env bash\necho PASS\nexit 0\n' >"$root/.worktrees/good/scripts/verify.sh"
echo 'worked in .worktrees/bad' >"$root/bad.txt"
echo 'worked in .worktrees/good' >"$root/good.txt"

failed=0
check() { # name, expected exit, expected stderr text, agent, worktree, extra json
  local name=$1 want=$2 text=$3 agent=$4 wt=$5 extra=$6 err code
  err=$(printf '{"agent_type":"%s","agent_transcript_path":"%s/%s.txt"%s}' "$agent" "$root" "$wt" "$extra" |
    CLAUDE_PROJECT_DIR="$root" bash "$hook" 2>&1 >/dev/null)
  code=$?
  if [ "$code" -ne "$want" ] || { [ -n "$text" ] && ! printf '%s' "$err" | grep -q "$text"; }; then
    echo "FAIL: $name (exit $code, wanted $want)"
    failed=1
  fi
}

check "failing implementer is blocked with the failures" 2 "test_boom" implementer bad ""
check "passing implementer may stop" 0 "" implementer good ""
check "other agent may stop even if its worktree fails" 0 "" reviewer bad ""
check "implementer stopping again after the block may finish" 0 "" implementer bad ',"stop_hook_active":true'

[ "$failed" -eq 0 ] && echo PASS
exit "$failed"
