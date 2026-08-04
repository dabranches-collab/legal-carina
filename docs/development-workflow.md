# Workflow de desenvolvimento

1. Começar sempre com `git switch main` e `git pull --ff-only`.
2. Criar `feature/*`, `fix/*`, `docs/*` ou `security/*` por alteração coerente.
3. Usar exclusivamente o `pnpm-lock.yaml` versionado e `pnpm install --frozen-lockfile`.
4. Manter `.env.local` por computador; nunca sincronizar segredos por OneDrive, email ou chat.
5. Executar `pnpm check` e, quando muda um fluxo, `pnpm test:e2e`.
6. Fazer commits pequenos, push da branch e pull request com impacto, testes e rollback.
7. Atualizar a branch antes do merge e exigir CI verde e revisão.

## Proteção pretendida para `main`

- Pull request obrigatório, uma aprovação e conversas resolvidas.
- Proibir force-push e eliminação da branch.
- Exigir `CI / validate`, `CI / dependency-audit` e `Secret scan / scan`.
- Exigir branch atualizada antes do merge e aplicar a administradores.
- CODEOWNERS para migrations, workflows e segurança.

A configuração remota não foi aplicada nesta fase porque a sessão `gh` local está inválida. Depois de autenticar, um administrador deve configurar a ruleset no GitHub e confirmar se a proteção de branches privadas está incluída no plano da conta antes de a ativar.
