---
description: Explora o app gerando testes para cenários ainda não cobertos. Bugs viram issues, cenários valiosos viram PRs.
argument-hint: "[opcional: nome do arquivo/rota pra focar — ex: 'api/todos POST']"
---

Invoque o subagente **qa-explorer** para uma sessão de QA exploratório.

Argumento do usuário: $ARGUMENTS

Instruções para o agente:
- Se `$ARGUMENTS` vazio, escolha uma área prioritária por código mudado recentemente (`git log --since="2 weeks ago"`).
- Se vier um caminho de arquivo ou descrição (ex: "api/todos POST"), foca a exploração nessa área.
- Sempre leia `tests/exploration/MAP.md` antes de gerar cenários novos.
- Limite: 5-10 cenários por execução. Profundidade > volume.
- Final: relatório ao usuário com bugs encontrados (issues), promoções (PRs), e descartados.
