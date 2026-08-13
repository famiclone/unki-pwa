#!/usr/bin/env sh
set -eu

RED='\033[1;31m'
YLW='\033[1;33m'
GRN='\033[1;32m'
RST='\033[0m'

if [ "${SKIP_README_CHECK:-}" = "1" ]; then
  printf '%b\n' "${YLW}⚠ SKIP_README_CHECK=1 — README pre-push check skipped.${RST}"
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
upstream=""
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}')"
fi

if [ -n "$upstream" ]; then
  range="${upstream}..HEAD"
elif git rev-parse --verify "origin/${branch}" >/dev/null 2>&1; then
  range="origin/${branch}..HEAD"
elif git rev-parse --verify origin/develop >/dev/null 2>&1; then
  range="origin/develop..HEAD"
elif git rev-parse --verify origin/main >/dev/null 2>&1; then
  range="origin/main..HEAD"
else
  range=""
fi

readme_in_push=0
if [ -n "$range" ] && [ -n "$(git rev-list --max-count=1 ${range} 2>/dev/null || true)" ]; then
  if git diff --name-only "$range" -- README.md | grep -qx 'README.md'; then
    readme_in_push=1
  fi
fi

printf '\n'
printf '%b\n' "${YLW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
printf '%b\n' "${YLW}  README CHECK  Update docs before pushing.${RST}"
printf '%b\n' "${YLW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
printf '\n'

if [ "$readme_in_push" -eq 1 ]; then
  printf '%b\n\n' "${GRN}✓ README.md is included in the commits being pushed.${RST}"
  exit 0
fi

printf '%b\n' "${RED}✗ README.md was not changed in the unpushed commits.${RST}"
printf '\n'
printf '  Per project rules, update README.md to describe new features,\n'
printf '  commit that documentation change, then push again.\n'
printf '\n'
printf '  To bypass (not recommended):\n'
printf '    SKIP_README_CHECK=1 git push\n'
printf '\n'
exit 1
