## 2026-10-10 — 0.16.4 publicada por Workers Builds

Publicação directamente autorizada pelo utilizador. PR #105 integrada em main b0b2d6542f5070a00bf49ffcb9c0780d6a4854da, candidato revisto fcd98f6ffef51998d422b58298d9cf211f5bacf4. Corrige a preservação da posição manual dos gráficos após resize/rotação e a sincronização do harness; sem alteração de negócio ou dados.

Workers Builds ce84893e-898d-4beb-9abb-7a62e22feee1 success no SHA integrado; Version ID ab9f99d1-bed4-488b-87b5-64d6e0e4750c, deployment 2abba4e4-7f4a-4d94-94a7-5257fc10426d, 100% desde 10-10-2026 20:34:35 WAT (19:34:35 UTC). Via única automática existente, sem deploy manual, alterações de pipeline, secrets, Auth, BD ou migrations. Rollback de referência anterior:39feb006-0984-4c42-acf7-27a8896299d2 (não executado).

CI candidata38071495496 e Secret scan38071495480 success:355 unitários,72 integração,360 WebKit,182 E2E e4 PWA; os4 skipped no runner geral são os4 casos PWA aprovados separadamente. Revisões independentes do scroll e harness sem bloqueio; dry-run local aprovado, configuração pública validada pela fingerprint existente. O controlo de interrupção cobre fetch sintético já pendente; não prova isoladamente a causalidade do prefetch real iniciado em beforeunload.

Produção https://legal-carina.dabranches.workers.dev confirma0.16.4. Dos82 ficheiros verificados,75 coincidem byte a byte com o build local;7 ficheiros de texto coincidem após normalizar apenas CRLF/CRCRLF para LF (diferença Windows/Linux). Nenhuma divergência de conteúdo após essa normalização; hashes originais e normalizados preservados no recibo. Bundles JS/CSS coincidem exactamente.

Entrada pública verificada em Chrome155 e WebKit26,390×844,844×390 e1920×1080:6/6 HTTP200, botão Entrar visível, sem overflow, escala1 e zero pageerrors. Sem credenciais submetidas nem escritas. Smoke de menus autenticados NÃO executado: CUA falha antes de abrir sessão com HRESULT0x80070003. Não copiar sessões/tokens nem extrapolar este smoke para menus autenticados. Safari físico,Chrome iOS,PWA realmente instalada,teclado/Dynamic Island físicos permanecem pendentes. Captura pública local mostra o aviso de actualização0.16.4.

Evidências sanitizadas em docs/workflow/publication-0164/: hashes, browser, deployment e CI candidata. A CI automática de main é uma execução separada da CI candidata aprovada; o resultado terminal dessa execução não é afirmado neste recibo. Esta branch é apenas documentação pós-publicação e deve permanecer draft sem novo merge para não disparar outro build.

Entradas seguintes são históricas.

