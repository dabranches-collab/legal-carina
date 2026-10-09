# Protótipo isolado de simplificação

Preparação `0.16.0-preview.1`, baseada em `88adcd6471f3ef469470c6a0899dd1dc6a187eb7` (aplicação `0.15.1`). Não é uma publicação da aplicação operacional.

## Abrir localmente

Usar o checkout e as dependências já instaladas na raiz. Numa instalação nova, executar `pnpm install --frozen-lockfile` na raiz, sem copiar `node_modules`.

```sh
node node_modules/vite/bin/vite.js --config prototypes/workflow/vite.config.ts
```

Abrir a URL local apresentada, normalmente `http://localhost:5175/`. Um endereço localhost só funciona na máquina onde corre o servidor; não é um link remoto para iPhone. O ficheiro autónomo gerado abaixo permite revisão offline num browser que execute HTML local. Para iPhone, a entrega inclui também um PDF visual da demonstração.

## Validar e preparar a entrega

```sh
node node_modules/typescript/bin/tsc -p prototypes/workflow/tsconfig.json
node node_modules/oxlint/bin/oxlint prototypes/workflow scripts/workflow
node scripts/workflow/audit.mjs --operational-preview
node node_modules/@playwright/test/cli.js test -c prototypes/workflow/playwright.config.ts
node node_modules/vite/bin/vite.js build --config prototypes/workflow/vite.config.ts
node scripts/workflow/package.mjs
```

Os cenários exigem o servidor em 5175. Reutilizam `/usr/bin/chromium` quando existe; noutros sistemas usam o browser Playwright instalado ou `WORKFLOW_CHROMIUM_EXECUTABLE`. Não escrever PINs, passwords, dados ou documentos reais nos ensaios.

## Percursos para rever

1. Clientes → pesquisar Alfa → Abrir ficha → Novo registo → guardar → Trabalho → Voltar à lista. A pesquisa conserva-se.
2. Cliente Alfa → Preparar nota → Francês → Pré-visualizar → emitir PDF → Financeiro e documentos → guardar Word/reimprimir.
3. No formulário da nota, simular falha EN/FR: a emissão é impedida e não aparece uma nova versão.
4. Financeiro → Por facturar → Registar factura → Pagamentos → registar recebimento. Facturar não marca como pago.
5. Receber parcialmente a nota DEMO-NH-001; o saldo da provisão do cliente Alfa continua independente.
6. Contratos → Preço fixo → Gerir registos → associar movimento → terminar trabalho. Avença → modalidade e horas incluídas.
7. Notas → criar tarefa → urgência → partilha Consulta/Edição.
8. Definições → Administração: comparar Operador, Administrador e Proprietário usando o selector de **ensaio**, que só modifica a demonstração.

## Separação técnica

- Entrada, configuração Vite e output próprios; sem importação de `src/App.tsx`, AuthGate, Supabase, Worker ou service worker.
- Sem configuração de backend, segredos, bases remotas, uploads, pedidos Azure ou alteração de permissões reais.
- Os dados vivem apenas na memória da página. Recarregar/“Repor demonstração” volta aos exemplos iniciais.
- Exportações PDF/Word/XLSX usam os pacotes existentes, com marcas DEMO. O arquivo guarda somente nomes de ficheiros, não o conteúdo.
- Traduções EN/FR são exemplos previamente preparados. Não traduzem livremente texto introduzido pelo utilizador nem validam o Azure real.
- Perfis, pricing, recibos, estornos e contratos são uma simulação de percursos. **Não substituem os motores, RPCs, RLS ou regras financeiras da aplicação.**
- O bundle operacional não inclui esta entrada. Não foi alterada a versão da aplicação nem as notas da release operacional.

Consultar [inventário](../../docs/workflow/inventory.md), [integração](../../docs/workflow/integration.md), [percursos](../../docs/workflow/operator-journeys.md) e [validação](../../docs/workflow/validation.md).

## PDFs de revisão

Depois da auditoria e das capturas Playwright: `python scripts/workflow/review_pdf.py` (requer ReportLab). Gera mapa mental de uma página, revisão visual e inventário em A4 horizontal, na pasta ignorada `output/workflow-review/`.

## Caixas e gráficos como pré-filtros

No Resumo, nove caixas abrem os itens contabilizados. Barras de actividade filtram horas por cliente; barras de acompanhamento filtram estados/documentos/contratos; segmentos de tipo filtram clientes (contagens inclusivas para mistos). A lista indica o critério, conserva sociedade/responsável/tipo e permite remover o pré-filtro ou voltar ao Resumo. Os gráficos anuais/mensais e indicadores operacionais completos serão reutilizados na integração; estas séries não são substituídas pelos exemplos do protótipo.

A branch contém também integração operacional em teste; a auditoria aceita apenas os ficheiros explicitamente previstos com `--operational-preview`. Sem esta opção continua a exigir isolamento total do código operacional.
