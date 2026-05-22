# Mapa de Exploração

Registro do que o agente `qa-explorer` já tentou, com a **técnica formal** aplicada em cada cenário (códigos referem-se a `docs/TESTING-METHODOLOGIES.md`).

Evita re-explorar os mesmos cenários e dá visibilidade pro time do que está coberto e por qual metodologia.

## Estatísticas

- Última execução: 2026-05-22
- Total de cenários testados: 25 (5 arquivos, 25 asserções individuais)
- Bugs encontrados: 1 (issue #25)
- Cenários promovidos a regressão: 0 (candidatos identificados — ver abaixo)

## Por área

### sample-app/app/api/todos `POST`

Cobertura atual em `tests/api/todos.test.js`:
- [x] **B.1 Equivalence**: classe inválida (texto vazio) → 400
- [x] **B.2 Boundary**: limite "só espaços" → 400
- [x] **B.1 Equivalence**: classe válida (texto comum) → 201

Cenários explorados nesta execução:

#### Arquivo: `tests/exploration/api/B2-boundary-text-size.test.js`
- [x] **B.2 Boundary**: texto de 1 char (mínimo válido) → 201 — PASSOU, candidato a regressão
- [x] **B.2 Boundary**: texto de 2 chars → 201 — PASSOU, redundante com teste 1 char
- [x] **B.2 Boundary**: texto de 10.000 chars → aceito (sem limite) — PASSOU, documenta ausência de limite máximo
- [x] **B.2 Boundary**: texto de 100.000 chars → aceito (sem limite) — PASSOU, documenta ausência de limite máximo
- [x] **B.2 Boundary**: texto de 100.001 chars → aceito (sem limite) — PASSOU, boundary sentinel para futura implementação de limite

#### Arquivo: `tests/exploration/api/B8-post-malformed-input.test.js`
- [x] **B.8 Error Guessing**: `text: null` → 400 — PASSOU
- [x] **B.8 Error Guessing**: `text: 123` (número) → 400 — PASSOU
- [x] **B.8 Error Guessing**: `text: true` (boolean) → 400 — PASSOU
- [x] **B.8 Error Guessing**: `text: []` (array) → 400 — PASSOU
- [x] **B.8 Error Guessing**: `text: {}` (objeto) → 400 — PASSOU
- [x] **B.8 Error Guessing**: JSON malformado → 400 — PASSOU
- [☒] **B.8 Error Guessing**: sem Content-Type header → **BUG** — retorna 201 em vez de 400/415. **Issue [#25](https://github.com/gabrielloganQA/claude-agents/issues/25)**
- [x] **B.8 Error Guessing**: texto com espaços nos extremos → aceito com 201 — PASSOU, texto preservado
- [x] **B.8 Error Guessing**: campo extra desconhecido junto com text válido → ignorado, 201 — PASSOU

#### Arquivo: `tests/exploration/api/A1-branch-coverage-post-store.test.js`
- [x] **A.1 Branch**: body sem campo `text` (undefined) → 400 — PASSOU, candidato a regressão
- [x] **A.1 Branch**: body `{}` vazio → 400 — PASSOU, candidato a regressão
- [x] **A.1 Branch**: `text: " "` (único espaço) → 400 — PASSOU, candidato a regressão
- [x] **A.1 Branch**: `text: "\t"` (tab) → 400 — PASSOU
- [x] **A.1 Branch**: `text: "\n"` (nova linha) → 400 — PASSOU
- [x] **A.1 Branch**: `text: "\t\n   \r"` (mix whitespace) → 400 — PASSOU

Cenários a explorar (próxima execução):
- [ ] **B.8 Error Guessing**: body sem Content-Type → após fix da issue #25, verificar se retorna 415
- [ ] **B.1 Equivalence**: texto duplicado (cria 2x mesmo texto) — store permite duplicatas?
- [ ] **A.4 Loop**: 100 POSTs sequenciais (crescimento do array store, sem GC)
- [ ] **B.10 Performance**: payload de 100k chars → mede tempo de resposta (latência média)

### sample-app/app/api/todos `GET`

Cobertura atual:
- [x] retorna lista com itens (coberto em tests/api/todos.test.js)

Cenários explorados nesta execução:

#### Arquivo: `tests/exploration/api/A1-branch-coverage-post-store.test.js`
- [x] **A.1 Branch**: GET /api/todos/[id] id existente → 200 com todo completo (id, text, done, createdAt) — PASSOU, candidato a regressão
- [x] **A.1 Branch**: GET /api/todos/[id] id inexistente (999999998) → 404 — PASSOU, candidato a regressão

Cenários a explorar:
- [ ] retorna paginação? hoje retorna tudo — testar com 1000 todos
- [ ] header de cache?
- [ ] após muitos creates/deletes, ids continuam consistentes?

### sample-app/app/api/todos/[id] `PATCH`

Cobertura atual:
- [x] **B.3 Decision Table**: toggle alterna done (parcial — só 2 das 4 células da tabela)

Cenários explorados nesta execução:

#### Arquivo: `tests/exploration/api/B3-decision-table-patch-delete-id.test.js`
- [x] **B.3 Decision Table**: PATCH id inexistente (inteiro válido) → 404 — PASSOU, candidato a regressão
- [x] **B.3 Decision Table**: PATCH id = 0 → 404 — PASSOU, candidato a regressão
- [x] **B.3 Decision Table**: PATCH id negativo (-1) → 404 (NaN path) — PASSOU, candidato a regressão
- [x] **B.3 Decision Table**: PATCH id não-numérico ("abc") → 404 (Number("abc")=NaN, silencioso) — PASSOU, mas comportamento questionável (ver nota abaixo)
- [x] **B.3 Decision Table**: PATCH id decimal ("1.5") → 404 — PASSOU

#### Arquivo: `tests/exploration/api/A4-concurrency-patch-race.test.js`
- [x] **A.4 Concurrency**: 2 PATCHes simultâneos no mesmo todo → done=false (par) — PASSOU
- [x] **A.4 Concurrency**: 10 PATCHes simultâneos no mesmo todo → done=false (par) — PASSOU

> Nota: PATCH/DELETE com id não-numérico retorna 404 (correto funcionalmente) mas sem
> mensagem de validação específica — o app silenciosamente trata NaN como "not found".
> Isso é comportamento aceitável em black-box, mas um futuro linter de rotas poderia
> detectar e retornar 400 "id deve ser inteiro positivo". Não é bug crítico — não abriu issue.

Cenários a explorar:
- [ ] **B.8 Error Guessing**: PATCH com body JSON (deveria ignorar body?)
- [ ] **A.4 Concurrency**: 50 PATCHes simultâneos no mesmo id (stress do toggle)
- [ ] PATCH em id recém-deletado (DELETE race condition)

### sample-app/app/api/todos/[id] `DELETE`

Cobertura atual:
- [x] delete remove o item

Cenários explorados nesta execução:

#### Arquivo: `tests/exploration/api/B3-decision-table-patch-delete-id.test.js`
- [x] **B.3 Decision Table**: DELETE id inexistente → 404 — PASSOU, candidato a regressão
- [x] **B.3 Decision Table**: DELETE id = 0 → 404 — PASSOU
- [x] **B.3 Decision Table**: DELETE id negativo (-1) → 404 — PASSOU
- [x] **B.3 Decision Table**: DELETE id não-numérico ("abc") → 404 — PASSOU

Cenários a explorar:
- [ ] delete + GET imediato (consistência)
- [ ] delete em paralelo com PATCH no mesmo id (race condition)
- [ ] DELETE duplo no mesmo id (idempotência: segundo deve ser 404)

### sample-app/app/page.js (UI)

Cobertura atual em `tests/web/todo.spec.js`:
- [x] **B.5 Scenario**: adiciona TODO (fluxo principal)
- [x] **B.4 State Transition**: toggle marca→desmarca (transição done↔notDone)
- [x] **B.5 Scenario**: remove TODO

Cenários a explorar (não foram abordados nesta execução — foco foi na API):
- [ ] **B.10 Acessibilidade**: navegação só com teclado (tab + enter) + axe-core
- [ ] **B.10 Performance**: adicionar 100 TODOs e medir TTI
- [ ] **B.4 State Transition**: back/forward do browser após operações
- [ ] **B.5 Scenario**: adicionar TODO com input vazio (botão deveria estar disabled?)
- [ ] **B.8 Error Guessing**: copy-paste com chars de controle (\r\n, \t)
- [ ] **B.4 State Transition**: reload da página com state local pendente
- [ ] **B.10 a11y**: axe-core na rota inicial — nenhum teste cobre

### .github/workflows/ (CI)

Sem cobertura específica. Cenários a explorar:
- [ ] workflow com PR de fork (permissions?)
- [ ] cron disparando em horário de baixo tráfego

## Bugs encontrados

| Issue | Área | Técnica | Descrição |
|-------|------|---------|-----------|
| [#25](https://github.com/gabrielloganQA/claude-agents/issues/25) | POST /api/todos | B.8 Error Guessing | POST sem Content-Type header retorna 201 (deveria ser 400 ou 415) |

## Candidatos a promoção para regressão

Testes que passaram e cobrem cenários valiosos não presentes na suite atual:

| Arquivo de exploração | Cenário | Prioridade |
|-----------------------|---------|-----------|
| `B3-decision-table-patch-delete-id.test.js` | PATCH/DELETE id inexistente → 404 | Alta |
| `A1-branch-coverage-post-store.test.js` | GET /api/todos/[id] id inexistente → 404 | Alta |
| `A1-branch-coverage-post-store.test.js` | POST body sem campo text → 400 | Alta |
| `B3-decision-table-patch-delete-id.test.js` | PATCH id negativo/-não-numérico | Média |
| `B2-boundary-text-size.test.js` | POST texto 1 char (mínimo válido) | Baixa |
| `A1-branch-coverage-post-store.test.js` | GET id existente retorna todos campos (id, text, done, createdAt) | Baixa |

## Convenções

- `[x]` = coberto (em regressão ou já explorado) — passou
- `[☒]` = explorado e encontrou bug — issue aberta
- `[ ]` = não explorado ainda
- Quando promover de exploração para regressão, mova o item para a seção "Cobertura atual" e linke ao teste.
- Quando explorar e descartar (redundante/falso positivo), adicione nota inline: `[ ] cenário X → descartado: razão`.
