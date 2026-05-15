---
description: Avalia PRs abertas do Dependabot rodando a suite contra cada uma
argument-hint: "[opcional: número de PR específica]"
---

Invoque o subagente **dep-updater** para revisar PRs de atualização de dependências.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Se vier um número, processe só aquela PR.
- Sem argumento, liste todas PRs com label `dependencies` em aberto e processe uma a uma.
- Para cada PR: checkout, instalar, rodar suite, comentar resultado.
- Sempre volte para `main` ao terminar — não deixe checkout pendurado.
- **Nunca faça merge**, apenas comente recomendação.
- Reporte resumo tabular no final.
