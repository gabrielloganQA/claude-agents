---
description: Bateria shift-left completa antes de abrir PR — qa-pre-pr + coverage + security + mutation, tudo focado no diff
argument-hint: "[opcional: --rapido (pula mutation)]"
---

Execute uma bateria completa de checks antes de abrir PR. Cada passo é um subagente diferente, encadeados:

Argumento do usuário: $ARGUMENTS

Sequência (pare ao primeiro falhar):

1. **qa-pre-pr**: gera testes pro diff. Se gerou testes que falham → para e reporta.
2. **coverage-auditor (modo diff)**: confirma que cobertura de linhas adicionadas >= 70%. Se não → sugere mais testes.
3. **security-scanner (modo diff)**: scaneia código novo. Se achar vulnerabilidade → reporta e para.
4. **mutation-tester (modo changed-files)**: roda Stryker só nos arquivos modificados. Se mutation score do diff < 60% → reporta.
   - Pulado se `--rapido`.

Ao final:
- ✅ Todos passaram → reporta "pronto pra abrir PR" + lista commits adicionados pelo qa-pre-pr.
- ⚠️ Algum falhou → reporta qual step + ação sugerida.

Não abre PR. Não dá push. Decisão final é do dev.
