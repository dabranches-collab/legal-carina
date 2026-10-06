# Reconciliação do histórico de migrations

## 06-10-2026 — Pagamentos aplicado isoladamente

| Ficheiro local | Registo remoto confirmado |
| --- | --- |
| `20261006114804_add_payments_workspace.sql` | `20261006144551` — nome `20261006114804_add_payments_workspace` |

Aplicação pela integração Supabase depois da autorização directa de publicação e CI final do PR #88 aprovada. `supabase migration list --linked` continua a devolver ProjectRefNotLinkedError neste checkout; histórico remoto lido antes/depois pela integração. Sem db push global, migration repair ou alterações históricas.

Backup recuperável confirmado: 06-10-2026 05:45:26 UTC. Dependências (11 funções/146 colunas/14 policies de oito tabelas) coincidiram com QA; 16 cenários de RLS/concorrência real aprovados. Pós-instalação: tabela RLS sem acesso directo, quatro RPCs authenticated, sete triggers, continuidade de utilizadores/permissões por hashes e zero recebimentos no smoke. Storage/Auth não alterados. A reversão do frontend conserva o livro/auditoria/guardas; estorno de recebimentos ainda não implementado.

## 28-09-2026 — alertas sem preço e movimentos recentes (aplicadas)

| Ficheiro local | Registo remoto da integração Supabase |
| --- | --- |
| `20260928141755_align_overview_missing_price_with_attention.sql` | `20260928165827` — nome `20260928141755_align_overview_missing_price_with_attention` |
| `20260928153000_distinguish_unpriced_recent_movements.sql` | `20260928165929` — nome `distinguish_unpriced_recent_movements` |

- As funções foram ensaiadas numa transacção com `ROLLBACK` na produção por instrução do utilizador, sem deixar alterações; depois, as duas migrations foram aplicadas isoladamente. A lista remota e as definições das quatro funções foram verificadas. Não executar `db push` global nem `migration repair` para alinhar os carimbos; preservar esta correspondência.
- O alerta global passou de 710 para 426 movimentos sem preço, excluindo 284 de avença. No browser de produção, as caixas de Clientes apresentaram 131 em Particulares e 294 em Empresas; estas categorias não são uma partição exaustiva do total global. Auditoria de continuidade antes e depois: 5 utilizadores, 5 pertenças, 7 concessões, 6 permissões financeiras, 48/48 tabelas públicas com RLS e zero órfãos. Backup físico anterior `2026-09-28 05:43:49 UTC`; PITR inactivo, Storage fora do backup, sem alteração de objectos.

## 28-09-2026 — alertas sem preço e movimentos recentes (preparação)

- `supabase migration list --linked` foi executado com o CLI temporário após checkout limpo; confirmou as divergências históricas documentadas e que `20260928141755` e `20260928153000` estão apenas no repositório. A integração confirmou que a última migration remota é `20260924185918_include_expenses_in_honorarium_totals`.
- Por pedido explícito do utilizador, foi dispensada a branch de staging paga. As duas migrations foram ensaiadas juntas na base de produção dentro de `BEGIN`/`ROLLBACK`, sem dados sintéticos persistidos. As quatro funções compilaram, e os hashes das definições instaladas após o rollback coincidiram com os anteriores. O cálculo do alerta usa a taxa real do movimento antes da ocultação financeira, evitando falsos positivos para perfis sem acesso.
- Antes da aplicação, havia 426 movimentos de cobrança normal sem taxa e 284 de avença sem taxa. O painel confirmou backup físico de `2026-09-28 05:43:49 UTC`; PITR inactivo e objectos privados de Storage fora do backup da base. Estas migrations substituem apenas funções de leitura e não alteram tabelas, registos, Auth ou Storage.

## 24-09-2026 — despesas nas Notas de Honorários

- A migration `20260924185918_include_expenses_in_honorarium_totals` foi aplicada isoladamente em produção após confirmar o histórico remoto, a função instalada anterior e o backup físico recuperável de `2026-09-24 05:44:16 UTC`. Substitui apenas `save_honorarium_document` e actualiza o comentário da tabela de despesas; não contém DML nem altera RLS, Auth ou permissões. As 13 versões de notas existentes conservaram os totais agregados antes e depois.
- Uma branch Supabase de ensaio falhou ao reconstruir migrations históricas após as primeiras oito; foi eliminada de imediato e a lista de branches voltou a mostrar apenas `main`. Por essa razão, o ensaio em staging/pgTAP não foi concluído. Não foi usado `db push`, `migration repair`, reset remoto ou merge da branch.
- O painel confirmou PITR inactivo e 26 objectos privados de Storage; a cópia independente desses objectos não foi comprovada. Esta migration não toca no Storage e o rollback da função é a definição anterior da migration `20260922153227_reapply_new_credit_on_honorarium_revision.sql`.

## Revisão da nota com pagamento directo — 22-09-2026

- Histórico remoto confirmado antes da execução: última entrada `20260921183113_allow_audited_fixed_fee_restore`. Backup físico recuperável de `2026-09-22 05:50:33 UTC` no painel Supabase; PITR inactivo e Storage não incluído no backup da base.
- Aplicada isoladamente a migration local `20260922153227_reapply_new_credit_on_honorarium_revision.sql` com o mesmo carimbo confirmado pela lista remota após a operação. Substitui `save_honorarium_document` e `issue_provision_honorarium_note` sem DML nem alterações de RLS ou permissões. O limite de opções do documento é 60 kB em ambas as funções; o pagamento directo guardado na versão da nota reduz o valor por pagar sem mexer na conta de provisões. O excedente permanece identificado nas opções da nota para regularização própria.
- As definições instaladas das duas funções foram confirmadas por consulta read-only. Um ciclo autorizado de revisão real confirmou a aplicação do crédito corrigido, pagamento directo separado e saldos da nota e da provisão em zero. Nenhum `db push`, `migration repair` ou limpeza do histórico foi executado.

## Resumos de recebimentos — 16-09-2026

- O histórico remoto foi lido pela integração Supabase antes da alteração; a última migration anterior era `20260916104110_filter_paid_work_without_invoice_evidence`.
- A migration local `20260916182123_add_fast_receivables_summaries.sql` foi aplicada isoladamente pela integração como `add_fast_receivables_summaries`; a lista remota confirmou o mesmo carimbo `20260916182123`. Cria apenas `get_receivable_client_summary` e `get_work_attention_summaries`, ambas de leitura, com controlo de pertença, PIN, âmbito e visibilidade financeira. Não executa DML nem altera RLS ou permissões existentes.
- O checkout não tem CLI Supabase ligada. Não se executou `supabase db push` nem `migration repair`; a divergência histórica permanece sujeita ao protocolo desta página.

## Aplicação confirmada em 2026-09-16

- A migration `20260916104110_filter_paid_work_without_invoice_evidence` foi aplicada isoladamente no projecto `vtvvqyebigflgqccbqsw` e o ficheiro local usa o mesmo carimbo remoto. Substitui duas funções de leitura; não executa DML nem altera RLS, Auth ou permissões.
- A lista remota foi confirmada pela integração Supabase antes e depois da aplicação. Neste checkout, `supabase migration list --linked` indicou que o projecto local não está ligado; não se executou `db push` nem `migration repair`.
- Após a aplicação, GHH deixou de ter 58 falsos positivos no pré-filtro de pagos sem factura ou data; a contagem global passou de 117 para 41. Permaneceram iguais os totais de utilizadores Auth, pertenças, concessões e permissões financeiras.

## Estado verificado em 2026-09-14

- O projecto remoto `vtvvqyebigflgqccbqsw` regista 67 migrations aplicadas.
- A primeira é `20260805113851_create_legal_carina_data_model` e a última é `20260904101950_add_revisable_honorarium_documents`.
- O checkout contém SQL com os mesmos nomes funcionais, mas vários lotes foram aplicados remotamente com carimbos diferentes. A equivalência de nome não basta para autorizar nova execução.
- Não existem migrations funcionais posteriores à que suporta a versão 0.10.11.
- O estado actual continua a bloquear `supabase db push`, `migration repair`, renomeação e eliminação de ficheiros aplicados. Antes de qualquer DDL, listar novamente o histórico remoto e comparar nome, definição instalada e efeito esperado.

Mapeamentos recentes confirmados:

| Migration local | Migration remota |
| --- | --- |
| `20260902180905_add_client_credit_ledger.sql` | `20260902192704_add_client_credit_ledger` |
| `20260902235343_add_legalteam_allocation.sql` | `20260903011816_add_legalteam_allocation` |
| `20260903033000_expand_allocation_read_page.sql` | `20260903021033_expand_allocation_read_page` |
| `20260903034500_add_client_referrer_directory.sql` | `20260903022253_add_client_referrer_directory` |
| `20260903134329_add_client_default_hourly_rate.sql` | `20260903134646_add_client_default_hourly_rate` |
| `20260903143052_fix_workspace_note_insert_returning.sql` | `20260903143150_fix_workspace_note_insert_returning` |
| `20260903140910_add_revisable_honorarium_documents.sql` | `20260904101950_add_revisable_honorarium_documents` |

Estado em 2026-08-16: **histórico local reconciliado; aplicação remota pendente**.

O comando de leitura `supabase migration list --linked` e o `db push --linked --dry-run` mostraram que o projecto remoto contém onze identificadores de migration sem ficheiro local com o mesmo carimbo. A operação de leitura `supabase migration fetch` guardou uma cópia isolada desses onze ficheiros numa pasta temporária, sem substituir ficheiros do repositório e sem alterar o projecto remoto.

## Correspondência comprovada

| Migration local | Migration remota | Evidência |
| --- | --- | --- |
| `20260804214400_create_legal_carina_data_model.sql` | `20260805113851_create_legal_carina_data_model.sql` | mesmas instruções SQL após normalizar LF e whitespace final |
| `20260804215859_add_pricing_engine.sql` | `20260805113859_add_pricing_engine.sql` | mesmas instruções SQL após normalizar LF e whitespace final |
| `20260804223336_add_auth_terms_and_access_control.sql` | `20260805113907_add_auth_terms_and_access_control.sql` | mesmas instruções SQL após normalizar LF e whitespace final |
| `20260815173000_allow_audited_historical_billing_states.sql` | `20260815214859_allow_audited_import_billing_states_for_review.sql` | diferença editorial: linha vazia e ponto e vírgula duplicado no remoto |
| `20260815231000_add_dashboard_read_models.sql` | `20260815220340_add_dashboard_read_models.sql` | par cronológico confirmado; diferença predominantemente de formatação, requer decisão de histórico |
| `20260815221601_add_work_entry_search.sql` | `20260815222102_add_work_entry_search.sql` | par cronológico confirmado; diferença predominantemente de formatação, requer decisão de histórico |
| `20260815222505_align_optional_legal_gate_permissions.sql` | `20260815222608_align_optional_legal_gate_permissions.sql` | par cronológico confirmado; diferença predominantemente de formatação, requer decisão de histórico |
| `20260816015500_optimize_work_entries_search.sql` | `20260816101332_optimize_work_entries_search.sql` | conteúdo equivalente salvo terminador final |
| `20260816153000_require_initial_pin_change.sql` | `20260816132003_require_initial_pin_change.sql` | par cronológico confirmado; diferença predominantemente de formatação, requer decisão de histórico |
| `20260816164000_optimize_client_dashboards.sql` | `20260816133319_optimize_client_dashboards.sql` | conteúdo equivalente salvo terminador final |
| `20260816171000_remove_billing_entity_legacy_label.sql` | `20260816140303_remove_billing_entity_legacy_label.sql` | conteúdo equivalente salvo terminador final |

O ficheiro local `20260816110032_add_username_pin_access.sql` não possuía uma entrada correspondente no histórico remoto, embora os objectos necessários estejam presentes na base ligada. A existência das tabelas, RLS, índice, triggers, colunas e função foi comprovada por consultas apenas de leitura. Em vez de usar `migration repair`, o SQL idempotente foi reapresentado como `20260816110033_reconcile_username_pin_access.sql`, para que a base o execute e registe efectivamente.

Os onze ficheiros históricos locais foram substituídos pelos SQL exactos descarregados do histórico remoto, conservando os respectivos carimbos remotos. O `db push --linked --dry-run --include-all` passou e enumerou as 20 migrations pendentes sem alterar a base.

## Decisão segura preparada

Na janela de publicação deve ser criada uma cópia de segurança verificável e deve preservar-se o SQL remoto exacto sob os carimbos registados. As diferenças locais semanticamente necessárias devem seguir em migrations correctivas novas e idempotentes. Só depois se compara o esquema resultante e se executa novo `db push --dry-run`. Não se deve usar `migration repair` para ocultar o ficheiro de username/PIN sem primeiro provar os objectos e políticas existentes.

Na publicação:

- não executar `migration repair`;
- aplicar apenas a sequência enumerada pelo dry-run aprovado;
- parar imediatamente se qualquer migration falhar;
- repetir `migration list`, testes RLS e verificações funcionais após a aplicação.

O dump de esquema pela CLI não pôde ser produzido porque o Docker Desktop não está disponível; foi criado um ficheiro vazio, imediatamente identificado pelo hash SHA-256 padrão de vazio e removido. Não foi criada qualquer cópia de dados pessoais.

- 03-09-2026: add_client_default_hourly_rate local 20260903134329 / remoto 20260903134646; coluna opcional de predefinição, ensaio rollback aprovado antes/depois. Histórico anterior preservado, sem repair/db push.
