> Actualização: consultar [FOLLOWUP.md](FOLLOWUP.md) para WebKit recuperado e resultados posteriores. As indicações de bloqueio abaixo são históricas.

# QA visual — Carina Legal — 10-10-2026

Base remota verificada: 842d499c6c30ea73b2e8d668a8ef2b53c033b3f3. Branch local codex/screen-qa-20261010. Produção: ver evidence/public-versions.json (HTTP público, não certificação de deployment ID).

112 estados na matriz Chromium; 112 na matriz Google Chrome. Menus: overview; billing; professionals; clients; retainers; work; debtors; payments; provisions; notes; master-data; admin; admin-users; imports; import-review; admin-access-logs.

A matriz inicial inclui estados vazios/loading e guardas de permissão, não aprovação funcional de todas as operações. O suplemento carina-populated.json espera a vista carregada e cobre PARTICULARES/EMPRESAS/MISTOS (Alfa sintético em particulares, restantes vazios) e preserva um rascunho não guardado em 390×524 → 844×390 → 390×844. payments.json cobre as quatro listas com fixture sintética, sem submeter pagamentos. CSS, tabela e MasterDataPage estão em edição concorrente em C:/Dev/legal-carina-payments; não alterados. Chrome registou uma ocorrência transitória scrollWidth=406 para viewport=320 no Resumo durante loading. A repetição de 0/200/800/1600 ms manteve scrollWidth=320; portanto ocorrência observada, não reproduzida de forma estável. Ver chrome-evidence/carina-overflow-followup.json. Não foi aplicado patch ao CSS concorrente nem certificada ausência absoluta de overflow.

[Linhas por menu/perfil](matrix.csv), [medições Chromium](evidence/carina-matrix.json), [capturas e suplementos](evidence/). As filas e tabelas vazias só validam esse estado. Alertas de actualização foram conservados nas capturas.

## Ambiente e limites

HP Windows, clones isolados fora de OneDrive; Chromium 151.0.7922.34 e Google Chrome desktop 155.0.8059.39 em perfis temporários. Tudo é renderização real em browser automatizado com fixtures, não auditoria estática. Capturas geradas e amostras revistas visualmente; cada captura não recebeu revisão manual individual. As matrizes medem principalmente overflow global, conteúdo renderizado e viewport; não certificam todos os controlos, modais ou operações.

Perfis genéricos CSS: 320×568; 390×844; 844×390; 932×430; 768×1024; 1024×768; 1920×1080. DPR e visualViewport constam nos JSON. Não são perfis medidos Duo/18, nem prova de desktop físico a 100%. Insets sintéticos top/right/bottom/left: 59/0/34/0 em retrato; 0/59/21/59 em paisagem; 24/0/20/0 em tablet. Não foi emulada a geometria exacta da Dynamic Island. GR tem segunda matriz hasTouch=true; suplementos de Cabo Ledo e formulários usam toque simulado.

PENDENTES: Safari físico, Chrome iOS, PWA realmente instalada, teclado e barras iOS reais, Dynamic Island física, dobragem Duo, medidas CSS/DPR dos modelos novos, contraste/toque completo, todos os estados preenchidos/vazios/erro/loading, claro/escuro completo, todos os submenus e modais e transições com operações em curso. WebKit automatizado BLOQUEADO por libxml2.dll em falta; browser autorizado CUA BLOQUEADO antes de abrir ecrã (HRESULT 0x80070003, plataforma Windows em falta). Não houve contorno de sessões, extracção de tokens ou alterações de permissões.

Fontes oficiais reconsultadas: [Apple Duo](https://www.apple.com/iphone-duo/specs/) e [Apple 18 Pro/Pro Max](https://www.apple.com/iphone-18-pro/specs/). Especificações físicas confirmadas não foram usadas para deduzir CSS/DPR. Contratos QA das PR99/PR5/PR26 consultados sem merge; hashes documentais 8a814ba/8eba132/018ded0.

Sem merge, deploy, alteração de serviço/BD/auth/credenciais/migrations ou dados reais. Não foram alterados ficheiros funcionais; este commit guarda evidência e pendências. A ausência de overflow não é uma aprovação global.
