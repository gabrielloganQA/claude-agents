#!/usr/bin/env bash
# Calcula score 0-100 de risco de uma PR baseado em métricas estáticas.
#
# Uso (em GitHub Actions):
#   pr-risk-score.sh <base-sha> <head-sha>
#
# Output: stdout em formato Markdown pronto pra comment.
#
# Métricas:
#   - Lines changed (cap 40 pts)
#   - Files changed (cap 15 pts)
#   - High-risk paths touched (cap 30 pts) — config, lock files, workflows
#   - Sem test no diff (cap 15 pts)

set -euo pipefail

BASE="${1:-origin/main}"
HEAD="${2:-HEAD}"

# Métricas básicas
STATS=$(git diff --shortstat "$BASE...$HEAD" || echo "")
LINES_ADDED=$(echo "$STATS" | grep -oE '[0-9]+ insertion' | grep -oE '^[0-9]+' || echo 0)
LINES_REMOVED=$(echo "$STATS" | grep -oE '[0-9]+ deletion' | grep -oE '^[0-9]+' || echo 0)
TOTAL_LINES=$((LINES_ADDED + LINES_REMOVED))
FILES_CHANGED=$(git diff --name-only "$BASE...$HEAD" | wc -l)

# Score: linhas (0-40)
if [ $TOTAL_LINES -le 50 ]; then LINES_SCORE=5
elif [ $TOTAL_LINES -le 200 ]; then LINES_SCORE=15
elif [ $TOTAL_LINES -le 500 ]; then LINES_SCORE=25
elif [ $TOTAL_LINES -le 1000 ]; then LINES_SCORE=35
else LINES_SCORE=40
fi

# Score: arquivos (0-15)
if [ $FILES_CHANGED -le 3 ]; then FILES_SCORE=2
elif [ $FILES_CHANGED -le 10 ]; then FILES_SCORE=8
elif [ $FILES_CHANGED -le 30 ]; then FILES_SCORE=12
else FILES_SCORE=15
fi

# Score: high-risk paths (0-30)
HIGH_RISK_FILES=$(git diff --name-only "$BASE...$HEAD" | grep -E '(package(-lock)?\.json|\.github/workflows/|next\.config\.|playwright\.config\.|stryker\.conf\.|\.env|\.claude/settings\.json|CLAUDE\.md|eslint\.config\.|tsconfig\.)' || true)
RISK_FILES_COUNT=$(echo -n "$HIGH_RISK_FILES" | grep -c . || true)
if [ $RISK_FILES_COUNT -eq 0 ]; then RISK_SCORE=0
elif [ $RISK_FILES_COUNT -le 2 ]; then RISK_SCORE=15
else RISK_SCORE=30
fi

# Score: ausência de teste no diff (0-15)
ALL_FILES=$(git diff --name-only "$BASE...$HEAD" 2>/dev/null || echo "")
HAS_TEST=$(echo "$ALL_FILES" | { grep -E '(\.test\.|\.spec\.|/tests?/)' || true; } | grep -c . || true)
HAS_PROD=$(echo "$ALL_FILES" | { grep -E '(\.js|\.jsx|\.ts|\.tsx)$' || true; } | { grep -vE '(\.test\.|\.spec\.|/tests?/)' || true; } | grep -c . || true)
HAS_TEST=${HAS_TEST:-0}
HAS_PROD=${HAS_PROD:-0}

if [ $HAS_PROD -gt 0 ] && [ $HAS_TEST -eq 0 ]; then
  NOTEST_SCORE=15
elif [ $HAS_PROD -gt 0 ] && [ $HAS_TEST -lt $HAS_PROD ]; then
  NOTEST_SCORE=7
else
  NOTEST_SCORE=0
fi

TOTAL_SCORE=$((LINES_SCORE + FILES_SCORE + RISK_SCORE + NOTEST_SCORE))

# Classificação visual
if [ $TOTAL_SCORE -le 25 ]; then EMOJI="🟢"; CLASS="Baixo"
elif [ $TOTAL_SCORE -le 55 ]; then EMOJI="🟡"; CLASS="Médio"
else EMOJI="🔴"; CLASS="Alto"
fi

# Output Markdown
cat <<EOF
## $EMOJI PR Risk Score: **$TOTAL_SCORE / 100** ($CLASS)

| Dimensão | Pontos | Detalhe |
|---|---:|---|
| Linhas alteradas | $LINES_SCORE / 40 | $TOTAL_LINES linhas ($LINES_ADDED+, $LINES_REMOVED-) |
| Arquivos tocados | $FILES_SCORE / 15 | $FILES_CHANGED arquivo(s) |
| Arquivos de risco | $RISK_SCORE / 30 | $RISK_FILES_COUNT arquivo(s) crítico(s) |
| Cobertura de testes | $NOTEST_SCORE / 15 | $HAS_TEST teste(s) / $HAS_PROD produção |

EOF

if [ -n "$HIGH_RISK_FILES" ]; then
  cat <<EOF
<details><summary>Arquivos críticos modificados</summary>

\`\`\`
$HIGH_RISK_FILES
\`\`\`

</details>

EOF
fi

if [ $TOTAL_SCORE -gt 55 ]; then
  cat <<EOF
⚠️ **Sugestões para PR de risco alto**:
- Considere quebrar em PRs menores
- Confirme que o teste manual cobre as áreas críticas
- Adicione reviewer extra
- Revise rollback plan
EOF
elif [ $TOTAL_SCORE -gt 25 ]; then
  cat <<EOF
💡 Algumas dimensões merecem atenção. Revisão padrão recomendada.
EOF
else
  cat <<EOF
✅ PR de baixo risco. Revisão rápida recomendada.
EOF
fi

cat <<EOF

_Calculado por [\`scripts/pr-risk-score.sh\`](../blob/main/scripts/pr-risk-score.sh) — heurístico, não substitui julgamento humano._
EOF
