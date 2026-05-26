# Como onboardar um repo no claude-agents

Onboarding em ~30 segundos via install.sh. Funciona em qualquer repo (Node, Python, Go) com `gh` autenticado.

## Pré-requisitos

- Repo no GitHub (privado ou público)
- `gh` CLI autenticado (`gh auth status` retorna OK)
- Permissão de admin no repo (pra criar labels e workflows)

## Onboarding (3 passos)

### 1. Rode o instalador

Dentro da raiz do repo alvo:

```bash
curl -sSL https://raw.githubusercontent.com/Atlante-TI/claude-agents/main/install.sh | bash
```

O script:
- Detecta stack (Cypress / Playwright / Jest / Vitest / pytest / go test)
- Cria 3 workflows que referenciam os **reusable workflows** do `claude-agents` (sem copiar código — só 3 linhas de YAML por workflow)
- Cria `.claude/agents.config.json` com os comandos do seu stack
- Cria labels canônicas no GitHub via `gh label create`
- Verifica se o secret `TEAMS_WEBHOOK_URL` está configurado

**Não sobrescreve nada existente.** Se você já tem `qa.yml`, `CLAUDE.md`, agentes Claude próprios, etc — tudo fica intacto. O script só **adiciona** arquivos novos.

### 2. Configure o secret do Teams (opcional)

Se quiser notificações no Teams:

1. No canal Teams alvo: `…` → Workflows → template **"Send webhook alerts to a channel"**
2. Copie a URL gerada
3. No GitHub do repo: Settings → Secrets and variables → Actions → New repository secret
   - Name: `TEAMS_WEBHOOK_URL`
   - Value: cole a URL

Sem o secret, os workflows seguem rodando — só não disparam notificação. Não é bloqueante.

### 3. Commit + push

```bash
git add .github/workflows/qa.yml .github/workflows/notify-issues.yml .github/workflows/notify-prs.yml .claude/agents.config.json
git commit -m "ci: integra claude-agents framework"
git push
```

Pronto. Primeiro push pra branch default já dispara o `qa.yml` via reusable.

## Como funciona

```
repo-do-seu-projeto/
└── .github/workflows/
    └── qa.yml             ← 10 linhas, chama o reusable

Atlante-TI/claude-agents/        ← codigo real mora aqui
├── .github/workflows/
│   ├── qa-reusable.yml          ← logica completa
│   ├── notify-issues-reusable.yml
│   └── notify-prs-reusable.yml
└── .github/actions/
    └── notify-teams/
        └── action.yml           ← composite action
```

Quando você roda `git push` no repo do projeto, o GitHub Actions:
1. Detecta o `qa.yml` do projeto
2. Vê que ele `uses:` o `qa-reusable.yml` do `claude-agents@main`
3. Baixa esse workflow e executa
4. Reusable faz checkout do framework e usa a `notify-teams` action

**Atualização**: bug corrigido no framework? Sobe `v2` lá. Cada repo aponta pra `@main` (sempre atualizado) ou pode pinar `@v1` (estável).

## Customização por repo

Editar `.claude/agents.config.json`:

```json
{
  "stack": "node-cypress-next",
  "commands": {
    "test": "npm run cy:qa",
    "build": "npm run build:qa",
    "dev": "npm run dev",
    "lint": "npm run lint"
  }
}
```

Editar `.github/workflows/qa.yml` pra override defaults:

```yaml
jobs:
  qa:
    uses: Atlante-TI/claude-agents/.github/workflows/qa-reusable.yml@v1
    with:
      test-cmd: "npm run cy:qa"
      needs-dev-server: true
      dev-cmd: "npm run dev"
      dev-port: "3000"
      dev-health-path: "/api/health"
      build-cmd: "npm run build:qa"
      node-version: "20"
      open-issue-on-failure: true
      issue-labels: "bug,qa-ci,wms"
    secrets:
      TEAMS_WEBHOOK_URL: ${{ secrets.TEAMS_WEBHOOK_URL }}
```

Todos os inputs estão documentados no header do `qa-reusable.yml`.

## Versionamento

- `@main` — sempre última versão (pega correções imediatamente, pode quebrar)
- `@v1` — versão major estável (correções não-breaking entram aqui)
- `@v1.2.0` — pin específico (zero drift, manual pra atualizar)

Recomendado: `@v1` em produção, `@main` em repos exploratórios.

## Desinstalação

Pra remover, apague:
- `.github/workflows/qa.yml`
- `.github/workflows/notify-issues.yml`
- `.github/workflows/notify-prs.yml`
- `.claude/agents.config.json`

Labels e secret ficam no GitHub (decisão sua se quer remover também).

## Quando NÃO usar install.sh

- Repo com workflows muito customizados que conflitam com `qa.yml` (nome igual)
- Stack não-detectada — vai gerar config inválida, prefira config manual
- Monorepo com múltiplos apps — install.sh assume 1 app por repo

Nesses casos, copie os trechos do template manualmente.

## Troubleshooting

**"Repo nao reconhecido pelo gh"**
→ Sem remote `origin` apontando pro GitHub. Adicione com `gh repo set-default`.

**"Secret TEAMS_WEBHOOK_URL nao encontrado"**
→ Só warning. Workflows rodam, notificações ficam silenciosas (no-op no composite action).

**"Workflow qa.yml ja existe"**
→ Script não sobrescreve. Renomeie o seu pra `qa-legacy.yml` ou ajuste manualmente.

**Reusable workflow falha com "repository not found"**
→ Se `Atlante-TI/claude-agents` é privado, o repo consumidor precisa de Actions configurado pra acessar repos privados na mesma org. Settings → Actions → "Allow Atlante-TI/* actions".
