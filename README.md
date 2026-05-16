# claude-agents

[![QA](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa.yml/badge.svg)](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa.yml)
[![QA nightly](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa-nightly.yml/badge.svg)](https://github.com/gabrielloganQA/claude-agents/actions/workflows/qa-nightly.yml)

> Sistema multi-agente em Claude Code para QA + correção + segurança + deps + docs.

Agentes que trabalham em loop para garantir qualidade contínua de uma aplicação:

- **qa-tester** — executa a suite de testes (Playwright + API) e abre um *GitHub Issue* para cada falha.
- **dev-fixer** — pega uma issue do QA, reproduz, corrige e abre um *Pull Request* linkado.
- **security-scanner** — roda `npm audit` + heurísticas SAST e abre issues de segurança.
- **dep-updater** — processa PRs do Dependabot e revalida com a suite.
- **docs-writer** — sincroniza documentação quando o código muda.

Toda PR aberta por agentes passa por **revisão humana** antes do merge. Após merge, o QA reroda automaticamente.

## Disparadores contínuos

| Mecanismo                    | Quando                                |
| ---------------------------- | ------------------------------------- |
| GitHub Actions (`qa.yml`)    | Todo push / PR para `main`            |
| GitHub Actions (`qa-nightly`)| Todo dia às 03:00 BRT                 |
| Routine Claude (`/schedule`) | Cron configurável (cloud)             |
| Watcher local                | Em desenvolvimento ativo (`npm run watch`) |

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
