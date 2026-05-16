# Metodologias de Teste — referência para os agentes QA

Este documento é a **base de conhecimento** consultada pelos agentes `qa-tester` e `qa-explorer` ao escolher como atacar uma área. Cada cenário gerado deve declarar qual técnica está aplicando — isso dá rigor e facilita revisão pelo time.

> **Origem do material**: taxonomia consolidada de ISTQB + literatura clássica (Beizer, McCabe, Myers). Adaptado para o contexto deste projeto.

---

## A. Testes de Caixa Branca (White Box / Estruturais)

Quando o agente tem acesso ao código-fonte (caso comum em CI interno), aplique:

### A.1 Teste de Fluxo de Controle (Control Flow Testing)

Diferentes níveis de **cobertura**:

| Nível | O que cobre | Quando aplicar |
| --- | --- | --- |
| **Statement Coverage** | Cada linha executada ≥1x | Base mínima — primeira passada em qualquer função |
| **Branch / Decision Coverage** | Cada `if/else`, `switch`, `while` testado em todas as direções | Padrão recomendado para regressão |
| **Condition Coverage** | Cada condição booleana avaliada `true` e `false` independentemente | Funções com booleans compostas |
| **Decision/Condition Coverage** | Combina os dois acima | Lógica de validação |
| **Multiple Condition Coverage** | Todas as combinações possíveis | Pequenos predicados críticos (não escala) |
| **MC/DC** | Cada condição afeta independentemente o resultado | Sistemas críticos (aviação DO-178C, médico, automotivo) — provavelmente over-kill aqui |
| **Path Coverage** | Todos os caminhos lógicos | Funções com poucos branches |

**Exemplo no `sample-app`**: a função `createTodo(text)` tem 1 branch (typeof text !== "string"). Branch coverage exige 2 testes: um `text` string e um não-string. Statement coverage cobre só 1 já que ambas linhas executam.

### A.2 Teste de Caminho Básico (Basis Path Testing — McCabe)

Usa o **grafo de fluxo de controle** e a **complexidade ciclomática** `V(G) = arestas − nós + 2` para achar o número mínimo de caminhos independentes.

**Quando aplicar**: funções com complexidade ciclomática > 5. Calcule com `npm install -g complexity-report`.

### A.3 Teste de Fluxo de Dados (Data Flow Testing)

Analisa o ciclo de vida das variáveis: **definição (d) → uso (u) → morte (k)**. Detecta:
- Variável definida e nunca usada
- Uso antes da definição
- Redefinição sem uso anterior

Subtipos: All-Definitions, All-Uses, All-DU-Paths, All-P-Uses (predicate uses), All-C-Uses (computational uses).

### A.4 Teste de Loop (Loop Testing)

Para cada laço, testar: **0, 1, 2, n, máximo, máximo+1 iterações**.

- **Loops simples**: aplica os 6 casos acima
- **Loops aninhados**: incremental, começando pelo mais interno
- **Loops concatenados**: independentes se forem independentes
- **Loops não estruturados**: reestruturar antes (anti-pattern)

### A.5 Teste de Mutação (Mutation Testing)

Insere pequenas alterações (mutantes) no código (`+` → `-`, `>` → `<`, `===` → `!==`) e verifica se os testes existentes **detectam** a mutação. Mede a qualidade da suíte com **mutation score**.

**Ferramenta para Node**: [Stryker](https://stryker-mutator.io/) — `npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner` (ou Node test runner equivalente).

### A.6 Teste de Unidade (Unit Testing)

Menor unidade isolada (função/método). Aqui usamos `node:test`. Frameworks alternativos: Jest, Vitest, Mocha.

### A.7 Teste de Integração (caixa branca)

Valida comunicação entre módulos com conhecimento da estrutura interna (ex: o route handler `POST` chama `createTodo` que escreve em `globalThis.__claudeAgentsStore`).

### A.8 Análise Estática

Não executa código. Detecta padrões, code smells, vulnerabilidades, complexidade.

**Ferramentas**:
- ESLint (sintaxe + boas práticas)
- TypeScript no `--strict` (tipos)
- SonarQube (qualidade + segurança)
- `npm audit` (CVEs em deps)

### A.9 SAST (Static Application Security Testing)

Procura vulnerabilidades no código: SQL injection, XSS, buffer overflow, secrets hardcoded.

**Ferramentas**: GitHub CodeQL (gratuito em repos públicos), Semgrep, Fortify, Veracode, Checkmarx.

### A.10 Teste de API (caixa branca)

Endpoints com conhecimento das queries/lógica interna. Valida regras de negócio embutidas, não só schema de I/O.

---

## B. Testes de Caixa Preta (Black Box / Funcionais)

Sem conhecer estrutura interna — só entradas, saídas e requisitos.

### B.1 Particionamento de Equivalência

Divide entradas em **classes** que se comportam igual. Testa um representante por classe.

**Exemplo**: `POST /api/todos { text }` com regra "texto entre 1 e 500 chars":
| Classe | Representante | Esperado |
| --- | --- | --- |
| Inválida (vazio) | `""` | 400 |
| Inválida (>500) | `"a".repeat(501)` | 400 |
| Válida | `"comprar pão"` | 201 |

### B.2 Análise de Valor Limite (Boundary Value Analysis)

Testa **bordas** das classes: `limite-1`, `limite`, `limite+1`.

**Exemplo** (mesma regra acima): testar com `text` de tamanho `0, 1, 2, 499, 500, 501`. A maioria dos bugs vive nas bordas.

### B.3 Tabela de Decisão (Decision Table)

Mapeia combinações de condições → ações em formato tabular. Ótimo para regras complexas.

**Exemplo**: "Toggle de TODO":
| Condição: TODO existe? | Condição: já está done? | Ação esperada |
| --- | --- | --- |
| Não | (n/a) | 404 |
| Sim | Não | Marca done=true, retorna 200 |
| Sim | Sim | Marca done=false, retorna 200 |

### B.4 Transição de Estados (State Transition)

Modela o sistema como **máquina de estados**. Testa estados, transições, eventos, ações.

**Exemplo (UI do TODO)**:
```
[vazio] --(adiciona)--> [com items] --(toggle)--> [com items mistos]
                                  --(remove)--> [vazio] ou [com items]
```
Testa cada transição.

### B.5 Casos de Uso / Cenários

Deriva testes de **casos de uso** ou **narrativas realistas**. Cobre fluxo principal, alternativos, exceção.

### B.6 Teste Exploratório

Sem roteiro, simultaneamente projeta e executa. Depende de criatividade. **É o que o agente `qa-explorer` faz por padrão**, mas guiado por metodologias B.1-B.5 (não chute aleatório).

### B.7 Ad Hoc

Sem planejamento, intuição. Mais informal que exploratório. **Evitar no agente** — sempre prefira uma técnica nomeada.

### B.8 Error Guessing

Baseado em padrões conhecidos: campos vazios, null, chars especiais, datas inválidas, off-by-one, encoding.

### B.9 Funcional

Valida cada funcionalidade contra os requisitos. Subtipos:
- **Smoke**: verificação rápida do happy path (já temos)
- **Sanity**: validação focada após mudança pequena
- **Regression**: garante que mudanças não quebraram nada (o que o `qa-tester` faz)
- **Retesting**: re-executa após fix (o que o `/verify` faz)

### B.10 Não Funcionais

Atributos de qualidade:

| Tipo | O que mede | Ferramenta sugerida |
| --- | --- | --- |
| **Performance** | Tempo de resposta, throughput | k6, Apache Bench, Lighthouse |
| **Load** | Carga esperada | k6, Artillery |
| **Stress** | Limites máximos | k6 com ramp-up |
| **Volume** | Grandes quantidades de dados | Seed 1M registros e medir |
| **Escalabilidade** | Capacidade de crescer | Kubernetes HPA tests |
| **Endurance (Soak)** | Execução longa | k6 com `--duration 4h` |
| **Usabilidade** | Facilidade de uso | Testes com usuários (manual) |
| **Acessibilidade** | WCAG, screen readers | axe-core, Lighthouse a11y |
| **Compatibilidade** | Navegadores, dispositivos, SOs | Playwright cross-browser, BrowserStack |
| **Portabilidade** | Migração entre ambientes | CI em múltiplos OS |
| **Confiabilidade** | MTBF, tolerância a falhas | Chaos engineering |
| **Recuperação** | Comportamento pós-falha | Simular kills/restarts |
| **DAST** (segurança dinâmica) | Pen test em runtime | OWASP ZAP, Burp Suite |
| **i18n/L10n** | Idiomas, moedas, formatos | Pseudo-localização |
| **Instalação** | Install/upgrade/uninstall | Scripts de smoke pós-deploy |

### B.11 Aceitação

Validação final:
- **UAT** — usuários finais
- **Alfa** — interno, ambiente controlado
- **Beta** — usuários reais, ambiente real
- **BAT** — regras de negócio
- **OAT** — operacional (backup, recovery, monitoring)
- **Contratual / Regulatório** — LGPD, GDPR, HIPAA, etc.

### B.12 Sistema

Sistema completo integrado, ambiente similar a produção.

### B.13 Integração (caixa preta)

Comunicação entre módulos sem ver implementação:
- **Big Bang** — tudo de uma vez (arriscado)
- **Top-Down** — do topo pra baixo, usa stubs
- **Bottom-Up** — de baixo pra cima, usa drivers
- **Sandwich / Híbrido** — combinação

### B.14 API (caixa preta)

Endpoints sem conhecer implementação. Ferramentas: Postman, Insomnia, REST Assured, SoapUI, curl.

### B.15 GUI

Elementos visuais, layout, navegação, responsividade. Ferramentas: Playwright (o que usamos), Cypress, Selenium.

### B.16 Banco de Dados (caixa preta)

Integridade, transações, persistência sem ver schema interno.

### B.17 A/B Testing

Compara duas versões em produção pra ver qual performa melhor com usuários reais. Requer analytics e feature flags.

### B.18 Smoke em Produção

Smoke pós-deploy pra garantir que o sistema básico está respondendo.

### B.19 Model-Based Testing

Casos gerados automaticamente a partir de modelos formais (state machines, BPMN, etc.).

---

## C. Aplicabilidade neste projeto (claude-agents / sample-app)

Algumas técnicas brilham aqui, outras não fazem sentido para um TODO de exemplo. Resumo prático:

| Técnica | Status |
| --- | --- |
| Statement / Branch / Decision Coverage | ✅ aplicar (use `c8` para medir) |
| Boundary Value Analysis | ✅ aplicar (text size, ids, contadores) |
| Equivalence Partitioning | ✅ aplicar (válido/inválido em POST) |
| Decision Table | ✅ aplicar (toggle, validações combinadas) |
| State Transition | ✅ aplicar (UI: empty → loaded → mutating → loaded) |
| Loop Testing | ⚠️ pouco aplicável (poucos loops aqui) |
| Mutation Testing | ✅ aplicar com Stryker (mede qualidade da suite) |
| Error Guessing | ✅ sempre — pano de fundo |
| SAST / DAST | ✅ via `security-scanner` agent + GitHub CodeQL |
| Performance / Load | ⚠️ só faz sentido com app real, não com o de exemplo |
| Acessibilidade | ✅ via axe-core (proposta de agente `a11y-checker`) |
| Compatibilidade cross-browser | ⚠️ Playwright suporta — habilitar quando tiver mais browsers no projects[] |
| A/B Testing | ❌ requer prod com tráfego |
| Regulatório (LGPD/GDPR) | ⚠️ aplicável quando armazenar PII de verdade |
| Model-Based Testing | ⚠️ avançado — considerar quando houver state machines explícitas |

---

## D. Como o agente declara a técnica em cada teste

Todo teste gerado pelo `qa-explorer` deve começar com um header explicitando:

```js
/**
 * Técnica: Boundary Value Analysis (B.2)
 * Área alvo: POST /api/todos — campo `text`
 * Hipótese: Texto com 10001 chars (limite+1 se limite=10000) deve ser rejeitado.
 * Risco: sem limite, cliente envia payloads gigantes → memory blow, DB cresce.
 */
```

Convenção: o código da técnica (`A.1`, `B.2`, etc.) vem da seção neste documento. Permite que humanos e agentes futuros saibam exatamente que metodologia foi aplicada.

---

## E. Quando usar qual técnica — heurística rápida

| Situação | Técnica recomendada |
| --- | --- |
| Função pequena com lógica condicional | Branch Coverage + Decision Table |
| Endpoint REST que recebe input | Equivalence + Boundary Value Analysis |
| UI com estados | State Transition |
| Função com loop | Loop Testing (0, 1, n, máximo) |
| Suite robusta mas suspeita de qualidade | Mutation Testing |
| Código novo, sem testes | Statement Coverage primeiro, depois Branch |
| Bug que voltou | Retesting + Regression |
| Mudança de design grande | Acceptance + System |
| Antes de release | Smoke + Regression |
| Pós-deploy em prod | Smoke em Produção |
| Suspeita de vulnerabilidade | SAST (estático) + DAST (dinâmico) |
| Lista de combinações de regras | Decision Table |

---

Esta referência será expandida conforme o time encontrar lacunas. Adicionar técnicas via PR `docs: ...`.
