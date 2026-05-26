#!/usr/bin/env bash
# claude-agents installer — bootstrap o framework de QA multi-agente num repo.
#
# Uso:
#   curl -sSL https://raw.githubusercontent.com/gabrielloganQA/claude-agents/main/install.sh | bash
#   ou
#   bash install.sh [--dry-run] [--framework-ref v1]
#
# O script eh IDEMPOTENTE: rodar duas vezes nao quebra nada.
# Nada eh sobrescrito sem confirmacao. Sempre mostra diff antes.

set -euo pipefail

FRAMEWORK_OWNER="gabrielloganQA"
FRAMEWORK_REPO="claude-agents"
FRAMEWORK_REF="${FRAMEWORK_REF:-main}"
DRY_RUN=false

# ---- parse args ----
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --framework-ref) FRAMEWORK_REF="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

# ---- helpers ----
log()  { printf "\033[1;34m[install]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[erro]\033[0m %s\n" "$*" >&2; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N] " response
  [[ "$response" =~ ^[Yy]$ ]]
}

write_if_absent() {
  local path="$1"
  local content="$2"
  if [[ -f "$path" ]]; then
    warn "Ja existe: $path — nao sobrescrevendo."
    return 1
  fi
  if [[ "$DRY_RUN" == "true" ]]; then
    log "(dry-run) criaria: $path"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  printf "%s" "$content" > "$path"
  ok "Criado: $path"
}

# ---- pre-checks ----
log "claude-agents installer — framework ref: $FRAMEWORK_REF"

if ! command -v gh >/dev/null; then
  err "GitHub CLI 'gh' nao instalado. Veja https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh nao autenticado. Rode: gh auth login"
  exit 1
fi

if [[ ! -d ".git" ]]; then
  err "Nao parece ser um repo git. Rode dentro da raiz do projeto."
  exit 1
fi

# Detecta repo no GitHub via remote
REPO_FULL=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "")
if [[ -z "$REPO_FULL" ]]; then
  err "Repo nao reconhecido pelo gh. Tem remote origin no GitHub?"
  exit 1
fi
log "Repo alvo: $REPO_FULL"

# ---- detector de stack ----
detect_stack() {
  local stack="unknown"
  local test_cmd=""
  local needs_server="false"
  local dev_cmd="npm run dev"
  local build_cmd=""

  if [[ -f "package.json" ]]; then
    if grep -q '"playwright"' package.json 2>/dev/null; then
      stack="node-playwright"
      test_cmd="npx playwright test"
      needs_server="true"
    elif grep -q '"cypress"' package.json 2>/dev/null; then
      stack="node-cypress"
      test_cmd="npx cypress run"
      needs_server="true"
    elif grep -q '"jest"' package.json 2>/dev/null; then
      stack="node-jest"
      test_cmd="npm test"
      needs_server="false"
    elif grep -q '"vitest"' package.json 2>/dev/null; then
      stack="node-vitest"
      test_cmd="npm test"
      needs_server="false"
    else
      stack="node-generic"
      test_cmd="npm test"
    fi

    # Next.js detecta build
    if grep -q '"next"' package.json 2>/dev/null; then
      build_cmd="npm run build"
      stack="${stack}-next"
    fi

    # Tenta inferir test script especifico (cy:qa, test:e2e, etc)
    if grep -qE '"cy:qa"|"test:e2e"|"e2e"' package.json 2>/dev/null; then
      if grep -q '"cy:qa"' package.json; then test_cmd="npm run cy:qa"; fi
      if grep -q '"test:e2e"' package.json; then test_cmd="npm run test:e2e"; fi
    fi
  elif [[ -f "pyproject.toml" || -f "requirements.txt" || -f "setup.py" ]]; then
    stack="python"
    test_cmd="pytest"
    needs_server="false"
  elif [[ -f "go.mod" ]]; then
    stack="go"
    test_cmd="go test ./..."
    needs_server="false"
  fi

  echo "$stack|$test_cmd|$needs_server|$dev_cmd|$build_cmd"
}

IFS='|' read -r STACK TEST_CMD NEEDS_SERVER DEV_CMD BUILD_CMD <<< "$(detect_stack)"
log "Stack detectado: $STACK"
log "  Test command:    $TEST_CMD"
log "  Build command:   ${BUILD_CMD:-<none>}"
log "  Needs dev server: $NEEDS_SERVER"

# ---- gera workflows caller ----
QA_WORKFLOW=$(cat <<EOF
name: QA
on:
  push:
    branches: [main, master, qa]
  pull_request:
    branches: [main, master, qa]
  workflow_dispatch:

jobs:
  qa:
    uses: ${FRAMEWORK_OWNER}/${FRAMEWORK_REPO}/.github/workflows/qa-reusable.yml@${FRAMEWORK_REF}
    with:
      test-cmd: "${TEST_CMD}"
      needs-dev-server: ${NEEDS_SERVER}
      build-cmd: "${BUILD_CMD}"
    secrets:
      TEAMS_WEBHOOK_URL: \${{ secrets.TEAMS_WEBHOOK_URL }}
EOF
)

NOTIFY_ISSUES=$(cat <<EOF
name: Notify Teams — issues
on:
  issues:
    types: [opened, labeled]

jobs:
  notify:
    uses: ${FRAMEWORK_OWNER}/${FRAMEWORK_REPO}/.github/workflows/notify-issues-reusable.yml@${FRAMEWORK_REF}
    secrets:
      TEAMS_WEBHOOK_URL: \${{ secrets.TEAMS_WEBHOOK_URL }}
EOF
)

NOTIFY_PRS=$(cat <<EOF
name: Notify Teams — PRs
on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  notify:
    uses: ${FRAMEWORK_OWNER}/${FRAMEWORK_REPO}/.github/workflows/notify-prs-reusable.yml@${FRAMEWORK_REF}
    secrets:
      TEAMS_WEBHOOK_URL: \${{ secrets.TEAMS_WEBHOOK_URL }}
EOF
)

AGENTS_CONFIG=$(cat <<EOF
{
  "stack": "${STACK}",
  "commands": {
    "test": "${TEST_CMD}",
    "build": "${BUILD_CMD}",
    "dev": "${DEV_CMD}",
    "lint": "npm run lint"
  },
  "framework": {
    "repo": "${FRAMEWORK_OWNER}/${FRAMEWORK_REPO}",
    "ref": "${FRAMEWORK_REF}"
  }
}
EOF
)

# ---- mostra plano ----
echo ""
log "=== Plano de instalacao em $REPO_FULL ==="
echo ""
echo "Arquivos que SERAO criados (so se nao existirem):"
echo "  .github/workflows/qa.yml"
echo "  .github/workflows/notify-issues.yml"
echo "  .github/workflows/notify-prs.yml"
echo "  .claude/agents.config.json"
echo ""
echo "Labels que SERAO criadas no GitHub (idempotente):"
echo "  bug, qa-found, qa-ci, security, a11y, perf, mutation, triaged,"
echo "  priority:high, priority:medium, priority:low, auto-update"
echo ""
echo "Nada eh sobrescrito. Settings.json/CLAUDE.md/agents existentes ficam intactos."
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  log "Modo dry-run — saindo sem aplicar."
  exit 0
fi

if ! confirm "Aplicar?"; then
  log "Cancelado pelo usuario."
  exit 0
fi

# ---- aplica ----
write_if_absent ".github/workflows/qa.yml" "$QA_WORKFLOW" || true
write_if_absent ".github/workflows/notify-issues.yml" "$NOTIFY_ISSUES" || true
write_if_absent ".github/workflows/notify-prs.yml" "$NOTIFY_PRS" || true
write_if_absent ".claude/agents.config.json" "$AGENTS_CONFIG" || true

# Labels
log "Criando labels no GitHub..."
declare -A LABELS=(
  ["bug"]="d73a4a|Defeito reportado"
  ["qa-found"]="d73a4a|Aberto pelo qa-tester"
  ["qa-ci"]="d73a4a|Aberto pelo workflow CI"
  ["security"]="b60205|Achado de seguranca"
  ["a11y"]="0e8a16|Violacao WCAG"
  ["perf"]="fbca04|Regressao de performance"
  ["mutation"]="c5def5|Mutante sobrevivente"
  ["triaged"]="ededed|Issue priorizada"
  ["priority:high"]="b60205|Alta prioridade"
  ["priority:medium"]="fbca04|Media prioridade"
  ["priority:low"]="0e8a16|Baixa prioridade"
  ["auto-update"]="0e8a16|PR/issue de atualizacao automatica"
)
for label in "${!LABELS[@]}"; do
  IFS='|' read -r color desc <<< "${LABELS[$label]}"
  gh label create "$label" --color "$color" --description "$desc" 2>/dev/null \
    && ok "  label '$label' criada" \
    || true
done

# Secret check
echo ""
if gh secret list --json name --jq '.[].name' | grep -q "^TEAMS_WEBHOOK_URL$"; then
  ok "Secret TEAMS_WEBHOOK_URL ja existe no repo."
else
  warn "Secret TEAMS_WEBHOOK_URL nao encontrado."
  warn "Configure manualmente em:"
  warn "  https://github.com/${REPO_FULL}/settings/secrets/actions/new"
  warn "Sem o secret, notificacoes Teams ficam silenciosas (no-op)."
fi

echo ""
ok "Instalacao completa em $REPO_FULL"
echo ""
log "Proximos passos:"
echo "  1. Revisar os 4 arquivos criados:"
echo "     git diff --cached || git status"
echo "  2. Commitar e abrir PR:"
echo "     git add .github/workflows/qa.yml .github/workflows/notify-issues.yml .github/workflows/notify-prs.yml .claude/agents.config.json"
echo "     git commit -m 'ci: integra claude-agents framework'"
echo "  3. Configurar TEAMS_WEBHOOK_URL se ainda nao foi."
echo "  4. Push e o primeiro CI rodara via reusable workflows."
