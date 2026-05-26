# Innovation Pack

Conjunto de features avançadas adicionadas além do core multi-agente. Todas **100% grátis** — usam só GitHub Actions, shell scripts e ferramentas open-source. Nenhuma exige Claude/LLM em runtime.

## 1. Bug Bisect Automático

**Workflow**: `.github/workflows/bug-bisect.yml`
**Disparo**: manual via `Actions` tab → "Bug bisect" → Run workflow → preencher número da issue + comando de teste

Faz `git bisect` automatizado entre o último commit verde (último `qa.yml` success em `main`) e HEAD, rodando seu comando de teste em cada step do bisect. Quando acha o commit culpado, comenta na issue com:
- SHA + autor + mensagem
- Diff dos arquivos
- Link pro próximo passo (`/dev-fix`)

**Tempo médio**: 5-15min (depende do tamanho da janela). **Custo**: 0.

### Quando usar
- Issue de regressão aberta ("antes funcionava, hoje não")
- Bug ambiguo onde você não sabe quando entrou

### Limites
- Precisa de comando de teste **determinístico** (testes flaky vão dar bisect ruim)
- Janela máxima ~50 commits (passa disso, demora muito)

---

## 2. Release Notes / Changelog automático

**Workflow**: `.github/workflows/release-notes.yml`
**Script**: `scripts/gen-changelog.sh`

Gera changelog Markdown agrupado por tipo de commit (feat / fix / docs / etc), linkando PRs/issues e commits. Sem LLM — usa convenção `feat:`, `fix:`, etc.

### 3 modos
1. **`workflow_dispatch` sem tag**: gera preview, anexa como artifact.
2. **`workflow_dispatch` com tag**: gera + cria GitHub Release **draft**.
3. **PR labeled `release`**: gera changelog desde última tag e comenta na PR.

### Output exemplo

```markdown
## Changes since v1.0.0 — 2026-05-25

### 🚀 Features
- Integração com Teams ([#52](...)) ([1b4f882](...))

### 🐛 Bug Fixes
- toggleTodo agora alterna ([#42](...)) ([d83ab12](...))

### 🔒 Security
- postcss >=8.5.10 ([#38](...)) ([abc1234](...))

---

_8 commits · 2 contributor(s)_
```

Limitação: depende do time usar prefixos convencionais (`feat:`, `fix:`). Sem prefixo → cai em "Other".

---

## 3. PR Risk Score

**Workflow**: `.github/workflows/pr-risk-score.yml`
**Script**: `scripts/pr-risk-score.sh`

Em toda PR (open/sync), calcula score **0-100** baseado em:

| Dimensão | Peso | Critério |
|---|---|---|
| Linhas alteradas | 40 | <50=5, <200=15, <500=25, <1000=35, ≥1000=40 |
| Arquivos tocados | 15 | <3=2, <10=8, <30=12, ≥30=15 |
| Arquivos de risco | 30 | `package*.json`, `.github/workflows/`, `next.config.js`, `.env`, `.claude/settings.json`, `CLAUDE.md`, etc — escalado 0/15/30 |
| Ausência de testes | 15 | Diff com prod mas sem teste → 15, parcial → 7, completo → 0 |

Classificação visual: 🟢 Baixo (0-25) · 🟡 Médio (26-55) · 🔴 Alto (56-100).

Comenta na PR e atualiza no synchronize.

### Quando agir
- 🔴 Alto: pode ser overengineering — considere dividir, adicionar reviewer extra, plan de rollback.
- 🟡 Médio: revisão padrão atenta.
- 🟢 Baixo: revisão rápida.

---

## 4. Cross-PR Conflict Detector

**Workflow**: `.github/workflows/pr-conflict-detector.yml`

Quando uma PR é aberta, compara seus arquivos com **todas as outras PRs abertas**. Se houver overlap, comenta:

```
⚠️ Cross-PR Conflict Detector
Esta PR sobrepõe arquivos com 2 outras PR(s) abertas:

- PR #40 (gabrielloganQA) — feat: quality upgrades
  Sobrepõe 3 arquivos:
    - package.json
    - README.md
    - AGENTS.md
```

Ajuda a planejar **ordem de merge** antes de virar `MERGE CONFLICT`.

---

## 5. Demo GIF Generator

**Workflow**: `.github/workflows/demo-gif.yml`
**Spec**: `tests/web/demo-recorder.spec.js`

Quando uma PR com label `feature` ou `demo` é mergeada, este workflow:

1. Roda `demo-recorder.spec.js` (Playwright com `video: { mode: 'on' }`)
2. Converte WebM → GIF otimizado com `ffmpeg` (12fps, 640px, paleta otimizada)
3. Anexa o GIF como artifact (retenção 90 dias)
4. Comenta na PR linkando

### Pra usar
- Adicione label `feature` ou `demo` na sua PR antes do merge
- Após merge, ~3-5min depois o comment aparece

### Use cases
- Release notes com GIF
- Comunicação interna ("o que entregamos esta semana")
- Onboarding (ver app em uso antes de clonar)

---

## 6. Smart Test Selection

**Workflow**: `.github/workflows/smart-test.yml`
**Script**: `scripts/select-tests.sh`

Em paralelo ao `qa.yml`, decide quais testes rodar baseado no diff:

| Tipo de diff | Estratégia |
|---|---|
| Só docs/markdown | **Skip** — não roda nada |
| Toca config/workflow/lock | **Full** — suite completa (alto risco) |
| Toca só API/store | **Partial** — só API tests (rápido) |
| Toca UI ou rotas | **Full** — API + Web |

Reduz CI de ~5min para <2min quando diff é pequeno.

> **Por que coexistir com qa.yml em vez de substituir?** Smart Test é heurística. Se ela errar (skip incorretamente), `qa.yml` ainda valida tudo. Tem mais redundância mas evita risco.

Comenta na PR explicando a decisão:
```
🎯 Smart Test Selection · estratégia: partial
- API: ✅
- Web: ⏭️
Razão: Diff só em API/store — pulando Playwright.
```

---

## Resumo das innovations

| # | Feature | Workflow | Trigger | Tempo médio |
|---|---|---|---|---|
| 1 | Bug Bisect | `bug-bisect.yml` | manual | 5-15min |
| 2 | Changelog | `release-notes.yml` | manual + PR labeled | <1min |
| 3 | PR Risk Score | `pr-risk-score.yml` | PR open/sync | <30s |
| 4 | Conflict Detector | `pr-conflict-detector.yml` | PR open/sync | <30s |
| 5 | Demo GIF | `demo-gif.yml` | PR merged + label | 3-5min |
| 6 | Smart Test | `smart-test.yml` | PR open/sync | varia |

**Custo total**: $0. Tudo no GitHub Actions free tier (público) ou bem dentro da quota (privado).

---

## O que NÃO está incluído (e por quê)

| Ideia | Por que não implementamos |
|---|---|
| AI Code Review inline | Requer Claude tokens em runtime. Custo recorrente. |
| Auto-ADR | Sem LLM, fica scaffolding inútil. |
| Bug Reproduction Recorder | Sem LLM, não dá pra interpretar steps em português do usuário. |
| Sentiment/Burnout detector | Sensível em termos de privacidade. Não recomendamos automatizar. |
| Smart Cron | Overengineering pro tamanho atual do projeto. |

Se quiser implementar alguma dessas no futuro (com Claude integrado), o padrão `notify-teams.sh`-style já está estabelecido — basta criar `scripts/ai-X.sh` que chama API + workflow que orquestra.
