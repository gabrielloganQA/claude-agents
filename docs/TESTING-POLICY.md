# Testing Policy — regras operacionais pros testes deste projeto

Este documento define **como** os testes devem ser escritos e **onde** eles podem rodar. É contrato consumido pelos agentes (`qa-tester`, `qa-explorer`, `qa-pre-pr`, `qa-onboarder`) e por humanos que escrevem teste neste repo.

> **Escopo:** regras de qualidade, isolamento, ambientes e manutenção.
> **Não escopo:** quais técnicas usar pra modelar casos — isso vive em [`TESTING-METHODOLOGIES.md`](TESTING-METHODOLOGIES.md) (ISTQB: equivalence partitioning, boundary, decision table, etc).
> **Pipeline de promoção:** ver [`PROMOTION-FLOW.md`](PROMOTION-FLOW.md) (a ser criado na Fase 6).

Quando uma regra desta policy conflitar com algo encontrado num teste existente, **a policy ganha** — abrir issue de tech-debt em vez de copiar o estilo antigo.

---

## A. Regras universais (qualquer teste, qualquer ambiente)

Aplicam a 100% dos testes do repo.

1. **Isolamento total.** Cada teste cria e limpa o próprio state. Rodar em qualquer ordem (ou em paralelo, ou sozinho) produz o mesmo resultado. Sem `beforeAll` que prepara state pra vários testes em sequência.

2. **Determinístico.**
   - Zero `Math.random()` sem seed.
   - Zero `Date.now()` / `new Date()` sem mock ou freeze (`vi.setSystemTime` / equivalente).
   - Timezone fixo em `UTC` (definir `process.env.TZ = "UTC"` no setup).
   - Sem dependência da hora do dia, dia da semana, ou locale do sistema.

3. **Sem `sleep` arbitrário.** Proibido `setTimeout`, `page.waitForTimeout(N)`, `await new Promise(r => setTimeout(r, N))`. Use sempre espera condicional:
   - Playwright: `await expect(locator).toBeVisible({ timeout: 5000 })`
   - API: poll com `waitFor(() => condição, { timeout })`
   - Sleep é cheiro de flaky — a regra é dura.

4. **AAA visível em qualquer camada.** Arrange / Act / Assert separados por comentário ou linha em branco. Quem lê em 6 meses precisa entender o cenário em 5 segundos. Vale pra component, API e GUI:

   ```js
   // Component (Cypress component test)
   it("mostra e esconde detalhes do customer ao clicar", () => {
     // Arrange
     cy.mount(<CustomerDetails customer={completeCustomer} />);
     // Act
     cy.contains("button", "Show address").click();
     // Assert
     cy.contains("dt", "Street").should("be.visible");
   });

   // API
   it("retorna lista vazia quando não há customers", async () => {
     // Arrange
     await api.post("/_test/reset");
     // Act
     const r = await api.get("/customers?page=1&limit=10");
     // Assert
     assert.deepEqual(r.body.customers, []);
   });

   // GUI (E2E)
   it("volta pra lista ao clicar em 'Back' nos detalhes", async ({ page }) => {
     // Arrange
     await page.goto("/");
     await page.getByTestId("customer-row").first().click();
     // Act
     await page.getByRole("button", { name: "Back" }).click();
     // Assert
     await expect(page.getByTestId("customers-table")).toBeVisible();
   });
   ```

5. **Uma ideia por teste.** Vários `expect` são aceitos, desde que validem **um único comportamento**. Teste que valida "criar todo + listar todos + deletar todo" vira 3 testes.

6. **Nome descreve cenário, não método.**
   - ✅ `deve_retornar_400_quando_body_vazio`
   - ✅ `lista_vazia_renderiza_estado_inicial`
   - ❌ `testCreateTodo`
   - ❌ `test1`

7. **Sem hardcode de URL, credencial, token ou ID.** Tudo via env var. Default só pra `localhost`. Nunca commitar token, mesmo de "ambiente de teste".

8. **Assertion message explica o quê.** Erro precisa dizer **o que** quebrou — a sintaxe muda por runner, a regra não:
   - ✅ `assert.equal(r.status, 201, "POST /api/todos deve retornar 201")` (node:test)
   - ✅ `expect(r.status, "POST /api/todos deve retornar 201").toBe(201)` (Vitest/Playwright)
   - ❌ `assert.equal(r.status, 201)` / `expect(r.status).toBe(201)` (mensagem genérica)

9. **Sem `if`/`try-catch` na lógica do teste.** Teste com branch é teste com bug. Se precisa ramificar, são dois testes.

10. **Sem teste comentado.** Teste obsoleto = `git rm`. Teste em quarentena = `.skip` com link pra issue (ver §E).

11. **Aninhamento `describe` / `it` conta a história.** Leitura do código basta pra entender o cenário sem rodar nada. Padrão:

    ```js
    describe("POST /api/todos", () => {
      describe("quando o body é válido", () => {
        it("retorna 201 com o todo criado", () => { ... });
        it("persiste o todo no store", () => { ... });
      });
      describe("quando o body está vazio", () => {
        it("retorna 400 com mensagem 'text é obrigatório'", () => { ... });
      });
    });
    ```

    Quem leu sabe **o que** o sistema faz. Quem rodou sabe se está **correto**.

12. **Teste é desenvolvimento.** Aplicam-se as mesmas regras de código de produção: nomes claros, sem duplicação descontrolada, refactor é primeiro-cidadão (ver §H). Com **uma diferença dura**: a complexidade fica do lado da produção, não do teste. **Teste com lógica complexa esconde bug.** Se você precisa explicar o teste, simplifica o teste — não comenta o código.

13. **Console error do browser = teste falha.** Em qualquer teste que abre página (component, E2E), `console.error` durante a execução reprova o teste. Pega warning de React, exception não-tratada, key duplicada, prop inválida, hydration mismatch. Sem isso, app degrada por meses e ninguém vê.

    ```js
    // Playwright (em fixture compartilhado)
    test.beforeEach(async ({ page }) => {
      page.on("console", (msg) => {
        if (msg.type() === "error") throw new Error(`console.error: ${msg.text()}`);
      });
    });
    ```

    Whitelist de mensagens conhecidas (ex: erros de 3rd-party com fix em andamento) vive em `tests/console-whitelist.js`, com link pra issue de remoção.

14. **Network error não-esperado = teste falha.** Qualquer `4xx`/`5xx` que o teste não declarou esperar reprova. Inclui recurso secundário (font, imagem, telemetria, XHR órfão) — não só request principal. Sem isso, a UI "passa verde" enquanto recursos quebram silenciosamente.

    ```js
    test.beforeEach(async ({ page }) => {
      page.on("response", (res) => {
        if (res.status() >= 400 && !res.url().includes("/_test/expected-failure")) {
          throw new Error(`${res.status()} em ${res.url()}`);
        }
      });
    });
    ```

15. **Idempotência do teste.** Rodar o mesmo teste 2× em sequência (`--repeat-each=2` no Playwright, `Cypress.config('retries', 2)` desligado, etc) tem que dar verde nas duas. Falha na segunda execução = bug de cleanup, não de feature. Workflow `idempotency-check.yml` roda a suite com `--repeat-each=2` no nightly e reprova qualquer teste que cai só na repetição.

---

## B. Por tipo de teste

### B.1 Unit

- **Onde roda:** qualquer ambiente, inclusive em pre-commit.
- **Duração alvo:** < 100ms por teste.
- **Permite:** lógica pura, computação, transformação de dados.
- **Proíbe:** I/O de disco, rede, DB, processo filho, timer real. Se precisa de algum desses, **não é unit** — promove pra integração.
- **Mock:** apenas de boundaries externas (HTTP client, FS). Nunca mockar a unidade testada.

### B.2 Integração (API)

- **Onde roda:** dev, qa.
- **O que testa:** rotas reais, banco real (ou store em memória reset por teste), validação de payload, status codes, contratos de resposta.
- **Setup:** `beforeEach` chama `POST /api/_test/reset` (ou equivalente) pra zerar state.
- **Proíbe:** mockar o banco. Se precisa mock, é unit de service layer, não integração.

### B.3 E2E (Playwright)

- **Onde roda:** dev, qa.
- **Seletor de elemento, ordem de preferência:**
  1. `data-testid` — primeira escolha, sempre.
  2. `getByRole('button', { name: 'Salvar' })` — semântica acessível.
  3. `getByText('texto exato')` — quando texto é estável.
  4. CSS / XPath — **proibido** salvo aprovação explícita. `.btn-primary > div:nth-child(2)` é receita pra flaky.
- **Page Object Pattern obrigatório** pra fluxos com 3+ passos. Sem repetir `page.fill('[data-testid=email]', ...)` em 10 testes.
- **Screenshot em falha:** automático via Playwright config. Não adicionar manualmente.
- **Sem `page.waitForTimeout`** (já coberto em A.3, repetindo por reincidência).
- **E2E não mocka backend.** Se o teste intercepta `/api/*` e devolve resposta forjada, **deixou de ser E2E** — virou teste de integração de frontend (que tem lugar próprio: componente + MSW/cy.intercept). E2E roda contra serviço real (local, dockerizado, ou ambiente qa). Mock pontual de _third-party externo_ (Stripe sandbox, geolocalização, push) é exceção justificada — comentar **por quê** no teste.

### B.4 Smoke (produção)

- **Onde roda:** apenas `main`.
- **Permite:** `GET` em endpoints críticos, healthcheck, render de páginas-chave.
- **Proíbe:** `POST`, `PATCH`, `DELETE`, `PUT`. Qualquer escrita. Qualquer side-effect.
- **Timeout:** ≤ 5s por teste. Smoke lento é smoke inútil.
- **Sem retry.** Falhou = paga oncall. Smoke é alarme, não diagnóstico.

### B.5 Performance

- **Onde roda:** qa (gate antes de promover).
- **Compara contra baseline** em `perf-baseline/`.
- **Falha:** regressão > 10% em TTI, LCP, CLS, FID, FCP ou TBT.
- **Não executa em PRs de docs** (rota nem mudou).

### B.6 Acessibilidade

- **Onde roda:** dev, qa.
- **Ferramenta:** axe-core, padrão WCAG 2.1 AA.
- **Falha:** qualquer violação `serious` ou `critical` em rota crítica.
- **Tolera:** `minor`/`moderate` em rotas internas (admin), mas vira issue de backlog.

### B.7 Contract (futuro, quando sample-app tiver serviços)

- Pact ou OpenAPI schema validation.
- Roda em qa antes de promover.

### B.8 Snapshot testing — usar com freio

Snapshot é útil pra fixar formato grande (JSON de resposta, árvore de render) que mudaria fora do esperado. Sem governance vira rubber-stamp — ninguém lê snapshot de 400 linhas no diff e o teste só registra mudança em vez de detectar regressão.

- **Inline > arquivo separado.** `toMatchInlineSnapshot()` (Jest/Vitest) deixa o esperado **no próprio teste** — quem lê vê o que era. Snapshot externo só quando o output é genuinamente grande (>30 linhas) e estável.
- **Cap de tamanho.** Snapshot externo > 100 linhas precisa justificativa no header do arquivo. Acima disso vira issue de "quebrar em asserts específicos".
- **Snapshot que muda em 3+ PRs seguidas é candidato a delete.** Isso significa que o output é instável e o teste não está validando nada — vira ruído no diff.
- **Update cego é proibido.** `--update-snapshots` só pode ser usado em PR dedicada, com diff revisado snapshot a snapshot. Update junto com feature/fix é mascarar regressão.

---

## C. Por ambiente

A postura do teste **muda** conforme o stage. A tabela é a fonte da verdade — o `qa-tester` ramifica comportamento por ela:

| Regra                                         | dev     | qa                      | main      |
| --------------------------------------------- | ------- | ----------------------- | --------- |
| Pode rodar destrutivo (POST/PATCH/DELETE)?    | sim     | sim                     | **não**   |
| Pode tocar serviços externos reais?           | sim     | sandbox/mock            | **não**   |
| Pode usar dados de produção?                  | **não** | **não**                 | **não**   |
| Retry em caso de falha?                       | até 1x  | até 1x                  | **nunca** |
| Timeout máximo por teste                      | 30s     | 30s                     | 5s        |
| Cobertura statement mínima pra promover daqui | —       | 80%                     | —         |
| Cobertura branch mínima pra promover daqui    | —       | 60%                     | —         |
| Mutation score mínimo pra promover daqui      | —       | 70% em módulos críticos | —         |
| A11y `critical`/`serious` permitido?          | warn    | **bloqueia**            | bloqueia  |
| Perf regression > 10% permitido?              | warn    | **bloqueia**            | bloqueia  |

**Regra de ouro:** quanto mais perto de produção, mais conservador o agente, mais alta a severidade do que ele encontra.

### Conhecendo o stage em runtime

Todo teste e todo agente consultam, nessa ordem:

1. `process.env.QA_STAGE` (`dev` | `qa` | `main`)
2. Fallback: `git branch --show-current` mapeado (`dev` → dev, `qa` → qa, `main` → main, qualquer outra → dev)
3. Fallback final: `dev`

Workflows do GitHub Actions **devem** setar `QA_STAGE` explicitamente. Localhost roda como `dev` por default.

---

## D. Dados de teste

1. **Fixtures versionadas no repo** (`tests/fixtures/`). Nada de "depende do que tem no banco hoje".
2. **Sem PII real.** Nunca:
   - Emails de domínios reais (`@gmail.com`, `@empresa.com`).
   - CPF/CNPJ válido (use geradores com flag inválida, ou faixas reservadas).
   - Nomes de pessoas reais.
3. **Domínios permitidos:** `@example.test`, `@example.com`, `@test.local`.
4. **Faker.js com seed fixo** (`faker.seed(42)`) — fixture aleatória que muda a cada run é não-determinística.
5. **Cleanup em `afterEach`** ou via endpoint dedicado de teste (`POST /api/_test/reset`).
6. **Cada teste assume banco vazio.** Não "banco preparado por outro teste". Acoplamento entre testes é proibido.
7. **Dados sensíveis em qa/main:** mesmo dados gerados, nunca commitar resposta de endpoint que possa ter PII real vazada de outro ambiente.

8. **Unicidade garantida em runtime.** Aplicações reais têm constraints `UNIQUE` (email, CPF, slug, username). Toda geração de dado que pode trombar com unique combina **pelo menos 2 fontes de variação**:

   ```js
   // ok
   const email = `qa-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.test`;
   const slug = `${baseName}-${crypto.randomUUID().slice(0, 8)}`;
   const cnpj = generateCNPJ({ seed: workerIndex });

   // ruim — dois testes paralelos colidem
   const email = "usuario@example.test";
   const slug = faker.lorem.slug(); // mesmo seed = mesmo slug
   ```

   Combinação clássica: **seed fixo** (determinismo) + **timestamp/uuid/workerIndex** (unicidade por execução).

9. **Geração programática de artefatos (XML, Excel, PDF, CSV).** Quando o teste depende de upload, **gera o artefato em código** — não commita arquivo fixo no repo (vira lixo, fica stale, ninguém atualiza):
   | Formato | Lib recomendada (Node) |
   |---|---|
   | XML | `xmlbuilder2`, `fast-xml-parser` |
   | Excel (.xlsx) | `exceljs`, `xlsx` |
   | PDF | `pdf-lib` |
   | CSV | template string direta |
   | ZIP | `jszip` |

   Helpers em `tests/fixtures/builders/` retornam `Buffer`/`Stream` pra upload. **Vantagem chave:** cenários edge (XML malformado, Excel com 1M linhas, PDF corrompido, CSV com BOM) viram código testável, não arquivos opacos commitados.

---

## E. Flakiness

Política dura porque flaky é mais caro que bug — corrói confiança na suíte inteira.

1. **Definição:** 3 falhas em 10 runs do **mesmo SHA** = flaky. Não é bug, é instabilidade.
2. **Detecção:** workflow `flaky-detector.yml` (Fase 5) roda a suíte N×/dia e mantém histórico.
3. **Resposta:**
   - Label `flaky` no teste (via issue de investigação, **não** issue de bug).
   - Move pra quarentena: `test.skip(...)` ou `test.fixme(...)` com **comentário linkando issue**.
   - Quarentena sem investigação ativa = dívida pública.
4. **Orçamento de quarentena:** máx **5% da suíte**. Passou disso = feature freeze até limpar. Não é negociável.
5. **Prazo de fix:** 7 dias corridos em quarentena. Não-fix = **delete do teste**. Teste que ninguém arruma vira ruído, não cobertura.
6. **Reabilitação:** sair da quarentena exige 20 runs verdes consecutivos (workflow valida).
7. **Política de retry dura.** Runners (Playwright, Cypress, Jest) permitem retry automático — **máximo 1 retry**, e **só fora de `main`** (§C diz `nunca` em smoke). Teste que **precisou** do retry pra passar **não é "passou"** — o runner reporta como `flaky-candidate`, o workflow aplica a label e abre issue de investigação. Sem isso, retry mascara degradação e a suite mente verde.

---

## F. Manutenção e relacionamento com testes existentes

Os agentes precisam **respeitar** o que já está no repo. Regras:

1. **Não duplicar.** Antes de gerar teste novo, `grep` pelo cenário (nome, endpoint, componente). Se já existe teste cobrindo, **estender** (adicionar caso), não recriar.

2. **Não reescrever só por estilo.** Refactor de teste = PR separado, label `test-refactor`, justificativa explícita ("seletor frágil migrado pra `data-testid`", "removido `sleep` arbitrário").

3. **Deletar teste exige justificativa.** Commit que reduz cobertura sem explicação no body **bloqueia merge**. Justificativas aceitas:
   - Funcionalidade removida.
   - Teste duplicado (link pro teste que cobre o mesmo).
   - Teste validava bug, bug foi corrigido e cenário não faz mais sentido.

4. **Tocar em teste de outra pessoa:** comentar na PR original ou abrir issue de discussão antes. Tests são código de produção pra confiança — não mexer sem sinal.

5. **Tests legados que violam policy:** não corrigir em massa. Abrir issue `tech-debt` com lista, priorizar via `triage-bot`. Migração incremental, não big-bang.

---

## G. Otimização e performance de testes

Suíte lenta é suíte ignorada. Regras pra manter rápido sem perder cobertura. **Agnóstico de stack** — vale pra Cypress, Playwright, WebdriverIO, Selenium, qualquer um.

### G.1 Setup via API, nunca via UI (quando possível)

**Regra:** se o teste valida a feature X, faça as **pré-condições** por API, não clicando na UI.

- Teste valida "editar perfil"? Crie o user via `POST /api/users`, hidrate sessão, **abra direto** a tela de perfil. **Não** cadastre via formulário.
- UI só entra no **Act** (o passo que está sendo testado), nunca no **Arrange**.

**Por quê:**

- Setup via UI é lento (clica, espera render, valida...).
- Setup via UI é frágil (qualquer mudança no fluxo de cadastro quebra teste de **outra** feature).
- Setup via UI dispersa atenção — vira teste do fluxo todo, não da feature em foco.

**Padrão:**

```js
// ruim: 12s, 8 cliques só pra chegar no que importa
beforeEach(() => {
  cy.visit("/signup");
  cy.fillSignupForm({...});
  cy.visit("/login");
  cy.fillLoginForm({...});
  cy.visit("/profile/edit");
});

// bom: 200ms, foca no que está sendo testado
beforeEach(async () => {
  const { id, token } = await api.createUser({ ... });
  await page.context().addCookies([{ name: "auth", value: token }]);
  await page.goto(`/profile/${id}/edit`);
});
```

### G.2 Sessão persistida (storage state / session reuse)

Login real **uma vez** por user, por execução. Demais testes hidratam direto do cache.

- **Playwright:** `storageState` salvo em `tests/.auth/<user>.json` (gerado em `globalSetup`), carregado com `test.use({ storageState })`.
- **Cypress:** `cy.session("<user>", loginFn)` com cache automático entre testes.
- **Outros:** equivalente — salvar cookie/JWT/localStorage após login, hidratar antes do teste.

**Regra dura:** `tests/.auth/*` no `.gitignore`. Nunca commitar token, mesmo de qa.

### G.3 Pool de usuários quando o app tem sessão singleton

Algumas apps **deslogam** o usuário se a mesma conta loga em outra sessão/device. Sintoma: testes do mesmo user passam em série mas **falham em paralelo** com erro de auth.

Solução:

1. **Provisione N usuários idênticos** (`qa-user-01` ... `qa-user-N`) onboardados via seed/script.
2. Cada **worker** pega um user diferente do pool, via `process.env.TEST_WORKER_INDEX` (Playwright) ou equivalente.
3. `N >= workers paralelos`. Se rodar com 4 workers, mínimo 4 users.
4. Pool versionado em `tests/fixtures/users.json` (sem senha — vem de env), users **dedicados a teste**, nunca compartilhados com humano.

### G.4 Cleanup paralelo, não sequencial

`afterEach` que deleta 100 registros via API um a um trava a suíte. Padrão:

```js
afterEach(async () => {
  // ruim: 100 * 50ms = 5s
  for (const id of createdIds) await api.delete(`/todos/${id}`);

  // bom: 1 round-trip em paralelo
  await Promise.all(createdIds.map((id) => api.delete(`/todos/${id}`)));

  // melhor ainda: endpoint dedicado
  await api.post("/api/_test/reset", { ids: createdIds });
});
```

### G.5 Skip inteligente por mudança

PR que mexe só em `docs/` ou `*.md` **não** roda suíte E2E. Workflow `smart-test.yml` (já existe no repo) detecta path do diff e roda só o relevante.

---

## H. Abstrações: Tidy First aplicado a teste

Inspirado em **Tidy First** (Kent Beck) e **filosofia de design** (Ousterhout). Teste é código — mas com 2 ajustes próprios.

### H.1 Regra dos 3 usos antes de extrair

Não cria helper na primeira vez. **Espera 3 usos reais e idênticos** antes de abstrair. Abstração prematura em teste é **pior** que em código de produção, porque esconde a intenção do cenário e dificulta debug.

### H.2 Helpers escondem **como**, nunca **o quê**

Helper bom — leitor sabe o que aconteceu:

```js
const user = await createUser({ role: "admin" });
const todo = await createTodo({ owner: user, text: "comprar pão" });
```

Helper ruim — leitor não faz ideia:

```js
await setupTestEnvironment(); // o quê?? quem? quando? onde?
await prepareScenarioA(); // misterioso
```

**Regra dura:** quem lê o teste entende o cenário **sem abrir o helper**. Helper esconde **implementação**, nunca **intenção**.

### H.3 Page Object com critério

Page Object **só** quando:

- O fluxo tem 3+ passos.
- A mesma página é tocada por 3+ testes diferentes.
- Os seletores mudam com alguma frequência.

Página simples, teste único, 2 cliques: **escreve inline**. PO trivial vira indireção sem ganho, e o teste fica mais difícil de ler que se fosse direto.

### H.4 Sem herança em testes

Sem `class TestBase extends ...`. Composição via helpers ou fixtures funcionais. Herança em teste vira labirinto pra debugar quando algo quebra 3 níveis acima.

### H.5 Refactor de teste é PR de primeira classe

Teste com cheiro (duplicação extensa, helper enorme, PO de uma página só, seletor frágil persistente) merece **PR dedicado de refactor**, label `test-refactor`, justificativa explícita. **Não esperar** "quando alguém mexer ali de novo" — quando vier, a dor já está acumulada.

### H.6 Abstração desnecessária custa caro

Sintoma comum: arquivo `tests/utils/helpers.js` com 40 funções, todas usadas 1x. Isso é **anti-padrão** — é cópia disfarçada de helper.

Pergunta-teste: _"se eu inlinear esse helper, o teste fica pior ou só fica mais longo?"_ Se só fica mais longo, **inlinea**. Verbosidade é melhor que indireção em teste.

### H.7 Test Data Builder (Object Mother fluente)

Padrão recomendado pra criar entidades de teste com defaults sensatos + override só do que importa pro cenário. Mais legível que factory com 8 argumentos posicionais, mais flexível que fixture rígida.

```js
// ruim — qual desses arguments significa o quê?
const user = createUser("a@x.test", "Ana", "admin", true, null, "BR", 18);

// ruim — fixture rígida, qualquer mudança quebra 20 testes
const user = { ...fixtures.adminUser };

// bom — explícito, defaults escondidos, override só do relevante
const user = aUser().admin().withEmail(`qa-${uuid()}@example.test`).build();
```

Regras:

- **Defaults válidos** — `aUser().build()` (sem nada) tem que produzir entidade válida pra cenário base. Builder não exige campos pra coisas que o cenário não testa.
- **Métodos descrevem intenção do cenário** — `.admin()`, `.semEmail()`, `.expirado()` — não `.setRole("admin")` (isso é setter, esconde o porquê).
- **Encadeável e imutável** — cada `.with*()` retorna novo builder. Compartilhar builder entre testes paralelos sem isso = mutação cruzada.
- **Builders vivem em `tests/fixtures/builders/`** — um por entidade (`aUser.js`, `aTodo.js`, `aOrder.js`). Mesma pasta dos geradores de artefato (§D.9).
- **Não duplica produção.** Builder de teste só constrói **input** pra cenário. Validação, regra de negócio, default real — tudo na produção. Senão você está testando o builder, não a feature.

---

## I. Pirâmide de testes (proporção)

Não há regra dura — depende do app. Mas o framework adota orientação base:

### I.1 Proporção orientativa

```
        /\         E2E (~10%)
       /  \        lento, caro, frágil, validação de fluxo crítico
      /----\
     /      \      Integração (~20%)
    /        \     API + DB real, rápido o bastante, alta cobertura útil
   /----------\
  /            \   Unit (~70%)
 /              \  rápido, isolado, base da pirâmide
/________________\
```

### I.2 Inversões aceitas

Pirâmide é **orientação**, não dogma. Se sua app é **majoritariamente CRUD** (lógica fina no DB, pouco domínio em código), pode ter mais integração que unit. **Justificar no `PROJECT-PROFILE.md`** da app, não copiar `70/20/10` cegamente.

### I.3 Anti-padrões a evitar

| Forma                 | O que é                                            | Por que dói                                              |
| --------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| **Cone invertido**    | Pirâmide de cabeça pra baixo, mais E2E que unit    | Suite roda em horas, flaky, ninguém confia               |
| **Ampulheta**         | Unit + E2E gordo, integração vazio                 | Lacuna entre unidades verdes e fluxo end-to-end vermelho |
| **Cogumelo**          | Tudo é integração                                  | Lento, infra-dependente, sem unit pra debugar lógica     |
| **Sorvete derretido** | E2E manual (humano clicando) em cima de unit forte | Velocidade do humano vira gargalo                        |

### I.4 Acompanhamento

`qa-onboarder` (Fase 3) calcula a proporção real ao gerar `PROJECT-PROFILE.md` e **alerta se desviar 15%+** da proporção declarada.

---

## J. Convenções de código de teste

Teste é código. Tem que ter as mesmas convenções enforced que produção — senão o repo vira misto de estilos e o leitor gasta atenção decodificando, não entendendo o cenário.

### J.1 Estrutura de pastas (padrão)

```
tests/
├── unit/              # B.1 — pura, sem I/O
├── integration/       # B.2 — API + store/DB real
├── e2e/               # B.3 — Playwright
├── smoke/             # B.4 — só GET, roda em main
├── perf/              # B.5
├── a11y/              # B.6
├── fixtures/
│   ├── users.json     # pool §G.3 (sem senha)
│   └── builders/      # §D.9 — geram XML/Excel/PDF em código
├── pages/             # Page Objects §B.3/H.3
├── helpers/           # §H.2 — escondem "como", nunca "o quê"
├── .auth/             # storageState §G.2 — gitignored
└── exploration/       # cenários ainda não promovidos (ver MAP.md)
```

App polyrepo/monorepo adapta, mas mantém **separação por tipo de teste** — `tests/` plano com 200 arquivos vira lixo. Cada projeto declara sua estrutura no `PROJECT-PROFILE.md`.

### J.2 Lint e formatação de teste

ESLint **enforced** em CI pra `tests/**`, com plugin específico do framework:

| Stack                       | Plugin obrigatório              |
| --------------------------- | ------------------------------- |
| Playwright                  | `eslint-plugin-playwright`      |
| Cypress                     | `eslint-plugin-cypress`         |
| Jest / Vitest               | `eslint-plugin-jest`            |
| Testing Library (React/Vue) | `eslint-plugin-testing-library` |

Regras que **devem** estar ligadas (não negociável):

- `no-focused-tests` (`.only` esquecido = todos os outros não rodaram)
- `no-disabled-tests` exceto com `// FIXME: <link-issue>` na linha de cima
- `no-conditional-in-test` (reforça §A.9)
- `no-wait-for-multiple-assertions` / equivalente
- `no-page-pause` / `no-debug` (debug esquecido = CI lento)
- Plugin do framework: `no-useless-waiting`, `no-chain-of-domain-methods`, `no-async-page-set` — varia por stack

Prettier também roda em `tests/**`. Mesmas regras de produção.

### J.3 Convenções do time + onboarding

Cada projeto tem `tests/CONTRIBUTING-TESTS.md` (curto, ~1 página) com:

- como rodar a suite local
- como rodar **um** teste específico
- como adicionar fixture / Page Object / user no pool
- requisitos de env (Docker, vars, seed)
- troubleshooting comum (3-5 erros mais frequentes)

Sem isso, dev novo perde 2 dias antes do primeiro teste passar — e o conhecimento vive na cabeça de quem montou.

**Enforce em CI:** PR que toca `tests/` sem passar `npm run lint` e `npm run format:check` é bloqueada antes do review humano. Convenção que não é validada não é convenção, é folclore.

---

## K. Governance operacional

Quem cuida da suite, quanto tempo ela pode demorar, e o que sai junto quando um teste reprova. Sem isso, suite vira "do todo mundo e de ninguém" → vira flaky → ninguém confia.

### K.1 Test ownership via CODEOWNERS

Toda pasta de teste tem dono declarado em `.github/CODEOWNERS`:

```
tests/unit/billing/          @squad-billing
tests/integration/checkout/  @squad-checkout
tests/e2e/                   @squad-qa
tests/fixtures/              @squad-qa
```

PR que toca teste **aciona review do dono** automaticamente. Teste **órfão** (sem owner) bloqueia merge — abrir issue de adoção. Sem dono → quando quebrar, ninguém arruma → vai pra quarentena → vira delete (ver §E.5).

### K.2 Orçamento de tempo por tier

Cap **duro** por tier. Estourou = abre issue `perf-suite` antes da próxima feature.

| Tier       | Cap total | Cap por teste                   |
| ---------- | --------- | ------------------------------- |
| Unit       | 2 min     | 100 ms                          |
| Integração | 5 min     | 2 s                             |
| E2E        | 15 min    | 30 s (dev/qa), 5 s (smoke/main) |
| Perf       | 10 min    | — (depende da rota)             |

Suite lenta é suite ignorada. Quando bate o cap, opções (em ordem): paralelizar (K.4), promover E2E pra integração, deletar teste duplicado, splitar projeto. Aceitar suite lenta **não é opção**.

### K.3 Logs do app em falha (artefato obrigatório)

Toda execução de E2E e integração captura, e o workflow anexa ao job em caso de falha:

- `stdout` + `stderr` do servidor durante o teste
- `console` do browser (todos os níveis, não só error)
- HAR de rede (Playwright: `recordHar`)
- screenshot final + trace (Playwright: `trace: "retain-on-failure"`)
- contexto: SHA, branch, env vars relevantes, tempo de execução

Sem isso, debug pós-CI é caça às bruxas — dev tenta reproduzir local, não consegue, marca flaky, vira tech-debt. Artefatos retidos 30 dias (CI policy).

### K.4 Sharding e paralelismo declarado

Suite > 5 min em CI roda em N shards paralelos. **N declarado no `PROJECT-PROFILE.md`**, não decidido por chute em cada PR. Regras:

- Workers paralelos ≤ users no pool §G.3 (senão sessão singleton mata o teste).
- Cada shard é **independente** — não pode depender de shard anterior terminar.
- Cleanup é por-worker (`afterEach`) ou global (`globalTeardown`), nunca cross-worker.
- Relatório agregado: um único HTML/JUnit, não N relatórios pra revisor abrir.

Playwright (`--shard=X/N`), Cypress (`--parallel` + Cypress Cloud ou alternativa OSS), Jest (`--maxWorkers`). Stack varia, princípio é fixo.

---

## L. Side effects e ambiente

Testes que escapam do sandbox **mordem em produção**. Esta seção é sobre o que **nunca** pode acontecer, mesmo em dev.

### L.1 Side effects externos sempre em sandbox

Qualquer fluxo que dispara comunicação ou cobra dinheiro **nunca** toca serviço real. Vale pra:

| Side effect        | Substituto em teste                                               |
| ------------------ | ----------------------------------------------------------------- |
| Email              | Mailpit, MailHog, Mailcatcher (SMTP local capturando)             |
| SMS                | Stub local que loga payload, ou sandbox do provider (Twilio test) |
| Push notification  | Mock no boundary, ou Firebase emulator                            |
| Billing / cobrança | Stripe/PayPal sandbox com chaves de teste                         |
| Webhook out        | URL local (`webhook.site` proibido em CI — usar receptor in-repo) |
| LLM / API paga     | Cache de resposta + replay, ou stub determinístico                |

Regra dura: chave de produção **nunca** carregada em ambiente de teste. CI valida via `env-guard.js` que `STRIPE_KEY`, `SENDGRID_KEY`, etc são `*_test_*` ou vazias.

### L.2 Feature flags: testar ambos os ramos

Toda flag ativa em produção tem **2 testes** — flag on e flag off — pra cada cenário sensível à flag. Esquecer o ramo desligado é como esse ramo morrer silenciosamente: deploy desligado vai pra prod com bug, ninguém viu.

```js
for (const enabled of [true, false]) {
  test(`checkout com nova-tela-confirmacao=${enabled}`, async ({ page }) => {
    await setFlag("nova-tela-confirmacao", enabled);
    // cenário
  });
}
```

Loop é exceção aceita à regra "sem if/else no teste" (§A.9) — é parametrização, não ramo de lógica. Se a flag tem 3+ valores, vira matrix declarada (não cascata de if).

### L.3 Time travel no browser

Qualquer teste que depende de "agora" (countdown, expiração de token, agendamento, mensagem "há X minutos") **mocka o relógio** — não usa `setTimeout` real esperando o tempo passar (§A.3). Stacks:

- **Playwright 1.45+:** `await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") })` + `await page.clock.fastForward("60s")`.
- **Cypress:** `cy.clock(Date.UTC(2026, 0, 1))` + `cy.tick(60_000)`.
- **Vitest/Jest:** `vi.useFakeTimers()` + `vi.setSystemTime(...)`.

Sem isso, teste de "expira em 5 min" leva 5 min, ou é flaky se o CI demora 6 min, ou é fake (assert imediato com tolerância gigante).

---

## M. Quando NÃO escrever teste

Cobertura por cobertura é ruído. Teste que não pega bug é peso morto que (1) atrasa o CI, (2) quebra em refactor sem motivo, (3) treina o revisor a aprovar mudança em teste sem ler. Não escrever teste pra:

- **Getters / setters triviais** sem lógica. `get name() { return this._name; }` não precisa de teste.
- **Boilerplate gerado** (DTOs do ORM, tipos do GraphQL codegen, schema do Prisma). Está testado upstream.
- **JSX puramente composicional** — componente que só renderiza filhos sem lógica condicional. Testa-se o filho, não o pai vazio.
- **Wrappers triviais sobre lib testada** — `function fmtDate(d) { return dayjs(d).format("YYYY-MM-DD"); }`. Está testando o dayjs.
- **Constants / config estática.** `const LIMIT = 10;` não tem o que testar.

Regra de bolso: _"qual bug esse teste pega que outro teste já não pega?"_ Se não tem resposta clara, não escreve.

### M.1 Onde property-based testing **vale**

`fast-check` ou equivalente gera N inputs aleatórios e procura o que quebra. Vale pra:

- **Parsers e serializadores** — `parse(serialize(x)) === x` pra qualquer `x` válido.
- **Validadores** — input válido sempre passa; input inválido sempre reprova.
- **Lógica matemática / financeira** — associativa, comutativa, idempotente.
- **Transformações de dados** — round-trip, invariantes.

```js
import fc from "fast-check";

test("parseCNPJ é inverso de formatCNPJ pra qualquer CNPJ válido", () => {
  fc.assert(
    fc.property(cnpjArbitrary, (raw) => {
      assert.equal(parseCNPJ(formatCNPJ(raw)), raw);
    }),
  );
});
```

### M.2 Onde property-based **não** vale

- UI / E2E — não tem invariante claro, gera ruído.
- Lógica de negócio com regra arbitrária ("desconto de 15% pra pedidos acima de R$200 às sextas") — não é propriedade, é caso. Cobre com `it()` por cenário (§A.6).
- Integração com 3rd-party — não controla o lado de lá, o teste vira flaky.

---

## N. Checklist rápido (cole no template de PR)

```markdown
### Universais

- [ ] Cada teste novo isola seu próprio state
- [ ] Sem sleep/waitForTimeout arbitrário
- [ ] Nomes descrevem cenário (não método)
- [ ] Aninhamento describe/it conta a história
- [ ] AAA visível em qualquer camada (component/API/E2E)
- [ ] Assertion message explica o quê
- [ ] Sem if/else na lógica do teste
- [ ] Listener de `console.error` e de `response >= 400` ativo em testes de página
- [ ] Idempotente (passa rodando 2× em sequência)

### Dados

- [ ] Sem PII real em fixtures
- [ ] Unicidade garantida (seed + uuid/timestamp)
- [ ] Artefatos (XML/Excel/PDF) gerados em código, não commitados

### Otimização

- [ ] Setup feito via API, não via UI (exceto se testando UI)
- [ ] Sessão hidratada (storageState / cy.session), sem login manual
- [ ] Cleanup paralelo, não sequencial

### Abstração

- [ ] Helper escolhido só após 3+ usos reais
- [ ] Helper esconde "como", nunca "o quê"
- [ ] Page Object só se 3+ passos e 3+ testes
- [ ] Entidade nova de teste usa Builder (`aUser().build()`), não factory posicional
- [ ] Snapshot novo é inline (ou tem justificativa pra ser arquivo)

### Ambiente

- [ ] Stage respeitado (QA_STAGE: dev/qa/main)
- [ ] Smoke (se main) é só GET
- [ ] Seletores E2E: data-testid first
- [ ] E2E não mocka backend (mock só de 3rd-party externo, justificado)
- [ ] Side effects (email/SMS/push/billing) em sandbox — nenhuma chave de prod carregada
- [ ] Feature flag tocada → testes pros 2 ramos (on/off)
- [ ] Teste com "agora" usa `page.clock`/`cy.clock`, não sleep real

### Convenções e governance

- [ ] Arquivo na pasta certa (`tests/{unit,integration,e2e,...}`)
- [ ] Lint do framework passa (plugin Playwright/Cypress/Jest)
- [ ] CODEOWNERS cobre a pasta tocada (sem teste órfão)
- [ ] Suite dentro do cap de tempo do tier (§K.2)
- [ ] Retry ≤ 1 e teste com retry vira `flaky-candidate`

### Sanidade

- [ ] Não duplica teste existente (grep feito)
- [ ] Pirâmide respeitada (proporção do PROJECT-PROFILE)
- [ ] Esse teste pega um bug que outro teste não pega (§M)
```

---

## O. Pendências — espaço pra evolução

Lista viva pra adicionar regras que ainda faltam. Quando você (ou um agente) lembrar de algo aprendido na prática, adiciona aqui e abre PR pra promover pras seções definitivas.

| Data | Regra candidata                     | Proposto por | Status |
| ---- | ----------------------------------- | ------------ | ------ |
| —    | (vazio — adicione conforme lembrar) | —            | —      |

---

## Histórico de mudanças

| Data       | Mudança                                                                                                                                                                                                                                                                                         | Por quê                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2026-05-27 | Versão inicial                                                                                                                                                                                                                                                                                  | Base pra protótipo de pipeline dev → qa → main                                         |
| 2026-05-27 | +§A.11 (describe/it), +§A.12 (teste é dev), +§D.8 (unicidade), +§D.9 (artefatos), +§G (otimização), +§H (Tidy First), +§I (pirâmide), +§K (pendências)                                                                                                                                          | Regras vivenciais agnósticas de stack                                                  |
| 2026-05-27 | §A.4 expandida (AAA por camada), +§A.13 (console error fail), +§A.14 (network error fail), +§B.3 (E2E não mocka backend), +§E.7 (retry máx 1 → flaky-candidate), +§J (convenções de código de teste), +§K (governance operacional). §J anterior → §L, §K anterior → §M.                         | Cruzamento com material de boas práticas + gaps de governance que não estavam cobertos |
| 2026-05-27 | +§A.15 (idempotência), +§B.8 (snapshot com freio), +§H.7 (Test Data Builder), +§L (side effects e ambiente: sandbox, feature flags, time travel), +§M (quando NÃO escrever teste + property-based onde vale). Renumeração: §L → §N (Checklist), §M → §O (Pendências). Checklist ganhou 8 itens. | Fechar gaps de governance comportamental e padrões de fixture                          |
