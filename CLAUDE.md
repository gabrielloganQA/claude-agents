# CLAUDE.md — instruções globais para os agentes

Este arquivo é carregado automaticamente em toda sessão do Claude Code rodada na raiz do repo. Ele consolida convenções que todos os agentes (qa-tester, dev-fixer, security-scanner, etc) devem seguir.

> Para detalhes específicos por agente, ver `.claude/agents/*.md`. Para o manual humano, ver `AGENTS.md`.

---

## 1. O que é este projeto

Framework multi-agente de QA contínua. A `sample-app/` (Next.js 15 + React 19 TODO em memória) é a cobaia para exercitar o ciclo bug → fix → verify → close. Os agentes vivem em `.claude/agents/`, comandos em `.claude/commands/`, automação CI em `.github/workflows/`.

## 2. Princípios não-negociáveis

1. **Nenhum agente faz merge.** Só abre PR. `gh pr merge` está bloqueado em `.claude/settings.json`.
2. **Toda PR aberta por agente precisa revisão humana** via CODEOWNERS antes de mergear.
3. **Não fazer push --force, reset --hard, commit --amend, rm -rf** — bloqueado por settings.
4. **Issues e PRs vivem com labels consistentes** (ver §6). Agentes filtram por label.
5. **Não criar arquivos `.md` novos sem necessidade.** Documentação extra que ninguém lê é dívida.

## 3. Convenções de código

- **JavaScript puro** (não TypeScript). Sample-app usa Next.js 15 com App Router.
- Indentação: 2 espaços.
- Aspas: duplas em JS/JSX, padrão Prettier.
- Sem comentários explicando o que o código faz — só o **porquê** quando não-óbvio.
- Imports relativos curtos; absolute paths via `jsconfig.json` quando útil.

## 4. Convenções de testes

Toda nova suíte exploratória em `tests/exploration/` deve declarar **qual técnica formal ISTQB** aplica no header do arquivo, referenciando `docs/TESTING-METHODOLOGIES.md`.

Nomeação: `<CÓDIGO>-<descrição>.test.js` ou `.spec.js`.

| Código | Técnica |
|---|---|
| B.1 | Equivalence Partitioning |
| B.2 | Boundary Value Analysis |
| B.3 | Decision Table |
| B.4 | State Transition |
| B.5 | Use Case / Scenario |
| B.8 | Error Guessing |
| B.10 | Não-funcional (a11y/perf) |

Mapa do que falta cobrir: `tests/exploration/MAP.md`.

## 5. Convenções de commits e PRs

- Mensagens curtas, imperativo, em português ou inglês — consistente com histórico.
- Prefixos comuns: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`.
- PR fechando issue: usar `Closes #N` / `Fixes #N` no body — o workflow `verify-after-merge` depende disso.
- Co-author trailer obrigatório quando agente escreve commit:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## 6. Labels canônicas

| Label | Significado | Quem usa |
|---|---|---|
| `bug` | Defeito reportado | Todos |
| `qa-found` | Aberto pelo qa-tester | qa-tester |
| `qa-ci` | Aberto pelo workflow CI (qa.yml) | qa.yml |
| `qa-nightly` | Aberto pelo cron noturno | qa-nightly.yml |
| `security` | Achado de segurança | security-scanner |
| `dependencies` | Atualização de deps | dependabot |
| `auto-update` | PR do Dependabot | dependabot |
| `docs` | Mudança de documentação | docs-writer |
| `a11y` | Violação WCAG | a11y-checker |
| `perf` | Regressão de performance | perf-regression |
| `mutation` | Mutante sobrevivente | mutation-tester |
| `triaged` | Issue priorizada | triage-bot |
| `priority:high\|medium\|low` | Prioridade após triage | triage-bot |
| `flaky` | Teste intermitente confirmado | qa-tester |

Mantenha consistência. Antes de criar label nova, verificar se já existe equivalente.

## 7. Comandos mais usados (cheat-sheet)

```bash
npm run test:all          # API + Playwright
npm run test:api          # só API (Node test runner)
npm run test:web          # só Playwright
npm run dev               # sobe sample-app em :3000
npm run watch             # watcher local com shift-left detector
npm run lint              # ESLint
npm run format            # Prettier --write
```

Slash commands principais no Claude Code:
- `/qa-run` — roda suite, abre issues
- `/dev-fix N` — corrige issue N
- `/dispatch` — vê o que está aberto e o que fazer
- `/triage` — categoriza issues novas
- `/retro` — relatório semanal
- `/verify <PR>` — valida fix antes do merge

## 8. Fluxo padrão ao receber pedido do humano

1. **Ler o que está aberto antes de agir.** Não duplicar issue/PR já existente. Use `gh issue list` / `gh pr list` com labels.
2. **Se for fix de bug**, ler a issue inteira, reproduzir local, escrever teste regressão *antes* do fix, então corrigir.
3. **Manter escopo da PR pequeno.** 1 issue = 1 PR. Não misturar refactor com fix.
4. **Atualizar `tests/exploration/MAP.md`** quando promover um cenário exploratório a regressão.
5. **Sempre rodar `npm run test:all` antes de abrir PR** — não delegar isso pro CI.

## 9. Quando NÃO agir

- Se o pedido cabe numa pergunta ao humano, pergunte em vez de adivinhar.
- Se a issue/PR está há mais de 30 dias sem atividade, comente perguntando se ainda é relevante antes de gastar trabalho nela.
- Se um teste falha intermitentemente (3+ runs verdes/vermelhos sem mudança no código), marcar como `flaky` e *não* abrir issue de bug — abrir issue de investigação de flakiness.

## 10. Auditoria

Toda ação importante (criar issue, abrir PR, fechar issue) deve aparecer no histórico do GitHub — não precisa logar localmente. Mas `gh` CLI deve ser usado em vez da API direta, pra rastreio via `gh` audit.
