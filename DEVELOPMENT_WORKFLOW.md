# Fluxo de desenvolvimento

1. Atualizar `main` e criar um ramo curto por alteração.
2. Trabalhar em mudanças pequenas, sem dados reais.
3. Executar `pnpm lint`, `pnpm test` e `pnpm build`.
4. Para UI relevante, instalar Chromium uma vez e executar `pnpm test:e2e`.
5. Rever `git diff`, procurar segredos e atualizar documentação/`PROJECT_STATE.md`.
6. Criar commit com mensagem clara; deploy e migrations remotas exigem etapa separada.

Migrations devem ser criadas pela CLI Supabase, revistas, testadas localmente e nunca aplicadas destrutivamente ao remoto nesta fase.
