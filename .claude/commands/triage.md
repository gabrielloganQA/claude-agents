---
description: Triagem das issues abertas pelos agentes de QA — categoriza, prioriza e ordena fila pro dev-fixer
argument-hint: "[opcional: --rerun pra re-triar issues já com label 'triaged']"
---

Invoque o subagente **triage-bot** para processar todas as issues abertas sem label `triaged`.

Se argumento `--rerun` foi passado, incluir também issues já triadas (útil quando os critérios mudam).

Ao final, listar a ordem sugerida pra `/dev-fix` por prioridade.
