#!/usr/bin/env bash
# Posta Adaptive Card no canal Teams via webhook do Workflows (Power Automate).
#
# Uso:
#   notify-teams.sh --title "Titulo" --message "Texto" [--color good|warning|attention|accent]
#                   [--link "https://..." --link-text "Abrir"]
#                   [--fact "chave=valor" --fact "outra=valor"]
#
# Requer env: TEAMS_WEBHOOK_URL
# Silencioso se TEAMS_WEBHOOK_URL nao estiver setado (no-op, sai 0) para nao
# quebrar workflows em forks ou ambientes sem integracao.

set -euo pipefail

TITLE=""
MESSAGE=""
COLOR="accent"
LINK=""
LINK_TEXT="Abrir"
FACTS_JSON="[]"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --message) MESSAGE="$2"; shift 2 ;;
    --color) COLOR="$2"; shift 2 ;;
    --link) LINK="$2"; shift 2 ;;
    --link-text) LINK_TEXT="$2"; shift 2 ;;
    --fact)
      kv="$2"
      k="${kv%%=*}"
      v="${kv#*=}"
      FACTS_JSON=$(jq --arg t "$k" --arg v "$v" '. + [{"title":$t,"value":$v}]' <<<"$FACTS_JSON")
      shift 2 ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$TITLE" || -z "$MESSAGE" ]]; then
  echo "notify-teams: --title e --message sao obrigatorios" >&2
  exit 2
fi

if [[ -z "${TEAMS_WEBHOOK_URL:-}" ]]; then
  echo "notify-teams: TEAMS_WEBHOOK_URL nao definido — pulando notificacao."
  exit 0
fi

ACTIONS_JSON="[]"
if [[ -n "$LINK" ]]; then
  ACTIONS_JSON=$(jq -n --arg t "$LINK_TEXT" --arg u "$LINK" \
    '[{"type":"Action.OpenUrl","title":$t,"url":$u}]')
fi

PAYLOAD=$(jq -n \
  --arg title "$TITLE" \
  --arg message "$MESSAGE" \
  --arg color "$COLOR" \
  --argjson facts "$FACTS_JSON" \
  --argjson actions "$ACTIONS_JSON" \
  '{
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: ([
          { type: "TextBlock", text: $title, weight: "Bolder", size: "Medium", color: $color, wrap: true },
          { type: "TextBlock", text: $message, wrap: true }
        ] + (if ($facts | length) > 0 then [{ type: "FactSet", facts: $facts }] else [] end)),
        actions: $actions
      }
    }]
  }')

HTTP_CODE=$(curl -sS -o /tmp/notify-teams.out -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST -d "$PAYLOAD" \
  "$TEAMS_WEBHOOK_URL" || echo "000")

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "notify-teams: enviado ($HTTP_CODE)"
else
  echo "notify-teams: FALHOU ($HTTP_CODE) — resposta:" >&2
  cat /tmp/notify-teams.out >&2 || true
  # Nao propaga falha pra nao quebrar workflow principal por causa de notify
  exit 0
fi
