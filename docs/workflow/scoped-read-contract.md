# Contrato dos filtros partilhados — proposta de leitura

Preparação na branch `codex/workflow-prototype-20261009`, sem aplicação de SQL a serviços reais. Sociedade, responsável e tipo de cliente são conservados no URL e combinados com os filtros locais. UUID ou categoria inválidos bloqueiam a vista. Limpar o âmbito repõe a leitura habitual; não elimina registos.

## O que os valores representam

| Vista | Selecção e montantes |
| --- | --- |
| Trabalho, gráficos e métricas de trabalho | Registos que satisfazem simultaneamente sociedade, responsável e perfil activo do cliente. Mantêm os cálculos e ocultação financeira existentes. |
| Lista de clientes | Clientes autorizados que pertencem à carteira seleccionada. A ficha mantém todos os dados e movimentos do cliente. |
| Devedores e recebimentos do Resumo | Clientes da carteira seleccionada; dívida integral, incluindo outros responsáveis e sociedades. Não repartir saldos pelo trabalho filtrado. |
| Avenças | Contratos e montantes integrais dos clientes seleccionados. |
| Provisões | Contas da sociedade seleccionada; responsável selecciona a carteira. Saldo e movimentos integrais de cada conta. |
| Pagamentos | Trabalho do âmbito; notas e avenças mantêm os montantes integrais. Sociedade da nota é a da última versão. Ordem, token, revisão e capacidade de pagar vêm da fila original. |
| Ficha, manutenção e distribuição entre sociedades | Ficha e manutenção completas; distribuição mantém o período integral e apresenta essa indicação. O filtro não recalcula repartições. |

Mistos exigem as duas vertentes activas, ou o tipo misto legado sem perfis. A intersecção com Particulares/Empresas selecciona a respectiva vertente desses clientes. Leitura de perfis e movimentos paginada, sem corte silencioso nos primeiros mil perfis/dez mil movimentos. As consultas de totais mistos agregam as respostas existentes por cliente elegível, sem enviar uma categoria não suportada ao RPC original.

## Propostas SQL, ainda não instaladas

`sql/workflow_read_scope.sql` propõe quatro funções `SECURITY INVOKER`: selecção de clientes, contas de provisões, avenças e fila de pagamentos. Reutilizam as respostas e RLS existentes. Não modificam saldos, tokens, permissões de pagamento ou funções de escrita.

`sql/workflow_dashboard_scope.sql` propõe cinco funções de resumos: overview, breakdowns, entity rolling, client category e professional landing. Preservam os corpos e controlos de acesso financeiros da origem, acrescentando as três condições de selecção. Agrupamento por UUID evita duplicar valores de sociedades homónimas. Valores financeiros ocultos permanecem `NULL`; não passam a zero. Nomes de responsáveis de outra firma são excluídos. Erros de importação continuam a ser um indicador global da firma.

`node scripts/workflow/prepare-dashboard-scope.mjs` compara a proposta com os corpos SQL de origem e os respectivos hashes; `--write` é apenas regeneração local para revisão. Nenhum destes ficheiros está em `supabase/migrations`. Os grants propostos abrangem só as funções novas e não foram executados num servidor real.

Com âmbito vazio, o frontend usa os RPC originais. Com âmbito activo, exige os novos RPC. Se faltarem, apresenta erro explícito e não substitui por resultados globais. Os contratos sintéticos com PGlite não comprovam o esquema completo, RLS real ou concorrência. Esses ensaios e a revisão/aplicação autorizada das propostas são pré-requisitos de activação.

## Activação e reversão

A navegação habitual é a predefinida. DEV/teste permite `workflow=preview`; a preparação inclui a opção de build `VITE_WORKFLOW_NAVIGATION=five-areas`, ainda não aplicada a produção. Esta opção não activa autenticação QA: parâmetros `qa-iphone`, `qa-role` e `qa-demo` são ignorados no build de produção local. Autenticação e controlos do servidor continuam obrigatórios.

Mudar o âmbito remonta as vistas para evitar resultados e diálogos obsoletos. Enquanto um diálogo está aberto, os controlos globais ficam bloqueados para preservar o formulário. A ficha mostra dados completos, mesmo que a lista tenha sido filtrada.

Activação exige validar os nove RPC num ambiente QA completo, CI remota, Safari físico e revisão operacional. Reversão do frontend retira a opção de navegação e recompila a versão anterior validada. Não autoriza rollback de dados ou migrations. Não houve merge, deploy, SQL remoto ou utilização de credenciais reais nesta preparação.
