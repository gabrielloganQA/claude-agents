---
description: Executa a suite de testes completa e abre GitHub Issues para cada bug encontrado
argument-hint: "[opcional: --apenas-api ou --apenas-web]"
---

Invoque o subagente **qa-tester** para executar a suite de testes deste projeto e abrir GitHub Issues para cada falha encontrada.

Argumentos do usuário: $ARGUMENTS

Instruções para o agente:
- Se `--apenas-api`, rode apenas `npm run test:api`.
- Se `--apenas-web`, rode apenas `npm run test:web`.
- Sem argumentos: rode `npm run test:all`.
- Para cada falha real, abra uma issue com label `bug,qa-found` seguindo o template definido em `.claude/agents/qa-tester.md`.
- Ao final, reporte: número de testes rodados, falhas encontradas, e lista de issues criadas (números + títulos).
