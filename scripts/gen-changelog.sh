#!/usr/bin/env bash
# Gera changelog Markdown a partir de commits convencionais.
#
# Uso:
#   gen-changelog.sh [<since-ref>] [<until-ref>]
#
# Sem args: usa última tag até HEAD.
# 1 arg: usa <since> até HEAD.
# 2 args: usa <since>..<until>.
#
# Agrupa commits por prefixo (feat, fix, docs, etc) e linka PRs/issues
# se mensagem contém "#NNN".
#
# Output: stdout em Markdown.

set -euo pipefail

# Determina range
if [ $# -eq 0 ]; then
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    RANGE="$LAST_TAG..HEAD"
    SINCE_LABEL="$LAST_TAG"
  else
    RANGE="HEAD"
    SINCE_LABEL="(início)"
  fi
elif [ $# -eq 1 ]; then
  RANGE="$1..HEAD"
  SINCE_LABEL="$1"
elif [ $# -eq 2 ]; then
  RANGE="$1..$2"
  SINCE_LABEL="$1"
else
  echo "Uso: $0 [<since-ref>] [<until-ref>]" >&2
  exit 2
fi

REPO_URL=$(git config --get remote.origin.url | sed -E 's|git@github.com:|https://github.com/|; s|\.git$||')

# Buckets
declare -A BUCKETS
BUCKETS[feat]="🚀 Features"
BUCKETS[fix]="🐛 Bug Fixes"
BUCKETS[security]="🔒 Security"
BUCKETS[perf]="⚡ Performance"
BUCKETS[refactor]="♻️ Refactor"
BUCKETS[test]="🧪 Tests"
BUCKETS[docs]="📚 Docs"
BUCKETS[ci]="🤖 CI/Workflows"
BUCKETS[chore]="🧹 Chore"
BUCKETS[other]="📦 Other"

# Print header
TODAY=$(date +%Y-%m-%d)
if [ "$RANGE" = "HEAD" ]; then
  TITLE="Initial release"
else
  HEAD_SHA=$(git rev-parse --short HEAD)
  TITLE="Changes since $SINCE_LABEL — $TODAY"
fi
echo "## $TITLE"
echo ""

# Process commits, fanning out into buckets
declare -A LINES
TOTAL=0
while IFS=$'\x1f' read -r SHA SUBJECT AUTHOR; do
  [ -z "$SHA" ] && continue
  TOTAL=$((TOTAL + 1))
  SHORT=$(echo "$SHA" | cut -c1-8)

  # Detect prefix
  PREFIX=$(echo "$SUBJECT" | grep -oE '^[a-z]+(\([^)]+\))?' | sed -E 's/\(.*//' || true)
  if [ -z "$PREFIX" ] || [ -z "${BUCKETS[$PREFIX]:-}" ]; then
    PREFIX="other"
  fi

  # Strip prefix from subject for cleaner output
  CLEAN_SUBJECT=$(echo "$SUBJECT" | sed -E 's/^[a-z]+(\([^)]+\))?:\s*//')

  # Linkify PR/issue references (#NNN -> [#NNN](url))
  LINKED=$(echo "$CLEAN_SUBJECT" | sed -E "s|#([0-9]+)|[#\1]($REPO_URL/issues/\1)|g")

  # Build line
  LINE="- $LINKED ([$SHORT]($REPO_URL/commit/$SHA))"

  # Append author if multiple
  # (skipped for simplicity — could add @author)

  LINES[$PREFIX]+="$LINE"$'\n'
done < <(git log "$RANGE" --pretty=format:"%H%x1f%s%x1f%an" --reverse)

# Print sections in deterministic order
for key in feat fix security perf refactor test docs ci chore other; do
  if [ -n "${LINES[$key]:-}" ]; then
    echo "### ${BUCKETS[$key]}"
    echo ""
    printf "%s" "${LINES[$key]}"
    echo ""
  fi
done

# Stats footer
CONTRIBUTORS=$(git log "$RANGE" --pretty=format:'%an' | sort -u | wc -l)
echo "---"
echo ""
echo "_$TOTAL commits · $CONTRIBUTORS contributor(s) · gerado por \`scripts/gen-changelog.sh\` em $TODAY._"
