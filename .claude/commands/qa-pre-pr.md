---
description: Gera testes pro diff atual (branch vs main) antes de abrir PR — shift-left
argument-hint: "[opcional: --apenas-detectar (só lista gaps, não gera) ou --commit (gera e commita)]"
---

Invoque o subagente **qa-pre-pr** pra análise shift-left do diff atual.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Sem argumento: gera testes + roda local + reporta (sem commit).
- `--apenas-detectar`: só lista símbolos novos sem teste, não gera nada (modo "audit").
- `--commit`: gera, roda, commita local na branch atual. **Não dá push.**
- Sempre aplique metodologias formais (veja `docs/TESTING-METHODOLOGIES.md`).
- Se algum teste novo falha, pare e mostre ao dev — pode ser bug na feature.
- Reporte ao usuário no formato do agente.
