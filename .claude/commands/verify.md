---
description: Roda a suite de testes contra uma PR específica e comenta o resultado nela
argument-hint: "<número da PR>"
---

Invoque o subagente **qa-tester** em modo *verify* para revalidar uma correção.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Se `$ARGUMENTS` vazio, pare e peça ao usuário o número da PR.
- Faça checkout da branch da PR: `gh pr checkout <num>`.
- Rode a suite completa: `npm run test:all`.
- Se passar: comente na PR com `gh pr comment <num> --body "✅ QA verde em $(git rev-parse --short HEAD): suite completa passou"`.
- Se falhar: comente na PR com o resultado da falha (sem abrir nova issue — o problema já está sendo trabalhado nessa PR). Reporte ao usuário detalhadamente.
- Ao final, retorne para a branch `main` para não deixar checkout pendurado.
