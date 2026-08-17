# Estado do projecto

Actualizado em: 2026-08-17

## Regra de entrega

- Alterações acumuladas apenas no checkout local `C:\Projetos\legal-carina`.
- Versão publicada: `0.2.4`.
- A versão `0.2.4` foi publicada automaticamente pela integração GitHub–Cloudflare e a sua manutenção foi posteriormente autorizada pelo proprietário.
- Migrações remotas destrutivas continuam excluídas desta publicação.
- Próxima versão local em preparação: `0.2.5`, na branch `codex/prepare-0.2.4-continuity-export`; produção mantém `0.2.4`.

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
- Migração local preparada para identificadores múltiplos e flexíveis (`client_identifiers`), ainda não aplicada ao remoto até reconciliar o histórico de migrações.

- Duplo clique numa linha dos Registos de trabalho abre directamente o modal de edição desse movimento.
- A mesma acção é acessível por teclado com `Enter` quando a linha tem foco.
- Produção mantém `0.2.4`; não efectuar push deste lote até controlar os builds automáticos Cloudflare.

## Correcção local 0.2.6 em preparação

- Importação integral reconciliadora implementada na branch `codex/reconcile-full-import`.
- Todas as linhas efectivas são comparadas com a linhagem do lote anterior; novas são criadas, inalteradas preservam o movimento e alteradas actualizam o mesmo `id` com auditoria.
- Linhas ausentes não são apagadas. Conflitos com alterações manuais bloqueiam a transacção.
- RPCs base e reconciliadoras aplicadas isoladamente ao Supabase remoto em 2026-08-17. Nenhuma outra migration pendente, Edge Function ou publicação Cloudflare foi executada.
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

- Migrations `20260816142830_add_private_client_documents.sql` e `20260816180000` a `20260816198000`, incluindo leitura financeira protegida, importação confirmada, preços, permissões, PIN, documentos, remoção do gate legal, Gestor, auditoria, restrições de mutação, dados mestre por âmbito e escrita controlada de movimentos.
- Edge Functions eventualmente alteradas, deploy do frontend/Worker e actualização das PWA instaladas.

## Ainda aberto antes da publicação

- Executar pgTAP das novas políticas e importador num PostgreSQL/Supabase autorizado.
- Os fixtures pgTAP foram alinhados com o modelo actual, mas esta estação não tem Docker para iniciar uma stack Supabase local.
- Concluir a decisão de histórico para os pares de migrations com formatação extensa e para a migration de username/PIN aplicada fora do histórico.
- Repetir a matriz e os fluxos críticos no preview remoto sem dados reais, depois de aplicar a configuração aprovada.

## Riscos actuais

- As funções SQL novas ainda não foram executadas na base remota.
- O histórico remoto de migrations usa 11 versões que não existem com o mesmo carimbo no checkout; o `db push --dry-run` fica bloqueado até reconciliar os identificadores sem perder código.
- A ocultação visual protege o ecrã; a autorização efectiva tem de permanecer no backend.
- Passkeys exigem domínio HTTPS definitivo e validação em hardware Windows/iPhone.
- Documentos só podem ser activados após confirmar bucket privado, políticas e validade curta das URLs.
- A validação local dos documentos verifica assinatura, extensão, estrutura OOXML e nomes de conteúdo macro; a validação remota do objecto continua dependente da aplicação das novas políticas.
- A aplicação não pode receber “PRONTA PARA PUBLICAÇÃO” antes dos testes remotos de RLS, Storage, perfis e bundle.
# Correcções 0.2.3 em preparação

- Registos de trabalho passaram a carregar os primeiros 100 movimentos pela pesquisa paginada, sem executar uma exportação integral no arranque.
- RPCs de Registos de trabalho e dashboards tiveram permissões autenticadas reafirmadas e o schema PostgREST recarregado.
- Os dashboards das Sociedades apresentam os 12 meses até ao último registo disponível.
- O gráfico mensal deixa de exigir scroll horizontal em resoluções desktop, mantendo comportamento adaptado em ecrãs pequenos.
- O servidor de desenvolvimento remove service workers antigos para mostrar sempre a versão local em preparação.
