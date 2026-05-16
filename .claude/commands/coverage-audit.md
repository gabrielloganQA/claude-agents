---
description: Mede cobertura de testes (statement/branch/function) e propõe testes para fechar gaps importantes
argument-hint: "[opcional: caminho específico — ex: 'sample-app/app/api']"
---

Invoque o subagente **coverage-auditor** para uma auditoria de cobertura.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: auditoria geral (todo `sample-app/app/**`).
- Com caminho: foca a análise nesse diretório/arquivo.
- Use `c8` (já no devDeps ou peça pra instalar) e gere relatório `coverage/`.
- Identifique 3-5 gaps prioritários (não tente cobrir tudo de uma vez).
- Abra PR com testes para os gaps + relatório no corpo.
- Reporte ao usuário: %atual → %projetado, lista de gaps, link da PR.
