#!/usr/bin/env bash
# Envia notificação Adaptive Card para webhook do Microsoft Teams.
#
# Uso:
#   notify-teams.sh <kind> <title> <body> <url>
#
# kind: failure | pr | bug | security | info
#
# Requer:
#   - TEAMS_WEBHOOK_URL no ambiente (vem de GitHub Secret)
#   - jq instalado (já vem no runner ubuntu-latest)
#
# Falha silenciosa se webhook não estiver configurado — feature opcional.

set -euo pipefail

KIND="${1:-info}"
TITLE="${2:-Notificação}"
BODY="${3:-}"
LINK="${4:-}"

if [ -z "${TEAMS_WEBHOOK_URL:-}" ]; then
  echo "::notice::TEAMS_WEBHOOK_URL não configurado — pulando notificação ($KIND)."
  exit 0
fi

case "$KIND" in
  failure)
    EMOJI="🔴"
    COLOR="Attention"
    HEADER="Pipeline falhou"
    ;;
  pr)
    EMOJI="📥"
    COLOR="Accent"
    HEADER="PR aberta por agente"
    ;;
  bug)
    EMOJI="🐛"
    COLOR="Warning"
    HEADER="Bug detectado"
    ;;
  security)
    EMOJI="🔒"
    COLOR="Attention"
    HEADER="Issue de segurança"
    ;;
  *)
    EMOJI="ℹ️"
    COLOR="Default"
    HEADER="Aviso"
    ;;
esac

PAYLOAD=$(jq -n \
  --arg emoji "$EMOJI" \
  --arg header "$HEADER" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --arg link "$LINK" \
  --arg color "$COLOR" \
  '{
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      contentUrl: null,
      content: {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "TextBlock",
            text: ($emoji + " " + $header),
            size: "Large",
            weight: "Bolder",
            color: $color,
            wrap: true
          },
          {
            type: "TextBlock",
            text: $title,
            wrap: true,
            spacing: "Small"
          }
        ] + (if $body != "" then [{
            type: "TextBlock",
            text: $body,
            wrap: true,
            isSubtle: true,
            size: "Small"
          }] else [] end),
        actions: (if $link != "" then [{
            type: "Action.OpenUrl",
            title: "Abrir no GitHub",
            url: $link
          }] else [] end)
      }
    }]
  }')

HTTP_CODE=$(curl -sS -o /tmp/teams-resp.txt -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$TEAMS_WEBHOOK_URL" || echo "000")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "::notice::Teams notificado ($KIND, $HTTP_CODE)."
else
  echo "::warning::Teams retornou HTTP $HTTP_CODE — payload pode ter falhado."
  cat /tmp/teams-resp.txt
fi
