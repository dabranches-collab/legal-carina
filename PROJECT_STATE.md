# Estado do projecto

## Lote 0.3.0 — preparado para publicação em 2026-08-18

- Versão local: `0.3.0`; branch `codex/reconcile-full-import`.
- Inclui a reorganização transversal de dashboards, tabelas e filtros, edição individual de movimentos, criação de movimentos, ficha de cliente móvel, contactos múltiplos e códigos de cliente por vertente.
- Gates verdes: ficheiros sensíveis, lint, TypeScript, 52 testes, build, 24 E2E aprovados e dry-run Cloudflare. Dois testes dependentes de produção foram omitidos como previsto.
- Supabase: manter aplicação isolada de SQL e reconciliação cautelosa do histórico; `db push` global permanece bloqueado.
- A confirmação de produção e dos PWA deve acrescentar deployment/version ID depois do deploy.

Actualizado em: 2026-08-17

## Regra de entrega

### Publicação 0.2.7

### Hotfix 0.2.8

- Corrigido o arranque/reabertura do PWA Windows para regressar sempre à Visão geral, em vez de reutilizar o último dashboard de Sociedade.
- Atalhos do acompanhamento, incluindo `Sem sociedade`, navegam sem refresh completo e preservam a sessão.
- Restauradas isoladamente as RPCs/permissões remotas necessárias ao refresh, dashboard e pesquisa de movimentos através de `20260817173743_restore_dashboard_rpc_permissions.sql`.
- Sessão autenticada confirmada após refresh; atalho `Sem sociedade` confirmado com 127 movimentos e sem logout.

- Branch `codex/reconcile-full-import` reconciliada por merge com o lote remoto 0.2.6 que estava publicado.
- Importação canónica concluída com 7 198 movimentos activos; as importações seguintes comparam todas as linhas e actualizam movimentos já existentes quando a origem mudou.
- Dashboards, atalhos de acompanhamento, 12 meses móveis, comparação por sociedade, tooltips por período, landing de clientes e tabelas compactas estão implementados.
- A tabela de movimentos carrega o universo autorizado completo para pesquisa, filtros, ordenações e `Todas`; o backend integral recebe exactamente os mesmos filtros, incluindo `Sem sociedade`.
- Supabase: migrations funcionais aplicadas isoladamente, incluindo `20260817173000_extend_work_export_universe.sql`; `db push` global continua bloqueado pela divergência histórica conhecida.
- Validação local: `pnpm check` verde, 51/51 testes, build e dry-run Cloudflare verdes. A matriz Playwright percorreu os 24 cenários, mas o runner ficou aberto após iniciar o último e teve de ser interrompido.

- Alterações acumuladas apenas no checkout local `C:\Projetos\legal-carina`.
- Versão publicada: `0.2.6`.
- A Cloudflare publicou automaticamente a versão `0.2.6` após o push da branch `codex/client-identifiers-documents-0.2.6`; a produção foi confirmada directamente no browser integrado.
- Migrações remotas destrutivas continuam excluídas desta publicação.
- Versão local e produção: `0.2.6`, na branch `codex/client-identifiers-documents-0.2.6`. `main` ainda não contém o lote; abrir PR, obter CI verde e fundir é prioritário para não deixar produção à frente do GitHub principal.

## Lote local 0.2.6 em preparação

- Identificadores de cliente activos no Supabase, com consulta, criação, alteração e eliminação sujeitas ao âmbito de acesso do cliente.
- Documentos de cliente activos num bucket privado de 20 MB, limitado a PDF, JPG, PNG, DOCX e XLSX sem conteúdo activo.
- Upload, arquivo, reactivação e eliminação passam pela Edge Function autenticada `client-documents`; o browser não tem escrita directa na tabela nem no Storage.
- Consulta por ligação assinada de 60 segundos; metadados incluem categoria, datas, tamanho e SHA-256.
- Migrations remotas isoladas `20260817095147`, `20260817095157`, `20260817095206` e `20260817095316`; não foi executado `db push`.
- O ficheiro de importação mais recente ainda tem de ser localizado e comparado por data, hash, linhas e duplicados. Não limpar a base antes dessa verificação, cópia de segurança e autorização específica para a operação destrutiva.
- Validação local deste lote: lint, TypeScript e 49/49 testes aprovados. A validação visual autenticada ficou pendente porque a sessão do browser integrado expirou; não foram solicitados nem usados PINs.
- Produção confirmada em 0.2.6. O erro transitório `permission denied for table clients` foi investigado: privilégios e RLS permanecem presentes e a lista voltou a carregar sem alteração à base.

## Lote 0.2.4 publicado

- A exportação XLSX dos Registos de trabalho pede ao backend todos os movimentos autorizados que correspondem aos filtros principais apenas quando o utilizador carrega em XLSX.
- O carregamento inicial continua limitado à pesquisa paginada de 100 movimentos e deixa de determinar o conteúdo da exportação integral.
- O botão comunica preparação, sucesso e erro sem bloquear a abertura da página.
- Foram acrescentadas regras permanentes em `AGENTS.md`, protocolo de computador novo e política de versionamento.
- O deployment Cloudflare activo e a limitação da associação ao commit ficaram documentados.
- Validação local: `pnpm check` aprovado com 47/47 testes; E2E local com 23 aprovados e 1 cenário exclusivo do preview de produção omitido como previsto.
- Browser integrado: versão `0.2.4`, exportação visível, claro/escuro e viewport iPhone compacto sem overflow horizontal.
- GitHub: PR rascunho `#5`; `CI` e `Secret scan` do commit funcional `67797f9` verdes.

## Advisors Supabase consultados em 2026-08-17

- Segurança: `billing_entity_financial_permissions` e `user_login_credentials` têm RLS activa sem políticas directas; confirmar que permanecem exclusivamente acessíveis por endpoints controlados.
- Segurança: `export_visible_work_entries` e `get_entity_dashboard_rolling` são `SECURITY DEFINER` executáveis por `authenticated`; este desenho é intencional para aplicar âmbito e mascaramento, mas exige revisão dos predicados e testes negativos antes de publicação.
- Auth: protecção contra passwords comprometidas aparece desactivada; confirmar disponibilidade/custo do plano antes de activar.
- Desempenho: existem FKs sem índice de cobertura, índices ainda não utilizados e políticas permissivas múltiplas. Não remover índices apenas por ainda não terem utilização; rever com carga representativa e migrations próprias.
- Nenhuma alteração remota foi feita durante esta consulta.

## Lote local 0.2.5 em preparação

- Registos de trabalho e clientes abrem por duplo clique; `Enter` numa linha focada mantém acesso equivalente por teclado.
- Corrigida a abertura dos movimentos enquanto as RPC `get_work_entry_form_options`, `get_work_entry_for_edit` e `update_work_entry_details` ainda não existem no Supabase remoto: existe fallback compatível, sempre sujeito às permissões/RLS actuais.
- Ficha completa de movimento preparada, incluindo duração, preços, descontos, estados, facturação, pagamento, arquivo e sociedade.
- Edição completa activa no Supabase através de `update_work_entry_full`. A eliminação foi simplificada para controlo interno: qualquer utilizador com acesso de edição pode apagar qualquer movimento após confirmação, incluindo facturados ou pagos. Ligações a facturas, importações e descontos são anuladas, preservando esses registos. Migrações remotas isoladas `20260817091517` e `20260817091927`, sem `db push` das restantes migrações divergentes.
- A ficha de cliente abre inicialmente para consulta e permite mudar explicitamente para edição e guardar alterações.
- Dados gerais da ficha: nome, estado, vertentes/códigos, denominação legal, NIF, correio electrónico, telefone, morada e notas.
- Documentos do cliente são consultáveis na ficha; o carregamento só aparece durante a edição.
- Identificadores múltiplos e flexíveis (`client_identifiers`) aplicados remotamente e preparados para criação, edição e eliminação.

- Duplo clique numa linha dos Registos de trabalho abre directamente o modal de edição desse movimento.
- A mesma acção é acessível por teclado com `Enter` quando a linha tem foco.
- Produção mantém `0.2.4`; não efectuar push deste lote até controlar os builds automáticos Cloudflare.

## Correcção local 0.2.6 em preparação

- Importação integral reconciliadora implementada na branch `codex/reconcile-full-import`.
- Todas as linhas efectivas são comparadas com a linhagem do lote anterior; novas são criadas, inalteradas preservam o movimento e alteradas actualizam o mesmo `id` com auditoria.
- Linhas ausentes não são apagadas. Conflitos com alterações manuais bloqueiam a transacção.
- RPCs base e reconciliadoras aplicadas isoladamente ao Supabase remoto em 2026-08-17. Nenhuma outra migration pendente, Edge Function ou publicação Cloudflare foi executada.
- A análise reconciliadora foi otimizada em `20260817162500_optimize_import_candidate_analysis.sql` depois de o ficheiro real exceder o `statement_timeout`; a versão remota agora agrega e classifica as linhas em bloco, sem concatenação JSON quadrática.
- Nova linha de base concluída a partir de `20260817 HORAS ESCRITÓRIO.xlsx`: 7 198 movimentos activos e 6 linhas inválidas apenas na revisão da importação. Verificação idempotente: 7 198 inalterados, 0 alterados, hash remoto confirmado.
- Aplicação directa confirmada por catálogo e privilégios: RPCs apenas para `authenticated`, helper privado sem execução para clientes. Os carimbos locais permanecem ausentes do histórico remoto e devem ser reconciliados sem `migration repair` por suposição.

## Implementado localmente

- Interface **Carina - Legal**, navegação hierárquica, contraste claro/escuro, PWA e versão visível.
- Dashboards e registos ligados aos dados reais existentes, com ocultação visual uniforme de valores financeiros.
- Administração de utilizadores com nome visível, identificador independente, PIN inicial, alteração obrigatória, suspensão, reposição e mensagem copiável.
- Perfis proprietário, administrador, gestor, financeiro, advogado, consulta e auditor; o Gestor continua limitado às Sociedades autorizadas e à permissão financeira independente.
- Permissões editáveis por Sociedade, separando acesso operacional de acesso a valores financeiros.
- Clientes com perfis particular e empresa; a mesma entidade pode possuir ambas as vertentes.
- Documentos de cliente preparados para bucket privado, com metadados, hash, limite, URLs assinadas e validação obrigatória do conteúdo numa Edge Function; uploads directos ficam bloqueados.
- Importação XLSX/CSV em análise, confirmação e gravação transaccional; linhas inválidas ficam preservadas para revisão.
- Read models preparados para aplicar âmbito e mascarar valores financeiros no backend.
- Criação e edição operacional de movimentos usam endpoints controlados; acções em massa de Sociedade, Responsável, processo, preço/hora, desconto, facturação, pagamento e arquivo são atómicas, exigem motivo e ficam auditadas.
- Worker Cloudflare preparado com CSP e restantes cabeçalhos de segurança.
- Carregamento diferido dos módulos; processador XLSX separado do bundle principal.

## Validação local confirmada

- TypeScript aprovado; 46/46 testes unitários aprovados; build de produção aprovado e sem source maps.
- Refresh da Visão geral validado com estado de carregamento explícito; gráficos anuais e mensais suportam vista agregada ou por Sociedade, com séries de cores distintas e curvas mensais suavizadas.
- O gráfico anual por Sociedade usa todo o histórico autorizado; o gráfico mensal apresenta os 12 meses terminados no mês do movimento mais recente.
- Os dashboards individuais terminam os seus 12 meses no último movimento da entidade seleccionada; o export completo de movimentos foi criado no Supabase com mascaramento financeiro e acesso apenas autenticado.
- E2E: 24 testes aprovados em duas execuções limpas: 23 cenários funcionais/responsivos e 1 cenário isolado contra o preview real do build e respectivo service worker; 11 iPhones e 7 resoluções Windows cobertos.
- Inspecção visual corrigiu a localização truncada em iPhone compacto; título completo confirmado sem overflow horizontal.
- Auditoria de dependências de produção sem vulnerabilidades conhecidas.
- Pesquisa de segredos no checkout e histórico sem segredo confirmado.
- Dry-run do Worker Cloudflare aprovado, sem publicação.

## Exige aprovação e execução remota

- Permanecem por decidir as migrations locais divergentes `20260816180000` a `20260816198000` que não foram aplicadas isoladamente neste lote.
- Edge Functions eventualmente alteradas, deploy do frontend/Worker e actualização das PWA instaladas.

## Ainda aberto antes da publicação

- Executar pgTAP das novas políticas e importador num PostgreSQL/Supabase autorizado.
- Os fixtures pgTAP foram alinhados com o modelo actual, mas esta estação não tem Docker para iniciar uma stack Supabase local.
- Concluir a decisão de histórico para os pares de migrations com formatação extensa e para a migration de username/PIN aplicada fora do histórico.
- Repetir a matriz e os fluxos críticos no preview remoto sem dados reais, depois de aplicar a configuração aprovada.

## Riscos actuais

- As funções deste lote documental foram executadas; outras funções de migrations locais divergentes continuam por reconciliar.
- O histórico remoto de migrations usa 11 versões que não existem com o mesmo carimbo no checkout; o `db push --dry-run` fica bloqueado até reconciliar os identificadores sem perder código.
- A ocultação visual protege o ecrã; a autorização efectiva tem de permanecer no backend.
- Passkeys exigem domínio HTTPS definitivo e validação em hardware Windows/iPhone.
- Documentos estão activos com bucket privado, políticas por âmbito e URLs de 60 segundos; falta executar um teste visual autenticado sem dados reais.
- A aplicação não pode receber “PRONTA PARA PUBLICAÇÃO” antes dos testes remotos de RLS, Storage, perfis e bundle.
# Correcções 0.2.3 em preparação

- Registos de trabalho passaram a carregar os primeiros 100 movimentos pela pesquisa paginada, sem executar uma exportação integral no arranque.
- RPCs de Registos de trabalho e dashboards tiveram permissões autenticadas reafirmadas e o schema PostgREST recarregado.
- Os dashboards das Sociedades apresentam os 12 meses até ao último registo disponível.
- O gráfico mensal deixa de exigir scroll horizontal em resoluções desktop, mantendo comportamento adaptado em ecrãs pequenos.
- O servidor de desenvolvimento remove service workers antigos para mostrar sempre a versão local em preparação.
# Versão 0.2.9 — perfil Operador e leitura operacional

- Novo perfil **Operador**, limitado às Sociedades explicitamente atribuídas, com edição dos movimentos e sem administração de utilizadores, importações ou configurações.
- A autorização financeira continua independente por Sociedade; criação e alteração do perfil são validadas no backend e auditadas.
- Visão geral reorganizada em dois grupos lado a lado, cada um com duas colunas: Resumo operacional e Acompanhamento. O indicador redundante Total de minutos foi retirado.
- Widgets preparados com total e subtotais exactos por Sociedade, calculados no Supabase sob as mesmas regras de âmbito e ocultação financeira.
- Evolução anual das Sociedades apresenta uma linha por Sociedade com mini-barras verticais, valores e anos, sem scroll horizontal em desktop; inclui uma linha final Total com a soma anual.
- Valor por mês mostra, em Agregado e Por sociedade, uma janela por período com o total e todos os valores por Sociedade.
- Os alertas de Acompanhamento usam agora fundo, contorno, ícone, título e atalho vermelhos para evidenciarem trabalho pendente.
- Nos gráficos finais, a Evolução anual ocupa a coluna larga da esquerda; Arquivo e Distribuição das sociedades ficam empilhados à direita, sem espaços vazios em desktop.
- Nas tabelas comuns, todas as células não monetárias ficam centradas; apenas os valores monetários permanecem alinhados à direita.
- No scroll horizontal dos Registos de trabalho, a Data e a selecção deslocam-se normalmente; apenas o nome do Cliente permanece fixo.
- A coluna Cliente usa fundo opaco nos estados normal, hover e seleccionado, impedindo a sobreposição visual das restantes células durante o scroll.
- Imprimir/PDF isola o resultado da tabela, usa orientação horizontal e ajusta todas as colunas a uma única página de largura.
- A edição em massa foi retirada dos Registos de trabalho; não existem caixas de selecção nem acções colectivas, mantendo-se apenas a edição individual por duplo clique/Enter.
- Acima dos filtros normais existe um bloco vermelho de pré-filtros de atenção: Sem sociedade, Sem preço, Por facturar, Facturados não pagos e Facturados sem data/estados históricos. Cada botão limpa os filtros correntes e consulta o universo integral.
- A versão local passa a acompanhar automaticamente o `package.json` quando este muda, através do reinício observado pelo Vite.
- Evolução anual dos dashboards de Sociedade usa também barras verticais compactas.
- Validação local: `pnpm check` aprovado (51/51 testes); E2E 24 aprovados e 2 opcionais omitidos.
- Migrations isoladas deste lote: `20260818105352_add_operator_role.sql` e `20260818111659_add_dashboard_metric_breakdowns.sql`. Não executar `db push` devido à divergência histórica conhecida.
