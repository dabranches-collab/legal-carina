## Estado actual — 09-10-2026, regressão alargada

A ficha real nos cinco grupos está concluída apenas em DEV/teste. Gráficos por sociedade/responsável abrem os painéis reais na prévia; a navegação por categoria conserva o modo e a tabela funciona no ensaio horizontal com recortes simulados. Consultar [release-readiness.md](release-readiness.md) para resultados actuais e limites e [cloud-setup.md](cloud-setup.md) para repetir os ensaios isolados. Filtros financeiros transversais, backend completo/concorrência, serviços reais e Safari físico continuam pendentes. Os registos abaixo documentam os lotes anteriores.

# Integração da proposta, sem interrupção dos operadores

## Preparação entregue

O protótipo é independente da aplicação operacional. A branch inclui agora o primeiro lote de integração no frontend existente, disponível apenas em desenvolvimento/teste com `workflow=preview`; a navegação habitual continua predefinida. Não há instalação em produção nem alteração de dados. A entrada vive em `prototypes/workflow/`, com configuração própria e preparação SemVer `0.16.0-preview.2`. A versão do frontend local passa a `0.16.0` em preparação; a versão publicada não foi reconfirmada nesta sessão.

Componentes preparados: `Navigation` (cinco áreas + Definições secundárias), `ClientNavigation` (cinco áreas da ficha), `Panel`, `Modal` (dialog nativo, foco/retorno e Escape) e `OperationDialog` (pedido de operação e contexto do cliente). `model.ts` separa rotas, dados de demonstração e pedidos; `catalog.ts` fornece o inventário de cobertura.

Na integração, os componentes adaptam-se aos tokens Tailwind e à biblioteca `Icon` existente, e recebem permissões reais de `AuthContext`. Não transportar o selector de perfil de ensaio para a aplicação operacional.

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

A implementação operacional foi autorizada em 09-10-2026, condicionada à conclusão dos testes. Não se pedem novas confirmações para o trabalho já autorizado. A integração actual cobre apenas navegação e acesso aos módulos existentes em teste; nenhuma publicação operacional, migration ou mudança de permissões foi efectuada.

## Primeira integração no código real — 0.16.0 em preparação

`WorkflowNavigation` organiza cinco áreas e Definições secundárias. `WorkflowSections` reúne os acessos contextuais; reutiliza as sociedades/responsáveis já carregados pelo AppShell. O Resumo abre OverviewPage e EntityDashboard com os seus gráficos, métricas e WorkResultsLink existentes. Clientes abre a lista geral de MasterDataPage; os acessos por tipo, avenças e URLs anteriores mantêm-se. Financeiro reúne DebtorsPage, PaymentsPage e ProvisionsPage. Criação global conserva CreateWorkEntryModal/QuickExpenseModal/MasterDataPage; o acesso às fichas continua por RecordDialogHost, incluindo documentos, credenciais, traduções e contratos.

A opção exige `(DEV || VITE_APP_ENV === 'test') && workflow=preview`: não activa a nova navegação num build operacional comum. Nenhum bypass de Auth foi acrescentado. AppLink conserva a opção nos destinos internos de validação, sem propagar parâmetros para destinos externos. Administração permanece owner/admin; logs só owner; dados base conservam o acesso actual.

Ainda não concluídos: reorganização da ficha nos cinco grupos, filtros globais transversais, interacções adicionais dos gráficos operacionais, validação integrada Azure/Storage e revisão física Safari/iPhone. Os 40 E2E existentes nesta entrega pertencem ao protótipo independente; não devem ser apresentados como E2E da nova navegação operacional.

## Ficha real organizada em grupos — continuação de 09-10

A ficha em MasterDataPage/RecordDialogHost passa a ter os cinco grupos apenas no modo `workflow=preview` autorizado em DEV/teste. As dez páginas antigas continuam disponíveis dentro dos grupos; os mesmos painéis tratam contratos, documentos e financeiro. `clientGroup`, `clientPage` e `recordFilter` mantêm o destino após recarregar. O grupo Trabalho reutiliza WorkEntriesPage com filtro por cliente. O modo habitual permanece predefinido.

Validar isoladamente com `pnpm exec playwright test --config playwright.workflow.config.ts`. Esta configuração é necessária: o E2E dedicado é omitido na configuração habitual para não arrancar num servidor sem bloqueio de serviços. O servidor de teste remove proxies e tradução local e recusa os caminhos de serviços; o browser bloqueia destinos externos e usa fixtures sintéticos. Os resultados/capturas ficam em `output/workflow-integration/`.

A ficha e os URLs foram validados em Chromium emulado, sem escrever no backend. Filtros globais transversais, interacções adicionais dos gráficos e serviços reais continuam pendentes; consultar validation.md para os limites e o defeito da tabela horizontal observado.

Revisão visual em A4: após os E2E, `python scripts/workflow/review_client_pdf.py` (ReportLab) gera `output/workflow-integration/carina-ficha-cinco-grupos-a4.pdf`, duas páginas claro/escuro com capturas desktop/iPhone de dados fictícios.
