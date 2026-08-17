# Protocolo para continuar noutro computador

## Localizar e preservar

1. Não criar um projecto novo e não usar OneDrive, Google Drive ou pastas equivalentes como checkout.
2. Procurar checkouts existentes da Carina - Legal e inventariar remotos, branches, HEAD, upstream, alterações, ficheiros não rastreados, stashes e worktrees.
3. Se existir trabalho desconhecido, não executar pull, switch, reset, clean ou stash. Preservar primeiro numa branch ou cópia identificada e pedir decisão quando houver conflito material.

## Preparar o checkout oficial

```powershell
New-Item -ItemType Directory -Force C:\Projetos | Out-Null
git clone https://github.com/dabranches-collab/legal-carina.git C:\Projetos\legal-carina
Set-Location C:\Projetos\legal-carina
git status --short
git remote -v
git branch --show-current
git log -1 --oneline
git fetch --all --prune
pnpm install --frozen-lockfile
```

Criar `.env.local` apenas neste computador, com `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_APP_ENV=local`. Nunca transportar `.env.local`, credenciais, `node_modules` ou ficheiros reais de clientes entre computadores.

## Reconciliar antes de trabalhar

- Ler `AGENTS.md`, `HANDOVER.md`, `PROJECT_STATE.md` e documentação relevante.
- Comparar HEAD local com `origin/main`.
- Confirmar a versão online e deployment activo na Cloudflare.
- Confirmar o projecto Supabase e listar migrations remotas antes de qualquer operação de base de dados.
- Arrancar com `pnpm dev --host 127.0.0.1 --port 5173` e abrir `http://127.0.0.1:5173/`.

Um computador só está pronto quando o checkout está limpo/sincronizado, a configuração local não está no Git e a aplicação local foi validada no browser integrado.
