# Reconciliação do histórico de migrations

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
