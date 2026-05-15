---
description: Roda auditoria de segurança (npm audit + secrets + heurísticas SAST) e abre issues
argument-hint: "[opcional: --apenas-audit ou --apenas-secrets]"
---

Invoque o subagente **security-scanner** para uma auditoria de segurança deste repositório.

Argumentos do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumentos: faça a varredura completa (npm audit + secrets + SAST).
- `--apenas-audit`: roda só `npm audit` em ambos os package.json.
- `--apenas-secrets`: procura só secrets commitados (working tree + histórico recente).
- Para cada achado real, abra issue com label `security,qa-found` seguindo o template em `.claude/agents/security-scanner.md`.
- Ao final, reporte: contagem por severidade, lista de issues criadas, e itens descartados como falso positivo (com razão).
