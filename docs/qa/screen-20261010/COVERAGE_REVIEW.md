# Cobertura revista por menu

Não se declara aprovação funcional integral dos menus. Sem overflow/pageerror não significa ausência de mensagem de erro dentro da UI.48 amostras finais+repetições abaixo, WebKit26 automatizado.

| Vista | Conteúdo realmente observado |
|---|---|
| overview | Repetição terminou loading, com conteúdo sintético em390/844/1920 e sem mensagem de erro |
| billing | Resumo renderizado com zero clientes |
| professionals | Resumos com conteúdo sintético |
| clients | Repetição terminou loading, com conteúdo sintético em390/844/1920 e sem mensagem de erro |
| retainers | Avenças sintéticas preenchidas |
| work | 4 movimentos sintéticos preenchidos |
| debtors | Estado vazio |
| payments | Lista vazia nesta matriz; suplemento payments.json cobre4 categorias com fixtures |
| provisions | Estado vazio |
| notes | Notas sintéticas preenchidas |
| master-data | 2 clientes sintéticos preenchidos |
| admin | Navegação administrativa renderizada |
| admin-users | Permissão administrativa necessária; operação não validada |
| imports | Selector sem ficheiro; importação não executada |
| import-review | Fila vazia |
| admin-access-logs | Guarda exclusiva do proprietário; consulta não validada |

A matriz rápida tinha11 ocorrências transitórias a320px; após500ms,112 estados sem overflow. A matriz com qa-allocation em overview produziu erro de shape da fixture (next.annual.map), registado no JSON; não é evidência de dashboard operacional aprovado. Não foi alterado código concorrente. Capturas e textos completos/parciais permitem auditar o estado.

matrix.csv e physical-pending.csv estavam localmente ignorados; agora são explicitamente versionados, corrigindo o404. Safari físico/Chrome iOS/PWA/teclado e fluxos reais continuam pendentes.

Clientes preenchido registou overflow numa primeira amostra a500ms; repetição após1200ms passou390/844/1920px (scrollWidth igual ao viewport), sem erros. Tratado como ocorrência transitória, não como defeito persistente corrigido. Overview com qa-demo apropriado também passou as três larguras com conteúdo.
