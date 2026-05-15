# Branch Protection — configuração recomendada

O agente `dev-fixer` nunca faz merge sozinho — mas pra ter certeza que ninguém (nem outro agente, nem dev distraído) faça merge sem revisão, configure proteção na branch `main` no GitHub.

## Passo-a-passo (uma vez por repo)

1. Vá em **Settings → Branches → Branch protection rules → Add rule**.
2. Em **Branch name pattern**, digite: `main`.
3. Marque as opções:

   - [x] **Require a pull request before merging**
     - [x] Require approvals — `1`
     - [x] Dismiss stale pull request approvals when new commits are pushed
     - [x] Require review from Code Owners (usa o `.github/CODEOWNERS`)
   - [x] **Require status checks to pass before merging**
     - [x] Require branches to be up to date before merging
     - Adicione o check: `test` (o nome do job no `qa.yml`)
   - [x] **Require conversation resolution before merging**
   - [x] **Do not allow bypassing the above settings** (aplica até pra admins)

4. Salve.

## Resultado

A partir daqui:
- Nenhum push direto na `main` é aceito.
- Toda PR precisa de **CI verde** + **1 aprovação humana** (via Code Owners) pra mergear.
- O fluxo do `dev-fixer` (PR → revisão humana → merge) fica blindado.

## Verificação

Tente fazer um push direto pra main de uma branch local — deve ser rejeitado:

```bash
git checkout main
echo "teste" >> /tmp/teste.txt
git add /tmp/teste.txt 2>/dev/null || true
git commit --allow-empty -m "teste"
git push origin main   # ← deve falhar com "protected branch"
```

Se passar, a regra não está aplicada — revise os checkboxes.
