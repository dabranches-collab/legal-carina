# Fluxo de desenvolvimento

1. Actualizar `main` e criar um ramo curto por alteração.
2. Trabalhar em mudanças pequenas, sem dados reais.
3. Executar `pnpm lint`, `pnpm test` e `pnpm build`.
4. Para UI relevante, instalar Chromium uma vez e executar `pnpm test:e2e`.
5. Rever `git diff`, procurar segredos e actualizar documentação/`PROJECT_STATE.md`.
6. Criar commit com mensagem clara; deploy e migrations remotas exigem etapa separada.

Migrations devem ser criadas pela CLI Supabase, revistas, testadas localmente e nunca aplicadas destrutivamente ao remoto nesta fase.


## Verificação permanente de iPhone Duo, família 18 e Dynamic Island

Antes de qualquer trabalho de interface, ler e aplicar integralmente [MOBILE_DEVICE_CONTRACT.md](MOBILE_DEVICE_CONTRACT.md). É obrigatório em todos os módulos: Duo interior/exterior e transições sem perda de estado; cada iPhone 18 confirmado; Safari e Chrome no iPhone/iPad e PWA instalada; retrato/paisagem, teclado/visualViewport, barras dinâmicas e safe areas top/right/bottom/left. Nunca esquecer Dynamic Island, recortes e indicador inferior. Medir CSS/DPR, sem os deduzir de pixels físicos; APIs de dobra/segmentos exigem feature detection. Preservar iPhones anteriores/iPad/desktop 1920×1080 a 100%, toque e leitura, sem zoom/transform global. Exigir evidência por ambiente, distinguindo emulação de aparelho físico. Editar instruções não conclui adaptação nem testes; perfis e validação física pendentes permanecem explícitos na matriz.
