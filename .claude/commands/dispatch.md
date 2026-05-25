---
description: Painel de status — lista trabalho aberto (issues, PRs, dependabot) e sugere ordem ideal de execução. Não dispara nada.
argument-hint: "[opcional: --json pra saída estruturada]"
---

Execute as queries abaixo via `gh` CLI e produza um painel consolidado. **Não dispare agentes** — apenas mostre o que precisa de atenção e em que ordem o usuário deveria atacar.

## Coleta

```bash
# Issues triadas por prioridade
gh issue list --state open --label "triaged,priority:high" --json number,title,labels,createdAt
gh issue list --state open --label "triaged,priority:medium" --json number,title,labels,createdAt
gh issue list --state open --label "triaged,priority:low" --json number,title,labels,createdAt

# Issues sem triagem
gh issue list --state open --label "bug" --no-label "triaged" --json number,title,createdAt

# Issues de segurança
gh issue list --state open --label "security" --json number,title,createdAt

# PRs do Dependabot esperando review
gh pr list --state open --label "dependencies" --json number,title,author,createdAt

# PRs do dev-fixer esperando review humana
gh pr list --state open --author "@me" --json number,title,createdAt

# Flaky tests pendentes
gh issue list --state open --label "flaky" --json number,title
```

## Formato de saída

```
🎯 DISPATCH — {data ISO}

🔴 ATENÇÃO IMEDIATA
  Segurança (N issues):
    #X título — idade Y
  High priority (N issues):
    #X título — idade Y

🟡 ESTA SEMANA
  Medium (N):
    #X título — idade Y

🟢 BACKLOG
  Low (N issues), flaky (N), low+stale (N)

📥 SEM TRIAGEM (N issues)
  Sugestão: rodar /triage

🔄 PRs aguardando você
  Dependabot (N): #X #Y
  Dev-fixer (N): #X
  Sugestão: revisar e mergear (você é o gate humano).

📊 SUGESTÃO DE PRÓXIMA AÇÃO
  1. /triage   (tem N issues sem triagem)
  2. /dev-fix X   (issue priority:high mais antiga)
  3. Revisar PR #Y   (dependabot esperando há Z dias)
```

## Princípios

- **Só leitura.** Nunca abrir, fechar, comentar ou mergear nada.
- **Idade calculada em horas/dias.** "há 3h" vs "há 4d" — humano entende prioridade visualmente.
- **Sem opinião sobre conteúdo.** Não tente decidir se a issue é "boa" ou "duplicada" — isso é trabalho do `triage-bot`.
- **Curto.** Se a lista tem mais de 30 itens, agrupar com `... (mais N)` e oferecer `--json` pra ver tudo.
- **Sugestão sempre concreta.** "Rodar /triage" é melhor que "considerar triagem".
