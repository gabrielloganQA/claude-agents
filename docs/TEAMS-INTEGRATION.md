# Integração com Microsoft Teams

Notifica seu canal do Teams quando:
- 🔴 **Pipeline falha em main** (`qa.yml`, `qa-nightly.yml`)
- 📥 **PR é aberta por agente** (dependabot, dev-fixer, qualquer branch `fix/*` ou `feat/*`)
- 🐛 **Issue de `bug` ou `security` é aberta**

Implementação: `.github/workflows/teams-notify.yml` + `scripts/notify-teams.sh` (curl + jq → Adaptive Card v1.4).

Sem secret configurado, o workflow ainda roda mas pula a notificação silenciosamente. Zero impacto se você não quiser usar.

---

## Setup (~5 min, uma vez por canal)

### 1. Criar Workflow no Teams

> O Teams descontinuou Incoming Webhooks clássicos. Use **Workflows** (Power Automate).

1. No Teams, abra o canal onde quer receber as notificações.
2. Clique nos `⋯` (três pontos) ao lado do nome do canal → **Workflows**.
3. Procure o template **"Post to a channel when a webhook request is received"**.
4. Clique em **Add workflow** e siga o wizard:
   - **Nome do workflow**: `claude-agents notificações` (qualquer nome serve).
   - **Team**: escolha o time.
   - **Channel**: escolha o canal.
5. Ao final, o Teams gera uma **URL de webhook** (algo como `https://prod-XX.westus.logic.azure.com:443/workflows/...`).
6. **Copie essa URL.**

### 2. Adicionar como GitHub Secret

```bash
# Pela linha de comando (precisa gh CLI autenticado):
gh secret set TEAMS_WEBHOOK_URL --body "https://prod-XX.westus.logic.azure.com:443/workflows/..."
```

Ou pela UI:
1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. Clique **New repository secret**.
3. Nome: `TEAMS_WEBHOOK_URL`.
4. Value: cole a URL copiada.
5. **Add secret**.

### 3. Testar

A forma mais rápida de testar é forçar o workflow `teams-notify.yml` a rodar manualmente. Como ele depende de eventos externos (push, PR, issue), o teste mais fácil é simular um evento:

**Opção A — abrir uma issue de teste:**
```bash
gh issue create --title "test: validar integração Teams" --label "bug" --body "Issue de teste — pode fechar"
```

Se o secret está OK, em ~10 segundos uma notificação aparece no canal. Feche a issue depois:
```bash
gh issue close <N> --comment "teste de integração concluído"
```

**Opção B — rodar localmente:**
```bash
export TEAMS_WEBHOOK_URL="..."
bash scripts/notify-teams.sh bug "Teste manual" "Disparo via script local" "https://github.com"
```

---

## O que cada notificação contém

### 🔴 Pipeline falhou
```
🔴 Pipeline falhou
QA — testes contínuos #142
Branch: main · SHA: abc1234 · Conclusion: failure
[ Abrir no GitHub ]
```

### 📥 PR aberta por agente
```
📥 PR aberta por agente
#42 — fix: corrige toggleTodo
Autor: dependabot[bot] · Branch: fix/toggleTodo
[ Abrir no GitHub ]
```

### 🐛 Bug ou 🔒 Security
```
🔒 Issue de segurança
#38 — postcss < 8.5.10 (GHSA-qx2v-qp2m-jg93)
Labels: bug, security, qa-found
[ Abrir no GitHub ]
```

---

## Customização

O script `scripts/notify-teams.sh` aceita 4 argumentos:
```
notify-teams.sh <kind> <title> <body> <url>

kind: failure | pr | bug | security | info
```

Pra notificar de outros eventos, basta:
1. Adicionar um novo `job` em `teams-notify.yml` com a condição desejada.
2. Chamar `bash scripts/notify-teams.sh <args>` no step.

---

## Solução de problemas

| Sintoma | Causa | Solução |
|---|---|---|
| `notice: TEAMS_WEBHOOK_URL não configurado` | Secret faltando | Refaça passo 2 |
| `Teams retornou HTTP 400` | Payload inválido (provavelmente título com chars especiais) | Verifique log do workflow; ajuste escape no script |
| `Teams retornou HTTP 401/403` | Webhook expirado ou revogado | Recrie no Teams (passo 1) e atualize o secret |
| Notificação não chega no canal | Workflow desativado ou canal errado no setup | Verifique no Teams: canal certo? workflow ainda ativo? |
| Spam (notificação repetida) | Múltiplos jobs com mesmo `if` matching | Refine as condições em `teams-notify.yml` |

---

## Segurança

- O webhook URL é tratado como **secret** — nunca commite em código.
- Quem tem o webhook URL pode postar **qualquer mensagem** no canal — trate como credencial.
- Pra rotacionar: recrie o Workflow no Teams (passo 1), atualize o secret no GitHub.
