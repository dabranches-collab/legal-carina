# Pagamentos — preparação 0.14.0

Estado: implementação isolada, sem aplicação remota, sem deploy e sem pagamentos reais.

## Comportamento

- Clientes → Pagamentos contém os quatro botões pedidos, com contagens calculadas do mesmo universo que alimenta a tabela. Todos/Limpar e cascatas usam StandardDataTable. Cliente e título abrem o detalhe com um toque.
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
- Preview compilado: 167 E2E aprovados / 1 omitido. PWA em build normal: 3 aprovados. A última passagem completa de pnpm check e a repetição PWA estão registadas no relatório final da tarefa.
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
