---
description: Mede QUALIDADE dos testes com Stryker — mutantes sobreviventes = testes fracos
argument-hint: "[opcional: arquivo específico — ex: 'sample-app/app/api/_store.js']"
---

Invoque o subagente **mutation-tester** para medir a qualidade da suite via mutation testing.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: roda Stryker em todo `sample-app/app/**` (pode levar 10-60min — avise o usuário).
- Com arquivo: foca só nele (muito mais rápido).
- Reporta mutation score + lista mutantes sobreviventes prioritários.
- Abre PR fortalecendo testes que falharam em detectar mutações importantes.
- Não persiga 100%; foque em lógica crítica.
