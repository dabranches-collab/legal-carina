# Pagamentos — preparação 0.14.0

Estado: implementação isolada, sem aplicação remota, sem deploy e sem pagamentos reais.

## Comportamento

- Por receber → Pagamentos contém os quatro botões pedidos, com contagens calculadas do mesmo universo que alimenta a tabela. Todos/Limpar e cascatas usam StandardDataTable. Cliente e título abrem o detalhe com um toque.
- Registos não facturados abrem EditWorkEntryModal em modo de facturação: Pago e o estado Pago ficam indisponíveis. Guardar a factura e registar recebimento são passos separados.
- Avenças pendentes reutilizam RetainerChargeDialog em modo de facturação, com data explícita, optimismo por token e auditoria. Nunca se preenchem datas de factura automaticamente.
- Registos facturados e prestações são liquidados integralmente. Notas normais aceitam parcial/total. Preço fixo aceita apenas a liquidação integral do trabalho facturado e conserva as restrições de papel owner/admin/billing.
- A escolha integral em registos/avenças mantém o modelo actual. Foi pedida clarificação sobre parciais nestes tipos, sem resposta durante esta execução; não foi inventado um novo modelo financeiro.

## Persistência proposta

A migration 20261006114804_add_payments_workspace.sql cria pending_payment_receipts (RLS activa, sem acesso directo para authenticated), índices, quatro RPCs públicas e funções/guardas privadas. As RPCs reutilizam has_scope_access, can_view_billing_financials e, onde aplicável, as regras existentes de papel. Não altera Auth, pertenças, permissões de utilizadores ou dados existentes por backfill.

O recebimento da nota actualiza apenas o seu saldo e metadados de pagamento na versão vigente, conservando número, revisão, itens, total, IVA e provisão. Não gera PDF, factura ou recibo fiscal. Cada recebimento fica num registo separado e na auditoria existente, com saldo/recebido anteriores, autor, data, referência e pedido. As versões anteriores não são modificadas. O documento reaberto pode mostrar o saldo actualizado; não se cria uma nova emissão.

Chave de pedido e payload imutáveis tornam o reenvio idempotente. Bloqueios de cliente/item e token da leitura impedem gravar sobre alterações concorrentes. payment_revision acompanha o estado de recebimento quando se abre uma revisão: uma revisão antiga é rejeitada. Registos cobertos por notas vigentes não aparecem em facturados não pagos. Continuam em não facturados quando falta facturação, sem poder ser pagos individualmente. Notas anuladas/estornadas e versões anteriores não contam. Sobreposições antigas entre notas são sinalizadas e não admitem recebimento.

As guardas protegem associações e pagamentos contra eliminação, alteração do valor, pagamento individual e reversão de provisão incompatível. Não existe nesta entrega um fluxo de estorno de recebimentos: anular uma nota com recebimentos ou desfazer um pagamento auditado exige primeiro uma regularização própria. Não usar SQL manual improvisado para contornar a guarda.

## Verificação

- Testes de componente: cancelamento sem escrita, clique duplo, falha/reenvio com a mesma chave, excesso, parcial e facturação separada.
- scripts/test-payments-sql.mjs: PostgreSQL em memória (PGlite), migration real, fixtures sintéticas, auditoria real do repositório e contrato de RPC. Exercita saldo/provisão, versões/legado, idempotência, duplicados, preço fixo, guardas, facturação de avenças e ACL dos novos endpoints.
- Limite explícito: o ensaio SQL usa um esquema mínimo e substitutos para os helpers de permissões e a RPC antiga de edição de trabalho. Não prova a matriz RLS integral instalada nem concorrência real entre várias ligações. Deve ser complementado antes de publicação.
- e2e/payments.spec.ts: seis cenários 390/768/1440 px, claro/escuro, safe areas simuladas, toque, Todos/Limpar e actualização dos contadores. Capturas sintéticas em output/payments-qa/. Não equivale a Safari/iPhone físico ou PWA instalada.
- A dependência de desenvolvimento PGlite está fixada. Foi corrigido o advisory alto existente source-map-js <1.2.2 por override transitivo mínimo; sem actualização das restantes dependências directas.

## Publicação — só após nova autorização

1. Rever a proposta e decidir se o modelo integral de registos/avenças satisfaz a operação; pagamentos parciais nesses tipos exigem nova modelação.
2. Reconciliar o esquema instalado e executar a migration num PostgreSQL/Supabase isolado com o esquema completo, matriz de papéis/PIN/âmbitos e duas sessões concorrentes. Testar revisão versus recebimento, emissão versus pagamento individual, anulação/estorno e replay após commit com resposta perdida.
3. Confirmar novamente migration list, definições remotas, backups e recuperação. A CLI local não está ligada; devolveu ProjectRefNotLinkedError. A integração read-only confirmou o histórico remoto até 20260928165929 e os triggers das tabelas afectadas. Não usar db push ou migration repair.
4. Depois de aprovação, aplicar exclusivamente esta migration. Validar grants/revokes e advisors sem ampliar acessos. Só então publicar o frontend configurado e confirmar CI, dry-run e smoke autenticado.
5. Em rollback do frontend, conservar o livro de recebimentos e auditoria. Não apagar a tabela nem desfazer dados financeiros. Uma versão antiga pode ser impedida de rever notas com novo payment_revision: manter as guardas até existir uma reversão funcional auditada.

Última produção conhecida pelos documentos do repositório: 0.13.3, Version ID 23529d47-2201-4175-b422-d2ab5b9a8f6a, URL https://legal-carina.dabranches.workers.dev, confirmação de 03-10-2026. A consulta HTTP nesta execução falhou por rede inacessível; estes identificadores não foram reconfirmados hoje. Nenhum deploy efectuado.

Capturas versionadas: [telefone](payments-qa/iphone-light.png), [detalhe escuro](payments-qa/iphone-detail-dark.png), [desktop](payments-qa/desktop-light.png).

## Checkpoint de validação de 06-10-2026 (continuação)

- 299 testes unitários, 58 ficheiros, aprovados. O ensaio SQL passou a 24 verificações: acrescenta rollback integral perante falha de auditoria e execução como authenticated com helpers reais do repositório (PIN inicial, pertença activa, papel, âmbito, visibilidade financeira, validade das concessões e recusa de acesso directo ao livro). As tabelas ACL continuam sintéticas; o esquema e a RPC antiga de edição de trabalho não são completos.
- Preview compilado: 167 E2E aprovados / 1 omitido. PWA em build normal: 3 aprovados. Validação final após todos os ajustes: pnpm check aprovado (security:files, lint, typecheck, 299 unitários, 24 SQL e build); repetição PWA 3/3 aprovada.
- A suite inicial em desenvolvimento teve 164 aprovados, 3 omitidos e 2 falhas. Não se considera essa execução aprovada.
- Falha PDF reproduzida duas vezes: import de pako sem export default ao carregar pdf-lib dinamicamente, com optimizeDeps.noDiscovery=true. Corrigido incluindo pdf-lib no pré-bundling de desenvolvimento. Depois: teste real de anexos PDF/JPEG e seis cenários Pagamentos aprovados (7/7). Persistem avisos de chaves React duplicadas nas fixtures de despesas do teste; não são falhas de download após a correcção.
- Falha desktop 1920x1240 / 150%: leitura getBoundingClientRect de elemento null após uma asserção de visibilidade. O mesmo cenário passou duas repetições em desenvolvimento e o conjunto completo em preview. Causa inicial não confirmada; não se atribui conclusivamente a HMR nem se altera a asserção para ocultar o problema. Evidência original preservada em test-results; reproduções em output/payments-dev-investigation.
- Revisão de concorrência acrescentou bloqueio da conta de crédito antes de reler a pendência/token de uma nota. Isso alinha o recebimento com a conta bloqueada pelo estorno existente; se o estorno tiver terminado durante a espera, o saldo/estado é relido e o pedido antigo rejeitado. Não substitui teste entre ligações. Ordens de bloqueio herdadas (cliente/conta/trabalho fixo) podem provocar deadlock com outras operações: PostgreSQL deve abortar uma transacção, e o utilizador deve reabrir o detalhe; confirmar em integração.
- Não foi possível executar Supabase completo: docker/psql/postgres/initdb não estão disponíveis no PATH; PostgreSQL não está na instalação habitual. Foi encontrada uma pasta de DockerDesktop no perfil, mas Get-ChildItem nesse caminho devolveu Access denied. Não se contornou a recusa nem se iniciou/alterou o Docker do utilizador. Continuam obrigatórios ensaios de duas ligações e do esquema/RLS completo antes de aplicar a migration.
- A captura iphone-light.png foi guardada com sucesso na Library (identidade conservada em output/library-iphone-light.json). O helper de metadados locais não pôde correr porque python3 não está disponível; não se afirma persistência de xattrs. As restantes capturas continuam locais/versionadas.
- O primeiro push foi recusado pela revisão automática por criar estado remoto. Foi recebida depois autorização explícita de Diogo para push e PR draft, sem merge/migration/deploy; a nova tentativa e os checks remotos são descritos no relatório final.

## Ensaio de integração ainda necessário

Num Supabase descartável, com todas as migrations reconciliadas e sem cópia de dados pessoais: testar owner/admin/operator/billing/professional/viewer/auditor, PIN pendente, pertença inactiva, concessões por utilizador/equipa/processo/cliente/sociedade e visibilidade financeira. Verificar SELECT directo e todas as mutações/RPCs com JWTs diferentes.

Em duas ligações, sincronizar as operações com barreiras: mesmo request_id duas vezes; chaves diferentes com mesmo token; revisão/anulação/emissão versus recebimento; pagamento individual versus emissão de nota; estorno/aplicação de provisão versus recebimento; alteração de avença versus recebimento. Exigir exactamente um efeito ou rejeição/rollback integral, ausência de dupla cobrança e recuperação explícita de deadlock. Incluir notas legadas, versões anuladas, notas integralmente cobertas por provisão e sobreposições históricas. Não publicar enquanto esta validação faltar.

## Estado final local e bloqueio GitHub

Código validado no commit a9d49ddf35adc2f970aa64462f2d7221f6e401ea, branch codex/payments-20261006, checkout C:\Dev\legal-carina-payments. O commit documental seguinte não altera o código. Apenas output/ fica não versionado, com evidências sintéticas e pacote git local verificável.

A segunda e única nova tentativa autorizada de `git push -u origin codex/payments-20261006` também foi recusada antes da execução. Motivo literal da revisão automática: "This publishes the branch’s code to a remote repository and changes remote state; the transcript contains only an untrusted assistant relay of purported approval, not trusted end-user authorization for this exact push." Não houve retry, publicação por outra ferramenta, PR, SHA remoto confirmado ou CI GitHub deste trabalho. Para retomar esse passo, a aprovação humana tem de chegar directamente por um canal reconhecido pela revisão. Sem merge, migration remota, deploy ou pagamentos reais.
## Integração real em PostgreSQL no HP — 06-10-2026

O bloqueio Docker foi esclarecido: a conta codexsandboxoffline não acede à instalação, mas a execução autorizada como diogo acede à engine Docker 29.8.1 e ao GitHub autenticado. Não foram alteradas ACLs, grupos ou serviços do Windows. A recusa automática de push é independente e continua respeitada.

Container descartável carina-payments-qa-20261006, imagem já existente public.ecr.aws/supabase/postgres:17.6.1.171, PostgreSQL 17.6, network=none, sem portas expostas e armazenamento de dados em tmpfs. Auth e respectivos helpers são os da imagem. Bootstrap Storage oficial 0001–0014, pinado ao commit supabase/storage b919141f82590cb86924272c0f036fdc697c8fb3; storage.install_roles=false reutiliza os papéis da imagem. Concedido usage/create sobre storage ao papel de migrations postgres apenas nesta base sintética, sem mudar permissões do host/remoto. Não foi levantado HTTP Auth/Storage/PostgREST.

Processadas 134 migrations do repositório: 132 executadas e duas reparações exclusivamente de dados reais omitidas. Reconciliações apenas no fluxo do ensaio (ficheiros históricos intactos):

- 20260816180000: AS explícito nos aliases year/month, por erro de parser.
- 20260816197000: substituir policies já existentes pelos nomes/definições da própria migration, por colisão de nomes.
- 20260818164500 e 20260914114000: omitidas porque exigem clientes/identidade específicos de produção ausentes na base sintética. Não se inventaram esses dados.

Logs completos em output/payments-migration-replay.log e output/payments-replay-adjustments.log. Não se afirma equivalência byte a byte ao esquema remoto: antes da aplicação é obrigatório comparar as definições efectivamente instaladas, em particular helpers de permissões, triggers e funções financeiras.

A integração encontrou e corrigiu uma falha real na guarda de duplicados: save_honorarium_document cria primeiro o snapshot de provisão e depois a versão documental. O snapshot cujo id/document_id coincide com new.credit_note_id pertence à mesma emissão e deixa de ser confundido com outra nota. Uma segunda nota independente continua rejeitada. Regressão incluída no ensaio normal PGlite (agora 25 verificações).

O ensaio de integração usa funções de emissão, edição, pagamento, provisões e auditoria reais. As operações financeiras correm sob SET ROLE authenticated e request.jwt.claim.sub sintético; não há stubs de permissões/RPCs. As barreiras de concorrência são preparadas administrativamente apenas sobre fixtures e confirmam wait_event_type=Lock em pg_stat_activity antes de libertar a primeira transacção. Os JWTs não são verificados via HTTP neste ensaio.

## Impacto exacto da migration candidata

- Uma tabela nova, public.pending_payment_receipts, com montante, moeda/data/referência, autor, dimensões de cliente/sociedade/escritório, saldo/recebido anteriores e chave/payload únicos do pedido. RLS activa, sem SELECT/INSERT/UPDATE/DELETE directo para anon/authenticated; acesso pela API financeira autorizada. Um índice adicional por categoria/alvo/data, além dos índices de PK/unique.
- Quatro funções públicas novas: get_payment_queue, get_payment_detail, invoice_pending_retainer e record_pending_payment. EXECUTE apenas a authenticated; cada função aplica permissões, âmbito e visibilidade financeira existentes. Nenhuma conta, pertença, concessão de utilizador ou papel remoto é modificado.
- Sete funções privadas novas: current_payment_notes, payment_items e cinco guardas (guard_paid_document_revision, guard_noted_work_payment, guard_received_charge, guard_received_fixed_job, guard_received_note_credit_reversal). EXECUTE directo revogado.
- Sete triggers novos: auditoria de INSERT em pending_payment_receipts; auditoria de UPDATE em retainer_charges; guarda de INSERT em honorarium_document_versions; guarda de UPDATE/DELETE em work_entries; guarda de UPDATE/DELETE em retainer_charges; guarda de UPDATE em fixed_fee_jobs; guarda de INSERT em client_credit_movements para estornos.
- Zero backfill, zero pagamentos durante a instalação, zero renumeração/reemissão, zero recibos fiscais. Valores anteriores em direct_payment/fixed_fee_payment e provisões continuam a alimentar o saldo; o novo livro regista só os novos recebimentos. Não duplica aplicações de provisão nem marca automaticamente movimentos de uma nota como pagos.
- Em execução, pagamento individual usa a RPC auditada existente; avença actualiza status/paid_on; nota actualiza apenas remaining/document_options da versão vigente (ou snapshot legado), sem mudar número/revisão/itens/total/IVA/dedução. Preço fixo actualiza ainda is_paid do trabalho. Tudo e a inserção do recebimento/auditoria pertencem à mesma transacção.
- Guardas podem recusar operações anteriormente possíveis: apagar/desfazer recebimentos, anular/reduzir/retirar itens de nota recebida, cobrar isoladamente registos de nota vigente ou estornar a provisão incompatível. Ainda não existe workflow de estorno/regularização de recebimentos; isto é uma limitação funcional deliberada, que deve ser aceite antes da publicação.

## Aplicação e rollback — dependem de autorização informada

1. Comparar esquema instalado/histórico remoto com as dependências ensaiadas; verificar ausência dos novos nomes e de trigger de auditoria de avenças; confirmar backup/restauro. Não executar migration repair/db push em lote.
2. Aplicar exclusivamente 20261006114804_add_payments_workspace.sql numa transacção, em janela compatível com os bloqueios DDL dos triggers. Em erro, rollback integral da instalação. Não incluir as adaptações históricas do ensaio.
3. Verificar grants/RLS, funções, triggers e fila autenticada sem registar pagamentos reais. Só depois publicar frontend configurado e fazer smoke de leitura/PWA. A autorização de deploy do frontend não substitui a autorização de schema.
4. Antes de haver recebimentos, uma reversão de DDL pode ser planeada e revista. Depois de haver recebimentos, preservar sempre o livro e a auditoria: rollback preferencial do frontend mantendo os dados/guardas. Não apagar a tabela, repor flags à mão ou remover guardas para aceitar versões antigas. O frontend anterior pode ser impedido de rever notas com payment_revision novo; regularização exige solução auditada própria.

Restam antes de aplicar: comparação do esquema remoto instalado, autorização informada para esta migration e smoke autenticado HTTP no ambiente de destino. O ensaio local não reproduz latência, volume, dados históricos reais nem Safari físico. Nenhum push adicional, migration remota ou deploy foi executado.

## Resultado final da integração alinhada com produção

- pnpm check novamente aprovado após a correcção: 299 unitários (58 ficheiros), 25 verificações SQL, security:files, lint, typecheck e build.
- scripts/test-payments-integration.mjs: 16 cenários integrados aprovados, também depois de alinhar localmente as policies efectivamente instaladas em produção. O script recusa containers sem o rótulo de QA ou com rede activa. Resultado em output/payments-production-rls-results.log.
- Comparação remota exclusivamente de metadados: PostgreSQL 17.6 igual; 11 funções financeiras/permissões com assinaturas, security-definer e hashes de corpo sem whitespace iguais; colunas das oito tabelas financeiras iguais. Policies inicialmente iguais em 7/8 tabelas. work_entries tinha três policies históricas e helpers has_accepted_current_terms/has_scope_permission diferentes do replay. Copiados apenas para o container, juntamente com os grants existentes dessa tabela; depois os hashes das policies das oito tabelas coincidiram e os 16 cenários passaram novamente. Nenhuma dessas policies/grants foi alterada remotamente ou incluída na migration candidata.
- A produção confirma ausência de pending_payment_receipts e de triggers em retainer_charges. A comparação é uma fotografia deste momento: repetir preflight antes da instalação e não inferir cobertura de todo o esquema por estas oito tabelas.
- Cobertura integrada: emissão real com provisão; facturação separada; recebimento parcial/replay; chaves iguais/diferentes concorrentes; revisão versus recebimento; estorno antes/depois de recebimento; libertação legítima de registos após anulação sem recebimentos; registo individual via RPC antiga real; avença integral/idempotente/auditada; preço fixo; owner/admin/operator/billing/professional/viewer/auditor, PIN pendente, pertença inactiva, visibilidade financeira, concessões por cliente/processo/equipa/validade e anon.
- O gate local de SQL/RLS/concorrência está agora cumprido para estes cenários. Continuam fora do ensaio a validação JWT via HTTP/PostgREST, dados reais históricos/volume, Safari físico e smoke do destino após instalação autorizada. Não confundir estes limites com a anterior ausência de ensaio integrado, entretanto resolvida.
- O container QA fica preservado para continuação, sem rede/portas; contém apenas fixtures sintéticas. Não há comandos de teste pendentes. O push recusado não foi repetido; sem PR/CI remota, migration remota ou deploy.
- Validação do ajuste de navegação: 6 E2E aprovados em390/768/1440 claro/escuro, teclado, selecção, fecho móvel e ausência em Clientes. pnpm check:299 unitários/25 SQL, lint, tipos, segurança e build aprovados. Screenshots sintéticos actualizados.
