# Configuração em Windows

## Diretório obrigatório

Todos os computadores usam `C:\Projetos\legal-carina`, fora do OneDrive. Não copie a pasta de outro computador e nunca copie `node_modules`.

```powershell
New-Item -ItemType Directory -Force C:\Projetos | Out-Null
Set-Location C:\Projetos
git clone https://github.com/dabranches-collab/legal-carina.git
Set-Location C:\Projetos\legal-carina
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Preencha em `.env.local` apenas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_APP_ENV=local`. A chave publicável pode estar no browser; service role, passwords e segredos de Edge Functions nunca podem usar prefixo `VITE_`.

## Rotina diária

```powershell
git switch main
git pull --ff-only
git switch -c feature/nome-curto
pnpm install --frozen-lockfile
pnpm check
```

No fim, faça commit e push da branch. Abra pull request; não faça push directo para `main`. Consulte `docs/development-workflow.md`.
