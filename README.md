# claude-agents

[![QA](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa.yml/badge.svg)](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa.yml)
[![QA nightly](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa-nightly.yml/badge.svg)](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa-nightly.yml)

> Sistema multi-agente em Claude Code para QA + correção + segurança + deps + docs + métricas.

Agentes que trabalham em loop para garantir qualidade contínua de uma aplicação:

- **qa-tester / qa-explorer / qa-pre-pr** — regressão, descoberta e shift-left.
- **dev-fixer** — pega uma issue do QA, reproduz, corrige e abre um *Pull Request* linkado.
- **security-scanner** — roda `npm audit` + heurísticas SAST e abre issues de segurança.
- **coverage-auditor / mutation-tester** — mede cobertura objetiva e qualidade da suite.
- **perf-regression / a11y-checker** — Lighthouse e WCAG.
- **triage-bot** — categoriza/prioriza issues novas em `priority:high|medium|low`.
- **retrospective** — relatório semanal com MTTR, hotspots, ações.
- **dep-updater** — processa PRs do Dependabot e revalida com a suite.
- **docs-writer** — sincroniza documentação quando o código muda.

Toda PR aberta por agentes passa por **revisão humana** antes do merge. Após merge, o QA reroda automaticamente. Convenções globais em [CLAUDE.md](./CLAUDE.md).

## Disparadores contínuos

| Mecanismo                    | Quando                                |
| ---------------------------- | ------------------------------------- |
| GitHub Actions (`qa.yml`)        | Todo push / PR para `main`            |
| GitHub Actions (`qa-nightly`)    | Todo dia às 03:00 BRT                 |
| GitHub Actions (`dashboard.yml`) | Painel diário às 08:00 BRT (grátis)   |
| GitHub Actions (`verify-after-merge`) | Fecha o ciclo bug→fix automaticamente |
| GitHub Actions (`teams-notify`)  | Notifica canal do Teams em falhas/PRs/issues ([setup](./docs/TEAMS-INTEGRATION.md)) |
| Routine Claude (`/schedule`)     | Cron configurável (cloud, consome quota)|
| Watcher local                    | Em desenvolvimento ativo (`npm run watch`) |

## Como usar

Veja **[AGENTS.md](./AGENTS.md)** para o passo-a-passo do time.

## Estrutura

```
.
├── .claude/
│   ├── agents/        # qa-tester, dev-fixer, security-scanner, dep-updater, docs-writer
│   ├── commands/      # /qa-run, /dev-fix, /verify, /security-scan, /dep-review, /docs-update
│   └── settings.json  # permissões compartilhadas
├── .github/
│   ├── workflows/     # CI + cron noturno
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   └── dependabot.yml
├── sample-app/        # app Next.js de exemplo (cobaia)
├── tests/             # Playwright + testes de API
├── scripts/           # watcher local, helpers
└── docs/              # BRANCH-PROTECTION, ROUTINES-CLAUDE
```

## Requisitos

- Node.js 20+
- [Claude Code](https://docs.claude.com/claude-code)
- [`gh` CLI](https://cli.github.com/) autenticado (`gh auth login`)
