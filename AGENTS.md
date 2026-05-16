# Manual do time — claude-agents

Este projeto traz uma frota de agentes Claude Code que cobrem o ciclo de qualidade contínua de uma aplicação:

| Agente             | Função                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **qa-tester**      | Roda suite (web+API), abre GitHub Issues para cada bug (regressão). |
| **qa-explorer**    | Gera testes para cenários ainda não cobertos usando metodologias formais (boundary, decision table, mutation, etc.). Abre issues + PRs. |
| **dev-fixer**      | Pega issues do QA, corrige código, abre PR pra revisão humana.      |
| **security-scanner** | Roda `npm audit` + SAST leve + busca secrets. Abre issues.        |
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
| `/qa-run`          | qa-tester            | Roda toda a suite, abre 1 issue por bug encontrado.                    |
| `/qa-run --apenas-api` | qa-tester        | Só API.                                                                |
| `/qa-run --apenas-web` | qa-tester        | Só Playwright.                                                         |
| `/qa-explore`      | qa-explorer          | Gera 5-10 testes para cenários não cobertos. Bug → issue. Valioso → PR adicionando ao suite. |
| `/qa-explore <area>` | qa-explorer        | Foca a exploração numa área (ex: `/qa-explore api/todos POST`).        |
| `/dev-fix [N]`     | dev-fixer            | Corrige issue #N (ou a mais antiga) e abre PR.                         |
| `/verify <PR#>`    | qa-tester (verify)   | Roda suite contra a branch da PR, comenta resultado.                   |
| `/security-scan`   | security-scanner     | Auditoria de segurança (audit + secrets + SAST).                       |
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

## 4. Fluxo típico

```
┌─────────────────────────┐    falha    ┌────────────────┐
│ Push pra main / Cron 3am│ ──────────▶ │  GitHub Issue  │
│      / /qa-run          │             │ (bug,qa-found) │
└─────────────────────────┘             └────────────────┘
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
                                          ┌──────────────┐
                                          │  /verify PR  │ ─ comenta resultado
                                          └──────────────┘
```

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

## 8. Bugs propositais no `sample-app/`

Plantamos 3 bugs no `sample-app/` para o time ver o ciclo funcionando:

1. **`sample-app/app/api/_store.js`** — `createTodo` não valida texto vazio (API aceita `""`).
2. **`sample-app/app/api/_store.js`** — `toggleTodo` sempre marca `done=true` em vez de alternar.
3. **`sample-app/app/api/todos/route.js`** — falta endpoint `/api/todos/reset` que testes esperam.

O `qa-tester` deve achar todos ao rodar `/qa-run`.

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
