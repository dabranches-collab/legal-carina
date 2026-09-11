begin;
select plan(18);

select has_table('public','client_retainers','A tabela de contratos de avença existe');
select has_table('public','retainer_charges','A tabela de mensalidades existe');
select has_column('public','work_entries','billing_scope','O movimento tem classificação financeira');
select col_has_check('public','work_entries','billing_scope','A classificação do movimento é limitada');
select has_index('public','work_entries','work_entries_retainer_client_date_idx','As horas de avença têm índice próprio');
select has_function('public','create_classified_work_entry',array['date','uuid','uuid','uuid','uuid','text','integer','text','numeric','text','jsonb'],'Existe criação atómica classificada');
select has_function('public','set_work_entry_billing_scope',array['uuid','text','text'],'A classificação pode ser corrigida');
select has_function('public','get_client_retainer_summary',array['uuid'],'Existe resumo da avença');
select has_function('public','get_attention_work_entries',array['text','text','integer','uuid','uuid','text','boolean','text','uuid','boolean'],'A fila financeira reconhece avenças');
select has_table('public','client_platform_credentials','Os metadados das credenciais existem');
select has_table('public','client_platform_credential_versions','O histórico de palavras-passe existe');
select has_table('public','client_credential_access_audit','Os acessos às credenciais são auditados');
select has_function('public','list_client_platform_credentials',array['uuid'],'A leitura autorizada existe');
select has_function('public','list_client_platform_credential_history',array['uuid'],'A leitura do histórico existe');
select has_function('public','save_client_platform_credential',array['uuid','uuid','text','text','text','text'],'A gravação cifrada existe');
select has_function('public','delete_client_platform_credential',array['uuid'],'A eliminação segura existe');
select isnt_empty($$select 1 from pg_extension where extname='supabase_vault'$$,'Vault está activo');
select is_empty($$select 1 from information_schema.role_table_grants where table_schema='public' and table_name in('client_platform_credentials','client_platform_credential_versions') and grantee in('anon','authenticated')$$,'As tabelas secretas não estão expostas directamente');

select * from finish();
rollback;
