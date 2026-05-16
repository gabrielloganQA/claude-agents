---
description: Mede QUALIDADE dos testes com Stryker — mutantes sobreviventes = testes fracos
argument-hint: "[opcional: arquivo, ou --changed-files-only pra shift-left]"
---

Invoque o subagente **mutation-tester** para medir a qualidade da suite via mutation testing.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: roda Stryker em todo `sample-app/app/**` (pode levar 10-60min — avise o usuário).
- Com arquivo: foca só nele (muito mais rápido).
- `--changed-files-only`: shift-left — só nos arquivos do diff `main...HEAD`. Threshold: 60% mutation score nas mudanças.
- Reporta mutation score + lista mutantes sobreviventes prioritários.
- Abre PR fortalecendo testes que falharam em detectar mutações importantes.
- Não persiga 100%; foque em lógica crítica.
