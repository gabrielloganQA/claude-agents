---
description: Audita acessibilidade (WCAG 2.1 AA) com axe-core em todas as rotas
argument-hint: "[opcional: rota específica — ex: '/login']"
---

Invoque o subagente **a11y-checker**.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: auditoria de todas as rotas listadas em `tests/a11y/routes.spec.js`.
- Com rota: foca só nela.
- Para violações `critical`/`serious`: 1 issue por tipo.
- Para `moderate`: agrupa por categoria.
- Para `minor`: 1 issue agregadora.
- Alerte sobre checks manuais que axe não cobre (keyboard nav, screen reader).
- Reporte resumo ao usuário.
