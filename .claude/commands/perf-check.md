---
description: Mede performance web (Lighthouse) e abre issues se regrediu vs baseline
argument-hint: "[opcional: rota específica — ex: '/login']"
---

Invoque o subagente **perf-regression**.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: mede todas as rotas conhecidas.
- Com rota: foca só nela.
- Rode contra build de produção se possível (`npm run build && npm start`).
- Rode 3x e use a mediana para reduzir variância.
- Compare com `perf-baseline/` — primeira execução estabelece baseline.
- Regressão >10% em Core Web Vital ou >5 pontos no Score → abre issue.
- Reporte deltas ao usuário e atualize baseline para melhorias confirmadas.
