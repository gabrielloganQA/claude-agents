---
description: Pega uma issue aberta pelo QA, corrige o bug e abre um PR para revisão
argument-hint: "<número da issue> (opcional — sem isso pega a mais antiga)"
---

Invoque o subagente **dev-fixer** para corrigir uma issue de bug aberta pelo `qa-tester`.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Se `$ARGUMENTS` contém um número (ex: `42` ou `#42`), trate essa como a issue alvo.
- Se vazio, liste issues abertas com label `bug,qa-found` e pegue a mais antiga (ou pergunte ao usuário qual atacar se houver várias).
- Siga o fluxo de `.claude/agents/dev-fixer.md`: reproduzir → corrigir → validar suite completa local → abrir PR linkado.
- **Nunca faça merge.** Sempre deixe o PR aguardando revisão humana.
- Ao final, reporte: número da PR, link, e resumo do que mudou.
