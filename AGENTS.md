# Manual do time — claude-agents

Este projeto traz uma frota de agentes Claude Code que cobrem o ciclo de qualidade contínua de uma aplicação:

| Agente             | Função                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **qa-tester**      | Roda suite (web+API), abre GitHub Issues para cada bug (regressão). |
| **qa-explorer**    | Gera testes para cenários ainda não cobertos usando metodologias formais (boundary, decision table, mutation, etc.). Abre issues + PRs. |
| **qa-pre-pr**      | Shift-left: testes pro diff antes da PR ser aberta.                 |
| **coverage-auditor** | Mede cobertura c8 (statement/branch/function) e propõe testes pros gaps. |
| **mutation-tester** | Stryker — mede QUALIDADE da suite (não só quantidade).             |
| **dev-fixer**      | Pega issues do QA, corrige código, abre PR pra revisão humana.      |
| **security-scanner** | Roda `npm audit` + SAST leve + busca secrets. Abre issues.        |
| **perf-regression** | Lighthouse — detecta regressões em LCP/TTI/CLS.                    |
| **a11y-checker**   | axe-core — valida WCAG 2.1 AA. (Desativado em CI por enquanto.)     |
| **triage-bot**     | Categoriza issues abertas → labels `priority:*` e `area:*`. Ordena fila pro dev-fixer. |
| **retrospective**  | Relatório semanal — MTTR, hotspots, ações concretas.                |
| **dep-updater**    | Avalia PRs do Dependabot, roda suite, comenta recomendação.         |
| **docs-writer**    | Mantém README/AGENTS/docs sincronizados com o código.               |

> `qa-tester` mantém a base estável (regressão). `qa-explorer` faz a base **crescer** descobrindo cenários novos com técnicas de caixa branca + caixa preta (ver `docs/TESTING-METHODOLOGIES.md`).

Toda PR aberta por agentes passa por **revisão humana** antes do merge — esse é o gate de qualidade não-negociável.

---

## 1. Setup (uma vez por pessoa)

```bash
git clone git@github.com:gabrielloganQA/claude-agents.git
cd claude-agents
npm run install:all     # raiz + sample-app + Chromium

# GitHub CLI (necessário para os agentes abrirem issues/PRs)
gh auth login

# Claude Code
# https://docs.claude.com/claude-code
```

## 2. Slash commands disponíveis

| Comando            | Agente disparado     | O que faz                                                              |
| ------------------ | -------------------- | ---------------------------------------------------------------------- |
| `/dispatch`        | (sem agente — leitura) | Painel: lista issues/PRs abertos e sugere ordem ideal. **Comece aqui.** |
| `/qa-tudo`         | múltiplos (orquestrador) | **Faz-tudo**: regressão + segurança + cobertura + perf + triagem. ~25min. |
| `/qa-run`          | qa-tester            | Roda toda a suite, abre 1 issue por bug encontrado.                    |
| `/qa-run --apenas-api` | qa-tester        | Só API.                                                                |
| `/qa-run --apenas-web` | qa-tester        | Só Playwright.                                                         |
| `/qa-explore`      | qa-explorer          | Gera 5-10 testes para cenários não cobertos. Bug → issue. Valioso → PR adicionando ao suite. |
| `/qa-explore <area>` | qa-explorer        | Foca a exploração numa área (ex: `/qa-explore api/todos POST`).        |
| `/qa-pre-pr`       | qa-pre-pr            | Testes pro diff atual antes de abrir PR (shift-left).                  |
| `/pre-pr-check`    | múltiplos            | Bateria shift-left completa (qa-pre-pr + coverage + security + mutation). |
| `/triage`          | triage-bot           | Categoriza+prioriza issues abertas. Aplica `priority:*` e `area:*`.    |
| `/dev-fix [N]`     | dev-fixer            | Corrige issue #N (ou a mais antiga `priority:high`) e abre PR.         |
| `/verify <PR#>`    | qa-tester (verify)   | Roda suite contra a branch da PR, comenta resultado.                   |
| `/security-scan`   | security-scanner     | Auditoria de segurança (audit + secrets + SAST).                       |
| `/coverage-audit`  | coverage-auditor     | Mede cobertura e propõe testes pros gaps.                              |
| `/mutation-test`   | mutation-tester      | Mede qualidade da suite (Stryker).                                     |
| `/perf-check`      | perf-regression      | Lighthouse vs baseline.                                                |
| `/a11y-check`      | a11y-checker         | axe-core (WCAG 2.1 AA).                                                |
| `/retro`           | retrospective        | Retrospectiva semanal — MTTR, hotspots, ações.                         |
| `/dep-review [N]`  | dep-updater          | Avalia PRs do Dependabot.                                              |
| `/docs-update`     | docs-writer          | Sincroniza docs com código atual.                                      |

## 3. Disparos automáticos (a parte "sempre rodando")

### 3.1 GitHub Actions em todo push/PR
**Workflow**: `.github/workflows/qa.yml`
- Roda em todo push pra `main` e em toda PR.
- Se falhar em push pra main, abre issue automaticamente com label `bug,qa-ci`.
- Anexa relatório do Playwright como artifact.

### 3.2 Varredura noturna
**Workflow**: `.github/workflows/qa-nightly.yml`
- Cron `0 6 * * *` UTC (3am BRT).
- Roda a suite completa contra `main` mesmo sem commits — pega regressões de deps externas.

### 3.3 Routines do Claude (`/schedule`)
Veja **[docs/ROUTINES-CLAUDE.md](./docs/ROUTINES-CLAUDE.md)**. Permite rodar agentes Claude na nuvem em horários definidos — para análises que pedem julgamento (não só `npm test`).

### 3.4 Watcher local
**Script**: `npm run watch`
- Observa `sample-app/` e `tests/`.
- Reroda suite de API automaticamente a cada save.
- Útil pra dev ativo; **não substitui** os disparos acima.

## 4. Fluxo típico (com triagem)

```
┌─────────────────────────┐    falha    ┌────────────────┐
│ Push pra main / Cron 3am│ ──────────▶ │  GitHub Issue  │
│      / /qa-run          │             │ (bug,qa-found) │
└─────────────────────────┘             └────────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │   /triage    │ ─ aplica priority:*, area:*
                                          └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  /dispatch   │ ─ vê o painel, escolhe próxima
                                          └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  /dev-fix N  │
                                          └──────────────┘
                                                  │  abre PR
                                                  ▼
                                       ┌──────────────────┐
                                       │  👤 Revisão      │
                                       │     humana       │
                                       └──────────────────┘
                                                  │  aprova + merge
                                                  ▼
                                          ┌──────────────────┐
                                          │ verify-after-merge│ ─ workflow auto
                                          └──────────────────┘
                                                  │
                                                  ▼ (1x/semana)
                                          ┌──────────────┐
                                          │    /retro    │ ─ relatório
                                          └──────────────┘
```

**Dia-a-dia sugerido**:
1. Manhã: olhar a issue "📊 QA Dashboard" (atualizada às 08:00 BRT automaticamente).
2. Rodar `/dispatch` no Claude Code → ver o que está aberto.
3. Se há issues sem triagem → `/triage`.
4. Pegar a issue `priority:high` mais antiga → `/dev-fix N`.
5. Revisar e mergear PRs abertas (dependabot, dev-fixer).
6. Sexta-feira: `/retro` pra relatório da semana.

Em paralelo:
- `/security-scan` (humano dispara ou routine) → issues `security,qa-found` → `dev-fixer` corrige.
- Dependabot abre PR → `/dep-review` valida → humano aprova.
- Mudança grande no código → `/docs-update` reabre PR de docs.

## 5. Convenções de labels

| Label              | Significado                                       |
| ------------------ | ------------------------------------------------- |
| `bug`              | Defeito reportado                                 |
| `qa-found`         | Aberto pelo `qa-tester`                           |
| `qa-ci`            | Aberto pelo workflow CI                           |
| `qa-nightly`       | Aberto pelo cron noturno                          |
| `security`         | Achado de segurança                               |
| `dependencies`     | PR/issue de atualização de deps                   |
| `auto-update`      | Dependabot                                        |
| `docs`             | Mudança de documentação                           |
| `major-upgrade`    | Bump major detectado pelo `dep-updater`           |
| `triaged`          | Issue triada por `triage-bot`                     |
| `priority:high\|medium\|low` | Prioridade após triagem                 |
| `area:api\|ui\|ci\|deps\|security\|a11y\|perf` | Área afetada       |
| `flaky`            | Teste intermitente confirmado                     |
| `dashboard`        | Issue auto-atualizada pelo workflow dashboard     |
| `retro`            | Relatório semanal do `retrospective`              |

Agentes filtram por label — manter consistente é importante.

## 6. Segurança do fluxo

1. **`.github/CODEOWNERS`** garante que mudanças em `.claude/`, `.github/workflows/` e docs são revisadas.
2. **Branch protection** na `main` (configure conforme **[docs/BRANCH-PROTECTION.md](./docs/BRANCH-PROTECTION.md)**) exige:
   - 1 aprovação humana via Code Owners
   - CI verde
   - Branch atualizada
3. **`.claude/settings.json`** bloqueia comandos perigosos (`git push --force`, `gh pr merge`, `rm -rf`).
4. Os agentes **nunca** fazem merge — só abrem PR.

## 7. Adaptando para uma aplicação real

A pasta `sample-app/` é só uma cobaia. Para usar contra uma app real:

1. Remova `sample-app/` (ou aponte para outro caminho).
2. Reescreva `tests/web/` e `tests/api/` com cenários reais.
3. Ajuste `playwright.config.js` (`baseURL`, `webServer.command`).
4. Ajuste `.github/workflows/qa.yml` para servir a app real.
5. Confira que `gh auth status` aponta para a org da empresa antes de rodar.

## 8. Histórico — bugs propositais já corrigidos

Plantamos 3 bugs no `sample-app/` para exercitar o ciclo completo. Todos já foram detectados e corrigidos pelos agentes — ficam aqui como referência histórica:

1. ~~`createTodo` aceitava texto vazio~~ → corrigido em `sample-app/app/api/todos/route.js` (validação no POST).
2. ~~`toggleTodo` sempre marcava `done=true`~~ → corrigido em `sample-app/app/api/_store.js`.
3. ~~Faltava endpoint `/api/todos/reset`~~ → adicionado (vide PR #24).

Para continuar exercitando o ciclo, dispare `/qa-explore` (já rodou uma vez e encontrou a issue #25 — POST sem Content-Type retorna 201 em vez de 400).

## 9. Solução de problemas

| Sintoma                                   | Causa provável                                   | Solução                                  |
| ----------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Agente: "gh not found"                    | `gh` CLI não instalado                           | Instale conforme seção 1                 |
| Agente: "gh: not logged in"               | Não autenticado                                  | `gh auth login`                          |
| Playwright pede browser                   | Chromium não baixado                             | `npx playwright install chromium`        |
| Testes ficam pendurados                   | Porta 3000 ocupada                               | `lsof -i :3000` e mate o processo        |
| Permissão a cada comando                  | `.claude/settings.json` não carregado            | Rode `claude` da raiz do repo            |
| Workflow CI falha em "open issue"         | Token sem permissão `issues: write`              | Confira `permissions:` no `qa.yml`       |

---

_Dúvidas: abra uma issue ou edite este arquivo e mande PR._
