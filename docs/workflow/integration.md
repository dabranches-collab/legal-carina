# Integração da proposta, sem interrupção dos operadores

## Preparação entregue

O protótipo é independente da aplicação operacional. A branch prepara a estrutura e os contratos dos componentes; não activa a proposta nem altera dados. A entrada vive em `prototypes/workflow/`, com configuração própria e preparação SemVer `0.16.0-preview.2`. A versão operacional continua `0.15.1` no código-base.

Componentes preparados: `Navigation` (cinco áreas + Definições secundárias), `ClientNavigation` (cinco áreas da ficha), `Panel`, `Modal` (dialog nativo, foco/retorno e Escape) e `OperationDialog` (pedido de operação e contexto do cliente). `model.ts` separa rotas, dados de demonstração e pedidos; `catalog.ts` fornece o inventário de cobertura.

Na integração futura, os componentes adaptam-se aos tokens Tailwind e à biblioteca `Icon` existente, e recebem permissões reais de `AuthContext`. Não transportar o selector de perfil de ensaio para a aplicação operacional.

## Reutilização dos módulos actuais

| Operação / área nova | Implementação actual a conservar | Regra para a integração |
| --- | --- | --- |
| Resumo e filtros de sociedade/responsável | OverviewPage, EntityDashboard, LegalteamAllocation | Preservar RPCs, universos, scopes e cálculo de repartição; mudar apenas pontos de acesso. |
| Trabalho | WorkEntriesPage, CreateWorkEntryModal, EditWorkEntryModal | Usar o mesmo componente nos atalhos global/ficha; passar contexto inicial sem alterar validação, locks ou auditoria. |
| Despesa | QuickExpenseModal, ExpenseCamera, WorkEntryExpensesEditor | Conservar câmara, ficheiros, comprovativos e tratamento financeiro. |
| Cliente / Dados | MasterDataPage, ClientCredentialsPanel | Reagrupar Geral/Contactos/Facturação/Credenciais; preservar campos, cifra, versões e condições de escrita. |
| Contratos | ClientRetainerPanel, RetainersPage, ClientFixedFeePanel | Conservar condições temporais, pacote de horas, preço fixo e associação de registos. |
| Nota / cobrança | HonorariumNoteModal, formalDocumentPdf, formalDocumentDocx | Uma única preparação por tipo; manter sociedades, IVA, saldos, despesas, versões e anulação. |
| Tradução | documentTranslation.ts e Worker /api/document-translation | Azure Translator só no servidor; Auth/scopes actuais; português conserva original; EN/FR e falhas mantêm regras. |
| Pagamentos | PaymentsPage, PaymentDialog, RetainerChargeDialog | Preservar quatro filas, facturação explícita, parciais autorizados, idempotência, token de concorrência e exclusão de movimentos cobertos por nota. |
| Provisões | ProvisionsPage, ClientCreditPanel, CreditHistoryExportDialog | Preservar livro, recibos, aplicações, saldo, estornos e exportações; nunca confundir com recebimentos da nota. |
| Arquivo / facturas | ClientDocumentsPanel, ClientInvoicesPanel | Manter Storage/scopes/ligações temporárias. Facturas em preparação continuam marcadas; não prometer uma funcionalidade concluída. |
| Notas | NotesPage | Conservar tarefas, anexos, voz, partilha por pessoa e Consulta/Edição. |
| Administração e importações | AdminPage, AccessLogsPage, ImportWizard, ImportReviewPage | Administração restrita; logs só owner; nenhuma migração de permissões implícita. Importações históricas não limpam dados. |

## Caixas, gráficos e pré-filtros — conservação obrigatória

A simplificação dos menus conserva as caixas com valores/contagens, os gráficos e os atalhos para os itens contabilizados. Reutilizar OverviewPage, EntityDashboard, WorkResultsLink e os componentes em `src/components/dashboard/Charts.tsx`; conservar consultas, denominadores, scopes, permissões e regras financeiras.

- Resumo/entidades: horas, valores trabalhados/facturados/recebidos, preço médio, por receber e acompanhamento. Conservar também movimentos sem preço, sem sociedade e incobráveis; não substituir estes indicadores pelas nove caixas ilustrativas do protótipo.
- Gráficos actuais: evolução anual/mensal, horas por ano, valores por cliente/sociedade/responsável, facturação, recebimentos, preço médio, tipo de cliente e análises/repartição LEGALTEAM. Manter as séries e permitir abrir o respectivo universo a partir de barras/segmentos relevantes.
- Pré-filtro: aplicar selecção global de sociedade/responsável/tipo, mais segmento/cliente/estado/período; mostrar critérios, permitir limpar o pré-filtro e regressar ao resumo sem perder a selecção global.
- Não confundir quantidade de documentos, movimentos, contratos ou clientes. A contagem da caixa deve corresponder ao universo da lista; totais monetários mantêm as regras existentes e protecção financeira.

O protótipo já demonstra nove caixas clicáveis, barras por cliente e estado e segmentos de tipo. As listas globais de trabalho/financeiro/contratos respeitam a selecção. Horas excluem despesas; notas pendentes incluem só versões vigentes com saldo. Perfil de consulta também pode utilizar pré-filtros. Séries temporais e indicadores adicionais continuam mapeados para reutilização dos componentes operacionais, não reimplementados nesta demonstração.

## Compatibilidade de acessos

O mapa de rotas antigas em `model.ts` prepara destinos para todas as 16 vistas aceites actualmente. É exercitado no protótipo; **não foi instalado em App.tsx**. Na integração, conservar `view`, sociedade, profissional, tipo/modo de cliente, identificadores da ficha e os filtros de registos, além do botão Voltar e do histórico do browser. O protótipo só contém clientes sintéticos, por isso não resolve UUIDs operacionais.

Os atalhos distintos devem emitir o mesmo `OperationRequest`, com o cliente, documento ou movimento já seleccionado. A autorização final mantém-se no backend; esconder um botão ou ocultar valores nunca substitui scopes/RLS.

## Ordem de trabalho seguinte

1. Rever o inventário e os destinos com os operadores. Identificar atalhos de maior frequência e eventuais funções adicionais.
2. Validar o protótipo e os rótulos; confirmar o percurso de sexta-feira sem modificar a aplicação em uso.
3. Integrar componentes num ambiente de teste com dados sintéticos e o backend actual. Uma flag local/teste pode permitir comparar shell antigo/novo sem mudar o default.
4. Ensaiar regras financeiras, Auth, scopes, Storage, documentos e Azure no ambiente autorizado. Confirmar versão remota e histórico antes de qualquer operação.
5. Rever acessibilidade, PWA, iPhone físico e desempenho; obter validação humana dos operadores.
6. Só após ordem explícita «publica», gates, CI e janela combinada: activar o novo acesso. Manter reversão do frontend e preservar todos os livros/documentos.

Não estão autorizados neste lote: merge em main, deploy operacional, alterações Auth/Storage/permissões, migrations ou dados reais. A autorização recebida cobre preparação e revisão isoladas.
