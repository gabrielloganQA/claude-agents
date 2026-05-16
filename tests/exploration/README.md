# tests/exploration/

Espaço de trabalho do agente **`qa-explorer`** (ver `.claude/agents/qa-explorer.md`).

Aqui ficam **testes em estado de hipótese** — gerados automaticamente para cenários ainda não cobertos pela suite oficial em `tests/api/` e `tests/web/`.

## Ciclo de vida de um teste aqui

```
qa-explorer gera hipótese
       ↓
escreve teste em tests/exploration/<area>/<nome>.test.js
       ↓
executa
       ↓
┌──────────────────┬──────────────────┬──────────────────┐
│   FALHA (bug)    │ PASSA, é valioso │ PASSA, redundante│
├──────────────────┼──────────────────┼──────────────────┤
│ abre Issue       │ propõe PR        │ deleta           │
│ teste permanece  │ promove para     │ anota no MAP.md  │
│ aqui até #fix    │ tests/{api,web}/ │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

## O que NÃO fica aqui

- Testes oficiais de regressão → `tests/api/` ou `tests/web/`
- Testes flakey/quebrados sem dono → deletados (não acumulam)
- Testes manuais one-off de dev → use `/tmp/`

## Estrutura

```
tests/exploration/
├── README.md          # este arquivo
├── MAP.md             # registro do que já foi explorado (cérebro do agente)
├── api/               # explorações de endpoints
│   └── *.test.js
└── web/               # explorações de UI
    └── *.spec.js
```

## Como rodar manualmente (sem o agente)

```bash
node --test tests/exploration/api/*.test.js
npx playwright test tests/exploration/web/
```

Mas o uso normal é via `/qa-explore` no Claude Code.
