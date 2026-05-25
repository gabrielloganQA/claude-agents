---
description: Roda TODOS os tipos de teste em sequência — regressão, segurança, cobertura, performance, mutação. Ponto único de entrada quando você não quer pensar.
argument-hint: "[opcional: --rapido (pula perf+mutation, ~8min) | --com-a11y (inclui a11y mesmo desabilitado) | --com-mutation (inclui mutação, +60min)]"
---

Execute a bateria completa de testes orquestrando os agentes especialistas em sequência. Este é o "faz-tudo" pra quando você só quer **"checa tudo aí"** sem decidir qual comando rodar.

Argumento do usuário: $ARGUMENTS

## Ordem de execução

A ordem importa — testes rápidos e críticos primeiro pra falhar cedo:

### 1. **qa-tester** (regressão) — ~5min
- Roda `/qa-run`.
- Se falhar: **PARAR**. Sem sentido medir cobertura/perf de app quebrada.
- Reportar issues abertas.

### 2. **security-scanner** — ~2min
- Roda `/security-scan`.
- Sempre continua mesmo se achar problema (issues abertas serão tratadas depois).
- Marca achados com label `security`.

### 3. **coverage-auditor** — ~6min
- Roda `/coverage-audit`.
- Reporta linhas/branches não cobertos.
- Sugere onde adicionar teste.

### 4. **perf-regression** — ~10min
- Roda `/perf-check`.
- **Pular se `--rapido`**.
- Compara com `perf-baseline/`. Se regrediu >10%: abre issue `perf`.

### 5. **a11y-checker** — ~2min
- **Pular por padrão** (empresa não adotou WCAG ainda — ver `.github/workflows/a11y.yml`).
- Rodar apenas se `--com-a11y` foi passado.

### 6. **mutation-tester** — ~60min
- **Pular por padrão** (lento demais pra rotina).
- Rodar apenas se `--com-mutation` foi passado.

### 7. **triage-bot** — <1min
- Roda `/triage`.
- Categoriza todas issues novas abertas nos passos acima.
- Aplica `priority:*` e `area:*`.

## Modos

| Modo | O que roda | Tempo total |
|---|---|---|
| `/qa-tudo` (padrão) | regressão + segurança + cobertura + perf + triagem | ~25min |
| `/qa-tudo --rapido` | regressão + segurança + triagem | ~8min |
| `/qa-tudo --com-a11y` | padrão + a11y | ~27min |
| `/qa-tudo --com-mutation` | padrão + mutação | ~85min |
| `/qa-tudo --com-a11y --com-mutation` | tudo absolutamente | ~90min |

## Output final esperado

Ao terminar, emitir um resumo único no chat. Não copiar a saída completa de cada subagente — só o veredicto:

```
🧪 QA-TUDO CONCLUÍDO — {tempo_total}

✅ Regressão           — 0 falhas (87 testes)
⚠️  Segurança           — 1 issue aberta (#42, dep com CVE médio)
✅ Cobertura           — 78% statements, 71% branches (acima do mínimo)
❌ Performance         — LCP regrediu 15% (issue #43 aberta)
⏭️ A11y                — pulado (use --com-a11y pra rodar)
⏭️ Mutação             — pulado (use --com-mutation pra rodar)
🏷️ Triagem             — 2 issues novas classificadas:
                          #42 priority:medium, area:security
                          #43 priority:high, area:perf

📊 Próxima ação sugerida:
   /dev-fix 43   (perf regression é high priority)
```

## Regras

- **Sempre rodar passos 1-3 e 7**. Os outros são opcionais.
- **Se passo 1 (regressão) falhar**: parar e reportar. Não faz sentido medir cobertura/perf de app que não passa nos testes básicos.
- **Não abrir PR**. Só issues. Decisão de fix fica com o humano.
- **Não dar push**. Apenas leitura+análise+abertura de issues.
- **Idempotente**. Se uma issue idêntica já está aberta (mesmo título), não duplicar — comentar nela.
- **Reportar tempo real gasto** por passo no resumo final.

## Quando NÃO usar

- Quando você só quer testar uma coisa específica → use o comando individual (`/perf-check`, `/security-scan`, etc).
- Antes de abrir PR pequeno → use `/pre-pr-check` (focado no diff, mais rápido).
- Em CI → os workflows já cuidam (`qa.yml`, `qa-nightly.yml`, etc).

Este comando é pra **sessão interativa**, quando você quer um diagnóstico amplo do estado da aplicação numa tacada só.
