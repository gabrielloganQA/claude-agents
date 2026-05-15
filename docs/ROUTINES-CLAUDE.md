# Routines do Claude Code (`/schedule`)

Além dos disparos do GitHub Actions, dá pra colocar uma "routine" do Claude Code rodando na nuvem em horários definidos. Isso roda um agente Claude **de verdade** — análise inteligente, não só `npm test`. Bom pra casos que exigem julgamento (decidir se algo é flake, priorizar issues, escrever resumos).

> ⚠️ Routines consomem créditos Claude. Use criteriosamente — geralmente 1x/dia ou 1x/semana é o suficiente.

## Criando uma routine

Dentro do Claude Code, rode:

```
/schedule
```

E descreva em linguagem natural o que ela deve fazer. Exemplos prontos:

### Exemplo 1 — Triagem matinal

> **Cron**: todo dia útil às 8:30 BRT
> **Comando**: roda `/qa-run`, lista issues abertas com label `bug,qa-found`, prioriza por idade e severidade, e me manda um resumo no GitHub Discussions deste repo.

### Exemplo 2 — Limpeza semanal

> **Cron**: toda segunda às 9:00 BRT
> **Comando**: roda `/security-scan`, `/dep-review` em qualquer PR aberta de Dependabot, e me dá um relatório consolidado.

### Exemplo 3 — Watcher de issues antigas

> **Cron**: toda quarta às 14:00 BRT
> **Comando**: lista issues `bug,qa-found` abertas há mais de 7 dias sem PR, e abre uma issue "TRIAGEM" sumarizando-as para revisão humana.

## Gerenciando routines existentes

```
/schedule
```

Liste, edite ou apague routines. Cada routine roda como uma nova sessão isolada do Claude Code apontada para este repo.

## Boas práticas

- **Sempre teste o prompt localmente** antes de agendar — rode a mesma instrução interativamente no `claude` e veja o que ele faz.
- **Restrinja o escopo** do que a routine pode fazer — não dê permissão pra fazer push em `main`, por exemplo.
- **Reveja os relatórios semanalmente** — routines que ninguém lê são desperdício de créditos.
- **Comece com poucas e baixa frequência** — adicione gradualmente conforme provam valor.
