#!/usr/bin/env bash
# Seleciona quais testes rodar baseado no diff de uma PR.
#
# Heurística (simples mas eficaz pra projetos pequenos):
#   - Se diff toca em config/workflow/lock → roda tudo (full).
#   - Se diff só toca em docs/comments → roda nada.
#   - Senão: roda API tests sempre (são rápidos) + Playwright só se
#     diff toca sample-app/app/page.js, layout.js ou tests/web/*.
#
# Uso:
#   select-tests.sh <base-sha> <head-sha>
#
# Output (env var format pra GITHUB_OUTPUT):
#   run_api=true|false
#   run_web=true|false
#   strategy=full|partial|skip
#   reason="..."

set -euo pipefail

BASE="${1:-origin/main}"
HEAD="${2:-HEAD}"

FILES=$(git diff --name-only "$BASE...$HEAD" 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "run_api=false"
  echo "run_web=false"
  echo "strategy=skip"
  echo "reason=Sem arquivos no diff."
  exit 0
fi

# Categorizar
HAS_CONFIG=$(echo "$FILES" | { grep -E '(package(-lock)?\.json|\.github/workflows/|next\.config\.|playwright\.config\.|eslint\.config\.|\.claude/settings\.json|stryker\.conf\.)' || true; } | grep -c . || true)
HAS_API=$(echo "$FILES" | { grep -E '(sample-app/app/api/|tests/api/)' || true; } | grep -c . || true)
HAS_WEB=$(echo "$FILES" | { grep -E '(sample-app/app/(page|layout)\.|tests/web/)' || true; } | grep -c . || true)
HAS_PROD=$(echo "$FILES" | { grep -E '(sample-app/app/)' || true; } | { grep -vE '(\.test\.|\.spec\.)' || true; } | grep -c . || true)
HAS_DOCS_ONLY=$(echo "$FILES" | { grep -vE '(\.md$|^docs/|^README|LICENSE|CONTRIBUTING)' || true; } | grep -c . || true)

# Decisão
if [ "${HAS_CONFIG:-0}" -gt 0 ]; then
  echo "run_api=true"
  echo "run_web=true"
  echo "strategy=full"
  echo "reason=Config/workflow/lock alterado — rodar suite completa por segurança."
  exit 0
fi

if [ "${HAS_DOCS_ONLY:-0}" -eq 0 ]; then
  echo "run_api=false"
  echo "run_web=false"
  echo "strategy=skip"
  echo "reason=Diff só docs/markdown — sem necessidade de rodar testes."
  exit 0
fi

# Caso geral: API sempre (rápido), Web condicional
RUN_API="true"
if [ "${HAS_WEB:-0}" -gt 0 ] || [ "${HAS_PROD:-0}" -gt 0 ]; then
  RUN_WEB="true"
  STRATEGY="full"
  REASON="Diff toca UI ou rotas — rodar API + Web."
else
  RUN_WEB="false"
  STRATEGY="partial"
  REASON="Diff só em API/store — pulando Playwright."
fi

echo "run_api=$RUN_API"
echo "run_web=$RUN_WEB"
echo "strategy=$STRATEGY"
echo "reason=$REASON"
