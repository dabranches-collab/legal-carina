# Regras permanentes de continuidade

Estas regras aplicam-se a qualquer pessoa ou agente que trabalhe na Carina - Legal.

## Antes de alterar

1. Usar exclusivamente `C:\Projetos\legal-carina`, fora de pastas sincronizadas.
2. Ler `HANDOVER.md`, `PROJECT_STATE.md`, `README.md` e a documentação relevante em `docs/`.
3. Confirmar `git status --short`, branch, upstream, remotos, HEAD, worktrees e stashes.
4. Preservar alterações desconhecidas; não executar pull, mudança de branch, reset, clean ou stash sobre trabalho não identificado.
5. Depois de confirmar o checkout limpo, executar `git fetch --all --prune` e comparar HEAD local, `origin/main`, handover do GitHub e produção.
6. Confirmar a versão realmente publicada na Cloudflare e o estado conhecido do Supabase. Não confiar apenas num handover local.

## Desenvolvimento e segurança

- Produção só muda após ordem explícita **“publica”**.
- Trabalhar em alterações pequenas, numa branch `codex/*`, e manter localmente a próxima versão SemVer em preparação.
- Não copiar `node_modules`; usar `pnpm install --frozen-lockfile`.
- Guardar configuração local apenas em `.env.local` não versionado.
- Nunca guardar ou reproduzir passwords, PINs, tokens, chaves secretas, service role, `.env`, dados pessoais ou ficheiros reais de clientes.
- Usar apenas dados sintéticos em testes e previews.
- Antes de qualquer operação de migrations, executar e rever `supabase migration list --linked`. Nunca usar `supabase db push` indiscriminadamente, `migration repair` por suposição ou operações destrutivas remotas.
- Preservar a arquitectura React/TypeScript/Vite/Tailwind/Supabase/Cloudflare existente e escrever em português de Portugal sem o último Acordo Ortográfico.

## Validação e entrega

- Testar alterações visuais no browser integrado em claro/escuro, desktop, tablet, iPhone/PWA e safe areas relevantes.
- Antes de publicar executar `pnpm security:files`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e E2E; confirmar CI verde e fazer dry-run Cloudflare.
- Depois de cada lote concluído, actualizar `PROJECT_STATE.md` e `HANDOVER.md`, fazer commit claro e push da branch para centralizar o trabalho sem publicar produção.
- O handover deve distinguir código local, GitHub e produção e registar versão, commit, branch, ambiente, URL, deployment ID, version ID e data confirmados.
- Nunca deixar produção à frente do GitHub.

Consultar ainda `docs/NEW_COMPUTER_PROTOCOL.md`, `docs/VERSIONING.md`, `docs/deployment.md` e `docs/database/migration-reconciliation.md`.
