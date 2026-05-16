---
description: Mede cobertura de testes (statement/branch/function) e propõe testes para fechar gaps importantes
argument-hint: "[opcional: caminho específico, ou --diff pra modo shift-left]"
---

Invoque o subagente **coverage-auditor** para uma auditoria de cobertura.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: auditoria geral (todo `sample-app/app/**`).
- Com caminho: foca a análise nesse diretório/arquivo.
- `--diff` (ou `--diff-only`): modo shift-left — mede só linhas adicionadas no diff `main...HEAD`. Usado pelo `/pre-pr-check`. Threshold: 70% de cobertura nas linhas novas.
- Use `c8` (já no devDeps ou peça pra instalar) e gere relatório `coverage/`.
- Identifique 3-5 gaps prioritários (não tente cobrir tudo de uma vez).
- Abra PR com testes para os gaps + relatório no corpo.
- Reporte ao usuário: %atual → %projetado, lista de gaps, link da PR.
