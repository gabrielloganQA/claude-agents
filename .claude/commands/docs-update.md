---
description: Sincroniza README, AGENTS.md e docs/ com o estado real do código
---

Invoque o subagente **docs-writer** para verificar e sincronizar a documentação.

Instruções para o agente:
- Compare docs (README, AGENTS.md, docs/) com a realidade (comandos, agentes, scripts, workflows).
- Liste divergências antes de editar.
- Se houver mudanças, abra PR `docs:` linkada.
- Se tudo estiver consistente, reporte "tudo ok" e não abra PR.
