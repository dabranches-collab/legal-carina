# Follow-up WebKit / revisão isolada — 10-10-2026

WebKit 26.0 executado no HP com Playwright 1.56.1 e runtime2215 emparelhados. O bloqueio anterior pertence ao par1.62.1/v2336; não houve alteração global de DLL/PATH. WebKit automatizado não é Safari físico. Insets sintéticos, DPR1, sem PWA instalada, teclado físico/iOS ou certificação Dynamic Island. Todos os dados dos ensaios são fixtures locais.

16 vistas×7=112 estados WebKit. Matriz rápida detectou overflow em11 vistas a320px durante transições; repetição com500ms registada separadamente se disponível. Abertura directa de overview a320px manteve scrollWidth320 em0/200/800/1600ms; charts largos são scroll interno. Não atribuir aprovação funcional a loading/guardas de permissão. Código concorrente preservado.

Sem merge/deploy. Matrizes físicas permanecem pendentes. Runners locais empacotados separadamente; screenshots e JSON não contêm dados de sessões reais.

Repetição500ms: 112 estados, overflow em [], erros [].

Repetição com500ms após resize:112/112 estados sem overflow global e sem erros. A matriz rápida registou transições ainda em curso; abertura directa320px também permaneceu estável.
