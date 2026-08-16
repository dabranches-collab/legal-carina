# iPhone, PWA e áreas seguras

## Aplicação real

- O viewport usa `viewport-fit=cover`.
- Os quatro insets provêm de `env(safe-area-inset-top/right/bottom/left)` e alimentam tokens semânticos de layout.
- Cabeçalho, sidebar, conteúdo, autenticação, modais, overlays e avisos de actualização respeitam esses tokens.
- `100dvh` é usado como altura funcional, mantendo `100vh` como fallback.
- O manifest usa `display: standalone`, ícones PNG para iOS/instalação e ícone SVG maskable.
- O service worker aplica network-first ao conteúdo da aplicação, mantém um shell offline mínimo e só activa uma nova versão após acção explícita no aviso de actualização.
- O modo escuro segue `prefers-color-scheme`; `prefers-reduced-motion` elimina animações não essenciais.

Não existe detecção por user agent. Os valores específicos de modelos nunca são usados em produção.

## Matriz local

Disponível apenas no servidor Vite de desenvolvimento em `http://127.0.0.1:5173/iphone-preview`. O middleware é `apply: serve`, pelo que a rota e os ficheiros `qa/` não entram em `dist/`.

A matriz inclui os 11 modelos solicitados, alternância acessível por `aria-pressed`, Safari/PWA, claro/escuro e vertical/horizontal. O iframe isolado recebe insets de QA apenas quando `import.meta.env.DEV` e `qa-iphone=1`; o ramo é removido do comportamento de produção.

Dynamic Island e notch usam geometrias distintas. Em landscape, o recorte e os insets deslocam-se para as laterais; os modelos Pro mantêm 62 px em vez dos 59 px gerais.

## Validação em 2026-08-09

- 11/11 viewports: sem overflow horizontal, título e cabeçalho fora do recorte, alvos visíveis com pelo menos 44 px.
- Island 59 px, Island Pro 62 px e notch 47 px: inspecionados visualmente.
- Safari normal/PWA standalone, claro/escuro e vertical/horizontal: inspecionados na matriz.
- Texto base ampliado para 20 px e foco de formulário/teclado: sem overflow horizontal.
- Manifest, assets e service worker: build e registo no preview de produção local validados.
- A rota de QA não está presente no build de produção.

## Exceção e gate de publicação

Esta estação não disponibiliza o motor WebKit/iOS nem hardware iPhone. A matriz valida CSS, geometria, breakpoints, acessibilidade e ciclo de vida PWA em Chromium; antes da publicação deve repetir-se um smoke test em Safari iOS real, incluindo teclado, zoom do sistema, rotação, instalação no ecrã principal e actualização entre duas versões do service worker. Isto é um risco residual documentado, não uma alegação de equivalência total com hardware.
