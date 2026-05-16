# Mapa de Exploração

Registro do que o agente `qa-explorer` já tentou, com a **técnica formal** aplicada em cada cenário (códigos referem-se a `docs/TESTING-METHODOLOGIES.md`).

Evita re-explorar os mesmos cenários e dá visibilidade pro time do que está coberto e por qual metodologia.

## Estatísticas

- Última execução: _ainda não rodou_
- Total de cenários testados: 0
- Bugs encontrados: 0
- Cenários promovidos a regressão: 0

## Por área

### sample-app/app/api/todos `POST`

Cobertura atual em `tests/api/todos.test.js`:
- [x] **B.1 Equivalence**: classe inválida (texto vazio) → 400
- [x] **B.2 Boundary**: limite "só espaços" → 400
- [x] **B.1 Equivalence**: classe válida (texto comum) → 201

Cenários a explorar:
- [ ] **B.8 Error Guessing**: body sem Content-Type header
- [ ] **B.8 Error Guessing**: body com JSON malformado
- [ ] **B.2 Boundary**: texto com > 10k chars (limite+1)
- [ ] **B.8 Error Guessing**: texto com unicode/emoji (🎉, 中文, العربية)
- [ ] **A.9 SAST / B.8**: texto com HTML/script injection (`<script>alert(1)</script>`)
- [ ] **B.1 Equivalence**: texto duplicado (cria 2x mesmo texto)
- [ ] **A.4 Loop / Concurrency**: 100 POSTs paralelos (race no nextId)
- [ ] **B.10 Performance**: payload de 100k chars → mede tempo de resposta

### sample-app/app/api/todos `GET`

Cobertura atual:
- [x] retorna lista vazia (implícito em outros testes)
- [x] retorna lista com itens

Cenários a explorar:
- [ ] retorna paginação? hoje retorna tudo — testar com 1000 todos
- [ ] header de cache?
- [ ] após muitos creates/deletes, ids continuam consistentes?

### sample-app/app/api/todos/[id] `PATCH`

Cobertura atual:
- [x] **B.3 Decision Table**: toggle alterna done (parcial — só 2 das 4 células da tabela)

Cenários a explorar:
- [ ] **B.3 Decision Table**: id inexistente → 404 (linha 1 da tabela)
- [ ] **B.2 Boundary**: id negativo (-1)
- [ ] **B.2 Boundary**: id = 0
- [ ] **B.1 Equivalence**: id decimal/string ("abc", "1.5")
- [ ] **B.8 Error Guessing**: PATCH com body (deveria ignorar?)
- [ ] **A.4 Concurrency**: 50 PATCHes simultâneos no mesmo id (race condition no globalThis store?)

### sample-app/app/api/todos/[id] `DELETE`

Cobertura atual:
- [x] delete remove o item

Cenários a explorar:
- [ ] delete id inexistente
- [ ] delete + GET imediato (consistência)
- [ ] delete em paralelo com PATCH no mesmo id

### sample-app/app/page.js (UI)

Cobertura atual em `tests/web/todo.spec.js`:
- [x] **B.5 Scenario**: adiciona TODO (fluxo principal)
- [x] **B.4 State Transition**: toggle marca→desmarca (transição done↔notDone)
- [x] **B.5 Scenario**: remove TODO

Cenários a explorar:
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

## Convenções

- `[x]` = coberto (em regressão ou já explorado)
- `[ ]` = não explorado ainda
- Quando promover de exploração para regressão, mova o item para a seção "Cobertura atual" e linke ao teste.
- Quando explorar e descartar (redundante/falso positivo), adicione nota inline: `[ ] cenário X → descartado: razão`.
